import type { ApiProxy } from '@deepseek-ai/dsh-host-apiproxy';
import { type ArtifactFileSummary, type ImportPreview, type ProjectSnapshot, type RepositoryInspection, type RevisionPreview, type SddAction, type StageRun, type StageTemplatePreview } from './protocol.ts';
import { type SddSourceRegistry } from './extensions.ts';
import { GitDevelopmentService } from './git-service.ts';
import type { StageSessionController } from './session-controller.ts';
export declare class SddProjectService {
    private readonly api;
    private readonly sourceRegistry?;
    private readonly sessionController?;
    private readonly git;
    private openSpecCliCache?;
    constructor(api: ApiProxy, sourceRegistry?: SddSourceRegistry | undefined, sessionController?: StageSessionController | undefined, git?: GitDevelopmentService);
    private openSpecCli;
    private workspace;
    execute(action: SddAction): Promise<ProjectSnapshot | ImportPreview | StageTemplatePreview | RepositoryInspection | {
        revisionPreview: RevisionPreview;
    } | {
        prompt: string;
        run?: StageRun;
    } | {
        artifactFile: {
            artifactUid: string;
            path: string;
            kind: ArtifactFileSummary['kind'] | 'manifest';
            content?: string;
            dataUrl?: string;
        };
    } | {
        opened: true;
    }>;
    initialize(workspaceId: string): Promise<void>;
    private reinitialize;
    snapshot(workspaceId: string): Promise<ProjectSnapshot>;
    private validateOpenSpecSettings;
    private listConnectors;
    private listWorkItems;
    private createDraft;
    private revisionPlan;
    private previewRevision;
    private createRevision;
    private discardDraft;
    private readArtifactFile;
    private openArtifactPath;
    private readStageTemplate;
    private openStageTemplate;
    private installOpenSpec;
    private initializeOpenSpec;
    private updateWorkItemSettings;
    private addProjectRepository;
    private updateProjectRepositoryBranch;
    private removeProjectRepository;
    private nextKey;
    private listSources;
    private previewSourceImport;
    private writeSourceSnapshot;
    private applySourceImport;
    private resolveWorkItemRemoval;
    private hasCurrentChangeEvidence;
    private staleInputLabels;
    private stageSettingsError;
    private accept;
    private context;
    private bindSession;
    private syncRun;
    private completeRun;
    private listRuns;
    private writeRun;
    private bindRuntime;
    private requireSnapshot;
    private requireArtifact;
    private emptyDashboard;
    private dashboard;
}
