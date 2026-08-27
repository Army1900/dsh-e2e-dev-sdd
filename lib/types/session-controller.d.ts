import type { Context } from '@deepseek-ai/cordis';
import { type StageId } from './protocol.ts';
interface SessionBindingSpec {
    sessionId: string;
    stage: StageId;
    systemPrompt: string;
    projectPath: string;
    artifactDirectory: string;
    developmentDirectories: string[];
}
export declare class StageSessionController {
    private readonly ctx;
    private readonly active;
    private readonly desired;
    constructor(ctx: Context);
    bind(spec: SessionBindingSpec): void;
    private attach;
    unbind(sessionId: string): void;
    private detach;
}
export {};
