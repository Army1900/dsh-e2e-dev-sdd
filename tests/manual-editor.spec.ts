import { describe, expect, it } from 'vitest'
import { applyMarkdownCommand, itemKeySuggestion, manualTemplate, splitMarkdownSections } from '../src/client/manual-editor.ts'

describe('manual import editor helpers', () => {
  it('splits pasted Markdown by level-2 headings', () => {
    const sections = splitMarkdownSections(`## 订单退款\n\n支持分次退款。\n\n## 对账\n\n退款后自动对账。\n`)
    expect(sections).toEqual([
      { title: '订单退款', body: '支持分次退款。' },
      { title: '对账', body: '退款后自动对账。' },
    ])
  })

  it('falls back to level-1 headings and then to blank-line blocks', () => {
    expect(splitMarkdownSections('# 结算\n\n走新结算链路。')).toEqual([{ title: '结算', body: '走新结算链路。' }])
    expect(splitMarkdownSections('- 优惠券\n叠加规则未定。\n\n- 发票\n电子发票。')).toEqual([
      { title: '优惠券', body: '叠加规则未定。' },
      { title: '发票', body: '电子发票。' },
    ])
    expect(splitMarkdownSections('   \n\n ')).toEqual([])
  })

  it('offers Markdown commands that respect the current selection', () => {
    expect(applyMarkdownCommand('hello', 0, 5, 'bold').value).toBe('**hello**')
    expect(applyMarkdownCommand('正文', 2, 2, 'h2').value).toBe('## 正文')
    const list = applyMarkdownCommand('first\nsecond', 7, 7, 'list')
    expect(list.value).toBe('first\n- second')
    const check = applyMarkdownCommand('', 0, 0, 'check')
    expect(check.value).toBe('- [ ] ')
    const table = applyMarkdownCommand('上文\n', 3, 3, 'table')
    expect(table.value).toContain('| 场景 | 预期 | 说明 |')
    const code = applyMarkdownCommand('const a = 1', 0, 11, 'code')
    expect(code.value).toBe('```\nconst a = 1\n```')
  })

  it('provides requirement and defect structure templates', () => {
    expect(manualTemplate('requirement')).toContain('## 背景与现状')
    expect(manualTemplate('requirement')).toContain('## 验收标准')
    expect(manualTemplate('defect')).toContain('## 复现步骤')
    expect(manualTemplate('other')).toContain('## 内容')
  })

  it('suggests child keys from the main key', () => {
    expect(itemKeySuggestion('PAY-381', 0)).toBe('PAY-381-01')
    expect(itemKeySuggestion('PAY-381', 11)).toBe('PAY-381-12')
    expect(itemKeySuggestion('  ', 0)).toBe('')
  })
})
