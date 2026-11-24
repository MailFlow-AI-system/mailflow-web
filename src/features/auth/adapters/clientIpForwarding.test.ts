import { describe, expect, it } from 'vitest'

import {
  CLIENT_IP_HEADER,
  clientIpHeaders,
  noProxySecret,
  PROXY_SECRET_HEADER,
  setClientIpHeaders,
} from './clientIpForwarding'

const secret = 'worker-proxy-secret-0123456789abcdef'

function incoming(headers: Record<string, string> = {}) {
  return new Request('https://acme.example.com/api/auth/sign-in/email', { headers })
}

describe('client IP forwarding', () => {
  it('forwards CF-Connecting-IP with the proxy secret when the secret is set', () => {
    const headers = new Headers({ accept: 'application/json' })

    setClientIpHeaders(incoming({ 'CF-Connecting-IP': '2001:db8::7' }), headers, secret)

    expect(headers.get(CLIENT_IP_HEADER)).toBe('2001:db8::7')
    expect(headers.get(PROXY_SECRET_HEADER)).toBe(secret)
    expect(headers.get('accept')).toBe('application/json')
  })

  it('sends neither header without a secret', () => {
    const headers = new Headers()

    setClientIpHeaders(incoming({ 'CF-Connecting-IP': '203.0.113.27' }), headers, undefined)
    setClientIpHeaders(incoming({ 'CF-Connecting-IP': '203.0.113.27' }), headers, '')

    expect(headers.get(CLIENT_IP_HEADER)).toBeNull()
    expect(headers.get(PROXY_SECRET_HEADER)).toBeNull()
    expect(clientIpHeaders(incoming({ 'CF-Connecting-IP': '203.0.113.27' }), undefined)).toEqual({})
    expect(noProxySecret()).toBeUndefined()
  })

  it('sends neither header when the request has no CF-Connecting-IP', () => {
    const headers = new Headers()

    setClientIpHeaders(incoming({ 'x-real-ip': '198.51.100.66' }), headers, secret)

    expect(headers.get(CLIENT_IP_HEADER)).toBeNull()
    expect(headers.get(PROXY_SECRET_HEADER)).toBeNull()
    expect(headers.get('x-real-ip')).toBeNull()
  })

  it('removes client-supplied proxy headers before setting trusted values', () => {
    const forged = { [CLIENT_IP_HEADER]: '192.0.2.1', [PROXY_SECRET_HEADER]: 'guess' }
    const withSecret = new Headers(forged)
    const withoutSecret = new Headers(forged)

    setClientIpHeaders(
      incoming({ ...forged, 'CF-Connecting-IP': '203.0.113.27' }),
      withSecret,
      secret,
    )
    setClientIpHeaders(
      incoming({ ...forged, 'CF-Connecting-IP': '203.0.113.27' }),
      withoutSecret,
      undefined,
    )

    expect(withSecret.get(CLIENT_IP_HEADER)).toBe('203.0.113.27')
    expect(withSecret.get(PROXY_SECRET_HEADER)).toBe(secret)
    expect(withoutSecret.get(CLIENT_IP_HEADER)).toBeNull()
    expect(withoutSecret.get(PROXY_SECRET_HEADER)).toBeNull()
  })
})
