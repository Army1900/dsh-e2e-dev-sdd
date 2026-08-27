import type { SddSourceProvider, SourceGetRequest } from '../extensions.ts';
import type { SourceBundle } from '../protocol.ts';
/** Built-in zero-configuration intake. It normalizes user-entered facts into the regular bundle contract. */
export declare class ManualSourceProvider implements SddSourceProvider {
    readonly name = "manual";
    readonly kinds: readonly ["*"];
    get(request: SourceGetRequest): Promise<SourceBundle>;
}
