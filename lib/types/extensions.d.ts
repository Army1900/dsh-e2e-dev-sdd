import { Service, type Context } from '@deepseek-ai/cordis';
import type { ProjectConfig, SourceBundle, SourceEnvelope } from './protocol.ts';
export interface SddWorkspaceContext {
    readonly workspaceId: string;
    readonly path: string;
    readonly project: ProjectConfig;
}
export interface SourceGetRequest {
    readonly kind: string;
    readonly key: string;
    readonly workspace: SddWorkspaceContext;
    readonly connector?: string;
    /** Provider-specific structured input, used by built-in manual intake and extensible providers. */
    readonly input?: unknown;
    readonly signal: AbortSignal;
}
export interface SourceSearchRequest {
    readonly kind: string;
    readonly query: string;
    readonly workspace: SddWorkspaceContext;
    readonly connector?: string;
    readonly signal: AbortSignal;
}
export interface SddSourceProvider {
    readonly name: string;
    readonly kinds: readonly string[];
    get(request: SourceGetRequest): Promise<SourceBundle>;
    search?(request: SourceSearchRequest): Promise<readonly SourceEnvelope[]>;
}
export interface SourceProviderControl {
    readonly signal: AbortSignal;
}
export type SourceProviderFactory = (control: SourceProviderControl) => SddSourceProvider;
declare module '@deepseek-ai/cordis' {
    interface Context {
        dshSddSources: SddSourceRegistry;
    }
}
export declare function validateSourceEnvelope(value: unknown): SourceEnvelope;
export declare function validateSourceBundle(value: unknown): SourceBundle;
export declare class SddSourceRegistry extends Service {
    private readonly providers;
    constructor(ctx: Context);
    register(providerOrFactory: SddSourceProvider | SourceProviderFactory): () => void;
    names(): string[];
    get(name: string): SddSourceProvider | undefined;
    fetch(name: string, request: Omit<SourceGetRequest, 'signal'> & {
        signal?: AbortSignal;
    }): Promise<SourceBundle>;
}
export default SddSourceRegistry;
