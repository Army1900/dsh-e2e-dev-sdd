import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { parse } from 'yaml'
import { ConnectorCatalog, type ConnectorDescriptor } from '../connector-catalog.ts'
import type { SddSourceProvider, SourceGetRequest } from '../extensions.ts'
import { validateSourceBundle } from '../extensions.ts'
import type { SourceBundle } from '../protocol.ts'

const CONNECTOR_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const DEFAULT_TIMEOUT_MS = 30_000
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024

interface CommandConnectorConfig {
  schema: 'dsh-sdd/connector@1'
  id: string
  type: 'command'
  command: string[]
  timeoutMs?: number
  environment?: string[]
}

function parseConfig(value: unknown, expectedId: string): CommandConnectorConfig {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('connector config must be an object')
  const config = value as Partial<CommandConnectorConfig>
  if (config.schema !== 'dsh-sdd/connector@1') throw new Error('connector.schema must be dsh-sdd/connector@1')
  if (config.id !== expectedId) throw new Error(`connector.id must equal ${expectedId}`)
  if (config.type !== 'command') throw new Error('connector.type must be command')
  if (!Array.isArray(config.command) || config.command.length === 0
    || config.command.some(argument => typeof argument !== 'string' || argument === '')) {
    throw new Error('connector.command must be a non-empty argv string array')
  }
  if (config.timeoutMs !== undefined && (!Number.isInteger(config.timeoutMs) || config.timeoutMs < 100 || config.timeoutMs > 300_000)) {
    throw new Error('connector.timeoutMs must be an integer between 100 and 300000')
  }
  if (config.environment !== undefined && (!Array.isArray(config.environment)
    || config.environment.some(name => typeof name !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)))) {
    throw new Error('connector.environment must contain environment variable names')
  }
  return config as CommandConnectorConfig
}

function childEnvironment(names: readonly string[]): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {}
  for (const platformName of ['PATH', 'Path', 'SystemRoot', 'ComSpec', 'PATHEXT']) {
    if (process.env[platformName] !== undefined) environment[platformName] = process.env[platformName]
  }
  for (const name of names) {
    const value = process.env[name]
    if (value !== undefined) environment[name] = value
  }
  return environment
}

function inside(root: string, candidate: string): boolean {
  const path = relative(root, candidate)
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path))
}

function commandArguments(config: CommandConnectorConfig, connector: ConnectorDescriptor, request: SourceGetRequest): string[] {
  const workspaceRoot = resolve(request.workspace.path)
  const adapterRoot = resolve(connector.adapterRoot)
  return config.command.map((argument, index) => {
    const normalized = argument.replaceAll('\\', '/')
    const logicalPrefix = '.sdd/business/adapters/'
    const logicalPath = normalized.startsWith('./') ? normalized.slice(2) : normalized
    if (logicalPath.startsWith(logicalPrefix)) {
      const candidate = resolve(adapterRoot, logicalPath.slice(logicalPrefix.length))
      if (!inside(adapterRoot, candidate)) throw new Error(`connector adapter path escapes its adapter directory: ${argument}`)
      return candidate
    }
    if (!isAbsolute(argument) && !argument.startsWith('.') && !argument.includes('/') && !argument.includes('\\')) return argument
    const candidate = resolve(workspaceRoot, argument)
    if (inside(workspaceRoot, candidate) && !inside(adapterRoot, candidate)) {
      throw new Error(`connector project file must be under its business/adapters directory: ${argument}`)
    }
    if (isAbsolute(argument) && index > 0 && inside(adapterRoot, argument)) return argument
    return argument
  })
}

async function execute(config: CommandConnectorConfig, connector: ConnectorDescriptor, request: SourceGetRequest): Promise<unknown> {
  const [file, ...args] = commandArguments(config, connector, request)
  const timeout = AbortSignal.timeout(config.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  const signal = AbortSignal.any([request.signal, timeout])
  return await new Promise((resolve, reject) => {
    const child = spawn(file!, args, {
      cwd: request.workspace.path,
      env: childEnvironment(config.environment ?? []),
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
      signal,
    })
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    let stdoutSize = 0
    let stderrSize = 0
    child.stdout.on('data', (chunk: Buffer) => {
      stdoutSize += chunk.length
      if (stdoutSize > MAX_OUTPUT_BYTES) child.kill()
      else stdout.push(chunk)
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderrSize += chunk.length
      if (stderrSize <= 64 * 1024) stderr.push(chunk)
    })
    child.once('error', reject)
    child.once('close', (code, childSignal) => {
      if (stdoutSize > MAX_OUTPUT_BYTES) return reject(new Error('connector stdout exceeded 2 MiB'))
      if (code !== 0) {
        const detail = Buffer.concat(stderr).toString('utf8').trim()
        return reject(new Error(`connector exited with ${code ?? childSignal ?? 'unknown'}${detail === '' ? '' : `: ${detail}`}`))
      }
      try { resolve(JSON.parse(Buffer.concat(stdout).toString('utf8'))) }
      catch (error) { reject(new Error(`connector returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`)) }
    })
    child.stdin.end(JSON.stringify({ operation: 'get', kind: request.kind, key: request.key }))
  })
}

/** Built-in adapter for plugin-installed and project-owned CLI scripts. It never invokes a shell. */
export class CommandSourceProvider implements SddSourceProvider {
  readonly name = 'command'
  readonly kinds = ['*'] as const

  constructor(private readonly connectors = new ConnectorCatalog(resolve(process.cwd(), 'business'))) {}

  async get(request: SourceGetRequest): Promise<SourceBundle> {
    const connectorId = request.connector
    if (connectorId === undefined || !CONNECTOR_ID.test(connectorId)) {
      throw new Error('command source provider needs a kebab-case connector id')
    }
    const connector = await this.connectors.resolve(request.workspace.path, connectorId)
    const config = parseConfig(parse(await readFile(connector.configPath, 'utf8')), connectorId)
    const source = validateSourceBundle(await execute(config, connector, request))
    if (source.provider !== connectorId && source.provider !== this.name) {
      throw new Error(`source.provider must be "${connectorId}" or "command"`)
    }
    if (source.kind !== request.kind) throw new Error(`source.kind must equal requested kind "${request.kind}"`)
    return {
      ...source,
      provider: connectorId,
      ...(source.root === undefined ? {} : { root: { ...source.root, provider: connectorId } }),
      items: source.items.map(item => ({ ...item, provider: connectorId })),
    }
  }
}
