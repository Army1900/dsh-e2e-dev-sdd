import type { ClientContext, ISessions, IWorkspaces, WorkspaceId } from '@deepseek-ai/dsh-client-runtime/client'
import { STAGES, type ArtifactSummary, type ProjectSnapshot, type SddAction, type SddResponse, type SourceSummary, type StageId, type StageRun } from '../protocol.ts'

export const name = 'dsh-e2e-dev-sdd-client'
export const inject = ['workspaces', 'sessions']

const API_PATH = '/api/dsh-e2e-dev-sdd'
const ACTIVE_ATTR = 'data-dsh-sdd-active'
type MenuId = 'dashboard' | StageId
const MENUS: Array<{ id: MenuId; label: string }> = [{ id: 'dashboard', label: '项目看板' }, ...STAGES]

const CSS = `
[data-dsh-sdd-view]{position:absolute;inset:0;display:none;z-index:70;overflow:auto;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#171717);font-family:var(--dsw-font-family,system-ui)}
html[${ACTIVE_ATTR}] [data-dsh-sdd-view]{display:block}html[${ACTIVE_ATTR}] [data-pane='conversation']>:not([data-dsh-sdd-view]),html[${ACTIVE_ATTR}] [class*='centerCol']>:not([data-dsh-sdd-view]){display:none!important}
.dsh-sdd-menu{box-sizing:border-box;display:flex;align-items:center;gap:8px;width:100%;height:36px;padding:0 10px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary,#666);cursor:pointer;font-size:13px;white-space:nowrap}.dsh-sdd-menu:hover,.dsh-sdd-menu[data-active]{background:var(--dsw-alias-interactive-bg-hover,#eee);color:var(--dsw-alias-label-primary,#111)}.dsh-sdd-menu[data-active]{font-weight:600}.dsh-sdd-menu svg{width:18px;height:18px;flex:none}.dsh-sdd-menu span{overflow:hidden;text-overflow:ellipsis}[data-dsh-frame][data-sidebar-collapsed] .dsh-sdd-menu{justify-content:center;width:36px;margin:0 auto 8px;padding:0;border-radius:50%}[data-dsh-frame][data-sidebar-collapsed] .dsh-sdd-menu span{display:none}
.dsh-sdd-page{box-sizing:border-box;min-height:100%;padding:20px;max-width:1220px;margin:0 auto}.dsh-sdd-header{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px}.dsh-sdd-header h1{font-size:22px;margin:0;margin-right:auto}.dsh-sdd-select,.dsh-sdd-input{box-sizing:border-box;padding:8px 10px;border:1px solid var(--dsw-alias-border-l2,#ccc);border-radius:8px;background:var(--dsw-specific-input-major,#fff);color:inherit}.dsh-sdd-button{padding:8px 12px;border:1px solid var(--dsw-alias-border-l2,#ccc);border-radius:8px;background:var(--dsw-alias-bg-layer-2,#f5f5f5);color:inherit;cursor:pointer}.dsh-sdd-button:hover{filter:brightness(.97)}.dsh-sdd-button.primary{background:var(--dsw-alias-button-primary-fill,#3b63f3);border-color:transparent;color:var(--dsw-alias-label-primary-foreground,#fff)}.dsh-sdd-button:disabled{opacity:.5;cursor:not-allowed}
.dsh-sdd-grid{display:grid;grid-template-columns:minmax(280px,.8fr) minmax(380px,1.2fr);gap:14px}@media(max-width:850px){.dsh-sdd-grid{grid-template-columns:1fr}}.dsh-sdd-card{border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:12px;background:var(--dsw-alias-bg-layer-2,#fafafa);padding:14px}.dsh-sdd-card h2{font-size:15px;margin:0 0 10px}.dsh-sdd-muted{font-size:12px;color:var(--dsw-alias-label-secondary,#666)}.dsh-sdd-list{display:flex;flex-direction:column;gap:8px}.dsh-sdd-row{display:grid;grid-template-columns:auto 1fr auto;align-items:start;gap:9px;padding:10px;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:9px;background:var(--dsw-alias-bg-base,#fff)}.dsh-sdd-row strong{display:block;font-size:13px}.dsh-sdd-badge{display:inline-block;font-size:11px;padding:2px 6px;border-radius:999px;background:var(--dsw-alias-interactive-bg-hover,#eee);margin:0 0 4px 4px}.dsh-sdd-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.dsh-sdd-error{padding:9px;border-radius:8px;background:#c5303018;color:#c53030;font-size:12px}.dsh-sdd-empty{padding:18px;text-align:center;color:var(--dsw-alias-label-secondary,#666)}
.dsh-sdd-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:14px}.dsh-sdd-stat{border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:12px;padding:14px;background:var(--dsw-alias-bg-layer-2,#fafafa)}.dsh-sdd-stat b{display:block;font-size:25px;margin-top:5px}.dsh-sdd-progress{height:8px;background:var(--dsw-alias-interactive-bg-hover,#e5e5e5);border-radius:999px;overflow:hidden;margin-top:7px}.dsh-sdd-progress span{display:block;height:100%;background:var(--dsw-alias-brand-primary,#3b63f3)}.dsh-sdd-stage-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}.dsh-sdd-checks{margin:7px 0 0;padding-left:17px;font-size:12px}.dsh-sdd-checks li[data-fail]{color:#c53030}.dsh-sdd-checks li[data-pass]{color:#238636}.dsh-sdd-wide{grid-column:1/-1}
`

interface RuntimeState {
  menu: MenuId
  workspaceId?: string
  snapshot?: ProjectSnapshot
  selected: Set<string>
  targetArtifactUid?: string
  loading: boolean
  error?: string
}

async function call(action: SddAction): Promise<SddResponse> {
  const response = await fetch(API_PATH, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(action) })
  return await response.json() as SddResponse
}

function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!) }
function sidebarRoot(): HTMLElement | undefined { const column = document.querySelector<HTMLElement>('[data-pane="sidebar"], [class*="sidebarCol"]'); return column?.querySelector<HTMLElement>('[class*="logoRow"]')?.parentElement ?? column?.firstElementChild as HTMLElement | undefined }
function menuAnchor(root: HTMLElement): Element | undefined { const button = root.querySelector<HTMLButtonElement>('button[class*="newSession"]'); const row = button?.closest('[class*="logoRow"]'); return (row !== null && row?.parentElement === root ? row : button) ?? undefined }
function icon(index: number): string { return `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="3" width="14" height="14" rx="3"/><path d="M6 10h8M10 6v8" opacity="${index === 0 ? '.2' : index === 5 ? '1' : '.45'}"/></svg>` }

class SddWorkbench {
  private readonly state: RuntimeState = { menu: 'dashboard', selected: new Set(), loading: false }
  private container?: HTMLDivElement
  private menuButtons = new Map<MenuId, HTMLButtonElement>()
  private waitObserver?: MutationObserver
  private workspaceUnsubscribe?: () => void
  private readonly trackedRuns = new Map<string, () => void>()

  constructor(private readonly workspaces: IWorkspaces, private readonly sessions: ISessions) {}

  start(): () => void {
    const style = document.createElement('style'); style.dataset.dshSddStyle = ''; style.textContent = CSS; document.head.appendChild(style)
    this.ensureMounted(); this.waitObserver = new MutationObserver(() => this.ensureMounted()); this.waitObserver.observe(document.body, { childList: true, subtree: true })
    this.workspaceUnsubscribe = this.workspaces.list.subscribe(() => { if (this.state.workspaceId === undefined) this.chooseDefaultWorkspace(); this.render() })
    this.chooseDefaultWorkspace()
    return () => { this.waitObserver?.disconnect(); this.workspaceUnsubscribe?.(); this.trackedRuns.forEach(dispose => dispose()); this.trackedRuns.clear(); this.menuButtons.forEach(button => button.remove()); this.menuButtons.clear(); this.container?.remove(); style.remove(); document.documentElement.removeAttribute(ACTIVE_ATTR) }
  }

  private chooseDefaultWorkspace(): void {
    const snapshot = this.workspaces.list.getSnapshot()
    if (this.state.workspaceId !== undefined && snapshot.items.some(item => item.workspaceId === this.state.workspaceId)) return
    const current = snapshot.items.find(item => item.sessionIds.includes(this.sessions.list.getSnapshot().current as never))
    this.state.workspaceId = (current?.workspaceId ?? snapshot.recentWorkspaceId ?? snapshot.items[0]?.workspaceId) as string | undefined
  }

  private ensureMounted(): void {
    this.mountMenus()
    if (this.container !== undefined && this.container.isConnected) return
    const column = document.querySelector<HTMLElement>('[data-pane="conversation"], [class*="centerCol"]'); if (column === null) return
    this.container = document.createElement('div'); this.container.dataset.dshSddView = ''; this.container.dataset.dshPlugin = 'e2e-dev-sdd'; column.appendChild(this.container); this.render()
  }

  private mountMenus(): void {
    const root = sidebarRoot(); if (root === undefined) return
    const anchor = menuAnchor(root); if (anchor === undefined) return
    let insertBefore = anchor.nextElementSibling
    MENUS.forEach((menu, index) => {
      let button = this.menuButtons.get(menu.id)
      if (button === undefined) { button = document.createElement('button'); button.type = 'button'; button.className = 'dsh-sdd-menu'; button.dataset.dshSddMenu = menu.id; button.title = menu.label; button.innerHTML = `${icon(index)}<span>${menu.label}</span>`; button.addEventListener('click', () => this.open(menu.id)); this.menuButtons.set(menu.id, button) }
      if (button.parentElement !== root) root.insertBefore(button, insertBefore); insertBefore = button.nextElementSibling
    })
  }

  private open(menu: MenuId): void { this.state.menu = menu; this.state.selected.clear(); this.state.targetArtifactUid = undefined; document.documentElement.setAttribute(ACTIVE_ATTR, ''); this.syncMenus(); void this.refresh() }
  private close(): void { document.documentElement.removeAttribute(ACTIVE_ATTR); this.menuButtons.forEach(button => delete button.dataset.active) }
  private syncMenus(): void { this.menuButtons.forEach((button, id) => { if (document.documentElement.hasAttribute(ACTIVE_ATTR) && id === this.state.menu) button.dataset.active = 'true'; else delete button.dataset.active }) }

  private async refresh(): Promise<void> {
    if (this.state.workspaceId === undefined) return this.render()
    this.state.loading = true; this.state.error = undefined; this.render()
    try { const response = await call({ kind: 'snapshot', workspaceId: this.state.workspaceId }); if (!response.ok) throw new Error(response.error); if (!('snapshot' in response)) throw new Error('Host returned an unexpected response'); this.state.snapshot = response.snapshot }
    catch (error) { this.state.error = error instanceof Error ? error.message : String(error) }
    finally { this.state.loading = false; this.render() }
  }

  private render(): void {
    if (this.container === undefined) return
    const workspaceState = this.workspaces.list.getSnapshot(); const options = workspaceState.items.map(item => `<option value="${escapeHtml(item.workspaceId as string)}"${item.workspaceId === this.state.workspaceId ? ' selected' : ''}>${escapeHtml(item.title || item.path)}</option>`).join('')
    const title = this.state.menu === 'dashboard' ? '项目看板' : STAGES.find(item => item.id === this.state.menu)!.label
    if (this.state.workspaceId === undefined) { this.container.innerHTML = '<div class="dsh-sdd-page"><div class="dsh-sdd-empty">请先在 DSH 中打开一个 Workspace。</div></div>'; return }
    const snapshot = this.state.snapshot
    let body = ''
    if (this.state.loading) body = '<div class="dsh-sdd-empty">正在读取 SDD 项目…</div>'
    else if (snapshot?.configuration.status === 'missing') body = this.initializationHtml()
    else if (snapshot?.configuration.status === 'invalid') body = this.invalidConfigurationHtml(snapshot)
    else if (snapshot !== undefined) body = this.state.menu === 'dashboard' ? this.dashboardHtml(snapshot) : this.workbenchHtml(snapshot, this.state.menu)
    this.container.innerHTML = `<div class="dsh-sdd-page"><header class="dsh-sdd-header"><button class="dsh-sdd-button" data-action="close">返回对话</button><h1>${title}</h1><select class="dsh-sdd-select" data-action="workspace">${options}</select><button class="dsh-sdd-button" data-action="refresh">刷新</button></header>${this.state.error ? `<div class="dsh-sdd-error">${escapeHtml(this.state.error)}</div>` : ''}${body}</div>`
    this.bind()
  }

  private initializationHtml(): string { return '<section class="dsh-sdd-card"><h2>初始化 SDD 项目</h2><p>当前目录还不是有效的 SDD 项目。初始化会创建 <code>.sdd/project.yaml</code>、五阶段交付件目录、来源、运行、开发和事件目录，并更新 <code>.gitignore</code>。</p><p class="dsh-sdd-muted">已有业务代码和其他文件不会被修改。</p><button class="dsh-sdd-button primary" data-action="initialize">初始化项目</button></section>' }

  private invalidConfigurationHtml(snapshot: ProjectSnapshot): string {
    return `<section class="dsh-sdd-card"><h2>SDD 项目配置不合法</h2><p>检测到 <code>${escapeHtml(snapshot.configuration.path)}</code>，但当前配置不能安全运行。请修复下列问题，或备份旧配置后重新生成默认配置。</p><ul class="dsh-sdd-checks">${snapshot.configuration.errors.map(error => `<li data-fail>${escapeHtml(error)}</li>`).join('')}</ul><div class="dsh-sdd-actions"><button class="dsh-sdd-button" data-action="refresh">重新检查</button><button class="dsh-sdd-button primary" data-action="reinitialize">备份并重新初始化</button></div></section>`
  }

  private dashboardHtml(snapshot: ProjectSnapshot): string {
    const dashboard = snapshot.dashboard
    const stat = (label: string, value: string, note: string) => `<div class="dsh-sdd-stat"><span class="dsh-sdd-muted">${label}</span><b>${value}</b><span class="dsh-sdd-muted">${note}</span></div>`
    const workload = dashboard.workload.length === 0 ? stat('工作量', '未配置', '由 Source Provider 提供估算') : dashboard.workload.map(item => stat(`工作量 · ${escapeHtml(item.unit)}`, String(item.total), `已完成 ${item.completed}`)).join('')
    return `<div class="dsh-sdd-stats">${stat('总体完成度', `${dashboard.overallCompletion}%`, '五阶段质量门禁平均值')}${stat('需求', String(dashboard.requirements.total), `已追踪 ${dashboard.requirements.traced}`)}${stat('缺陷', String(dashboard.defects.total), `待处理 ${dashboard.defects.open} · 已解决 ${dashboard.defects.resolved}`)}${stat('交付件', String(dashboard.artifacts.total), `草稿 ${dashboard.artifacts.drafts} · 已接受 ${dashboard.artifacts.accepted}`)}${stat('代码空间', String(dashboard.development.workspaces), `变更文件 ${dashboard.development.changedFiles}`)}${stat('测试', String(dashboard.development.passingTests + dashboard.development.failingTests), `通过 ${dashboard.development.passingTests} · 失败 ${dashboard.development.failingTests}`)}${workload}</div>
      <section class="dsh-sdd-card"><h2>阶段进度</h2><div class="dsh-sdd-stage-grid">${dashboard.stages.map(item => { const stage = STAGES.find(value => value.id === item.stage)!; return `<div class="dsh-sdd-stat"><strong>${stage.label}</strong><span class="dsh-sdd-badge">${item.status}</span><div class="dsh-sdd-progress"><span style="width:${item.completion}%"></span></div><span class="dsh-sdd-muted">${item.completion}% · draft ${item.drafts} · accepted ${item.accepted}</span></div>` }).join('')}</div></section>
      <div class="dsh-sdd-grid" style="margin-top:14px"><section class="dsh-sdd-card"><h2>质量与追踪</h2><p>来源追踪覆盖率：<strong>${dashboard.traceability}%</strong></p>${dashboard.blockers.length === 0 ? '<div class="dsh-sdd-empty">当前没有结构化阻塞项</div>' : `<ul class="dsh-sdd-checks">${dashboard.blockers.map(item => `<li data-fail>${escapeHtml(item)}</li>`).join('')}</ul>`}</section><section class="dsh-sdd-card"><h2>最近活动</h2>${dashboard.recentEvents.length === 0 ? '<div class="dsh-sdd-empty">暂无事件</div>' : `<div class="dsh-sdd-list">${dashboard.recentEvents.slice(0, 10).map(event => `<div class="dsh-sdd-row"><span></span><span><strong>${escapeHtml(event.subject)}</strong><span class="dsh-sdd-muted">${escapeHtml(event.type)} · ${escapeHtml(event.time)}</span></span></div>`).join('')}</div>`}</section></div>`
  }

  private workbenchHtml(snapshot: ProjectSnapshot, stage: StageId): string {
    const accepted = snapshot.artifacts.filter(item => item.status === 'accepted' && item.stage !== stage)
    const current = snapshot.artifacts.filter(item => item.stage === stage)
    return `<div class="dsh-sdd-grid"><section class="dsh-sdd-card"><h2>选择本次输入</h2><p class="dsh-sdd-muted">只允许已接受的上游交付件和校验有效的来源。</p><div class="dsh-sdd-list">${accepted.length === 0 && snapshot.sources.length === 0 ? '<div class="dsh-sdd-empty">暂无可用输入</div>' : accepted.map(item => this.inputRow(item)).join('') + snapshot.sources.map(item => this.sourceRow(item)).join('')}</div><div class="dsh-sdd-actions"><button class="dsh-sdd-button" data-action="import-source">导入需求/缺陷</button><button class="dsh-sdd-button primary" data-action="conversation">开始绑定对话</button></div></section><section class="dsh-sdd-card"><h2>绑定本阶段交付件</h2><p class="dsh-sdd-muted">一次对话固定绑定一个 draft 或 in-review 版本。</p><div class="dsh-sdd-list">${current.length === 0 ? '<div class="dsh-sdd-empty">尚未创建交付件</div>' : current.map(item => this.outputRow(item, snapshot)).join('')}</div><div class="dsh-sdd-actions"><button class="dsh-sdd-button" data-action="draft">创建草稿</button></div></section>${stage === 'development' ? this.developmentHtml(snapshot) : ''}</div>`
  }

  private inputRow(item: ArtifactSummary): string { return `<label class="dsh-sdd-row"><input type="checkbox" data-input="${escapeHtml(item.uid)}" ${this.state.selected.has(item.uid) ? 'checked' : ''}><span><strong>${escapeHtml(item.key)} · ${escapeHtml(item.title)}</strong><span class="dsh-sdd-muted">${escapeHtml(item.stage)} · v${escapeHtml(item.version)} · ${escapeHtml(item.relativeDirectory)}</span></span><span class="dsh-sdd-badge">accepted</span></label>` }
  private sourceRow(item: SourceSummary): string { const disabled = item.validationErrors.length > 0 ? ' disabled' : ''; const detail = item.validationErrors.length > 0 ? item.validationErrors.join('; ') : `${item.provider} · ${item.kind} · ${item.relativePath}`; return `<label class="dsh-sdd-row"><input type="checkbox" data-input="${escapeHtml(item.uid)}"${disabled} ${this.state.selected.has(item.uid) ? 'checked' : ''}><span><strong>${escapeHtml(item.externalKey ?? item.uid)} · ${escapeHtml(item.title)}</strong><span class="dsh-sdd-muted">${escapeHtml(detail)}</span></span><span class="dsh-sdd-badge">source</span></label>` }

  private outputRow(item: ArtifactSummary, snapshot: ProjectSnapshot): string {
    const report = snapshot.quality[item.uid]; const run = snapshot.runs.find(value => value.artifactUid === item.uid && value.status !== 'completed')
    const selectable = item.status === 'draft' || item.status === 'in-review'
    const checks = report === undefined ? '' : `<ul class="dsh-sdd-checks">${report.checks.filter(check => check.status !== 'passed').slice(0, 6).map(check => `<li data-fail>${escapeHtml(check.label)}：${escapeHtml(check.message)}</li>`).join('')}</ul>`
    return `<div class="dsh-sdd-row">${selectable ? `<input type="radio" name="sdd-target" data-target="${escapeHtml(item.uid)}" ${this.state.targetArtifactUid === item.uid ? 'checked' : ''}>` : '<span></span>'}<span><strong>${escapeHtml(item.key)} · ${escapeHtml(item.title)}</strong><span class="dsh-sdd-muted">v${escapeHtml(item.version)} · ${escapeHtml(item.relativeDirectory)}/${escapeHtml(item.entry)}</span>${checks}<div class="dsh-sdd-actions"><button class="dsh-sdd-button" data-quality="${escapeHtml(item.uid)}">质量检查 ${report?.score ?? 0}%</button>${run?.sessionId ? `<button class="dsh-sdd-button" data-resume="${escapeHtml(run.uid)}">恢复对话</button><button class="dsh-sdd-button" data-sync="${escapeHtml(run.uid)}">同步结论</button>` : ''}${selectable ? `<button class="dsh-sdd-button" data-accept="${escapeHtml(item.uid)}">验收</button>` : ''}${run !== undefined && item.status === 'accepted' ? `<button class="dsh-sdd-button" data-complete="${escapeHtml(run.uid)}">完成阶段运行</button>` : ''}</div></span><span><span class="dsh-sdd-badge">${escapeHtml(item.status)}</span>${run ? `<span class="dsh-sdd-badge">${escapeHtml(run.status)}</span>` : ''}</span></div>`
  }

  private developmentHtml(snapshot: ProjectSnapshot): string {
    const artifact = snapshot.artifacts.find(item => item.uid === this.state.targetArtifactUid)
    if (artifact === undefined) return '<section class="dsh-sdd-card dsh-sdd-wide"><h2>隔离开发空间</h2><div class="dsh-sdd-empty">先选择一个开发测试交付件。</div></section>'
    const workspace = snapshot.developmentWorkspaces.find(item => item.artifactUid === artifact.uid)
    const configured = snapshot.project?.development.repositories ?? []
    return `<section class="dsh-sdd-card dsh-sdd-wide"><h2>隔离开发空间 · ${escapeHtml(artifact.key)}</h2>${workspace === undefined ? `<p class="dsh-sdd-muted">可用代码仓库：${configured.map(item => item.id).join(', ') || '尚未在 project.yaml 配置 repositories'}</p><button class="dsh-sdd-button" data-action="development-create">创建 Worktree / Clone</button>` : `<div class="dsh-sdd-list">${workspace.repositories.map(repo => `<div class="dsh-sdd-row"><span></span><span><strong>${escapeHtml(repo.id)} · ${escapeHtml(repo.workingBranch)}</strong><span class="dsh-sdd-muted">${escapeHtml(repo.path)}<br>变更 ${repo.changedFiles} · ahead ${repo.ahead} · behind ${repo.behind}${repo.lastTest ? ` · 测试 ${repo.lastTest.passed ? '通过' : '失败'}` : ''}</span></span><span><button class="dsh-sdd-button" data-dev-test="${escapeHtml(repo.id)}">运行测试</button><button class="dsh-sdd-button" data-dev-commit="${escapeHtml(repo.id)}">提交代码</button></span></div>`).join('')}</div><div class="dsh-sdd-actions"><button class="dsh-sdd-button" data-action="development-create">添加仓库</button><button class="dsh-sdd-button" data-action="development-status">刷新 Git 状态</button></div>`}</section>`
  }

  private bind(): void {
    const root = this.container!
    root.querySelector<HTMLElement>('[data-action="close"]')?.addEventListener('click', () => this.close()); root.querySelectorAll<HTMLElement>('[data-action="refresh"]').forEach(button => button.addEventListener('click', () => { void this.refresh() }))
    root.querySelector<HTMLSelectElement>('[data-action="workspace"]')?.addEventListener('change', event => { this.state.workspaceId = (event.currentTarget as HTMLSelectElement).value; this.state.selected.clear(); this.state.targetArtifactUid = undefined; void this.refresh() })
    root.querySelector<HTMLElement>('[data-action="initialize"]')?.addEventListener('click', () => { void this.mutate({ kind: 'initialize', workspaceId: this.state.workspaceId! }) }); root.querySelector<HTMLElement>('[data-action="draft"]')?.addEventListener('click', () => { void this.createDraft() }); root.querySelector<HTMLElement>('[data-action="import-source"]')?.addEventListener('click', () => { void this.importSource() }); root.querySelector<HTMLElement>('[data-action="conversation"]')?.addEventListener('click', () => { void this.startConversation() })
    root.querySelector<HTMLElement>('[data-action="reinitialize"]')?.addEventListener('click', () => { if (window.confirm('现有 project.yaml 将先备份，再生成默认配置。是否继续？')) void this.mutate({ kind: 'reinitialize', workspaceId: this.state.workspaceId! }) })
    root.querySelectorAll<HTMLInputElement>('[data-input]').forEach(input => input.addEventListener('change', () => { const uid = input.dataset.input!; if (input.checked) this.state.selected.add(uid); else this.state.selected.delete(uid) }))
    root.querySelectorAll<HTMLInputElement>('[data-target]').forEach(input => input.addEventListener('change', () => { this.state.targetArtifactUid = input.dataset.target; const artifact = this.state.snapshot?.artifacts.find(item => item.uid === input.dataset.target); this.state.selected = new Set([...(artifact?.basedOn.map(item => item.uid) ?? []), ...(artifact?.derivedFrom.map(item => item.uid) ?? [])]); this.render() }))
    root.querySelectorAll<HTMLButtonElement>('[data-quality]').forEach(button => button.addEventListener('click', () => { void this.mutate({ kind: 'quality', workspaceId: this.state.workspaceId!, artifactUid: button.dataset.quality! }) }))
    root.querySelectorAll<HTMLButtonElement>('[data-accept]').forEach(button => button.addEventListener('click', () => { void this.accept(button.dataset.accept!) }))
    root.querySelectorAll<HTMLButtonElement>('[data-resume]').forEach(button => button.addEventListener('click', () => { void this.resumeRun(button.dataset.resume!, false) }))
    root.querySelectorAll<HTMLButtonElement>('[data-sync]').forEach(button => button.addEventListener('click', () => { void this.resumeRun(button.dataset.sync!, true) }))
    root.querySelectorAll<HTMLButtonElement>('[data-complete]').forEach(button => button.addEventListener('click', () => { void this.mutate({ kind: 'complete-run', workspaceId: this.state.workspaceId!, runUid: button.dataset.complete! }) }))
    root.querySelector<HTMLElement>('[data-action="development-create"]')?.addEventListener('click', () => { void this.createDevelopment() }); root.querySelector<HTMLElement>('[data-action="development-status"]')?.addEventListener('click', () => { if (this.state.targetArtifactUid) void this.mutate({ kind: 'development-status', workspaceId: this.state.workspaceId!, artifactUid: this.state.targetArtifactUid }) })
    root.querySelectorAll<HTMLButtonElement>('[data-dev-test]').forEach(button => button.addEventListener('click', () => { void this.runTest(button.dataset.devTest!) })); root.querySelectorAll<HTMLButtonElement>('[data-dev-commit]').forEach(button => button.addEventListener('click', () => { void this.commit(button.dataset.devCommit!) }))
  }

  private async mutate(action: SddAction): Promise<void> { this.state.loading = true; this.state.error = undefined; this.render(); try { const response = await call(action); if (!response.ok) throw new Error(response.error); if ('snapshot' in response) this.state.snapshot = response.snapshot } catch (error) { this.state.error = error instanceof Error ? error.message : String(error) } finally { this.state.loading = false; this.render() } }

  private async createDraft(): Promise<void> { if (this.state.menu === 'dashboard') return; const title = window.prompt('交付件标题')?.trim(); if (!title) return; const key = window.prompt('项目编号（留空则自动生成）')?.trim() || undefined; const artifacts = this.state.snapshot?.artifacts ?? []; const sources = this.state.snapshot?.sources ?? []; await this.mutate({ kind: 'create-draft', workspaceId: this.state.workspaceId!, stage: this.state.menu, title, key, basedOn: [...this.state.selected].filter(uid => artifacts.some(item => item.uid === uid)), sourceUids: [...this.state.selected].filter(uid => sources.some(item => item.uid === uid)) }) }

  private async importSource(): Promise<void> { const providers = this.state.snapshot?.sourceProviders ?? []; if (providers.length === 0) { this.state.error = '当前没有可用的 Source Provider'; return this.render() } const sourceKind = window.prompt('来源类型', this.state.menu === 'development' ? 'defect' : 'requirement')?.trim(); if (!sourceKind) return; const configured = this.state.snapshot?.project?.sources[sourceKind]; const provider = window.prompt(`Source Provider（可用：${providers.join(', ')}）`, configured?.provider ?? providers[0])?.trim(); if (!provider) return; if (!providers.includes(provider)) { this.state.error = `Source Provider 未注册：${provider}`; return this.render() } const connector = provider === 'command' ? window.prompt('Connector ID（对应 .sdd/business/connectors/<id>.yaml）', configured?.connector)?.trim() : configured?.connector; if (provider === 'command' && !connector) return; const key = window.prompt('外部需求或缺陷编号')?.trim(); if (!key) return; await this.mutate({ kind: 'import-source', workspaceId: this.state.workspaceId!, provider, sourceKind, key, ...(connector ? { connector } : {}) }) }

  private selectedInputs(): { artifacts: string[]; sources: string[] } { const artifacts = this.state.snapshot?.artifacts ?? []; const sources = this.state.snapshot?.sources ?? []; return { artifacts: [...this.state.selected].filter(uid => artifacts.some(item => item.uid === uid)), sources: [...this.state.selected].filter(uid => sources.some(item => item.uid === uid)) } }

  private async startConversation(): Promise<void> {
    if (this.state.menu === 'dashboard' || this.state.targetArtifactUid === undefined) { this.state.error = '请先选择一个本阶段 draft 或 in-review 交付件'; return this.render() }
    const existing = this.state.snapshot?.runs.find(item => item.artifactUid === this.state.targetArtifactUid && item.status !== 'completed')
    if (existing !== undefined) return this.resumeRun(existing.uid, false)
    this.state.loading = true; this.state.error = undefined; this.render()
    try {
      const sessionId = await this.workspaces.connectWorkspace(this.state.workspaceId as WorkspaceId); const inputs = this.selectedInputs()
      const response = await call({ kind: 'bind-session', workspaceId: this.state.workspaceId!, stage: this.state.menu, artifactUid: this.state.targetArtifactUid, sessionId: sessionId as string, artifactUids: inputs.artifacts, sourceUids: inputs.sources })
      if (!response.ok) throw new Error(response.error); if (!('prompt' in response)) throw new Error('Host returned an unexpected response')
      const binding = this.sessions.binding(sessionId); if (binding === undefined) throw new Error('新会话尚未在客户端就绪')
      if (response.run !== undefined) this.trackRun(binding.session, response.run, this.state.workspaceId!)
      const accepted = await binding.session.prompt([{ type: 'text', text: response.prompt }], 'queue'); if (!accepted.ok) throw new Error(`${accepted.error.code}: ${accepted.error.message}`)
      const artifact = this.state.snapshot?.artifacts.find(item => item.uid === this.state.targetArtifactUid); if (artifact) void binding.session.rename(`[SDD] ${artifact.key} ${artifact.title}`)
      this.sessions.open(sessionId); this.close()
    } catch (error) { this.state.error = error instanceof Error ? error.message : String(error) }
    finally { this.state.loading = false; this.render() }
  }

  private async resumeRun(runUid: string, synchronize: boolean): Promise<void> {
    const run = this.state.snapshot?.runs.find(item => item.uid === runUid); if (run?.sessionId === undefined) return
    this.state.loading = true; this.state.error = undefined; this.render()
    try {
      const binding = this.sessions.binding(run.sessionId as never); if (binding === undefined) throw new Error('绑定会话不在当前 DSH 会话列表中')
      const response = await call({ kind: 'bind-session', workspaceId: this.state.workspaceId!, runUid: run.uid, stage: run.stage, artifactUid: run.artifactUid, sessionId: run.sessionId, artifactUids: run.inputArtifactUids, sourceUids: run.sourceUids })
      if (!response.ok) throw new Error(response.error); if (!('prompt' in response)) throw new Error('Host returned an unexpected response'); if (response.run !== undefined) this.trackRun(binding.session, response.run, this.state.workspaceId!)
      const text = synchronize ? '同步当前对话中所有已确认结论到绑定交付件。重新读取交付件，补齐遗漏，保留未确认项；完成后报告修改内容。' : '恢复当前 SDD 阶段运行。重新读取绑定交付件和当前质量状态，概括已完成内容、待决问题，并继续与我协作。'
      const completion = synchronize ? this.waitForTurn(binding.session) : undefined
      const accepted = await binding.session.prompt([{ type: 'text', text }], 'queue'); if (!accepted.ok) throw new Error(`${accepted.error.code}: ${accepted.error.message}`)
      this.sessions.open(run.sessionId as never); this.close()
      if (completion !== undefined) await completion
    } catch (error) { this.state.error = error instanceof Error ? error.message : String(error); document.documentElement.setAttribute(ACTIVE_ATTR, '') }
    finally { this.state.loading = false; this.render() }
  }

  private waitForTurn(session: { getSnapshot(): { running: boolean }; subscribe(listener: () => void): () => void }): Promise<void> {
    return new Promise((resolve, reject) => { let seen = session.getSnapshot().running; const timeout = window.setTimeout(() => { dispose(); reject(new Error('等待 AI 同步超时')) }, 10 * 60 * 1000); const dispose = session.subscribe(() => { const running = session.getSnapshot().running; seen ||= running; if (seen && !running) { window.clearTimeout(timeout); dispose(); resolve() } }) })
  }

  private trackRun(session: { sessionId: unknown; getSnapshot(): { running: boolean }; subscribe(listener: () => void): () => void }, run: StageRun, workspaceId: string): void {
    const key = String(session.sessionId); this.trackedRuns.get(key)?.()
    let seenRunning = session.getSnapshot().running
    const dispose = session.subscribe(() => {
      const running = session.getSnapshot().running
      if (running) seenRunning = true
      else if (seenRunning) { seenRunning = false; void call({ kind: 'sync-run', workspaceId, runUid: run.uid }) }
    })
    this.trackedRuns.set(key, () => { dispose(); this.trackedRuns.delete(key) })
  }

  private async accept(artifactUid: string): Promise<void> { const report = this.state.snapshot?.quality[artifactUid]; if (report === undefined) return; const checklist = Object.fromEntries(report.checks.filter(item => item.code.startsWith('checklist:')).map(item => [`item-${item.code.split(':')[1]}`, true])); if (!window.confirm('确认已逐项核对阶段验收清单，并接受该版本作为下游正式输入？')) return; await this.mutate({ kind: 'accept', workspaceId: this.state.workspaceId!, artifactUid, checklist }) }
  private async createDevelopment(): Promise<void> { if (!this.state.targetArtifactUid) return; const repositories = this.state.snapshot?.project?.development.repositories ?? []; const repositoryId = window.prompt(`代码仓库 ID（可用：${repositories.map(item => item.id).join(', ')}）`, repositories[0]?.id)?.trim(); if (!repositoryId) return; await this.mutate({ kind: 'development-create', workspaceId: this.state.workspaceId!, artifactUid: this.state.targetArtifactUid, repositoryId }) }
  private async runTest(repositoryId: string): Promise<void> { if (!this.state.targetArtifactUid) return; const repository = this.state.snapshot?.project?.development.repositories.find(item => item.id === repositoryId); const testId = window.prompt(`测试命令（可用：${repository?.testCommands.map(item => item.id).join(', ') ?? ''}）`, repository?.testCommands[0]?.id)?.trim(); if (!testId) return; await this.mutate({ kind: 'development-test', workspaceId: this.state.workspaceId!, artifactUid: this.state.targetArtifactUid, repositoryId, testId }) }
  private async commit(repositoryId: string): Promise<void> { if (!this.state.targetArtifactUid) return; const message = window.prompt('提交说明')?.trim(); if (!message || !window.confirm(`将在隔离代码空间执行 git add -A 和 git commit：\n${message}\n继续吗？`)) return; await this.mutate({ kind: 'development-commit', workspaceId: this.state.workspaceId!, artifactUid: this.state.targetArtifactUid, repositoryId, message }) }
}

export function apply(ctx: ClientContext): () => void { const workbench = new SddWorkbench(ctx.workspaces, ctx.sessions as unknown as ISessions); return workbench.start() }
