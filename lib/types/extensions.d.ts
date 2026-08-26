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
export interface IdentifierAllocationRequest {
    readonly namespace: string;
    readonly project: ProjectConfig;
    readonly workspacePath: string;
    readonly context?: Readonly<Record<string, unknown>>;
    readonly signal: AbortSignal;
}
export interface IdentifierValidationRequest {
    readonly namespace: string;
    readonly key: string;
    readonly project: ProjectConfig;
    readonly workspacePath: string;
    readonly signal: AbortSignal;
}
export interface SddIdentifierProvider {
    readonly name: string;
    allocate(request: IdentifierAllocationRequest): Promise<string>;
    validate?(request: IdentifierValidationRequest): Promise<{
        valid: boolean;
        message?: string;
    }>;
}
export interface IdentifierProviderControl {
    readonly signal: AbortSignal;
}
export type IdentifierProviderFactory = (control: IdentifierProviderControl) => SddIdentifierProvider;
declare module '@deepseek-ai/cordis' {
    interface Context {
        dshSddSources: SddSourceRegistry;
        dshSddIdentifiers: SddIdentifierRegistry;
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
export declare class SddIdentifierRegistry extends Service {
    private readonly providers;
    constructor(ctx: Context);
    register(providerOrFactory: SddIdentifierProvider | IdentifierProviderFactory): () => void;
    names(): string[];
    get(name: string): SddIdentifierProvider | undefined;
}
export default SddSourceRegistry;
