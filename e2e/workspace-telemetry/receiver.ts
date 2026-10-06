import { createServer } from 'node:http'
import { gunzipSync } from 'node:zlib'

const envelopes: unknown[] = []
const server = createServer(async (request, response) => {
  const origin = request.headers.origin
  if (origin) {
    if (!URL.canParse(origin)) {
      response.writeHead(403).end()
      return
    }
    const url = new URL(origin)
    if (
      url.protocol !== 'http:' ||
      url.port !== '3003' ||
      !(url.hostname === 'workspace.test' || /^[a-z0-9-]+\.workspace\.test$/.test(url.hostname))
    ) {
      response.writeHead(403).end()
      return
    }
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Vary', 'Origin')
    response.setHeader(
      'Access-Control-Allow-Headers',
      'content-type, content-encoding, x-faro-session-id, idempotency-key',
    )
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  }
  if (request.method === 'OPTIONS' && request.url === '/collect') {
    response.writeHead(204).end()
  } else if (!origin && request.method === 'GET' && request.url === '/__snapshot') {
    response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    response.end(JSON.stringify(envelopes))
  } else if (origin && request.method === 'POST' && request.url === '/collect') {
    let size = 0
    const chunks: Buffer[] = []
    for await (const chunk of request) {
      size += chunk.length
      if (size > 262144) {
        response.writeHead(413).end()
        return
      }
      chunks.push(chunk)
    }
    try {
      const body = Buffer.concat(chunks)
      const decoded =
        request.headers['content-encoding'] === 'gzip'
          ? gunzipSync(body, { maxOutputLength: 262144 })
          : body
      envelopes.push(JSON.parse(decoded.toString()))
      if (envelopes.length > 100) envelopes.shift()
      response.writeHead(202).end()
    } catch {
      response.writeHead(400).end()
    }
  } else response.writeHead(404).end()
})
server.listen(14319, '127.0.0.1')
for (const signal of ['SIGTERM', 'SIGINT'] as const)
  process.once(signal, () => server.close(() => process.exit(0)))
