import { Readable } from 'node:stream'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, it } from 'vitest'
import { makeSddRoute, SDD_API_PATH } from '../src/routes.ts'
import type { SddProjectService } from '../src/project-service.ts'

interface Captured { status: number; body: string }

/** Build a request stand-in: the handler only reads method, headers, socket and the body stream. */
function request(options: { method?: string; headers?: Record<string, string>; remoteAddress?: string; body?: unknown }): IncomingMessage {
  const text = options.body === undefined ? '' : JSON.stringify(options.body)
  const stream = Readable.from(text === '' ? [] : [Buffer.from(text, 'utf8')]) as unknown as IncomingMessage
  stream.method = options.method ?? 'POST'
  stream.headers = options.headers ?? {}
  ;(stream as unknown as { socket: { remoteAddress?: string } }).socket = { remoteAddress: options.remoteAddress ?? '127.0.0.1' }
  return stream
}

function response(): { captured: Captured; res: ServerResponse } {
  const captured: Captured = { status: 0, body: '' }
  const res = {
    writeHead(status: number) { captured.status = status; return this },
    end(chunk?: string) { captured.body = chunk ?? ''; return this },
  } as unknown as ServerResponse
  return { captured, res }
}

function service(): SddProjectService {
  return { execute: async () => ({ workspace: {}, initialized: false }) } as unknown as SddProjectService
}

async function call(options: Parameters<typeof request>[0]): Promise<Captured> {
  const route = makeSddRoute(service())
  const { captured, res } = response()
  await route.handler(request(options), res)
  return captured
}

describe('SDD host route', () => {
  it('exposes the documented path as an exact route', () => {
    expect(makeSddRoute(service())).toMatchObject({ kind: 'exact', path: SDD_API_PATH })
  })

  it('admits the desktop shell metadata that carries no origin or fetch site', async () => {
    const result = await call({ headers: { 'content-type': 'application/json' }, body: { kind: 'snapshot', workspaceId: 'w1' } })
    expect(result.status).toBe(200)
  })

  it('admits the plain web page metadata', async () => {
    const result = await call({
      headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:19387', 'sec-fetch-site': 'same-origin' },
      body: { kind: 'snapshot', workspaceId: 'w1' },
    })
    expect(result.status).toBe(200)
  })

  it('rejects non-loopback callers', async () => {
    const result = await call({ headers: { 'content-type': 'application/json' }, remoteAddress: '10.0.0.7', body: { kind: 'snapshot', workspaceId: 'w1' } })
    expect(result).toMatchObject({ status: 403 })
    expect(result.body).toContain('forbidden')
  })

  it('rejects non-POST and non-JSON requests', async () => {
    expect((await call({ method: 'GET' })).status).toBe(405)
    expect((await call({ headers: { 'content-type': 'text/plain' }, body: { kind: 'snapshot' } })).status).toBe(415)
  })

  it('rejects an unparseable action payload', async () => {
    const result = await call({ headers: { 'content-type': 'application/json' }, body: { kind: 'not-an-action' } })
    expect(result).toMatchObject({ status: 400 })
    expect(result.body).toContain('invalid-action')
  })
})
