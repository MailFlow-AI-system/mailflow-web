import type { Plugin } from 'vite'
import { createLocalSessionBroker } from './localSessionTransfer.ts'

export function localSessionPlugin(): Plugin {
  return {
    name: 'mailflow-local-session',
    apply: 'serve',
    configureServer(server) {
      const broker = createLocalSessionBroker()
      server.middlewares.use(async (request, response, next) => {
        if (!request.headers.host || !request.url) return next()
        const url = new URL(request.url, `http://${request.headers.host}`)
        // Health checks and Vite assets on loopback IPs do not establish browser sessions.
        if (['127.0.0.1', '[::1]'].includes(url.hostname)) return next()
        const headers = new Headers()
        for (const name of ['cookie', 'accept', 'sec-fetch-dest']) {
          const value = request.headers[name]
          if (typeof value === 'string') headers.set(name, value)
        }
        const local = broker.handle(new Request(url, { method: request.method, headers }))
        if (local.response) {
          response.statusCode = local.response.status
          local.response.headers.forEach((value, name) => {
            if (name !== 'set-cookie') response.setHeader(name, value)
          })
          response.setHeader('set-cookie', local.response.headers.getSetCookie())
          response.end(await local.response.text())
          return
        }
        request.headers.cookie = local.forwardCookie
        for (let index = request.rawHeaders.length - 2; index >= 0; index -= 2) {
          if (request.rawHeaders[index].toLowerCase() === 'cookie')
            request.rawHeaders.splice(index, 2)
        }
        if (local.forwardCookie) request.rawHeaders.push('cookie', local.forwardCookie)
        response.setHeader('referrer-policy', 'no-referrer')
        const setHeader = response.setHeader.bind(response)
        response.setHeader = (name, value) => {
          if (name.toLowerCase() === 'set-cookie') {
            const cookies = Array.isArray(value) ? value.map(String) : [String(value)]
            return setHeader(name, [...local.capture(cookies), ...local.setCookies])
          }
          return setHeader(name, value)
        }
        if (local.setCookies.length) setHeader('set-cookie', local.setCookies)
        next()
      })
    },
  }
}
