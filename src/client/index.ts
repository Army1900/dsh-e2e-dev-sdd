import type { ClientContext, ISessions, IWorkspaces, WorkspaceId } from '@deepseek-ai/dsh-client-runtime/client'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { STAGES, STAGE_ARTIFACT_TEMPLATES, type ArtifactSummary, type BurnupPoint, type DeliveryCellStatus, type ProjectSnapshot, type RepositoryInspection, type SddAction, type SddResponse, type SourceImportDetail, type SourceSummary, type StageId, type StageRun, type StageTemplatePreview } from '../protocol.ts'
import { jsonPreviewHtml } from './json-preview.ts'
import { preferredSourceSelection } from './source-selection.ts'

export const name = 'dsh-e2e-dev-sdd-client'
export const inject = ['workspaces', 'sessions']

const API_PATH = '/api/dsh-e2e-dev-sdd'
const ACTIVE_ATTR = 'data-dsh-sdd-active'
type MenuId = 'dashboard' | 'settings' | StageId
const MENUS: Array<{ id: MenuId; label: string }> = [{ id: 'dashboard', label: '项目看板' }, ...STAGES, { id: 'settings', label: '项目设置' }]

const CSS = `
[data-dsh-sdd-view]{position:absolute;inset:0;display:none;z-index:70;overflow:auto;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#171717);font-family:var(--dsw-font-family,system-ui)}
html[${ACTIVE_ATTR}] [data-dsh-sdd-view]{display:block}html[${ACTIVE_ATTR}] [data-pane='conversation']>:not([data-dsh-sdd-view]),html[${ACTIVE_ATTR}] [class*='centerCol']>:not([data-dsh-sdd-view]){display:none!important}
.dsh-sdd-menu{box-sizing:border-box;display:flex;align-items:center;gap:8px;width:100%;height:36px;padding:0 10px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary,#666);cursor:pointer;font-size:13px;white-space:nowrap}.dsh-sdd-menu:hover,.dsh-sdd-menu[data-active]{background:var(--dsw-alias-interactive-bg-hover,#eee);color:var(--dsw-alias-label-primary,#111)}.dsh-sdd-menu[data-active]{font-weight:600}.dsh-sdd-menu svg{width:18px;height:18px;flex:none}.dsh-sdd-menu span{overflow:hidden;text-overflow:ellipsis}[data-dsh-frame][data-sidebar-collapsed] .dsh-sdd-menu{justify-content:center;width:36px;margin:0 auto 8px;padding:0;border-radius:50%}[data-dsh-frame][data-sidebar-collapsed] .dsh-sdd-menu span{display:none}
.dsh-sdd-page{box-sizing:border-box;width:100%;min-height:100%;padding:20px;max-width:1220px;margin:0 auto}.dsh-sdd-header{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px}.dsh-sdd-header h1{font-size:22px;margin:0;margin-right:auto}.dsh-sdd-header .dsh-sdd-select{min-width:0;max-width:min(360px,100%)}.dsh-sdd-select,.dsh-sdd-input{box-sizing:border-box;padding:8px 10px;border:1px solid var(--dsw-alias-border-l2,#ccc);border-radius:8px;background:var(--dsw-specific-input-major,#fff);color:inherit}.dsh-sdd-button{padding:8px 12px;border:1px solid var(--dsw-alias-border-l2,#ccc);border-radius:8px;background:var(--dsw-alias-bg-layer-2,#f5f5f5);color:inherit;cursor:pointer}.dsh-sdd-button:hover{filter:brightness(.97)}.dsh-sdd-button.primary{background:var(--dsw-alias-button-primary-fill,#3b63f3);border-color:transparent;color:var(--dsw-alias-label-primary-foreground,#fff)}.dsh-sdd-button:disabled{opacity:.5;cursor:not-allowed}
.dsh-sdd-grid{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:14px}@media(max-width:850px){.dsh-sdd-grid{grid-template-columns:minmax(0,1fr)}}.dsh-sdd-card{min-width:0;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:12px;background:var(--dsw-alias-bg-layer-2,#fafafa);padding:14px}.dsh-sdd-card h2{font-size:15px;margin:0 0 10px}.dsh-sdd-muted{font-size:12px;color:var(--dsw-alias-label-secondary,#666);overflow-wrap:anywhere}.dsh-sdd-list{display:flex;min-width:0;flex-direction:column;gap:8px}.dsh-sdd-row{display:grid;min-width:0;grid-template-columns:auto minmax(0,1fr) auto;align-items:start;gap:9px;padding:10px;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:9px;background:var(--dsw-alias-bg-base,#fff)}.dsh-sdd-row>span{min-width:0}.dsh-sdd-row strong{display:block;font-size:13px;overflow-wrap:anywhere}.dsh-sdd-badge{display:inline-block;max-width:100%;font-size:11px;padding:2px 6px;border-radius:999px;background:var(--dsw-alias-interactive-bg-hover,#eee);margin:0 0 4px 4px;overflow-wrap:anywhere}.dsh-sdd-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.dsh-sdd-error{padding:9px;border-radius:8px;background:#c5303018;color:#c53030;font-size:12px;overflow-wrap:anywhere}.dsh-sdd-empty{padding:18px;text-align:center;color:var(--dsw-alias-label-secondary,#666)}
.dsh-sdd-busy{position:sticky;top:8px;z-index:20;display:flex;align-items:center;gap:9px;margin:0 0 12px;padding:9px 12px;border:1px solid var(--dsw-alias-border-l2,#bbb);border-radius:9px;background:var(--dsw-alias-bg-base,#fff);box-shadow:0 4px 16px #0002;font-size:12px}.dsh-sdd-busy::before{content:"";width:12px;height:12px;flex:none;border:2px solid var(--dsw-alias-border-l2,#bbb);border-top-color:var(--dsw-alias-label-primary,#222);border-radius:50%;animation:dsh-sdd-spin .8s linear infinite}@keyframes dsh-sdd-spin{to{transform:rotate(360deg)}}
.dsh-sdd-page[aria-busy="true"] button:not([data-action="close"]),.dsh-sdd-page[aria-busy="true"] select,.dsh-sdd-page[aria-busy="true"] input{pointer-events:none;opacity:.65}
.dsh-sdd-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:14px}.dsh-sdd-stat{box-sizing:border-box;min-width:0;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:12px;padding:14px;background:var(--dsw-alias-bg-layer-2,#fafafa);overflow:hidden}.dsh-sdd-stat b{display:block;min-width:0;font-size:clamp(20px,2vw,25px);line-height:1.2;margin-top:5px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.dsh-sdd-workload-list{display:flex;flex-direction:column;gap:5px;max-height:86px;margin-top:8px;overflow:auto}.dsh-sdd-workload-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;font-size:12px}.dsh-sdd-workload-row span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dsh-sdd-workload-row strong{font-variant-numeric:tabular-nums;white-space:nowrap}.dsh-sdd-progress{height:8px;background:var(--dsw-alias-interactive-bg-hover,#e5e5e5);border-radius:999px;overflow:hidden;margin-top:7px}.dsh-sdd-progress span{display:block;height:100%;background:var(--dsw-alias-brand-primary,#3b63f3)}.dsh-sdd-stage-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}.dsh-sdd-stage-grid .dsh-sdd-stat{padding:12px}.dsh-sdd-stage-head{display:flex;align-items:flex-start;justify-content:space-between;gap:6px}.dsh-sdd-stage-head .dsh-sdd-badge{flex:none}.dsh-sdd-scroll-list{max-height:340px;overflow:auto;overscroll-behavior:contain;padding-right:3px}.dsh-sdd-dashboard-columns{align-items:start}.dsh-sdd-dashboard-columns>.dsh-sdd-card{max-height:430px;overflow:hidden}.dsh-sdd-dashboard-columns .dsh-sdd-checks{max-height:340px;overflow:auto;padding-right:4px}.dsh-sdd-trace-list{max-height:420px;overflow:auto;overscroll-behavior:contain}.dsh-sdd-checks{margin:7px 0 0;padding-left:17px;font-size:12px;overflow-wrap:anywhere}.dsh-sdd-checks li+li{margin-top:5px}.dsh-sdd-checks li[data-fail]{color:#c53030}.dsh-sdd-checks li[data-pass]{color:#238636}.dsh-sdd-wide{grid-column:1/-1}@media(max-width:1000px){.dsh-sdd-stats{grid-template-columns:repeat(3,minmax(0,1fr))}.dsh-sdd-stage-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:700px){.dsh-sdd-stats,.dsh-sdd-stage-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.dsh-sdd-page{padding:14px}.dsh-sdd-header{gap:8px}.dsh-sdd-header h1{width:100%;order:-1}.dsh-sdd-header .dsh-sdd-select{flex:1 1 220px}}@media(max-width:430px){.dsh-sdd-stats,.dsh-sdd-stage-grid{grid-template-columns:minmax(0,1fr)}}
.dsh-sdd-chart-grid,.dsh-sdd-dashboard-overview{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(320px,.85fr);gap:14px;margin-bottom:14px}.dsh-sdd-dashboard-overview{grid-template-columns:repeat(2,minmax(0,1fr))}.dsh-sdd-chart-legend{display:flex;flex-wrap:wrap;gap:8px 14px;margin-top:10px;font-size:11px;color:var(--dsw-alias-label-secondary,#666)}.dsh-sdd-chart-legend span{display:inline-flex;align-items:center;gap:5px}.dsh-sdd-legend-swatch{width:14px;height:9px;border:1px solid var(--dsw-alias-label-secondary,#666);border-radius:2px}.dsh-sdd-flow-list{display:flex;flex-direction:column;gap:10px}.dsh-sdd-flow-row{display:grid;grid-template-columns:72px minmax(0,1fr) 28px;align-items:center;gap:9px;font-size:12px}.dsh-sdd-flow-bar{display:flex;height:15px;overflow:hidden;border:1px solid var(--dsw-alias-border-l2,#bbb);border-radius:4px;background:var(--dsw-alias-bg-base,#fff)}.dsh-sdd-flow-segment{height:100%;min-width:0}.dsh-sdd-flow-segment[data-status="not-started"],.dsh-sdd-legend-swatch[data-status="not-started"]{background:transparent}.dsh-sdd-flow-segment[data-status="in-progress"],.dsh-sdd-legend-swatch[data-status="in-progress"]{background:var(--dsw-alias-label-tertiary,#aaa)}.dsh-sdd-flow-segment[data-status="ready-for-review"],.dsh-sdd-legend-swatch[data-status="ready-for-review"]{background:repeating-linear-gradient(90deg,var(--dsw-alias-label-secondary,#666) 0 2px,transparent 2px 4px)}.dsh-sdd-flow-segment[data-status="completed"],.dsh-sdd-legend-swatch[data-status="completed"]{background:var(--dsw-alias-label-primary,#222)}.dsh-sdd-flow-segment[data-status="blocked"],.dsh-sdd-legend-swatch[data-status="blocked"]{background:repeating-linear-gradient(135deg,var(--dsw-alias-label-primary,#222) 0 2px,transparent 2px 5px)}.dsh-sdd-burnup{display:block;width:100%;height:auto;min-height:210px;color:var(--dsw-alias-label-primary,#222)}.dsh-sdd-burnup-grid{stroke:var(--dsw-alias-border-l1,#ddd);stroke-width:1}.dsh-sdd-burnup-total{fill:none;stroke:currentColor;stroke-width:2;stroke-dasharray:6 4;opacity:.55}.dsh-sdd-burnup-completed{fill:none;stroke:currentColor;stroke-width:2.5}.dsh-sdd-burnup-point{fill:var(--dsw-alias-bg-base,#fff);stroke:currentColor;stroke-width:2}.dsh-sdd-burnup text{fill:var(--dsw-alias-label-secondary,#666);font:11px var(--dsw-font-family,system-ui)}.dsh-sdd-overview-list{display:flex;flex-direction:column;gap:11px;max-height:210px;overflow:auto}.dsh-sdd-overview-row{display:grid;grid-template-columns:minmax(90px,1fr) minmax(100px,1.4fr) auto;align-items:center;gap:9px;font-size:12px}.dsh-sdd-overview-row strong{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.dsh-sdd-matrix-toolbar{display:grid;grid-template-columns:minmax(180px,1fr) minmax(130px,.35fr) minmax(150px,.4fr) auto;gap:8px;align-items:center;margin:10px 0}.dsh-sdd-matrix-toolbar .dsh-sdd-input,.dsh-sdd-matrix-toolbar .dsh-sdd-select{width:100%;min-width:0}.dsh-sdd-matrix-scroll{max-height:480px;overflow:auto;overscroll-behavior:contain;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:9px}.dsh-sdd-matrix{width:100%;min-width:880px;border-collapse:separate;border-spacing:0;font-size:12px}.dsh-sdd-matrix th,.dsh-sdd-matrix td{padding:7px;border-right:1px solid var(--dsw-alias-border-l1,#ddd);border-bottom:1px solid var(--dsw-alias-border-l1,#ddd);background:var(--dsw-alias-bg-base,#fff)}.dsh-sdd-matrix th{position:sticky;top:0;z-index:2;background:var(--dsw-alias-bg-layer-2,#fafafa);text-align:left}.dsh-sdd-matrix th:first-child,.dsh-sdd-matrix td:first-child{position:sticky;left:0;z-index:1;width:260px;min-width:260px}.dsh-sdd-matrix th:first-child{z-index:3}.dsh-sdd-matrix tr:last-child td{border-bottom:0}.dsh-sdd-matrix th:last-child,.dsh-sdd-matrix td:last-child{border-right:0}.dsh-sdd-matrix-work{display:block;max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dsh-sdd-matrix-meta{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:4px}.dsh-sdd-matrix-meta .dsh-sdd-badge{margin:0}.dsh-sdd-matrix-cell{box-sizing:border-box;width:100%;min-width:92px;padding:7px 6px;border:1px solid var(--dsw-alias-border-l2,#bbb);border-radius:5px;background:transparent;color:inherit;font-size:11px;cursor:pointer}.dsh-sdd-matrix-cell[data-status="not-started"]{cursor:default;color:var(--dsw-alias-label-tertiary,#999)}.dsh-sdd-matrix-cell[data-status="in-progress"]{background:var(--dsw-alias-interactive-bg-hover,#e5e5e5)}.dsh-sdd-matrix-cell[data-status="ready-for-review"]{background:repeating-linear-gradient(90deg,var(--dsw-alias-interactive-bg-hover,#ddd) 0 3px,transparent 3px 6px)}.dsh-sdd-matrix-cell[data-status="completed"]{background:var(--dsw-alias-label-primary,#222);border-color:var(--dsw-alias-label-primary,#222);color:var(--dsw-alias-bg-base,#fff)}.dsh-sdd-matrix-cell[data-status="blocked"]{border:2px solid var(--dsw-alias-label-primary,#222);background:repeating-linear-gradient(135deg,var(--dsw-alias-interactive-bg-hover,#ddd) 0 3px,transparent 3px 7px)}@media(max-width:900px){.dsh-sdd-chart-grid,.dsh-sdd-dashboard-overview{grid-template-columns:minmax(0,1fr)}.dsh-sdd-matrix-toolbar{grid-template-columns:1fr 1fr}.dsh-sdd-matrix-toolbar .dsh-sdd-input{grid-column:1/-1}}@media(max-width:560px){.dsh-sdd-matrix-toolbar{grid-template-columns:1fr}}
.dsh-sdd-modal-backdrop{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;background:#0008}.dsh-sdd-modal{box-sizing:border-box;width:min(520px,100%);max-height:min(760px,calc(100vh - 40px));overflow:auto;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:14px;background:var(--dsw-alias-bg-base,#fff);box-shadow:0 20px 60px #0005}.dsh-sdd-modal-header{padding:18px 20px 10px}.dsh-sdd-modal-header h2{margin:0 0 6px;font-size:18px}.dsh-sdd-modal-body{display:flex;flex-direction:column;gap:14px;padding:8px 20px 18px}.dsh-sdd-field{display:flex;flex-direction:column;gap:6px}.dsh-sdd-field>label{font-size:13px;font-weight:600}.dsh-sdd-field textarea{min-height:88px;resize:vertical}.dsh-sdd-field[hidden]{display:none}.dsh-sdd-checkbox{display:grid;grid-template-columns:auto 1fr;align-items:start;gap:9px;padding:10px;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:9px}.dsh-sdd-checkbox input{margin-top:2px}.dsh-sdd-modal-footer{display:flex;justify-content:flex-end;gap:8px;padding:14px 20px;border-top:1px solid var(--dsw-alias-border-l1,#ddd);background:var(--dsw-alias-bg-layer-2,#fafafa)}.dsh-sdd-checkbox-detail{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:start;gap:8px}.dsh-sdd-checkbox-detail .dsh-sdd-checkbox{height:100%;box-sizing:border-box}.dsh-sdd-source-detail{width:min(1080px,100%)}.dsh-sdd-source-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.dsh-sdd-source-detail-grid[data-columns="1"]{grid-template-columns:minmax(0,1fr)}.dsh-sdd-source-detail-grid>section{min-width:0}.dsh-sdd-source-panel{padding:12px;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:9px;background:var(--dsw-alias-bg-layer-2,#fafafa)}.dsh-sdd-source-panel>h3{margin:0 0 10px;font-size:13px}.dsh-sdd-source-detail pre{max-height:52vh;white-space:pre-wrap;overflow:auto;overflow-wrap:anywhere}.dsh-sdd-json-object{display:flex;flex-direction:column;gap:6px;min-width:0}.dsh-sdd-json-row{display:grid;grid-template-columns:minmax(92px,.28fr) minmax(0,.72fr);gap:9px;align-items:start;padding:7px;border-left:2px solid var(--dsw-alias-border-l2,#bbb);background:var(--dsw-alias-bg-base,#fff)}.dsh-sdd-json-key{font:600 11px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere}.dsh-sdd-json-value{min-width:0;font-size:12px}.dsh-sdd-json-text{white-space:pre-wrap;overflow-wrap:anywhere;max-height:240px;overflow:auto}.dsh-sdd-json-literal{font:12px ui-monospace,SFMono-Regular,Consolas,monospace}.dsh-sdd-json-expand{padding:5px 8px;border:1px dashed var(--dsw-alias-border-l2,#bbb);border-radius:6px;background:transparent;color:inherit;cursor:pointer;font-size:11px;text-align:left}.dsh-sdd-json-html{box-sizing:border-box;max-height:360px;overflow:auto;padding:10px;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:7px;background:var(--dsw-alias-bg-base,#fff);line-height:1.6}.dsh-sdd-json-html table{display:block;max-width:100%;overflow:auto;border-collapse:collapse}.dsh-sdd-json-html th,.dsh-sdd-json-html td{padding:5px 7px;border:1px solid var(--dsw-alias-border-l1,#ddd)}.dsh-sdd-json-html-source{margin-top:6px}.dsh-sdd-json-html-source summary{cursor:pointer;font-size:11px;color:var(--dsw-alias-label-secondary,#666)}.dsh-sdd-json-html-source pre{margin-top:6px;max-height:180px}@media(max-width:720px){.dsh-sdd-source-detail-grid{grid-template-columns:1fr}.dsh-sdd-checkbox-detail{grid-template-columns:1fr}.dsh-sdd-checkbox-detail button{justify-self:start}.dsh-sdd-json-row{grid-template-columns:1fr}.dsh-sdd-json-key{border-bottom:1px solid var(--dsw-alias-border-l1,#ddd);padding-bottom:3px}}
.dsh-sdd-template-modal{width:min(900px,100%)}.dsh-sdd-template-preview{display:block;box-sizing:border-box;width:100%;margin:0;padding:16px;max-height:60vh;overflow:auto;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:9px;background:var(--dsw-alias-bg-layer-2,#fafafa);color:inherit;font:12px/1.65 ui-monospace,SFMono-Regular,Consolas,"Liberation Mono",monospace;text-align:left;white-space:pre;word-break:normal;overflow-wrap:normal;tab-size:2;direction:ltr}
.dsh-sdd-manual-items{display:flex;flex-direction:column;gap:10px}.dsh-sdd-manual-item{display:grid;grid-template-columns:minmax(120px,.35fr) minmax(180px,.65fr) auto;gap:8px;padding:10px;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:9px;background:var(--dsw-alias-bg-layer-2,#fafafa)}.dsh-sdd-manual-item textarea{grid-column:1/-1;min-height:100px}.dsh-sdd-manual-item button{align-self:start}@media(max-width:650px){.dsh-sdd-manual-item{grid-template-columns:1fr}.dsh-sdd-manual-item textarea{grid-column:1}.dsh-sdd-manual-item button{justify-self:end}}
.dsh-sdd-package-modal{width:min(1120px,100%)}.dsh-sdd-package{display:grid;grid-template-columns:minmax(230px,.32fr) minmax(0,1fr);gap:12px;min-height:480px}.dsh-sdd-file-tree{max-height:62vh;overflow:auto;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:9px;padding:6px;background:var(--dsw-alias-bg-layer-2,#fafafa)}.dsh-sdd-file-row{display:flex;align-items:center;width:100%;gap:6px;padding:7px 8px;border:0;border-radius:6px;background:transparent;color:inherit;text-align:left;cursor:pointer;font:12px ui-monospace,SFMono-Regular,Consolas,monospace}.dsh-sdd-file-row:hover,.dsh-sdd-file-row[data-selected]{background:var(--dsw-alias-interactive-bg-hover,#e8e8e8)}.dsh-sdd-preview-pane{min-width:0}.dsh-sdd-preview-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}.dsh-sdd-preview-toolbar strong{margin-right:auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dsh-sdd-markdown{box-sizing:border-box;max-height:56vh;overflow:auto;padding:18px;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:9px;background:var(--dsw-alias-bg-base,#fff);line-height:1.65}.dsh-sdd-markdown h1,.dsh-sdd-markdown h2,.dsh-sdd-markdown h3{margin-top:1.3em}.dsh-sdd-markdown pre,.dsh-sdd-markdown code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}.dsh-sdd-markdown pre{overflow:auto;padding:12px;border-radius:7px;background:var(--dsw-alias-bg-layer-2,#f5f5f5)}.dsh-sdd-markdown table{border-collapse:collapse;max-width:100%;display:block;overflow:auto}.dsh-sdd-markdown th,.dsh-sdd-markdown td{border:1px solid var(--dsw-alias-border-l1,#ddd);padding:6px 9px}.dsh-sdd-image-preview{display:flex;align-items:center;justify-content:center;min-height:360px;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:9px;background:var(--dsw-alias-bg-layer-2,#fafafa)}.dsh-sdd-image-preview img{max-width:100%;max-height:56vh}.dsh-sdd-file-note{padding:30px;text-align:center;border:1px dashed var(--dsw-alias-border-l1,#ddd);border-radius:9px;color:var(--dsw-alias-label-secondary,#666)}@media(max-width:760px){.dsh-sdd-package{grid-template-columns:1fr}.dsh-sdd-file-tree{max-height:220px}}
.dsh-sdd-flow-segment[data-status="not-applicable"],.dsh-sdd-legend-swatch[data-status="not-applicable"]{background:repeating-linear-gradient(45deg,transparent 0 3px,var(--dsw-alias-border-l2,#bbb) 3px 4px)}.dsh-sdd-matrix-cell[data-status="not-applicable"]{color:var(--dsw-alias-label-secondary,#666);border-style:dashed;background:transparent}
.dsh-sdd-bounded-list{max-height:320px;overflow:auto;overscroll-behavior:contain;padding-right:3px}.dsh-sdd-input-summary{max-height:250px}.dsh-sdd-history{margin-top:10px;border-top:1px solid var(--dsw-alias-border-l1,#ddd);padding-top:9px}.dsh-sdd-history summary{cursor:pointer;font-size:12px;color:var(--dsw-alias-label-secondary,#666)}.dsh-sdd-history[open] summary{margin-bottom:9px}.dsh-sdd-settings-grid{align-items:start}.dsh-sdd-settings-grid code{overflow-wrap:anywhere}
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
  detail?: () => void
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
  dashboardQuery: string
  dashboardKind: 'all' | 'requirement' | 'defect' | 'custom'
  dashboardStatus: 'all' | 'changed' | DeliveryCellStatus
}

async function call(action: SddAction): Promise<SddResponse> {
  const timeout = action.kind === 'bind-session' || action.kind === 'context' ? 330_000
    : action.kind === 'development-install-openspec' ? 330_000
    : action.kind === 'development-initialize-openspec' ? 210_000
      : action.kind === 'development-fork-openspec-schema' || action.kind === 'development-create-openspec-change' || action.kind === 'development-inspect-openspec-templates' ? 75_000
      : action.kind === 'project-git-fetch' || action.kind === 'project-git-sync' || action.kind === 'project-git-push' ? 210_000
        : action.kind === 'add-project-repository' || action.kind === 'inspect-project-repository' || action.kind === 'initialize-project-repository' || action.kind === 'update-project-repository-branch' ? 75_000 : 20_000
  const response = await fetch(API_PATH, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(action), signal: AbortSignal.timeout(timeout) })
  return await response.json() as SddResponse
}

function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!) }
function stageMenu(menu: MenuId): menu is StageId { return STAGES.some(stage => stage.id === menu) }
function markdownHtml(value: string): string { return DOMPurify.sanitize(marked.parse(value, { async: false, gfm: true }) as string, { USE_PROFILES: { html: true } }) }
function sanitizedRichHtml(value: string): string {
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: ['p', 'div', 'span', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'blockquote', 'pre', 'code', 'strong', 'b', 'em', 'i', 'u', 's', 'a', 'hr'],
    ALLOWED_ATTR: ['href', 'title', 'colspan', 'rowspan'], ALLOW_DATA_ATTR: false,
  })
}
function mountJsonPreview(container: HTMLElement, value: unknown): void {
  const expanded = new Set<string>()
  const render = () => {
    container.innerHTML = jsonPreviewHtml(value, { escapeHtml, sanitizeHtml: sanitizedRichHtml, expanded })
    container.querySelectorAll<HTMLButtonElement>('[data-json-expand]').forEach(button => button.addEventListener('click', () => { expanded.add(button.dataset.jsonExpand!); render() }))
  }
  render()
}
function sidebarRoot(): HTMLElement | undefined { const column = document.querySelector<HTMLElement>('[data-pane="sidebar"], [class*="sidebarCol"]'); return column?.querySelector<HTMLElement>('[class*="logoRow"]')?.parentElement ?? column?.firstElementChild as HTMLElement | undefined }
function menuAnchor(root: HTMLElement): Element | undefined { const button = root.querySelector<HTMLButtonElement>('button[class*="newSession"]'); const row = button?.closest('[class*="logoRow"]'); return (row !== null && row?.parentElement === root ? row : button) ?? undefined }
function icon(menu: MenuId): string {
  const paths: Record<MenuId, string> = {
    dashboard: '<rect x="3" y="3" width="5.5" height="5.5" rx="1"/><rect x="11.5" y="3" width="5.5" height="3.5" rx="1"/><rect x="3" y="11.5" width="5.5" height="5.5" rx="1"/><rect x="11.5" y="9.5" width="5.5" height="7.5" rx="1"/>',
    settings: '<circle cx="10" cy="10" r="2.5"/><path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4"/>',
    requirements: '<path d="M6 3.5h6l3 3V16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M12 3.5V7h3M7.5 10h5M7.5 13h3.5"/><path d="m7.2 15.1.8.8 1.5-1.7"/>',
    prototype: '<rect x="2.75" y="3" width="14.5" height="14" rx="2"/><path d="M3 7h14M7.5 7v10M10 10h4.5M10 13h3M5.1 5h.1"/>',
    architecture: '<rect x="7" y="2.5" width="6" height="4" rx="1"/><rect x="2.5" y="13.5" width="5" height="4" rx="1"/><rect x="12.5" y="13.5" width="5" height="4" rx="1"/><path d="M10 6.5v3M5 13.5v-4h10v4"/>',
    specification: '<path d="M5 3.5h8l2 2V16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M13 3.5V6h2M8 8.5 6.5 10 8 11.5M12 8.5l1.5 1.5-1.5 1.5M9.5 13.5h3"/>',
    development: '<circle cx="5" cy="5" r="1.75"/><circle cx="5" cy="15" r="1.75"/><circle cx="14.5" cy="6.5" r="1.75"/><path d="M5 6.75v6.5M6.75 5h2a4 4 0 0 1 4 4v1"/><path d="m11.5 13.5 1.7 1.7 3.3-3.7"/>',
  }
  return `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[menu]}</svg>`
}

class SddWorkbench {
  private readonly state: RuntimeState = { menu: 'dashboard', selected: new Set(), loading: false, dashboardQuery: '', dashboardKind: 'all', dashboardStatus: 'all' }
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

  private open(menu: MenuId): void {
    this.state.menu = menu; this.state.selected.clear(); this.state.targetArtifactUid = undefined
    document.documentElement.setAttribute(ACTIVE_ATTR, ''); this.syncMenus()
    const snapshot = this.state.snapshot
    if (snapshot !== undefined && snapshot.workspace.workspaceId === this.state.workspaceId) {
      this.reconcileSelection(snapshot); this.render(); return
    }
    void this.refresh()
  }
  private close(): void { document.documentElement.removeAttribute(ACTIVE_ATTR); this.menuButtons.forEach(button => delete button.dataset.active) }
  private syncMenus(): void { this.menuButtons.forEach((button, id) => { if (document.documentElement.hasAttribute(ACTIVE_ATTR) && id === this.state.menu) button.dataset.active = 'true'; else delete button.dataset.active }) }

  private async refresh(): Promise<void> {
    if (this.state.workspaceId === undefined) return this.render()
    this.state.loading = true; this.state.error = undefined; this.render()
    try {
      const response = await call({ kind: 'snapshot', workspaceId: this.state.workspaceId }); if (!response.ok) throw new Error(response.error); if (!('snapshot' in response)) throw new Error('Host returned an unexpected response')
      this.state.snapshot = response.snapshot
      this.reconcileSelection(response.snapshot)
    }
    catch (error) { this.state.error = error instanceof Error ? error.message : String(error) }
    finally { this.state.loading = false; this.render() }
  }

  private reconcileSelection(snapshot: ProjectSnapshot): void {
      const deliveryWorkItems = snapshot.workItems.filter(item => item.executionMode !== 'attached')
      if (this.state.workItemUid === undefined || !deliveryWorkItems.some(item => item.uid === this.state.workItemUid)) {
        const workItem = deliveryWorkItems.find(item => item.status !== 'completed')
        this.state.workItemUid = workItem?.uid
        this.state.selected = workItem === undefined ? new Set() : this.workItemSourceUids(snapshot, workItem.uid, stageMenu(this.state.menu) ? this.state.menu : undefined)
        this.state.targetArtifactUid = undefined
      }
      if (stageMenu(this.state.menu)) {
        const selectable = snapshot.artifacts.filter(item => item.workItemUid === this.state.workItemUid && item.stage === this.state.menu && (item.status === 'draft' || item.status === 'in-review'))
        if (!selectable.some(item => item.uid === this.state.targetArtifactUid)) {
          const only = selectable.length === 1 ? selectable[0] : undefined
          this.state.targetArtifactUid = only?.uid
          if (only !== undefined) this.state.selected = new Set([...only.basedOn.map(item => item.uid), ...only.derivedFrom.map(item => item.uid)])
          else if (this.state.selected.size === 0) this.state.selected = this.defaultInputs(snapshot, this.state.menu)
        }
      }
  }

  private defaultInputs(snapshot: ProjectSnapshot, stage: StageId): Set<string> {
    const workItem = snapshot.workItems.find(item => item.uid === this.state.workItemUid)
    const selected = workItem === undefined ? new Set<string>() : this.workItemSourceUids(snapshot, workItem.uid, stage)
    const stageIndex = STAGES.findIndex(item => item.id === stage)
    for (const upstream of STAGES.slice(0, stageIndex)) {
      const latest = snapshot.artifacts.filter(item => item.workItemUid === workItem?.uid && item.stage === upstream.id && item.status === 'accepted').sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0]
      if (latest !== undefined) selected.add(latest.uid)
    }
    return selected
  }

  private workItemSourceUids(snapshot: ProjectSnapshot, workItemUid: string, stage?: StageId): Set<string> {
    const includeAttached = stage === undefined || stage === 'specification' || stage === 'development'
    const owned = snapshot.workItems.filter(item => item.uid === workItemUid || (includeAttached && item.status !== 'completed' && item.executionMode === 'attached' && item.parentWorkItemUid === workItemUid))
    return new Set(owned.flatMap(item => [item.sourceUid, item.bundleSourceUid]).filter((uid): uid is string => uid !== undefined))
  }

  private render(): void {
    if (this.container === undefined) return
    const workspaceState = this.workspaces.list.getSnapshot(); const options = workspaceState.items.map(item => `<option value="${escapeHtml(item.workspaceId as string)}"${item.workspaceId === this.state.workspaceId ? ' selected' : ''}>${escapeHtml(item.title || item.path)}</option>`).join('')
    const title = this.state.menu === 'dashboard' ? '项目看板' : this.state.menu === 'settings' ? '项目设置' : STAGES.find(item => item.id === this.state.menu)!.label
    if (this.state.workspaceId === undefined) { this.container.innerHTML = '<div class="dsh-sdd-page"><div class="dsh-sdd-empty">请先在 DSH 中打开一个 Workspace。</div></div>'; return }
    const snapshot = this.state.snapshot
    const deliveryWorkItems = snapshot?.workItems.filter(item => item.executionMode !== 'attached') ?? []
    const workItemOptions = deliveryWorkItems.map(item => `<option value="${escapeHtml(item.uid)}"${item.uid === this.state.workItemUid ? ' selected' : ''}>${escapeHtml(item.key)} · ${escapeHtml(item.title)}${item.status === 'change-pending' ? ' · 有变更' : item.status === 'removed-pending' ? ' · 已移除' : ''}</option>`).join('')
    const workItemSelect = snapshot !== undefined && deliveryWorkItems.length > 0 && this.state.menu !== 'settings' ? `<select class="dsh-sdd-select" data-action="work-item" title="当前交付工作单元">${workItemOptions}</select>` : ''
    let body = ''
    if (this.state.loading && snapshot === undefined) body = '<div class="dsh-sdd-empty">正在读取 SDD 项目…</div>'
    else if (snapshot?.configuration.status === 'missing') body = this.initializationHtml()
    else if (snapshot?.configuration.status === 'invalid') body = this.invalidConfigurationHtml(snapshot)
    else if (snapshot !== undefined) body = this.state.menu === 'dashboard' ? this.dashboardHtml(snapshot) : this.state.menu === 'settings' ? this.settingsHtml(snapshot) : this.workbenchHtml(snapshot, this.state.menu)
    const busy = this.state.loading && snapshot !== undefined ? '<div class="dsh-sdd-busy" role="status">正在应用变更并更新项目状态，当前页面可以继续查看…</div>' : ''
    this.container.innerHTML = `<div class="dsh-sdd-page"${this.state.loading ? ' aria-busy="true"' : ''}><header class="dsh-sdd-header"><button class="dsh-sdd-button" data-action="close">返回对话</button><h1>${title}</h1><select class="dsh-sdd-select" data-action="workspace">${options}</select>${workItemSelect}<button class="dsh-sdd-button" data-action="refresh">刷新</button></header>${this.state.error ? `<div class="dsh-sdd-error">${escapeHtml(this.state.error)}</div>` : ''}${busy}${body}</div>`
    this.bind()
  }

  private updateBusy(active: boolean, message = '正在应用变更并更新项目状态，当前页面可以继续查看…'): void {
    this.state.loading = active
    const page = this.container?.querySelector<HTMLElement>('.dsh-sdd-page')
    if (page === null || page === undefined) { this.render(); return }
    page.querySelector('[data-sdd-busy]')?.remove()
    if (!active) { page.removeAttribute('aria-busy'); return }
    page.setAttribute('aria-busy', 'true')
    const busy = document.createElement('div'); busy.className = 'dsh-sdd-busy'; busy.dataset.sddBusy = ''; busy.role = 'status'; busy.textContent = message
    page.querySelector('.dsh-sdd-header')?.insertAdjacentElement('afterend', busy)
  }

  private initializationHtml(): string { return '<section class="dsh-sdd-card"><h2>初始化 SDD 项目</h2><p>当前目录还不是有效的 SDD 项目。初始化会创建 <code>.sdd/project.yaml</code>、五阶段交付件目录、来源、运行、开发和事件目录，并更新 <code>.gitignore</code>。</p><p class="dsh-sdd-muted">已有业务代码和其他文件不会被修改。</p><button class="dsh-sdd-button primary" data-action="initialize">初始化项目</button></section>' }

  private invalidConfigurationHtml(snapshot: ProjectSnapshot): string {
    return `<section class="dsh-sdd-card"><h2>SDD 项目配置不合法</h2><p>检测到 <code>${escapeHtml(snapshot.configuration.path)}</code>，但当前配置不能安全运行。请修复下列问题，或备份旧配置后重新生成默认配置。</p><ul class="dsh-sdd-checks">${snapshot.configuration.errors.map(error => `<li data-fail>${escapeHtml(error)}</li>`).join('')}</ul><div class="dsh-sdd-actions"><button class="dsh-sdd-button" data-action="refresh">重新检查</button><button class="dsh-sdd-button primary" data-action="reinitialize">备份并重新初始化</button></div></section>`
  }

  private dashboardHtml(snapshot: ProjectSnapshot): string {
    const dashboard = snapshot.dashboard
    const stat = (label: string, value: string, note: string) => `<div class="dsh-sdd-stat"><span class="dsh-sdd-muted">${label}</span><b>${value}</b><span class="dsh-sdd-muted">${note}</span></div>`
    const repositoryCount = snapshot.project?.development.repositories.length ?? 0
    const projectGit = snapshot.projectRepository
    const gitNote = projectGit?.isRepository !== true ? '当前工作空间尚未初始化 Git 仓库'
      : !projectGit.exactWorkspaceRoot ? '当前工作空间不是 Git 仓库根目录'
        : `${projectGit.branch ?? 'detached HEAD'} · ${projectGit.changedFiles} 个本地变更 · ahead ${projectGit.ahead} / behind ${projectGit.behind}${projectGit.keyConflicts.length ? ` · 编号冲突 ${projectGit.keyConflicts.length}` : ''}`
    return `<div class="dsh-sdd-grid" style="margin-bottom:14px"><section class="dsh-sdd-card"><h2>需求与缺陷管理</h2><p class="dsh-sdd-muted">从这里导入需求包或需要独立推进的缺陷；开发中的需求缺陷请进入对应需求后添加。</p><div class="dsh-sdd-actions"><button class="dsh-sdd-button primary" data-action="import-requirement">获取并预览需求包</button><button class="dsh-sdd-button" data-action="import-standalone-defect">获取并预览独立缺陷</button></div></section><section class="dsh-sdd-card"><h2>项目仓库与设置</h2><p class="dsh-sdd-muted">${escapeHtml(gitNote)}。已登记 ${repositoryCount} 个目标代码仓库；协作远程、同步和仓库规则统一在项目设置维护。</p><div class="dsh-sdd-actions"><button class="dsh-sdd-button" data-action="open-settings">打开项目设置</button></div></section></div><div class="dsh-sdd-stats">${stat('阶段完成度', `${dashboard.overallCompletion}%`, '全部适用阶段的已验收占比')}${stat('需求包', String(dashboard.requirements.packages), `${dashboard.workItems.requirements} 个需求工作单元`)}${stat('独立交付单元', String(dashboard.workItems.total), `需求 ${dashboard.workItems.requirements} · 缺陷 ${dashboard.workItems.standaloneDefects}`)}${stat('缺陷', String(dashboard.defects.total), `独立 ${dashboard.defects.standalone} · 需求内 ${dashboard.defects.attached}`)}${stat('待处理变化', String(dashboard.workItems.pendingChanges), '来源变更、移除或关联缺陷变化')}${stat('交付件', String(dashboard.artifacts.total), `草稿 ${dashboard.artifacts.drafts} · 已验收 ${dashboard.artifacts.accepted}`)}${stat('代码空间', String(dashboard.development.workspaces), `变更文件 ${dashboard.development.changedFiles} · 提交 ${dashboard.development.commits}`)}${stat('测试证据', String(dashboard.development.passingTests + dashboard.development.failingTests), `通过 ${dashboard.development.passingTests} · 失败 ${dashboard.development.failingTests}`)}</div>
      <div class="dsh-sdd-dashboard-overview">${this.defectOverviewHtml(snapshot)}${this.workloadOverviewHtml(snapshot)}</div>
      <div class="dsh-sdd-chart-grid">${this.stageFlowHtml(snapshot)}${this.burnupHtml(dashboard.burnup)}</div>
      ${this.deliveryMatrixHtml(snapshot)}
      <div class="dsh-sdd-grid dsh-sdd-dashboard-columns" style="margin-top:14px"><section class="dsh-sdd-card"><h2>质量与追踪</h2><p>来源追踪覆盖率：<strong>${dashboard.traceability}%</strong></p>${dashboard.blockers.length === 0 ? '<div class="dsh-sdd-empty">当前没有结构化阻塞项</div>' : `<ul class="dsh-sdd-checks">${dashboard.blockers.map(item => `<li data-fail>${escapeHtml(item)}</li>`).join('')}</ul>`}</section><section class="dsh-sdd-card"><h2>最近活动</h2>${dashboard.recentEvents.length === 0 ? '<div class="dsh-sdd-empty">暂无事件</div>' : `<div class="dsh-sdd-list dsh-sdd-scroll-list">${dashboard.recentEvents.slice(0, 10).map(event => `<div class="dsh-sdd-row"><span></span><span><strong>${escapeHtml(event.subject)}</strong><span class="dsh-sdd-muted">${escapeHtml(event.type)} · ${escapeHtml(event.time)}</span></span></div>`).join('')}</div>`}</section></div>${this.traceabilityHtml(snapshot)}`
  }

  private defectOverviewHtml(snapshot: ProjectSnapshot): string {
    const defects = snapshot.dashboard.defects
    const rows: Array<[string, number, number]> = [
      ['交付已覆盖', defects.deliveryCovered, defects.total], ['交付待覆盖', defects.deliveryPending, defects.total],
      ['业务状态已解决', defects.resolved, defects.total], ['业务状态未解决', defects.open, defects.total],
    ]
    const content = defects.total === 0 ? '<div class="dsh-sdd-empty">暂无缺陷</div>' : rows.map(([label, value, total]) => `<div class="dsh-sdd-overview-row"><span>${escapeHtml(label)}</span><div class="dsh-sdd-progress"><span style="width:${total === 0 ? 0 : Math.round(value / total * 100)}%"></span></div><strong>${value} / ${total}</strong></div>`).join('')
    return `<section class="dsh-sdd-card"><h2>缺陷交付概览</h2><p class="dsh-sdd-muted">独立缺陷走自己的流程；需求内缺陷由所属需求的开发交付覆盖。</p><div class="dsh-sdd-overview-list">${content}</div></section>`
  }

  private workloadOverviewHtml(snapshot: ProjectSnapshot): string {
    const workload = snapshot.dashboard.workload
    const content = workload.length === 0 ? '<div class="dsh-sdd-empty">业务适配器尚未提供工作量估算</div>' : workload.map(item => `<div class="dsh-sdd-overview-row" title="${escapeHtml(item.unit)} · 已完成 ${item.completed} / 总计 ${item.total}"><span>${escapeHtml(item.unit)}</span><div class="dsh-sdd-progress"><span style="width:${item.total === 0 ? 0 : Math.min(100, Math.round(item.completed / item.total * 100))}%"></span></div><strong>${item.completed} / ${item.total}</strong></div>`).join('')
    return `<section class="dsh-sdd-card"><h2>外部工作量</h2><p class="dsh-sdd-muted">按业务来源中的估算单位汇总，仅反映外部系统状态。</p><div class="dsh-sdd-overview-list">${content}</div></section>`
  }

  private settingsHtml(snapshot: ProjectSnapshot): string {
    const project = snapshot.project
    if (project === undefined) return ''
    const repositories = project.development.repositories
    const rows = repositories.map(repository => `<div class="dsh-sdd-row"><span></span><span><strong>${escapeHtml(repository.id)}</strong><span class="dsh-sdd-muted">${escapeHtml(repository.source)}<br>默认基线：${escapeHtml(repository.baseBranch)}</span></span><span><button class="dsh-sdd-button" data-change-repository-branch="${escapeHtml(repository.id)}">切换基线</button> <button class="dsh-sdd-button" data-remove-repository="${escapeHtml(repository.id)}">移除</button></span></div>`).join('')
    const dependencies = STAGES.map(stage => `${stage.label}：${Object.entries(project.dependencies[stage.id] ?? {}).map(([input, mode]) => `${STAGES.find(item => item.id === input)?.label ?? input}=${mode}`).join('、') || '无强制依赖'}`).join('\n')
    const git = snapshot.projectRepository
    const collaboration = project.collaboration ?? { remote: 'origin', baseBranch: 'main', syncStrategy: 'ff-only', commitScope: 'sdd' }
    const gitState = git?.isRepository !== true ? '未初始化 Git 仓库'
      : !git.exactWorkspaceRoot ? `工作空间位于仓库 ${git.repositoryRoot ?? ''} 内，但不是仓库根目录`
        : `${git.branch ?? 'detached HEAD'} @ ${git.headCommit?.slice(0, 8) ?? '无提交'} · ${git.changedFiles} 个变更（暂存 ${git.stagedFiles}、未跟踪 ${git.untrackedFiles}）· ahead ${git.ahead} / behind ${git.behind}`
    const conflictRows = (git?.keyConflicts ?? []).map(conflict => `<div class="dsh-sdd-row"><span>!</span><span><strong>${escapeHtml(conflict.key)} · ${escapeHtml(STAGES.find(item => item.id === conflict.stage)?.label ?? conflict.stage)}</strong><span class="dsh-sdd-muted">发现 ${conflict.lineageUids.length} 条不同 UID 血缘使用同一编号；状态：${escapeHtml(conflict.statuses.join('、'))}</span></span><span>${conflict.renamableArtifactUids.map(uid => `<button class="dsh-sdd-button" data-resolve-key-conflict="${escapeHtml(uid)}">调整草稿编号</button>`).join('') || '<span class="dsh-sdd-badge">需要人工处理</span>'}</span></div>`).join('')
    const gitConflicts = git?.conflictFiles.length ? `<div class="dsh-sdd-error">Git 冲突：${escapeHtml(git.conflictFiles.join('、'))}。插件不会自动覆盖，请先解决冲突并刷新。</div>` : ''
    const gitCard = `<section class="dsh-sdd-card dsh-sdd-wide"><h2>SDD 项目仓库协作</h2><p class="dsh-sdd-muted">${escapeHtml(gitState)}<br>远程：<code>${escapeHtml(collaboration.remote)}</code> · 协作基线：<code>${escapeHtml(collaboration.baseBranch)}</code> · 同步：<code>${escapeHtml(collaboration.syncStrategy)}</code> · 提交范围：<code>${escapeHtml(collaboration.commitScope)}</code>${git?.upstream ? `<br>当前跟踪：<code>${escapeHtml(git.upstream)}</code> · 状态 ${escapeHtml(git.divergence)}` : ''}</p>${gitConflicts}${conflictRows ? `<div class="dsh-sdd-list" style="margin-top:10px">${conflictRows}</div>` : ''}<div class="dsh-sdd-actions"><button class="dsh-sdd-button" data-action="configure-project-git">配置协作</button><button class="dsh-sdd-button" data-action="project-git-fetch"${git?.isRepository === true && git.exactWorkspaceRoot ? '' : ' disabled'}>获取远程状态</button><button class="dsh-sdd-button" data-action="project-git-sync"${git?.isRepository === true && git.exactWorkspaceRoot && git.changedFiles === 0 && git.conflictFiles.length === 0 && collaboration.syncStrategy === 'ff-only' ? '' : ' disabled'}>Fast-forward 同步</button><button class="dsh-sdd-button" data-action="project-git-commit"${git?.isRepository === true && git.exactWorkspaceRoot && git.changedFiles > 0 && git.conflictFiles.length === 0 ? '' : ' disabled'}>提交项目变更</button><button class="dsh-sdd-button primary" data-action="project-git-push"${git?.isRepository === true && git.exactWorkspaceRoot && git.conflictFiles.length === 0 ? '' : ' disabled'}>Push 当前分支</button></div><p class="dsh-sdd-muted">Fetch 不修改本地文件；同步只允许干净工作区上的 fast-forward。分叉、文本冲突和两个已验收交付件的编号冲突必须人工处理。</p></section>`
    return `<div class="dsh-sdd-grid dsh-sdd-settings-grid">${gitCard}<section class="dsh-sdd-card"><h2>项目代码仓库目录</h2><p class="dsh-sdd-muted">这里只登记项目可用仓库和默认基线，不会立即下载代码。具体需求在系统设计/规格设计中选择范围和开发目标。</p><div class="dsh-sdd-list dsh-sdd-bounded-list">${rows || '<div class="dsh-sdd-empty">尚未登记代码仓库</div>'}</div><div class="dsh-sdd-actions"><button class="dsh-sdd-button primary" data-action="add-repository">添加项目代码仓库</button></div></section><section class="dsh-sdd-card"><h2>开发空间规则</h2><p class="dsh-sdd-muted">隔离目录：<code>${escapeHtml(project.development.workspaceRoot)}</code></p><p class="dsh-sdd-muted">特性分支：<code>${escapeHtml(project.development.branchPattern)}</code></p><p class="dsh-sdd-muted">合并策略：<code>${escapeHtml(project.development.mergeStrategy)}</code>（当前版本仍只创建本地提交，不自动 push/合并）</p><h2 style="margin-top:18px">流程与扩展</h2><p class="dsh-sdd-muted">工作流：${escapeHtml(project.workflow?.mode ?? 'flexible')}<br><span style="white-space:pre-line">${escapeHtml(dependencies)}</span></p><p class="dsh-sdd-muted">插件通用业务扩展：<code>business/</code><br>项目业务扩展：<code>.sdd/business/</code><br>交付件模板：<code>.sdd/templates/</code><br>项目配置：<code>.sdd/project.yaml</code></p></section></div>`
  }

  private stageFlowHtml(snapshot: ProjectSnapshot): string {
    const labels: Array<[DeliveryCellStatus, string]> = [['not-started', '未开始'], ['not-applicable', '不适用'], ['in-progress', '进行中'], ['ready-for-review', '待评审'], ['completed', '已验收'], ['blocked', '阻塞/需复审']]
    const rows = snapshot.dashboard.stageFlow.map(flow => {
      const stage = STAGES.find(item => item.id === flow.stage)!
      const values: Record<DeliveryCellStatus, number> = { 'not-started': flow.notStarted, 'not-applicable': flow.notApplicable, 'in-progress': flow.inProgress, 'ready-for-review': flow.readyForReview, completed: flow.completed, blocked: flow.blocked }
      const count = Object.values(values).reduce((sum, value) => sum + value, 0); const scale = Math.max(1, count)
      const segments = labels.map(([status, label]) => values[status] === 0 ? '' : `<span class="dsh-sdd-flow-segment" data-status="${status}" style="width:${values[status] / scale * 100}%" title="${escapeHtml(label)} ${values[status]}"></span>`).join('')
      return `<div class="dsh-sdd-flow-row"><strong>${escapeHtml(stage.label)}</strong><div class="dsh-sdd-flow-bar">${segments}</div><span>${count}</span></div>`
    }).join('')
    const legend = labels.map(([status, label]) => `<span><i class="dsh-sdd-legend-swatch" data-status="${status}"></i>${escapeHtml(label)}</span>`).join('')
    return `<section class="dsh-sdd-card"><h2>五阶段流转</h2><p class="dsh-sdd-muted">按独立交付工作单元统计需求、独立缺陷和其他事项的阶段状态。</p><div class="dsh-sdd-flow-list">${rows || '<div class="dsh-sdd-empty">暂无工作单元</div>'}</div><div class="dsh-sdd-chart-legend">${legend}</div></section>`
  }

  private burnupHtml(points: BurnupPoint[]): string {
    if (points.length === 0) return '<section class="dsh-sdd-card"><h2>交付范围燃起图</h2><div class="dsh-sdd-empty">导入独立交付工作单元后开始记录范围与完成趋势。</div></section>'
    const width = 480; const height = 230; const left = 36; const right = 14; const top = 14; const bottom = 32
    const chartWidth = width - left - right; const chartHeight = height - top - bottom; const maximum = Math.max(1, ...points.flatMap(point => [point.total, point.completed]))
    const x = (index: number) => left + (points.length === 1 ? chartWidth / 2 : index / (points.length - 1) * chartWidth)
    const y = (value: number) => top + chartHeight - value / maximum * chartHeight
    const path = (selector: (point: BurnupPoint) => number) => points.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)},${y(selector(point)).toFixed(1)}`).join(' ')
    const completedPoints = points.map((point, index) => `<circle class="dsh-sdd-burnup-point" cx="${x(index).toFixed(1)}" cy="${y(point.completed).toFixed(1)}" r="3"><title>${escapeHtml(point.date)} 已完成 ${point.completed} / 范围 ${point.total}</title></circle>`).join('')
    return `<section class="dsh-sdd-card"><h2>交付范围燃起图</h2><p class="dsh-sdd-muted">虚线为需求、独立缺陷等交付范围，实线为开发测试阶段已验收数量；需求内缺陷不重复增加范围。</p><svg class="dsh-sdd-burnup" viewBox="0 0 ${width} ${height}" role="img" aria-label="交付范围燃起图"><line class="dsh-sdd-burnup-grid" x1="${left}" y1="${top}" x2="${left}" y2="${top + chartHeight}"/><line class="dsh-sdd-burnup-grid" x1="${left}" y1="${top + chartHeight}" x2="${left + chartWidth}" y2="${top + chartHeight}"/><line class="dsh-sdd-burnup-grid" x1="${left}" y1="${y(maximum)}" x2="${left + chartWidth}" y2="${y(maximum)}"/><path class="dsh-sdd-burnup-total" d="${path(point => point.total)}"/><path class="dsh-sdd-burnup-completed" d="${path(point => point.completed)}"/>${completedPoints}<text x="4" y="${y(maximum) + 4}">${maximum}</text><text x="20" y="${top + chartHeight + 4}">0</text><text x="${left}" y="${height - 8}">${escapeHtml(points[0]!.date.slice(5))}</text><text text-anchor="end" x="${left + chartWidth}" y="${height - 8}">${escapeHtml(points.at(-1)!.date.slice(5))}</text></svg></section>`
  }

  private deliveryMatrixHtml(snapshot: ProjectSnapshot): string {
    const labels: Record<DeliveryCellStatus, string> = { 'not-started': '未开始', 'not-applicable': '不适用', 'in-progress': '进行中', 'ready-for-review': '待评审', completed: '已验收', blocked: '阻塞/需复审' }
    const query = this.state.dashboardQuery.trim().toLocaleLowerCase()
    const filtered = snapshot.dashboard.deliveryMatrix.filter(row => {
      const kindMatch = this.state.dashboardKind === 'all' || (this.state.dashboardKind === 'custom' ? row.kind !== 'requirement' && row.kind !== 'defect' : row.kind === this.state.dashboardKind)
      const statusMatch = this.state.dashboardStatus === 'all' || (this.state.dashboardStatus === 'changed' ? row.workItemStatus === 'change-pending' || row.workItemStatus === 'removed-pending' : row.cells.some(cell => cell.status === this.state.dashboardStatus))
      return kindMatch && statusMatch && (query === '' || `${row.key} ${row.title}`.toLocaleLowerCase().includes(query))
    })
    const visible = filtered.slice(0, 200)
    const typeLabel = (kind: string) => kind === 'requirement' ? '需求' : kind === 'defect' ? '独立缺陷' : kind
    const rows = visible.map(row => {
      const defects = row.attachedDefects.total === 0 ? '' : `<span class="dsh-sdd-badge">需求内缺陷 ${row.attachedDefects.total} · 待覆盖 ${row.attachedDefects.pending}</span>`
      const changed = row.workItemStatus === 'change-pending' || row.workItemStatus === 'removed-pending' ? '<span class="dsh-sdd-badge">有变化</span>' : ''
      return `<tr><td><strong class="dsh-sdd-matrix-work" title="${escapeHtml(`${row.key} · ${row.title}`)}">${escapeHtml(row.key)} · ${escapeHtml(row.title)}</strong><span class="dsh-sdd-matrix-meta"><span class="dsh-sdd-badge">${escapeHtml(typeLabel(row.kind))}</span>${defects}${changed}</span></td>${row.cells.map(cell => `<td><button class="dsh-sdd-matrix-cell" data-status="${cell.status}" data-matrix-work-item="${escapeHtml(row.workItemUid)}" data-matrix-stage="${cell.stage}"${cell.artifactUid === undefined ? '' : ` data-matrix-artifact="${escapeHtml(cell.artifactUid)}"`} title="${escapeHtml(`${labels[cell.status]}${cell.artifactKey === undefined ? '' : ` · ${cell.artifactKey} v${cell.version}`}`)}">${escapeHtml(labels[cell.status])}</button></td>`).join('')}</tr>`
    }).join('')
    const toolbar = `<div class="dsh-sdd-matrix-toolbar"><input class="dsh-sdd-input" data-dashboard-query value="${escapeHtml(this.state.dashboardQuery)}" placeholder="搜索编号或标题"><select class="dsh-sdd-select" data-dashboard-kind><option value="all"${this.state.dashboardKind === 'all' ? ' selected' : ''}>全部类型</option><option value="requirement"${this.state.dashboardKind === 'requirement' ? ' selected' : ''}>需求</option><option value="defect"${this.state.dashboardKind === 'defect' ? ' selected' : ''}>独立缺陷</option><option value="custom"${this.state.dashboardKind === 'custom' ? ' selected' : ''}>其他</option></select><select class="dsh-sdd-select" data-dashboard-status><option value="all"${this.state.dashboardStatus === 'all' ? ' selected' : ''}>全部状态</option><option value="changed"${this.state.dashboardStatus === 'changed' ? ' selected' : ''}>有变化</option>${Object.entries(labels).map(([status, label]) => `<option value="${status}"${this.state.dashboardStatus === status ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('')}</select><button class="dsh-sdd-button" data-action="apply-dashboard-filter">应用筛选</button></div>`
    const count = `显示 ${visible.length} / ${filtered.length} 条${filtered.length !== snapshot.dashboard.deliveryMatrix.length ? `（总计 ${snapshot.dashboard.deliveryMatrix.length}）` : ''}`
    return `<section class="dsh-sdd-card" style="margin-top:14px"><h2>交付工作单元矩阵</h2><p class="dsh-sdd-muted">需求、独立缺陷和其他事项各占一行；需求内缺陷汇总到所属需求。点击阶段状态进入工作台。</p>${toolbar}<p class="dsh-sdd-muted">${count}</p>${rows === '' ? `<div class="dsh-sdd-empty">${snapshot.dashboard.deliveryMatrix.length === 0 ? '暂无交付工作单元' : '没有符合筛选条件的工作单元'}</div>` : `<div class="dsh-sdd-matrix-scroll"><table class="dsh-sdd-matrix"><thead><tr><th>交付工作单元</th>${STAGES.map(stage => `<th>${escapeHtml(stage.label)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>${filtered.length > 200 ? '<p class="dsh-sdd-muted">为保证页面性能，一次最多渲染 200 条，请使用筛选缩小范围。</p>' : ''}`}</section>`
  }

  private traceabilityHtml(snapshot: ProjectSnapshot): string {
    const workItem = snapshot.workItems.find(item => item.uid === this.state.workItemUid)
    if (workItem === undefined) return ''
    const artifacts = snapshot.artifacts.filter(item => item.workItemUid === workItem.uid && item.status !== 'superseded')
    const rows = STAGES.map(stage => {
      const items = artifacts.filter(item => item.stage === stage.id)
      const detail = items.length === 0 ? workItem.stageApplicability?.[stage.id]?.status === 'not-applicable' ? `不适用${workItem.stageApplicability[stage.id]?.reason ? `：${workItem.stageApplicability[stage.id]!.reason}` : ''}` : '—' : items.map(item => `${item.key} v${item.version} (${item.status}) ← ${item.basedOn.map(ref => artifacts.find(value => value.uid === ref.uid)?.key ?? ref.uid).join('、') || workItem.key}`).join('；')
      return `<div class="dsh-sdd-row"><span></span><span><strong>${escapeHtml(stage.label)}</strong><span class="dsh-sdd-muted">${escapeHtml(detail)}</span></span></div>`
    }).join('')
    return `<section class="dsh-sdd-card" style="margin-top:14px"><h2>交付追踪矩阵 · ${escapeHtml(workItem.key)}</h2><p class="dsh-sdd-muted">外部来源、实际采用的阶段交付件、固定输入版本及不适用阶段。</p><div class="dsh-sdd-list dsh-sdd-trace-list">${rows}</div></section>`
  }

  private workbenchHtml(snapshot: ProjectSnapshot, stage: StageId): string {
    const workItem = snapshot.workItems.find(item => item.uid === this.state.workItemUid)
    const stageIndex = STAGES.findIndex(item => item.id === stage)
    const accepted = snapshot.artifacts.filter(item => item.status === 'accepted' && STAGES.findIndex(stageItem => stageItem.id === item.stage) < stageIndex && item.workItemUid === this.state.workItemUid)
    const current = snapshot.artifacts.filter(item => item.stage === stage && item.workItemUid === this.state.workItemUid)
    const sourceUids = workItem === undefined ? new Set<string>() : this.workItemSourceUids(snapshot, workItem.uid, stage)
    const sources = workItem === undefined ? snapshot.sources.filter(item => snapshot.workItems.length === 0) : snapshot.sources.filter(item => sourceUids.has(item.uid))
    const importAction = stage === 'requirements' ? '<button class="dsh-sdd-button" data-action="import-requirement">获取并预览需求包</button>' : ''
    const attachedDefects = workItem === undefined ? [] : snapshot.workItems.filter(item => item.executionMode === 'attached' && item.parentWorkItemUid === workItem.uid)
    const attachedDefectsHtml = workItem?.kind !== 'requirement' ? '' : `<section class="dsh-sdd-card" style="margin-bottom:14px"><h2>本需求缺陷（${attachedDefects.filter(item => item.status !== 'completed').length}）</h2><p class="dsh-sdd-muted">这些缺陷保留独立业务编号和来源，但代码、测试与交付件归入当前需求，不单独展开五阶段流程。</p><div class="dsh-sdd-list dsh-sdd-bounded-list">${attachedDefects.map(item => `<div class="dsh-sdd-row"><span></span><span><strong>${escapeHtml(item.key)} · ${escapeHtml(item.title)}</strong><span class="dsh-sdd-muted">${escapeHtml(item.provider)} · ${escapeHtml(item.status)}</span></span><span><span class="dsh-sdd-badge">需求内缺陷</span>${item.status === 'removed-pending' ? `<button class="dsh-sdd-button" data-resolve-attached-removal="${escapeHtml(item.uid)}">处理移除</button>` : ''}</span></div>`).join('') || '<div class="dsh-sdd-empty">尚未关联缺陷</div>'}</div><div class="dsh-sdd-actions"><button class="dsh-sdd-button" data-action="import-attached-defect">获取并预览本需求缺陷</button></div></section>`
    const change = workItem?.change === undefined ? '' : `<div class="dsh-sdd-error"><strong>${workItem.status === 'removed-pending' ? '外部需求已被移除' : '检测到需求或关联缺陷变更'}</strong><br>${escapeHtml(workItem.change.changedPaths.join('、') || '外部状态变化')}<br>需要重新评审：${escapeHtml(workItem.change.reviewRequiredStages.map(id => STAGES.find(stageItem => stageItem.id === id)?.label ?? id).join('、') || '无')}${workItem.status === 'removed-pending' ? '<div class="dsh-sdd-actions"><button class="dsh-sdd-button" data-resolve-removal>处理外部移除</button></div>' : ''}</div>`
    const noWorkItem = snapshot.workItems.some(item => item.executionMode !== 'attached') && workItem === undefined ? '<div class="dsh-sdd-error">请先选择一个交付工作单元。</div>' : ''
    const deliverableName = STAGE_ARTIFACT_TEMPLATES[stage].documentName
    const target = current.find(item => item.uid === this.state.targetArtifactUid && (item.status === 'draft' || item.status === 'in-review'))
    const nextStep = current.every(item => item.status !== 'draft' && item.status !== 'in-review')
      ? `下一步：创建“${deliverableName}”草稿，作为 AI 本阶段输出的固定文件。`
      : target === undefined ? `下一步：选择一个 ${deliverableName} 草稿。` : `已选择 ${target.key}，可以开始阶段对话。`
    const applicability = workItem?.stageApplicability?.[stage]
    const applicabilityHtml = workItem === undefined || stage === 'requirements' ? '' : applicability?.status === 'not-applicable'
      ? `<div class="dsh-sdd-card" style="margin-bottom:14px"><strong>本需求已将${escapeHtml(STAGES.find(item => item.id === stage)!.label)}标记为不适用</strong><p class="dsh-sdd-muted">${escapeHtml(applicability.reason || '未填写说明')}</p><button class="dsh-sdd-button" data-action="restore-stage">恢复为可用阶段</button></div>`
      : current.length === 0 ? `<div class="dsh-sdd-actions" style="margin-bottom:14px"><button class="dsh-sdd-button" data-action="skip-stage">本需求不需要${escapeHtml(STAGES.find(item => item.id === stage)!.label)}</button></div>` : ''
    const selectedArtifacts = accepted.filter(item => this.state.selected.has(item.uid))
    const selectedSources = sources.filter(item => this.state.selected.has(item.uid))
    const selectedRows = selectedArtifacts.map(item => this.inputSummaryRow(item)).join('') + selectedSources.map(item => this.sourceSummaryRow(item)).join('')
    const configuredRepositories = snapshot.project?.development.repositories ?? []
    const codeRun = target === undefined ? undefined : snapshot.runs.find(item => item.artifactUid === target.uid && item.status !== 'completed')
    const codeReferenceHtml = stage === 'development' || configuredRepositories.length === 0 ? '' : codeRun?.codeReferences === undefined
      ? `<div class="dsh-sdd-muted" style="margin-top:12px"><strong>代码参考：</strong>项目已关联 ${configuredRepositories.length} 个仓库；开始对话时自动准备为只读辅助输入，无需逐阶段选择。</div>`
      : `<div class="dsh-sdd-muted" style="margin-top:12px"><strong>代码参考：</strong>${codeRun.codeReferences.map(reference => reference.available && reference.baseCommit !== undefined ? `${reference.repositoryId} @ ${reference.baseCommit.slice(0, 8)}` : `${reference.repositoryId}（暂不可用）`).join('、') || '无'}</div>`
    const actionable = current.filter(item => item.status === 'draft' || item.status === 'in-review')
    const acceptedCurrent = current.filter(item => item.status === 'accepted').sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    const visibleUids = new Set([...actionable, ...acceptedCurrent.slice(0, 3)].map(item => item.uid))
    const visible = current.filter(item => visibleUids.has(item.uid))
    const history = current.filter(item => !visibleUids.has(item.uid)).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    const outputList = current.length === 0 ? `<div class="dsh-sdd-empty">尚未创建${escapeHtml(deliverableName)}</div>` : `<div class="dsh-sdd-list dsh-sdd-bounded-list">${visible.map(item => this.outputRow(item, snapshot)).join('')}</div>${history.length === 0 ? '' : `<details class="dsh-sdd-history"><summary>历史版本（${history.length}）</summary><div class="dsh-sdd-list dsh-sdd-bounded-list">${history.map(item => this.outputRow(item, snapshot)).join('')}</div></details>`}`
    return `${change}${noWorkItem}${attachedDefectsHtml}${applicabilityHtml}${this.stageSettingsHtml(snapshot, stage)}<div class="dsh-sdd-grid"><section class="dsh-sdd-card"><h2>本阶段输入材料（${selectedArtifacts.length + selectedSources.length}）</h2><p class="dsh-sdd-muted">${target === undefined ? '创建草稿前选择输入；默认推荐当前来源、需求内缺陷和每个上游阶段的最新已验收版本。' : `输入已固定在 ${target.key} v${target.version} 的 manifest.yaml 中，调整上游输入需要创建修订。`}</p><div class="dsh-sdd-list dsh-sdd-bounded-list dsh-sdd-input-summary">${selectedRows || '<div class="dsh-sdd-empty">尚未选择输入材料</div>'}</div>${codeReferenceHtml}<div class="dsh-sdd-actions"><button class="dsh-sdd-button" data-action="select-inputs"${target === undefined ? '' : ' disabled'}>${target === undefined ? '选择/调整输入' : '输入已固定'}</button>${importAction}</div></section><section class="dsh-sdd-card"><h2>${escapeHtml(deliverableName)}</h2><p class="dsh-sdd-muted">当前处理中和最近已验收版本优先展示，其余版本收纳到历史记录。</p>${outputList}<div class="dsh-sdd-muted" style="margin-top:12px">${escapeHtml(nextStep)}</div><div class="dsh-sdd-actions"><button class="dsh-sdd-button" data-action="view-template">查看${escapeHtml(deliverableName)}模板</button><button class="dsh-sdd-button${target === undefined ? ' primary' : ''}" data-action="draft"${snapshot.workItems.some(item => item.executionMode !== 'attached') && (workItem === undefined || applicability?.status === 'not-applicable') ? ' disabled' : ''}>创建${escapeHtml(deliverableName)}草稿</button><button class="dsh-sdd-button primary" data-action="conversation"${target === undefined ? ' disabled title="请先创建或选择本阶段交付件草稿"' : ''}>开始阶段对话</button></div></section>${stage === 'development' ? this.developmentHtml(snapshot) : ''}</div>`
  }

  private stageSettingsHtml(snapshot: ProjectSnapshot, stage: StageId): string {
    const workItem = snapshot.workItems.find(item => item.uid === this.state.workItemUid)
    if (workItem === undefined) return ''
    const scope = workItem.repositoryScope?.join('、') || '未确认'
    const targets = workItem.developmentTargets?.join('、') || '未确认'
    const openSpecValidation = snapshot.openSpecValidation[workItem.uid]
    const openSpecState = openSpecValidation?.status === 'valid' ? openSpecValidation.message
      : openSpecValidation?.status === 'invalid' ? `验证失败：${openSpecValidation.message}`
        : openSpecValidation?.status === 'pending' ? '已配置，待开发空间验证' : '已配置，待验证'
    const openSpec = workItem.openSpec?.enabled === true ? `${workItem.openSpec.repositoryId}:${workItem.openSpec.path} · ${openSpecState}` : '本需求未配置'
    if (stage === 'requirements' || stage === 'prototype') return ''
    const repositories = snapshot.project?.development.repositories ?? []
    const openSpecActions = stage === 'development' && workItem.openSpec?.enabled === true ? [
      openSpecValidation?.canInstall === true ? '<button class="dsh-sdd-button" data-action="install-openspec">安装 OpenSpec CLI</button>' : '',
      openSpecValidation?.canInitialize === true ? '<button class="dsh-sdd-button" data-action="initialize-openspec">使用 OpenSpec CLI 初始化</button>' : '',
      '<button class="dsh-sdd-button" data-action="disable-openspec">不使用 OpenSpec</button>',
    ].filter(Boolean).join('') : ''
    const openSpecReadyActions = stage === 'development' && openSpecValidation?.status === 'valid' ? [
      '<button class="dsh-sdd-button" data-action="view-openspec-templates">查看模板位置</button>',
      openSpecValidation.schema !== undefined && openSpecValidation.schema !== 'spec-driven' ? '<button class="dsh-sdd-button" data-action="open-openspec-schema">打开 Schema 目录</button>' : '',
      openSpecValidation.changeExists === true ? '' : '<button class="dsh-sdd-button" data-action="fork-openspec-schema">复制官方 Schema 定制</button>',
      openSpecValidation.changeExists === true ? '' : '<button class="dsh-sdd-button primary" data-action="create-openspec-change">创建当前需求 Change</button>',
    ].filter(Boolean).join('') : ''
    const description = stage === 'architecture' ? '系统设计角色确认本需求涉及的代码仓库范围。项目仓库目录和默认基线请在“项目设置”维护。'
      : stage === 'specification' ? '规格设计角色在已确认仓库范围内明确实际修改仓库和具体开发目标。'
        : '开发阶段只执行最终开发配置；跳过前置阶段时，可以在这里补齐缺失的仓库范围和开发目标。'
    const buttons = stage === 'architecture'
      ? `<button class="dsh-sdd-button primary" data-action="configure-scope"${repositories.length === 0 ? ' disabled' : ''}>确认仓库范围</button>`
      : `<button class="dsh-sdd-button" data-action="configure-scope"${repositories.length === 0 ? ' disabled' : ''}>${workItem.repositoryScope?.length ? '调整仓库范围' : '补充仓库范围'}</button><button class="dsh-sdd-button primary" data-action="configure-targets"${workItem.repositoryScope?.length ? '' : ' disabled'}>配置开发目标${stage === 'development' ? '与 OpenSpec' : ''}</button>${stage === 'development' ? `${openSpecActions}${openSpecReadyActions}` : ''}`
    return `<section class="dsh-sdd-card" style="margin-bottom:14px"><h2>${stage === 'architecture' ? '仓库范围' : stage === 'specification' ? '开发目标' : '开发执行设置'}</h2><p class="dsh-sdd-muted">${description}</p><p class="dsh-sdd-muted">仓库范围：${escapeHtml(scope)}　开发目标：${escapeHtml(targets)}${stage === 'development' ? `　OpenSpec：${escapeHtml(openSpec)}` : ''}</p><div class="dsh-sdd-actions">${buttons}</div></section>`
  }

  private inputSummaryRow(item: ArtifactSummary): string { return `<div class="dsh-sdd-row"><span></span><span><strong>${escapeHtml(item.key)} · ${escapeHtml(item.title)}</strong><span class="dsh-sdd-muted">${escapeHtml(STAGES.find(stage => stage.id === item.stage)?.label ?? item.stage)} · 固定版本 v${escapeHtml(item.version)}</span></span><span><span class="dsh-sdd-badge">已验收</span><button class="dsh-sdd-button" data-preview-artifact="${escapeHtml(item.uid)}">查看交付包</button></span></div>` }
  private sourceSummaryRow(item: SourceSummary): string { const kindLabels: Record<string, string> = { requirement: '需求', defect: '缺陷', issue: '问题' }; return `<div class="dsh-sdd-row"><span></span><span><strong>${escapeHtml(item.externalKey ?? item.uid)} · ${escapeHtml(item.title)}</strong><span class="dsh-sdd-muted">${escapeHtml(kindLabels[item.kind] ?? item.kind)} · ${escapeHtml(item.provider === 'command' ? '业务适配器' : item.provider)} · 固定来源快照</span></span><span><span class="dsh-sdd-badge">外部内容</span><button class="dsh-sdd-button" data-preview-source="${escapeHtml(item.uid)}">查看完整内容</button></span></div>` }

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
    const repositoryRows = workspace?.repositories.map(repo => {
      const currentTests = (repo.tests ?? []).filter(test => !test.stale)
      const testState = currentTests.length === 0 ? '当前代码尚无测试证据'
        : currentTests.some(test => !test.passed) ? `当前测试失败 ${currentTests.filter(test => !test.passed).length} 项`
          : currentTests.every(test => test.skipped) ? `已人工跳过测试：${currentTests.at(-1)?.description ?? ''}`
            : `当前测试通过 ${currentTests.filter(test => !test.skipped).length} 项${currentTests.some(test => test.skipped) ? '（含跳过说明）' : ''}`
      return `<div class="dsh-sdd-row"><span></span><span><strong>${escapeHtml(repo.id)} · 特性分支 ${escapeHtml(repo.workingBranch)}</strong><span class="dsh-sdd-muted">基线 ${escapeHtml(repo.baseBranch)} @ ${escapeHtml(repo.baseCommit.slice(0, 8))}<br>${escapeHtml(repo.path)}<br>变更 ${repo.changedFiles} · ahead ${repo.ahead} · behind ${repo.behind} · ${escapeHtml(testState)}</span></span><span><button class="dsh-sdd-button" data-dev-test="${escapeHtml(repo.id)}">让 AI 验证</button><button class="dsh-sdd-button" data-dev-skip-test="${escapeHtml(repo.id)}">跳过测试</button><button class="dsh-sdd-button" data-dev-commit="${escapeHtml(repo.id)}">提交代码</button></span></div>`
    }).join('') ?? ''
    return `<section class="dsh-sdd-card dsh-sdd-wide"><h2>隔离开发空间 · ${escapeHtml(artifact.key)}</h2>${workspace === undefined ? `<p class="dsh-sdd-muted">可用代码仓库：${configured.map(item => `${item.id}（基线 ${item.baseBranch}）`).join('、') || '尚未在 project.yaml 配置 repositories'}。创建后会从所选基线建立独立的 SDD 特性分支。</p><button class="dsh-sdd-button" data-action="development-create">创建 Worktree / Clone 与特性分支</button>` : `<div class="dsh-sdd-list">${repositoryRows}</div><p class="dsh-sdd-muted">AI 根据仓库、规格和 CI 自行选择测试。真实 shell 退出码会绑定当前代码状态；测试后再次修改代码会使证据过期。提交、推送和合并仍由负责人显式操作。</p><div class="dsh-sdd-actions"><button class="dsh-sdd-button" data-action="development-create">添加仓库</button><button class="dsh-sdd-button" data-action="development-status">刷新 Git 状态</button></div>`}</section>`
  }

  private bind(): void {
    const root = this.container!
    root.querySelector<HTMLElement>('[data-action="close"]')?.addEventListener('click', () => this.close())
    if (this.state.loading) return
    root.querySelectorAll<HTMLElement>('[data-action="refresh"]').forEach(button => button.addEventListener('click', () => { void this.refresh() }))
    root.querySelector<HTMLSelectElement>('[data-action="workspace"]')?.addEventListener('change', event => { this.state.workspaceId = (event.currentTarget as HTMLSelectElement).value; this.state.workItemUid = undefined; this.state.selected.clear(); this.state.targetArtifactUid = undefined; void this.refresh() })
    root.querySelector<HTMLSelectElement>('[data-action="work-item"]')?.addEventListener('change', event => { this.state.workItemUid = (event.currentTarget as HTMLSelectElement).value; this.state.targetArtifactUid = undefined; this.state.selected = this.state.snapshot !== undefined && stageMenu(this.state.menu) ? this.defaultInputs(this.state.snapshot, this.state.menu) : new Set(); this.render() })
    root.querySelector<HTMLElement>('[data-action="initialize"]')?.addEventListener('click', () => { void this.mutate({ kind: 'initialize', workspaceId: this.state.workspaceId! }) }); root.querySelector<HTMLElement>('[data-action="draft"]')?.addEventListener('click', () => { void this.createDraft() }); root.querySelector<HTMLElement>('[data-action="import-requirement"]')?.addEventListener('click', () => { void this.importSource('requirement') }); root.querySelector<HTMLElement>('[data-action="import-standalone-defect"]')?.addEventListener('click', () => { void this.importSource('defect') }); root.querySelector<HTMLElement>('[data-action="import-attached-defect"]')?.addEventListener('click', () => { void this.importSource('defect', this.state.workItemUid) }); root.querySelector<HTMLElement>('[data-action="conversation"]')?.addEventListener('click', () => { void this.startConversation() })
    root.querySelector<HTMLElement>('[data-action="open-settings"]')?.addEventListener('click', () => this.open('settings'))
    root.querySelector<HTMLElement>('[data-action="apply-dashboard-filter"]')?.addEventListener('click', () => {
      this.state.dashboardQuery = root.querySelector<HTMLInputElement>('[data-dashboard-query]')?.value ?? ''
      this.state.dashboardKind = (root.querySelector<HTMLSelectElement>('[data-dashboard-kind]')?.value ?? 'all') as RuntimeState['dashboardKind']
      this.state.dashboardStatus = (root.querySelector<HTMLSelectElement>('[data-dashboard-status]')?.value ?? 'all') as RuntimeState['dashboardStatus']
      this.render()
    })
    root.querySelector<HTMLInputElement>('[data-dashboard-query]')?.addEventListener('keydown', event => {
      if (event.key === 'Enter') root.querySelector<HTMLButtonElement>('[data-action="apply-dashboard-filter"]')?.click()
    })
    root.querySelector<HTMLElement>('[data-action="select-inputs"]')?.addEventListener('click', () => { void this.chooseInputs() })
    root.querySelector<HTMLElement>('[data-action="view-template"]')?.addEventListener('click', () => this.showTemplate())
    root.querySelector<HTMLElement>('[data-action="configure-scope"]')?.addEventListener('click', () => { void this.configureRepositoryScope() })
    root.querySelector<HTMLElement>('[data-action="add-repository"]')?.addEventListener('click', () => { void this.addProjectRepository() })
    root.querySelector<HTMLElement>('[data-action="configure-project-git"]')?.addEventListener('click', () => { void this.configureProjectGit() })
    root.querySelector<HTMLElement>('[data-action="project-git-fetch"]')?.addEventListener('click', () => { void this.mutate({ kind: 'project-git-fetch', workspaceId: this.state.workspaceId! }) })
    root.querySelector<HTMLElement>('[data-action="project-git-sync"]')?.addEventListener('click', () => { void this.syncProjectGit() })
    root.querySelector<HTMLElement>('[data-action="project-git-commit"]')?.addEventListener('click', () => { void this.commitProjectGit() })
    root.querySelector<HTMLElement>('[data-action="project-git-push"]')?.addEventListener('click', () => { void this.pushProjectGit() })
    root.querySelectorAll<HTMLButtonElement>('[data-resolve-key-conflict]').forEach(button => button.addEventListener('click', () => { void this.resolveKeyConflict(button.dataset.resolveKeyConflict!) }))
    root.querySelectorAll<HTMLButtonElement>('[data-remove-repository]').forEach(button => button.addEventListener('click', () => { void this.removeProjectRepository(button.dataset.removeRepository!) }))
    root.querySelectorAll<HTMLButtonElement>('[data-change-repository-branch]').forEach(button => button.addEventListener('click', () => { void this.changeProjectRepositoryBranch(button.dataset.changeRepositoryBranch!) }))
    root.querySelector<HTMLElement>('[data-action="configure-targets"]')?.addEventListener('click', () => { void this.configureDevelopmentTargets() })
    root.querySelector<HTMLElement>('[data-action="skip-stage"]')?.addEventListener('click', () => { void this.setStageApplicability('not-applicable') })
    root.querySelector<HTMLElement>('[data-action="restore-stage"]')?.addEventListener('click', () => { void this.setStageApplicability('applicable') })
    root.querySelector<HTMLElement>('[data-action="install-openspec"]')?.addEventListener('click', () => { void this.installOpenSpec() })
    root.querySelector<HTMLElement>('[data-action="initialize-openspec"]')?.addEventListener('click', () => { void this.initializeOpenSpec() })
    root.querySelector<HTMLElement>('[data-action="view-openspec-templates"]')?.addEventListener('click', () => { void this.viewOpenSpecTemplates() })
    root.querySelector<HTMLElement>('[data-action="open-openspec-schema"]')?.addEventListener('click', () => { void this.openOpenSpecSchema() })
    root.querySelector<HTMLElement>('[data-action="fork-openspec-schema"]')?.addEventListener('click', () => { void this.forkOpenSpecSchema() })
    root.querySelector<HTMLElement>('[data-action="create-openspec-change"]')?.addEventListener('click', () => { void this.createOpenSpecChange() })
    root.querySelector<HTMLElement>('[data-action="disable-openspec"]')?.addEventListener('click', () => { void this.disableOpenSpec() })
    root.querySelector<HTMLElement>('[data-action="reinitialize"]')?.addEventListener('click', () => { void this.reinitialize() })
    root.querySelectorAll<HTMLInputElement>('[data-target]').forEach(input => input.addEventListener('change', () => { this.state.targetArtifactUid = input.dataset.target; const artifact = this.state.snapshot?.artifacts.find(item => item.uid === input.dataset.target); this.state.selected = new Set([...(artifact?.basedOn.map(item => item.uid) ?? []), ...(artifact?.derivedFrom.map(item => item.uid) ?? [])]); this.render() }))
    root.querySelectorAll<HTMLButtonElement>('[data-quality]').forEach(button => button.addEventListener('click', () => { void this.mutate({ kind: 'quality', workspaceId: this.state.workspaceId!, artifactUid: button.dataset.quality! }) }))
    root.querySelectorAll<HTMLButtonElement>('[data-preview-artifact]').forEach(button => button.addEventListener('click', () => { void this.showArtifact(button.dataset.previewArtifact!) }))
    root.querySelectorAll<HTMLButtonElement>('[data-preview-source]').forEach(button => button.addEventListener('click', () => { this.showSource(button.dataset.previewSource!) }))
    root.querySelectorAll<HTMLButtonElement>('[data-revision]').forEach(button => button.addEventListener('click', () => { void this.createRevision(button.dataset.revision!) }))
    root.querySelectorAll<HTMLButtonElement>('[data-discard]').forEach(button => button.addEventListener('click', () => { void this.discardDraft(button.dataset.discard!) }))
    root.querySelectorAll<HTMLButtonElement>('[data-accept]').forEach(button => button.addEventListener('click', () => { void this.accept(button.dataset.accept!) }))
    root.querySelectorAll<HTMLButtonElement>('[data-resume]').forEach(button => button.addEventListener('click', () => { void this.resumeRun(button.dataset.resume!, false) }))
    root.querySelectorAll<HTMLButtonElement>('[data-sync]').forEach(button => button.addEventListener('click', () => { void this.resumeRun(button.dataset.sync!, true) }))
    root.querySelectorAll<HTMLButtonElement>('[data-complete]').forEach(button => button.addEventListener('click', () => { void this.mutate({ kind: 'complete-run', workspaceId: this.state.workspaceId!, runUid: button.dataset.complete! }) }))
    root.querySelector<HTMLElement>('[data-action="development-create"]')?.addEventListener('click', () => { void this.createDevelopment() }); root.querySelector<HTMLElement>('[data-action="development-status"]')?.addEventListener('click', () => { if (this.state.targetArtifactUid) void this.mutate({ kind: 'development-status', workspaceId: this.state.workspaceId!, artifactUid: this.state.targetArtifactUid }) })
    root.querySelectorAll<HTMLButtonElement>('[data-dev-test]').forEach(button => button.addEventListener('click', () => { void this.runTest(button.dataset.devTest!) })); root.querySelectorAll<HTMLButtonElement>('[data-dev-skip-test]').forEach(button => button.addEventListener('click', () => { void this.skipTest(button.dataset.devSkipTest!) })); root.querySelectorAll<HTMLButtonElement>('[data-dev-commit]').forEach(button => button.addEventListener('click', () => { void this.commit(button.dataset.devCommit!) }))
    root.querySelector<HTMLButtonElement>('[data-resolve-removal]')?.addEventListener('click', () => { void this.resolveRemoval() })
    root.querySelectorAll<HTMLButtonElement>('[data-resolve-attached-removal]').forEach(button => button.addEventListener('click', () => { void this.resolveRemoval(button.dataset.resolveAttachedRemoval) }))
    root.querySelectorAll<HTMLButtonElement>('[data-matrix-work-item]').forEach(button => button.addEventListener('click', () => {
      this.state.workItemUid = button.dataset.matrixWorkItem; this.state.menu = button.dataset.matrixStage as StageId; this.state.targetArtifactUid = button.dataset.matrixArtifact
      const artifact = this.state.snapshot?.artifacts.find(item => item.uid === this.state.targetArtifactUid)
      this.state.selected = artifact === undefined && this.state.snapshot !== undefined ? this.defaultInputs(this.state.snapshot, this.state.menu as StageId) : new Set([...(artifact?.basedOn.map(item => item.uid) ?? []), ...(artifact?.derivedFrom.map(item => item.uid) ?? [])])
      this.syncMenus(); this.render()
    }))
  }

  private async showTemplate(): Promise<void> {
    if (!stageMenu(this.state.menu)) return
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

  private showSource(sourceUid: string): void {
    const source = this.state.snapshot?.sources.find(item => item.uid === sourceUid)
    if (source === undefined) return
    const sourceRecord = {
      schema: source.schema, uid: source.uid, provider: source.provider, kind: source.kind,
      externalKey: source.externalKey, title: source.title, status: source.status, revision: source.revision,
      fetchedAt: source.fetchedAt, contentHash: source.contentHash, tracking: source.tracking,
      links: source.links, content: source.content,
    }
    const raw = JSON.stringify(sourceRecord, null, 2) ?? String(source.content)
    const previewRecord = JSON.parse(raw) as unknown
    const backdrop = document.createElement('div'); backdrop.className = 'dsh-sdd-modal-backdrop'
    backdrop.innerHTML = `<section class="dsh-sdd-modal dsh-sdd-source-detail" role="dialog" aria-modal="true"><header class="dsh-sdd-modal-header"><h2>${escapeHtml(source.externalKey ?? source.uid)} · ${escapeHtml(source.title)}</h2><p class="dsh-sdd-muted">固定来源快照 · ${escapeHtml(source.kind)} · ${escapeHtml(source.provider)} · ${escapeHtml(source.fetchedAt)}<br>${escapeHtml(source.relativePath)} · ${escapeHtml(source.contentHash ?? '未记录哈希')}</p></header><div class="dsh-sdd-modal-body"><div class="dsh-sdd-preview-toolbar"><strong>完整来源内容</strong><button class="dsh-sdd-button primary" data-source-mode="preview">预览</button><button class="dsh-sdd-button" data-source-mode="source">完整源码</button></div><div data-source-preview></div></div><footer class="dsh-sdd-modal-footer"><button class="dsh-sdd-button primary" type="button" data-source-close>关闭</button></footer></section>`
    this.container!.appendChild(backdrop)
    const preview = backdrop.querySelector<HTMLElement>('[data-source-preview]')!
    const render = (mode: 'preview' | 'source') => {
      preview.innerHTML = mode === 'source' ? `<pre class="dsh-sdd-template-preview">${escapeHtml(raw)}</pre>` : '<div data-json-source></div>'
      if (mode === 'preview') mountJsonPreview(preview.querySelector<HTMLElement>('[data-json-source]')!, previewRecord)
      backdrop.querySelectorAll<HTMLButtonElement>('[data-source-mode]').forEach(button => button.classList.toggle('primary', button.dataset.sourceMode === mode))
    }
    render('preview')
    backdrop.querySelectorAll<HTMLButtonElement>('[data-source-mode]').forEach(button => button.addEventListener('click', () => render(button.dataset.sourceMode as 'preview' | 'source')))
    const close = () => backdrop.remove(); backdrop.querySelector<HTMLElement>('[data-source-close]')!.addEventListener('click', close); backdrop.addEventListener('click', event => { if (event.target === backdrop) close() })
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
    const values = await this.openForm({
      title: `确认仓库范围 · ${workItem.key}`,
      description: '选择该需求可能涉及的代码仓库。项目仓库地址和默认基线统一在“项目设置”维护；这里仅建立需求与仓库的范围关系。',
      submitLabel: '保存仓库范围',
      fields: repositories.map(repository => ({ name: `scope-${repository.id}`, label: `${repository.id} · ${repository.source} · 基线 ${repository.baseBranch}`, type: 'checkbox' as const, value: workItem.repositoryScope?.includes(repository.id) === true })),
    })
    if (values === undefined) return
    const repositoryScope = repositories.filter(repository => values[`scope-${repository.id}`] === true).map(repository => repository.id)
    const developmentTargets = (workItem.developmentTargets ?? []).filter(id => repositoryScope.includes(id))
    const developmentTargetDetails = Object.fromEntries(Object.entries(workItem.developmentTargetDetails ?? {}).filter(([id]) => developmentTargets.includes(id)))
    await this.mutate({ kind: 'update-work-item-settings', workspaceId: this.state.workspaceId!, workItemUid: workItem.uid, repositoryScope, developmentTargets, developmentTargetDetails, openSpec: developmentTargets.includes(workItem.openSpec?.repositoryId ?? '') ? workItem.openSpec : { enabled: false } })
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
      let inspection = response.repositoryInspection
      if (!inspection.empty) return inspection
      if (inspection.sourceKind === 'remote') throw new Error('远程仓库还没有任何分支。请先在本地创建初始提交并显式 push 到远程，再重新读取。')
      const values = await this.openForm({
        title: '初始化空 Git 仓库', description: '仓库还没有任何提交。插件可以创建一个不包含现有文件的空初始提交，使基线分支和 Worktree 可用；未跟踪文件保持原样。如果仓库已有暂存文件，系统会拒绝自动提交。', submitLabel: '创建空初始提交',
        fields: [
          { name: 'branch', label: '初始分支', type: 'text', required: true, value: inspection.defaultBranch, placeholder: '例如：main' },
          { name: 'confirmed', label: '我确认创建空初始提交（不会提交当前文件）', type: 'checkbox', required: true },
        ],
      })
      if (values?.confirmed !== true) return undefined
      const initialized = await call({ kind: 'initialize-project-repository', workspaceId: this.state.workspaceId!, source: inspection.source, branch: String(values.branch) })
      if (!initialized.ok) throw new Error(initialized.error)
      if (!('repositoryInspection' in initialized)) throw new Error('Host returned an unexpected initialized repository inspection')
      inspection = initialized.repositoryInspection
      return inspection
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
    if (scope.length === 0) { this.state.error = '请先在本需求开发设置中勾选并保存代码仓库范围'; return this.render() }
    const configureOpenSpec = this.state.menu === 'development'
    const values = await this.openForm({
      title: `配置开发目标 · ${workItem.key}`, description: configureOpenSpec ? '选择本需求实际修改的仓库，并填写具体改动目标；开发阶段还可以选择是否使用 OpenSpec。' : '选择本需求实际修改的仓库，并为每个选中的仓库填写具体、可交付的改动目标。', submitLabel: '保存开发设置',
      fields: [
        ...scope.flatMap(repository => [
          { name: `target-${repository.id}`, label: `${repository.id} · ${repository.source}`, type: 'checkbox' as const, value: workItem.developmentTargets?.includes(repository.id) === true },
          { name: `detail-${repository.id}`, label: `${repository.id} 的具体开发目标`, type: 'textarea' as const, value: workItem.developmentTargetDetails?.[repository.id] ?? '', placeholder: '例如：修改订单退款接口、状态机和对应自动化测试。' },
        ]),
        ...(configureOpenSpec ? [
          { name: 'openSpecEnabled', label: '在目标代码仓库中使用 OpenSpec', type: 'checkbox' as const, value: workItem.openSpec?.enabled === true },
          { name: 'openSpecRepository', label: 'OpenSpec 所在仓库', type: 'select' as const, value: workItem.openSpec?.repositoryId ?? scope[0]!.id, options: scope.map(repository => ({ value: repository.id, label: repository.id })) },
          { name: 'openSpecPath', label: 'OpenSpec 相对路径', type: 'text' as const, value: workItem.openSpec?.path ?? 'openspec', placeholder: '例如：openspec' },
          { name: 'openSpecSchema', label: 'OpenSpec Schema', type: 'text' as const, value: workItem.openSpec?.schema ?? 'spec-driven', placeholder: '例如：spec-driven 或 company-sdd' },
        ] : []),
      ],
    })
    if (values === undefined) return
    const developmentTargets = scope.filter(repository => values[`target-${repository.id}`] === true).map(repository => repository.id)
    const developmentTargetDetails = Object.fromEntries(developmentTargets.map(id => [id, String(values[`detail-${id}`] ?? '')]))
    if (developmentTargets.some(id => developmentTargetDetails[id]!.trim() === '')) { this.state.error = '每个选中的代码仓库都必须填写具体开发目标'; return this.render() }
    const openSpec = configureOpenSpec
      ? values.openSpecEnabled === true ? { enabled: true as const, repositoryId: String(values.openSpecRepository), path: String(values.openSpecPath), schema: String(values.openSpecSchema), ...(workItem.openSpec?.changeId === undefined ? {} : { changeId: workItem.openSpec.changeId }) } : { enabled: false as const }
      : workItem.openSpec ?? { enabled: false as const }
    await this.mutate({ kind: 'update-work-item-settings', workspaceId: this.state.workspaceId!, workItemUid: workItem.uid, repositoryScope: workItem.repositoryScope ?? [], developmentTargets, developmentTargetDetails, openSpec })
  }

  private async setStageApplicability(status: 'applicable' | 'not-applicable'): Promise<void> {
    if (!stageMenu(this.state.menu) || this.state.workItemUid === undefined) return
    if (status === 'applicable') {
      await this.mutate({ kind: 'update-stage-applicability', workspaceId: this.state.workspaceId!, workItemUid: this.state.workItemUid, stage: this.state.menu, status })
      return
    }
    const stage = STAGES.find(item => item.id === this.state.menu)!
    const values = await this.openForm({
      title: `标记为不适用 · ${stage.label}`,
      description: '该阶段不会创建空交付件，看板会显示“不适用”。以后仍可恢复并正常创建交付件。',
      submitLabel: '确认不适用',
      fields: [{ name: 'reason', label: '说明（可选）', type: 'textarea', placeholder: '例如：纯后端缺陷，不涉及页面和交互变化。' }],
    })
    if (values === undefined) return
    await this.mutate({ kind: 'update-stage-applicability', workspaceId: this.state.workspaceId!, workItemUid: this.state.workItemUid, stage: this.state.menu, status, reason: String(values.reason ?? '') })
  }

  private async viewOpenSpecTemplates(): Promise<void> {
    if (this.state.targetArtifactUid === undefined) return
    const workItem = this.state.snapshot?.workItems.find(item => item.uid === this.state.workItemUid)
    const validation = workItem === undefined ? undefined : this.state.snapshot?.openSpecValidation[workItem.uid]
    if (workItem === undefined || validation === undefined) return
    const response = await call({ kind: 'development-inspect-openspec-templates', workspaceId: this.state.workspaceId!, artifactUid: this.state.targetArtifactUid, schema: validation.schema ?? 'spec-driven' })
    if (!response.ok) { this.state.error = response.error; return this.render() }
    if (!('openSpecTemplates' in response)) { this.state.error = 'Host returned an unexpected OpenSpec template response'; return this.render() }
    const paths = response.openSpecTemplates.paths.length ? response.openSpecTemplates.paths.join('\n') : '当前 Schema 没有返回 Markdown 模板路径。'
    await this.openForm({
      title: `OpenSpec Schema · ${validation.schema ?? 'spec-driven'}`,
      description: `可用 Schema：${validation.availableSchemas?.join('、') || validation.schema || 'spec-driven'}。官方模板在 OpenSpec 安装包中运行时解析，项目自定义模板位于 openspec/schemas/<schema>/templates/。`,
      submitLabel: '关闭',
      fields: [{ name: 'paths', label: '当前解析到的模板路径', type: 'textarea', value: paths }],
    })
  }

  private async forkOpenSpecSchema(): Promise<void> {
    if (this.state.targetArtifactUid === undefined) return
    const values = await this.openForm({
      title: '复制官方 OpenSpec Schema',
      description: '将通过官方 CLI 把 spec-driven 复制到当前隔离代码分支的 openspec/schemas/ 下，随后执行 Schema 校验。生成的模板可以在代码仓中编辑和提交。',
      submitLabel: '复制并使用',
      fields: [{ name: 'schema', label: '自定义 Schema 名称', type: 'text', required: true, value: 'dsh-sdd', placeholder: '例如：company-sdd' }],
    })
    if (values === undefined) return
    await this.mutate({ kind: 'development-fork-openspec-schema', workspaceId: this.state.workspaceId!, artifactUid: this.state.targetArtifactUid, schema: String(values.schema) })
  }

  private async openOpenSpecSchema(): Promise<void> {
    if (this.state.targetArtifactUid === undefined) return
    const workItem = this.state.snapshot?.workItems.find(item => item.uid === this.state.workItemUid)
    const schema = workItem === undefined ? undefined : this.state.snapshot?.openSpecValidation[workItem.uid]?.schema
    if (schema === undefined || schema === 'spec-driven') return
    const response = await call({ kind: 'development-open-openspec-schema', workspaceId: this.state.workspaceId!, artifactUid: this.state.targetArtifactUid, schema })
    if (!response.ok) { this.state.error = response.error; this.render() }
  }

  private async createOpenSpecChange(): Promise<void> {
    if (this.state.targetArtifactUid === undefined) return
    const snapshot = this.state.snapshot
    const artifact = snapshot?.artifacts.find(item => item.uid === this.state.targetArtifactUid)
    const workItem = snapshot?.workItems.find(item => item.uid === artifact?.workItemUid)
    const validation = workItem === undefined ? undefined : snapshot?.openSpecValidation[workItem.uid]
    if (workItem === undefined || validation === undefined) return
    const defaultChangeId = workItem.key.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `change-${workItem.uid.slice(0, 8)}`
    const schemas = validation.availableSchemas?.length ? validation.availableSchemas : [validation.schema ?? 'spec-driven']
    const values = await this.openForm({
      title: `创建 OpenSpec Change · ${workItem.key}`,
      description: '这一步只创建当前需求的 Change 脚手架。proposal、specs、design 和 tasks 将由开发会话结合已选择的 SDD 输入生成，不会在这里伪造内容。',
      submitLabel: '创建 Change',
      fields: [
        { name: 'changeId', label: 'Change ID', type: 'text', required: true, value: workItem.openSpec?.changeId ?? defaultChangeId, placeholder: '例如：req-1024-refund' },
        { name: 'schema', label: 'Schema', type: 'select', required: true, value: workItem.openSpec?.schema ?? validation.schema ?? schemas[0]!, options: schemas.map(value => ({ value, label: value })) },
      ],
    })
    if (values === undefined) return
    await this.mutate({ kind: 'development-create-openspec-change', workspaceId: this.state.workspaceId!, artifactUid: this.state.targetArtifactUid, changeId: String(values.changeId), schema: String(values.schema) })
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
        if (field.type === 'checkbox') {
          const checkbox = `<label class="dsh-sdd-checkbox"><input type="checkbox" name="${escapeHtml(field.name)}"${field.value === true ? ' checked' : ''}${required}><span>${escapeHtml(field.label)}${help}</span></label>`
          return `<div class="dsh-sdd-field"${show}>${field.detail === undefined ? checkbox : `<div class="dsh-sdd-checkbox-detail">${checkbox}<button class="dsh-sdd-button" type="button" data-dialog-detail="${escapeHtml(field.name)}">查看详情</button></div>`}</div>`
        }
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
        const noun = config.fields.find(field => field.name === name)?.label.includes('缺陷') === true ? '缺陷' : '子需求'
        row.className = 'dsh-sdd-manual-item'
        row.innerHTML = `<input class="dsh-sdd-input" data-manual-key placeholder="${noun}编号（可留空）"><input class="dsh-sdd-input" data-manual-title placeholder="${noun}标题"><button class="dsh-sdd-button" type="button" data-remove-manual-item>删除</button><textarea class="dsh-sdd-input" data-manual-description placeholder="详细描述业务背景、场景、规则、边界、异常、验收想法等；可以输入多行长文本。"></textarea>`
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
      config.fields.filter(field => field.detail !== undefined).forEach(field => backdrop.querySelector<HTMLButtonElement>(`[data-dialog-detail="${field.name}"]`)?.addEventListener('click', () => field.detail!()))
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
            if (items.some(item => item.title === '')) { rowError(group, `每个${field.label.includes('缺陷') ? '缺陷' : '子需求'}都必须填写标题`); return }
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

  private async configureProjectGit(): Promise<void> {
    const collaboration = this.state.snapshot?.project?.collaboration ?? { remote: 'origin', baseBranch: 'main', syncStrategy: 'ff-only' as const, commitScope: 'sdd' as const }
    const values = await this.openForm({
      title: '配置 SDD 项目仓库协作',
      description: '这里配置的是保存 .sdd、模板和交付件的外层项目仓库，不是开发阶段的目标代码仓库。',
      submitLabel: '保存配置',
      fields: [
        { name: 'remote', label: 'Git remote 名称', type: 'text', required: true, value: collaboration.remote, placeholder: '例如：origin' },
        { name: 'baseBranch', label: '协作基线分支', type: 'text', required: true, value: collaboration.baseBranch, placeholder: '例如：main' },
        { name: 'syncStrategy', label: '同步策略', type: 'select', required: true, value: collaboration.syncStrategy, options: [{ value: 'ff-only', label: '仅 Fast-forward（推荐）' }, { value: 'manual', label: '手工同步' }] },
        { name: 'commitScope', label: '项目提交范围', type: 'select', required: true, value: collaboration.commitScope, options: [{ value: 'sdd', label: '仅 .sdd 和 .gitignore（推荐）' }, { value: 'workspace', label: '整个工作空间' }] },
      ],
    })
    if (values === undefined) return
    await this.mutate({ kind: 'update-project-collaboration', workspaceId: this.state.workspaceId!, remote: String(values.remote), baseBranch: String(values.baseBranch), syncStrategy: String(values.syncStrategy) as 'ff-only' | 'manual', commitScope: String(values.commitScope) as 'sdd' | 'workspace' })
  }

  private async syncProjectGit(): Promise<void> {
    const git = this.state.snapshot?.projectRepository
    const values = await this.openForm({
      title: '同步 SDD 项目仓库',
      description: `将先 Fetch，再把当前分支 fast-forward 到 ${git?.upstream ?? `${git?.remote ?? 'origin'}/${git?.baseBranch ?? 'main'}`}。工作区不干净、分支分叉或存在冲突时不会执行。`,
      submitLabel: '确认同步', fields: [],
    })
    if (values !== undefined) await this.mutate({ kind: 'project-git-sync', workspaceId: this.state.workspaceId! })
  }

  private async commitProjectGit(): Promise<void> {
    const scope = this.state.snapshot?.project?.collaboration?.commitScope ?? 'sdd'
    const values = await this.openForm({
      title: '提交 SDD 项目变更',
      description: scope === 'sdd' ? '只暂存 .sdd/ 和插件维护的 .gitignore，不会把工作空间中的其他业务文件带入提交。' : '当前配置会暂存整个工作空间，请先确认所有变更都属于本次提交。',
      submitLabel: '创建本地提交', fields: [{ name: 'message', label: '提交说明', type: 'textarea', required: true, placeholder: '例如：docs(sdd): 完成 PAY-381 系统设计' }],
    })
    if (values !== undefined) await this.mutate({ kind: 'project-git-commit', workspaceId: this.state.workspaceId!, message: String(values.message) })
  }

  private async pushProjectGit(): Promise<void> {
    const git = this.state.snapshot?.projectRepository
    const values = await this.openForm({
      title: 'Push SDD 项目分支',
      description: `即将把当前分支 ${git?.branch ?? ''} 推送到 remote ${git?.remote ?? 'origin'}。首次 Push 会建立 upstream；插件不会创建或合并 PR/MR。`,
      submitLabel: '确认 Push', fields: [],
    })
    if (values !== undefined) await this.mutate({ kind: 'project-git-push', workspaceId: this.state.workspaceId! })
  }

  private async resolveKeyConflict(artifactUid: string): Promise<void> {
    const artifact = this.state.snapshot?.artifacts.find(item => item.uid === artifactUid)
    if (artifact === undefined) return
    const values = await this.openForm({
      title: `调整冲突草稿编号 · ${artifact.key}`,
      description: `该草稿尚未绑定会话、开发空间或修订血缘。插件将保留阶段前缀并追加 UID 短后缀；所有关系继续使用不可变 UID。已验收交付件不会被重编号。`,
      submitLabel: '调整草稿编号', fields: [],
    })
    if (values !== undefined) await this.mutate({ kind: 'resolve-artifact-key-conflict', workspaceId: this.state.workspaceId!, artifactUid })
  }

  private async mutate(action: SddAction): Promise<void> { this.state.loading = true; this.state.error = undefined; this.render(); try { const response = await call(action); if (!response.ok) throw new Error(response.error); if ('snapshot' in response) this.state.snapshot = response.snapshot } catch (error) { this.state.error = error instanceof Error ? error.message : String(error) } finally { this.state.loading = false; this.render() } }

  private async createDraft(): Promise<void> {
    if (!stageMenu(this.state.menu)) return
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

  private async importSource(forcedKind?: string, attachToWorkItemUid?: string): Promise<void> {
    const snapshot = this.state.snapshot; const providers = snapshot?.sourceProviders ?? []
    if (providers.length === 0) { this.state.error = '当前没有可用的业务数据获取方式'; return this.render() }
    const defaultKind = forcedKind ?? 'requirement'
    const parent = attachToWorkItemUid === undefined ? undefined : snapshot?.workItems.find(item => item.uid === attachToWorkItemUid)
    if (attachToWorkItemUid !== undefined && parent === undefined) { this.state.error = '当前需求工作单元不存在，请刷新后重试'; return this.render() }
    const kinds = [...new Set([defaultKind, 'requirement', 'defect', ...Object.keys(snapshot?.project?.sources ?? {})])]
    const kindLabels: Record<string, string> = { requirement: '需求', defect: '缺陷', issue: '问题' }
    const configured = snapshot?.project?.sources[defaultKind]
    const connectors = snapshot?.connectors ?? []
    const preferred = preferredSourceSelection(providers, connectors, configured)
    const defaultProvider = preferred.provider
    const defaultConnector = preferred.connector
    const manualKey = `MANUAL-${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}`
    const values = await this.openForm({
      title: parent === undefined ? `获取并预览${defaultKind === 'defect' ? '独立缺陷' : '外部业务内容'}` : `获取并预览本需求缺陷 · ${parent.key}`,
      description: parent === undefined ? '插件先读取外部事实并展示完整内容，确认后才保存快照和创建独立工作单元。' : `确认导入后，缺陷会归入 ${parent.key} · ${parent.title}，不会创建另一套五阶段交付空间。`, submitLabel: '获取并预览',
      fields: [
        ...(forcedKind === undefined ? [{ name: 'kind', label: '导入内容', type: 'select' as const, required: true, value: defaultKind, options: kinds.map(value => ({ value, label: kindLabels[value] ?? value })), help: '用于区分需求、缺陷或企业自定义事项类型。' }] : []),
        { name: 'provider', label: '获取方式', type: 'select', required: true, value: defaultProvider, options: providers.map(value => ({ value, label: value === 'manual' ? '手工录入（无需适配器）' : value === 'command' ? '业务适配器（command）' : `已安装适配器：${value}` })), help: '手工录入开箱即用；业务适配器可由插件源码统一提供，也可由当前项目自定义。两者都会生成相同的标准来源和工作单元。' },
        { name: 'connector', label: '业务系统连接', type: 'select', required: true, value: defaultConnector, options: connectors.length === 0 ? [{ value: '', label: '尚未配置业务连接' }] : connectors.map(connector => ({ value: connector.id, label: `${connector.id}（${connector.scope === 'plugin' ? '插件内置' : connector.overridden ? '项目覆盖' : '项目自定义'}）` })), help: '存在自定义连接时默认使用自定义适配器；插件 business/ 与项目 .sdd/business/ 使用相同格式，同名时采用项目配置。', showWhen: { field: 'provider', value: 'command' } },
        { name: 'key', label: '主编号', type: 'text', required: true, value: defaultProvider === 'manual' ? manualKey : '', placeholder: defaultKind === 'defect' ? '例如：BUG-1024' : '例如：PAY-381', help: '手工录入会预生成编号，也可以换成团队自己的编号。' },
        { name: 'manualTitle', label: '标题', type: 'text', required: true, placeholder: '例如：订单部分退款', help: '只需填写当前已知的最小信息，后续由需求讨论阶段的 AI 继续追问。', showWhen: { field: 'provider', value: 'manual' } },
        { name: 'manualDescription', label: '初始描述', type: 'textarea', placeholder: '例如：一笔订单需要支持分多次退款，具体次数和金额规则尚未确认。', showWhen: { field: 'provider', value: 'manual' } },
        { name: 'manualItems', label: defaultKind === 'defect' ? '更多缺陷（可选）' : '子需求（可选）', type: 'manual-items', help: defaultKind === 'defect' ? '可以一次录入多条缺陷；每条分别填写编号、标题和不限行数的完整内容。' : '每个子需求分别填写编号、标题和不限行数的详细内容。留空时主需求本身形成一个工作单元。', showWhen: { field: 'provider', value: 'manual' } },
      ],
    })
    if (values === undefined) return
    const provider = String(values.provider); const connector = values.connector === undefined ? undefined : String(values.connector)
    if (provider === 'command' && !connector) { this.state.error = '请先在插件 business/connectors/ 或项目 .sdd/business/connectors/ 配置业务系统连接'; return this.render() }
    this.state.error = undefined
    this.updateBusy(true, '正在调用业务适配器并生成导入预览…')
    let shouldRender = false
    try {
      const manualItems = JSON.parse(String(values.manualItems ?? '[]')) as Array<{ key?: string; title: string; description?: string }>
      const input = provider === 'manual' ? { title: String(values.manualTitle), description: String(values.manualDescription ?? ''), ...(manualItems.length === 0 ? {} : { items: manualItems }) } : undefined
      const response = await call({ kind: 'preview-source-import', workspaceId: this.state.workspaceId!, provider, sourceKind: forcedKind ?? String(values.kind), key: String(values.key), ...(connector ? { connector } : {}), ...(input === undefined ? {} : { input }), ...(attachToWorkItemUid === undefined ? {} : { attachToWorkItemUid }) })
      if (!response.ok) throw new Error(response.error)
      if (!('preview' in response)) throw new Error('业务适配器未返回导入预览')
      this.updateBusy(false)
      const preview = response.preview
      const actionable = preview.items.filter(item => item.change !== 'unchanged')
      const counts = Object.fromEntries(['added', 'modified', 'removed', 'unchanged'].map(kind => [kind, preview.items.filter(item => item.change === kind).length]))
      const changeLabels: Record<string, string> = { added: '新增', modified: '有变更', removed: '外部已移除', unchanged: '无变化' }
      const ownership = preview.executionMode === 'attached' ? `所选缺陷将归入 ${preview.parentWorkItemKey} · ${preview.parentWorkItemTitle}` : '所选内容将创建或同步独立交付工作单元'
      const selected = await this.openForm({
        title: `同步预览 · ${preview.bundleKey}`,
        description: `${preview.bundleTitle}：新增 ${counts.added}，变更 ${counts.modified}，移除 ${counts.removed}，无变化 ${counts.unchanged}。${ownership}；查看完整内容后再确认，只会应用勾选项。`,
        submitLabel: actionable.length === 0 ? '关闭' : '应用所选变更',
        fields: preview.items.map((item, index) => ({
          name: `change-${index}`, label: `${changeLabels[item.change]} · ${item.externalKey} · ${item.title}`, type: 'checkbox' as const, value: item.change !== 'unchanged',
          help: item.change === 'unchanged' ? '本次内容与当前已导入版本一致，仅供查看' : item.changedPaths.length === 0 ? (preview.executionMode === 'attached' ? `关联到 ${preview.parentWorkItemKey}` : '创建独立交付工作单元') : `变化位置：${item.changedPaths.join('、')}`,
          detail: () => { void this.showSourceImportDetail(preview.uid, item.identity) },
        })),
      })
      if (selected === undefined || actionable.length === 0) return
      const identities = preview.items.filter((item, index) => item.change !== 'unchanged' && selected[`change-${index}`] === true).map(item => item.identity)
      if (identities.length === 0) return
      this.updateBusy(true, '正在保存来源快照并更新交付工作单元…')
      const applied = await call({ kind: 'apply-source-import', workspaceId: this.state.workspaceId!, previewUid: preview.uid, identities })
      if (!applied.ok) throw new Error(applied.error)
      if (!('snapshot' in applied)) throw new Error('应用变更后未返回项目状态')
      this.state.snapshot = applied.snapshot
      shouldRender = true
      if (preview.executionMode === 'attached' && preview.parentWorkItemUid !== undefined) {
        this.state.workItemUid = preview.parentWorkItemUid; this.state.targetArtifactUid = undefined
        this.state.selected = this.workItemSourceUids(applied.snapshot, preview.parentWorkItemUid, stageMenu(this.state.menu) ? this.state.menu : undefined)
      } else {
        const first = applied.snapshot.workItems.find(item => identities.includes(`${item.provider}:${item.kind}:${item.key}`))
        if (first !== undefined) { this.state.workItemUid = first.uid; this.state.selected = this.workItemSourceUids(applied.snapshot, first.uid); this.state.targetArtifactUid = undefined }
      }
    } catch (error) { this.state.error = error instanceof Error ? error.message : String(error); shouldRender = true }
    finally { this.state.loading = false; if (shouldRender) this.render(); else this.updateBusy(false) }
  }

  private async showSourceImportDetail(previewUid: string, identity: string): Promise<void> {
    try {
      const response = await call({ kind: 'read-source-import-detail', workspaceId: this.state.workspaceId!, previewUid, identity })
      if (!response.ok) throw new Error(response.error)
      if (!('sourceImportDetail' in response)) throw new Error('Host returned an unexpected source detail')
      const detail: SourceImportDetail = response.sourceImportDetail
      const backdrop = document.createElement('div'); backdrop.className = 'dsh-sdd-modal-backdrop'
      backdrop.innerHTML = `<section class="dsh-sdd-modal dsh-sdd-source-detail" role="dialog" aria-modal="true"><header class="dsh-sdd-modal-header"><h2>${escapeHtml(detail.source.externalKey ?? detail.source.uid)} · ${escapeHtml(detail.source.title)}</h2><p class="dsh-sdd-muted">${escapeHtml(detail.source.kind)} · ${escapeHtml(detail.source.provider)} · 获取时间 ${escapeHtml(detail.source.fetchedAt)}</p></header><div class="dsh-sdd-modal-body"><div class="dsh-sdd-preview-toolbar"><strong>完整来源内容</strong><button class="dsh-sdd-button primary" data-import-detail-mode="preview">预览</button><button class="dsh-sdd-button" data-import-detail-mode="source">JSON 源码</button></div><div data-import-detail-body></div></div><footer class="dsh-sdd-modal-footer"><button class="dsh-sdd-button primary" type="button" data-source-detail-close>关闭</button></footer></section>`
      this.container!.appendChild(backdrop)
      const body = backdrop.querySelector<HTMLElement>('[data-import-detail-body]')!
      const relationSection = detail.relations.length === 0 ? '' : `<details class="dsh-sdd-source-panel"><summary>业务关系（${detail.relations.length}）</summary><div class="dsh-sdd-list" style="margin-top:10px">${detail.relations.map(item => `<div class="dsh-sdd-row"><span></span><span><strong>${escapeHtml(item.from)} → ${escapeHtml(item.to)}</strong><span class="dsh-sdd-muted">${escapeHtml(item.type)}</span></span></div>`).join('')}</div></details>`
      const sourceText = (value: unknown) => escapeHtml(JSON.stringify(value, null, 2) ?? String(value))
      const render = (mode: 'preview' | 'source') => {
        const columns = detail.previous === undefined ? '1' : '2'
        if (mode === 'source') {
          body.innerHTML = `<div class="dsh-sdd-source-detail-grid" data-columns="${columns}"><section class="dsh-sdd-source-panel"><h3>本次获取的完整内容</h3><pre class="dsh-sdd-template-preview">${sourceText(detail.source)}</pre></section>${detail.previous === undefined ? '' : `<section class="dsh-sdd-source-panel"><h3>当前已导入版本</h3><pre class="dsh-sdd-template-preview">${sourceText(detail.previous)}</pre></section>`}</div>${detail.root === undefined ? '' : `<details class="dsh-sdd-source-panel" style="margin-top:12px"><summary>主事项背景 · JSON 源码</summary><pre class="dsh-sdd-template-preview">${sourceText(detail.root)}</pre></details>`}${relationSection}`
        } else {
          body.innerHTML = `<div class="dsh-sdd-source-detail-grid" data-columns="${columns}"><section class="dsh-sdd-source-panel"><h3>本次获取的完整内容</h3><div data-json-current></div></section>${detail.previous === undefined ? '' : '<section class="dsh-sdd-source-panel"><h3>当前已导入版本</h3><div data-json-previous></div></section>'}</div>${detail.root === undefined ? '' : '<details class="dsh-sdd-source-panel" data-json-root-details style="margin-top:12px"><summary>主事项背景</summary><div data-json-root style="margin-top:10px"></div></details>'}${relationSection}`
          mountJsonPreview(body.querySelector<HTMLElement>('[data-json-current]')!, detail.source)
          if (detail.previous !== undefined) mountJsonPreview(body.querySelector<HTMLElement>('[data-json-previous]')!, detail.previous)
          if (detail.root !== undefined) {
            const rootDetails = body.querySelector<HTMLDetailsElement>('[data-json-root-details]')!
            rootDetails.addEventListener('toggle', () => {
              const root = rootDetails.querySelector<HTMLElement>('[data-json-root]')!
              if (rootDetails.open && root.dataset.jsonMounted !== 'true') { root.dataset.jsonMounted = 'true'; mountJsonPreview(root, detail.root) }
            })
          }
        }
        backdrop.querySelectorAll<HTMLButtonElement>('[data-import-detail-mode]').forEach(button => button.classList.toggle('primary', button.dataset.importDetailMode === mode))
      }
      render('preview')
      backdrop.querySelectorAll<HTMLButtonElement>('[data-import-detail-mode]').forEach(button => button.addEventListener('click', () => render(button.dataset.importDetailMode as 'preview' | 'source')))
      const close = () => backdrop.remove(); backdrop.querySelector<HTMLElement>('[data-source-detail-close]')!.addEventListener('click', close); backdrop.addEventListener('click', event => { if (event.target === backdrop) close() })
    } catch (error) { this.state.error = error instanceof Error ? error.message : String(error); this.render() }
  }

  private selectedInputs(): { artifacts: string[]; sources: string[] } { const artifacts = this.state.snapshot?.artifacts ?? []; const sources = this.state.snapshot?.sources ?? []; return { artifacts: [...this.state.selected].filter(uid => artifacts.some(item => item.uid === uid)), sources: [...this.state.selected].filter(uid => sources.some(item => item.uid === uid)) } }

  private async chooseInputs(): Promise<void> {
    if (!stageMenu(this.state.menu) || this.state.targetArtifactUid !== undefined) return
    const snapshot = this.state.snapshot
    const workItem = snapshot?.workItems.find(item => item.uid === this.state.workItemUid)
    if (snapshot === undefined) return
    const sourceUids = workItem === undefined ? new Set<string>() : this.workItemSourceUids(snapshot, workItem.uid, this.state.menu as StageId)
    const sources = (workItem === undefined ? snapshot.sources : snapshot.sources.filter(item => sourceUids.has(item.uid))).filter(item => item.validationErrors.length === 0)
    const currentStageIndex = STAGES.findIndex(item => item.id === this.state.menu)
    const artifacts = snapshot.artifacts.filter(item => item.workItemUid === this.state.workItemUid && STAGES.findIndex(stage => stage.id === item.stage) < currentStageIndex && item.status === 'accepted')
      .sort((left, right) => STAGES.findIndex(item => item.id === left.stage) - STAGES.findIndex(item => item.id === right.stage) || right.updatedAt.localeCompare(left.updatedAt))
    const values = await this.openForm({
      title: `选择本次输入 · ${STAGES.find(item => item.id === this.state.menu)!.label}`,
      description: '候选材料只在弹窗中展示。默认推荐当前原始来源和上游各阶段最新已验收版本；创建草稿后所选版本会固定写入 manifest.yaml。',
      submitLabel: '应用选择',
      fields: [
        ...sources.map(source => ({ name: `input-${source.uid}`, label: `原始来源 · ${source.externalKey ?? source.uid} · ${source.title}`, type: 'checkbox' as const, value: this.state.selected.has(source.uid), help: `${source.kind} · ${source.provider}` })),
        ...artifacts.map(artifact => ({ name: `input-${artifact.uid}`, label: `${STAGES.find(item => item.id === artifact.stage)?.label ?? artifact.stage} · ${artifact.key} v${artifact.version} · ${artifact.title}`, type: 'checkbox' as const, value: this.state.selected.has(artifact.uid), help: artifact.relativeDirectory })),
      ],
    })
    if (values === undefined) return
    this.state.selected = new Set([...sources, ...artifacts].filter(item => values[`input-${item.uid}`] === true).map(item => item.uid))
    this.render()
  }

  private async startConversation(): Promise<void> {
    if (!stageMenu(this.state.menu) || this.state.targetArtifactUid === undefined) { this.state.error = '请先选择一个本阶段 draft 或 in-review 交付件'; return this.render() }
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
    const artifact = snapshot?.artifacts.find(item => item.uid === this.state.targetArtifactUid)
    const workItem = snapshot?.workItems.find(item => item.uid === artifact?.workItemUid)
    const existing = new Set(workspace?.repositories.map(item => item.id) ?? [])
    const targets = new Set(workItem?.developmentTargets ?? [])
    const repositories = (snapshot?.project?.development.repositories ?? []).filter(item => targets.has(item.id) && !existing.has(item.id))
    if (repositories.length === 0) { this.state.error = existing.size > 0 ? '已添加全部目标代码仓库' : '请先在本需求开发设置中选择代码仓库并填写具体开发目标'; return this.render() }
    const values = await this.openForm({
      title: '添加代码仓库', description: '代码会下载到独立开发空间，并基于所选基线分支创建当前需求的工作分支。', submitLabel: '创建开发空间',
      fields: [{ name: 'repositoryId', label: '代码仓库', type: 'select', required: true, value: repositories[0]!.id, options: repositories.map(item => ({ value: item.id, label: `${item.id} · 基线 ${item.baseBranch} · ${item.source}` })) }],
    })
    if (values === undefined) return
    await this.mutate({ kind: 'development-create', workspaceId: this.state.workspaceId!, artifactUid: this.state.targetArtifactUid, repositoryId: String(values.repositoryId) })
  }

  private async initializeOpenSpec(): Promise<void> {
    if (this.state.targetArtifactUid === undefined) { this.state.error = '请先选择一个开发测试交付件'; return this.render() }
    const snapshot = this.state.snapshot
    const artifact = snapshot?.artifacts.find(item => item.uid === this.state.targetArtifactUid)
    const workItem = snapshot?.workItems.find(item => item.uid === artifact?.workItemUid)
    if (artifact === undefined || workItem?.openSpec?.enabled !== true) return
    const values = await this.openForm({
      title: `初始化 OpenSpec · ${workItem.key}`,
      description: `将在当前隔离特性分支中执行 openspec init，由 OpenSpec 官方 CLI 生成配置、skills 及所选工具支持的 commands。不会修改源仓库、自动提交或推送。`,
      submitLabel: '运行 OpenSpec 初始化',
      fields: [
        { name: 'tools', label: '生成的工具集成', type: 'select', required: true, value: 'agents', options: [
          { value: 'agents', label: 'DSH / 共享 .agents skills（推荐）' },
          { value: 'agents,claude', label: 'DSH + Claude Code' },
          { value: 'agents,cursor', label: 'DSH + Cursor' },
          { value: 'agents,codex', label: 'DSH + Codex' },
          { value: 'all', label: '全部 OpenSpec 支持工具' },
          { value: 'none', label: '只创建 OpenSpec 目录' },
        ], help: 'DSH 读取 .agents/skills。Slash commands 只由 OpenSpec 为支持命令形式的工具生成。' },
        { name: 'confirmed', label: '我确认在当前隔离代码空间中运行 OpenSpec CLI', type: 'checkbox', required: true },
      ],
    })
    if (values?.confirmed !== true) return
    await this.mutate({ kind: 'development-initialize-openspec', workspaceId: this.state.workspaceId!, artifactUid: artifact.uid, tools: String(values.tools) })
  }

  private async installOpenSpec(): Promise<void> {
    const workItem = this.state.snapshot?.workItems.find(item => item.uid === this.state.workItemUid)
    if (workItem?.openSpec?.enabled !== true) return
    const values = await this.openForm({
      title: '安装 OpenSpec CLI',
      description: '将按 OpenSpec 官方方式执行 npm install -g @fission-ai/openspec@latest。需要 Node.js 20.19+、网络访问及全局 npm 安装权限。',
      submitLabel: '安装 OpenSpec',
      fields: [{ name: 'confirmed', label: '我确认在当前电脑全局安装 OpenSpec CLI', type: 'checkbox', required: true }],
    })
    if (values?.confirmed !== true) return
    await this.mutate({ kind: 'development-install-openspec', workspaceId: this.state.workspaceId!, workItemUid: workItem.uid })
  }

  private async disableOpenSpec(): Promise<void> {
    const workItem = this.state.snapshot?.workItems.find(item => item.uid === this.state.workItemUid)
    if (workItem === undefined) return
    const values = await this.openForm({
      title: `不使用 OpenSpec · ${workItem.key}`,
      description: '只关闭当前需求的 OpenSpec 关联，不会删除代码仓中已有的 OpenSpec 文件；开发流程可以继续。',
      submitLabel: '关闭 OpenSpec',
      fields: [{ name: 'confirmed', label: '我确认当前需求不使用 OpenSpec', type: 'checkbox', required: true }],
    })
    if (values?.confirmed !== true) return
    await this.mutate({ kind: 'update-work-item-settings', workspaceId: this.state.workspaceId!, workItemUid: workItem.uid, repositoryScope: workItem.repositoryScope ?? [], developmentTargets: workItem.developmentTargets ?? [], developmentTargetDetails: workItem.developmentTargetDetails, openSpec: { enabled: false } })
  }

  private async runTest(repositoryId: string): Promise<void> {
    if (!this.state.targetArtifactUid) return
    const snapshot = this.state.snapshot
    const workspace = snapshot?.developmentWorkspaces.find(item => item.artifactUid === this.state.targetArtifactUid)
    const repository = workspace?.repositories.find(item => item.id === repositoryId)
    const run = snapshot?.runs.find(item => item.artifactUid === this.state.targetArtifactUid && item.status !== 'completed' && item.sessionId !== undefined)
    if (repository === undefined) return
    if (run?.sessionId === undefined) { this.state.error = '请先开始开发阶段对话，再让 AI 执行测试验证'; return this.render() }
    const binding = this.sessions.binding(run.sessionId as never)
    if (binding === undefined) { this.state.error = '绑定的开发会话当前不可用，请先恢复对话'; return this.render() }
    const prompt = `请对代码仓库 ${repositoryId} 完成当前变更的测试验证。仓库路径：${repository.path}。先读取本需求实际选择的来源和交付件、明确的开发目标、仓库构建配置和 CI 流程，自主判断需要运行的测试；可以修复失败后重跑。每个要作为正式测试证据的命令必须使用前台 bash/pwsh，workdir 必须位于该仓库，并把 description 严格写成“SDD测试：<测试名称>”。不要伪造结果；将实际命令、退出码、覆盖范围、跳过项和最终结论同步到绑定开发交付件。完成前确认代码最后一次变化之后仍有通过的测试证据。`
    try {
      const accepted = await binding.session.prompt([{ type: 'text', text: prompt }], 'queue')
      if (!accepted.ok) { this.state.error = `${accepted.error.code}: ${accepted.error.message}`; return this.render() }
      this.sessions.open(run.sessionId as never); this.close()
    } catch (error) {
      this.state.error = `无法将测试任务发送给开发会话：${error instanceof Error ? error.message : String(error)}`
      this.render()
    }
  }

  private async skipTest(repositoryId: string): Promise<void> {
    if (!this.state.targetArtifactUid) return
    const values = await this.openForm({
      title: `跳过测试 · ${repositoryId}`,
      description: '仅用于文档变更、测试环境不可用或确实没有可执行测试的情况。原因会绑定当前代码状态；代码变化后需要重新确认。',
      submitLabel: '确认跳过测试',
      fields: [{ name: 'reason', label: '跳过原因', type: 'textarea', required: true, placeholder: '说明为什么当前变更不运行测试，以及采用了什么替代验证。' }],
    })
    if (values === undefined) return
    await this.mutate({ kind: 'development-skip-test', workspaceId: this.state.workspaceId!, artifactUid: this.state.targetArtifactUid, repositoryId, reason: String(values.reason) })
  }

  private async commit(repositoryId: string): Promise<void> {
    if (!this.state.targetArtifactUid) return
    const values = await this.openForm({
      title: `提交代码 · ${repositoryId}`, description: '仅当当前代码状态存在有效的通过或人工跳过证据时才允许提交。插件会暂存隔离开发空间中的全部变更并创建本地 Git 提交；不会自动推送或合并。', submitLabel: '提交代码',
      fields: [{ name: 'message', label: '提交说明', type: 'textarea', required: true, placeholder: '例如：feat: 完成订单部分退款流程' }],
    })
    if (values === undefined) return
    await this.mutate({ kind: 'development-commit', workspaceId: this.state.workspaceId!, artifactUid: this.state.targetArtifactUid, repositoryId, message: String(values.message) })
  }

  private async resolveRemoval(workItemUid = this.state.workItemUid): Promise<void> {
    if (workItemUid === undefined) return
    const workItem = this.state.snapshot?.workItems.find(item => item.uid === workItemUid)
    const values = await this.openForm({
      title: `处理外部${workItem?.kind === 'defect' ? '缺陷' : '需求'}移除`, description: '历史来源、交付件和代码不会被删除。请选择这个工作单元后续在本项目中的状态。', submitLabel: '确认处理',
      fields: [{ name: 'decision', label: '处理方式', type: 'select', required: true, value: 'keep', options: [{ value: 'keep', label: '保留本地并继续推进' }, { value: 'archive', label: '归档工作单元' }] }],
    })
    if (values === undefined) return
    await this.mutate({ kind: 'resolve-work-item-removal', workspaceId: this.state.workspaceId!, workItemUid, decision: String(values.decision) as 'keep' | 'archive' })
  }
}

export function apply(ctx: ClientContext): () => void { const workbench = new SddWorkbench(ctx.workspaces, ctx.sessions as unknown as ISessions); return workbench.start() }
