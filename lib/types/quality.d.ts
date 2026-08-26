import type { ArtifactSummary, ProjectConfig, ProjectSnapshot, QualityReport } from './protocol.ts';
export declare function evaluateQuality(artifact: ArtifactSummary, content: string, project: ProjectConfig, snapshot: Pick<ProjectSnapshot, 'artifacts' | 'developmentWorkspaces'>, checkedAt?: string): QualityReport;
