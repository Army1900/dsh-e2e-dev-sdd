/** Shared, browser-safe protocol and domain definitions. */
export declare const STAGES: readonly [{
    readonly id: "requirements";
    readonly label: "需求讨论";
    readonly role: "产品与业务分析";
    readonly outputType: "requirement-spec";
    readonly prefix: "REQ";
}, {
    readonly id: "prototype";
    readonly label: "原型输出";
    readonly role: "产品设计与 UX";
    readonly outputType: "prototype-spec";
    readonly prefix: "UX";
}, {
    readonly id: "architecture";
    readonly label: "系统设计";
    readonly role: "架构师与技术负责人";
    readonly outputType: "architecture-spec";
    readonly prefix: "ARCH";
}, {
    readonly id: "specification";
    readonly label: "规格设计";
    readonly role: "技术负责人、开发与测试";
    readonly outputType: "implementation-spec";
    readonly prefix: "SPEC";
}, {
    readonly id: "development";
    readonly label: "开发测试";
    readonly role: "开发、测试与 Reviewer";
    readonly outputType: "development-delivery";
    readonly prefix: "DEV";
}];
export type StageId = typeof STAGES[number]['id'];
export interface ArtifactTemplateSection {
    readonly title: string;
    readonly guidance: string;
    readonly suggestedSubsections: readonly string[];
}
export interface StageArtifactTemplate {
    readonly documentName: string;
    readonly maintenanceGuide: string;
    readonly sections: readonly ArtifactTemplateSection[];
}
/** Canonical templates shared by draft creation, the browser workbench, and AI prompts. */
export declare const STAGE_ARTIFACT_TEMPLATES: Readonly<Record<StageId, StageArtifactTemplate>>;
export declare function artifactTemplate(stage: StageId, key?: string, title?: string): string;
export type ArtifactStatus = 'draft' | 'in-review' | 'accepted' | 'superseded';
export type DependencyMode = 'required' | 'optional' | 'manual';
export type CheckStatus = 'passed' | 'failed' | 'warning';
export type StageRunStatus = 'active' | 'syncing' | 'ready-for-review' | 'completed';
export interface ExternalReference {
    system: string;
    kind: string;
    key: string;
    relation: string;
    url?: string;
}
export interface ArtifactReference {
    uid: string;
    version: string;
    contentHash?: string;
}
export interface SourceEnvelope {
    schema: 'dsh-sdd/source@1';
    uid: string;
    provider: string;
    kind: string;
    title: string;
    fetchedAt: string;
    content: unknown;
    externalKey?: string;
    status?: string;
    revision?: string;
    contentHash?: string;
    links?: Array<Record<string, unknown>>;
    tracking?: {
        status?: string;
        normalizedStatus?: 'todo' | 'in-progress' | 'resolved' | 'done' | 'cancelled' | 'blocked';
        priority?: string;
        severity?: string;
        assignees?: string[];
        estimate?: {
            value: number;
            unit: string;
        };
        createdAt?: string;
        updatedAt?: string;
        resolvedAt?: string;
    };
}
export interface SourceBundleRelation {
    from: string;
    to: string;
    type: 'child-of' | 'depends-on' | 'relates-to' | string;
}
/** One business query may return a root record and many independently deliverable children. */
export interface SourceBundle {
    schema: 'dsh-sdd/source-bundle@1';
    uid: string;
    provider: string;
    kind: string;
    externalKey: string;
    title: string;
    fetchedAt: string;
    root?: SourceEnvelope;
    items: SourceEnvelope[];
    relations: SourceBundleRelation[];
}
export type ImportChangeKind = 'added' | 'modified' | 'removed' | 'unchanged';
export interface ImportPreviewItem {
    identity: string;
    externalKey: string;
    title: string;
    kind: string;
    change: ImportChangeKind;
    changedPaths: string[];
    workItemUid?: string;
}
export interface ImportPreview {
    schema: 'dsh-sdd/import-preview@1';
    uid: string;
    bundleKey: string;
    bundleTitle: string;
    provider: string;
    fetchedAt: string;
    items: ImportPreviewItem[];
}
export interface WorkItemChange {
    kind: Exclude<ImportChangeKind, 'unchanged'>;
    detectedAt: string;
    changedPaths: string[];
    previousSourceUid?: string;
    reviewRequiredStages: StageId[];
}
export interface WorkItem {
    schema: 'dsh-sdd/work-item@1';
    uid: string;
    key: string;
    title: string;
    kind: string;
    provider: string;
    bundleKey: string;
    sourceUid?: string;
    bundleSourceUid?: string;
    relations: SourceBundleRelation[];
    status: 'active' | 'change-pending' | 'removed-pending' | 'completed';
    createdAt: string;
    updatedAt: string;
    change?: WorkItemChange;
    repositoryScope?: string[];
    developmentTargets?: string[];
    openSpec?: {
        enabled: boolean;
        repositoryId?: string;
        path?: string;
    };
}
export interface SourceReference {
    uid: string;
    provider: string;
    kind: string;
    externalKey?: string;
    contentHash?: string;
}
export interface ArtifactManifest {
    schema: 'dsh-sdd/artifact@1';
    uid: string;
    key: string;
    title: string;
    stage: StageId;
    type: string;
    version: string;
    status: ArtifactStatus;
    entry: string;
    createdAt: string;
    updatedAt: string;
    contentHash?: string;
    basedOn: ArtifactReference[];
    derivedFrom: SourceReference[];
    externalRefs: ExternalReference[];
    checklist?: Record<string, boolean>;
    workItemUid?: string;
    supersedes?: ArtifactReference;
    template?: ArtifactTemplateBinding;
    files?: ArtifactFileSummary[];
}
export interface ArtifactTemplateBinding {
    stage: StageId;
    version: string;
    sourcePath: string;
    snapshotPath: string;
    configSnapshotPath: string;
    contentHash: string;
    requiredSections: string[];
}
export interface ArtifactFileSummary {
    path: string;
    size: number;
    contentHash: string;
    kind: 'markdown' | 'text' | 'image' | 'binary';
}
export interface StageTemplatePreview {
    stage: StageId;
    version: string;
    documentName: string;
    directory: string;
    configPath: string;
    contentPath: string;
    contentHash: string;
    requiredSections: string[];
    content: string;
}
export interface QualityCheck {
    code: string;
    label: string;
    status: CheckStatus;
    message: string;
}
export interface QualityReport {
    artifactUid: string;
    stage: StageId;
    checkedAt: string;
    ready: boolean;
    score: number;
    checks: QualityCheck[];
}
export interface StageRun {
    schema: 'dsh-sdd/run@1';
    uid: string;
    stage: StageId;
    artifactUid: string;
    sessionId?: string;
    status: StageRunStatus;
    startedAt: string;
    updatedAt: string;
    lastSyncedAt?: string;
    inputArtifactUids: string[];
    sourceUids: string[];
}
export interface DevelopmentRepositoryConfig {
    id: string;
    source: string;
    baseBranch: string;
    testCommands: Array<{
        id: string;
        label: string;
        argv: string[];
    }>;
}
export interface DevelopmentRepositoryState {
    id: string;
    source: string;
    baseBranch: string;
    baseCommit: string;
    workingBranch: string;
    path: string;
    headCommit: string;
    changedFiles: number;
    ahead: number;
    behind: number;
    lastTest?: {
        id: string;
        passed: boolean;
        exitCode: number;
        ranAt: string;
        output: string;
    };
}
export interface DevelopmentWorkspace {
    schema: 'dsh-sdd/development-workspace@1';
    uid: string;
    key: string;
    artifactUid: string;
    inputs: Array<{
        artifactUid: string;
        version: string;
    }>;
    repositories: DevelopmentRepositoryState[];
    createdAt: string;
    updatedAt: string;
}
export interface IdentifierPolicy {
    strategy: 'template';
    template: string;
    sequenceScope: 'project';
}
export interface ProjectConfig {
    schema: 'dsh-sdd/project@1';
    project: {
        key: string;
        name: string;
    };
    identifiers: {
        internal: {
            strategy: 'uuid';
        };
        namespaces: Record<StageId, IdentifierPolicy>;
    };
    sources: Record<string, {
        provider: string;
        connector?: string;
    }>;
    dependencies: Record<StageId, Partial<Record<StageId, DependencyMode>>>;
    development: {
        workspaceRoot: string;
        branchPattern: string;
        mergeStrategy: 'pull-request' | 'local-merge' | 'manual';
        repositories: DevelopmentRepositoryConfig[];
    };
}
export interface ArtifactSummary extends ArtifactManifest {
    relativeDirectory: string;
    validationErrors: string[];
    files: ArtifactFileSummary[];
}
export interface SourceSummary extends SourceEnvelope {
    relativePath: string;
    validationErrors: string[];
}
export interface WorkspaceSummary {
    workspaceId: string;
    title: string;
    path: string;
}
export interface ProjectSnapshot {
    workspace: WorkspaceSummary;
    initialized: boolean;
    configuration: {
        status: 'missing' | 'valid' | 'invalid';
        path: string;
        errors: string[];
    };
    project?: ProjectConfig;
    artifacts: ArtifactSummary[];
    sources: SourceSummary[];
    sourceProviders: string[];
    connectors: string[];
    workItems: WorkItem[];
    runs: StageRun[];
    quality: Record<string, QualityReport>;
    developmentWorkspaces: DevelopmentWorkspace[];
    openSpecValidation: Record<string, OpenSpecValidation>;
    dashboard: DashboardSnapshot;
}
export interface OpenSpecValidation {
    status: 'pending' | 'valid' | 'invalid';
    message: string;
}
export interface StageProgress {
    stage: StageId;
    status: 'not-started' | 'in-progress' | 'ready-for-review' | 'completed' | 'blocked';
    completion: number;
    drafts: number;
    accepted: number;
    failedChecks: number;
}
export interface DashboardSnapshot {
    overallCompletion: number;
    stages: StageProgress[];
    requirements: {
        total: number;
        traced: number;
        completed: number;
    };
    defects: {
        total: number;
        open: number;
        resolved: number;
    };
    artifacts: {
        total: number;
        drafts: number;
        accepted: number;
    };
    development: {
        workspaces: number;
        changedFiles: number;
        passingTests: number;
        failingTests: number;
        commits: number;
    };
    workload: Array<{
        unit: string;
        total: number;
        completed: number;
    }>;
    traceability: number;
    blockers: string[];
    recentEvents: SddEvent[];
}
export interface SddEvent {
    schema: 'dsh-sdd/event@1';
    id: string;
    time: string;
    type: string;
    subject: string;
    stage?: StageId;
    detail?: Record<string, unknown>;
}
export interface ManualSourceInput {
    title: string;
    description?: string;
    items?: Array<{
        key?: string;
        title: string;
        description?: string;
    }>;
}
export type SddAction = {
    kind: 'snapshot';
    workspaceId: string;
} | {
    kind: 'initialize';
    workspaceId: string;
} | {
    kind: 'reinitialize';
    workspaceId: string;
} | {
    kind: 'create-draft';
    workspaceId: string;
    stage: StageId;
    title: string;
    basedOn: string[];
    sourceUids?: string[];
    workItemUid?: string;
} | {
    kind: 'create-revision';
    workspaceId: string;
    artifactUid: string;
} | {
    kind: 'discard-draft';
    workspaceId: string;
    artifactUid: string;
} | {
    kind: 'accept';
    workspaceId: string;
    artifactUid: string;
    checklist?: Record<string, boolean>;
} | {
    kind: 'read-artifact-file';
    workspaceId: string;
    artifactUid: string;
    path: string;
} | {
    kind: 'open-artifact-path';
    workspaceId: string;
    artifactUid: string;
    path: string;
} | {
    kind: 'read-stage-template';
    workspaceId: string;
    stage: StageId;
} | {
    kind: 'open-stage-template';
    workspaceId: string;
    stage: StageId;
    target: 'directory' | 'config' | 'content';
} | {
    kind: 'update-work-item-settings';
    workspaceId: string;
    workItemUid: string;
    repositoryScope: string[];
    developmentTargets: string[];
    openSpec?: {
        enabled: boolean;
        repositoryId?: string;
        path?: string;
    };
} | {
    kind: 'add-project-repository';
    workspaceId: string;
    id: string;
    source: string;
    baseBranch: string;
} | {
    kind: 'remove-project-repository';
    workspaceId: string;
    id: string;
} | {
    kind: 'quality';
    workspaceId: string;
    artifactUid: string;
} | {
    kind: 'context';
    workspaceId: string;
    stage: StageId;
    artifactUid: string;
    artifactUids: string[];
    sourceUids?: string[];
} | {
    kind: 'bind-session';
    workspaceId: string;
    runUid?: string;
    stage: StageId;
    artifactUid: string;
    sessionId: string;
    artifactUids: string[];
    sourceUids?: string[];
} | {
    kind: 'sync-run';
    workspaceId: string;
    runUid: string;
} | {
    kind: 'complete-run';
    workspaceId: string;
    runUid: string;
} | {
    kind: 'development-create';
    workspaceId: string;
    artifactUid: string;
    repositoryId: string;
} | {
    kind: 'development-status';
    workspaceId: string;
    artifactUid: string;
} | {
    kind: 'development-test';
    workspaceId: string;
    artifactUid: string;
    repositoryId: string;
    testId: string;
} | {
    kind: 'development-commit';
    workspaceId: string;
    artifactUid: string;
    repositoryId: string;
    message: string;
} | {
    kind: 'import-source';
    workspaceId: string;
    provider: string;
    sourceKind: string;
    key: string;
    connector?: string;
    input?: ManualSourceInput;
} | {
    kind: 'preview-source-import';
    workspaceId: string;
    provider: string;
    sourceKind: string;
    key: string;
    connector?: string;
    input?: ManualSourceInput;
} | {
    kind: 'apply-source-import';
    workspaceId: string;
    previewUid: string;
    identities: string[];
} | {
    kind: 'resolve-work-item-removal';
    workspaceId: string;
    workItemUid: string;
    decision: 'keep' | 'archive';
};
export type SddResponse = {
    ok: true;
    snapshot: ProjectSnapshot;
} | {
    ok: true;
    prompt: string;
    run?: StageRun;
} | {
    ok: true;
    preview: ImportPreview;
} | {
    ok: true;
    artifactFile: {
        artifactUid: string;
        path: string;
        kind: ArtifactFileSummary['kind'] | 'manifest';
        content?: string;
        dataUrl?: string;
    };
} | {
    ok: true;
    template: StageTemplatePreview;
} | {
    ok: true;
    opened: true;
} | {
    ok: false;
    error: string;
};
export declare function isStageId(value: unknown): value is StageId;
export declare function stageDefinition(id: StageId): typeof STAGES[number];
export declare function parseAction(value: unknown): SddAction | undefined;
