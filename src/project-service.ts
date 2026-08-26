import { createHash, randomUUID } from 'node:crypto'
import { access, mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import type { ApiProxy, RpcId } from '@deepseek-ai/dsh-host-apiproxy'
import { parse, stringify } from 'yaml'
import {
  STAGES,
  type ArtifactManifest,
  type ArtifactSummary,
  type DashboardSnapshot,
  type DevelopmentWorkspace,
  type ProjectConfig,
  type ProjectSnapshot,
  type QualityReport,
  type SddAction,
  type SddEvent,
  type SourceEnvelope,
  type SourceSummary,
  type StageRun,
  type StageId,
  stageDefinition,
} from './protocol.ts'
import { type SddIdentifierRegistry, type SddSourceRegistry, validateSourceEnvelope } from './extensions.ts'
import { appendEvent, readRecentEvents } from './event-log.ts'
import { GitDevelopmentService, listDevelopmentWorkspaces } from './git-service.ts'
import { evaluateQuality } from './quality.ts'
import { runtimeDefinition } from './stage-definitions.ts'
import type { StageSessionController } from './session-controller.ts'

const PROJECT_FILE = '.sdd/project.yaml'

function request<T>(payload: T) {
  return { rpcId: `sdd-${randomUUID()}` as RpcId, payload }
}

function slug(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '')
  return normalized.slice(0, 48) || 'artifact'
}

async function exists(path: string): Promise<boolean> {
  try { await access(path); return true } catch { return false }
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

function defaultProject(path: string): ProjectConfig {
  return {
    schema: 'dsh-sdd/project@1',
    project: { key: slug(basename(path)), name: basename(path) },
    identifiers: {
      internal: { strategy: 'uuid' },
      namespaces: Object.fromEntries(STAGES.map(stage => [stage.id, {
        strategy: 'template', template: `${stage.prefix}-{sequence:04}`, sequenceScope: 'project',
      }])),
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
  if (typeof manifest.entry === 'string' && !entryExists) errors.push(`entry does not exist: ${manifest.entry}`)
  return errors
}

export class SddProjectService {
  constructor(
    private readonly api: ApiProxy,
    private readonly sourceRegistry?: SddSourceRegistry,
    private readonly identifierRegistry?: SddIdentifierRegistry,
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

  async execute(action: SddAction): Promise<ProjectSnapshot | { prompt: string; run?: StageRun }> {
    if (action.kind === 'snapshot') return this.snapshot(action.workspaceId)
    if (action.kind === 'initialize') { await this.initialize(action.workspaceId); return this.snapshot(action.workspaceId) }
    if (action.kind === 'create-draft') {
      await this.createDraft(action.workspaceId, action.stage, action.title, action.key, action.basedOn, action.sourceUids ?? [])
      return this.snapshot(action.workspaceId)
    }
    if (action.kind === 'accept') { await this.accept(action.workspaceId, action.artifactUid, action.checklist); return this.snapshot(action.workspaceId) }
    if (action.kind === 'quality') return this.snapshot(action.workspaceId)
    if (action.kind === 'import-source') {
      await this.importSource(action.workspaceId, action.provider, action.sourceKind, action.key, action.connector)
      return this.snapshot(action.workspaceId)
    }
    if (action.kind === 'context') return { prompt: await this.context(action.workspaceId, action.stage, action.artifactUid, action.artifactUids, action.sourceUids ?? []) }
    if (action.kind === 'bind-session') return this.bindSession(action.workspaceId, action.runUid, action.stage, action.artifactUid, action.sessionId, action.artifactUids, action.sourceUids ?? [])
    if (action.kind === 'sync-run') { await this.syncRun(action.workspaceId, action.runUid); return this.snapshot(action.workspaceId) }
    if (action.kind === 'complete-run') { await this.completeRun(action.workspaceId, action.runUid); return this.snapshot(action.workspaceId) }
    if (action.kind === 'development-create') {
      const snapshot = await this.requireSnapshot(action.workspaceId)
      const artifact = this.requireArtifact(snapshot, action.artifactUid)
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
    await mkdir(join(sddRoot, 'connectors'), { recursive: true })
    await mkdir(join(sddRoot, 'runs'), { recursive: true })
    await mkdir(join(sddRoot, 'events'), { recursive: true })
    await mkdir(join(sddRoot, 'development'), { recursive: true })
    for (const stage of STAGES) await mkdir(join(sddRoot, 'artifacts', stage.id), { recursive: true })
    const projectPath = join(workspace.path, PROJECT_FILE)
    if (!(await exists(projectPath))) await writeFile(projectPath, stringify(defaultProject(workspace.path)), 'utf8')
    const gitignorePath = join(workspace.path, '.gitignore')
    const gitignore = (await exists(gitignorePath)) ? await readFile(gitignorePath, 'utf8') : ''
    if (!gitignore.split(/\r?\n/).includes('.sdd-workspaces/')) {
      const prefix = gitignore === '' || gitignore.endsWith('\n') ? gitignore : `${gitignore}\n`
      await writeFile(gitignorePath, `${prefix}\n# DSH SDD per-requirement isolated checkouts\n.sdd-workspaces/\n`, 'utf8')
    }
  }

  async snapshot(workspaceId: string): Promise<ProjectSnapshot> {
    const workspace = await this.workspace(workspaceId)
    const projectPath = join(workspace.path, PROJECT_FILE)
    if (!(await exists(projectPath))) return {
      workspace, initialized: false, artifacts: [], sources: [], sourceProviders: this.sourceRegistry?.names() ?? [],
      runs: [], quality: {}, developmentWorkspaces: [], dashboard: this.emptyDashboard(),
    }
    const parsedProject = parse(await readFile(projectPath, 'utf8')) as ProjectConfig
    const project: ProjectConfig = {
      ...parsedProject,
      sources: parsedProject.sources ?? {},
      development: { ...parsedProject.development, repositories: parsedProject.development?.repositories ?? [] },
    }
    const artifacts: ArtifactSummary[] = []
    for (const manifestPath of await walkForManifest(join(workspace.path, '.sdd', 'artifacts'))) {
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
        if (entryExists && manifest.status === 'accepted') {
          const actualHash = `sha256:${createHash('sha256').update(await readFile(entryPath)).digest('hex')}`
          if (manifest.contentHash === undefined) validationErrors.push('accepted artifact is missing contentHash')
          else if (manifest.contentHash !== actualHash) validationErrors.push('accepted artifact content differs from its frozen hash')
        }
        artifacts.push({ ...manifest, relativeDirectory: relative(workspace.path, dirname(manifestPath)), validationErrors })
      } catch (error) {
        artifacts.push({
          schema: 'dsh-sdd/artifact@1', uid: manifestPath, key: 'INVALID', title: basename(dirname(manifestPath)),
          stage: 'requirements', type: 'invalid', version: '0.0.0', status: 'draft', entry: '', createdAt: '', updatedAt: '',
          basedOn: [], derivedFrom: [], externalRefs: [], relativeDirectory: relative(workspace.path, dirname(manifestPath)),
          validationErrors: [error instanceof Error ? error.message : String(error)],
        })
      }
    }
    const sources = await this.listSources(workspace.path)
    const runs = await this.listRuns(workspace.path)
    const developmentWorkspaces = await listDevelopmentWorkspaces(workspace.path, artifacts)
    for (const run of runs) {
      if (run.status === 'completed' || run.sessionId === undefined) continue
      const artifact = artifacts.find(item => item.uid === run.artifactUid)
      if (artifact !== undefined) this.bindRuntime(run.sessionId, run.stage, workspace.path, project, artifact, developmentWorkspaces.find(item => item.artifactUid === artifact.uid))
    }
    const quality: Record<string, QualityReport> = {}
    const partial = { artifacts, developmentWorkspaces }
    for (const artifact of artifacts) {
      if (artifact.entry === '' || !(await exists(join(workspace.path, artifact.relativeDirectory, artifact.entry)))) continue
      quality[artifact.uid] = evaluateQuality(artifact, await readFile(join(workspace.path, artifact.relativeDirectory, artifact.entry), 'utf8'), project, partial)
    }
    const recentEvents = await readRecentEvents(workspace.path)
    const dashboard = this.dashboard(artifacts, sources, quality, developmentWorkspaces, recentEvents)
    return { workspace, initialized: true, project, artifacts, sources, sourceProviders: this.sourceRegistry?.names() ?? [], runs, quality, developmentWorkspaces, dashboard }
  }

  private async createDraft(
    workspaceId: string,
    stage: StageId,
    title: string,
    requestedKey: string | undefined,
    basedOn: string[],
    sourceUids: string[],
  ): Promise<void> {
    if (title.trim() === '') throw new Error('title must not be empty')
    await this.initialize(workspaceId)
    const snapshot = await this.snapshot(workspaceId)
    const definition = stageDefinition(stage)
    const key = requestedKey?.trim() || await this.allocateKey(snapshot, stage, definition.prefix)
    if (snapshot.artifacts.some(item => item.key === key)) throw new Error(`artifact key already exists: ${key}`)
    const uid = randomUUID()
    const directory = join(snapshot.workspace.path, '.sdd', 'artifacts', stage, `${slug(key)}-${uid.slice(0, 8)}`)
    await mkdir(directory, { recursive: true })
    const now = new Date().toISOString()
    const refs = basedOn.map(inputUid => {
      const input = snapshot.artifacts.find(item => item.uid === inputUid)
      if (input === undefined) throw new Error(`input artifact not found: ${inputUid}`)
      if (input.status !== 'accepted') throw new Error(`input artifact is not accepted: ${input.key}`)
      if (input.validationErrors.length > 0) throw new Error(`input artifact is invalid: ${input.key}: ${input.validationErrors.join('; ')}`)
      return { uid: input.uid, version: input.version, contentHash: input.contentHash }
    })
    const sourceRefs = sourceUids.map(sourceUid => {
      const source = snapshot.sources.find(item => item.uid === sourceUid)
      if (source === undefined) throw new Error(`source not found: ${sourceUid}`)
      if (source.validationErrors.length > 0) throw new Error(`source is invalid: ${source.title}: ${source.validationErrors.join('; ')}`)
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
    }
    await writeFile(join(directory, 'manifest.yaml'), stringify(manifest), 'utf8')
    await writeFile(join(directory, 'deliverable.md'), this.template(stage, key, title.trim()), 'utf8')
    await appendEvent(snapshot.workspace.path, 'artifact.created', key, stage, { artifactUid: uid })
  }

  private nextKey(artifacts: ArtifactSummary[], prefix: string): string {
    const expression = new RegExp(`^${prefix}-(\\d+)$`)
    const largest = artifacts.reduce((value, item) => {
      const match = expression.exec(item.key)
      return match === null ? value : Math.max(value, Number(match[1]))
    }, 0)
    return `${prefix}-${String(largest + 1).padStart(4, '0')}`
  }

  private async allocateKey(snapshot: ProjectSnapshot, stage: StageId, prefix: string): Promise<string> {
    const policy = snapshot.project?.identifiers.namespaces[stage]
    if (policy?.strategy === 'manual' || policy?.strategy === 'external') {
      throw new Error(`identifier for ${stage} must be supplied manually`)
    }
    if (policy?.strategy === 'provider' || policy?.strategy === 'script') {
      const providerName = policy.provider
      if (providerName === undefined) throw new Error(`identifier provider is not configured for ${stage}`)
      const provider = this.identifierRegistry?.get(providerName)
      if (provider === undefined) throw new Error(`identifier provider not found: ${providerName}`)
      const key = (await provider.allocate({
        namespace: stage,
        project: snapshot.project!,
        workspacePath: snapshot.workspace.path,
        signal: AbortSignal.timeout(30_000),
      })).trim()
      if (key === '') throw new Error(`identifier provider "${providerName}" returned an empty key`)
      return key
    }
    return this.nextKey(snapshot.artifacts, prefix)
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

  private async importSource(
    workspaceId: string,
    providerName: string,
    kind: string,
    key: string,
    connector: string | undefined,
  ): Promise<void> {
    if (kind.trim() === '' || key.trim() === '') throw new Error('source kind and key are required')
    await this.initialize(workspaceId)
    const snapshot = await this.snapshot(workspaceId)
    if (snapshot.project === undefined) throw new Error('SDD project is not initialized')
    if (this.sourceRegistry === undefined) throw new Error('source registry is unavailable')
    const source = await this.sourceRegistry.fetch(providerName, {
      kind: kind.trim(), key: key.trim(),
      workspace: { workspaceId, path: snapshot.workspace.path, project: snapshot.project },
      ...(connector === undefined ? {} : { connector }),
      signal: AbortSignal.timeout(60_000),
    })
    const normalized: SourceEnvelope = {
      ...source,
      contentHash: `sha256:${createHash('sha256').update(JSON.stringify(source.content)).digest('hex')}`,
    }
    const filename = `${slug(normalized.provider)}-${slug(normalized.externalKey ?? key)}-${normalized.uid.slice(0, 8)}.yaml`
    await writeFile(join(snapshot.workspace.path, '.sdd', 'sources', filename), stringify(normalized), 'utf8')
    await appendEvent(snapshot.workspace.path, 'source.imported', normalized.externalKey ?? normalized.uid, undefined, { provider: normalized.provider, kind: normalized.kind })
  }

  private template(stage: StageId, key: string, title: string): string {
    const sections: Record<StageId, string[]> = {
      requirements: ['背景与目标', '范围', '用户与场景', '功能需求', '非功能需求', '验收条件', '待决问题'],
      prototype: ['设计目标', '用户流程', '页面清单', '交互规则', '状态与异常', '原型资源', '待决问题'],
      architecture: ['设计目标', '上下文与约束', '总体架构', '模块职责', '数据设计', '接口与集成', '部署与安全', '架构决策'],
      specification: ['实现目标', '输入依据', '功能规格', '接口契约', '状态与数据规则', '异常处理', '验收测试规格', '追踪关系'],
      development: ['实现范围', '代码仓库与分支', '变更摘要', '测试计划', '测试结果', '提交与合并记录', '遗留问题'],
    }
    return `# ${key} ${title}\n\n${sections[stage].map(section => `## ${section}\n\n待补充。`).join('\n\n')}\n`
  }

  private async accept(workspaceId: string, artifactUid: string, checklist?: Record<string, boolean>): Promise<void> {
    let snapshot = await this.snapshot(workspaceId)
    let artifact = snapshot.artifacts.find(item => item.uid === artifactUid)
    if (artifact === undefined) throw new Error(`artifact not found: ${artifactUid}`)
    if (artifact.status !== 'draft' && artifact.status !== 'in-review') throw new Error(`artifact cannot be accepted from ${artifact.status}`)
    if (artifact.validationErrors.length > 0) throw new Error(`artifact validation failed: ${artifact.validationErrors.join('; ')}`)
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
    manifest.contentHash = `sha256:${createHash('sha256').update(content).digest('hex')}`
    await writeFile(manifestPath, stringify(manifest), 'utf8')
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
    const definition = stageDefinition(stage)
    const runtime = runtimeDefinition(stage)
    const required = Object.entries(snapshot.project.dependencies[stage] ?? {}).filter(([, mode]) => mode === 'required').map(([id]) => id)
    for (const requiredStage of required) {
      if (!selected.some(item => item.stage === requiredStage)) throw new Error(`conversation input is missing required ${requiredStage} artifact`)
    }
    const inputs: string[] = []
    for (const artifact of selected) {
      const path = join(snapshot.workspace.path, artifact.relativeDirectory, artifact.entry)
      inputs.push(`\n## 输入 ${artifact.key} v${artifact.version}\n来源：${artifact.relativeDirectory}/${artifact.entry}\n内容哈希：${artifact.contentHash ?? '未记录'}\n\n${await readFile(path, 'utf8')}`)
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
      `完成清单：\n${runtime.completionChecklist.map((item, index) => `${index + 1}. ${item}`).join('\n')}`,
      '先检查输入完整性，再与用户讨论。每轮形成的确定结论必须同步写入绑定交付件；不得创建或切换到另一个交付件。',
      ...inputs,
    ].join('\n\n')
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
    this.bindRuntime(sessionId, stage, snapshot.workspace.path, snapshot.project, artifact, snapshot.developmentWorkspaces.find(item => item.artifactUid === artifactUid))
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
    artifact: ArtifactSummary, development: DevelopmentWorkspace | undefined,
  ): void {
    this.sessionController?.bind({
      sessionId, stage, projectPath: workspacePath,
      artifactDirectory: resolve(workspacePath, artifact.relativeDirectory),
      developmentDirectories: development?.repositories.map(item => item.path) ?? [],
      systemPrompt: [
        `绑定项目：${project.project.key} · ${project.project.name}`,
        `绑定交付件：${artifact.key} (${artifact.uid})`,
        `交付件入口：${resolve(workspacePath, artifact.relativeDirectory, artifact.entry)}`,
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
    artifacts: ArtifactSummary[], sources: SourceSummary[], quality: Record<string, QualityReport>,
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
    const requirements = sources.filter(item => item.kind === 'requirement')
    const defects = sources.filter(item => item.kind === 'defect')
    const tracedSources = new Set(artifacts.flatMap(item => item.derivedFrom.map(reference => reference.uid)))
    const tests = workspaces.flatMap(item => item.repositories.map(repository => repository.lastTest)).filter(item => item !== undefined)
    const blockers = Object.values(quality).flatMap(report => report.checks.filter(item => item.status === 'failed').map(item => `${stageDefinition(report.stage).label}：${item.label}`)).slice(0, 12)
    const resolvedStatuses = new Set(['resolved', 'done', 'cancelled'])
    const workload = new Map<string, { total: number; completed: number }>()
    for (const source of sources) {
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
      traceability: sources.length === 0 ? 100 : Math.round(tracedSources.size / sources.length * 100), blockers, recentEvents,
    }
  }
}
