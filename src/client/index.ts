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
.dsh-sdd-modal-backdrop{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;background:#0008}.dsh-sdd-modal{box-sizing:border-box;width:min(520px,100%);max-height:min(760px,calc(100vh - 40px));overflow:auto;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:14px;background:var(--dsw-alias-bg-base,#fff);box-shadow:0 20px 60px #0005}.dsh-sdd-modal-header{padding:18px 20px 10px}.dsh-sdd-modal-header h2{margin:0 0 6px;font-size:18px}.dsh-sdd-modal-body{display:flex;flex-direction:column;gap:14px;padding:8px 20px 18px}.dsh-sdd-field{display:flex;flex-direction:column;gap:6px}.dsh-sdd-field>label{font-size:13px;font-weight:600}.dsh-sdd-field textarea{min-height:88px;resize:vertical}.dsh-sdd-field[hidden]{display:none}.dsh-sdd-checkbox{display:grid;grid-template-columns:auto 1fr;align-items:start;gap:9px;padding:10px;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:9px}.dsh-sdd-checkbox input{margin-top:2px}.dsh-sdd-modal-footer{display:flex;justify-content:flex-end;gap:8px;padding:14px 20px;border-top:1px solid var(--dsw-alias-border-l1,#ddd);background:var(--dsw-alias-bg-layer-2,#fafafa)}
`

interface DialogOption { value: string; label: string }
interface DialogField {
  name: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'checkbox'
  value?: string | boolean
  placeholder?: string
  help?: string
  required?: boolean
  options?: DialogOption[]
  showWhen?: { field: string; value: string }
}
interface DialogConfig { title: string; description?: string; submitLabel: string; fields: DialogField[] }
type DialogValues = Record<string, string | boolean>

interface RuntimeState {
  menu: MenuId
  workspaceId?: string
  workItemUid?: string
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
    try { const response = await call({ kind: 'snapshot', workspaceId: this.state.workspaceId }); if (!response.ok) throw new Error(response.error); if (!('snapshot' in response)) throw new Error('Host returned an unexpected response'); this.state.snapshot = response.snapshot; if (this.state.workItemUid === undefined || !response.snapshot.workItems.some(item => item.uid === this.state.workItemUid)) this.state.workItemUid = response.snapshot.workItems.find(item => item.status !== 'completed')?.uid }
    catch (error) { this.state.error = error instanceof Error ? error.message : String(error) }
    finally { this.state.loading = false; this.render() }
  }

  private render(): void {
    if (this.container === undefined) return
    const workspaceState = this.workspaces.list.getSnapshot(); const options = workspaceState.items.map(item => `<option value="${escapeHtml(item.workspaceId as string)}"${item.workspaceId === this.state.workspaceId ? ' selected' : ''}>${escapeHtml(item.title || item.path)}</option>`).join('')
    const title = this.state.menu === 'dashboard' ? '项目看板' : STAGES.find(item => item.id === this.state.menu)!.label
    if (this.state.workspaceId === undefined) { this.container.innerHTML = '<div class="dsh-sdd-page"><div class="dsh-sdd-empty">请先在 DSH 中打开一个 Workspace。</div></div>'; return }
    const snapshot = this.state.snapshot
    const workItemOptions = snapshot?.workItems.map(item => `<option value="${escapeHtml(item.uid)}"${item.uid === this.state.workItemUid ? ' selected' : ''}>${escapeHtml(item.key)} · ${escapeHtml(item.title)}${item.status === 'change-pending' ? ' · 有变更' : item.status === 'removed-pending' ? ' · 已移除' : ''}</option>`).join('') ?? ''
    const workItemSelect = snapshot !== undefined && snapshot.workItems.length > 0 ? `<select class="dsh-sdd-select" data-action="work-item" title="当前需求工作单元">${workItemOptions}</select>` : ''
    let body = ''
    if (this.state.loading) body = '<div class="dsh-sdd-empty">正在读取 SDD 项目…</div>'
    else if (snapshot?.configuration.status === 'missing') body = this.initializationHtml()
    else if (snapshot?.configuration.status === 'invalid') body = this.invalidConfigurationHtml(snapshot)
    else if (snapshot !== undefined) body = this.state.menu === 'dashboard' ? this.dashboardHtml(snapshot) : this.workbenchHtml(snapshot, this.state.menu)
    this.container.innerHTML = `<div class="dsh-sdd-page"><header class="dsh-sdd-header"><button class="dsh-sdd-button" data-action="close">返回对话</button><h1>${title}</h1><select class="dsh-sdd-select" data-action="workspace">${options}</select>${workItemSelect}<button class="dsh-sdd-button" data-action="refresh">刷新</button></header>${this.state.error ? `<div class="dsh-sdd-error">${escapeHtml(this.state.error)}</div>` : ''}${body}</div>`
    this.bind()
  }

  private initializationHtml(): string { return '<section class="dsh-sdd-card"><h2>初始化 SDD 项目</h2><p>当前目录还不是有效的 SDD 项目。初始化会创建 <code>.sdd/project.yaml</code>、五阶段交付件目录、来源、运行、开发和事件目录，并更新 <code>.gitignore</code>。</p><p class="dsh-sdd-muted">已有业务代码和其他文件不会被修改。</p><button class="dsh-sdd-button primary" data-action="initialize">初始化项目</button></section>' }

  private invalidConfigurationHtml(snapshot: ProjectSnapshot): string {
    return `<section class="dsh-sdd-card"><h2>SDD 项目配置不合法</h2><p>检测到 <code>${escapeHtml(snapshot.configuration.path)}</code>，但当前配置不能安全运行。请修复下列问题，或备份旧配置后重新生成默认配置。</p><ul class="dsh-sdd-checks">${snapshot.configuration.errors.map(error => `<li data-fail>${escapeHtml(error)}</li>`).join('')}</ul><div class="dsh-sdd-actions"><button class="dsh-sdd-button" data-action="refresh">重新检查</button><button class="dsh-sdd-button primary" data-action="reinitialize">备份并重新初始化</button></div></section>`
  }

  private dashboardHtml(snapshot: ProjectSnapshot): string {
    const dashboard = snapshot.dashboard
    const stat = (label: string, value: string, note: string) => `<div class="dsh-sdd-stat"><span class="dsh-sdd-muted">${label}</span><b>${value}</b><span class="dsh-sdd-muted">${note}</span></div>`
    const workload = dashboard.workload.length === 0 ? stat('工作量', '未配置', '由业务数据适配器提供估算') : dashboard.workload.map(item => stat(`工作量 · ${escapeHtml(item.unit)}`, String(item.total), `已完成 ${item.completed}`)).join('')
    const pendingChanges = snapshot.workItems.filter(item => item.status === 'change-pending' || item.status === 'removed-pending').length
    return `<div class="dsh-sdd-stats">${stat('总体完成度', `${dashboard.overallCompletion}%`, '五阶段质量门禁平均值')}${stat('需求工作单元', String(snapshot.workItems.length), `待处理变更 ${pendingChanges}`)}${stat('需求', String(dashboard.requirements.total), `已追踪 ${dashboard.requirements.traced}`)}${stat('缺陷', String(dashboard.defects.total), `待处理 ${dashboard.defects.open} · 已解决 ${dashboard.defects.resolved}`)}${stat('交付件', String(dashboard.artifacts.total), `草稿 ${dashboard.artifacts.drafts} · 已接受 ${dashboard.artifacts.accepted}`)}${stat('代码空间', String(dashboard.development.workspaces), `变更文件 ${dashboard.development.changedFiles}`)}${stat('测试', String(dashboard.development.passingTests + dashboard.development.failingTests), `通过 ${dashboard.development.passingTests} · 失败 ${dashboard.development.failingTests}`)}${workload}</div>
      <section class="dsh-sdd-card"><h2>阶段进度</h2><div class="dsh-sdd-stage-grid">${dashboard.stages.map(item => { const stage = STAGES.find(value => value.id === item.stage)!; return `<div class="dsh-sdd-stat"><strong>${stage.label}</strong><span class="dsh-sdd-badge">${item.status}</span><div class="dsh-sdd-progress"><span style="width:${item.completion}%"></span></div><span class="dsh-sdd-muted">${item.completion}% · draft ${item.drafts} · accepted ${item.accepted}</span></div>` }).join('')}</div></section>
      <div class="dsh-sdd-grid" style="margin-top:14px"><section class="dsh-sdd-card"><h2>质量与追踪</h2><p>来源追踪覆盖率：<strong>${dashboard.traceability}%</strong></p>${dashboard.blockers.length === 0 ? '<div class="dsh-sdd-empty">当前没有结构化阻塞项</div>' : `<ul class="dsh-sdd-checks">${dashboard.blockers.map(item => `<li data-fail>${escapeHtml(item)}</li>`).join('')}</ul>`}</section><section class="dsh-sdd-card"><h2>最近活动</h2>${dashboard.recentEvents.length === 0 ? '<div class="dsh-sdd-empty">暂无事件</div>' : `<div class="dsh-sdd-list">${dashboard.recentEvents.slice(0, 10).map(event => `<div class="dsh-sdd-row"><span></span><span><strong>${escapeHtml(event.subject)}</strong><span class="dsh-sdd-muted">${escapeHtml(event.type)} · ${escapeHtml(event.time)}</span></span></div>`).join('')}</div>`}</section></div>`
  }

  private workbenchHtml(snapshot: ProjectSnapshot, stage: StageId): string {
    const workItem = snapshot.workItems.find(item => item.uid === this.state.workItemUid)
    const accepted = snapshot.artifacts.filter(item => item.status === 'accepted' && item.stage !== stage && item.workItemUid === this.state.workItemUid)
    const current = snapshot.artifacts.filter(item => item.stage === stage && item.workItemUid === this.state.workItemUid)
    const sourceUids = new Set([workItem?.sourceUid, workItem?.bundleSourceUid].filter((uid): uid is string => uid !== undefined))
    const sources = workItem === undefined ? snapshot.sources.filter(item => snapshot.workItems.length === 0) : snapshot.sources.filter(item => sourceUids.has(item.uid))
    const change = workItem?.change === undefined ? '' : `<div class="dsh-sdd-error"><strong>${workItem.status === 'removed-pending' ? '外部需求已被移除' : '检测到需求变更'}</strong><br>${escapeHtml(workItem.change.changedPaths.join('、') || '外部状态变化')}<br>需要重新评审：${escapeHtml(workItem.change.reviewRequiredStages.map(id => STAGES.find(stageItem => stageItem.id === id)?.label ?? id).join('、') || '无')}${workItem.status === 'removed-pending' ? '<div class="dsh-sdd-actions"><button class="dsh-sdd-button" data-resolve-removal>处理外部移除</button></div>' : ''}</div>`
    const noWorkItem = snapshot.workItems.length > 0 && workItem === undefined ? '<div class="dsh-sdd-error">请先选择一个需求工作单元。</div>' : ''
    return `${change}${noWorkItem}<div class="dsh-sdd-grid"><section class="dsh-sdd-card"><h2>选择本次输入</h2><p class="dsh-sdd-muted">只允许当前工作单元的来源和已接受上游交付件。</p><div class="dsh-sdd-list">${accepted.length === 0 && sources.length === 0 ? '<div class="dsh-sdd-empty">暂无可用输入</div>' : accepted.map(item => this.inputRow(item)).join('') + sources.map(item => this.sourceRow(item)).join('')}</div><div class="dsh-sdd-actions"><button class="dsh-sdd-button" data-action="import-source">导入或同步需求包</button><button class="dsh-sdd-button primary" data-action="conversation">开始阶段对话</button></div></section><section class="dsh-sdd-card"><h2>本阶段交付件</h2><p class="dsh-sdd-muted">每次阶段对话固定协作一个草稿或评审中版本，结论会同步到该交付件。</p><div class="dsh-sdd-list">${current.length === 0 ? '<div class="dsh-sdd-empty">尚未创建交付件</div>' : current.map(item => this.outputRow(item, snapshot)).join('')}</div><div class="dsh-sdd-actions"><button class="dsh-sdd-button" data-action="draft"${snapshot.workItems.length > 0 && workItem === undefined ? ' disabled' : ''}>创建草稿</button></div></section>${stage === 'development' ? this.developmentHtml(snapshot) : ''}</div>`
  }

  private inputRow(item: ArtifactSummary): string { return `<label class="dsh-sdd-row"><input type="checkbox" data-input="${escapeHtml(item.uid)}" ${this.state.selected.has(item.uid) ? 'checked' : ''}><span><strong>${escapeHtml(item.key)} · ${escapeHtml(item.title)}</strong><span class="dsh-sdd-muted">${escapeHtml(item.stage)} · v${escapeHtml(item.version)} · ${escapeHtml(item.relativeDirectory)}</span></span><span class="dsh-sdd-badge">accepted</span></label>` }
  private sourceRow(item: SourceSummary): string { const disabled = item.validationErrors.length > 0 ? ' disabled' : ''; const kindLabels: Record<string, string> = { requirement: '需求', defect: '缺陷', issue: '问题' }; const provider = item.provider === 'command' ? '项目业务适配器' : item.provider; const detail = item.validationErrors.length > 0 ? item.validationErrors.join('; ') : `${kindLabels[item.kind] ?? item.kind} · ${provider} · ${item.relativePath}`; return `<label class="dsh-sdd-row"><input type="checkbox" data-input="${escapeHtml(item.uid)}"${disabled} ${this.state.selected.has(item.uid) ? 'checked' : ''}><span><strong>${escapeHtml(item.externalKey ?? item.uid)} · ${escapeHtml(item.title)}</strong><span class="dsh-sdd-muted">${escapeHtml(detail)}</span></span><span class="dsh-sdd-badge">外部内容</span></label>` }

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
    root.querySelector<HTMLSelectElement>('[data-action="workspace"]')?.addEventListener('change', event => { this.state.workspaceId = (event.currentTarget as HTMLSelectElement).value; this.state.workItemUid = undefined; this.state.selected.clear(); this.state.targetArtifactUid = undefined; void this.refresh() })
    root.querySelector<HTMLSelectElement>('[data-action="work-item"]')?.addEventListener('change', event => { this.state.workItemUid = (event.currentTarget as HTMLSelectElement).value; const workItem = this.state.snapshot?.workItems.find(item => item.uid === this.state.workItemUid); this.state.selected = new Set([workItem?.sourceUid, workItem?.bundleSourceUid].filter((uid): uid is string => uid !== undefined)); this.state.targetArtifactUid = undefined; this.render() })
    root.querySelector<HTMLElement>('[data-action="initialize"]')?.addEventListener('click', () => { void this.mutate({ kind: 'initialize', workspaceId: this.state.workspaceId! }) }); root.querySelector<HTMLElement>('[data-action="draft"]')?.addEventListener('click', () => { void this.createDraft() }); root.querySelector<HTMLElement>('[data-action="import-source"]')?.addEventListener('click', () => { void this.importSource() }); root.querySelector<HTMLElement>('[data-action="conversation"]')?.addEventListener('click', () => { void this.startConversation() })
    root.querySelector<HTMLElement>('[data-action="reinitialize"]')?.addEventListener('click', () => { void this.reinitialize() })
    root.querySelectorAll<HTMLInputElement>('[data-input]').forEach(input => input.addEventListener('change', () => { const uid = input.dataset.input!; if (input.checked) this.state.selected.add(uid); else this.state.selected.delete(uid) }))
    root.querySelectorAll<HTMLInputElement>('[data-target]').forEach(input => input.addEventListener('change', () => { this.state.targetArtifactUid = input.dataset.target; const artifact = this.state.snapshot?.artifacts.find(item => item.uid === input.dataset.target); this.state.selected = new Set([...(artifact?.basedOn.map(item => item.uid) ?? []), ...(artifact?.derivedFrom.map(item => item.uid) ?? [])]); this.render() }))
    root.querySelectorAll<HTMLButtonElement>('[data-quality]').forEach(button => button.addEventListener('click', () => { void this.mutate({ kind: 'quality', workspaceId: this.state.workspaceId!, artifactUid: button.dataset.quality! }) }))
    root.querySelectorAll<HTMLButtonElement>('[data-accept]').forEach(button => button.addEventListener('click', () => { void this.accept(button.dataset.accept!) }))
    root.querySelectorAll<HTMLButtonElement>('[data-resume]').forEach(button => button.addEventListener('click', () => { void this.resumeRun(button.dataset.resume!, false) }))
    root.querySelectorAll<HTMLButtonElement>('[data-sync]').forEach(button => button.addEventListener('click', () => { void this.resumeRun(button.dataset.sync!, true) }))
    root.querySelectorAll<HTMLButtonElement>('[data-complete]').forEach(button => button.addEventListener('click', () => { void this.mutate({ kind: 'complete-run', workspaceId: this.state.workspaceId!, runUid: button.dataset.complete! }) }))
    root.querySelector<HTMLElement>('[data-action="development-create"]')?.addEventListener('click', () => { void this.createDevelopment() }); root.querySelector<HTMLElement>('[data-action="development-status"]')?.addEventListener('click', () => { if (this.state.targetArtifactUid) void this.mutate({ kind: 'development-status', workspaceId: this.state.workspaceId!, artifactUid: this.state.targetArtifactUid }) })
    root.querySelectorAll<HTMLButtonElement>('[data-dev-test]').forEach(button => button.addEventListener('click', () => { void this.runTest(button.dataset.devTest!) })); root.querySelectorAll<HTMLButtonElement>('[data-dev-commit]').forEach(button => button.addEventListener('click', () => { void this.commit(button.dataset.devCommit!) }))
    root.querySelector<HTMLButtonElement>('[data-resolve-removal]')?.addEventListener('click', () => { void this.resolveRemoval() })
  }

  private openForm(config: DialogConfig): Promise<DialogValues | undefined> {
    return new Promise(resolve => {
      const backdrop = document.createElement('div')
      backdrop.className = 'dsh-sdd-modal-backdrop'
      const fieldHtml = config.fields.map(field => {
        const required = field.required ? ' required' : ''
        const show = field.showWhen === undefined ? '' : ` data-show-field="${escapeHtml(field.showWhen.field)}" data-show-value="${escapeHtml(field.showWhen.value)}"`
        const help = field.help === undefined ? '' : `<span class="dsh-sdd-muted">${escapeHtml(field.help)}</span>`
        if (field.type === 'checkbox') return `<div class="dsh-sdd-field"${show}><label class="dsh-sdd-checkbox"><input type="checkbox" name="${escapeHtml(field.name)}"${field.value === true ? ' checked' : ''}${required}><span>${escapeHtml(field.label)}${help}</span></label></div>`
        const control = field.type === 'select'
          ? `<select class="dsh-sdd-select" name="${escapeHtml(field.name)}"${required}>${(field.options ?? []).map(option => `<option value="${escapeHtml(option.value)}"${option.value === field.value ? ' selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}</select>`
          : field.type === 'textarea'
            ? `<textarea class="dsh-sdd-input" name="${escapeHtml(field.name)}" placeholder="${escapeHtml(field.placeholder ?? '')}"${required}>${escapeHtml(typeof field.value === 'string' ? field.value : '')}</textarea>`
            : `<input class="dsh-sdd-input" name="${escapeHtml(field.name)}" value="${escapeHtml(typeof field.value === 'string' ? field.value : '')}" placeholder="${escapeHtml(field.placeholder ?? '')}"${required}>`
        return `<div class="dsh-sdd-field"${show}><label>${escapeHtml(field.label)}</label>${control}${help}</div>`
      }).join('')
      backdrop.innerHTML = `<form class="dsh-sdd-modal"><header class="dsh-sdd-modal-header"><h2>${escapeHtml(config.title)}</h2>${config.description ? `<p class="dsh-sdd-muted">${escapeHtml(config.description)}</p>` : ''}</header><div class="dsh-sdd-modal-body">${fieldHtml}</div><footer class="dsh-sdd-modal-footer"><button class="dsh-sdd-button" type="button" data-dialog-cancel>取消</button><button class="dsh-sdd-button primary" type="submit">${escapeHtml(config.submitLabel)}</button></footer></form>`
      this.container!.appendChild(backdrop)
      const form = backdrop.querySelector<HTMLFormElement>('form')!
      const close = (value: DialogValues | undefined) => { backdrop.remove(); resolve(value) }
      const updateVisibility = () => {
        backdrop.querySelectorAll<HTMLElement>('[data-show-field]').forEach(group => {
          const source = form.elements.namedItem(group.dataset.showField!) as HTMLInputElement | HTMLSelectElement | null
          const visible = source?.value === group.dataset.showValue
          group.hidden = !visible
          group.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input,select,textarea').forEach(control => { control.disabled = !visible })
        })
      }
      form.addEventListener('change', updateVisibility)
      form.addEventListener('submit', event => {
        event.preventDefault()
        if (!form.reportValidity()) return
        const values: DialogValues = {}
        for (const field of config.fields) {
          const control = form.elements.namedItem(field.name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null
          if (control === null || control.disabled) continue
          values[field.name] = field.type === 'checkbox' ? (control as HTMLInputElement).checked : control.value.trim()
        }
        close(values)
      })
      backdrop.querySelector<HTMLElement>('[data-dialog-cancel]')!.addEventListener('click', () => close(undefined))
      backdrop.addEventListener('click', event => { if (event.target === backdrop) close(undefined) })
      updateVisibility()
      window.setTimeout(() => backdrop.querySelector<HTMLElement>('input:not([type="checkbox"]),select,textarea')?.focus(), 0)
    })
  }

  private async reinitialize(): Promise<void> {
    const values = await this.openForm({
      title: '重新初始化 SDD 项目',
      description: '现有 project.yaml 会先保存为带时间戳的备份，然后生成默认配置。交付件和业务代码不会删除。',
      submitLabel: '备份并重新初始化', fields: [],
    })
    if (values !== undefined) await this.mutate({ kind: 'reinitialize', workspaceId: this.state.workspaceId! })
  }

  private async mutate(action: SddAction): Promise<void> { this.state.loading = true; this.state.error = undefined; this.render(); try { const response = await call(action); if (!response.ok) throw new Error(response.error); if ('snapshot' in response) this.state.snapshot = response.snapshot } catch (error) { this.state.error = error instanceof Error ? error.message : String(error) } finally { this.state.loading = false; this.render() } }

  private async createDraft(): Promise<void> {
    if (this.state.menu === 'dashboard') return
    const stage = STAGES.find(item => item.id === this.state.menu)!
    const values = await this.openForm({
      title: `创建${stage.label}交付件`, description: '当前勾选的上游交付件和外部来源会固定写入本版本的追踪关系。', submitLabel: '创建草稿',
      fields: [
        { name: 'title', label: '交付件标题', type: 'text', required: true, placeholder: '例如：订单部分退款需求' },
        { name: 'key', label: '项目编号', type: 'text', placeholder: '留空则按项目编号规则自动生成', help: '编号只用于展示和外部沟通，内部身份使用不可变 UUID。' },
      ],
    })
    if (values === undefined) return
    const artifacts = this.state.snapshot?.artifacts ?? []; const sources = this.state.snapshot?.sources ?? []
    await this.mutate({ kind: 'create-draft', workspaceId: this.state.workspaceId!, stage: this.state.menu, title: String(values.title), key: String(values.key || '') || undefined, basedOn: [...this.state.selected].filter(uid => artifacts.some(item => item.uid === uid)), sourceUids: [...this.state.selected].filter(uid => sources.some(item => item.uid === uid)), ...(this.state.workItemUid === undefined ? {} : { workItemUid: this.state.workItemUid }) })
  }

  private async importSource(): Promise<void> {
    const snapshot = this.state.snapshot; const providers = snapshot?.sourceProviders ?? []
    if (providers.length === 0) { this.state.error = '当前没有可用的业务数据获取方式'; return this.render() }
    const defaultKind = this.state.menu === 'development' ? 'defect' : 'requirement'
    const kinds = [...new Set([defaultKind, 'requirement', 'defect', ...Object.keys(snapshot?.project?.sources ?? {})])]
    const kindLabels: Record<string, string> = { requirement: '需求', defect: '缺陷', issue: '问题' }
    const configured = snapshot?.project?.sources[defaultKind]
    const defaultProvider = configured !== undefined && providers.includes(configured.provider) ? configured.provider : providers[0]!
    const connectors = snapshot?.connectors ?? []
    const values = await this.openForm({
      title: '导入外部业务内容', description: '插件会读取外部系统中的原始事实并保存快照，AI 随后把它整合进当前阶段交付件。', submitLabel: '导入',
      fields: [
        { name: 'kind', label: '导入内容', type: 'select', required: true, value: defaultKind, options: kinds.map(value => ({ value, label: kindLabels[value] ?? value })), help: '用于区分需求、缺陷或企业自定义事项类型。' },
        { name: 'provider', label: '获取方式', type: 'select', required: true, value: defaultProvider, options: providers.map(value => ({ value, label: value === 'command' ? '项目业务适配器（command）' : `已安装适配器：${value}` })), help: '获取方式负责从企业系统读取原始内容，不直接生成正式交付件。' },
        { name: 'connector', label: '业务系统连接', type: 'select', required: true, value: configured?.connector ?? connectors[0], options: connectors.length === 0 ? [{ value: '', label: '尚未配置业务连接' }] : connectors.map(value => ({ value, label: value })), help: '来自 .sdd/business/connectors/，由项目业务开发人员维护。', showWhen: { field: 'provider', value: 'command' } },
        { name: 'key', label: '外部编号', type: 'text', required: true, placeholder: defaultKind === 'defect' ? '例如：BUG-1024' : '例如：PAY-381', help: '填写企业需求、缺陷或问题系统中的原始单号。' },
      ],
    })
    if (values === undefined) return
    const provider = String(values.provider); const connector = values.connector === undefined ? undefined : String(values.connector)
    if (provider === 'command' && !connector) { this.state.error = '请先在 .sdd/business/connectors/ 配置业务系统连接'; return this.render() }
    this.state.loading = true; this.state.error = undefined; this.render()
    try {
      const response = await call({ kind: 'preview-source-import', workspaceId: this.state.workspaceId!, provider, sourceKind: String(values.kind), key: String(values.key), ...(connector ? { connector } : {}) })
      if (!response.ok) throw new Error(response.error)
      if (!('preview' in response)) throw new Error('业务适配器未返回导入预览')
      this.state.loading = false; this.render()
      const preview = response.preview
      const actionable = preview.items.filter(item => item.change !== 'unchanged')
      const counts = Object.fromEntries(['added', 'modified', 'removed', 'unchanged'].map(kind => [kind, preview.items.filter(item => item.change === kind).length]))
      const changeLabels: Record<string, string> = { added: '新增', modified: '有变更', removed: '外部已移除' }
      const selected = await this.openForm({
        title: `同步预览 · ${preview.bundleKey}`,
        description: `${preview.bundleTitle}：新增 ${counts.added}，变更 ${counts.modified}，移除 ${counts.removed}，无变化 ${counts.unchanged}。只会应用勾选项。`,
        submitLabel: actionable.length === 0 ? '关闭' : '应用所选变更',
        fields: actionable.map((item, index) => ({ name: `change-${index}`, label: `${changeLabels[item.change]} · ${item.externalKey} · ${item.title}`, type: 'checkbox' as const, value: true, help: item.changedPaths.length === 0 ? '创建独立需求工作单元' : `变化位置：${item.changedPaths.join('、')}` })),
      })
      if (selected === undefined || actionable.length === 0) return
      const identities = actionable.filter((_item, index) => selected[`change-${index}`] === true).map(item => item.identity)
      if (identities.length === 0) return
      this.state.loading = true; this.render()
      const applied = await call({ kind: 'apply-source-import', workspaceId: this.state.workspaceId!, previewUid: preview.uid, identities })
      if (!applied.ok) throw new Error(applied.error)
      if (!('snapshot' in applied)) throw new Error('应用变更后未返回项目状态')
      this.state.snapshot = applied.snapshot
      const first = applied.snapshot.workItems.find(item => identities.includes(`${item.provider}:${item.kind}:${item.key}`))
      if (first !== undefined) { this.state.workItemUid = first.uid; this.state.selected = new Set([first.sourceUid, first.bundleSourceUid].filter((uid): uid is string => uid !== undefined)); this.state.targetArtifactUid = undefined }
    } catch (error) { this.state.error = error instanceof Error ? error.message : String(error) }
    finally { this.state.loading = false; this.render() }
  }

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

  private async accept(artifactUid: string): Promise<void> {
    const snapshot = this.state.snapshot; const report = snapshot?.quality[artifactUid]; const artifact = snapshot?.artifacts.find(item => item.uid === artifactUid)
    if (report === undefined || artifact === undefined) return
    const checks = report.checks.filter(item => item.code.startsWith('checklist:'))
    const values = await this.openForm({
      title: `验收 ${artifact.key}`, description: '请逐项确认本阶段的完成条件。验收后，该版本会成为下游阶段可选择的正式输入。', submitLabel: '确认验收',
      fields: checks.map(check => { const index = check.code.split(':')[1]!; return { name: `item-${index}`, label: check.label.replace(/^验收：/, ''), type: 'checkbox' as const, required: true, value: artifact.checklist?.[`item-${index}`] === true, help: check.message } }),
    })
    if (values === undefined) return
    const checklist = Object.fromEntries(checks.map(check => { const key = `item-${check.code.split(':')[1]}`; return [key, values[key] === true] }))
    await this.mutate({ kind: 'accept', workspaceId: this.state.workspaceId!, artifactUid, checklist })
  }

  private async createDevelopment(): Promise<void> {
    if (!this.state.targetArtifactUid) return
    const snapshot = this.state.snapshot; const workspace = snapshot?.developmentWorkspaces.find(item => item.artifactUid === this.state.targetArtifactUid)
    const existing = new Set(workspace?.repositories.map(item => item.id) ?? [])
    const repositories = (snapshot?.project?.development.repositories ?? []).filter(item => !existing.has(item.id))
    if (repositories.length === 0) { this.state.error = existing.size > 0 ? '已添加全部已配置代码仓库' : '请先在 .sdd/project.yaml 中配置代码仓库'; return this.render() }
    const values = await this.openForm({
      title: '添加代码仓库', description: '代码会下载到独立开发空间，并基于所选基线分支创建当前需求的工作分支。', submitLabel: '创建开发空间',
      fields: [{ name: 'repositoryId', label: '代码仓库', type: 'select', required: true, value: repositories[0]!.id, options: repositories.map(item => ({ value: item.id, label: `${item.id} · 基线 ${item.baseBranch} · ${item.source}` })) }],
    })
    if (values === undefined) return
    await this.mutate({ kind: 'development-create', workspaceId: this.state.workspaceId!, artifactUid: this.state.targetArtifactUid, repositoryId: String(values.repositoryId) })
  }

  private async runTest(repositoryId: string): Promise<void> {
    if (!this.state.targetArtifactUid) return
    const repository = this.state.snapshot?.project?.development.repositories.find(item => item.id === repositoryId)
    if (repository === undefined || repository.testCommands.length === 0) { this.state.error = `仓库 ${repositoryId} 尚未配置测试项`; return this.render() }
    const values = await this.openForm({
      title: `运行测试 · ${repositoryId}`, description: '只允许执行项目配置中预先声明的测试项。', submitLabel: '开始测试',
      fields: [{ name: 'testId', label: '测试项', type: 'select', required: true, value: repository.testCommands[0]!.id, options: repository.testCommands.map(item => ({ value: item.id, label: `${item.label} · ${item.argv.join(' ')}` })) }],
    })
    if (values === undefined) return
    await this.mutate({ kind: 'development-test', workspaceId: this.state.workspaceId!, artifactUid: this.state.targetArtifactUid, repositoryId, testId: String(values.testId) })
  }

  private async commit(repositoryId: string): Promise<void> {
    if (!this.state.targetArtifactUid) return
    const values = await this.openForm({
      title: `提交代码 · ${repositoryId}`, description: '将把该隔离开发空间中的全部变更暂存并创建本地 Git 提交；不会自动推送或合并。', submitLabel: '提交代码',
      fields: [{ name: 'message', label: '提交说明', type: 'textarea', required: true, placeholder: '例如：feat: 完成订单部分退款流程' }],
    })
    if (values === undefined) return
    await this.mutate({ kind: 'development-commit', workspaceId: this.state.workspaceId!, artifactUid: this.state.targetArtifactUid, repositoryId, message: String(values.message) })
  }

  private async resolveRemoval(): Promise<void> {
    if (this.state.workItemUid === undefined) return
    const values = await this.openForm({
      title: '处理外部需求移除', description: '历史来源、交付件和代码不会被删除。请选择这个工作单元后续在本项目中的状态。', submitLabel: '确认处理',
      fields: [{ name: 'decision', label: '处理方式', type: 'select', required: true, value: 'keep', options: [{ value: 'keep', label: '保留本地并继续推进' }, { value: 'archive', label: '归档工作单元' }] }],
    })
    if (values === undefined) return
    await this.mutate({ kind: 'resolve-work-item-removal', workspaceId: this.state.workspaceId!, workItemUid: this.state.workItemUid, decision: String(values.decision) as 'keep' | 'archive' })
  }
}

export function apply(ctx: ClientContext): () => void { const workbench = new SddWorkbench(ctx.workspaces, ctx.sessions as unknown as ISessions); return workbench.start() }
