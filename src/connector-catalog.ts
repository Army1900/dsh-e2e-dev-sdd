import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { ConnectorSummary } from './protocol.ts'

const CONNECTOR_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export type ConnectorScope = 'plugin' | 'project'

export interface ConnectorDescriptor extends ConnectorSummary {
  configPath: string
  adapterRoot: string
}

async function connectorFiles(root: string, scope: ConnectorScope): Promise<Map<string, ConnectorDescriptor>> {
  const connectorsRoot = join(root, 'connectors')
  const result = new Map<string, ConnectorDescriptor>()
  let entries
  try { entries = await readdir(connectorsRoot, { withFileTypes: true }) }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return result
    throw error
  }
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isFile() || (!entry.name.endsWith('.yaml') && !entry.name.endsWith('.yml'))) continue
    const id = entry.name.replace(/\.ya?ml$/, '')
    if (!CONNECTOR_ID.test(id)) continue
    result.set(id, {
      id,
      scope,
      overridden: false,
      configPath: join(connectorsRoot, entry.name),
      adapterRoot: join(root, 'adapters'),
    })
  }
  return result
}

/** Resolves the same Connector/Adapter layout from the installed plugin and the current SDD project. */
export class ConnectorCatalog {
  constructor(private readonly pluginBusinessRoot: string) {}

  async list(workspacePath: string): Promise<ConnectorSummary[]> {
    const descriptors = await this.descriptors(workspacePath)
    return [...descriptors.values()]
      .map(({ id, scope, overridden }) => ({ id, scope, overridden }))
      .sort((left, right) => left.id.localeCompare(right.id))
  }

  async resolve(workspacePath: string, id: string): Promise<ConnectorDescriptor> {
    if (!CONNECTOR_ID.test(id)) throw new Error('connector id must use kebab-case')
    const connector = (await this.descriptors(workspacePath)).get(id)
    if (connector === undefined) throw new Error(`connector not found: ${id}`)
    return connector
  }

  private async descriptors(workspacePath: string): Promise<Map<string, ConnectorDescriptor>> {
    const plugin = await connectorFiles(this.pluginBusinessRoot, 'plugin')
    const project = await connectorFiles(join(workspacePath, '.sdd', 'business'), 'project')
    const result = new Map(plugin)
    for (const [id, descriptor] of project) result.set(id, { ...descriptor, overridden: plugin.has(id) })
    return result
  }
}
