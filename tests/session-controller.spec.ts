import { Context, Service } from '@deepseek-ai/cordis'
import { renderPrompt } from '@deepseek-ai/dsh-system-prompt'
import { describe, expect, it } from 'vitest'
import { StageSessionController } from '../src/session-controller.ts'

class FakePrompt extends Service {
  sections: Array<{ text: string }> = []
  constructor(ctx: Context) { super(ctx, 'systemPrompt') }
  section(value: { text: string }): () => void { this.sections.push(value); return this.ctx.effect(() => () => { this.sections.splice(this.sections.indexOf(value), 1) }) }
}

class FakeTools extends Service {
  guards: Array<(execution: any) => string | undefined> = []
  constructor(ctx: Context) { super(ctx, 'tools') }
  guard(value: (execution: any) => string | undefined): () => void { this.guards.push(value); return this.ctx.effect(() => () => { this.guards.splice(this.guards.indexOf(value), 1) }) }
}

class FakeAgents extends Service {
  agent?: { id: string; ctx: Context }
  constructor(ctx: Context) { super(ctx, 'agents') }
  get(id: string) { return this.agent?.id === id ? this.agent : undefined }
}

describe('StageSessionController', () => {
  it('installs a scoped stage prompt and enforces write and shell policy', async () => {
    const ctx = new Context(); const prompts = new FakePrompt(ctx); const tools = new FakeTools(ctx); const agents = new FakeAgents(ctx)
    agents.agent = { id: 's1', ctx }
    const controller = new StageSessionController(ctx)
    controller.bind({ sessionId: 's1', stage: 'requirements', systemPrompt: 'BOUND {{project}}', projectPath: '/project', artifactDirectory: '/project/.sdd/artifacts/requirements/a1', developmentDirectories: [], artifactTemplate: '# {{artifactKey}} Requirements template' })
    expect(prompts.sections[0]?.text).toContain('BOUND')
    expect(prompts.sections[0]?.text).not.toContain('{{')
    expect(() => renderPrompt({ sections: [{ name: 'sdd:stage-runtime', text: prompts.sections[0]!.text }], contexts: [], tools: [], variables: {} })).not.toThrow()
    const guard = tools.guards[0]!
    expect(guard({ name: 'bash', arguments: {}, agent: agents.agent })).toContain('禁止')
    expect(guard({ name: 'pwsh', arguments: {}, agent: agents.agent })).toContain('禁止')
    expect(guard({ name: 'write', arguments: { file_path: '.sdd/artifacts/requirements/a1/deliverable.md' }, agent: agents.agent })).toBeUndefined()
    expect(guard({ name: 'write', arguments: { file_path: '.sdd/artifacts/requirements/a1/.template/deliverable.md' }, agent: agents.agent })).toContain('快照不可修改')
    expect(guard({ name: 'write', arguments: { file_path: 'src/app.ts' }, agent: agents.agent })).toContain('只能修改')
    controller.bind({ sessionId: 's1', stage: 'development', systemPrompt: 'DEV', projectPath: '/project', artifactDirectory: '/project/.sdd/artifacts/development/d1', developmentDirectories: ['/project/.sdd-workspaces/DEV-1/app'], artifactTemplate: '# Development template' })
    const developmentGuard = tools.guards[0]!
    expect(developmentGuard({ name: 'bash', arguments: { command: 'pnpm test' }, agent: agents.agent })).toContain('workdir')
    expect(developmentGuard({ name: 'bash', arguments: { command: 'pnpm test', workdir: '.sdd-workspaces/DEV-1/app' }, agent: agents.agent })).toBeUndefined()
    expect(developmentGuard({ name: 'bash', arguments: { command: 'git commit -am done', workdir: '.sdd-workspaces/DEV-1/app' }, agent: agents.agent })).toContain('显式用户操作')
    expect(developmentGuard({ name: 'pwsh', arguments: { command: 'pnpm test', workdir: '.sdd-workspaces/DEV-1/app' }, agent: agents.agent })).toBeUndefined()
    expect(developmentGuard({ name: 'pwsh', arguments: { command: 'git push', workdir: '.sdd-workspaces/DEV-1/app' }, agent: agents.agent })).toContain('显式用户操作')
    expect(developmentGuard({ name: 'str_replace_editor', arguments: { command: 'str_replace', path: '/project/src/app.ts' }, agent: agents.agent })).toContain('只能修改')
  })

  it('preloads a persisted binding before a cold agent resumes', () => {
    const ctx = new Context(); const prompts = new FakePrompt(ctx); new FakeTools(ctx); const agents = new FakeAgents(ctx)
    const controller = new StageSessionController(ctx)
    controller.bind({ sessionId: 'cold', stage: 'architecture', systemPrompt: 'RESTORED', projectPath: '/project', artifactDirectory: '/project/.sdd/artifacts/architecture/a1', developmentDirectories: [], artifactTemplate: '# Architecture template' })
    expect(prompts.sections).toHaveLength(0)
    agents.agent = { id: 'cold', ctx }
    ctx.emit('agent/created', { agent: agents.agent as never })
    expect(prompts.sections[0]?.text).toContain('RESTORED')
  })
})
