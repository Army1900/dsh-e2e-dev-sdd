import { createHash, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { access, copyFile, mkdir, readFile, readdir, realpath, rename, unlink, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import type { ApiProxy, RpcId } from '@deepseek-ai/dsh-host-apiproxy'
import { parse, stringify } from 'yaml'
import {
  STAGES,
  artifactTemplate,
  type ArtifactManifest,
  type ArtifactFileSummary,
  type ArtifactSummary,
  type DashboardSnapshot,
  type DevelopmentWorkspace,
  type ImportPreview,
  type ImportPreviewItem,
  type ProjectConfig,
  type ProjectSnapshot,
  type QualityReport,
  type SddAction,
  type SddEvent,
  type SourceEnvelope,
  type SourceBundle,
  type SourceSummary,
  type StageRun,
  type StageTemplatePreview,
  type StageId,
  type WorkItem,
  stageDefinition,
} from './protocol.ts'
import { type SddSourceRegistry, validateSourceEnvelope } from './extensions.ts'
import { appendEvent, readRecentEvents } from './event-log.ts'
import { GitDevelopmentService, listDevelopmentWorkspaces } from './git-service.ts'
import { evaluateQuality } from './quality.ts'
import { runtimeDefinition } from './stage-definitions.ts'
import type { StageSessionController } from './session-controller.ts'
import { ensureProjectTemplates, loadStageTemplate, renderStageTemplate, snapshotStageTemplate } from './template-store.ts'

const PROJECT_FILE = '.sdd/project.yaml'
interface StagedImport { preview: ImportPreview; bundle: SourceBundle }
const BUSINESS_GUIDE = `# 项目业务扩展

本目录是当前 SDD 项目唯一的项目级业务自定义目录。

- \`connectors/\`：命令型 Connector 配置。
- \`adapters/\`：Connector 调用的业务适配器脚本和脚本自己的模块。

适配器从 stdin 接收一个 JSON 请求，只能把一个符合 \`dsh-sdd/source-bundle@1\` 的 JSON 对象写到 stdout；\`items\` 至少包含一项，每项形成独立工作单元。主需求公共背景可放在可选的 \`root\`。日志应写到 stderr。凭证不得提交到仓库，Connector 只声明允许继承的环境变量名。

完整开发说明见 dsh-e2e-dev-sdd 插件的 \`docs/business-development-guide.md\`。
`

function request<T>(payload: T) {
  return { rpcId: `sdd-${randomUUID()}` as RpcId, payload }
}

function slug(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '')
  return normalized.slice(0, 48) || 'artifact'
}

function sourceIdentity(source: SourceEnvelope): string {
  return `${source.provider}:${source.kind}:${source.externalKey ?? source.uid}`
}

function sourceHash(source: SourceEnvelope): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(source.content)).digest('hex')}`
}

function sourceVersionHash(source: SourceEnvelope): string {
  return createHash('sha256').update(JSON.stringify({ title: source.title, status: source.status, revision: source.revision, tracking: source.tracking, links: source.links, content: source.content })).digest('hex')
}

function changedPaths(previous: unknown, next: unknown, prefix = 'content'): string[] {
  if (JSON.stringify(previous) === JSON.stringify(next)) return []
  if (!object(previous) || !object(next)) return [prefix]
  return [...new Set([...Object.keys(previous), ...Object.keys(next)])]
    .flatMap(key => changedPaths(previous[key], next[key], `${prefix}.${key}`))
    .slice(0, 50)
}

async function exists(path: string): Promise<boolean> {
  try { await access(path); return true } catch { return false }
}

function contained(root: string, target: string): boolean {
  const path = relative(root, target)
  return path === '' || (!path.startsWith('..') && !isAbsolute(path))
}

async function walkForManifest(root: string): Promise<string[]> {
  if (!(await exists(root))) return []
  const result: string[] = []
  const visit = async (dir: string): Promise<void> => {
    for (const item of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, item.name)
      if (item.isDirectory()) await visit(path)
      else if (item.isFile() && item.name === 'manifest.yaml') result.push(path)
    }
  }
  await visit(root)
  return result.sort()
}

async function artifactFiles(root: string): Promise<ArtifactFileSummary[]> {
  const files: ArtifactFileSummary[] = []
  const visit = async (directory: string): Promise<void> => {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      if (item.isSymbolicLink()) continue
      const absolute = join(directory, item.name)
      if (item.isDirectory()) await visit(absolute)
      else if (item.isFile() && relative(root, absolute) !== 'manifest.yaml') {
        const content = await readFile(absolute)
        const path = relative(root, absolute).split('\\').join('/')
        const extension = item.name.toLowerCase().split('.').pop() ?? ''
        const kind = extension === 'md' || extension === 'mdx' ? 'markdown'
          : ['txt', 'json', 'yaml', 'yml', 'csv', 'tsv', 'mmd', 'puml'].includes(extension) ? 'text'
            : ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension) ? 'image' : 'binary'
        files.push({ path, size: content.byteLength, contentHash: `sha256:${createHash('sha256').update(content).digest('hex')}`, kind })
      }
    }
  }
  await visit(root)
  return files.sort((left, right) => left.path.localeCompare(right.path))
}

function artifactBundleHash(files: ArtifactFileSummary[]): string {
  const inventory = files.map(file => `${file.path}\0${file.size}\0${file.contentHash}`).join('\n')
  return `sha256:${createHash('sha256').update(inventory).digest('hex')}`
}

function nextVersion(version: string): string {
  const [major = 0, minor = 0] = version.split('.').map(Number)
  return `${major}.${minor + 1}.0`
}

function defaultProject(path: string): ProjectConfig {
  return {
    schema: 'dsh-sdd/project@1',
    project: { key: slug(basename(path)), name: basename(path) },
    identifiers: {
      internal: { strategy: 'uuid' },
      namespaces: Object.fromEntries(STAGES.map(stage => [stage.id, {
        strategy: 'template', template: `${stage.prefix}-{sequence:04}`, sequenceScope: 'project',
      }])) as ProjectConfig['identifiers']['namespaces'],
    },
    sources: {},
    dependencies: {
      requirements: {},
      prototype: { requirements: 'required' },
      architecture: { requirements: 'required', prototype: 'optional' },
      specification: { requirements: 'required', prototype: 'optional', architecture: 'required' },
      development: { requirements: 'optional', prototype: 'optional', architecture: 'optional', specification: 'required' },
    },
    development: {
      workspaceRoot: '.sdd-workspaces',
      branchPattern: 'sdd/{artifactKey}',
      mergeStrategy: 'pull-request',
      repositories: [],
    },
  }
}

function validateManifest(value: unknown, entryExists: boolean): string[] {
  if (typeof value !== 'object' || value === null) return ['manifest must be an object']
  const manifest = value as Partial<ArtifactManifest>
  const errors: string[] = []
  if (manifest.schema !== 'dsh-sdd/artifact@1') errors.push('schema must be dsh-sdd/artifact@1')
  for (const field of ['uid', 'key', 'title', 'stage', 'type', 'version', 'status', 'entry'] as const) {
    if (typeof manifest[field] !== 'string' || manifest[field] === '') errors.push(`${field} is required`)
  }
  if (!Array.isArray(manifest.basedOn)) errors.push('basedOn must be an array')
  if (!Array.isArray(manifest.derivedFrom)) errors.push('derivedFrom must be an array')
  if (!Array.isArray(manifest.externalRefs)) errors.push('externalRefs must be an array')
  if (manifest.template !== undefined) {
    if (!object(manifest.template)) errors.push('template must be an object')
    else {
      if (manifest.template.stage !== manifest.stage) errors.push('template.stage must match artifact stage')
      if (!nonEmptyString(manifest.template.version)) errors.push('template.version is required')
      if (!nonEmptyString(manifest.template.snapshotPath)) errors.push('template.snapshotPath is required')
      if (!nonEmptyString(manifest.template.configSnapshotPath)) errors.push('template.configSnapshotPath is required')
      if (!Array.isArray(manifest.template.requiredSections) || manifest.template.requiredSections.length === 0) errors.push('template.requiredSections must not be empty')
    }
  }
  if (typeof manifest.entry === 'string' && !entryExists) errors.push(`entry does not exist: ${manifest.entry}`)
  return errors
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim() !== ''
}

function validateProject(value: unknown): { project?: ProjectConfig; errors: string[] } {
  const errors: string[] = []
  if (!object(value)) return { errors: ['project.yaml：根节点必须是对象'] }
  if (value.schema !== 'dsh-sdd/project@1') errors.push('schema：必须是 dsh-sdd/project@1')
  if (!object(value.project)) errors.push('project：必须是对象')
  else {
    if (!nonEmptyString(value.project.key)) errors.push('project.key：不能为空')
    if (!nonEmptyString(value.project.name)) errors.push('project.name：不能为空')
  }
  if (!object(value.identifiers)) errors.push('identifiers：必须是对象')
  else {
    if (!object(value.identifiers.internal) || value.identifiers.internal.strategy !== 'uuid') errors.push('identifiers.internal.strategy：必须是 uuid')
    if (!object(value.identifiers.namespaces)) errors.push('identifiers.namespaces：必须是对象')
    else for (const stage of STAGES) {
      const policy = value.identifiers.namespaces[stage.id]
      const base = `identifiers.namespaces.${stage.id}`
      if (!object(policy)) { errors.push(`${base}：必须是对象`); continue }
      if (policy.strategy !== 'template') errors.push(`${base}.strategy：必须是 template`)
      if (policy.template !== `${stage.prefix}-{sequence:04}`) errors.push(`${base}.template：必须是 ${stage.prefix}-{sequence:04}`)
      if (policy.sequenceScope !== 'project') errors.push(`${base}.sequenceScope：必须是 project`)
    }
  }
  if (!object(value.sources)) errors.push('sources：必须是对象')
  else for (const [kind, binding] of Object.entries(value.sources)) {
    if (!object(binding) || !nonEmptyString(binding.provider)) errors.push(`sources.${kind}.provider：不能为空`)
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(binding.provider))) errors.push(`sources.${kind}.provider：必须使用 kebab-case`)
  }
  if (!object(value.dependencies)) errors.push('dependencies：必须是对象')
  else for (const [stageIndex, stage] of STAGES.entries()) {
    const dependencies = value.dependencies[stage.id]
    if (!object(dependencies)) { errors.push(`dependencies.${stage.id}：必须是对象`); continue }
    for (const [inputStage, mode] of Object.entries(dependencies)) {
      const inputIndex = STAGES.findIndex(item => item.id === inputStage)
      if (inputIndex < 0) errors.push(`dependencies.${stage.id}.${inputStage}：未知阶段`)
      else if (inputIndex >= stageIndex) errors.push(`dependencies.${stage.id}.${inputStage}：只能依赖当前阶段之前的阶段`)
      if (mode !== 'required' && mode !== 'optional' && mode !== 'manual') errors.push(`dependencies.${stage.id}.${inputStage}：必须是 required、optional 或 manual`)
    }
  }
  if (!object(value.development)) errors.push('development：必须是对象')
  else {
    if (!nonEmptyString(value.development.workspaceRoot)) errors.push('development.workspaceRoot：不能为空')
    else if (isAbsolute(String(value.development.workspaceRoot)) || String(value.development.workspaceRoot).split(/[\\/]/).includes('..')) errors.push('development.workspaceRoot：必须是项目内的相对路径')
    if (!nonEmptyString(value.development.branchPattern)) errors.push('development.branchPattern：不能为空')
    else if (!String(value.development.branchPattern).includes('{artifactKey}')) errors.push('development.branchPattern：必须包含 {artifactKey}')
    if (!['pull-request', 'local-merge', 'manual'].includes(String(value.development.mergeStrategy))) errors.push('development.mergeStrategy：值无效')
    if (!Array.isArray(value.development.repositories)) errors.push('development.repositories：必须是数组')
    else value.development.repositories.forEach((repository, index) => {
      const base = `development.repositories[${index}]`
      if (!object(repository)) { errors.push(`${base}：必须是对象`); return }
      if (!nonEmptyString(repository.id) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(repository.id))) errors.push(`${base}.id：必须是非空 kebab-case`)
      if (!nonEmptyString(repository.source)) errors.push(`${base}.source：不能为空`)
      if (!nonEmptyString(repository.baseBranch)) errors.push(`${base}.baseBranch：不能为空`)
      if (!Array.isArray(repository.testCommands)) errors.push(`${base}.testCommands：必须是数组`)
      else repository.testCommands.forEach((command, commandIndex) => {
        const commandBase = `${base}.testCommands[${commandIndex}]`
        if (!object(command) || !nonEmptyString(command.id) || !nonEmptyString(command.label)
          || !Array.isArray(command.argv) || command.argv.length === 0 || command.argv.some(argument => !nonEmptyString(argument))) {
          errors.push(`${commandBase}：需要有效的 id、label 和非空 argv`)
        }
      })
    })
    if (Array.isArray(value.development.repositories)) {
      const ids = value.development.repositories.filter(object).map(repository => repository.id).filter(nonEmptyString)
      if (new Set(ids).size !== ids.length) errors.push('development.repositories：仓库 id 不能重复')
    }
  }
  return errors.length === 0 ? { project: value as unknown as ProjectConfig, errors } : { errors }
}

export class SddProjectService {
  constructor(
    private readonly api: ApiProxy,
    private readonly sourceRegistry?: SddSourceRegistry,
    private readonly sessionController?: StageSessionController,
    private readonly git = new GitDevelopmentService(),
  ) {}

  private async workspace(workspaceId: string): Promise<{ workspaceId: string; title: string; path: string }> {
    const response = await this.api.workspace.list(request({}))
    if (!response.result.ok) throw new Error(`${response.result.error.code}: ${response.result.error.message}`)
    const item = response.result.value.items.find(row => row.workspaceId === workspaceId)
    if (item === undefined) throw new Error(`workspace not found: ${workspaceId}`)
    return { workspaceId, title: item.title, path: await realpath(item.path) }
  }

  async execute(action: SddAction): Promise<ProjectSnapshot | ImportPreview | StageTemplatePreview | { prompt: string; run?: StageRun } | { artifactFile: { artifactUid: string; path: string; kind: ArtifactFileSummary['kind'] | 'manifest'; content?: string; dataUrl?: string } } | { opened: true }> {
    if (action.kind === 'snapshot') return this.snapshot(action.workspaceId)
    if (action.kind === 'initialize') { await this.initialize(action.workspaceId); return this.snapshot(action.workspaceId) }
    if (action.kind === 'reinitialize') { await this.reinitialize(action.workspaceId); return this.snapshot(action.workspaceId) }
    if (action.kind === 'create-draft') {
      await this.createDraft(action.workspaceId, action.stage, action.title, action.basedOn, action.sourceUids ?? [], action.workItemUid)
      return this.snapshot(action.workspaceId)
    }
    if (action.kind === 'create-revision') { await this.createRevision(action.workspaceId, action.artifactUid); return this.snapshot(action.workspaceId) }
    if (action.kind === 'discard-draft') { await this.discardDraft(action.workspaceId, action.artifactUid); return this.snapshot(action.workspaceId) }
    if (action.kind === 'accept') { await this.accept(action.workspaceId, action.artifactUid, action.checklist); return this.snapshot(action.workspaceId) }
    if (action.kind === 'read-artifact-file') return { artifactFile: await this.readArtifactFile(action.workspaceId, action.artifactUid, action.path) }
    if (action.kind === 'open-artifact-path') { await this.openArtifactPath(action.workspaceId, action.artifactUid, action.path); return { opened: true } }
    if (action.kind === 'read-stage-template') return this.readStageTemplate(action.workspaceId, action.stage)
    if (action.kind === 'open-stage-template') { await this.openStageTemplate(action.workspaceId, action.stage, action.target); return { opened: true } }
    if (action.kind === 'update-work-item-settings') {
      await this.updateWorkItemSettings(action.workspaceId, action.workItemUid, action.repositoryScope, action.developmentTargets, action.openSpec)
      return this.snapshot(action.workspaceId)
    }
    if (action.kind === 'add-project-repository') { await this.addProjectRepository(action.workspaceId, action.id, action.source, action.baseBranch); return this.snapshot(action.workspaceId) }
    if (action.kind === 'remove-project-repository') { await this.removeProjectRepository(action.workspaceId, action.id); return this.snapshot(action.workspaceId) }
    if (action.kind === 'quality') return this.snapshot(action.workspaceId)
    if (action.kind === 'import-source') {
      const preview = await this.previewSourceImport(action.workspaceId, action.provider, action.sourceKind, action.key, action.connector, action.input)
      await this.applySourceImport(action.workspaceId, preview.uid, preview.items.filter(item => item.change !== 'unchanged').map(item => item.identity))
      return this.snapshot(action.workspaceId)
    }
    if (action.kind === 'preview-source-import') return this.previewSourceImport(action.workspaceId, action.provider, action.sourceKind, action.key, action.connector, action.input)
    if (action.kind === 'apply-source-import') {
      await this.applySourceImport(action.workspaceId, action.previewUid, action.identities)
      return this.snapshot(action.workspaceId)
    }
    if (action.kind === 'resolve-work-item-removal') {
      await this.resolveWorkItemRemoval(action.workspaceId, action.workItemUid, action.decision)
      return this.snapshot(action.workspaceId)
    }
    if (action.kind === 'context') return { prompt: await this.context(action.workspaceId, action.stage, action.artifactUid, action.artifactUids, action.sourceUids ?? []) }
    if (action.kind === 'bind-session') return this.bindSession(action.workspaceId, action.runUid, action.stage, action.artifactUid, action.sessionId, action.artifactUids, action.sourceUids ?? [])
    if (action.kind === 'sync-run') { await this.syncRun(action.workspaceId, action.runUid); return this.snapshot(action.workspaceId) }
    if (action.kind === 'complete-run') { await this.completeRun(action.workspaceId, action.runUid); return this.snapshot(action.workspaceId) }
    if (action.kind === 'development-create') {
      const snapshot = await this.requireSnapshot(action.workspaceId)
      const artifact = this.requireArtifact(snapshot, action.artifactUid)
      const workItem = artifact.workItemUid === undefined ? undefined : snapshot.workItems.find(item => item.uid === artifact.workItemUid)
      if (workItem !== undefined && !(workItem.developmentTargets ?? []).includes(action.repositoryId)) throw new Error(`repository ${action.repositoryId} is not a confirmed development target`)
      await this.git.create(snapshot.workspace.path, snapshot.project, artifact, action.repositoryId)
      await appendEvent(snapshot.workspace.path, 'development.workspace-created', artifact.key, artifact.stage, { repositoryId: action.repositoryId })
      return this.snapshot(action.workspaceId)
    }
    if (action.kind === 'development-status') {
      const snapshot = await this.requireSnapshot(action.workspaceId)
      await this.git.status(snapshot.workspace.path, action.artifactUid)
      return this.snapshot(action.workspaceId)
    }
    if (action.kind === 'development-test') {
      const snapshot = await this.requireSnapshot(action.workspaceId)
      const artifact = this.requireArtifact(snapshot, action.artifactUid)
      const development = await this.git.test(snapshot.workspace.path, snapshot.project, artifact.uid, action.repositoryId, action.testId)
      const result = development.repositories.find(item => item.id === action.repositoryId)?.lastTest
      await appendEvent(snapshot.workspace.path, 'test.completed', artifact.key, artifact.stage, { repositoryId: action.repositoryId, testId: action.testId, passed: result?.passed ?? false })
      return this.snapshot(action.workspaceId)
    }
    if (action.kind === 'development-commit') {
      const snapshot = await this.requireSnapshot(action.workspaceId)
      const artifact = this.requireArtifact(snapshot, action.artifactUid)
      const development = await this.git.commit(snapshot.workspace.path, artifact.uid, action.repositoryId, action.message)
      const headCommit = development.repositories.find(item => item.id === action.repositoryId)?.headCommit
      await appendEvent(snapshot.workspace.path, 'commit.created', artifact.key, artifact.stage, { repositoryId: action.repositoryId, headCommit })
      return this.snapshot(action.workspaceId)
    }
    throw new Error(`unsupported SDD action: ${(action as { kind: string }).kind}`)
  }

  async initialize(workspaceId: string): Promise<void> {
    const workspace = await this.workspace(workspaceId)
    const sddRoot = join(workspace.path, '.sdd')
    await mkdir(join(sddRoot, 'artifacts'), { recursive: true })
    await mkdir(join(sddRoot, 'sources'), { recursive: true })
    await mkdir(join(sddRoot, 'work-items'), { recursive: true })
    await mkdir(join(sddRoot, 'imports', 'pending'), { recursive: true })
    await mkdir(join(sddRoot, 'imports', 'history'), { recursive: true })
    await mkdir(join(sddRoot, 'business', 'connectors'), { recursive: true })
    await mkdir(join(sddRoot, 'business', 'adapters'), { recursive: true })
    await mkdir(join(sddRoot, 'runs'), { recursive: true })
    await mkdir(join(sddRoot, 'events'), { recursive: true })
    await mkdir(join(sddRoot, 'development'), { recursive: true })
    await ensureProjectTemplates(workspace.path)
    for (const stage of STAGES) await mkdir(join(sddRoot, 'artifacts', stage.id), { recursive: true })
    const businessGuidePath = join(sddRoot, 'business', 'README.md')
    if (!(await exists(businessGuidePath))) await writeFile(businessGuidePath, BUSINESS_GUIDE, 'utf8')
    const projectPath = join(workspace.path, PROJECT_FILE)
    const created = !(await exists(projectPath))
    if (created) await writeFile(projectPath, stringify(defaultProject(workspace.path)), 'utf8')
    const gitignorePath = join(workspace.path, '.gitignore')
    const gitignore = (await exists(gitignorePath)) ? await readFile(gitignorePath, 'utf8') : ''
    if (!gitignore.split(/\r?\n/).includes('.sdd-workspaces/')) {
      const prefix = gitignore === '' || gitignore.endsWith('\n') ? gitignore : `${gitignore}\n`
      await writeFile(gitignorePath, `${prefix}\n# DSH SDD per-requirement isolated checkouts and unconfirmed import previews\n.sdd-workspaces/\n.sdd/imports/pending/\n`, 'utf8')
    } else if (!gitignore.split(/\r?\n/).includes('.sdd/imports/pending/')) {
      const prefix = gitignore.endsWith('\n') ? gitignore : `${gitignore}\n`
      await writeFile(gitignorePath, `${prefix}.sdd/imports/pending/\n`, 'utf8')
    }
    if (created) await appendEvent(workspace.path, 'project.initialized', basename(workspace.path), undefined, { projectFile: PROJECT_FILE })
  }

  private async reinitialize(workspaceId: string): Promise<void> {
    const workspace = await this.workspace(workspaceId)
    const projectPath = join(workspace.path, PROJECT_FILE)
    if (await exists(projectPath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      await copyFile(projectPath, join(workspace.path, '.sdd', `project.invalid-${timestamp}.yaml`))
    }
    await this.initialize(workspaceId)
    await writeFile(projectPath, stringify(defaultProject(workspace.path)), 'utf8')
    await appendEvent(workspace.path, 'project.reinitialized', basename(workspace.path), undefined, { backupCreated: true })
  }

  async snapshot(workspaceId: string): Promise<ProjectSnapshot> {
    const workspace = await this.workspace(workspaceId)
    const projectPath = join(workspace.path, PROJECT_FILE)
    if (!(await exists(projectPath))) return {
      workspace, initialized: false, configuration: { status: 'missing', path: PROJECT_FILE, errors: [] }, artifacts: [], sources: [], sourceProviders: this.sourceRegistry?.names() ?? [], connectors: [], workItems: [],
      runs: [], quality: {}, developmentWorkspaces: [], dashboard: this.emptyDashboard(),
    }
    let parsedProject: unknown
    try { parsedProject = parse(await readFile(projectPath, 'utf8')) }
    catch (error) {
      return {
        workspace, initialized: true, configuration: { status: 'invalid', path: PROJECT_FILE, errors: [`YAML 解析失败：${error instanceof Error ? error.message : String(error)}`] },
        artifacts: [], sources: [], sourceProviders: this.sourceRegistry?.names() ?? [], connectors: [], workItems: [], runs: [], quality: {}, developmentWorkspaces: [], dashboard: this.emptyDashboard(),
      }
    }
    const validation = validateProject(parsedProject)
    if (validation.project === undefined) return {
      workspace, initialized: true, configuration: { status: 'invalid', path: PROJECT_FILE, errors: validation.errors },
      artifacts: [], sources: [], sourceProviders: this.sourceRegistry?.names() ?? [], connectors: [], workItems: [], runs: [], quality: {}, developmentWorkspaces: [], dashboard: this.emptyDashboard(),
    }
    const parsed = validation.project
    const project: ProjectConfig = {
      ...parsed,
      sources: parsed.sources ?? {},
      development: { ...parsed.development, repositories: parsed.development?.repositories ?? [] },
    }
    const artifacts: ArtifactSummary[] = []
    const artifactManifests = [...await walkForManifest(join(workspace.path, '.sdd', 'artifacts')), ...await walkForManifest(join(workspace.path, '.sdd', 'work-items'))]
    for (const manifestPath of [...new Set(artifactManifests)].sort()) {
      try {
        const parsedManifest = parse(await readFile(manifestPath, 'utf8')) as ArtifactManifest
        const manifest: ArtifactManifest = {
          ...parsedManifest,
          basedOn: parsedManifest.basedOn ?? [],
          derivedFrom: parsedManifest.derivedFrom ?? [],
          externalRefs: parsedManifest.externalRefs ?? [],
          checklist: parsedManifest.checklist ?? {},
        }
        const entryPath = typeof manifest.entry === 'string' ? join(dirname(manifestPath), manifest.entry) : manifestPath
        const entryExists = await exists(entryPath)
        const validationErrors = validateManifest(manifest, entryExists)
        if (manifest.template !== undefined) {
          const artifactRoot = dirname(manifestPath)
          const templatePath = resolve(artifactRoot, manifest.template.snapshotPath)
          const configPath = resolve(artifactRoot, manifest.template.configSnapshotPath)
          if (!contained(artifactRoot, templatePath) || !contained(artifactRoot, configPath)) validationErrors.push('template snapshot escapes artifact directory')
          else if (!(await exists(templatePath)) || !(await exists(configPath))) validationErrors.push('template snapshot files are missing')
          else {
            const actualTemplateHash = `sha256:${createHash('sha256').update(await readFile(templatePath)).digest('hex')}`
            if (actualTemplateHash !== manifest.template.contentHash) validationErrors.push('template snapshot differs from manifest hash')
          }
        }
        const files = await artifactFiles(dirname(manifestPath))
        if (entryExists && manifest.status === 'accepted') {
          const actualHash = artifactBundleHash(files)
          if (manifest.files === undefined) validationErrors.push('accepted artifact is missing its frozen file inventory')
          else if (JSON.stringify(manifest.files) !== JSON.stringify(files)) validationErrors.push('accepted artifact file inventory differs from disk')
          if (manifest.contentHash === undefined) validationErrors.push('accepted artifact is missing contentHash')
          else if (manifest.contentHash !== actualHash) validationErrors.push('accepted artifact bundle differs from its frozen hash')
        }
        artifacts.push({ ...manifest, files, relativeDirectory: relative(workspace.path, dirname(manifestPath)), validationErrors })
      } catch (error) {
        artifacts.push({
          schema: 'dsh-sdd/artifact@1', uid: manifestPath, key: 'INVALID', title: basename(dirname(manifestPath)),
          stage: 'requirements', type: 'invalid', version: '0.0.0', status: 'draft', entry: '', createdAt: '', updatedAt: '',
          basedOn: [], derivedFrom: [], externalRefs: [], files: [], relativeDirectory: relative(workspace.path, dirname(manifestPath)),
          validationErrors: [error instanceof Error ? error.message : String(error)],
        })
      }
    }
    const sources = await this.listSources(workspace.path)
    const workItems = await this.listWorkItems(workspace.path)
    const connectors = await this.listConnectors(workspace.path)
    const runs = await this.listRuns(workspace.path)
    const developmentWorkspaces = await listDevelopmentWorkspaces(workspace.path, artifacts)
    for (const run of runs) {
      if (run.status === 'completed' || run.sessionId === undefined) continue
      const artifact = artifacts.find(item => item.uid === run.artifactUid)
      if (artifact !== undefined) this.bindRuntime(run.sessionId, run.stage, workspace.path, project, artifact, developmentWorkspaces.find(item => item.artifactUid === artifact.uid), workItems.find(item => item.uid === artifact.workItemUid))
    }
    const quality: Record<string, QualityReport> = {}
    const partial = { artifacts, developmentWorkspaces }
    for (const artifact of artifacts) {
      if (artifact.entry === '' || !(await exists(join(workspace.path, artifact.relativeDirectory, artifact.entry)))) continue
      quality[artifact.uid] = evaluateQuality(artifact, await readFile(join(workspace.path, artifact.relativeDirectory, artifact.entry), 'utf8'), project, partial)
    }
    const recentEvents = await readRecentEvents(workspace.path)
    const dashboard = this.dashboard(artifacts, sources, workItems, quality, developmentWorkspaces, recentEvents)
    return { workspace, initialized: true, configuration: { status: 'valid', path: PROJECT_FILE, errors: [] }, project, artifacts, sources, sourceProviders: this.sourceRegistry?.names() ?? [], connectors, workItems, runs, quality, developmentWorkspaces, dashboard }
  }

  private async listConnectors(workspacePath: string): Promise<string[]> {
    const root = join(workspacePath, '.sdd', 'business', 'connectors')
    if (!(await exists(root))) return []
    return (await readdir(root, { withFileTypes: true }))
      .filter(item => item.isFile() && (item.name.endsWith('.yaml') || item.name.endsWith('.yml')))
      .map(item => item.name.replace(/\.ya?ml$/, ''))
      .filter(id => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))
      .sort()
  }

  private async listWorkItems(workspacePath: string): Promise<WorkItem[]> {
    const root = join(workspacePath, '.sdd', 'work-items')
    if (!(await exists(root))) return []
    const result: WorkItem[] = []
    for (const directory of await readdir(root, { withFileTypes: true })) {
      if (!directory.isDirectory()) continue
      const path = join(root, directory.name, 'work-item.yaml')
      if (!(await exists(path))) continue
      try {
        const item = parse(await readFile(path, 'utf8')) as WorkItem
        if (item.schema !== 'dsh-sdd/work-item@1' || typeof item.uid !== 'string' || typeof item.key !== 'string') continue
        result.push({ ...item, relations: item.relations ?? [] })
      } catch { /* invalid work items are ignored until their YAML is repaired */ }
    }
    return result.sort((left, right) => left.key.localeCompare(right.key))
  }

  private async createDraft(
    workspaceId: string,
    stage: StageId,
    title: string,
    basedOn: string[],
    sourceUids: string[],
    workItemUid: string | undefined,
  ): Promise<void> {
    if (title.trim() === '') throw new Error('title must not be empty')
    await this.initialize(workspaceId)
    const snapshot = await this.snapshot(workspaceId)
    const workItem = workItemUid === undefined ? undefined : snapshot.workItems.find(item => item.uid === workItemUid)
    if (workItemUid !== undefined && workItem === undefined) throw new Error(`work item not found: ${workItemUid}`)
    const definition = stageDefinition(stage)
    const stageTemplate = await loadStageTemplate(snapshot.workspace.path, stage)
    const key = this.nextKey(snapshot.artifacts, definition.prefix)
    if (snapshot.artifacts.some(item => item.key === key)) throw new Error(`artifact key already exists: ${key}`)
    const uid = randomUUID()
    const artifactRoot = workItem === undefined
      ? join(snapshot.workspace.path, '.sdd', 'artifacts')
      : join(snapshot.workspace.path, '.sdd', 'work-items', workItem.uid, 'artifacts')
    const directory = join(artifactRoot, stage, `${slug(key)}-${uid.slice(0, 8)}`)
    await mkdir(directory, { recursive: true })
    const now = new Date().toISOString()
    const refs = basedOn.map(inputUid => {
      const input = snapshot.artifacts.find(item => item.uid === inputUid)
      if (input === undefined) throw new Error(`input artifact not found: ${inputUid}`)
      if (input.status !== 'accepted') throw new Error(`input artifact is not accepted: ${input.key}`)
      if (input.validationErrors.length > 0) throw new Error(`input artifact is invalid: ${input.key}: ${input.validationErrors.join('; ')}`)
      if (workItem !== undefined && input.workItemUid !== workItem.uid) throw new Error(`input artifact belongs to another work item: ${input.key}`)
      return { uid: input.uid, version: input.version, contentHash: input.contentHash }
    })
    const sourceRefs = sourceUids.map(sourceUid => {
      const source = snapshot.sources.find(item => item.uid === sourceUid)
      if (source === undefined) throw new Error(`source not found: ${sourceUid}`)
      if (source.validationErrors.length > 0) throw new Error(`source is invalid: ${source.title}: ${source.validationErrors.join('; ')}`)
      if (workItem !== undefined && source.uid !== workItem.sourceUid && source.uid !== workItem.bundleSourceUid) throw new Error(`source is not current for work item ${workItem.key}`)
      return {
        uid: source.uid, provider: source.provider, kind: source.kind,
        ...(source.externalKey === undefined ? {} : { externalKey: source.externalKey }),
        ...(source.contentHash === undefined ? {} : { contentHash: source.contentHash }),
      }
    })
    const requiredStages = Object.entries(snapshot.project?.dependencies[stage] ?? {})
      .filter(([, mode]) => mode === 'required').map(([requiredStage]) => requiredStage)
    for (const requiredStage of requiredStages) {
      if (!refs.some(ref => snapshot.artifacts.find(item => item.uid === ref.uid)?.stage === requiredStage)) {
        throw new Error(`missing required ${requiredStage} input for ${stage}`)
      }
    }
    const manifest: ArtifactManifest = {
      schema: 'dsh-sdd/artifact@1', uid, key, title: title.trim(), stage, type: definition.outputType,
      version: '0.1.0', status: 'draft', entry: 'deliverable.md', createdAt: now, updatedAt: now,
      basedOn: refs, derivedFrom: sourceRefs, externalRefs: [],
      checklist: Object.fromEntries(runtimeDefinition(stage).completionChecklist.map((_label, index) => [`item-${index + 1}`, false])),
      ...(workItem === undefined ? {} : { workItemUid: workItem.uid }),
    }
    manifest.template = await snapshotStageTemplate(directory, stageTemplate)
    await writeFile(join(directory, 'manifest.yaml'), stringify(manifest), 'utf8')
    await writeFile(join(directory, 'deliverable.md'), renderStageTemplate(stageTemplate, key, title.trim()), 'utf8')
    await appendEvent(snapshot.workspace.path, 'artifact.created', key, stage, { artifactUid: uid })
  }

  private async createRevision(workspaceId: string, artifactUid: string): Promise<void> {
    const snapshot = await this.requireSnapshot(workspaceId)
    const previous = this.requireArtifact(snapshot, artifactUid)
    if (previous.status !== 'accepted') throw new Error('only an accepted artifact can start a new revision')
    if (snapshot.artifacts.some(item => item.supersedes?.uid === previous.uid && item.status !== 'superseded')) throw new Error('this artifact already has an active revision')
    const uid = randomUUID()
    const previousDirectory = resolve(snapshot.workspace.path, previous.relativeDirectory)
    const parent = dirname(previousDirectory)
    const directory = join(parent, `${slug(previous.key)}-${uid.slice(0, 8)}`)
    await mkdir(directory, { recursive: true })
    for (const file of previous.files) {
      const source = resolve(previousDirectory, file.path)
      const target = resolve(directory, file.path)
      if (!contained(previousDirectory, source) || !contained(directory, target)) throw new Error('artifact file escapes its directory')
      await mkdir(dirname(target), { recursive: true })
      await copyFile(source, target)
    }
    const now = new Date().toISOString()
    const manifest: ArtifactManifest = {
      schema: 'dsh-sdd/artifact@1', uid, key: previous.key, title: previous.title, stage: previous.stage, type: previous.type,
      version: nextVersion(previous.version), status: 'draft', entry: previous.entry, createdAt: now, updatedAt: now,
      basedOn: previous.basedOn, derivedFrom: previous.derivedFrom, externalRefs: previous.externalRefs,
      checklist: Object.fromEntries(runtimeDefinition(previous.stage).completionChecklist.map((_label, index) => [`item-${index + 1}`, false])),
      ...(previous.template === undefined ? {} : { template: previous.template }),
      supersedes: { uid: previous.uid, version: previous.version, contentHash: previous.contentHash },
      ...(previous.workItemUid === undefined ? {} : { workItemUid: previous.workItemUid }),
    }
    await writeFile(join(directory, 'manifest.yaml'), stringify(manifest), 'utf8')
    await appendEvent(snapshot.workspace.path, 'artifact.revision-created', previous.key, previous.stage, { artifactUid: uid, supersedes: previous.uid, version: manifest.version })
  }

  private async discardDraft(workspaceId: string, artifactUid: string): Promise<void> {
    const snapshot = await this.requireSnapshot(workspaceId)
    const artifact = this.requireArtifact(snapshot, artifactUid)
    if (artifact.status !== 'draft' && artifact.status !== 'in-review') throw new Error('only a draft or in-review artifact can be discarded')
    if (snapshot.developmentWorkspaces.some(item => item.artifactUid === artifact.uid)) throw new Error('cannot discard an artifact after its development workspace has been created')
    const root = resolve(snapshot.workspace.path, '.sdd')
    const source = resolve(snapshot.workspace.path, artifact.relativeDirectory)
    if (!contained(root, source)) throw new Error('artifact directory escapes .sdd')
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const artifactTrash = join(root, 'trash', 'artifacts', `${stamp}-${artifact.uid}`)
    await mkdir(dirname(artifactTrash), { recursive: true })
    await rename(source, artifactTrash)
    for (const run of snapshot.runs.filter(item => item.artifactUid === artifact.uid)) {
      if (run.sessionId !== undefined) this.sessionController?.unbind(run.sessionId)
      const runSource = join(root, 'runs', `${run.uid}.yaml`)
      if (await exists(runSource)) {
        const runTrash = join(root, 'trash', 'runs', `${stamp}-${run.uid}.yaml`)
        await mkdir(dirname(runTrash), { recursive: true })
        await rename(runSource, runTrash)
      }
    }
    await appendEvent(snapshot.workspace.path, 'artifact.discarded', artifact.key, artifact.stage, { artifactUid, version: artifact.version, trashPath: relative(snapshot.workspace.path, artifactTrash) })
  }

  private async readArtifactFile(workspaceId: string, artifactUid: string, requestedPath: string): Promise<{ artifactUid: string; path: string; kind: ArtifactFileSummary['kind'] | 'manifest'; content?: string; dataUrl?: string }> {
    const snapshot = await this.requireSnapshot(workspaceId)
    const artifact = this.requireArtifact(snapshot, artifactUid)
    const manifest = requestedPath === 'manifest.yaml'
    const file = manifest ? undefined : artifact.files.find(item => item.path === requestedPath)
    if (!manifest && file === undefined) throw new Error(`artifact file not found: ${requestedPath}`)
    const root = resolve(snapshot.workspace.path, artifact.relativeDirectory)
    const path = resolve(root, requestedPath)
    if (!contained(root, path)) throw new Error('artifact file escapes its directory')
    if (manifest) return { artifactUid, path: requestedPath, kind: 'manifest', content: await readFile(path, 'utf8') }
    if (file!.kind === 'binary') return { artifactUid, path: requestedPath, kind: 'binary' }
    if (file!.kind === 'image') {
      if (file!.size > 8 * 1024 * 1024) throw new Error('artifact image preview is limited to 8 MiB')
      const extension = requestedPath.toLowerCase().split('.').pop() ?? ''
      const mime = ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' } as Record<string, string>)[extension] ?? 'application/octet-stream'
      return { artifactUid, path: requestedPath, kind: 'image', dataUrl: `data:${mime};base64,${(await readFile(path)).toString('base64')}` }
    }
    if (file!.size > 2 * 1024 * 1024) throw new Error('artifact text preview is limited to 2 MiB')
    return { artifactUid, path: requestedPath, kind: file!.kind, content: await readFile(path, 'utf8') }
  }

  private async openArtifactPath(workspaceId: string, artifactUid: string, requestedPath: string): Promise<void> {
    const snapshot = await this.requireSnapshot(workspaceId)
    const artifact = this.requireArtifact(snapshot, artifactUid)
    const root = resolve(snapshot.workspace.path, artifact.relativeDirectory)
    const path = resolve(root, requestedPath || '.')
    if (!contained(root, path)) throw new Error('artifact path escapes its directory')
    await access(path)
    const response = await this.api.host.openPath(request({ path }), AbortSignal.timeout(15_000))
    if (!response.result.ok) throw new Error(`${response.result.error.code}: ${response.result.error.message}`)
  }

  private async readStageTemplate(workspaceId: string, stage: StageId): Promise<StageTemplatePreview> {
    const snapshot = await this.requireSnapshot(workspaceId)
    const template = await loadStageTemplate(snapshot.workspace.path, stage)
    return {
      stage, version: template.config.version, documentName: template.config.documentName,
      directory: template.directoryRelative, configPath: template.configRelative, contentPath: template.contentRelative,
      contentHash: template.contentHash, requiredSections: template.config.requiredSections, content: template.content,
    }
  }

  private async openStageTemplate(workspaceId: string, stage: StageId, target: 'directory' | 'config' | 'content'): Promise<void> {
    const snapshot = await this.requireSnapshot(workspaceId)
    const template = await loadStageTemplate(snapshot.workspace.path, stage)
    const path = target === 'directory' ? template.directory : resolve(snapshot.workspace.path, target === 'config' ? template.configRelative : template.contentRelative)
    const root = resolve(snapshot.workspace.path, '.sdd', 'templates')
    if (!contained(root, path)) throw new Error('template path escapes .sdd/templates')
    const response = await this.api.host.openPath(request({ path }), AbortSignal.timeout(15_000))
    if (!response.result.ok) throw new Error(`${response.result.error.code}: ${response.result.error.message}`)
  }

  private async updateWorkItemSettings(
    workspaceId: string, workItemUid: string, repositoryScope: string[], developmentTargets: string[],
    openSpec?: { enabled: boolean; repositoryId?: string; path?: string },
  ): Promise<void> {
    const snapshot = await this.requireSnapshot(workspaceId)
    const workItem = snapshot.workItems.find(item => item.uid === workItemUid)
    if (workItem === undefined) throw new Error(`work item not found: ${workItemUid}`)
    const configured = new Set(snapshot.project.development.repositories.map(item => item.id))
    const scope = [...new Set(repositoryScope)]
    const targets = [...new Set(developmentTargets)]
    if (scope.some(id => !configured.has(id))) throw new Error('repository scope contains an unconfigured repository')
    if (targets.some(id => !scope.includes(id))) throw new Error('development targets must be inside the confirmed repository scope')
    if (openSpec?.enabled === true) {
      if (openSpec.repositoryId === undefined || !targets.includes(openSpec.repositoryId)) throw new Error('OpenSpec repository must be a confirmed development target')
      if (openSpec.path === undefined || openSpec.path.trim() === '' || isAbsolute(openSpec.path) || openSpec.path.split(/[\\/]/).includes('..')) throw new Error('OpenSpec path must be a safe repository-relative path')
    }
    const updated: WorkItem = { ...workItem, repositoryScope: scope, developmentTargets: targets, openSpec: openSpec?.enabled === true ? { enabled: true, repositoryId: openSpec.repositoryId, path: openSpec.path!.trim() } : { enabled: false }, updatedAt: new Date().toISOString() }
    await writeFile(join(snapshot.workspace.path, '.sdd', 'work-items', workItem.uid, 'work-item.yaml'), stringify(updated), 'utf8')
    await appendEvent(snapshot.workspace.path, 'work-item.development-settings-updated', workItem.key, undefined, { repositoryScope: scope, developmentTargets: targets, openSpec: updated.openSpec })
  }

  private async addProjectRepository(workspaceId: string, id: string, source: string, baseBranch: string): Promise<void> {
    const snapshot = await this.requireSnapshot(workspaceId)
    const normalizedId = id.trim()
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedId)) throw new Error('repository id must be kebab-case')
    if (source.trim() === '' || baseBranch.trim() === '') throw new Error('repository source and base branch are required')
    if (snapshot.project.development.repositories.some(item => item.id === normalizedId)) throw new Error(`repository already exists: ${normalizedId}`)
    const sourceKind = await this.git.validateSource(snapshot.workspace.path, source.trim(), baseBranch.trim())
    const project = { ...snapshot.project, development: { ...snapshot.project.development, repositories: [...snapshot.project.development.repositories, { id: normalizedId, source: source.trim(), baseBranch: baseBranch.trim(), testCommands: [] }] } }
    await writeFile(join(snapshot.workspace.path, PROJECT_FILE), stringify(project), 'utf8')
    await appendEvent(snapshot.workspace.path, 'project.repository-added', normalizedId, undefined, { source: source.trim(), baseBranch: baseBranch.trim(), sourceKind })
  }

  private async removeProjectRepository(workspaceId: string, id: string): Promise<void> {
    const snapshot = await this.requireSnapshot(workspaceId)
    const repository = snapshot.project.development.repositories.find(item => item.id === id)
    if (repository === undefined) throw new Error(`repository not found: ${id}`)
    if (snapshot.developmentWorkspaces.some(workspace => workspace.repositories.some(item => item.id === id))) {
      throw new Error('cannot remove a repository after an isolated development workspace has been created')
    }
    const project = { ...snapshot.project, development: { ...snapshot.project.development, repositories: snapshot.project.development.repositories.filter(item => item.id !== id) } }
    await writeFile(join(snapshot.workspace.path, PROJECT_FILE), stringify(project), 'utf8')
    for (const workItem of snapshot.workItems) {
      if (!(workItem.repositoryScope?.includes(id) || workItem.developmentTargets?.includes(id) || workItem.openSpec?.repositoryId === id)) continue
      const updated: WorkItem = {
        ...workItem,
        repositoryScope: (workItem.repositoryScope ?? []).filter(item => item !== id),
        developmentTargets: (workItem.developmentTargets ?? []).filter(item => item !== id),
        openSpec: workItem.openSpec?.repositoryId === id ? { enabled: false } : workItem.openSpec,
        updatedAt: new Date().toISOString(),
      }
      await writeFile(join(snapshot.workspace.path, '.sdd', 'work-items', workItem.uid, 'work-item.yaml'), stringify(updated), 'utf8')
    }
    await appendEvent(snapshot.workspace.path, 'project.repository-removed', id, undefined, { source: repository.source })
  }

  private nextKey(artifacts: ArtifactSummary[], prefix: string): string {
    const expression = new RegExp(`^${prefix}-(\\d+)$`)
    const largest = artifacts.reduce((value, item) => {
      const match = expression.exec(item.key)
      return match === null ? value : Math.max(value, Number(match[1]))
    }, 0)
    return `${prefix}-${String(largest + 1).padStart(4, '0')}`
  }

  private async listSources(workspacePath: string): Promise<SourceSummary[]> {
    const root = join(workspacePath, '.sdd', 'sources')
    if (!(await exists(root))) return []
    const result: SourceSummary[] = []
    for (const item of await readdir(root, { withFileTypes: true })) {
      if (!item.isFile() || (!item.name.endsWith('.yaml') && !item.name.endsWith('.yml'))) continue
      const path = join(root, item.name)
      try {
        const source = validateSourceEnvelope(parse(await readFile(path, 'utf8')))
        const validationErrors: string[] = []
        const actualHash = `sha256:${createHash('sha256').update(JSON.stringify(source.content)).digest('hex')}`
        if (source.contentHash === undefined) validationErrors.push('source is missing contentHash')
        else if (source.contentHash !== actualHash) validationErrors.push('source content differs from its recorded hash')
        result.push({ ...source, relativePath: relative(workspacePath, path), validationErrors })
      } catch (error) {
        result.push({
          schema: 'dsh-sdd/source@1', uid: path, provider: 'invalid', kind: 'invalid', title: item.name,
          fetchedAt: '', content: null, relativePath: relative(workspacePath, path),
          validationErrors: [error instanceof Error ? error.message : String(error)],
        })
      }
    }
    return result.sort((left, right) => left.title.localeCompare(right.title))
  }

  private async previewSourceImport(
    workspaceId: string,
    providerName: string,
    kind: string,
    key: string,
    connector: string | undefined,
    input: unknown,
  ): Promise<ImportPreview> {
    if (kind.trim() === '' || key.trim() === '') throw new Error('source kind and key are required')
    await this.initialize(workspaceId)
    const snapshot = await this.snapshot(workspaceId)
    if (snapshot.project === undefined) throw new Error('SDD project is not initialized')
    if (this.sourceRegistry === undefined) throw new Error('source registry is unavailable')
    const bundle = await this.sourceRegistry.fetch(providerName, {
      kind: kind.trim(), key: key.trim(),
      workspace: { workspaceId, path: snapshot.workspace.path, project: snapshot.project },
      ...(connector === undefined ? {} : { connector }),
      ...(input === undefined ? {} : { input }),
      signal: AbortSignal.timeout(60_000),
    })
    const incoming = bundle.items
    const existing = snapshot.workItems.filter(item => item.bundleKey === bundle.externalKey && item.provider === bundle.provider)
    const nextIdentities = new Set(incoming.map(sourceIdentity))
    const items: ImportPreviewItem[] = incoming.map(source => {
      const identity = sourceIdentity(source)
      const workItem = existing.find(item => item.provider === source.provider && item.kind === source.kind && item.key === (source.externalKey ?? source.uid))
      if (workItem === undefined) return { identity, externalKey: source.externalKey ?? source.uid, title: source.title, kind: source.kind, change: 'added', changedPaths: [] }
      const previous = snapshot.sources.find(item => item.uid === workItem.sourceUid)
      const previousRoot = snapshot.sources.find(item => item.uid === workItem.bundleSourceUid)
      const comparable = (value: SourceEnvelope) => ({ title: value.title, status: value.status, revision: value.revision, tracking: value.tracking, links: value.links, content: value.content })
      const paths = previous === undefined ? ['source'] : changedPaths(comparable(previous), comparable(source), 'source')
      if (bundle.root !== undefined && previousRoot !== undefined) {
        changedPaths(comparable(previousRoot), comparable(bundle.root), 'bundle').forEach(path => paths.push(path))
      }
      const uniquePaths = [...new Set(paths)]
      return { identity, externalKey: source.externalKey ?? source.uid, title: source.title, kind: source.kind, change: uniquePaths.length === 0 ? 'unchanged' : 'modified', changedPaths: uniquePaths, workItemUid: workItem.uid }
    })
    for (const workItem of existing) {
      const identity = `${workItem.provider}:${workItem.kind}:${workItem.key}`
      if (!nextIdentities.has(identity)) items.push({ identity, externalKey: workItem.key, title: workItem.title, kind: workItem.kind, change: 'removed', changedPaths: ['removed'], workItemUid: workItem.uid })
    }
    const preview: ImportPreview = {
      schema: 'dsh-sdd/import-preview@1', uid: randomUUID(), bundleKey: bundle.externalKey,
      bundleTitle: bundle.title, provider: bundle.provider, fetchedAt: bundle.fetchedAt, items,
    }
    const staged: StagedImport = { preview, bundle }
    await writeFile(join(snapshot.workspace.path, '.sdd', 'imports', 'pending', `${preview.uid}.yaml`), stringify(staged), 'utf8')
    return preview
  }

  private async writeSourceSnapshot(workspacePath: string, sources: SourceSummary[], source: SourceEnvelope): Promise<string> {
    const hash = sourceHash(source)
    const versionHash = sourceVersionHash(source)
    const same = sources.find(item => sourceIdentity(item) === sourceIdentity(source) && sourceVersionHash(item) === versionHash)
    if (same !== undefined) return same.uid
    const uid = sources.some(item => item.uid === source.uid) ? `${source.uid}@${versionHash.slice(0, 12)}` : source.uid
    const normalized: SourceEnvelope = { ...source, uid, contentHash: hash }
    const filename = `${slug(normalized.provider)}-${slug(normalized.externalKey ?? normalized.uid)}-${versionHash.slice(0, 12)}.yaml`
    await writeFile(join(workspacePath, '.sdd', 'sources', filename), stringify(normalized), 'utf8')
    sources.push({ ...normalized, relativePath: relative(workspacePath, join(workspacePath, '.sdd', 'sources', filename)), validationErrors: [] })
    return uid
  }

  private async applySourceImport(workspaceId: string, previewUid: string, identities: string[]): Promise<void> {
    if (!/^[0-9a-f-]{36}$/i.test(previewUid)) throw new Error('invalid import preview id')
    const snapshot = await this.requireSnapshot(workspaceId)
    const path = join(snapshot.workspace.path, '.sdd', 'imports', 'pending', `${previewUid}.yaml`)
    if (!(await exists(path))) throw new Error('import preview not found or expired')
    const staged = parse(await readFile(path, 'utf8')) as StagedImport
    if (staged.preview?.schema !== 'dsh-sdd/import-preview@1' || staged.preview.uid !== previewUid) throw new Error('invalid staged import')
    const selected = new Set(identities)
    const incoming = staged.bundle.items
    const sources = [...snapshot.sources]
    const actionable = staged.preview.items.filter(item => selected.has(item.identity) && item.change !== 'unchanged')
    const needsBundleRoot = staged.bundle.root !== undefined && actionable.some(item => item.change !== 'removed')
    const bundleSourceUid = needsBundleRoot ? await this.writeSourceSnapshot(snapshot.workspace.path, sources, staged.bundle.root!) : undefined
    for (const previewItem of actionable) {
      const existing = previewItem.workItemUid === undefined ? undefined : snapshot.workItems.find(item => item.uid === previewItem.workItemUid)
      if (previewItem.change === 'removed') {
        if (existing === undefined) continue
        const artifacts = snapshot.artifacts.filter(item => item.workItemUid === existing.uid && item.status === 'accepted')
        const workItem: WorkItem = { ...existing, status: 'removed-pending', updatedAt: new Date().toISOString(), change: { kind: 'removed', detectedAt: new Date().toISOString(), changedPaths: ['removed'], previousSourceUid: existing.sourceUid, reviewRequiredStages: [...new Set(artifacts.map(item => item.stage))] } }
        await writeFile(join(snapshot.workspace.path, '.sdd', 'work-items', existing.uid, 'work-item.yaml'), stringify(workItem), 'utf8')
        await appendEvent(snapshot.workspace.path, 'work-item.removal-detected', existing.key, undefined, { workItemUid: existing.uid, bundleKey: staged.bundle.externalKey })
        continue
      }
      const source = incoming.find(item => sourceIdentity(item) === previewItem.identity)
      if (source === undefined) throw new Error(`staged source is missing: ${previewItem.identity}`)
      const sourceUid = await this.writeSourceSnapshot(snapshot.workspace.path, sources, source)
      const now = new Date().toISOString()
      const uid = existing?.uid ?? randomUUID()
      const acceptedStages = snapshot.artifacts.filter(item => item.workItemUid === uid && item.status === 'accepted').map(item => item.stage)
      const workItem: WorkItem = {
        schema: 'dsh-sdd/work-item@1', uid, key: source.externalKey ?? source.uid, title: source.title,
        kind: source.kind, provider: source.provider, bundleKey: staged.bundle.externalKey, sourceUid,
        ...(bundleSourceUid === undefined ? {} : { bundleSourceUid }),
        relations: staged.bundle.relations.filter(relation => relation.from === (source.externalKey ?? source.uid) || relation.to === (source.externalKey ?? source.uid)),
        status: existing === undefined ? 'active' : 'change-pending', createdAt: existing?.createdAt ?? now, updatedAt: now,
        ...(existing?.repositoryScope === undefined ? {} : { repositoryScope: existing.repositoryScope }),
        ...(existing?.developmentTargets === undefined ? {} : { developmentTargets: existing.developmentTargets }),
        ...(existing?.openSpec === undefined ? {} : { openSpec: existing.openSpec }),
        ...(existing === undefined ? {} : { change: { kind: 'modified', detectedAt: now, changedPaths: previewItem.changedPaths, previousSourceUid: existing.sourceUid, reviewRequiredStages: [...new Set<StageId>(['requirements', ...acceptedStages])] } }),
      }
      await mkdir(join(snapshot.workspace.path, '.sdd', 'work-items', uid), { recursive: true })
      await writeFile(join(snapshot.workspace.path, '.sdd', 'work-items', uid, 'work-item.yaml'), stringify(workItem), 'utf8')
      await appendEvent(snapshot.workspace.path, existing === undefined ? 'work-item.created' : 'work-item.change-detected', workItem.key, undefined, { workItemUid: uid, bundleKey: staged.bundle.externalKey, changedPaths: previewItem.changedPaths })
    }
    await appendEvent(snapshot.workspace.path, 'source-bundle.applied', staged.bundle.externalKey, undefined, { previewUid, selected: actionable.length, total: staged.preview.items.length })
    const historyName = `${new Date().toISOString().replace(/[:.]/g, '-')}-${previewUid}.yaml`
    await writeFile(join(snapshot.workspace.path, '.sdd', 'imports', 'history', historyName), stringify({ schema: 'dsh-sdd/import-record@1', preview: staged.preview, appliedAt: new Date().toISOString(), identities: [...selected], relations: staged.bundle.relations }), 'utf8')
    await unlink(path)
  }

  private async resolveWorkItemRemoval(workspaceId: string, workItemUid: string, decision: 'keep' | 'archive'): Promise<void> {
    const snapshot = await this.requireSnapshot(workspaceId)
    const workItem = snapshot.workItems.find(item => item.uid === workItemUid)
    if (workItem === undefined) throw new Error(`work item not found: ${workItemUid}`)
    if (workItem.status !== 'removed-pending') throw new Error(`work item ${workItem.key} has no pending removal`)
    const updated: WorkItem = { ...workItem, status: decision === 'archive' ? 'completed' : 'active', updatedAt: new Date().toISOString(), change: undefined }
    await writeFile(join(snapshot.workspace.path, '.sdd', 'work-items', workItem.uid, 'work-item.yaml'), stringify(updated), 'utf8')
    await appendEvent(snapshot.workspace.path, decision === 'archive' ? 'work-item.archived' : 'work-item.removal-dismissed', workItem.key, undefined, { workItemUid })
  }

  private hasCurrentChangeEvidence(snapshot: ProjectSnapshot, artifact: ArtifactSummary, workItem: WorkItem): boolean {
    if (workItem.change === undefined || !workItem.change.reviewRequiredStages.includes(artifact.stage)) return true
    if (artifact.stage === 'requirements') {
      return workItem.sourceUid !== undefined && artifact.derivedFrom.some(reference => reference.uid === workItem.sourceUid)
    }
    const detectedAt = Date.parse(workItem.change.detectedAt)
    return artifact.basedOn.some(reference => {
      const input = snapshot.artifacts.find(item => item.uid === reference.uid)
      return input?.workItemUid === workItem.uid && input.status === 'accepted' && Date.parse(input.updatedAt) >= detectedAt
    })
  }

  private stageSettingsError(snapshot: ProjectSnapshot & { project?: ProjectConfig }, artifact: ArtifactSummary): string | undefined {
    if (artifact.workItemUid === undefined) return undefined
    const workItem = snapshot.workItems.find(item => item.uid === artifact.workItemUid)
    if (workItem === undefined) return 'bound work item is missing'
    const configured = new Set(snapshot.project?.development.repositories.map(item => item.id) ?? [])
    if (artifact.stage === 'architecture') {
      if ((workItem.repositoryScope ?? []).length === 0) return '系统设计阶段必须先确认涉及的代码仓库范围'
      if (workItem.repositoryScope!.some(id => !configured.has(id))) return '代码仓库范围包含未配置仓库'
    }
    if (artifact.stage === 'specification' || artifact.stage === 'development') {
      if ((workItem.developmentTargets ?? []).length === 0) return '规格设计阶段必须先确认本需求的开发目标仓库'
      if (workItem.developmentTargets!.some(id => !(workItem.repositoryScope ?? []).includes(id))) return '开发目标仓库必须属于系统设计确认的仓库范围'
    }
    return undefined
  }

  private async accept(workspaceId: string, artifactUid: string, checklist?: Record<string, boolean>): Promise<void> {
    let snapshot = await this.snapshot(workspaceId)
    let artifact = snapshot.artifacts.find(item => item.uid === artifactUid)
    if (artifact === undefined) throw new Error(`artifact not found: ${artifactUid}`)
    if (artifact.status !== 'draft' && artifact.status !== 'in-review') throw new Error(`artifact cannot be accepted from ${artifact.status}`)
    if (artifact.validationErrors.length > 0) throw new Error(`artifact validation failed: ${artifact.validationErrors.join('; ')}`)
    const changedWorkItem = artifact.workItemUid === undefined ? undefined : snapshot.workItems.find(item => item.uid === artifact!.workItemUid)
    if (changedWorkItem?.status === 'removed-pending') throw new Error(`work item ${changedWorkItem.key} was removed externally; resolve the removal before accepting artifacts`)
    if (changedWorkItem !== undefined && !this.hasCurrentChangeEvidence(snapshot, artifact, changedWorkItem)) throw new Error(`artifact does not include current change evidence for work item ${changedWorkItem.key}`)
    const settingsError = this.stageSettingsError(snapshot, artifact)
    if (settingsError !== undefined) throw new Error(settingsError)
    const directory = resolve(snapshot.workspace.path, artifact.relativeDirectory)
    const entryPath = resolve(directory, artifact.entry)
    const entryRelative = relative(directory, entryPath)
    if (entryRelative.startsWith('..') || isAbsolute(entryRelative)) throw new Error('artifact entry escapes its directory')
    const content = await readFile(entryPath, 'utf8')
    if (content.trim() === '') throw new Error('artifact entry is empty')
    if (content.includes('待补充。')) throw new Error('artifact still contains template placeholders')
    const manifestPath = join(directory, 'manifest.yaml')
    const manifest = parse(await readFile(manifestPath, 'utf8')) as ArtifactManifest & { contentHash?: string }
    if (checklist !== undefined) manifest.checklist = checklist
    manifest.status = 'in-review'
    manifest.updatedAt = new Date().toISOString()
    await writeFile(manifestPath, stringify(manifest), 'utf8')
    snapshot = await this.snapshot(workspaceId)
    artifact = this.requireArtifact(snapshot as ProjectSnapshot & { project: ProjectConfig }, artifactUid)
    const report = snapshot.quality[artifactUid]
    if (report === undefined || !report.ready) {
      const failures = report?.checks.filter(item => item.status === 'failed').map(item => item.label) ?? ['质量报告不可用']
      throw new Error(`artifact quality gates failed: ${failures.join('; ')}`)
    }
    manifest.status = 'accepted'
    manifest.updatedAt = new Date().toISOString()
    manifest.files = await artifactFiles(directory)
    manifest.contentHash = artifactBundleHash(manifest.files)
    await writeFile(manifestPath, stringify(manifest), 'utf8')
    if (manifest.supersedes !== undefined) {
      const previous = snapshot.artifacts.find(item => item.uid === manifest.supersedes!.uid)
      if (previous === undefined || previous.status !== 'accepted') throw new Error('superseded artifact must still be accepted')
      const previousPath = join(snapshot.workspace.path, previous.relativeDirectory, 'manifest.yaml')
      const previousManifest = parse(await readFile(previousPath, 'utf8')) as ArtifactManifest
      previousManifest.status = 'superseded'
      previousManifest.updatedAt = manifest.updatedAt
      await writeFile(previousPath, stringify(previousManifest), 'utf8')
    }
    if (artifact.workItemUid !== undefined) {
      const workItem = snapshot.workItems.find(item => item.uid === artifact!.workItemUid)
      if (workItem?.change !== undefined && workItem.status === 'change-pending') {
        const reviewRequiredStages = workItem.change.reviewRequiredStages.filter(stage => stage !== artifact!.stage)
        const updated: WorkItem = reviewRequiredStages.length === 0
          ? { ...workItem, status: 'active', updatedAt: manifest.updatedAt, change: undefined }
          : { ...workItem, updatedAt: manifest.updatedAt, change: { ...workItem.change, reviewRequiredStages } }
        await writeFile(join(snapshot.workspace.path, '.sdd', 'work-items', workItem.uid, 'work-item.yaml'), stringify(updated), 'utf8')
      }
    }
    await appendEvent(snapshot.workspace.path, 'artifact.accepted', artifact.key, artifact.stage, { artifactUid })
  }

  private async context(workspaceId: string, stage: StageId, artifactUid: string, artifactUids: string[], sourceUids: string[]): Promise<string> {
    const snapshot = await this.requireSnapshot(workspaceId)
    const target = this.requireArtifact(snapshot, artifactUid)
    if (target.stage !== stage) throw new Error(`bound artifact belongs to ${target.stage}, not ${stage}`)
    if (target.status !== 'draft' && target.status !== 'in-review') throw new Error('conversation must bind to a draft or in-review artifact')
    const expectedArtifacts = new Set(target.basedOn.map(item => item.uid))
    const expectedSources = new Set(target.derivedFrom.map(item => item.uid))
    if (artifactUids.length !== expectedArtifacts.size || artifactUids.some(uid => !expectedArtifacts.has(uid))) throw new Error('conversation artifact inputs must match the bound artifact manifest')
    if (sourceUids.length !== expectedSources.size || sourceUids.some(uid => !expectedSources.has(uid))) throw new Error('conversation source inputs must match the bound artifact manifest')
    const selected = artifactUids.map(uid => {
      const artifact = snapshot.artifacts.find(item => item.uid === uid)
      if (artifact === undefined) throw new Error(`artifact not found: ${uid}`)
      if (artifact.status !== 'accepted') throw new Error(`artifact is not accepted: ${artifact.key}`)
      if (artifact.validationErrors.length > 0) throw new Error(`artifact is invalid: ${artifact.key}: ${artifact.validationErrors.join('; ')}`)
      return artifact
    })
    const workItem = target.workItemUid === undefined ? undefined : snapshot.workItems.find(item => item.uid === target.workItemUid)
    if (workItem?.status === 'removed-pending') throw new Error(`work item ${workItem.key} was removed externally; its stage conversations are blocked`)
    if (workItem !== undefined && !this.hasCurrentChangeEvidence(snapshot, target, workItem)) throw new Error(`bound artifact does not include current change evidence for work item ${workItem.key}; create a new revision from the latest source and upstream artifacts`)
    const settingsError = this.stageSettingsError(snapshot, target)
    if (settingsError !== undefined) throw new Error(settingsError)
    const definition = stageDefinition(stage)
    const runtime = runtimeDefinition(stage)
    const required = Object.entries(snapshot.project.dependencies[stage] ?? {}).filter(([, mode]) => mode === 'required').map(([id]) => id)
    for (const requiredStage of required) {
      if (!selected.some(item => item.stage === requiredStage)) throw new Error(`conversation input is missing required ${requiredStage} artifact`)
    }
    const inputs: string[] = []
    for (const artifact of selected) {
      const path = join(snapshot.workspace.path, artifact.relativeDirectory, artifact.entry)
      const inventory = artifact.files.map(file => `- ${artifact.relativeDirectory}/${file.path} · ${file.kind} · ${file.contentHash}`).join('\n')
      inputs.push(`\n## 输入 ${artifact.key} v${artifact.version}\n主文档：${artifact.relativeDirectory}/${artifact.entry}\n交付包哈希：${artifact.contentHash ?? '未记录'}\n文件清单：\n${inventory || '- 无'}\n\n${await readFile(path, 'utf8')}`)
    }
    for (const uid of sourceUids) {
      const source = snapshot.sources.find(item => item.uid === uid)
      if (source === undefined) throw new Error(`source not found: ${uid}`)
      if (source.validationErrors.length > 0) throw new Error(`source is invalid: ${source.title}: ${source.validationErrors.join('; ')}`)
      inputs.push(`\n## 原始来源 ${source.externalKey ?? source.uid} · ${source.title}\nProvider：${source.provider}\n类型：${source.kind}\n内容哈希：${source.contentHash}\n\n${stringify(source.content)}`)
    }
    return [
      `你正在执行 DSH SDD 的“${definition.label}”阶段，角色侧重：${definition.role}。`,
      `项目仓库：${snapshot.workspace.path}`,
      `本次固定绑定交付件：${target.key}，路径 ${target.relativeDirectory}/${target.entry}。`,
      `阶段目标：${runtime.objective}`,
      workItem === undefined ? '' : `系统设计确认的仓库范围：${(workItem.repositoryScope ?? []).join('、') || '未配置'}\n规格设计确认的开发目标：${(workItem.developmentTargets ?? []).join('、') || '未配置'}\nOpenSpec：${workItem.openSpec?.enabled === true ? `${workItem.openSpec.repositoryId}:${workItem.openSpec.path}` : '未启用'}`,
      `完成清单：\n${runtime.completionChecklist.map((item, index) => `${index + 1}. ${item}`).join('\n')}`,
      target.template === undefined ? '' : `本交付件固定模板快照：${target.relativeDirectory}/${target.template.snapshotPath}\n模板版本：${target.template.version}\n模板哈希：${target.template.contentHash}`,
      '先检查输入完整性，再与用户讨论。每轮形成的确定结论必须同步写入绑定交付件；不得创建或切换到另一个交付件。',
      ...inputs,
    ].filter(Boolean).join('\n\n')
  }

  private async bindSession(
    workspaceId: string, runUid: string | undefined, stage: StageId, artifactUid: string, sessionId: string,
    artifactUids: string[], sourceUids: string[],
  ): Promise<{ prompt: string; run: StageRun }> {
    const snapshot = await this.requireSnapshot(workspaceId)
    const artifact = this.requireArtifact(snapshot, artifactUid)
    const prompt = await this.context(workspaceId, stage, artifactUid, artifactUids, sourceUids)
    if (runUid === undefined && snapshot.runs.some(item => item.artifactUid === artifactUid && item.status !== 'completed')) {
      throw new Error('artifact already has an active stage run; resume that run instead')
    }
    const existing = runUid === undefined ? undefined : snapshot.runs.find(item => item.uid === runUid)
    if (runUid !== undefined && existing === undefined) throw new Error(`stage run not found: ${runUid}`)
    if (existing !== undefined && existing.artifactUid !== artifactUid) throw new Error('stage run is bound to another artifact')
    if (existing?.status === 'completed') throw new Error('completed stage run cannot be resumed')
    const now = new Date().toISOString()
    const run: StageRun = existing === undefined ? {
      schema: 'dsh-sdd/run@1', uid: randomUUID(), stage, artifactUid, sessionId, status: 'active',
      startedAt: now, updatedAt: now, inputArtifactUids: [...artifactUids], sourceUids: [...sourceUids],
    } : { ...existing, sessionId, status: 'active', updatedAt: now, inputArtifactUids: [...artifactUids], sourceUids: [...sourceUids] }
    if (this.sessionController === undefined) throw new Error('stage session runtime is unavailable')
    this.bindRuntime(sessionId, stage, snapshot.workspace.path, snapshot.project, artifact, snapshot.developmentWorkspaces.find(item => item.artifactUid === artifactUid), snapshot.workItems.find(item => item.uid === artifact.workItemUid))
    await this.writeRun(snapshot.workspace.path, run)
    await appendEvent(snapshot.workspace.path, existing === undefined ? 'run.started' : 'run.resumed', artifact.key, stage, { runUid: run.uid, sessionId })
    return { prompt, run }
  }

  private async syncRun(workspaceId: string, runUid: string): Promise<void> {
    const snapshot = await this.requireSnapshot(workspaceId)
    const run = snapshot.runs.find(item => item.uid === runUid)
    if (run === undefined) throw new Error(`stage run not found: ${runUid}`)
    if (run.status === 'completed') return
    const artifact = this.requireArtifact(snapshot, run.artifactUid)
    const now = new Date().toISOString()
    const report = snapshot.quality[artifact.uid]
    await this.writeRun(snapshot.workspace.path, { ...run, status: report?.ready ? 'ready-for-review' : 'active', updatedAt: now, lastSyncedAt: now })
    await appendEvent(snapshot.workspace.path, 'run.synced', artifact.key, artifact.stage, { runUid, qualityScore: report?.score ?? 0 })
  }

  private async completeRun(workspaceId: string, runUid: string): Promise<void> {
    const snapshot = await this.requireSnapshot(workspaceId)
    const run = snapshot.runs.find(item => item.uid === runUid)
    if (run === undefined) throw new Error(`stage run not found: ${runUid}`)
    const artifact = this.requireArtifact(snapshot, run.artifactUid)
    if (artifact.status !== 'accepted') throw new Error('stage run can complete only after its artifact is accepted')
    await this.writeRun(snapshot.workspace.path, { ...run, status: 'completed', updatedAt: new Date().toISOString() })
    if (run.sessionId !== undefined) this.sessionController?.unbind(run.sessionId)
    await appendEvent(snapshot.workspace.path, 'run.completed', artifact.key, artifact.stage, { runUid })
  }

  private async listRuns(workspacePath: string): Promise<StageRun[]> {
    const root = join(workspacePath, '.sdd', 'runs')
    if (!(await exists(root))) return []
    const runs: StageRun[] = []
    for (const file of (await readdir(root)).filter(name => name.endsWith('.yaml')).sort()) {
      try { runs.push(parse(await readFile(join(root, file), 'utf8')) as StageRun) }
      catch { /* Invalid runs stay out of execution; the artifact quality view remains available. */ }
    }
    return runs.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  }

  private async writeRun(workspacePath: string, run: StageRun): Promise<void> {
    await mkdir(join(workspacePath, '.sdd', 'runs'), { recursive: true })
    await writeFile(join(workspacePath, '.sdd', 'runs', `${run.uid}.yaml`), stringify(run), 'utf8')
  }

  private bindRuntime(
    sessionId: string, stage: StageId, workspacePath: string, project: ProjectConfig,
    artifact: ArtifactSummary, development: DevelopmentWorkspace | undefined, workItem?: WorkItem,
  ): void {
    let boundTemplate = artifactTemplate(artifact.stage)
    if (artifact.template !== undefined) {
      const templatePath = resolve(workspacePath, artifact.relativeDirectory, artifact.template.snapshotPath)
      const artifactRoot = resolve(workspacePath, artifact.relativeDirectory)
      if (contained(artifactRoot, templatePath)) {
        try { boundTemplate = readFileSync(templatePath, 'utf8') } catch { /* legacy or damaged snapshots fall back to the built-in template */ }
      }
    }
    this.sessionController?.bind({
      sessionId, stage, projectPath: workspacePath,
      artifactDirectory: resolve(workspacePath, artifact.relativeDirectory),
      developmentDirectories: development?.repositories.map(item => item.path) ?? [],
      artifactTemplate: boundTemplate,
      systemPrompt: [
        `绑定项目：${project.project.key} · ${project.project.name}`,
        `绑定交付件：${artifact.key} (${artifact.uid})`,
        `交付件入口：${resolve(workspacePath, artifact.relativeDirectory, artifact.entry)}`,
        workItem === undefined ? '' : `仓库范围：${(workItem.repositoryScope ?? []).join('、') || '未配置'}\n开发目标：${(workItem.developmentTargets ?? []).join('、') || '未配置'}\nOpenSpec：${workItem.openSpec?.enabled === true ? `${workItem.openSpec.repositoryId}:${workItem.openSpec.path}` : '未启用'}`,
        development === undefined ? '' : `隔离代码目录：\n${development.repositories.map(item => `- ${item.id}: ${item.path}`).join('\n')}`,
      ].filter(Boolean).join('\n'),
    })
  }

  private async requireSnapshot(workspaceId: string): Promise<ProjectSnapshot & { project: ProjectConfig }> {
    const snapshot = await this.snapshot(workspaceId)
    if (!snapshot.initialized || snapshot.project === undefined) throw new Error('SDD project is not initialized')
    return snapshot as ProjectSnapshot & { project: ProjectConfig }
  }

  private requireArtifact(snapshot: ProjectSnapshot, uid: string): ArtifactSummary {
    const artifact = snapshot.artifacts.find(item => item.uid === uid)
    if (artifact === undefined) throw new Error(`artifact not found: ${uid}`)
    return artifact
  }

  private emptyDashboard(): DashboardSnapshot {
    return { overallCompletion: 0, stages: STAGES.map(stage => ({ stage: stage.id, status: 'not-started', completion: 0, drafts: 0, accepted: 0, failedChecks: 0 })), requirements: { total: 0, traced: 0, completed: 0 }, defects: { total: 0, open: 0, resolved: 0 }, artifacts: { total: 0, drafts: 0, accepted: 0 }, development: { workspaces: 0, changedFiles: 0, passingTests: 0, failingTests: 0, commits: 0 }, workload: [], traceability: 100, blockers: [], recentEvents: [] }
  }

  private dashboard(
    artifacts: ArtifactSummary[], sources: SourceSummary[], workItems: WorkItem[], quality: Record<string, QualityReport>,
    workspaces: DevelopmentWorkspace[], recentEvents: SddEvent[],
  ): DashboardSnapshot {
    const stages = STAGES.map(definition => {
      const items = artifacts.filter(item => item.stage === definition.id)
      const accepted = items.filter(item => item.status === 'accepted').length
      const drafts = items.filter(item => item.status === 'draft' || item.status === 'in-review').length
      const reports = items.map(item => quality[item.uid]).filter(item => item !== undefined)
      const failedChecks = reports.reduce((sum, report) => sum + report.checks.filter(item => item.status === 'failed').length, 0)
      const completion = accepted > 0 ? 100 : Math.min(90, Math.max(0, ...reports.map(report => report.score), 0))
      const status = accepted > 0 ? 'completed' as const : items.length === 0 ? 'not-started' as const
        : reports.some(report => report.ready) ? 'ready-for-review' as const : failedChecks > 0 ? 'blocked' as const : 'in-progress' as const
      return { stage: definition.id, status, completion, drafts, accepted, failedChecks }
    })
    const currentSourceUids = new Set(workItems.map(item => item.sourceUid).filter((uid): uid is string => uid !== undefined))
    const currentSources = workItems.length === 0 ? sources : sources.filter(item => currentSourceUids.has(item.uid))
    const requirements = currentSources.filter(item => item.kind === 'requirement')
    const defects = currentSources.filter(item => item.kind === 'defect')
    const tracedSources = new Set(artifacts.flatMap(item => item.derivedFrom.map(reference => reference.uid)))
    const tests = workspaces.flatMap(item => item.repositories.map(repository => repository.lastTest)).filter(item => item !== undefined)
    const blockers = [
      ...workItems.filter(item => item.change !== undefined).map(item => `${item.key}：${item.status === 'removed-pending' ? '外部需求已移除，等待确认' : `需求已变更，需重审 ${item.change!.reviewRequiredStages.map(stage => stageDefinition(stage).label).join('、')}`}`),
      ...workItems.filter(item => artifacts.some(artifact => artifact.workItemUid === item.uid && artifact.stage === 'architecture') && (item.repositoryScope ?? []).length === 0).map(item => `${item.key}：系统设计尚未确认代码仓库范围`),
      ...workItems.filter(item => artifacts.some(artifact => artifact.workItemUid === item.uid && (artifact.stage === 'specification' || artifact.stage === 'development')) && (item.developmentTargets ?? []).length === 0).map(item => `${item.key}：规格设计尚未确认开发目标仓库`),
      ...Object.values(quality).flatMap(report => report.checks.filter(item => item.status === 'failed').map(item => `${stageDefinition(report.stage).label}：${item.label}`)),
    ].slice(0, 12)
    const resolvedStatuses = new Set(['resolved', 'done', 'cancelled'])
    const workload = new Map<string, { total: number; completed: number }>()
    for (const source of currentSources) {
      const estimate = source.tracking?.estimate
      if (estimate === undefined) continue
      const current = workload.get(estimate.unit) ?? { total: 0, completed: 0 }
      current.total += estimate.value
      if (resolvedStatuses.has(source.tracking?.normalizedStatus ?? '')) current.completed += estimate.value
      workload.set(estimate.unit, current)
    }
    return {
      overallCompletion: Math.round(stages.reduce((sum, stage) => sum + stage.completion, 0) / stages.length), stages,
      requirements: { total: requirements.length, traced: requirements.filter(item => tracedSources.has(item.uid)).length, completed: requirements.filter(item => item.tracking?.normalizedStatus === 'done').length },
      defects: { total: defects.length, open: defects.filter(item => !resolvedStatuses.has(item.tracking?.normalizedStatus ?? '')).length, resolved: defects.filter(item => resolvedStatuses.has(item.tracking?.normalizedStatus ?? '')).length },
      artifacts: { total: artifacts.length, drafts: artifacts.filter(item => item.status === 'draft' || item.status === 'in-review').length, accepted: artifacts.filter(item => item.status === 'accepted').length },
      development: { workspaces: workspaces.length, changedFiles: workspaces.flatMap(item => item.repositories).reduce((sum, item) => sum + item.changedFiles, 0), passingTests: tests.filter(item => item.passed).length, failingTests: tests.filter(item => !item.passed).length, commits: workspaces.flatMap(item => item.repositories).filter(item => item.headCommit !== item.baseCommit).length },
      workload: [...workload.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([unit, value]) => ({ unit, ...value })),
      traceability: currentSources.length === 0 ? 100 : Math.round(currentSources.filter(item => tracedSources.has(item.uid)).length / currentSources.length * 100), blockers, recentEvents,
    }
  }
}
