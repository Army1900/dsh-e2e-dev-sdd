import type { ArtifactSummary, DevelopmentWorkspace, ProjectConfig } from './protocol.ts';
export declare function readDevelopmentWorkspace(projectPath: string, artifactUid: string): Promise<DevelopmentWorkspace | undefined>;
export declare function listDevelopmentWorkspaces(projectPath: string, artifacts: readonly ArtifactSummary[]): Promise<DevelopmentWorkspace[]>;
export declare class GitDevelopmentService {
    validateSource(projectPath: string, source: string, baseBranch: string): Promise<'local' | 'remote'>;
    create(projectPath: string, project: ProjectConfig, artifact: ArtifactSummary, repositoryId: string): Promise<DevelopmentWorkspace>;
    status(projectPath: string, artifactUid: string): Promise<DevelopmentWorkspace>;
    test(projectPath: string, project: ProjectConfig, artifactUid: string, repositoryId: string, testId: string): Promise<DevelopmentWorkspace>;
    commit(projectPath: string, artifactUid: string, repositoryId: string, message: string): Promise<DevelopmentWorkspace>;
    private write;
}
