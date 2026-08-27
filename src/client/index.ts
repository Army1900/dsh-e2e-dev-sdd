import type { ClientContext, ISessions, IWorkspaces, WorkspaceId } from '@deepseek-ai/dsh-client-runtime/client'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { STAGES, STAGE_ARTIFACT_TEMPLATES, type ArtifactSummary, type BurnupPoint, type DeliveryCellStatus, type ProjectSnapshot, type RepositoryInspection, type SddAction, type SddResponse, type SourceSummary, type StageId, type StageRun, type StageTemplatePreview } from '../protocol.ts'

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
.dsh-sdd-page{box-sizing:border-box;width:100%;min-height:100%;padding:20px;max-width:1220px;margin:0 auto}.dsh-sdd-header{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px}.dsh-sdd-header h1{font-size:22px;margin:0;margin-right:auto}.dsh-sdd-header .dsh-sdd-select{min-width:0;max-width:min(360px,100%)}.dsh-sdd-select,.dsh-sdd-input{box-sizing:border-box;padding:8px 10px;border:1px solid var(--dsw-alias-border-l2,#ccc);border-radius:8px;background:var(--dsw-specific-input-major,#fff);color:inherit}.dsh-sdd-button{padding:8px 12px;border:1px solid var(--dsw-alias-border-l2,#ccc);border-radius:8px;background:var(--dsw-alias-bg-layer-2,#f5f5f5);color:inherit;cursor:pointer}.dsh-sdd-button:hover{filter:brightness(.97)}.dsh-sdd-button.primary{background:var(--dsw-alias-button-primary-fill,#3b63f3);border-color:transparent;color:var(--dsw-alias-label-primary-foreground,#fff)}.dsh-sdd-button:disabled{opacity:.5;cursor:not-allowed}
.dsh-sdd-grid{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:14px}@media(max-width:850px){.dsh-sdd-grid{grid-template-columns:minmax(0,1fr)}}.dsh-sdd-card{min-width:0;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:12px;background:var(--dsw-alias-bg-layer-2,#fafafa);padding:14px}.dsh-sdd-card h2{font-size:15px;margin:0 0 10px}.dsh-sdd-muted{font-size:12px;color:var(--dsw-alias-label-secondary,#666);overflow-wrap:anywhere}.dsh-sdd-list{display:flex;min-width:0;flex-direction:column;gap:8px}.dsh-sdd-row{display:grid;min-width:0;grid-template-columns:auto minmax(0,1fr) auto;align-items:start;gap:9px;padding:10px;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:9px;background:var(--dsw-alias-bg-base,#fff)}.dsh-sdd-row>span{min-width:0}.dsh-sdd-row strong{display:block;font-size:13px;overflow-wrap:anywhere}.dsh-sdd-badge{display:inline-block;max-width:100%;font-size:11px;padding:2px 6px;border-radius:999px;background:var(--dsw-alias-interactive-bg-hover,#eee);margin:0 0 4px 4px;overflow-wrap:anywhere}.dsh-sdd-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.dsh-sdd-error{padding:9px;border-radius:8px;background:#c5303018;color:#c53030;font-size:12px;overflow-wrap:anywhere}.dsh-sdd-empty{padding:18px;text-align:center;color:var(--dsw-alias-label-secondary,#666)}
.dsh-sdd-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:14px}.dsh-sdd-stat{box-sizing:border-box;min-width:0;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:12px;padding:14px;background:var(--dsw-alias-bg-layer-2,#fafafa);overflow:hidden}.dsh-sdd-stat b{display:block;min-width:0;font-size:clamp(20px,2vw,25px);line-height:1.2;margin-top:5px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.dsh-sdd-workload-list{display:flex;flex-direction:column;gap:5px;max-height:86px;margin-top:8px;overflow:auto}.dsh-sdd-workload-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;font-size:12px}.dsh-sdd-workload-row span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dsh-sdd-workload-row strong{font-variant-numeric:tabular-nums;white-space:nowrap}.dsh-sdd-progress{height:8px;background:var(--dsw-alias-interactive-bg-hover,#e5e5e5);border-radius:999px;overflow:hidden;margin-top:7px}.dsh-sdd-progress span{display:block;height:100%;background:var(--dsw-alias-brand-primary,#3b63f3)}.dsh-sdd-stage-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}.dsh-sdd-stage-grid .dsh-sdd-stat{padding:12px}.dsh-sdd-stage-head{display:flex;align-items:flex-start;justify-content:space-between;gap:6px}.dsh-sdd-stage-head .dsh-sdd-badge{flex:none}.dsh-sdd-scroll-list{max-height:340px;overflow:auto;overscroll-behavior:contain;padding-right:3px}.dsh-sdd-dashboard-columns{align-items:start}.dsh-sdd-dashboard-columns>.dsh-sdd-card{max-height:430px;overflow:hidden}.dsh-sdd-dashboard-columns .dsh-sdd-checks{max-height:340px;overflow:auto;padding-right:4px}.dsh-sdd-trace-list{max-height:420px;overflow:auto;overscroll-behavior:contain}.dsh-sdd-checks{margin:7px 0 0;padding-left:17px;font-size:12px;overflow-wrap:anywhere}.dsh-sdd-checks li+li{margin-top:5px}.dsh-sdd-checks li[data-fail]{color:#c53030}.dsh-sdd-checks li[data-pass]{color:#238636}.dsh-sdd-wide{grid-column:1/-1}@media(max-width:1000px){.dsh-sdd-stats{grid-template-columns:repeat(3,minmax(0,1fr))}.dsh-sdd-stage-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:700px){.dsh-sdd-stats,.dsh-sdd-stage-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.dsh-sdd-page{padding:14px}.dsh-sdd-header{gap:8px}.dsh-sdd-header h1{width:100%;order:-1}.dsh-sdd-header .dsh-sdd-select{flex:1 1 220px}}@media(max-width:430px){.dsh-sdd-stats,.dsh-sdd-stage-grid{grid-template-columns:minmax(0,1fr)}}
.dsh-sdd-chart-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(320px,.85fr);gap:14px;margin-bottom:14px}.dsh-sdd-chart-legend{display:flex;flex-wrap:wrap;gap:8px 14px;margin-top:10px;font-size:11px;color:var(--dsw-alias-label-secondary,#666)}.dsh-sdd-chart-legend span{display:inline-flex;align-items:center;gap:5px}.dsh-sdd-legend-swatch{width:14px;height:9px;border:1px solid var(--dsw-alias-label-secondary,#666);border-radius:2px}.dsh-sdd-flow-list{display:flex;flex-direction:column;gap:10px}.dsh-sdd-flow-row{display:grid;grid-template-columns:72px minmax(0,1fr) 28px;align-items:center;gap:9px;font-size:12px}.dsh-sdd-flow-bar{display:flex;height:15px;overflow:hidden;border:1px solid var(--dsw-alias-border-l2,#bbb);border-radius:4px;background:var(--dsw-alias-bg-base,#fff)}.dsh-sdd-flow-segment{height:100%;min-width:0}.dsh-sdd-flow-segment[data-status="not-started"],.dsh-sdd-legend-swatch[data-status="not-started"]{background:transparent}.dsh-sdd-flow-segment[data-status="in-progress"],.dsh-sdd-legend-swatch[data-status="in-progress"]{background:var(--dsw-alias-label-tertiary,#aaa)}.dsh-sdd-flow-segment[data-status="ready-for-review"],.dsh-sdd-legend-swatch[data-status="ready-for-review"]{background:repeating-linear-gradient(90deg,var(--dsw-alias-label-secondary,#666) 0 2px,transparent 2px 4px)}.dsh-sdd-flow-segment[data-status="completed"],.dsh-sdd-legend-swatch[data-status="completed"]{background:var(--dsw-alias-label-primary,#222)}.dsh-sdd-flow-segment[data-status="blocked"],.dsh-sdd-legend-swatch[data-status="blocked"]{background:repeating-linear-gradient(135deg,var(--dsw-alias-label-primary,#222) 0 2px,transparent 2px 5px)}.dsh-sdd-burnup{display:block;width:100%;height:auto;min-height:210px;color:var(--dsw-alias-label-primary,#222)}.dsh-sdd-burnup-grid{stroke:var(--dsw-alias-border-l1,#ddd);stroke-width:1}.dsh-sdd-burnup-total{fill:none;stroke:currentColor;stroke-width:2;stroke-dasharray:6 4;opacity:.55}.dsh-sdd-burnup-completed{fill:none;stroke:currentColor;stroke-width:2.5}.dsh-sdd-burnup-point{fill:var(--dsw-alias-bg-base,#fff);stroke:currentColor;stroke-width:2}.dsh-sdd-burnup text{fill:var(--dsw-alias-label-secondary,#666);font:11px var(--dsw-font-family,system-ui)}.dsh-sdd-matrix-scroll{max-height:520px;overflow:auto;overscroll-behavior:contain;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:9px}.dsh-sdd-matrix{width:100%;min-width:820px;border-collapse:separate;border-spacing:0;font-size:12px}.dsh-sdd-matrix th,.dsh-sdd-matrix td{padding:7px;border-right:1px solid var(--dsw-alias-border-l1,#ddd);border-bottom:1px solid var(--dsw-alias-border-l1,#ddd);background:var(--dsw-alias-bg-base,#fff)}.dsh-sdd-matrix th{position:sticky;top:0;z-index:2;background:var(--dsw-alias-bg-layer-2,#fafafa);text-align:left}.dsh-sdd-matrix th:first-child,.dsh-sdd-matrix td:first-child{position:sticky;left:0;z-index:1;width:220px;min-width:220px}.dsh-sdd-matrix th:first-child{z-index:3}.dsh-sdd-matrix tr:last-child td{border-bottom:0}.dsh-sdd-matrix th:last-child,.dsh-sdd-matrix td:last-child{border-right:0}.dsh-sdd-matrix-work{display:block;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dsh-sdd-matrix-cell{box-sizing:border-box;width:100%;min-width:92px;padding:7px 6px;border:1px solid var(--dsw-alias-border-l2,#bbb);border-radius:5px;background:transparent;color:inherit;font-size:11px;cursor:pointer}.dsh-sdd-matrix-cell[data-status="not-started"]{cursor:default;color:var(--dsw-alias-label-tertiary,#999)}.dsh-sdd-matrix-cell[data-status="in-progress"]{background:var(--dsw-alias-interactive-bg-hover,#e5e5e5)}.dsh-sdd-matrix-cell[data-status="ready-for-review"]{background:repeating-linear-gradient(90deg,var(--dsw-alias-interactive-bg-hover,#ddd) 0 3px,transparent 3px 6px)}.dsh-sdd-matrix-cell[data-status="completed"]{background:var(--dsw-alias-label-primary,#222);border-color:var(--dsw-alias-label-primary,#222);color:var(--dsw-alias-bg-base,#fff)}.dsh-sdd-matrix-cell[data-status="blocked"]{border:2px solid var(--dsw-alias-label-primary,#222);background:repeating-linear-gradient(135deg,var(--dsw-alias-interactive-bg-hover,#ddd) 0 3px,transparent 3px 7px)}@media(max-width:900px){.dsh-sdd-chart-grid{grid-template-columns:minmax(0,1fr)}}
.dsh-sdd-modal-backdrop{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;background:#0008}.dsh-sdd-modal{box-sizing:border-box;width:min(520px,100%);max-height:min(760px,calc(100vh - 40px));overflow:auto;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:14px;background:var(--dsw-alias-bg-base,#fff);box-shadow:0 20px 60px #0005}.dsh-sdd-modal-header{padding:18px 20px 10px}.dsh-sdd-modal-header h2{margin:0 0 6px;font-size:18px}.dsh-sdd-modal-body{display:flex;flex-direction:column;gap:14px;padding:8px 20px 18px}.dsh-sdd-field{display:flex;flex-direction:column;gap:6px}.dsh-sdd-field>label{font-size:13px;font-weight:600}.dsh-sdd-field textarea{min-height:88px;resize:vertical}.dsh-sdd-field[hidden]{display:none}.dsh-sdd-checkbox{display:grid;grid-template-columns:auto 1fr;align-items:start;gap:9px;padding:10px;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:9px}.dsh-sdd-checkbox input{margin-top:2px}.dsh-sdd-modal-footer{display:flex;justify-content:flex-end;gap:8px;padding:14px 20px;border-top:1px solid var(--dsw-alias-border-l1,#ddd);background:var(--dsw-alias-bg-layer-2,#fafafa)}
.dsh-sdd-template-modal{width:min(900px,100%)}.dsh-sdd-template-preview{display:block;box-sizing:border-box;width:100%;margin:0;padding:16px;max-height:60vh;overflow:auto;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:9px;background:var(--dsw-alias-bg-layer-2,#fafafa);color:inherit;font:12px/1.65 ui-monospace,SFMono-Regular,Consolas,"Liberation Mono",monospace;text-align:left;white-space:pre;word-break:normal;overflow-wrap:normal;tab-size:2;direction:ltr}
.dsh-sdd-manual-items{display:flex;flex-direction:column;gap:10px}.dsh-sdd-manual-item{display:grid;grid-template-columns:minmax(120px,.35fr) minmax(180px,.65fr) auto;gap:8px;padding:10px;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:9px;background:var(--dsw-alias-bg-layer-2,#fafafa)}.dsh-sdd-manual-item textarea{grid-column:1/-1;min-height:100px}.dsh-sdd-manual-item button{align-self:start}@media(max-width:650px){.dsh-sdd-manual-item{grid-template-columns:1fr}.dsh-sdd-manual-item textarea{grid-column:1}.dsh-sdd-manual-item button{justify-self:end}}
.dsh-sdd-package-modal{width:min(1120px,100%)}.dsh-sdd-package{display:grid;grid-template-columns:minmax(230px,.32fr) minmax(0,1fr);gap:12px;min-height:480px}.dsh-sdd-file-tree{max-height:62vh;overflow:auto;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:9px;padding:6px;background:var(--dsw-alias-bg-layer-2,#fafafa)}.dsh-sdd-file-row{display:flex;align-items:center;width:100%;gap:6px;padding:7px 8px;border:0;border-radius:6px;background:transparent;color:inherit;text-align:left;cursor:pointer;font:12px ui-monospace,SFMono-Regular,Consolas,monospace}.dsh-sdd-file-row:hover,.dsh-sdd-file-row[data-selected]{background:var(--dsw-alias-interactive-bg-hover,#e8e8e8)}.dsh-sdd-preview-pane{min-width:0}.dsh-sdd-preview-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}.dsh-sdd-preview-toolbar strong{margin-right:auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dsh-sdd-markdown{box-sizing:border-box;max-height:56vh;overflow:auto;padding:18px;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:9px;background:var(--dsw-alias-bg-base,#fff);line-height:1.65}.dsh-sdd-markdown h1,.dsh-sdd-markdown h2,.dsh-sdd-markdown h3{margin-top:1.3em}.dsh-sdd-markdown pre,.dsh-sdd-markdown code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}.dsh-sdd-markdown pre{overflow:auto;padding:12px;border-radius:7px;background:var(--dsw-alias-bg-layer-2,#f5f5f5)}.dsh-sdd-markdown table{border-collapse:collapse;max-width:100%;display:block;overflow:auto}.dsh-sdd-markdown th,.dsh-sdd-markdown td{border:1px solid var(--dsw-alias-border-l1,#ddd);padding:6px 9px}.dsh-sdd-image-preview{display:flex;align-items:center;justify-content:center;min-height:360px;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:9px;background:var(--dsw-alias-bg-layer-2,#fafafa)}.dsh-sdd-image-preview img{max-width:100%;max-height:56vh}.dsh-sdd-file-note{padding:30px;text-align:center;border:1px dashed var(--dsw-alias-border-l1,#ddd);border-radius:9px;color:var(--dsw-alias-label-secondary,#666)}@media(max-width:760px){.dsh-sdd-package{grid-template-columns:1fr}.dsh-sdd-file-tree{max-height:220px}}
`

interface DialogOption { value: string; label: string }
interface DialogField {
  name: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'manual-items'
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
  const timeout = action.kind === 'add-project-repository' || action.kind === 'inspect-project-repository' || action.kind === 'update-project-repository-branch' ? 75_000 : 20_000
  const response = await fetch(API_PATH, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(action), signal: AbortSignal.timeout(timeout) })
  return await response.json() as SddResponse
}

function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!) }
function markdownHtml(value: string): string { return DOMPurify.sanitize(marked.parse(value, { async: false, gfm: true }) as string, { USE_PROFILES: { html: true } }) }
function sidebarRoot(): HTMLElement | undefined { const column = document.querySelector<HTMLElement>('[data-pane="sidebar"], [class*="sidebarCol"]'); return column?.querySelector<HTMLElement>('[class*="logoRow"]')?.parentElement ?? column?.firstElementChild as HTMLElement | undefined }
function menuAnchor(root: HTMLElement): Element | undefined { const button = root.querySelector<HTMLButtonElement>('button[class*="newSession"]'); const row = button?.closest('[class*="logoRow"]'); return (row !== null && row?.parentElement === root ? row : button) ?? undefined }
function icon(menu: MenuId): string {
  const paths: Record<MenuId, string> = {
    dashboard: '<rect x="3" y="3" width="5.5" height="5.5" rx="1"/><rect x="11.5" y="3" width="5.5" height="3.5" rx="1"/><rect x="3" y="11.5" width="5.5" height="5.5" rx="1"/><rect x="11.5" y="9.5" width="5.5" height="7.5" rx="1"/>',
    requirements: '<path d="M6 3.5h6l3 3V16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M12 3.5V7h3M7.5 10h5M7.5 13h3.5"/><path d="m7.2 15.1.8.8 1.5-1.7"/>',
    prototype: '<rect x="2.75" y="3" width="14.5" height="14" rx="2"/><path d="M3 7h14M7.5 7v10M10 10h4.5M10 13h3M5.1 5h.1"/>',
    architecture: '<rect x="7" y="2.5" width="6" height="4" rx="1"/><rect x="2.5" y="13.5" width="5" height="4" rx="1"/><rect x="12.5" y="13.5" width="5" height="4" rx="1"/><path d="M10 6.5v3M5 13.5v-4h10v4"/>',
    specification: '<path d="M5 3.5h8l2 2V16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M13 3.5V6h2M8 8.5 6.5 10 8 11.5M12 8.5l1.5 1.5-1.5 1.5M9.5 13.5h3"/>',
    development: '<circle cx="5" cy="5" r="1.75"/><circle cx="5" cy="15" r="1.75"/><circle cx="14.5" cy="6.5" r="1.75"/><path d="M5 6.75v6.5M6.75 5h2a4 4 0 0 1 4 4v1"/><path d="m11.5 13.5 1.7 1.7 3.3-3.7"/>',
  }
  return `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[menu]}</svg>`
}

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
    MENUS.forEach(menu => {
      let button = this.menuButtons.get(menu.id)
      if (button === undefined) { button = document.createElement('button'); button.type = 'button'; button.className = 'dsh-sdd-menu'; button.dataset.dshSddMenu = menu.id; button.title = menu.label; button.innerHTML = `${icon(menu.id)}<span>${menu.label}</span>`; button.addEventListener('click', () => this.open(menu.id)); this.menuButtons.set(menu.id, button) }
      if (button.parentElement !== root) root.insertBefore(button, insertBefore); insertBefore = button.nextElementSibling
    })
  }

  private open(menu: MenuId): void { this.state.menu = menu; this.state.selected.clear(); this.state.targetArtifactUid = undefined; document.documentElement.setAttribute(ACTIVE_ATTR, ''); this.syncMenus(); void this.refresh() }
  private close(): void { document.documentElement.removeAttribute(ACTIVE_ATTR); this.menuButtons.forEach(button => delete button.dataset.active) }
  private syncMenus(): void { this.menuButtons.forEach((button, id) => { if (document.documentElement.hasAttribute(ACTIVE_ATTR) && id === this.state.menu) button.dataset.active = 'true'; else delete button.dataset.active }) }

  private async refresh(): Promise<void> {
    if (this.state.workspaceId === undefined) return this.render()
    this.state.loading = true; this.state.error = undefined; this.render()
    try {
      const response = await call({ kind: 'snapshot', workspaceId: this.state.workspaceId }); if (!response.ok) throw new Error(response.error); if (!('snapshot' in response)) throw new Error('Host returned an unexpected response')
      this.state.snapshot = response.snapshot
      if (this.state.workItemUid === undefined || !response.snapshot.workItems.some(item => item.uid === this.state.workItemUid)) {
        const workItem = response.snapshot.workItems.find(item => item.status !== 'completed')
        this.state.workItemUid = workItem?.uid
        this.state.selected = new Set([workItem?.sourceUid, workItem?.bundleSourceUid].filter((uid): uid is string => uid !== undefined))
        this.state.targetArtifactUid = undefined
      }
      if (this.state.menu !== 'dashboard') {
        const selectable = response.snapshot.artifacts.filter(item => item.workItemUid === this.state.workItemUid && item.stage === this.state.menu && (item.status === 'draft' || item.status === 'in-review'))
        if (!selectable.some(item => item.uid === this.state.targetArtifactUid)) {
          const only = selectable.length === 1 ? selectable[0] : undefined
          this.state.targetArtifactUid = only?.uid
          if (only !== undefined) this.state.selected = new Set([...only.basedOn.map(item => item.uid), ...only.derivedFrom.map(item => item.uid)])
        }
      }
    }
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
    const workload = dashboard.workload.length === 0
      ? stat('工作量', '未配置', '由业务数据适配器提供估算')
      : `<div class="dsh-sdd-stat"><span class="dsh-sdd-muted">工作量</span><div class="dsh-sdd-workload-list">${dashboard.workload.map(item => `<div class="dsh-sdd-workload-row" title="${escapeHtml(item.unit)} · 已完成 ${item.completed} / 总计 ${item.total}"><span>${escapeHtml(item.unit)}</span><strong>${item.completed} / ${item.total}</strong></div>`).join('')}</div></div>`
    const pendingChanges = snapshot.workItems.filter(item => item.status === 'change-pending' || item.status === 'removed-pending').length
    return `<section class="dsh-sdd-card" style="margin-bottom:14px"><h2>需求与缺陷管理</h2><p class="dsh-sdd-muted">统一从业务系统导入或再次同步需求包、缺陷和问题；阶段页面只处理各自的交付流程。</p><div class="dsh-sdd-actions"><button class="dsh-sdd-button primary" data-action="import-source">导入或同步需求/缺陷</button></div></section><div class="dsh-sdd-stats">${stat('总体完成度', `${dashboard.overallCompletion}%`, '五阶段质量门禁平均值')}${stat('需求工作单元', String(snapshot.workItems.length), `待处理变更 ${pendingChanges}`)}${stat('需求', String(dashboard.requirements.total), `已追踪 ${dashboard.requirements.traced}`)}${stat('缺陷', String(dashboard.defects.total), `待处理 ${dashboard.defects.open} · 已解决 ${dashboard.defects.resolved}`)}${stat('交付件', String(dashboard.artifacts.total), `草稿 ${dashboard.artifacts.drafts} · 已接受 ${dashboard.artifacts.accepted}`)}${stat('代码空间', String(dashboard.development.workspaces), `变更文件 ${dashboard.development.changedFiles}`)}${stat('测试', String(dashboard.development.passingTests + dashboard.development.failingTests), `通过 ${dashboard.development.passingTests} · 失败 ${dashboard.development.failingTests}`)}${workload}</div>
      <div class="dsh-sdd-chart-grid">${this.stageFlowHtml(snapshot)}${this.burnupHtml(dashboard.burnup)}</div>
      ${this.deliveryMatrixHtml(snapshot)}
      <div class="dsh-sdd-grid dsh-sdd-dashboard-columns" style="margin-top:14px"><section class="dsh-sdd-card"><h2>质量与追踪</h2><p>来源追踪覆盖率：<strong>${dashboard.traceability}%</strong></p>${dashboard.blockers.length === 0 ? '<div class="dsh-sdd-empty">当前没有结构化阻塞项</div>' : `<ul class="dsh-sdd-checks">${dashboard.blockers.map(item => `<li data-fail>${escapeHtml(item)}</li>`).join('')}</ul>`}</section><section class="dsh-sdd-card"><h2>最近活动</h2>${dashboard.recentEvents.length === 0 ? '<div class="dsh-sdd-empty">暂无事件</div>' : `<div class="dsh-sdd-list dsh-sdd-scroll-list">${dashboard.recentEvents.slice(0, 10).map(event => `<div class="dsh-sdd-row"><span></span><span><strong>${escapeHtml(event.subject)}</strong><span class="dsh-sdd-muted">${escapeHtml(event.type)} · ${escapeHtml(event.time)}</span></span></div>`).join('')}</div>`}</section></div>${this.traceabilityHtml(snapshot)}`
  }

  private stageFlowHtml(snapshot: ProjectSnapshot): string {
    const labels: Array<[DeliveryCellStatus, string]> = [['not-started', '未开始'], ['in-progress', '进行中'], ['ready-for-review', '待评审'], ['completed', '已验收'], ['blocked', '阻塞/需复审']]
    const rows = snapshot.dashboard.stageFlow.map(flow => {
      const stage = STAGES.find(item => item.id === flow.stage)!
      const values: Record<DeliveryCellStatus, number> = { 'not-started': flow.notStarted, 'in-progress': flow.inProgress, 'ready-for-review': flow.readyForReview, completed: flow.completed, blocked: flow.blocked }
      const count = Object.values(values).reduce((sum, value) => sum + value, 0); const scale = Math.max(1, count)
      const segments = labels.map(([status, label]) => values[status] === 0 ? '' : `<span class="dsh-sdd-flow-segment" data-status="${status}" style="width:${values[status] / scale * 100}%" title="${escapeHtml(label)} ${values[status]}"></span>`).join('')
      return `<div class="dsh-sdd-flow-row"><strong>${escapeHtml(stage.label)}</strong><div class="dsh-sdd-flow-bar">${segments}</div><span>${count}</span></div>`
    }).join('')
    const legend = labels.map(([status, label]) => `<span><i class="dsh-sdd-legend-swatch" data-status="${status}"></i>${escapeHtml(label)}</span>`).join('')
    return `<section class="dsh-sdd-card"><h2>五阶段流转</h2><p class="dsh-sdd-muted">按需求工作单元统计每个阶段的当前交付状态。</p><div class="dsh-sdd-flow-list">${rows || '<div class="dsh-sdd-empty">暂无工作单元</div>'}</div><div class="dsh-sdd-chart-legend">${legend}</div></section>`
  }

  private burnupHtml(points: BurnupPoint[]): string {
    if (points.length === 0) return '<section class="dsh-sdd-card"><h2>需求燃起图</h2><div class="dsh-sdd-empty">导入需求后开始记录范围与完成趋势。</div></section>'
    const width = 480; const height = 230; const left = 36; const right = 14; const top = 14; const bottom = 32
    const chartWidth = width - left - right; const chartHeight = height - top - bottom; const maximum = Math.max(1, ...points.flatMap(point => [point.total, point.completed]))
    const x = (index: number) => left + (points.length === 1 ? chartWidth / 2 : index / (points.length - 1) * chartWidth)
    const y = (value: number) => top + chartHeight - value / maximum * chartHeight
    const path = (selector: (point: BurnupPoint) => number) => points.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)},${y(selector(point)).toFixed(1)}`).join(' ')
    const completedPoints = points.map((point, index) => `<circle class="dsh-sdd-burnup-point" cx="${x(index).toFixed(1)}" cy="${y(point.completed).toFixed(1)}" r="3"><title>${escapeHtml(point.date)} 已完成 ${point.completed} / 范围 ${point.total}</title></circle>`).join('')
    return `<section class="dsh-sdd-card"><h2>需求燃起图</h2><p class="dsh-sdd-muted">虚线为需求范围，实线为开发测试阶段已验收数量。</p><svg class="dsh-sdd-burnup" viewBox="0 0 ${width} ${height}" role="img" aria-label="需求燃起图"><line class="dsh-sdd-burnup-grid" x1="${left}" y1="${top}" x2="${left}" y2="${top + chartHeight}"/><line class="dsh-sdd-burnup-grid" x1="${left}" y1="${top + chartHeight}" x2="${left + chartWidth}" y2="${top + chartHeight}"/><line class="dsh-sdd-burnup-grid" x1="${left}" y1="${y(maximum)}" x2="${left + chartWidth}" y2="${y(maximum)}"/><path class="dsh-sdd-burnup-total" d="${path(point => point.total)}"/><path class="dsh-sdd-burnup-completed" d="${path(point => point.completed)}"/>${completedPoints}<text x="4" y="${y(maximum) + 4}">${maximum}</text><text x="20" y="${top + chartHeight + 4}">0</text><text x="${left}" y="${height - 8}">${escapeHtml(points[0]!.date.slice(5))}</text><text text-anchor="end" x="${left + chartWidth}" y="${height - 8}">${escapeHtml(points.at(-1)!.date.slice(5))}</text></svg></section>`
  }

  private deliveryMatrixHtml(snapshot: ProjectSnapshot): string {
    const labels: Record<DeliveryCellStatus, string> = { 'not-started': '未开始', 'in-progress': '进行中', 'ready-for-review': '待评审', completed: '已验收', blocked: '阻塞/需复审' }
    const rows = snapshot.dashboard.deliveryMatrix.slice(0, 200).map(row => `<tr><td><strong class="dsh-sdd-matrix-work" title="${escapeHtml(`${row.key} · ${row.title}`)}">${escapeHtml(row.key)} · ${escapeHtml(row.title)}</strong></td>${row.cells.map(cell => `<td><button class="dsh-sdd-matrix-cell" data-status="${cell.status}" data-matrix-work-item="${escapeHtml(row.workItemUid)}" data-matrix-stage="${cell.stage}"${cell.artifactUid === undefined ? '' : ` data-matrix-artifact="${escapeHtml(cell.artifactUid)}"`} title="${escapeHtml(`${labels[cell.status]}${cell.artifactKey === undefined ? '' : ` · ${cell.artifactKey} v${cell.version}`}`)}">${escapeHtml(labels[cell.status])}</button></td>`).join('')}</tr>`).join('')
    return `<section class="dsh-sdd-card" style="margin-top:14px"><h2>需求交付热力图</h2><p class="dsh-sdd-muted">每行是一条需求，每列是一个 SDD 阶段；点击单元格进入对应工作台。</p>${rows === '' ? '<div class="dsh-sdd-empty">暂无需求工作单元</div>' : `<div class="dsh-sdd-matrix-scroll"><table class="dsh-sdd-matrix"><thead><tr><th>需求工作单元</th>${STAGES.map(stage => `<th>${escapeHtml(stage.label)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>${snapshot.dashboard.deliveryMatrix.length > 200 ? '<p class="dsh-sdd-muted">当前展示前 200 条，请按工作单元继续查看详细追踪。</p>' : ''}`}</section>`
  }

  private traceabilityHtml(snapshot: ProjectSnapshot): string {
    const workItem = snapshot.workItems.find(item => item.uid === this.state.workItemUid)
    if (workItem === undefined) return ''
    const artifacts = snapshot.artifacts.filter(item => item.workItemUid === workItem.uid && item.status !== 'superseded')
    const rows = STAGES.map(stage => {
      const items = artifacts.filter(item => item.stage === stage.id)
      const detail = items.length === 0 ? '—' : items.map(item => `${item.key} v${item.version} (${item.status}) ← ${item.basedOn.map(ref => artifacts.find(value => value.uid === ref.uid)?.key ?? ref.uid).join('、') || workItem.key}`).join('；')
      return `<div class="dsh-sdd-row"><span></span><span><strong>${escapeHtml(stage.label)}</strong><span class="dsh-sdd-muted">${escapeHtml(detail)}</span></span></div>`
    }).join('')
    return `<section class="dsh-sdd-card" style="margin-top:14px"><h2>交付追踪矩阵 · ${escapeHtml(workItem.key)}</h2><p class="dsh-sdd-muted">外部需求、五阶段交付件及其固定上游版本。</p><div class="dsh-sdd-list dsh-sdd-trace-list">${rows}</div></section>`
  }

  private workbenchHtml(snapshot: ProjectSnapshot, stage: StageId): string {
    const workItem = snapshot.workItems.find(item => item.uid === this.state.workItemUid)
    const accepted = snapshot.artifacts.filter(item => item.status === 'accepted' && item.stage !== stage && item.workItemUid === this.state.workItemUid)
    const current = snapshot.artifacts.filter(item => item.stage === stage && item.workItemUid === this.state.workItemUid)
    const sourceUids = new Set([workItem?.sourceUid, workItem?.bundleSourceUid].filter((uid): uid is string => uid !== undefined))
    const sources = workItem === undefined ? snapshot.sources.filter(item => snapshot.workItems.length === 0) : snapshot.sources.filter(item => sourceUids.has(item.uid))
    const importAction = stage === 'requirements' ? '<button class="dsh-sdd-button" data-action="import-requirement">导入或同步需求包</button>' : stage === 'development' ? '<button class="dsh-sdd-button" data-action="import-defect">导入或同步缺陷/问题</button>' : ''
    const change = workItem?.change === undefined ? '' : `<div class="dsh-sdd-error"><strong>${workItem.status === 'removed-pending' ? '外部需求已被移除' : '检测到需求变更'}</strong><br>${escapeHtml(workItem.change.changedPaths.join('、') || '外部状态变化')}<br>需要重新评审：${escapeHtml(workItem.change.reviewRequiredStages.map(id => STAGES.find(stageItem => stageItem.id === id)?.label ?? id).join('、') || '无')}${workItem.status === 'removed-pending' ? '<div class="dsh-sdd-actions"><button class="dsh-sdd-button" data-resolve-removal>处理外部移除</button></div>' : ''}</div>`
    const noWorkItem = snapshot.workItems.length > 0 && workItem === undefined ? '<div class="dsh-sdd-error">请先选择一个需求工作单元。</div>' : ''
    const deliverableName = STAGE_ARTIFACT_TEMPLATES[stage].documentName
    const target = current.find(item => item.uid === this.state.targetArtifactUid && (item.status === 'draft' || item.status === 'in-review'))
    const nextStep = current.every(item => item.status !== 'draft' && item.status !== 'in-review')
      ? `下一步：创建“${deliverableName}”草稿，作为 AI 本阶段输出的固定文件。`
      : target === undefined ? `下一步：选择一个 ${deliverableName} 草稿。` : `已选择 ${target.key}，可以开始阶段对话。`
    return `${change}${noWorkItem}${this.stageSettingsHtml(snapshot, stage)}<div class="dsh-sdd-grid"><section class="dsh-sdd-card"><h2>本阶段输入材料</h2><p class="dsh-sdd-muted">这些内容只作为 AI 的输入，不是当前阶段的正式输出。只允许选择当前工作单元的来源和已接受上游交付件。</p><div class="dsh-sdd-list">${accepted.length === 0 && sources.length === 0 ? '<div class="dsh-sdd-empty">暂无可用输入</div>' : accepted.map(item => this.inputRow(item)).join('') + sources.map(item => this.sourceRow(item)).join('')}</div>${importAction ? `<div class="dsh-sdd-actions">${importAction}</div>` : ''}</section><section class="dsh-sdd-card"><h2>${escapeHtml(deliverableName)}</h2><p class="dsh-sdd-muted">这是 AI 在当前阶段持续维护并最终验收的正式交付件。页面模板、草稿正文和 AI 输出约束保持一致。</p><div class="dsh-sdd-list">${current.length === 0 ? `<div class="dsh-sdd-empty">尚未创建${escapeHtml(deliverableName)}</div>` : current.map(item => this.outputRow(item, snapshot)).join('')}</div><div class="dsh-sdd-muted" style="margin-top:12px">${escapeHtml(nextStep)}</div><div class="dsh-sdd-actions"><button class="dsh-sdd-button" data-action="view-template">查看${escapeHtml(deliverableName)}模板</button><button class="dsh-sdd-button${target === undefined ? ' primary' : ''}" data-action="draft"${snapshot.workItems.length > 0 && workItem === undefined ? ' disabled' : ''}>创建${escapeHtml(deliverableName)}草稿</button><button class="dsh-sdd-button primary" data-action="conversation"${target === undefined ? ' disabled title="请先创建或选择本阶段交付件草稿"' : ''}>开始阶段对话</button></div></section>${stage === 'development' ? this.developmentHtml(snapshot) : ''}</div>`
  }

  private stageSettingsHtml(snapshot: ProjectSnapshot, stage: StageId): string {
    const workItem = snapshot.workItems.find(item => item.uid === this.state.workItemUid)
    if (workItem === undefined || (stage !== 'architecture' && stage !== 'specification' && stage !== 'development')) return ''
    const scope = workItem.repositoryScope?.join('、') || '未确认'
    const targets = workItem.developmentTargets?.join('、') || '未确认'
    const openSpecValidation = snapshot.openSpecValidation[workItem.uid]
    const openSpecState = openSpecValidation?.status === 'valid' ? '已验证'
      : openSpecValidation?.status === 'invalid' ? `验证失败：${openSpecValidation.message}`
        : openSpecValidation?.status === 'pending' ? '已配置，待开发空间验证' : '已配置，待验证'
    const openSpec = workItem.openSpec?.enabled === true ? `${workItem.openSpec.repositoryId}:${workItem.openSpec.path} · ${openSpecState}` : '本需求未配置'
    if (stage === 'architecture') {
      const repositories = snapshot.project?.development.repositories ?? []
      const rows = repositories.map(repository => `<div class="dsh-sdd-row"><input type="checkbox" data-repository-scope="${escapeHtml(repository.id)}"${workItem.repositoryScope?.includes(repository.id) === true ? ' checked' : ''}><span><strong>${escapeHtml(repository.id)}</strong><span class="dsh-sdd-muted">${escapeHtml(repository.source)} · 基线 ${escapeHtml(repository.baseBranch)}；开发时自动创建独立特性分支</span></span><span><button class="dsh-sdd-button" data-change-repository-branch="${escapeHtml(repository.id)}">切换基线</button> <button class="dsh-sdd-button" data-remove-repository="${escapeHtml(repository.id)}">移除</button></span></div>`).join('')
      return `<section class="dsh-sdd-card" style="margin-bottom:14px"><h2>本需求代码仓库范围</h2><p class="dsh-sdd-muted">添加后仓库会立即显示。勾选本需求可能影响的仓库，再在当前页面确认范围。本地路径添加时只校验 Git 仓库和分支，开发阶段创建 Worktree；远程地址添加时只校验分支可访问，开发阶段才 Clone 到需求隔离空间。</p><div class="dsh-sdd-list">${rows || '<div class="dsh-sdd-empty">尚未添加项目代码仓库</div>'}</div><div class="dsh-sdd-actions"><button class="dsh-sdd-button" data-action="add-repository">添加项目代码仓库</button><button class="dsh-sdd-button primary" data-action="configure-scope"${repositories.length === 0 ? ' disabled' : ''}>确认当前勾选范围</button></div><p class="dsh-sdd-muted">已确认范围：${escapeHtml(scope)}　开发目标：${escapeHtml(targets)}　OpenSpec：${escapeHtml(openSpec)}</p></section>`
    }
    const action = stage === 'specification' ? '<button class="dsh-sdd-button" data-action="configure-targets">确认开发目标与 OpenSpec</button>' : ''
    return `<section class="dsh-sdd-card" style="margin-bottom:14px"><h2>本需求开发边界</h2><p class="dsh-sdd-muted">系统设计确认仓库范围，规格设计从该范围中确认具体开发目标。未确认时对应阶段不能开始对话或验收。</p><div>仓库范围：<strong>${escapeHtml(scope)}</strong>　开发目标：<strong>${escapeHtml(targets)}</strong>　OpenSpec：<strong>${escapeHtml(openSpec)}</strong></div>${action ? `<div class="dsh-sdd-actions">${action}</div>` : ''}</section>`
  }

  private inputRow(item: ArtifactSummary): string { return `<label class="dsh-sdd-row"><input type="checkbox" data-input="${escapeHtml(item.uid)}" ${this.state.selected.has(item.uid) ? 'checked' : ''}><span><strong>${escapeHtml(item.key)} · ${escapeHtml(item.title)}</strong><span class="dsh-sdd-muted">${escapeHtml(item.stage)} · v${escapeHtml(item.version)} · ${escapeHtml(item.relativeDirectory)}</span></span><span class="dsh-sdd-badge">accepted</span></label>` }
  private sourceRow(item: SourceSummary): string { const disabled = item.validationErrors.length > 0 ? ' disabled' : ''; const kindLabels: Record<string, string> = { requirement: '需求', defect: '缺陷', issue: '问题' }; const provider = item.provider === 'command' ? '项目业务适配器' : item.provider; const detail = item.validationErrors.length > 0 ? item.validationErrors.join('; ') : `${kindLabels[item.kind] ?? item.kind} · ${provider} · ${item.relativePath}`; return `<label class="dsh-sdd-row"><input type="checkbox" data-input="${escapeHtml(item.uid)}"${disabled} ${this.state.selected.has(item.uid) ? 'checked' : ''}><span><strong>${escapeHtml(item.externalKey ?? item.uid)} · ${escapeHtml(item.title)}</strong><span class="dsh-sdd-muted">${escapeHtml(detail)}</span></span><span class="dsh-sdd-badge">外部内容</span></label>` }

  private outputRow(item: ArtifactSummary, snapshot: ProjectSnapshot): string {
    const report = snapshot.quality[item.uid]; const run = snapshot.runs.find(value => value.artifactUid === item.uid && value.status !== 'completed')
    const selectable = item.status === 'draft' || item.status === 'in-review'
    const checks = report === undefined ? '' : `<ul class="dsh-sdd-checks">${report.checks.filter(check => check.status !== 'passed').slice(0, 6).map(check => `<li data-fail>${escapeHtml(check.label)}：${escapeHtml(check.message)}</li>`).join('')}</ul>`
    const revisionBadge = item.revision === undefined ? '' : `<span class="dsh-sdd-badge">${item.revision.kind === 'upstream' ? '上游变更' : '主动调整'}</span>`
    return `<div class="dsh-sdd-row">${selectable ? `<input type="radio" name="sdd-target" data-target="${escapeHtml(item.uid)}" ${this.state.targetArtifactUid === item.uid ? 'checked' : ''}>` : '<span></span>'}<span><strong>${escapeHtml(item.key)} · ${escapeHtml(item.title)}</strong><span class="dsh-sdd-muted">v${escapeHtml(item.version)} · ${escapeHtml(item.relativeDirectory)}/${escapeHtml(item.entry)} · 文件 ${item.files.length}</span>${checks}<div class="dsh-sdd-actions"><button class="dsh-sdd-button" data-preview-artifact="${escapeHtml(item.uid)}">查看交付包</button><button class="dsh-sdd-button" data-quality="${escapeHtml(item.uid)}">质量检查 ${report?.score ?? 0}%</button>${run?.sessionId ? `<button class="dsh-sdd-button" data-resume="${escapeHtml(run.uid)}">恢复对话</button><button class="dsh-sdd-button" data-sync="${escapeHtml(run.uid)}">同步结论</button>` : ''}${selectable ? `<button class="dsh-sdd-button" data-accept="${escapeHtml(item.uid)}">验收</button><button class="dsh-sdd-button" data-discard="${escapeHtml(item.uid)}">删除草稿</button>` : ''}${item.status === 'accepted' ? `<button class="dsh-sdd-button" data-revision="${escapeHtml(item.uid)}">检查变更 / 提出调整</button>` : ''}${run !== undefined && item.status === 'accepted' ? `<button class="dsh-sdd-button" data-complete="${escapeHtml(run.uid)}">完成阶段运行</button>` : ''}</div></span><span><span class="dsh-sdd-badge">${escapeHtml(item.status)}</span>${revisionBadge}${run ? `<span class="dsh-sdd-badge">${escapeHtml(run.status)}</span>` : ''}</span></div>`
  }

  private developmentHtml(snapshot: ProjectSnapshot): string {
    const artifact = snapshot.artifacts.find(item => item.uid === this.state.targetArtifactUid)
    if (artifact === undefined) return '<section class="dsh-sdd-card dsh-sdd-wide"><h2>隔离开发空间</h2><div class="dsh-sdd-empty">先选择一个开发测试交付件。</div></section>'
    const workspace = snapshot.developmentWorkspaces.find(item => item.artifactUid === artifact.uid)
    const workItem = snapshot.workItems.find(item => item.uid === artifact.workItemUid)
    const targets = new Set(workItem?.developmentTargets ?? [])
    const configured = (snapshot.project?.development.repositories ?? []).filter(item => artifact.workItemUid === undefined || targets.has(item.id))
    return `<section class="dsh-sdd-card dsh-sdd-wide"><h2>隔离开发空间 · ${escapeHtml(artifact.key)}</h2>${workspace === undefined ? `<p class="dsh-sdd-muted">可用代码仓库：${configured.map(item => `${item.id}（基线 ${item.baseBranch}）`).join('、') || '尚未在 project.yaml 配置 repositories'}。创建后会从所选基线建立独立的 SDD 特性分支。</p><button class="dsh-sdd-button" data-action="development-create">创建 Worktree / Clone 与特性分支</button>` : `<div class="dsh-sdd-list">${workspace.repositories.map(repo => `<div class="dsh-sdd-row"><span></span><span><strong>${escapeHtml(repo.id)} · 特性分支 ${escapeHtml(repo.workingBranch)}</strong><span class="dsh-sdd-muted">基线 ${escapeHtml(repo.baseBranch)} @ ${escapeHtml(repo.baseCommit.slice(0, 8))}<br>${escapeHtml(repo.path)}<br>变更 ${repo.changedFiles} · ahead ${repo.ahead} · behind ${repo.behind}${repo.lastTest ? ` · 测试 ${repo.lastTest.passed ? '通过' : '失败'}` : ''}</span></span><span><button class="dsh-sdd-button" data-dev-test="${escapeHtml(repo.id)}">运行测试</button><button class="dsh-sdd-button" data-dev-commit="${escapeHtml(repo.id)}">提交代码</button></span></div>`).join('')}</div><p class="dsh-sdd-muted">插件只在特性分支提交代码；推送、创建合并请求并合入基线分支由负责人显式执行，避免自动改写主分支。</p><div class="dsh-sdd-actions"><button class="dsh-sdd-button" data-action="development-create">添加仓库</button><button class="dsh-sdd-button" data-action="development-status">刷新 Git 状态</button></div>`}</section>`
  }

  private bind(): void {
    const root = this.container!
    root.querySelector<HTMLElement>('[data-action="close"]')?.addEventListener('click', () => this.close()); root.querySelectorAll<HTMLElement>('[data-action="refresh"]').forEach(button => button.addEventListener('click', () => { void this.refresh() }))
    root.querySelector<HTMLSelectElement>('[data-action="workspace"]')?.addEventListener('change', event => { this.state.workspaceId = (event.currentTarget as HTMLSelectElement).value; this.state.workItemUid = undefined; this.state.selected.clear(); this.state.targetArtifactUid = undefined; void this.refresh() })
    root.querySelector<HTMLSelectElement>('[data-action="work-item"]')?.addEventListener('change', event => { this.state.workItemUid = (event.currentTarget as HTMLSelectElement).value; const workItem = this.state.snapshot?.workItems.find(item => item.uid === this.state.workItemUid); this.state.selected = new Set([workItem?.sourceUid, workItem?.bundleSourceUid].filter((uid): uid is string => uid !== undefined)); this.state.targetArtifactUid = undefined; this.render() })
    root.querySelector<HTMLElement>('[data-action="initialize"]')?.addEventListener('click', () => { void this.mutate({ kind: 'initialize', workspaceId: this.state.workspaceId! }) }); root.querySelector<HTMLElement>('[data-action="draft"]')?.addEventListener('click', () => { void this.createDraft() }); root.querySelector<HTMLElement>('[data-action="import-source"]')?.addEventListener('click', () => { void this.importSource() }); root.querySelector<HTMLElement>('[data-action="import-requirement"]')?.addEventListener('click', () => { void this.importSource('requirement') }); root.querySelector<HTMLElement>('[data-action="import-defect"]')?.addEventListener('click', () => { void this.importSource('defect') }); root.querySelector<HTMLElement>('[data-action="conversation"]')?.addEventListener('click', () => { void this.startConversation() })
    root.querySelector<HTMLElement>('[data-action="view-template"]')?.addEventListener('click', () => this.showTemplate())
    root.querySelector<HTMLElement>('[data-action="configure-scope"]')?.addEventListener('click', () => { void this.configureRepositoryScope() })
    root.querySelector<HTMLElement>('[data-action="add-repository"]')?.addEventListener('click', () => { void this.addProjectRepository() })
    root.querySelectorAll<HTMLButtonElement>('[data-remove-repository]').forEach(button => button.addEventListener('click', () => { void this.removeProjectRepository(button.dataset.removeRepository!) }))
    root.querySelectorAll<HTMLButtonElement>('[data-change-repository-branch]').forEach(button => button.addEventListener('click', () => { void this.changeProjectRepositoryBranch(button.dataset.changeRepositoryBranch!) }))
    root.querySelector<HTMLElement>('[data-action="configure-targets"]')?.addEventListener('click', () => { void this.configureDevelopmentTargets() })
    root.querySelector<HTMLElement>('[data-action="reinitialize"]')?.addEventListener('click', () => { void this.reinitialize() })
    root.querySelectorAll<HTMLInputElement>('[data-input]').forEach(input => input.addEventListener('change', () => { const uid = input.dataset.input!; if (input.checked) this.state.selected.add(uid); else this.state.selected.delete(uid) }))
    root.querySelectorAll<HTMLInputElement>('[data-target]').forEach(input => input.addEventListener('change', () => { this.state.targetArtifactUid = input.dataset.target; const artifact = this.state.snapshot?.artifacts.find(item => item.uid === input.dataset.target); this.state.selected = new Set([...(artifact?.basedOn.map(item => item.uid) ?? []), ...(artifact?.derivedFrom.map(item => item.uid) ?? [])]); this.render() }))
    root.querySelectorAll<HTMLButtonElement>('[data-quality]').forEach(button => button.addEventListener('click', () => { void this.mutate({ kind: 'quality', workspaceId: this.state.workspaceId!, artifactUid: button.dataset.quality! }) }))
    root.querySelectorAll<HTMLButtonElement>('[data-preview-artifact]').forEach(button => button.addEventListener('click', () => { void this.showArtifact(button.dataset.previewArtifact!) }))
    root.querySelectorAll<HTMLButtonElement>('[data-revision]').forEach(button => button.addEventListener('click', () => { void this.createRevision(button.dataset.revision!) }))
    root.querySelectorAll<HTMLButtonElement>('[data-discard]').forEach(button => button.addEventListener('click', () => { void this.discardDraft(button.dataset.discard!) }))
    root.querySelectorAll<HTMLButtonElement>('[data-accept]').forEach(button => button.addEventListener('click', () => { void this.accept(button.dataset.accept!) }))
    root.querySelectorAll<HTMLButtonElement>('[data-resume]').forEach(button => button.addEventListener('click', () => { void this.resumeRun(button.dataset.resume!, false) }))
    root.querySelectorAll<HTMLButtonElement>('[data-sync]').forEach(button => button.addEventListener('click', () => { void this.resumeRun(button.dataset.sync!, true) }))
    root.querySelectorAll<HTMLButtonElement>('[data-complete]').forEach(button => button.addEventListener('click', () => { void this.mutate({ kind: 'complete-run', workspaceId: this.state.workspaceId!, runUid: button.dataset.complete! }) }))
    root.querySelector<HTMLElement>('[data-action="development-create"]')?.addEventListener('click', () => { void this.createDevelopment() }); root.querySelector<HTMLElement>('[data-action="development-status"]')?.addEventListener('click', () => { if (this.state.targetArtifactUid) void this.mutate({ kind: 'development-status', workspaceId: this.state.workspaceId!, artifactUid: this.state.targetArtifactUid }) })
    root.querySelectorAll<HTMLButtonElement>('[data-dev-test]').forEach(button => button.addEventListener('click', () => { void this.runTest(button.dataset.devTest!) })); root.querySelectorAll<HTMLButtonElement>('[data-dev-commit]').forEach(button => button.addEventListener('click', () => { void this.commit(button.dataset.devCommit!) }))
    root.querySelector<HTMLButtonElement>('[data-resolve-removal]')?.addEventListener('click', () => { void this.resolveRemoval() })
    root.querySelectorAll<HTMLButtonElement>('[data-matrix-work-item]').forEach(button => button.addEventListener('click', () => {
      this.state.workItemUid = button.dataset.matrixWorkItem; this.state.menu = button.dataset.matrixStage as StageId; this.state.targetArtifactUid = button.dataset.matrixArtifact
      const artifact = this.state.snapshot?.artifacts.find(item => item.uid === this.state.targetArtifactUid)
      const workItem = this.state.snapshot?.workItems.find(item => item.uid === this.state.workItemUid)
      this.state.selected = new Set(artifact === undefined ? [workItem?.sourceUid, workItem?.bundleSourceUid].filter((uid): uid is string => uid !== undefined) : [...artifact.basedOn.map(item => item.uid), ...artifact.derivedFrom.map(item => item.uid)])
      this.syncMenus(); this.render()
    }))
  }

  private async showTemplate(): Promise<void> {
    if (this.state.menu === 'dashboard') return
    const stage = STAGES.find(item => item.id === this.state.menu)!
    try {
      const response = await call({ kind: 'read-stage-template', workspaceId: this.state.workspaceId!, stage: stage.id })
      if (!response.ok) throw new Error(response.error)
      if (!('template' in response)) throw new Error('Host returned an unexpected template preview')
      const template = response.template
      const backdrop = document.createElement('div'); backdrop.className = 'dsh-sdd-modal-backdrop'
      backdrop.innerHTML = `<section class="dsh-sdd-modal dsh-sdd-package-modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(stage.label)}交付件模板"><header class="dsh-sdd-modal-header"><h2>${escapeHtml(stage.label)} · ${escapeHtml(template.documentName)}</h2><p class="dsh-sdd-muted">项目模板 ${escapeHtml(template.contentPath)} · v${escapeHtml(template.version)} · ${escapeHtml(template.contentHash)}</p></header><div class="dsh-sdd-modal-body"><div class="dsh-sdd-preview-toolbar"><strong>${escapeHtml(template.contentPath)}</strong><button class="dsh-sdd-button" data-template-mode="preview">预览</button><button class="dsh-sdd-button primary" data-template-mode="source">源码</button><button class="dsh-sdd-button" data-template-open="content">系统打开模板</button><button class="dsh-sdd-button" data-template-open="config">打开规则</button><button class="dsh-sdd-button" data-template-open="directory">打开模板目录</button></div><div data-template-preview></div><p class="dsh-sdd-muted">必填二级章节：${escapeHtml(template.requiredSections.join('、'))}。修改项目模板只影响之后创建的草稿；已有交付件继续使用自身模板快照。</p></div><footer class="dsh-sdd-modal-footer"><button class="dsh-sdd-button primary" type="button" data-template-close>关闭</button></footer></section>`
      this.container!.appendChild(backdrop)
      const preview = backdrop.querySelector<HTMLElement>('[data-template-preview]')!
      const render = (mode: 'preview' | 'source') => {
        preview.innerHTML = mode === 'preview' ? `<article class="dsh-sdd-markdown">${markdownHtml(template.content)}</article>` : `<pre class="dsh-sdd-template-preview">${escapeHtml(template.content)}</pre>`
        backdrop.querySelectorAll<HTMLButtonElement>('[data-template-mode]').forEach(button => button.classList.toggle('primary', button.dataset.templateMode === mode))
      }
      render('source')
      backdrop.querySelectorAll<HTMLButtonElement>('[data-template-mode]').forEach(button => button.addEventListener('click', () => render(button.dataset.templateMode as 'preview' | 'source')))
      backdrop.querySelectorAll<HTMLButtonElement>('[data-template-open]').forEach(button => button.addEventListener('click', () => { void this.openTemplatePath(template, button.dataset.templateOpen as 'directory' | 'config' | 'content') }))
      const close = () => backdrop.remove(); backdrop.querySelector<HTMLElement>('[data-template-close]')!.addEventListener('click', close); backdrop.addEventListener('click', event => { if (event.target === backdrop) close() })
    } catch (error) { this.state.error = error instanceof Error ? error.message : String(error); this.render() }
  }

  private async openTemplatePath(template: StageTemplatePreview, target: 'directory' | 'config' | 'content'): Promise<void> {
    const response = await call({ kind: 'open-stage-template', workspaceId: this.state.workspaceId!, stage: template.stage, target })
    if (!response.ok) { this.state.error = response.error; this.render() }
  }

  private async showArtifact(artifactUid: string): Promise<void> {
    const artifact = this.state.snapshot?.artifacts.find(item => item.uid === artifactUid)
    if (artifact === undefined) return
    try {
      const files = [{ path: 'manifest.yaml', kind: 'manifest' as const, size: 0 }, ...artifact.files]
      const directories = [...new Set(files.flatMap(file => { const parts = file.path.split('/'); return parts.slice(0, -1).map((_part, index) => parts.slice(0, index + 1).join('/')) }))].sort()
      const rows = [...directories.map(path => ({ path, directory: true, kind: 'directory', size: 0 })), ...files.map(file => ({ ...file, directory: false }))]
        .sort((left, right) => left.path.localeCompare(right.path) || Number(right.directory) - Number(left.directory))
        .map(item => `<button class="dsh-sdd-file-row" style="padding-left:${8 + (item.path.split('/').length - 1) * 14}px" data-${item.directory ? 'artifact-directory' : 'artifact-file'}="${escapeHtml(item.path)}"><span>${item.directory ? '📁' : item.kind === 'markdown' ? 'Ⓜ' : item.kind === 'image' ? '▣' : item.kind === 'binary' ? '◆' : '▤'}</span><span>${escapeHtml(item.path.split('/').pop()!)}</span>${item.directory ? '' : `<span class="dsh-sdd-muted">${item.size} B</span>`}</button>`).join('')
      const backdrop = document.createElement('div'); backdrop.className = 'dsh-sdd-modal-backdrop'
      backdrop.innerHTML = `<section class="dsh-sdd-modal dsh-sdd-package-modal" role="dialog" aria-modal="true"><header class="dsh-sdd-modal-header"><h2>${escapeHtml(artifact.key)} · v${escapeHtml(artifact.version)}</h2><p class="dsh-sdd-muted">${escapeHtml(artifact.relativeDirectory)} · ${files.length} 个文件 · 整包哈希 ${escapeHtml(artifact.contentHash ?? '尚未冻结')}</p></header><div class="dsh-sdd-modal-body"><div class="dsh-sdd-preview-toolbar"><button class="dsh-sdd-button" data-artifact-open-root>使用系统工具打开交付包目录</button></div><div class="dsh-sdd-package"><nav class="dsh-sdd-file-tree" aria-label="交付包文件">${rows}</nav><section class="dsh-sdd-preview-pane"><div class="dsh-sdd-preview-toolbar"><strong data-artifact-current>请选择文件</strong><button class="dsh-sdd-button" data-artifact-mode="preview">预览</button><button class="dsh-sdd-button" data-artifact-mode="source">源码</button><button class="dsh-sdd-button" data-artifact-open-file disabled>使用系统工具打开</button></div><div data-artifact-preview><div class="dsh-sdd-file-note">请选择左侧文件。</div></div></section></div></div><footer class="dsh-sdd-modal-footer"><button class="dsh-sdd-button primary" type="button" data-artifact-close>关闭</button></footer></section>`
      this.container!.appendChild(backdrop)
      const preview = backdrop.querySelector<HTMLElement>('[data-artifact-preview]')!; const current = backdrop.querySelector<HTMLElement>('[data-artifact-current]')!; const openFile = backdrop.querySelector<HTMLButtonElement>('[data-artifact-open-file]')!
      let selectedPath = ''; let selectedFile: { kind: string; content?: string; dataUrl?: string } | undefined; let mode: 'preview' | 'source' = 'preview'
      const render = () => {
        if (selectedFile === undefined) return
        const markdown = selectedFile.kind === 'markdown'
        backdrop.querySelectorAll<HTMLButtonElement>('[data-artifact-mode]').forEach(button => { button.hidden = !markdown; button.classList.toggle('primary', button.dataset.artifactMode === mode) })
        if (selectedFile.kind === 'image') preview.innerHTML = `<div class="dsh-sdd-image-preview"><img src="${escapeHtml(selectedFile.dataUrl ?? '')}" alt="${escapeHtml(selectedPath)}"></div>`
        else if (selectedFile.kind === 'binary') preview.innerHTML = '<div class="dsh-sdd-file-note">该文件不能在浏览器中安全预览，请使用系统默认应用打开。</div>'
        else if (markdown && mode === 'preview') preview.innerHTML = `<article class="dsh-sdd-markdown">${markdownHtml(selectedFile.content ?? '')}</article>`
        else preview.innerHTML = `<pre class="dsh-sdd-template-preview">${escapeHtml(selectedFile.content ?? '')}</pre>`
      }
      const selectFile = async (path: string) => {
        const response = await call({ kind: 'read-artifact-file', workspaceId: this.state.workspaceId!, artifactUid, path })
        if (!response.ok) throw new Error(response.error); if (!('artifactFile' in response)) throw new Error('Host returned an unexpected artifact preview')
        selectedPath = path; selectedFile = response.artifactFile; mode = 'preview'; current.textContent = path; openFile.disabled = false
        backdrop.querySelectorAll<HTMLElement>('[data-artifact-file]').forEach(row => row.toggleAttribute('data-selected', row.dataset.artifactFile === path)); render()
      }
      const openPath = async (path: string) => { const response = await call({ kind: 'open-artifact-path', workspaceId: this.state.workspaceId!, artifactUid, path }); if (!response.ok) throw new Error(response.error) }
      backdrop.querySelectorAll<HTMLButtonElement>('[data-artifact-file]').forEach(button => button.addEventListener('click', () => { void selectFile(button.dataset.artifactFile!).catch(error => { this.state.error = String(error); this.render() }) }))
      backdrop.querySelectorAll<HTMLButtonElement>('[data-artifact-directory]').forEach(button => button.addEventListener('click', () => { void openPath(button.dataset.artifactDirectory!).catch(error => { this.state.error = String(error); this.render() }) }))
      backdrop.querySelectorAll<HTMLButtonElement>('[data-artifact-mode]').forEach(button => button.addEventListener('click', () => { mode = button.dataset.artifactMode as 'preview' | 'source'; render() }))
      backdrop.querySelector<HTMLElement>('[data-artifact-open-root]')!.addEventListener('click', () => { void openPath('').catch(error => { this.state.error = String(error); this.render() }) })
      openFile.addEventListener('click', () => { void openPath(selectedPath).catch(error => { this.state.error = String(error); this.render() }) })
      const close = () => backdrop.remove(); backdrop.querySelector<HTMLElement>('[data-artifact-close]')!.addEventListener('click', close); backdrop.addEventListener('click', event => { if (event.target === backdrop) close() })
      await selectFile(artifact.entry)
    } catch (error) { this.state.error = error instanceof Error ? error.message : String(error); this.render() }
  }

  private async configureRepositoryScope(): Promise<void> {
    const snapshot = this.state.snapshot; const workItem = snapshot?.workItems.find(item => item.uid === this.state.workItemUid)
    if (snapshot?.project === undefined || workItem === undefined) return
    const repositories = snapshot.project.development.repositories
    if (repositories.length === 0) { this.state.error = '请先添加项目代码仓库'; return this.render() }
    const repositoryScope = [...(this.container?.querySelectorAll<HTMLInputElement>('[data-repository-scope]:checked') ?? [])].map(input => input.dataset.repositoryScope!)
    const developmentTargets = (workItem.developmentTargets ?? []).filter(id => repositoryScope.includes(id))
    await this.mutate({ kind: 'update-work-item-settings', workspaceId: this.state.workspaceId!, workItemUid: workItem.uid, repositoryScope, developmentTargets, openSpec: developmentTargets.includes(workItem.openSpec?.repositoryId ?? '') ? workItem.openSpec : { enabled: false } })
  }

  private async addProjectRepository(): Promise<void> {
    const values = await this.openForm({
      title: '添加项目代码仓库', description: '先读取本地或远程仓库已有分支，不复制或下载代码。下一步选择开发基线；开发阶段再从该基线创建需求专属特性分支。', submitLabel: '读取已有分支',
      fields: [
        { name: 'id', label: '仓库标识', type: 'text', required: true, placeholder: '例如：payment-web' },
        { name: 'source', label: '本地路径或 Git 地址', type: 'text', required: true, placeholder: '例如：git@github.com:company/payment-web.git' },
      ],
    })
    if (values === undefined) return
    const inspection = await this.inspectProjectRepository(String(values.source))
    if (inspection === undefined) return
    const branchValues = await this.openForm({
      title: `选择基线分支 · ${String(values.id)}`, description: `已读取 ${inspection.sourceKind === 'local' ? '本地' : '远程'}仓库的 ${inspection.branches.length} 个分支。开发阶段会从所选基线创建新的 SDD 特性分支，不会直接修改基线分支。`, submitLabel: '添加仓库',
      fields: [{ name: 'baseBranch', label: '基线分支', type: 'select', required: true, value: inspection.defaultBranch, options: inspection.branches.map(branch => ({ value: branch, label: branch })) }],
    })
    if (branchValues === undefined) return
    await this.mutate({ kind: 'add-project-repository', workspaceId: this.state.workspaceId!, id: String(values.id), source: inspection.source, baseBranch: String(branchValues.baseBranch) })
  }

  private async inspectProjectRepository(source: string): Promise<RepositoryInspection | undefined> {
    try {
      const response = await call({ kind: 'inspect-project-repository', workspaceId: this.state.workspaceId!, source })
      if (!response.ok) throw new Error(response.error)
      if (!('repositoryInspection' in response)) throw new Error('Host returned an unexpected repository inspection')
      return response.repositoryInspection
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : String(error); this.render(); return undefined
    }
  }

  private async changeProjectRepositoryBranch(id: string): Promise<void> {
    const repository = this.state.snapshot?.project?.development.repositories.find(item => item.id === id)
    if (repository === undefined) return
    const inspection = await this.inspectProjectRepository(repository.source)
    if (inspection === undefined) return
    const values = await this.openForm({
      title: `切换基线分支 · ${id}`, description: '只影响之后创建的隔离开发空间；已经创建开发空间时系统会拒绝切换，以免基线记录与真实代码不一致。', submitLabel: '保存基线分支',
      fields: [{ name: 'baseBranch', label: '基线分支', type: 'select', required: true, value: inspection.branches.includes(repository.baseBranch) ? repository.baseBranch : inspection.defaultBranch, options: inspection.branches.map(branch => ({ value: branch, label: branch })) }],
    })
    if (values === undefined || values.baseBranch === repository.baseBranch) return
    await this.mutate({ kind: 'update-project-repository-branch', workspaceId: this.state.workspaceId!, id, baseBranch: String(values.baseBranch) })
  }

  private async removeProjectRepository(id: string): Promise<void> {
    const values = await this.openForm({
      title: `移除项目代码仓库 · ${id}`, description: '只移除 SDD 项目配置，不会删除本地或远程代码仓库。所有需求中对它的仓库范围、开发目标和 OpenSpec 关联也会一并清除。已创建隔离开发空间时不允许移除。', submitLabel: '确认移除',
      fields: [{ name: 'confirmed', label: '我确认从项目配置中移除此仓库', type: 'checkbox', required: true }],
    })
    if (values?.confirmed !== true) return
    await this.mutate({ kind: 'remove-project-repository', workspaceId: this.state.workspaceId!, id })
  }

  private async discardDraft(artifactUid: string): Promise<void> {
    const artifact = this.state.snapshot?.artifacts.find(item => item.uid === artifactUid)
    if (artifact === undefined) return
    const values = await this.openForm({
      title: `删除草稿 · ${artifact.key} v${artifact.version}`, description: '草稿交付包及其阶段运行记录会移入 .sdd/trash，可从文件仓库恢复；已验收的上一版本不会受影响。已创建代码开发空间时不允许删除。', submitLabel: '移入回收目录',
      fields: [{ name: 'confirmed', label: '我确认删除这个草稿修订', type: 'checkbox', required: true }],
    })
    if (values?.confirmed !== true) return
    if (this.state.targetArtifactUid === artifactUid) this.state.targetArtifactUid = undefined
    await this.mutate({ kind: 'discard-draft', workspaceId: this.state.workspaceId!, artifactUid })
  }

  private async configureDevelopmentTargets(): Promise<void> {
    const snapshot = this.state.snapshot; const workItem = snapshot?.workItems.find(item => item.uid === this.state.workItemUid)
    if (snapshot?.project === undefined || workItem === undefined) return
    const scope = snapshot.project.development.repositories.filter(repository => workItem.repositoryScope?.includes(repository.id))
    if (scope.length === 0) { this.state.error = '请先在系统设计阶段确认代码仓库范围'; return this.render() }
    const values = await this.openForm({
      title: `确认开发目标 · ${workItem.key}`, description: '选择本需求实际修改的仓库。OpenSpec 可选，路径相对于所选代码仓库。', submitLabel: '保存开发目标',
      fields: [
        ...scope.map(repository => ({ name: `target-${repository.id}`, label: `${repository.id} · ${repository.source}`, type: 'checkbox' as const, value: workItem.developmentTargets?.includes(repository.id) === true })),
        { name: 'openSpecEnabled', label: '在目标代码仓库中使用 OpenSpec', type: 'checkbox', value: workItem.openSpec?.enabled === true },
        { name: 'openSpecRepository', label: 'OpenSpec 所在仓库', type: 'select', value: workItem.openSpec?.repositoryId ?? scope[0]!.id, options: scope.map(repository => ({ value: repository.id, label: repository.id })) },
        { name: 'openSpecPath', label: 'OpenSpec 相对路径', type: 'text', value: workItem.openSpec?.path ?? 'openspec', placeholder: '例如：openspec' },
      ],
    })
    if (values === undefined) return
    const developmentTargets = scope.filter(repository => values[`target-${repository.id}`] === true).map(repository => repository.id)
    await this.mutate({ kind: 'update-work-item-settings', workspaceId: this.state.workspaceId!, workItemUid: workItem.uid, repositoryScope: workItem.repositoryScope ?? [], developmentTargets, openSpec: values.openSpecEnabled === true ? { enabled: true, repositoryId: String(values.openSpecRepository), path: String(values.openSpecPath) } : { enabled: false } })
  }

  private openForm(config: DialogConfig): Promise<DialogValues | undefined> {
    return new Promise(resolve => {
      const backdrop = document.createElement('div')
      backdrop.className = 'dsh-sdd-modal-backdrop'
      const fieldHtml = config.fields.map(field => {
        const required = field.required ? ' required' : ''
        const show = field.showWhen === undefined ? '' : ` data-show-field="${escapeHtml(field.showWhen.field)}" data-show-value="${escapeHtml(field.showWhen.value)}"`
        const help = field.help === undefined ? '' : `<span class="dsh-sdd-muted">${escapeHtml(field.help)}</span>`
        if (field.type === 'manual-items') return `<div class="dsh-sdd-field"${show}><label>${escapeHtml(field.label)}</label>${help}<div class="dsh-sdd-manual-items" data-manual-items="${escapeHtml(field.name)}"></div><button class="dsh-sdd-button" type="button" data-add-manual-item="${escapeHtml(field.name)}">＋ 添加子需求</button></div>`
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
      const rowError = (group: HTMLElement | null | undefined, message: string) => {
        if (group === null || group === undefined) return
        group.querySelector('[data-manual-error]')?.remove()
        const error = document.createElement('div'); error.className = 'dsh-sdd-error'; error.dataset.manualError = ''; error.textContent = message; group.appendChild(error)
      }
      const addManualItem = (name: string) => {
        const list = backdrop.querySelector<HTMLElement>(`[data-manual-items="${name}"]`)
        if (list === null) return
        const row = document.createElement('div')
        row.className = 'dsh-sdd-manual-item'
        row.innerHTML = `<input class="dsh-sdd-input" data-manual-key placeholder="子需求编号（可留空）"><input class="dsh-sdd-input" data-manual-title placeholder="子需求标题"><button class="dsh-sdd-button" type="button" data-remove-manual-item>删除</button><textarea class="dsh-sdd-input" data-manual-description placeholder="详细描述业务背景、场景、规则、边界、异常、验收想法等；可以输入多行长文本。"></textarea>`
        list.appendChild(row)
        row.querySelector<HTMLElement>('[data-remove-manual-item]')!.addEventListener('click', () => row.remove())
        row.querySelector<HTMLInputElement>('[data-manual-title]')!.focus()
        updateVisibility()
      }
      const updateVisibility = () => {
        backdrop.querySelectorAll<HTMLElement>('[data-show-field]').forEach(group => {
          const source = form.elements.namedItem(group.dataset.showField!) as HTMLInputElement | HTMLSelectElement | null
          const visible = source?.value === group.dataset.showValue
          group.hidden = !visible
          group.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input,select,textarea').forEach(control => { control.disabled = !visible })
        })
      }
      form.addEventListener('change', updateVisibility)
      backdrop.querySelectorAll<HTMLButtonElement>('[data-add-manual-item]').forEach(button => button.addEventListener('click', () => addManualItem(button.dataset.addManualItem!)))
      form.addEventListener('submit', event => {
        event.preventDefault()
        if (!form.reportValidity()) return
        const values: DialogValues = {}
        for (const field of config.fields) {
          if (field.type === 'manual-items') {
            const group = backdrop.querySelector<HTMLElement>(`[data-manual-items="${field.name}"]`)?.closest<HTMLElement>('.dsh-sdd-field')
            if (group?.hidden === true) continue
            group?.querySelector('[data-manual-error]')?.remove()
            const items = [...(group?.querySelectorAll<HTMLElement>('.dsh-sdd-manual-item') ?? [])].map(row => ({
              key: row.querySelector<HTMLInputElement>('[data-manual-key]')!.value.trim() || undefined,
              title: row.querySelector<HTMLInputElement>('[data-manual-title]')!.value.trim(),
              description: row.querySelector<HTMLTextAreaElement>('[data-manual-description]')!.value.trim() || undefined,
            })).filter(item => item.key !== undefined || item.title !== '' || item.description !== undefined)
            if (items.some(item => item.title === '')) { rowError(group, '每个子需求都必须填写标题'); return }
            values[field.name] = JSON.stringify(items)
            continue
          }
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
    const deliverableName = STAGE_ARTIFACT_TEMPLATES[this.state.menu].documentName
    const nextDefaultKey = `${stage.prefix}-${String((this.state.snapshot?.artifacts.reduce((largest, item) => { const match = new RegExp(`^${stage.prefix}-(\\d+)$`).exec(item.key); return match === null ? largest : Math.max(largest, Number(match[1])) }, 0) ?? 0) + 1).padStart(4, '0')}`
    const values = await this.openForm({
      title: `创建${deliverableName}草稿`, description: `插件将自动分配交付件编号 ${nextDefaultKey}。企业需求号、缺陷号等外部编号通过输入材料和追踪关系关联，不会替换该编号。当前勾选的输入材料会固定写入本版本，创建后将自动选中并可立即开始 AI 对话。`, submitLabel: `创建并选中${deliverableName}`,
      fields: [
        { name: 'title', label: '交付件标题', type: 'text', required: true, placeholder: '例如：订单部分退款需求' },
      ],
    })
    if (values === undefined) return
    const artifacts = this.state.snapshot?.artifacts ?? []; const sources = this.state.snapshot?.sources ?? []
    const before = new Set(artifacts.map(item => item.uid))
    await this.mutate({ kind: 'create-draft', workspaceId: this.state.workspaceId!, stage: this.state.menu, title: String(values.title), basedOn: [...this.state.selected].filter(uid => artifacts.some(item => item.uid === uid)), sourceUids: [...this.state.selected].filter(uid => sources.some(item => item.uid === uid)), ...(this.state.workItemUid === undefined ? {} : { workItemUid: this.state.workItemUid }) })
    const created = this.state.snapshot?.artifacts.find(item => !before.has(item.uid) && item.stage === this.state.menu && item.workItemUid === this.state.workItemUid && item.status === 'draft')
    if (created !== undefined) {
      this.state.targetArtifactUid = created.uid
      this.state.selected = new Set([...created.basedOn.map(item => item.uid), ...created.derivedFrom.map(item => item.uid)])
      this.render()
    }
  }

  private async createRevision(artifactUid: string): Promise<void> {
    const snapshot = this.state.snapshot; const previous = snapshot?.artifacts.find(item => item.uid === artifactUid)
    if (snapshot === undefined || previous === undefined) return
    this.state.loading = true; this.state.error = undefined; this.render()
    let response: SddResponse
    try { response = await call({ kind: 'preview-revision', workspaceId: this.state.workspaceId!, artifactUid }) }
    catch (error) { this.state.error = error instanceof Error ? error.message : String(error); this.state.loading = false; return this.render() }
    this.state.loading = false; this.render()
    if (!response.ok) { this.state.error = response.error; return this.render() }
    if (!('revisionPreview' in response)) { this.state.error = 'Host returned an unexpected revision preview'; return this.render() }
    const preview = response.revisionPreview
    const detail = preview.changes.length === 0 ? '当前来源、上游交付件和模板哈希均未变化。若是业务意图调整，请明确填写原因后创建修订'
      : `检测到 ${preview.changes.length} 项实际变化：${preview.changes.map(change => `${change.label}（${change.previous?.version ?? change.previous?.contentHash?.slice(0, 16) ?? '无'} → ${change.current?.version ?? change.current?.contentHash?.slice(0, 16) ?? '无'}）`).join('；')}`
    const values = await this.openForm({
      title: `创建变更修订 · ${preview.key} v${preview.nextVersion}`, description: `${detail}。旧会话保持只读，新修订将创建名称可区分的新会话并关联历史运行。`, submitLabel: '创建并选中变更修订',
      fields: [
        ...(preview.canCreateFromUpstream ? [{ name: 'revisionKind', label: '变更类型', type: 'select' as const, required: true, value: 'upstream', options: [{ value: 'upstream', label: '处理检测到的上游变更' }, { value: 'user-intent', label: '用户主动调整' }] }] : []),
        { name: 'reason', label: '主动调整原因', type: 'textarea', required: !preview.canCreateFromUpstream, placeholder: preview.canCreateFromUpstream ? '说明希望调整什么以及为什么调整；上游变更模式可以留空。' : '说明希望调整什么以及为什么调整。', showWhen: preview.canCreateFromUpstream ? { field: 'revisionKind', value: 'user-intent' } : undefined },
        { name: 'affectedAreas', label: '预计影响范围（可选，每行一项）', type: 'textarea', placeholder: '例如：退款业务规则\n验收条件 AC-03' },
      ],
    })
    if (values === undefined) return
    const revisionKind = preview.canCreateFromUpstream ? String(values.revisionKind) as 'upstream' | 'user-intent' : 'user-intent'
    const affectedAreas = String(values.affectedAreas ?? '').split(/\r?\n/).map(item => item.trim()).filter(Boolean)
    const before = new Set(snapshot.artifacts.map(item => item.uid))
    await this.mutate({ kind: 'create-revision', workspaceId: this.state.workspaceId!, artifactUid, revisionKind, reason: String(values.reason ?? ''), affectedAreas })
    const created = this.state.snapshot?.artifacts.find(item => !before.has(item.uid) && item.supersedes?.uid === artifactUid)
    if (created !== undefined) {
      this.state.targetArtifactUid = created.uid
      this.state.selected = new Set([...created.basedOn.map(item => item.uid), ...created.derivedFrom.map(item => item.uid)])
      this.render()
    }
  }

  private async importSource(forcedKind?: string): Promise<void> {
    const snapshot = this.state.snapshot; const providers = snapshot?.sourceProviders ?? []
    if (providers.length === 0) { this.state.error = '当前没有可用的业务数据获取方式'; return this.render() }
    const defaultKind = forcedKind ?? 'requirement'
    const kinds = [...new Set([defaultKind, 'requirement', 'defect', ...Object.keys(snapshot?.project?.sources ?? {})])]
    const kindLabels: Record<string, string> = { requirement: '需求', defect: '缺陷', issue: '问题' }
    const configured = snapshot?.project?.sources[defaultKind]
    const defaultProvider = configured !== undefined && providers.includes(configured.provider) ? configured.provider : providers.includes('manual') ? 'manual' : providers[0]!
    const connectors = snapshot?.connectors ?? []
    const manualKey = `MANUAL-${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}`
    const values = await this.openForm({
      title: '导入外部业务内容', description: '插件会读取外部系统中的原始事实并保存快照，AI 随后把它整合进当前阶段交付件。', submitLabel: '导入',
      fields: [
        ...(forcedKind === undefined ? [{ name: 'kind', label: '导入内容', type: 'select' as const, required: true, value: defaultKind, options: kinds.map(value => ({ value, label: kindLabels[value] ?? value })), help: '用于区分需求、缺陷或企业自定义事项类型。' }] : []),
        { name: 'provider', label: '获取方式', type: 'select', required: true, value: defaultProvider, options: providers.map(value => ({ value, label: value === 'manual' ? '手工录入（无需适配器）' : value === 'command' ? '项目业务适配器（command）' : `已安装适配器：${value}` })), help: '手工录入开箱即用；企业适配器用于自动读取外部系统。两者都会生成相同的标准来源和工作单元。' },
        { name: 'connector', label: '业务系统连接', type: 'select', required: true, value: configured?.connector ?? connectors[0], options: connectors.length === 0 ? [{ value: '', label: '尚未配置业务连接' }] : connectors.map(value => ({ value, label: value })), help: '来自 .sdd/business/connectors/，由项目业务开发人员维护。', showWhen: { field: 'provider', value: 'command' } },
        { name: 'key', label: '主编号', type: 'text', required: true, value: defaultProvider === 'manual' ? manualKey : '', placeholder: defaultKind === 'defect' ? '例如：BUG-1024' : '例如：PAY-381', help: '手工录入会预生成编号，也可以换成团队自己的编号。' },
        { name: 'manualTitle', label: '标题', type: 'text', required: true, placeholder: '例如：订单部分退款', help: '只需填写当前已知的最小信息，后续由需求讨论阶段的 AI 继续追问。', showWhen: { field: 'provider', value: 'manual' } },
        { name: 'manualDescription', label: '初始描述', type: 'textarea', placeholder: '例如：一笔订单需要支持分多次退款，具体次数和金额规则尚未确认。', showWhen: { field: 'provider', value: 'manual' } },
        { name: 'manualItems', label: '子需求（可选）', type: 'manual-items', help: '每个子需求分别填写编号、标题和不限行数的详细内容。留空时主需求本身形成一个工作单元。', showWhen: { field: 'provider', value: 'manual' } },
      ],
    })
    if (values === undefined) return
    const provider = String(values.provider); const connector = values.connector === undefined ? undefined : String(values.connector)
    if (provider === 'command' && !connector) { this.state.error = '请先在 .sdd/business/connectors/ 配置业务系统连接'; return this.render() }
    this.state.loading = true; this.state.error = undefined; this.render()
    try {
      const manualItems = JSON.parse(String(values.manualItems ?? '[]')) as Array<{ key?: string; title: string; description?: string }>
      const input = provider === 'manual' ? { title: String(values.manualTitle), description: String(values.manualDescription ?? ''), ...(manualItems.length === 0 ? {} : { items: manualItems }) } : undefined
      const response = await call({ kind: 'preview-source-import', workspaceId: this.state.workspaceId!, provider, sourceKind: forcedKind ?? String(values.kind), key: String(values.key), ...(connector ? { connector } : {}), ...(input === undefined ? {} : { input }) })
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
      const artifact = this.state.snapshot?.artifacts.find(item => item.uid === this.state.targetArtifactUid)
      if (artifact) {
        const prefix = artifact.revision?.kind === 'upstream' ? '[SDD变更·上游]' : artifact.revision?.kind === 'user-intent' ? '[SDD变更·主动]' : '[SDD]'
        void binding.session.rename(`${prefix} ${artifact.key} v${artifact.version} ${artifact.title}`)
      }
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
