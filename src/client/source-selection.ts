import type { ConnectorSummary, ProjectConfig } from '../protocol.ts'

/** Prefer explicit enterprise providers and available Connectors over zero-configuration manual intake. */
export function preferredSourceSelection(
  providers: readonly string[],
  connectors: readonly ConnectorSummary[],
  configured: ProjectConfig['sources'][string] | undefined,
): { provider: string; connector?: string } {
  const configuredProvider = configured !== undefined && providers.includes(configured.provider) ? configured.provider : undefined
  const customProvider = providers.find(provider => provider !== 'manual' && provider !== 'command')
  const commandProvider = providers.includes('command') && connectors.length > 0 ? 'command' : undefined
  const provider = configuredProvider !== undefined && configuredProvider !== 'manual' ? configuredProvider
    : customProvider ?? commandProvider ?? configuredProvider ?? (providers.includes('manual') ? 'manual' : providers[0]!)
  const configuredConnector = configured?.connector !== undefined && connectors.some(connector => connector.id === configured.connector) ? configured.connector : undefined
  const connector = configuredConnector ?? connectors.find(item => item.scope === 'project')?.id ?? connectors[0]?.id
  return { provider, ...(connector === undefined ? {} : { connector }) }
}
