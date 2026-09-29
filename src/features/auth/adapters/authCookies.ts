const betterAuthCookieNames = new Set([
  'better-auth.session_token',
  'better-auth.session_data',
  'better-auth.account_data',
  'better-auth.dont_remember',
  'better-auth-session_token',
  '__Secure-better-auth.session_token',
  '__Secure-better-auth.session_data',
  '__Secure-better-auth.account_data',
  '__Secure-better-auth.dont_remember',
  '__Secure-better-auth-session_token',
])

export function filterBetterAuthCookies(
  cookieHeader: string | null | undefined,
): string | undefined {
  if (!cookieHeader) return undefined

  const cookies = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .filter((cookie) => {
      const separator = cookie.indexOf('=')
      return separator > 0 && betterAuthCookieNames.has(cookie.slice(0, separator).trim())
    })

  return cookies.length ? cookies.join('; ') : undefined
}
