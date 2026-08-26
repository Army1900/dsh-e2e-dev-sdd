import type { SddSourceProvider, SourceGetRequest } from '../extensions.ts';
import type { SourceBundle } from '../protocol.ts';
/** Built-in adapter for project-owned CLI scripts. It never invokes a shell. */
export declare class CommandSourceProvider implements SddSourceProvider {
    readonly name = "command";
    readonly kinds: readonly ["*"];
    get(request: SourceGetRequest): Promise<SourceBundle>;
}
