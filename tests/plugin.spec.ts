import { Context, Service } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import * as Plugin from '../src/index.ts'

class FakeApiProxy extends Service {
  workspace = {
    list: async (request: { rpcId: string }) => ({
      rpcId: request.rpcId,
      result: { ok: true as const, value: { items: [], archivedSessionIds: [] } },
    }),
  }

  constructor(ctx: Context) { super(ctx, 'apiProxy') }
}

class FakeWebServer extends Service {
  readonly routes: unknown[] = []

  constructor(ctx: Context) { super(ctx, 'webServer') }

  register(route: unknown): () => void {
    this.routes.push(route)
    return () => { this.routes.splice(this.routes.indexOf(route), 1) }
  }
}

class FakeDependency extends Service {
  constructor(ctx: Context, name: string) { super(ctx, name) }
}

describe('plugin composition', () => {
  it('provides extension registries, builtins and the Host route', async () => {
    const ctx = new Context()
    await ctx.plugin(FakeApiProxy)
    await ctx.plugin(FakeWebServer)
    await ctx.plugin(inner => { new FakeDependency(inner, 'agents') })
    await ctx.plugin(inner => { new FakeDependency(inner, 'systemPrompt') })
    await ctx.plugin(inner => { new FakeDependency(inner, 'tools') })
    await ctx.plugin(Plugin)
    expect(ctx.dshSddSources.names()).toEqual(['command'])
    expect(ctx.dshSddIdentifiers.names()).toEqual([])
    const web = ctx.get('webServer') as unknown as FakeWebServer
    expect(web.routes).toEqual([expect.objectContaining({ kind: 'exact', path: '/api/dsh-e2e-dev-sdd' })])
  })
})
