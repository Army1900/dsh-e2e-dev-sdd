import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-apiproxy'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { SddProjectService } from './project-service.ts'
import { makeSddRoute } from './routes.ts'
import { SddSourceRegistry } from './extensions.ts'
import { CommandSourceProvider } from './providers/command-source.ts'
import { ManualSourceProvider } from './providers/manual-source.ts'
import { StageSessionController } from './session-controller.ts'
import { GitDevelopmentService, ProjectGitService } from './git-service.ts'
import type {} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type {} from '@deepseek-ai/dsh-tools'
import { fileURLToPath } from 'node:url'
import { ConnectorCatalog } from './connector-catalog.ts'

export const name = 'dsh-e2e-dev-sdd'
const connectorCatalog = new ConnectorCatalog(fileURLToPath(new URL('../business/', import.meta.url)))
export function apply(ctx: Context): void {
  ctx.plugin(SddSourceRegistry)
  ctx.plugin(installBuiltins)
  ctx.plugin(installHostApi)
}

installBuiltins.inject = ['dshSddSources']
function installBuiltins(ctx: Context): void {
  ctx.dshSddSources.register(new ManualSourceProvider())
  ctx.dshSddSources.register(new CommandSourceProvider(connectorCatalog))
}

installHostApi.inject = ['apiProxy', 'webServer', 'agents', 'systemPrompt', 'tools', 'dshSddSources']
function installHostApi(ctx: Context): void {
  const git = new GitDevelopmentService()
  const sessions = new StageSessionController(ctx, async evidence => { await git.recordAiTest(evidence.projectPath, evidence.artifactUid, evidence.repositoryId, evidence) })
  const service = new SddProjectService(ctx.apiProxy, ctx.dshSddSources, sessions, git, new ProjectGitService(), connectorCatalog)
  ctx.effect(() => ctx.webServer.register(makeSddRoute(service)), 'dsh-sdd: host api')
}

export * from './extensions.ts'
export * from './protocol.ts'
