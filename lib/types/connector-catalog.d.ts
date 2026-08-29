import type { ConnectorSummary } from './protocol.ts';
export type ConnectorScope = 'plugin' | 'project';
export interface ConnectorDescriptor extends ConnectorSummary {
    configPath: string;
    adapterRoot: string;
}
/** Resolves the same Connector/Adapter layout from the installed plugin and the current SDD project. */
export declare class ConnectorCatalog {
    private readonly pluginBusinessRoot;
    constructor(pluginBusinessRoot: string);
    list(workspacePath: string): Promise<ConnectorSummary[]>;
    resolve(workspacePath: string, id: string): Promise<ConnectorDescriptor>;
    private descriptors;
}
