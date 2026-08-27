import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-apiproxy'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { SddProjectService } from './project-service.ts'
import { makeSddRoute } from './routes.ts'
import { SddSourceRegistry } from './extensions.ts'
import { CommandSourceProvider } from './providers/command-source.ts'
import { ManualSourceProvider } from './providers/manual-source.ts'
import { StageSessionController } from './session-controller.ts'
import type {} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type {} from '@deepseek-ai/dsh-tools'

export const name = 'dsh-e2e-dev-sdd'
export function apply(ctx: Context): void {
  ctx.plugin(SddSourceRegistry)
  ctx.plugin(installBuiltins)
  ctx.plugin(installHostApi)
}

installBuiltins.inject = ['dshSddSources']
function installBuiltins(ctx: Context): void {
  ctx.dshSddSources.register(new ManualSourceProvider())
  ctx.dshSddSources.register(new CommandSourceProvider())
}

installHostApi.inject = ['apiProxy', 'webServer', 'agents', 'systemPrompt', 'tools', 'dshSddSources']
function installHostApi(ctx: Context): void {
  const sessions = new StageSessionController(ctx)
  const service = new SddProjectService(ctx.apiProxy, ctx.dshSddSources, sessions)
  ctx.effect(() => ctx.webServer.register(makeSddRoute(service)), 'dsh-sdd: host api')
}

export * from './extensions.ts'
export * from './protocol.ts'
