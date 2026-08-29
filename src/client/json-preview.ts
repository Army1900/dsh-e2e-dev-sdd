const HTML_TAG = /<\/?(?:p|div|span|br|h[1-6]|ul|ol|li|table|thead|tbody|tfoot|tr|th|td|blockquote|pre|code|strong|b|em|i|u|s|a|hr)\b[^>]*>/i
const INITIAL_DEPTH = 2
const ARRAY_PAGE_SIZE = 30

export interface JsonPreviewOptions {
  escapeHtml(value: string): string
  sanitizeHtml(value: string): string
  expanded: ReadonlySet<string>
}

export function looksLikeHtml(value: string): boolean { return HTML_TAG.test(value) }

function pathKey(path: readonly (string | number)[]): string { return encodeURIComponent(JSON.stringify(path)) }

function summary(value: unknown): string {
  if (Array.isArray(value)) return `数组 · ${value.length} 项`
  if (value !== null && typeof value === 'object') return `对象 · ${Object.keys(value).length} 个字段`
  return typeof value
}

function node(value: unknown, path: readonly (string | number)[], depth: number, options: JsonPreviewOptions): string {
  if (value === null) return '<span class="dsh-sdd-json-literal">null</span>'
  if (typeof value === 'boolean' || typeof value === 'number') return `<span class="dsh-sdd-json-literal">${String(value)}</span>`
  if (typeof value === 'string') {
    if (!looksLikeHtml(value)) return `<div class="dsh-sdd-json-text">${options.escapeHtml(value)}</div>`
    const safe = options.sanitizeHtml(value)
    return `<div class="dsh-sdd-json-html">${safe}</div><details class="dsh-sdd-json-html-source"><summary>查看 HTML 源码</summary><pre class="dsh-sdd-template-preview">${options.escapeHtml(value)}</pre></details>`
  }
  if (value === undefined) return '<span class="dsh-sdd-json-literal">undefined</span>'
  const key = pathKey(path)
  if (depth >= INITIAL_DEPTH && !options.expanded.has(key)) return `<button class="dsh-sdd-json-expand" type="button" data-json-expand="${key}">${options.escapeHtml(summary(value))} · 展开</button>`
  const entries: Array<[string, unknown]> = Array.isArray(value) ? value.map((item, index) => [String(index), item]) : Object.entries(value as Record<string, unknown>)
  const allKey = `${key}:all`
  const visible = Array.isArray(value) && !options.expanded.has(allKey) ? entries.slice(0, ARRAY_PAGE_SIZE) : entries
  const rows = visible.map(([field, item]) => `<div class="dsh-sdd-json-row"><div class="dsh-sdd-json-key">${options.escapeHtml(field)}</div><div class="dsh-sdd-json-value">${node(item, [...path, Array.isArray(value) ? Number(field) : field], depth + 1, options)}</div></div>`).join('')
  const more = visible.length < entries.length ? `<button class="dsh-sdd-json-expand" type="button" data-json-expand="${allKey}">再显示 ${entries.length - visible.length} 项</button>` : ''
  return `<div class="dsh-sdd-json-object">${rows || '<span class="dsh-sdd-muted">空对象</span>'}${more}</div>`
}

export function jsonPreviewHtml(value: unknown, options: JsonPreviewOptions): string { return node(value, [], 0, options) }
