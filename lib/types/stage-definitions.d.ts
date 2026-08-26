import type { StageId } from './protocol.ts';
export interface StageToolPolicy {
    readonly allowShell: boolean;
    readonly writableArea: 'artifact-only' | 'artifact-and-development';
    readonly forbiddenTools: readonly string[];
}
export interface StageRuntimeDefinition {
    readonly id: StageId;
    readonly label: string;
    readonly role: string;
    readonly objective: string;
    readonly requiredSections: readonly string[];
    readonly completionChecklist: readonly string[];
    readonly toolPolicy: StageToolPolicy;
    readonly systemPrompt: string;
}
export declare const STAGE_RUNTIMES: Readonly<Record<StageId, StageRuntimeDefinition>>;
export declare function runtimeDefinition(stage: StageId): StageRuntimeDefinition;
