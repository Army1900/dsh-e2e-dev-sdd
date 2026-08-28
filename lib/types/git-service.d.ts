import type { ArtifactSummary, DevelopmentWorkspace, ProjectConfig, ProjectRepositoryState, RepositoryInspection } from './protocol.ts';
export declare function readDevelopmentWorkspace(projectPath: string, artifactUid: string): Promise<DevelopmentWorkspace | undefined>;
export declare function listDevelopmentWorkspaces(projectPath: string, artifacts: readonly ArtifactSummary[]): Promise<DevelopmentWorkspace[]>;
export declare class ProjectGitService {
    inspect(projectPath: string, project: ProjectConfig): Promise<ProjectRepositoryState>;
    private assertUsable;
    fetch(projectPath: string, project: ProjectConfig): Promise<void>;
    sync(projectPath: string, project: ProjectConfig): Promise<void>;
    commit(projectPath: string, project: ProjectConfig, message: string): Promise<void>;
    push(projectPath: string, project: ProjectConfig): Promise<void>;
}
export declare class GitDevelopmentService {
    inheritRevision(projectPath: string, previousArtifactUid: string, artifact: ArtifactSummary): Promise<DevelopmentWorkspace | undefined>;
    discardInheritedRevision(projectPath: string, artifactUid: string, previousArtifactUid: string): Promise<boolean>;
    inspectSource(projectPath: string, source: string): Promise<RepositoryInspection>;
    initializeLocalSource(projectPath: string, source: string, branch: string): Promise<RepositoryInspection>;
    validateSource(projectPath: string, source: string, baseBranch: string): Promise<'local' | 'remote'>;
    create(projectPath: string, project: ProjectConfig, artifact: ArtifactSummary, repositoryId: string): Promise<DevelopmentWorkspace>;
    status(projectPath: string, artifactUid: string): Promise<DevelopmentWorkspace>;
    recordAiTest(projectPath: string, artifactUid: string, repositoryId: string, evidence: {
        command: string;
        description: string;
        exitCode: number | null;
        output: string;
        sessionId: string;
        passed: boolean;
    }): Promise<DevelopmentWorkspace>;
    skipTest(projectPath: string, artifactUid: string, repositoryId: string, reason: string): Promise<DevelopmentWorkspace>;
    commit(projectPath: string, artifactUid: string, repositoryId: string, message: string): Promise<DevelopmentWorkspace>;
    private write;
}
