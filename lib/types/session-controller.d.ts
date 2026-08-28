import type { Context } from '@deepseek-ai/cordis';
import type { StageId } from './protocol.ts';
interface SessionBindingSpec {
    sessionId: string;
    stage: StageId;
    artifactUid?: string;
    systemPrompt: string;
    projectPath: string;
    artifactDirectory: string;
    developmentDirectories: string[];
    developmentRepositories?: Array<{
        id: string;
        path: string;
    }>;
    artifactTemplate: string;
}
export interface AiTestExecutionEvidence {
    projectPath: string;
    artifactUid: string;
    repositoryId: string;
    command: string;
    description: string;
    exitCode: number | null;
    output: string;
    sessionId: string;
    passed: boolean;
}
export declare class StageSessionController {
    private readonly ctx;
    private readonly recordAiTest?;
    private readonly active;
    private readonly desired;
    constructor(ctx: Context, recordAiTest?: ((evidence: AiTestExecutionEvidence) => Promise<void>) | undefined);
    bind(spec: SessionBindingSpec): void;
    private attach;
    unbind(sessionId: string): void;
    private detach;
}
export {};
