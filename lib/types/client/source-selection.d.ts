import type { ConnectorSummary, ProjectConfig } from '../protocol.ts';
/** Prefer explicit enterprise providers and available Connectors over zero-configuration manual intake. */
export declare function preferredSourceSelection(providers: readonly string[], connectors: readonly ConnectorSummary[], configured: ProjectConfig['sources'][string] | undefined): {
    provider: string;
    connector?: string;
};
