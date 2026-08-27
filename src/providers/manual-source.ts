import { randomUUID } from 'node:crypto'
import type { SddSourceProvider, SourceGetRequest } from '../extensions.ts'
import type { SourceBundle, SourceEnvelope } from '../protocol.ts'

interface ManualItemInput { key?: string; title: string; description?: string }
interface ManualInput { title: string; description?: string; items?: ManualItemInput[] }

function input(value: unknown): ManualInput {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('手工录入需要标题和初始描述')
  const result = value as Partial<ManualInput>
  if (typeof result.title !== 'string' || result.title.trim() === '') throw new Error('手工录入标题不能为空')
  if (result.description !== undefined && typeof result.description !== 'string') throw new Error('手工录入描述必须是文本')
  if (result.items !== undefined && (!Array.isArray(result.items) || result.items.some(item => typeof item !== 'object' || item === null || typeof item.title !== 'string' || item.title.trim() === ''))) {
    throw new Error('手工子项必须包含标题')
  }
  return { title: result.title.trim(), description: result.description?.trim(), items: result.items?.map(item => ({ key: item.key?.trim(), title: item.title.trim(), description: item.description?.trim() })) }
}

function envelope(kind: string, key: string, title: string, description: string | undefined, fetchedAt: string): SourceEnvelope {
  return {
    schema: 'dsh-sdd/source@1', uid: randomUUID(), provider: 'manual', kind, externalKey: key, title, fetchedAt,
    content: { format: 'manual-intake@1', description: description ?? '', note: '由项目用户手工录入，后续确认结论由需求讨论阶段写入正式交付件。' },
  }
}

/** Built-in zero-configuration intake. It normalizes user-entered facts into the regular bundle contract. */
export class ManualSourceProvider implements SddSourceProvider {
  readonly name = 'manual'
  readonly kinds = ['*'] as const

  async get(request: SourceGetRequest): Promise<SourceBundle> {
    const manual = input(request.input)
    const fetchedAt = new Date().toISOString()
    const bundleKey = request.key.trim()
    if (bundleKey === '') throw new Error('手工录入编号不能为空')
    const childInputs = manual.items?.filter(item => item.title.trim() !== '') ?? []
    if (childInputs.length === 0) {
      const item = envelope(request.kind, bundleKey, manual.title, manual.description, fetchedAt)
      return { schema: 'dsh-sdd/source-bundle@1', uid: randomUUID(), provider: this.name, kind: request.kind, externalKey: bundleKey, title: manual.title, fetchedAt, items: [item], relations: [] }
    }
    const root = envelope(request.kind, bundleKey, manual.title, manual.description, fetchedAt)
    const items = childInputs.map((item, index) => envelope(request.kind, item.key || `${bundleKey}-${String(index + 1).padStart(2, '0')}`, item.title, item.description, fetchedAt))
    return {
      schema: 'dsh-sdd/source-bundle@1', uid: randomUUID(), provider: this.name, kind: request.kind, externalKey: bundleKey, title: manual.title, fetchedAt, root, items,
      relations: items.map(item => ({ from: item.externalKey!, to: bundleKey, type: 'child-of' })),
    }
  }
}
