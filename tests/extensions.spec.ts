import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { stringify } from 'yaml'
import { SddSourceRegistry, validateSourceBundle } from '../src/extensions.ts'
import { ConnectorCatalog } from '../src/connector-catalog.ts'
import { CommandSourceProvider } from '../src/providers/command-source.ts'
import { ManualSourceProvider } from '../src/providers/manual-source.ts'
import type { ProjectConfig } from '../src/protocol.ts'

const project = {
  schema: 'dsh-sdd/project@1', project: { key: 'demo', name: 'Demo' },
  identifiers: { internal: { strategy: 'uuid' }, namespaces: {} }, dependencies: {},
  sources: {},
  development: { workspaceRoot: '.sdd-workspaces', branchPattern: 'sdd/{artifactKey}', mergeStrategy: 'manual' },
} as unknown as ProjectConfig

describe('SDD extension registries', () => {
  it('requires the unified non-empty bundle contract', () => {
    expect(() => validateSourceBundle({ schema: 'dsh-sdd/source@1' })).toThrow('source-bundle@1')
    expect(() => validateSourceBundle({ schema: 'dsh-sdd/source-bundle@1', uid: 'b', provider: 'p', kind: 'requirement', externalKey: 'R-1', title: 'R', fetchedAt: new Date(0).toISOString(), items: [], relations: [] }))
      .toThrow('at least one item')
  })

  it('registers, invokes and disposes a source provider', async () => {
    const ctx = new Context()
    await ctx.plugin(SddSourceRegistry)
    const dispose = ctx.dshSddSources.register({
      name: 'memory', kinds: ['requirement'],
      async get(request) {
        return {
          schema: 'dsh-sdd/source-bundle@1', uid: 'bundle-1', provider: 'memory', kind: request.kind, externalKey: request.key,
          title: request.key, fetchedAt: new Date(0).toISOString(), relations: [], items: [{ schema: 'dsh-sdd/source@1', uid: 'source-1', provider: 'memory', kind: request.kind, externalKey: request.key, title: request.key, fetchedAt: new Date(0).toISOString(), content: { body: 'requirement' } }],
        }
      },
    })
    expect(ctx.dshSddSources.names()).toEqual(['memory'])
    const source = await ctx.dshSddSources.fetch('memory', {
      kind: 'requirement', key: 'REQ-1', workspace: { workspaceId: 'w1', path: '/tmp', project },
    })
    expect(source.items[0]?.title).toBe('REQ-1')
    dispose()
    expect(ctx.dshSddSources.names()).toEqual([])
  })

  it('validates a provider bundle with independently identifiable children', async () => {
    const ctx = new Context()
    await ctx.plugin(SddSourceRegistry)
    const source = (key: string) => ({ schema: 'dsh-sdd/source@1' as const, uid: `memory:${key}`, provider: 'memory', kind: 'requirement', externalKey: key, title: key, fetchedAt: new Date(0).toISOString(), content: { key } })
    ctx.dshSddSources.register({
      name: 'memory', kinds: ['requirement'], async get() {
        return { schema: 'dsh-sdd/source-bundle@1' as const, uid: 'bundle-1', provider: 'memory', kind: 'requirement', externalKey: 'EPIC-1', title: 'Epic', fetchedAt: new Date(0).toISOString(), root: source('EPIC-1'), items: [source('REQ-1')], relations: [{ from: 'REQ-1', to: 'EPIC-1', type: 'child-of' }] }
      },
    })
    const result = await ctx.dshSddSources.fetch('memory', { kind: 'requirement', key: 'EPIC-1', workspace: { workspaceId: 'w1', path: '/tmp', project } })
    expect(result).toMatchObject({ schema: 'dsh-sdd/source-bundle@1', items: [{ externalKey: 'REQ-1' }] })
  })

  it('uses a one-item array for a single imported record', async () => {
    const ctx = new Context()
    await ctx.plugin(SddSourceRegistry)
    const source = (key: string) => ({ schema: 'dsh-sdd/source@1' as const, uid: `tree:${key}`, provider: 'tree', kind: 'requirement', externalKey: key, title: key, fetchedAt: new Date(0).toISOString(), content: { key } })
    ctx.dshSddSources.register({ name: 'tree', kinds: ['requirement'], async get() { return { schema: 'dsh-sdd/source-bundle@1', uid: 'bundle-2', provider: 'tree', kind: 'requirement', externalKey: 'REQ-21', title: 'REQ-21', fetchedAt: new Date(0).toISOString(), items: [source('REQ-21')], relations: [] } } })
    const result = await ctx.dshSddSources.fetch('tree', { kind: 'requirement', key: 'EPIC-2', workspace: { workspaceId: 'w1', path: '/tmp', project } })
    expect(result).toMatchObject({ schema: 'dsh-sdd/source-bundle@1', items: [{ externalKey: 'REQ-21' }] })
  })
})

describe('CommandSourceProvider', () => {
  it('runs an argv command and validates its Source Envelope', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-sdd-command-'))
    await mkdir(join(root, '.sdd', 'business', 'connectors'), { recursive: true })
    await mkdir(join(root, '.sdd', 'business', 'adapters'), { recursive: true })
    const script = join(root, '.sdd', 'business', 'adapters', 'connector.mjs')
    await writeFile(script, `let input=''; for await (const chunk of process.stdin) input += chunk; const request=JSON.parse(input); const item={schema:'dsh-sdd/source@1',uid:'source-1',provider:'demo-cli',kind:request.kind,externalKey:request.key,title:'Imported '+request.key,fetchedAt:new Date(0).toISOString(),content:{body:'from cli'}}; process.stdout.write(JSON.stringify({schema:'dsh-sdd/source-bundle@1',uid:'bundle-1',provider:'demo-cli',kind:request.kind,externalKey:request.key,title:item.title,fetchedAt:item.fetchedAt,items:[item],relations:[]}));`)
    await writeFile(join(root, '.sdd', 'business', 'connectors', 'demo-cli.yaml'), stringify({
      schema: 'dsh-sdd/connector@1', id: 'demo-cli', type: 'command', command: [process.execPath, '.sdd/business/adapters/connector.mjs'], timeoutMs: 5000,
    }))
    const provider = new CommandSourceProvider()
    const source = await provider.get({
      kind: 'defect', key: 'BUG-9', connector: 'demo-cli',
      workspace: { workspaceId: 'w1', path: root, project }, signal: AbortSignal.timeout(5000),
    })
    expect(source).toMatchObject({ provider: 'demo-cli', kind: 'defect', externalKey: 'BUG-9', items: [{ externalKey: 'BUG-9' }] })
  })

  it('runs the same Connector and Adapter format from the installed plugin directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-sdd-command-workspace-'))
    const pluginBusiness = await mkdtemp(join(tmpdir(), 'dsh-sdd-command-plugin-'))
    await mkdir(join(pluginBusiness, 'connectors'), { recursive: true })
    await mkdir(join(pluginBusiness, 'adapters'), { recursive: true })
    await writeFile(join(pluginBusiness, 'adapters', 'connector.mjs'), `let input=''; for await (const chunk of process.stdin) input += chunk; const request=JSON.parse(input); const item={schema:'dsh-sdd/source@1',uid:'plugin-source',provider:'company-alm',kind:request.kind,externalKey:request.key,title:'Plugin '+request.key,fetchedAt:new Date(0).toISOString(),content:{scope:'plugin'}}; process.stdout.write(JSON.stringify({schema:'dsh-sdd/source-bundle@1',uid:'plugin-bundle',provider:'company-alm',kind:request.kind,externalKey:request.key,title:item.title,fetchedAt:item.fetchedAt,items:[item],relations:[]}));`)
    await writeFile(join(pluginBusiness, 'connectors', 'company-alm.yaml'), stringify({
      schema: 'dsh-sdd/connector@1', id: 'company-alm', type: 'command', command: [process.execPath, '.sdd\\business\\adapters\\connector.mjs'], timeoutMs: 5000,
    }))
    const catalog = new ConnectorCatalog(pluginBusiness)
    expect(await catalog.list(root)).toEqual([{ id: 'company-alm', scope: 'plugin', overridden: false }])
    const source = await new CommandSourceProvider(catalog).get({
      kind: 'requirement', key: 'REQ-8', connector: 'company-alm',
      workspace: { workspaceId: 'w1', path: root, project }, signal: AbortSignal.timeout(5000),
    })
    expect(source).toMatchObject({ provider: 'company-alm', title: 'Plugin REQ-8', items: [{ content: { scope: 'plugin' } }] })
  })

  it('lets a project Connector override an installed Connector with the same id', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-sdd-command-override-'))
    const pluginBusiness = await mkdtemp(join(tmpdir(), 'dsh-sdd-command-plugin-'))
    const bundleScript = (scope: string) => `let input=''; for await (const chunk of process.stdin) input += chunk; const request=JSON.parse(input); const item={schema:'dsh-sdd/source@1',uid:'${scope}-source',provider:'company-alm',kind:request.kind,externalKey:request.key,title:'${scope}',fetchedAt:new Date(0).toISOString(),content:{scope:'${scope}'}}; process.stdout.write(JSON.stringify({schema:'dsh-sdd/source-bundle@1',uid:'${scope}-bundle',provider:'company-alm',kind:request.kind,externalKey:request.key,title:item.title,fetchedAt:item.fetchedAt,items:[item],relations:[]}));`
    for (const business of [pluginBusiness, join(root, '.sdd', 'business')]) {
      await mkdir(join(business, 'connectors'), { recursive: true }); await mkdir(join(business, 'adapters'), { recursive: true })
      await writeFile(join(business, 'connectors', 'company-alm.yaml'), stringify({ schema: 'dsh-sdd/connector@1', id: 'company-alm', type: 'command', command: [process.execPath, '.sdd/business/adapters/connector.mjs'] }))
    }
    await writeFile(join(pluginBusiness, 'adapters', 'connector.mjs'), bundleScript('plugin'))
    await writeFile(join(root, '.sdd', 'business', 'adapters', 'connector.mjs'), bundleScript('project'))
    const catalog = new ConnectorCatalog(pluginBusiness)
    expect(await catalog.list(root)).toEqual([{ id: 'company-alm', scope: 'project', overridden: true }])
    const source = await new CommandSourceProvider(catalog).get({ kind: 'requirement', key: 'REQ-9', connector: 'company-alm', workspace: { workspaceId: 'w1', path: root, project }, signal: AbortSignal.timeout(5000) })
    expect(source.items[0]?.content).toEqual({ scope: 'project' })
  })

  it('rejects an Adapter path that escapes the selected business/adapters directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-sdd-command-escape-'))
    const pluginBusiness = await mkdtemp(join(tmpdir(), 'dsh-sdd-command-plugin-'))
    await mkdir(join(pluginBusiness, 'connectors'), { recursive: true })
    await writeFile(join(pluginBusiness, 'connectors', 'unsafe.yaml'), stringify({
      schema: 'dsh-sdd/connector@1', id: 'unsafe', type: 'command', command: [process.execPath, '.sdd/business/adapters/../outside.mjs'],
    }))
    const provider = new CommandSourceProvider(new ConnectorCatalog(pluginBusiness))
    await expect(provider.get({ kind: 'requirement', key: 'REQ-10', connector: 'unsafe', workspace: { workspaceId: 'w1', path: root, project }, signal: AbortSignal.timeout(5000) }))
      .rejects.toThrow('escapes its adapter directory')
  })
})

describe('ManualSourceProvider', () => {
  it('creates a one-item bundle without any enterprise connector', async () => {
    const provider = new ManualSourceProvider()
    const bundle = await provider.get({
      kind: 'requirement', key: 'MANUAL-1', input: { title: '订单部分退款', description: '具体规则待讨论' },
      workspace: { workspaceId: 'w1', path: '/tmp', project }, signal: AbortSignal.timeout(1000),
    })
    expect(bundle).toMatchObject({ provider: 'manual', externalKey: 'MANUAL-1', items: [{ externalKey: 'MANUAL-1', title: '订单部分退款', content: { description: '具体规则待讨论' } }] })
  })

  it('normalizes multiple manually entered children into independent work items', async () => {
    const provider = new ManualSourceProvider()
    const bundle = await provider.get({
      kind: 'requirement', key: 'EPIC-1', input: { title: '支付升级', items: [{ key: 'REQ-1', title: '微信支付' }, { title: '支付通知' }] },
      workspace: { workspaceId: 'w1', path: '/tmp', project }, signal: AbortSignal.timeout(1000),
    })
    expect(bundle.items.map(item => item.externalKey)).toEqual(['REQ-1', 'EPIC-1-02'])
    expect(bundle.relations).toEqual([{ from: 'REQ-1', to: 'EPIC-1', type: 'child-of' }, { from: 'EPIC-1-02', to: 'EPIC-1', type: 'child-of' }])
  })
})
