/** Shared, browser-safe protocol and domain definitions. */

export const STAGES = [
  { id: 'requirements', label: '需求讨论', role: '产品与业务分析', outputType: 'requirement-spec', prefix: 'REQ' },
  { id: 'prototype', label: '原型输出', role: '产品设计与 UX', outputType: 'prototype-spec', prefix: 'UX' },
  { id: 'architecture', label: '系统设计', role: '架构师与技术负责人', outputType: 'architecture-spec', prefix: 'ARCH' },
  { id: 'specification', label: '规格设计', role: '技术负责人、开发与测试', outputType: 'implementation-spec', prefix: 'SPEC' },
  { id: 'development', label: '开发测试', role: '开发、测试与 Reviewer', outputType: 'development-delivery', prefix: 'DEV' },
] as const

export type StageId = typeof STAGES[number]['id']
export type ArtifactStatus = 'draft' | 'in-review' | 'accepted' | 'superseded'
export type DependencyMode = 'required' | 'optional' | 'manual'
export type CheckStatus = 'passed' | 'failed' | 'warning'
export type StageRunStatus = 'active' | 'syncing' | 'ready-for-review' | 'completed'

export interface ExternalReference {
  system: string
  kind: string
  key: string
  relation: string
  url?: string
}

export interface ArtifactReference {
  uid: string
  version: string
  contentHash?: string
}

export interface SourceEnvelope {
  schema: 'dsh-sdd/source@1'
  uid: string
  provider: string
  kind: string
  title: string
  fetchedAt: string
  content: unknown
  externalKey?: string
  status?: string
  revision?: string
  contentHash?: string
  links?: Array<Record<string, unknown>>
  tracking?: {
    status?: string
    normalizedStatus?: 'todo' | 'in-progress' | 'resolved' | 'done' | 'cancelled' | 'blocked'
    priority?: string
    severity?: string
    assignees?: string[]
    estimate?: { value: number; unit: string }
    createdAt?: string
    updatedAt?: string
    resolvedAt?: string
  }
}

export interface SourceReference {
  uid: string
  provider: string
  kind: string
  externalKey?: string
  contentHash?: string
}

export interface ArtifactManifest {
  schema: 'dsh-sdd/artifact@1'
  uid: string
  key: string
  title: string
  stage: StageId
  type: string
  version: string
  status: ArtifactStatus
  entry: string
  createdAt: string
  updatedAt: string
  contentHash?: string
  basedOn: ArtifactReference[]
  derivedFrom: SourceReference[]
  externalRefs: ExternalReference[]
  checklist?: Record<string, boolean>
}

export interface QualityCheck {
  code: string
  label: string
  status: CheckStatus
  message: string
}

export interface QualityReport {
  artifactUid: string
  stage: StageId
  checkedAt: string
  ready: boolean
  score: number
  checks: QualityCheck[]
}

export interface StageRun {
  schema: 'dsh-sdd/run@1'
  uid: string
  stage: StageId
  artifactUid: string
  sessionId?: string
  status: StageRunStatus
  startedAt: string
  updatedAt: string
  lastSyncedAt?: string
  inputArtifactUids: string[]
  sourceUids: string[]
}

export interface DevelopmentRepositoryConfig {
  id: string
  source: string
  baseBranch: string
  testCommands: Array<{ id: string; label: string; argv: string[] }>
}

export interface DevelopmentRepositoryState {
  id: string
  source: string
  baseBranch: string
  baseCommit: string
  workingBranch: string
  path: string
  headCommit: string
  changedFiles: number
  ahead: number
  behind: number
  lastTest?: { id: string; passed: boolean; exitCode: number; ranAt: string; output: string }
}

export interface DevelopmentWorkspace {
  schema: 'dsh-sdd/development-workspace@1'
  uid: string
  key: string
  artifactUid: string
  inputs: Array<{ artifactUid: string; version: string }>
  repositories: DevelopmentRepositoryState[]
  createdAt: string
  updatedAt: string
}

export interface IdentifierPolicy {
  strategy: 'template' | 'manual' | 'external' | 'script' | 'provider'
  template?: string
  sequenceScope?: string
  provider?: string
  command?: string[]
}

export interface ProjectConfig {
  schema: 'dsh-sdd/project@1'
  project: { key: string; name: string }
  identifiers: {
    internal: { strategy: 'uuid' }
    namespaces: Record<string, IdentifierPolicy>
  }
  sources: Record<string, { provider: string; connector?: string }>
  dependencies: Record<StageId, Partial<Record<StageId, DependencyMode>>>
  development: {
    workspaceRoot: string
    branchPattern: string
    mergeStrategy: 'pull-request' | 'local-merge' | 'manual'
    repositories: DevelopmentRepositoryConfig[]
  }
}

export interface ArtifactSummary extends ArtifactManifest {
  relativeDirectory: string
  validationErrors: string[]
}

export interface SourceSummary extends SourceEnvelope {
  relativePath: string
  validationErrors: string[]
}

export interface WorkspaceSummary {
  workspaceId: string
  title: string
  path: string
}

export interface ProjectSnapshot {
  workspace: WorkspaceSummary
  initialized: boolean
  configuration: {
    status: 'missing' | 'valid' | 'invalid'
    path: string
    errors: string[]
  }
  project?: ProjectConfig
  artifacts: ArtifactSummary[]
  sources: SourceSummary[]
  sourceProviders: string[]
  runs: StageRun[]
  quality: Record<string, QualityReport>
  developmentWorkspaces: DevelopmentWorkspace[]
  dashboard: DashboardSnapshot
}

export interface StageProgress {
  stage: StageId
  status: 'not-started' | 'in-progress' | 'ready-for-review' | 'completed' | 'blocked'
  completion: number
  drafts: number
  accepted: number
  failedChecks: number
}

export interface DashboardSnapshot {
  overallCompletion: number
  stages: StageProgress[]
  requirements: { total: number; traced: number; completed: number }
  defects: { total: number; open: number; resolved: number }
  artifacts: { total: number; drafts: number; accepted: number }
  development: { workspaces: number; changedFiles: number; passingTests: number; failingTests: number; commits: number }
  workload: Array<{ unit: string; total: number; completed: number }>
  traceability: number
  blockers: string[]
  recentEvents: SddEvent[]
}

export interface SddEvent {
  schema: 'dsh-sdd/event@1'
  id: string
  time: string
  type: string
  subject: string
  stage?: StageId
  detail?: Record<string, unknown>
}

export type SddAction =
  | { kind: 'snapshot'; workspaceId: string }
  | { kind: 'initialize'; workspaceId: string }
  | { kind: 'reinitialize'; workspaceId: string }
  | { kind: 'create-draft'; workspaceId: string; stage: StageId; title: string; key?: string; basedOn: string[]; sourceUids?: string[] }
  | { kind: 'accept'; workspaceId: string; artifactUid: string; checklist?: Record<string, boolean> }
  | { kind: 'quality'; workspaceId: string; artifactUid: string }
  | { kind: 'context'; workspaceId: string; stage: StageId; artifactUid: string; artifactUids: string[]; sourceUids?: string[] }
  | { kind: 'bind-session'; workspaceId: string; runUid?: string; stage: StageId; artifactUid: string; sessionId: string; artifactUids: string[]; sourceUids?: string[] }
  | { kind: 'sync-run'; workspaceId: string; runUid: string }
  | { kind: 'complete-run'; workspaceId: string; runUid: string }
  | { kind: 'development-create'; workspaceId: string; artifactUid: string; repositoryId: string }
  | { kind: 'development-status'; workspaceId: string; artifactUid: string }
  | { kind: 'development-test'; workspaceId: string; artifactUid: string; repositoryId: string; testId: string }
  | { kind: 'development-commit'; workspaceId: string; artifactUid: string; repositoryId: string; message: string }
  | { kind: 'import-source'; workspaceId: string; provider: string; sourceKind: string; key: string; connector?: string }

export type SddResponse =
  | { ok: true; snapshot: ProjectSnapshot }
  | { ok: true; prompt: string; run?: StageRun }
  | { ok: false; error: string }

export function isStageId(value: unknown): value is StageId {
  return STAGES.some(stage => stage.id === value)
}

export function stageDefinition(id: StageId): typeof STAGES[number] {
  return STAGES.find(stage => stage.id === id)!
}

export function parseAction(value: unknown): SddAction | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const action = value as Record<string, unknown>
  if (typeof action.kind !== 'string' || typeof action.workspaceId !== 'string') return undefined
  if (action.kind === 'snapshot' || action.kind === 'initialize' || action.kind === 'reinitialize') return action as unknown as SddAction
  if ((action.kind === 'accept' || action.kind === 'quality') && typeof action.artifactUid === 'string') return action as unknown as SddAction
  if (action.kind === 'context' && isStageId(action.stage) && typeof action.artifactUid === 'string' && stringArray(action.artifactUids)
    && (action.sourceUids === undefined || stringArray(action.sourceUids))) return action as unknown as SddAction
  if (action.kind === 'bind-session' && isStageId(action.stage) && typeof action.artifactUid === 'string'
    && typeof action.sessionId === 'string' && stringArray(action.artifactUids)
    && (action.runUid === undefined || typeof action.runUid === 'string')
    && (action.sourceUids === undefined || stringArray(action.sourceUids))) return action as unknown as SddAction
  if ((action.kind === 'sync-run' || action.kind === 'complete-run') && typeof action.runUid === 'string') return action as unknown as SddAction
  if ((action.kind === 'development-create' || action.kind === 'development-status') && typeof action.artifactUid === 'string'
    && (action.kind === 'development-status' || typeof action.repositoryId === 'string')) return action as unknown as SddAction
  if (action.kind === 'development-test' && typeof action.artifactUid === 'string' && typeof action.repositoryId === 'string'
    && typeof action.testId === 'string') return action as unknown as SddAction
  if (action.kind === 'development-commit' && typeof action.artifactUid === 'string' && typeof action.repositoryId === 'string'
    && typeof action.message === 'string' && action.message.trim() !== '') return action as unknown as SddAction
  if (action.kind === 'import-source' && typeof action.provider === 'string' && typeof action.sourceKind === 'string'
    && typeof action.key === 'string' && (action.connector === undefined || typeof action.connector === 'string')) {
    return action as unknown as SddAction
  }
  if (action.kind === 'create-draft' && isStageId(action.stage) && typeof action.title === 'string'
    && (action.key === undefined || typeof action.key === 'string') && stringArray(action.basedOn)
    && (action.sourceUids === undefined || stringArray(action.sourceUids))) {
    return action as unknown as SddAction
  }
  return undefined
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}
