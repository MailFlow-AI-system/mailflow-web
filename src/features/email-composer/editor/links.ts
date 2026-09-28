export function normalizeLink(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed || Array.from(trimmed).some((character) => character.charCodeAt(0) <= 32))
    return null
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(candidate)
    if (!['https:', 'http:', 'mailto:'].includes(url.protocol)) return null
    if (url.username || url.password) return null
    if (url.protocol === 'mailto:' && !url.pathname.includes('@')) return null
    return url.href
  } catch {
    return null
  }
}
