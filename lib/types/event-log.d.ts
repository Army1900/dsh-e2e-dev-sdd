import type { SddEvent, StageId } from './protocol.ts';
export declare function appendEvent(workspacePath: string, type: string, subject: string, stage?: StageId, detail?: Record<string, unknown>): Promise<SddEvent>;
export declare function readRecentEvents(workspacePath: string, limit?: number): Promise<SddEvent[]>;
