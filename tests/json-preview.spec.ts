import { describe, expect, it } from 'vitest'
import { jsonPreviewHtml, looksLikeHtml } from '../src/client/json-preview.ts'

const options = (expanded: ReadonlySet<string> = new Set()) => ({
  expanded,
  escapeHtml: (value: string) => value.replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
  sanitizeHtml: (value: string) => `SAFE:${value}`,
})

describe('JSON preview', () => {
  it('recognizes supported rich-text tags without treating comparison text as HTML', () => {
    expect(looksLikeHtml('<p>需求<strong>正文</strong></p>')).toBe(true)
    expect(looksLikeHtml('amount < limit && limit > 0')).toBe(false)
  })

  it('sanitizes visible HTML fields and defers deep objects', () => {
    const html = jsonPreviewHtml({ description: '<p>正文</p>', nested: { child: { value: 1 } } }, options())
    expect(html).toContain('SAFE:<p>正文</p>')
    expect(html).toContain('data-json-expand=')
    expect(html).not.toContain('value</div>')
  })

  it('limits large arrays until explicitly expanded', () => {
    const html = jsonPreviewHtml(Array.from({ length: 35 }, (_, index) => index), options())
    expect(html).toContain('再显示 5 项')
  })
})
