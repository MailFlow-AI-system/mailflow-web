import { randomUUID } from 'node:crypto'

const prefix = '/__local/session/'
const bindingName = 'mailflow.local_session'
const sessionName = 'better-auth.session_token'
const localHost = /^(?:localhost|[a-z0-9]+(?:-[a-z0-9]+)*\.localhost)$/
const pagePath = /^\/(?:login|inbox|sent|drafts|starred|spam|trash)?$/
type BrowserSession = { token?: string; seen: number }
type Transfer = {
  binding: string
  target: string
  expires: number
  challenge?: string
  authorized?: boolean
}

function cookieValue(request: Request, name: string) {
  const values =
    request.headers
      .get('cookie')
      ?.split(';')
      .map((value) => value.trim())
      .filter((value) => value.startsWith(`${name}=`)) ?? []
  return values.length === 1 ? values[0].slice(name.length + 1) : undefined
}
function bindingCookie(binding: string) {
  return `${bindingName}=${binding}; Path=/; HttpOnly; SameSite=Lax`
}

// Vite-only browser bindings keep localhost hosts in one session without Domain=localhost.
export function createLocalSessionBroker() {
  const browsers = new Map<string, BrowserSession>()
  const transfers = new Map<string, Transfer>()
  return {
    handle(request: Request) {
      const url = new URL(request.url)
      const headers = new Headers({
        'Cache-Control': 'private, no-store',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
      })
      const setCookies: string[] = []
      let binding = cookieValue(request, bindingName)
      let browser = binding ? browsers.get(binding) : undefined
      let requestToken = browser?.token
      const result = (response?: Response) => ({
        response,
        setCookies,
        forwardCookie: browser?.token ? `${sessionName}=${browser.token}` : '',
        capture(cookies: string[]) {
          const kept: string[] = []
          for (const cookie of cookies) {
            const pair = cookie.split(';')[0]
            if (pair.startsWith(`${sessionName}=`)) {
              if (browser && browser.token === requestToken) {
                browser.token = pair.slice(sessionName.length + 1) || undefined
                requestToken = browser.token
              }
            } else if (!/^(?:__Secure-)?better-auth[.-]/.test(pair)) kept.push(cookie)
          }
          return kept
        },
      })
      const denied = () =>
        result(new Response('Local session transfer denied', { status: 403, headers }))
      const redirect = (location: string) => {
        headers.set('Location', location)
        for (const cookie of setCookies) headers.append('Set-Cookie', cookie)
        return result(new Response(null, { status: 303, headers }))
      }
      if (url.protocol !== 'http:' || !localHost.test(url.hostname) || url.username || url.password)
        return denied()
      for (const [id, item] of transfers) if (item.expires <= Date.now()) transfers.delete(id)
      for (const [id, item] of browsers)
        if (item.seen + 86_400_000 <= Date.now()) browsers.delete(id)
      if (browser && binding && !browsers.has(binding)) browser = undefined
      const document =
        request.method === 'GET' &&
        (request.headers.get('accept')?.includes('text/html') ||
          request.headers.get('sec-fetch-dest') === 'document')
      const action = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : undefined
      if (!browser && url.hostname === 'localhost' && (document || action === 'join')) {
        if (browsers.size >= 1000) return denied()
        binding = randomUUID()
        browser = { seen: Date.now() }
        browsers.set(binding, browser)
        setCookies.push(bindingCookie(binding))
      }
      if (browser) browser.seen = Date.now()
      if (!action) {
        if (!browser && document && pagePath.test(url.pathname)) {
          const root = new URL(url)
          root.hostname = 'localhost'
          root.pathname = `${prefix}join`
          root.search = ''
          // Do not copy search selectors or private fragments into the handoff.
          root.searchParams.set('to', `${url.origin}${url.pathname}`)
          return redirect(`${root.href}#`)
        }
        return result()
      }
      if (request.method !== 'GET') return denied()
      if (action === 'join' && url.hostname === 'localhost' && binding && browser) {
        const destination = url.searchParams.get('to')
        if (!destination || !URL.canParse(destination) || transfers.size >= 1000) return denied()
        const target = new URL(destination)
        if (
          target.protocol !== 'http:' ||
          !localHost.test(target.hostname) ||
          target.hostname === 'localhost' ||
          target.port !== url.port ||
          target.username ||
          target.password ||
          target.search ||
          target.hash ||
          !pagePath.test(target.pathname)
        )
          return denied()
        const id = randomUUID()
        transfers.set(id, { binding, target: target.href, expires: Date.now() + 30_000 })
        return redirect(`${target.origin}${prefix}receive?id=${id}#`)
      }
      const id = url.searchParams.get('id') ?? ''
      const item = transfers.get(id)
      if (!item) return denied()
      const target = new URL(item.target)
      const root = new URL(target)
      root.hostname = 'localhost'
      const nonceName = `mailflow.local_transfer.${id}`
      if (action === 'receive' && url.origin === target.origin && !item.challenge) {
        item.challenge = randomUUID()
        setCookies.push(
          `${nonceName}=${item.challenge}; Path=${prefix}; HttpOnly; SameSite=Lax; Max-Age=30`,
        )
        return redirect(`${root.origin}${prefix}authorize?id=${id}#`)
      }
      if (
        action === 'authorize' &&
        url.origin === root.origin &&
        item.challenge &&
        browser &&
        binding === item.binding
      ) {
        item.authorized = true
        return redirect(`${target.origin}${prefix}consume?id=${id}#`)
      }
      if (
        action === 'consume' &&
        item.authorized &&
        url.origin === target.origin &&
        item.challenge &&
        cookieValue(request, nonceName) === item.challenge
      ) {
        transfers.delete(id)
        setCookies.push(
          bindingCookie(item.binding),
          `${nonceName}=; Path=${prefix}; HttpOnly; SameSite=Lax; Max-Age=0`,
        )
        return redirect(`${item.target}#`)
      }
      return denied()
    },
  }
}
