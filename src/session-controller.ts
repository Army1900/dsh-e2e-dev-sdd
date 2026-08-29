import { isAbsolute, relative, resolve } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import type { CodeRepositoryReference, StageId } from './protocol.ts'
import { runtimeDefinition } from './stage-definitions.ts'

interface SessionBindingSpec {
  sessionId: string
  stage: StageId
  artifactUid?: string
  systemPrompt: string
  projectPath: string
  artifactDirectory: string
  developmentDirectories: string[]
  developmentRepositories?: Array<{ id: string; path: string }>
  codeReferences?: CodeRepositoryReference[]
  artifactTemplateReference: string
  artifactTemplateConfigReference?: string
  requiredSections: string[]
}

export interface AiTestExecutionEvidence {
  projectPath: string
  artifactUid: string
  repositoryId: string
  command: string
  description: string
  exitCode: number | null
  output: string
  sessionId: string
  passed: boolean
}

interface ActiveBinding { dispose: () => void; signature: string }

function contained(root: string, target: string): boolean {
  const path = relative(root, target)
  return path === '' || (!path.startsWith('..') && !isAbsolute(path))
}

function stringArgument(argumentsValue: unknown, name: string): string | undefined {
  if (typeof argumentsValue !== 'object' || argumentsValue === null || Array.isArray(argumentsValue)) return undefined
  const value = (argumentsValue as Record<string, unknown>)[name]
  return typeof value === 'string' ? value : undefined
}

function mutatingMcpTool(name: string): boolean {
  return name.startsWith('mcp__') && /(?:write|edit|create|update|delete|remove|commit|push|merge)/i.test(name)
}

/** DSH reserves {{name}} for prompt variables; project-authored text is always literal. */
function promptLiteral(value: string): string { return value.replaceAll('{{', '{\u200b{').replaceAll('}}', '}\u200b}') }

export class StageSessionController {
  private readonly active = new Map<string, ActiveBinding>()
  private readonly desired = new Map<string, SessionBindingSpec>()

  constructor(private readonly ctx: Context, private readonly recordAiTest?: (evidence: AiTestExecutionEvidence) => Promise<void>) {
    ctx.effect(() => () => {
      for (const binding of this.active.values()) binding.dispose()
      this.active.clear()
      this.desired.clear()
    }, 'dsh-sdd: stage session bindings')
    ctx.on('session/disposed', session => { this.unbind(String(session.id)) })
    ctx.on('agent/created', ({ agent }) => { const spec = this.desired.get(String(agent.id)); if (spec !== undefined) this.attach(spec) })
    ctx.on('agent/disposed', ({ agent }) => { this.detach(String(agent.id)) })
  }

  bind(spec: SessionBindingSpec): void {
    this.desired.set(spec.sessionId, spec)
    this.attach(spec)
  }

  private attach(spec: SessionBindingSpec): void {
    const signature = JSON.stringify(spec)
    if (this.active.get(spec.sessionId)?.signature === signature) return
    this.detach(spec.sessionId)
    const agent = this.ctx.agents.get(spec.sessionId as never)
    if (agent === undefined) return
    const definition = runtimeDefinition(spec.stage)
    const allowedWriteRoots = [resolve(spec.artifactDirectory), ...spec.developmentDirectories.map(path => resolve(path))]
    const templateSnapshotRoot = resolve(spec.artifactDirectory, '.template')
    const developmentRoots = spec.developmentDirectories.map(path => resolve(path))
    const disposers: Array<() => void> = []
    try {
      disposers.push(agent.ctx.systemPrompt.section({
        name: 'sdd:stage-runtime', order: 20,
        text: `${definition.systemPrompt}\n\n交付件输出必须遵循创建草稿时固定绑定的 Markdown 模板快照：\n${promptLiteral(spec.artifactTemplateReference)}\n${spec.artifactTemplateConfigReference === undefined ? '' : `模板配置：\n${promptLiteral(spec.artifactTemplateConfigReference)}\n`}首次回答和恢复会话后必须先使用 read 工具读取该模板、绑定交付件及输入索引中列出的必要文件；文件引用本身不代表已经读取。不得删除、改名或打乱以下必填二级章节：${spec.requiredSections.map(promptLiteral).join('、')}。可以增加三级章节和附件引用。交付件是整个绑定目录，可在其中维护图表、原型、样例和附件，并从主文档使用相对路径引用。写入前删除已完成章节中的“待补充。”占位符；没有内容的待决或遗留问题要明确写“无”。不得仅凭路径、文件名、清单或哈希推断文件内容。${spec.codeReferences?.some(item => item.available) === true ? '\n非开发阶段提供的项目代码仓库全部是辅助只读输入；只在当前问题需要时按需读取，禁止通过任何工具修改、提交、切换或清理这些仓库。' : ''}\n\n${promptLiteral(spec.systemPrompt)}`,
      }))
      disposers.push(agent.ctx.tools.guard((execution: Readonly<ToolExecution>) => {
        if (definition.toolPolicy.forbiddenTools.includes(execution.name)) {
          return `SDD ${definition.label} 阶段禁止使用工具 ${execution.name}`
        }
        if (mutatingMcpTool(execution.name)) return 'SDD 阶段禁止通过通用 MCP 工具执行外部写操作'
        if (execution.name === 'bash' || execution.name === 'pwsh') {
          if (!definition.toolPolicy.allowShell) return `SDD ${definition.label} 阶段禁止执行 shell 命令`
          const workdir = stringArgument(execution.arguments, 'workdir')
          if (workdir === undefined) return `SDD 开发阶段的 ${execution.name} 调用必须显式提供 workdir`
          const resolved = resolve(spec.projectPath, workdir)
          if (!developmentRoots.some(root => contained(root, resolved))) return `${execution.name} workdir 必须位于当前交付件绑定的隔离代码空间`
          const command = stringArgument(execution.arguments, 'command') ?? ''
          if (/\bgit\s+(?:commit|push|merge|rebase|reset|clean)\b/i.test(command) || /\b(?:gh\s+pr|glab\s+mr)\s+create\b/i.test(command)) {
            return '代码提交、推送和合并只能通过 SDD 的显式用户操作执行'
          }
        }
        if (execution.name === 'write' || execution.name === 'edit') {
          const filePath = stringArgument(execution.arguments, 'file_path')
          if (filePath === undefined) return `${execution.name} 缺少可校验的 file_path`
          const resolved = resolve(spec.projectPath, filePath)
          if (contained(templateSnapshotRoot, resolved)) return '交付件模板快照不可修改；请编辑正文或项目级 .sdd/templates'
          if (!allowedWriteRoots.some(root => contained(root, resolved))) return '当前阶段只能修改绑定交付件或绑定的隔离代码空间'
        }
        if (execution.name === 'str_replace_editor') {
          const command = stringArgument(execution.arguments, 'command')
          if (command !== 'view') {
            const filePath = stringArgument(execution.arguments, 'path')
            if (filePath === undefined) return 'str_replace_editor 缺少可校验的 path'
            const resolved = resolve(spec.projectPath, filePath)
            if (contained(templateSnapshotRoot, resolved)) return '交付件模板快照不可修改；请编辑正文或项目级 .sdd/templates'
            if (!allowedWriteRoots.some(root => contained(root, resolved))) return '当前阶段只能修改绑定交付件或绑定的隔离代码空间'
          }
        }
        return undefined
      }))
      disposers.push(agent.ctx.on('tools/post-execute', async (execution, result, next) => {
        const decision = await next()
        if (this.recordAiTest === undefined || spec.stage !== 'development' || spec.artifactUid === undefined || (execution.name !== 'bash' && execution.name !== 'pwsh') || result.isError) return decision
        const description = stringArgument(execution.arguments, 'description')
        const command = stringArgument(execution.arguments, 'command')
        const workdir = stringArgument(execution.arguments, 'workdir')
        if (description === undefined || !/^SDD测试[:：]/.test(description) || command === undefined || workdir === undefined) return decision
        const resolvedWorkdir = resolve(spec.projectPath, workdir)
        const repository = spec.developmentRepositories?.find(item => contained(resolve(item.path), resolvedWorkdir))
        if (repository === undefined || typeof result.value !== 'object' || result.value === null || Array.isArray(result.value)) return decision
        const value = result.value as Record<string, unknown>
        if (value.kind === 'background' || (typeof value.exitCode !== 'number' && value.exitCode !== null)) return decision
        const streamText = (stream: unknown): string => typeof stream === 'object' && stream !== null && typeof (stream as { text?: unknown }).text === 'string' ? String((stream as { text: string }).text) : ''
        const exitCode = value.exitCode as number | null
        try {
          await this.recordAiTest({
            projectPath: spec.projectPath, artifactUid: spec.artifactUid, repositoryId: repository.id,
            command, description: description.replace(/^SDD测试[:：]\s*/, ''), exitCode,
            output: `${streamText(value.stdout)}${streamText(value.stderr)}`,
            sessionId: spec.sessionId, passed: exitCode === 0 && value.timedOut !== true && value.aborted !== true,
          })
        } catch { /* evidence persistence must not replace the real shell result */ }
        return decision
      }))
      this.active.set(spec.sessionId, { signature, dispose: () => { for (const dispose of disposers.reverse()) dispose() } })
    } catch (error) {
      for (const dispose of disposers.reverse()) dispose()
      throw error
    }
  }

  unbind(sessionId: string): void {
    this.desired.delete(sessionId)
    this.detach(sessionId)
  }

  private detach(sessionId: string): void {
    const binding = this.active.get(sessionId)
    if (binding === undefined) return
    this.active.delete(sessionId)
    binding.dispose()
  }
}
