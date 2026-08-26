import { Service, type Context } from '@deepseek-ai/cordis'
import type { ProjectConfig, SourceEnvelope } from './protocol.ts'

const PROVIDER_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export interface SddWorkspaceContext {
  readonly workspaceId: string
  readonly path: string
  readonly project: ProjectConfig
}

export interface SourceGetRequest {
  readonly kind: string
  readonly key: string
  readonly workspace: SddWorkspaceContext
  readonly connector?: string
  readonly signal: AbortSignal
}

export interface SourceSearchRequest {
  readonly kind: string
  readonly query: string
  readonly workspace: SddWorkspaceContext
  readonly connector?: string
  readonly signal: AbortSignal
}

export interface SddSourceProvider {
  readonly name: string
  readonly kinds: readonly string[]
  get(request: SourceGetRequest): Promise<SourceEnvelope>
  search?(request: SourceSearchRequest): Promise<readonly SourceEnvelope[]>
  listChildren?(request: SourceGetRequest): Promise<readonly SourceEnvelope[]>
}

export interface SourceProviderControl {
  readonly signal: AbortSignal
}

export type SourceProviderFactory = (control: SourceProviderControl) => SddSourceProvider

export interface IdentifierAllocationRequest {
  readonly namespace: string
  readonly project: ProjectConfig
  readonly workspacePath: string
  readonly context?: Readonly<Record<string, unknown>>
  readonly signal: AbortSignal
}

export interface IdentifierValidationRequest {
  readonly namespace: string
  readonly key: string
  readonly project: ProjectConfig
  readonly workspacePath: string
  readonly signal: AbortSignal
}

export interface SddIdentifierProvider {
  readonly name: string
  allocate(request: IdentifierAllocationRequest): Promise<string>
  validate?(request: IdentifierValidationRequest): Promise<{ valid: boolean; message?: string }>
}

export interface IdentifierProviderControl {
  readonly signal: AbortSignal
}

export type IdentifierProviderFactory = (control: IdentifierProviderControl) => SddIdentifierProvider

interface Registered<T> {
  provider: T
  lifecycle: AbortController
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    dshSddSources: SddSourceRegistry
    dshSddIdentifiers: SddIdentifierRegistry
  }
}

function assertProviderName(name: string): void {
  if (!PROVIDER_NAME.test(name)) throw new Error(`invalid SDD provider name: ${JSON.stringify(name)}`)
}

export function validateSourceEnvelope(value: unknown): SourceEnvelope {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('source provider returned a non-object')
  const source = value as Partial<SourceEnvelope>
  if (source.schema !== 'dsh-sdd/source@1') throw new Error('source.schema must be dsh-sdd/source@1')
  for (const field of ['uid', 'provider', 'kind', 'title', 'fetchedAt'] as const) {
    if (typeof source[field] !== 'string' || source[field] === '') throw new Error(`source.${field} is required`)
  }
  if (!('content' in source) || source.content === undefined) throw new Error('source.content is required')
  if (!Number.isFinite(Date.parse(source.fetchedAt!))) throw new Error('source.fetchedAt must be an ISO date-time')
  return source as SourceEnvelope
}

export class SddSourceRegistry extends Service {
  private readonly providers = new Map<string, Registered<SddSourceProvider>>()

  constructor(ctx: Context) { super(ctx, 'dshSddSources') }

  register(providerOrFactory: SddSourceProvider | SourceProviderFactory): () => void {
    const lifecycle = new AbortController()
    let provider: SddSourceProvider
    try {
      provider = typeof providerOrFactory === 'function'
        ? providerOrFactory({ signal: lifecycle.signal })
        : providerOrFactory
      assertProviderName(provider.name)
      if (provider.kinds.length === 0 || provider.kinds.some(kind => typeof kind !== 'string' || kind === '')) {
        throw new Error(`source provider "${provider.name}" must declare at least one kind`)
      }
      if (this.providers.has(provider.name)) throw new Error(`source provider already registered: ${provider.name}`)
      this.providers.set(provider.name, { provider, lifecycle })
      return this.ctx.effect(() => () => {
        if (this.providers.get(provider.name)?.provider === provider) this.providers.delete(provider.name)
        lifecycle.abort(new Error(`source provider "${provider.name}" disposed`))
      }, `dsh-sdd: source provider ${provider.name}`)
    } catch (error) {
      lifecycle.abort(error)
      throw error
    }
  }

  names(): string[] { return [...this.providers.keys()].sort() }

  get(name: string): SddSourceProvider | undefined { return this.providers.get(name)?.provider }

  async fetch(name: string, request: Omit<SourceGetRequest, 'signal'> & { signal?: AbortSignal }): Promise<SourceEnvelope> {
    const registered = this.providers.get(name)
    if (registered === undefined) throw new Error(`source provider not found: ${name}`)
    if (!registered.provider.kinds.includes('*') && !registered.provider.kinds.includes(request.kind)) {
      throw new Error(`source provider "${name}" does not support kind "${request.kind}"`)
    }
    const signal = request.signal === undefined
      ? registered.lifecycle.signal
      : AbortSignal.any([request.signal, registered.lifecycle.signal])
    return validateSourceEnvelope(await registered.provider.get({ ...request, signal }))
  }
}

export class SddIdentifierRegistry extends Service {
  private readonly providers = new Map<string, Registered<SddIdentifierProvider>>()

  constructor(ctx: Context) { super(ctx, 'dshSddIdentifiers') }

  register(providerOrFactory: SddIdentifierProvider | IdentifierProviderFactory): () => void {
    const lifecycle = new AbortController()
    let provider: SddIdentifierProvider
    try {
      provider = typeof providerOrFactory === 'function'
        ? providerOrFactory({ signal: lifecycle.signal })
        : providerOrFactory
      assertProviderName(provider.name)
      if (this.providers.has(provider.name)) throw new Error(`identifier provider already registered: ${provider.name}`)
      this.providers.set(provider.name, { provider, lifecycle })
      return this.ctx.effect(() => () => {
        if (this.providers.get(provider.name)?.provider === provider) this.providers.delete(provider.name)
        lifecycle.abort(new Error(`identifier provider "${provider.name}" disposed`))
      }, `dsh-sdd: identifier provider ${provider.name}`)
    } catch (error) {
      lifecycle.abort(error)
      throw error
    }
  }

  names(): string[] { return [...this.providers.keys()].sort() }

  get(name: string): SddIdentifierProvider | undefined { return this.providers.get(name)?.provider }
}

export default SddSourceRegistry
