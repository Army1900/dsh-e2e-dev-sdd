import { randomUUID } from 'node:crypto'
import { appendFile, mkdir, readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { SddEvent, StageId } from './protocol.ts'

export async function appendEvent(workspacePath: string, type: string, subject: string, stage?: StageId, detail?: Record<string, unknown>): Promise<SddEvent> {
  const event: SddEvent = {
    schema: 'dsh-sdd/event@1', id: randomUUID(), time: new Date().toISOString(), type, subject,
    ...(stage === undefined ? {} : { stage }), ...(detail === undefined ? {} : { detail }),
  }
  const root = join(workspacePath, '.sdd', 'events')
  await mkdir(root, { recursive: true })
  const month = event.time.slice(0, 7)
  await appendFile(join(root, `${month}.jsonl`), `${JSON.stringify(event)}\n`, 'utf8')
  return event
}

export async function readRecentEvents(workspacePath: string, limit = 20): Promise<SddEvent[]> {
  const root = join(workspacePath, '.sdd', 'events')
  let files: string[]
  try { files = (await readdir(root)).filter(file => /^\d{4}-\d{2}\.jsonl$/.test(file)).sort().reverse() }
  catch { return [] }
  const events: SddEvent[] = []
  for (const file of files) {
    const lines = (await readFile(join(root, file), 'utf8')).split(/\r?\n/).filter(Boolean).reverse()
    for (const line of lines) {
      try { events.push(JSON.parse(line) as SddEvent) }
      catch { /* A malformed historical line is skipped; current writes are atomic append records. */ }
      if (events.length >= limit) return events
    }
  }
  return events
}
