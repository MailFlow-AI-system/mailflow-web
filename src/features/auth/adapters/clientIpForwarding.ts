/**
 * Forwards the browser's Cloudflare client IP to Core so its per-IP rate limits key on the real
 * client instead of this Worker. Core trusts the IP only with the shared proxy secret, which is a
 * Worker secret injected at request time and never part of the client bundle.
 */
export const CLIENT_IP_HEADER = 'X-MailFlow-Client-IP'
export const PROXY_SECRET_HEADER = 'X-MailFlow-Proxy-Secret'

export type ProxySecretReader = () => string | undefined

export const noProxySecret: ProxySecretReader = () => undefined

/** Trusted client IP headers for an upstream Core request; empty without a secret or client IP. */
export function clientIpHeaders(
  original: Request,
  proxySecret: string | undefined,
): Record<string, string> {
  const clientIp = original.headers.get('cf-connecting-ip')?.trim()
  if (!proxySecret || !clientIp) return {}
  return { [CLIENT_IP_HEADER]: clientIp, [PROXY_SECRET_HEADER]: proxySecret }
}

/** Replaces any client-supplied proxy headers on `outgoing` with the trusted values, if any. */
export function setClientIpHeaders(
  original: Request,
  outgoing: Headers,
  proxySecret: string | undefined,
): Headers {
  outgoing.delete(CLIENT_IP_HEADER)
  outgoing.delete(PROXY_SECRET_HEADER)
  for (const [name, value] of Object.entries(clientIpHeaders(original, proxySecret)))
    outgoing.set(name, value)
  return outgoing
}
