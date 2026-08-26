import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { stringify } from 'yaml'
import { SddIdentifierRegistry, SddSourceRegistry, validateSourceBundle } from '../src/extensions.ts'
import { CommandSourceProvider } from '../src/providers/command-source.ts'
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

  it('supports class or object identifier implementations', async () => {
    const ctx = new Context()
    await ctx.plugin(SddIdentifierRegistry)
    ctx.dshSddIdentifiers.register({ name: 'company-ids', async allocate() { return 'COMPANY-42' } })
    expect(await ctx.dshSddIdentifiers.get('company-ids')!.allocate({
      namespace: 'requirement', project, workspacePath: '/tmp', signal: AbortSignal.timeout(1000),
    })).toBe('COMPANY-42')
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
      schema: 'dsh-sdd/connector@1', id: 'demo-cli', type: 'command', command: [process.execPath, script], timeoutMs: 5000,
    }))
    const provider = new CommandSourceProvider()
    const source = await provider.get({
      kind: 'defect', key: 'BUG-9', connector: 'demo-cli',
      workspace: { workspaceId: 'w1', path: root, project }, signal: AbortSignal.timeout(5000),
    })
    expect(source).toMatchObject({ provider: 'demo-cli', kind: 'defect', externalKey: 'BUG-9', items: [{ externalKey: 'BUG-9' }] })
  })
})
