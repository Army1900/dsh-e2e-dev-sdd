import { ConnectorCatalog } from '../connector-catalog.ts';
import type { SddSourceProvider, SourceGetRequest } from '../extensions.ts';
import type { SourceBundle } from '../protocol.ts';
/** Built-in adapter for plugin-installed and project-owned CLI scripts. It never invokes a shell. */
export declare class CommandSourceProvider implements SddSourceProvider {
    private readonly connectors;
    readonly name = "command";
    readonly kinds: readonly ["*"];
    constructor(connectors?: ConnectorCatalog);
    get(request: SourceGetRequest): Promise<SourceBundle>;
}
