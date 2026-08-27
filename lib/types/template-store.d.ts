import { type ArtifactTemplateBinding, type StageId } from './protocol.ts';
export interface StageTemplateConfig {
    schema: 'dsh-sdd/artifact-template@1';
    stage: StageId;
    version: string;
    documentName: string;
    maintenanceGuide: string;
    requiredSections: string[];
}
export interface StageTemplateBundle {
    config: StageTemplateConfig;
    content: string;
    directory: string;
    directoryRelative: string;
    configRelative: string;
    contentRelative: string;
    contentHash: string;
}
export declare function ensureProjectTemplates(workspacePath: string): Promise<void>;
export declare function loadStageTemplate(workspacePath: string, stage: StageId): Promise<StageTemplateBundle>;
export declare function renderStageTemplateContent(content: string, key: string, title: string): string;
export declare function renderStageTemplate(bundle: StageTemplateBundle, key: string, title: string): string;
export declare function snapshotStageTemplate(artifactDirectory: string, bundle: StageTemplateBundle): Promise<ArtifactTemplateBinding>;
