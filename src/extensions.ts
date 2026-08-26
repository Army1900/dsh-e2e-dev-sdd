import { Service, type Context } from '@deepseek-ai/cordis'
import type { ProjectConfig, SourceBundle, SourceEnvelope } from './protocol.ts'

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
  get(request: SourceGetRequest): Promise<SourceBundle>
  search?(request: SourceSearchRequest): Promise<readonly SourceEnvelope[]>
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

export function validateSourceBundle(value: unknown): SourceBundle {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('source provider returned a non-object')
  const bundle = value as Partial<SourceBundle>
  if (bundle.schema !== 'dsh-sdd/source-bundle@1') throw new Error('source.schema must be dsh-sdd/source-bundle@1')
  for (const field of ['uid', 'provider', 'kind', 'externalKey', 'title', 'fetchedAt'] as const) {
    if (typeof bundle[field] !== 'string' || bundle[field] === '') throw new Error(`source bundle.${field} is required`)
  }
  if (!Number.isFinite(Date.parse(bundle.fetchedAt!))) throw new Error('source bundle.fetchedAt must be an ISO date-time')
  const root = bundle.root === undefined ? undefined : validateSourceEnvelope(bundle.root)
  if (!Array.isArray(bundle.items) || bundle.items.length === 0) throw new Error('source bundle.items must contain at least one item')
  const items = bundle.items.map(validateSourceEnvelope)
  if (root !== undefined && root.externalKey === undefined) throw new Error('source bundle.root.externalKey is required')
  if (root !== undefined && root.provider !== bundle.provider) throw new Error('source bundle.root.provider must match bundle.provider')
  for (const item of items) {
    if (item.externalKey === undefined) throw new Error('every source bundle item needs externalKey')
    if (item.provider !== bundle.provider) throw new Error('every source bundle item provider must match bundle.provider')
  }
  if (!Array.isArray(bundle.relations)) throw new Error('source bundle.relations must be an array')
  const keys = new Set([root?.externalKey, ...items.map(item => item.externalKey)].filter((key): key is string => typeof key === 'string'))
  for (const relation of bundle.relations) {
    if (typeof relation !== 'object' || relation === null || typeof relation.from !== 'string' || typeof relation.to !== 'string' || typeof relation.type !== 'string') {
      throw new Error('source bundle relation requires from, to and type')
    }
    if (!keys.has(relation.from) || !keys.has(relation.to)) throw new Error(`source bundle relation references an unknown key: ${relation.from} -> ${relation.to}`)
  }
  const identities = items.map(item => `${item.provider}\0${item.kind}\0${item.externalKey ?? item.uid}`)
  if (new Set(identities).size !== identities.length) throw new Error('source bundle contains duplicate item identities')
  return { ...bundle, ...(root === undefined ? {} : { root }), items } as SourceBundle
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

  async fetch(name: string, request: Omit<SourceGetRequest, 'signal'> & { signal?: AbortSignal }): Promise<SourceBundle> {
    const registered = this.providers.get(name)
    if (registered === undefined) throw new Error(`source provider not found: ${name}`)
    if (!registered.provider.kinds.includes('*') && !registered.provider.kinds.includes(request.kind)) {
      throw new Error(`source provider "${name}" does not support kind "${request.kind}"`)
    }
    const signal = request.signal === undefined
      ? registered.lifecycle.signal
      : AbortSignal.any([request.signal, registered.lifecycle.signal])
    return validateSourceBundle(await registered.provider.get({ ...request, signal }))
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
