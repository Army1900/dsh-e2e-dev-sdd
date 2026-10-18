/**
 * Pure helpers behind the manual import editor.
 *
 * The editor is a DOM surface, so its text transforms live here where they can be unit tested:
 * splitting pasted Markdown into work items, inserting structure templates, and applying the
 * small Markdown toolbar to a textarea selection.
 */

export type ManualKind = 'requirement' | 'defect' | 'other'

export interface MarkdownSection {
  title: string
  body: string
}

/** Structure templates offered by the editor; they are ordinary Markdown so they stay editable. */
export function manualTemplate(kind: ManualKind): string {
  if (kind === 'defect') {
    return [
      '## 现象',
      '',
      '## 复现步骤',
      '1. ',
      '',
      '## 期望结果',
      '',
      '## 实际结果',
      '',
      '## 影响范围',
      '',
      '## 环境信息',
      '',
    ].join('\n')
  }
  if (kind === 'other') {
    return ['## 背景', '', '## 内容', '', '## 验收标准', '', '## 风险与待确认', ''].join('\n')
  }
  return [
    '## 背景与现状',
    '',
    '## 目标',
    '',
    '## 范围',
    '- 包含：',
    '- 不包含：',
    '',
    '## 业务流程与场景',
    '',
    '## 验收标准',
    '- [ ] ',
    '',
    '## 风险与待确认',
    '',
  ].join('\n')
}

/**
 * Split pasted Markdown into sections.
 *
 * Uses `##` headings when present, falls back to `#`, and finally to blank-line-separated blocks
 * whose first line becomes the title. That covers the two ways people paste notes: headed docs
 * and quick bullet lists.
 */
export function splitMarkdownSections(text: string): MarkdownSection[] {
  const normalized = text.replace(/\r\n?/g, '\n').trim()
  if (normalized === '') return []
  const headingPattern = /^##\s+(.+?)\s*$/gm
  let matches = [...normalized.matchAll(headingPattern)]
  if (matches.length === 0) matches = [...normalized.matchAll(/^#\s+(.+?)\s*$/gm)]
  if (matches.length === 0) {
    return normalized.split(/\n\s*\n/).map(block => block.trim()).filter(block => block !== '').map(block => {
      const [first = '', ...rest] = block.split('\n')
      const title = first.replace(/^[-*]\s+/, '').trim()
      return { title, body: rest.join('\n').trim() }
    }).filter(section => section.title !== '')
  }
  return matches.map((match, index) => {
    const start = match.index! + match[0].length
    const end = matches[index + 1]?.index ?? normalized.length
    return { title: match[1]!.trim(), body: normalized.slice(start, end).trim() }
  }).filter(section => section.title !== '')
}

export type MarkdownCommand = 'h2' | 'bold' | 'list' | 'check' | 'code' | 'table'

/**
 * Apply one toolbar action to `value`/selection. Block commands prefix the current line; inline
 * commands wrap the selection (or insert a placeholder) and keep a useful cursor position.
 */
export function applyMarkdownCommand(value: string, selectionStart: number, selectionEnd: number, command: MarkdownCommand): { value: string; selectionStart: number; selectionEnd: number } {
  const start = Math.max(0, Math.min(selectionStart, value.length))
  const end = Math.max(start, Math.min(selectionEnd, value.length))
  const selected = value.slice(start, end)
  if (command === 'bold') {
    const inner = selected === '' ? '重点内容' : selected
    const inserted = `**${inner}**`
    return { value: value.slice(0, start) + inserted + value.slice(end), selectionStart: start + 2, selectionEnd: start + 2 + inner.length }
  }
  if (command === 'code') {
    const inner = selected === '' ? 'code' : selected
    const inserted = `\`\`\`\n${inner}\n\`\`\``
    return { value: value.slice(0, start) + inserted + value.slice(end), selectionStart: start + 4, selectionEnd: start + 4 + inner.length }
  }
  const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1
  const prefix = command === 'h2' ? '## ' : command === 'list' ? '- ' : command === 'check' ? '- [ ] ' : ''
  if (command === 'table') {
    const table = ['| 场景 | 预期 | 说明 |', '| --- | --- | --- |', '|  |  |  |'].join('\n')
    const at = value.endsWith('\n') || value === '' ? value.length : value.length
    const glue = value === '' || value.endsWith('\n') ? '' : '\n'
    return { value: value + glue + table + '\n', selectionStart: at + glue.length + table.length, selectionEnd: at + glue.length + table.length }
  }
  const next = value.slice(0, lineStart) + prefix + value.slice(lineStart)
  return { value: next, selectionStart: start + prefix.length, selectionEnd: end + prefix.length }
}

/** Suggested external key for one child item; blank stays blank so the host can assign one. */
export function itemKeySuggestion(rootKey: string, index: number): string {
  return rootKey.trim() === '' ? '' : `${rootKey.trim()}-${String(index + 1).padStart(2, '0')}`
}
