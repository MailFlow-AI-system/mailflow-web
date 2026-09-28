import { createServer } from 'node:http'

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1:8099')
  if (request.method === 'GET' && url.pathname === '/health') {
    response.writeHead(200)
    response.end('ok')
    return
  }
  if (request.method === 'GET' && url.pathname === '/api/auth/get-session') {
    const cookie = request.headers.cookie ?? ''
    if (!cookie.includes('better-auth.session_token=')) {
      response.writeHead(401)
      response.end()
      return
    }
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(
      JSON.stringify({
        session: { id: 'e2e-session' },
        user: { id: 'e2e-user', name: 'Ada Lovelace', email: 'ada@example.test' },
      }),
    )
    return
  }
  response.writeHead(404)
  response.end()
})

server.listen(8099, '127.0.0.1')
