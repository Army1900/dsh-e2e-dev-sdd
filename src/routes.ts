import type { IncomingMessage, ServerResponse } from 'node:http'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'
import { parseAction, type SddResponse } from './protocol.ts'
import type { SddProjectService } from './project-service.ts'

export const SDD_API_PATH = '/api/dsh-e2e-dev-sdd'
const BODY_LIMIT = 256 * 1024

function writeJson(res: ServerResponse, status: number, body: SddResponse): void {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'referrer-policy': 'no-referrer',
  })
  res.end(JSON.stringify(body))
}

function browserRequest(req: IncomingMessage): boolean {
  const site = req.headers['sec-fetch-site']
  const browserSignal = site === 'same-origin' || typeof req.headers.origin === 'string'
  const address = req.socket.remoteAddress
  const loopback = address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
  return browserSignal && loopback
}

async function body(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = chunk as Buffer
    size += buffer.length
    if (size > BODY_LIMIT) throw new Error('body too large')
    chunks.push(buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

export function makeSddRoute(service: SddProjectService): WebRoute {
  return {
    kind: 'exact',
    path: SDD_API_PATH,
    handler: async (req, res): Promise<void> => {
      if (req.method !== 'POST') return writeJson(res, 405, { ok: false, error: 'method-not-allowed' })
      if (!browserRequest(req)) return writeJson(res, 403, { ok: false, error: 'forbidden' })
      if (!(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
        return writeJson(res, 415, { ok: false, error: 'json-required' })
      }
      try {
        const action = parseAction(await body(req))
        if (action === undefined) return writeJson(res, 400, { ok: false, error: 'invalid-action' })
        const result = await service.execute(action)
        if ('prompt' in result) return writeJson(res, 200, { ok: true, prompt: result.prompt, ...(result.run === undefined ? {} : { run: result.run }) })
        if ('artifactFile' in result) return writeJson(res, 200, { ok: true, artifactFile: result.artifactFile })
        if ('contentPath' in result) return writeJson(res, 200, { ok: true, template: result })
        if ('sourceKind' in result && 'branches' in result) return writeJson(res, 200, { ok: true, repositoryInspection: result })
        if ('opened' in result) return writeJson(res, 200, { ok: true, opened: true })
        if ('schema' in result && result.schema === 'dsh-sdd/import-preview@1') return writeJson(res, 200, { ok: true, preview: result })
        if ('workspace' in result) return writeJson(res, 200, { ok: true, snapshot: result })
        throw new Error('unexpected SDD response')
      } catch (error) {
        return writeJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
      }
    },
  }
}
