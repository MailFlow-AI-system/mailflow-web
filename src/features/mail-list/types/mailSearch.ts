import { createParser } from 'nuqs'

export const mailQueryParser = createParser({
  parse: (value) => value.trim() || null,
  serialize: (value: string) => value,
})

export function normalizeMailSearch(search: Record<string, unknown>): {
  q?: string
  message?: string
} {
  const q = typeof search.q === 'string' ? mailQueryParser.parse(search.q) : null
  const message =
    typeof search.message === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(search.message)
      ? search.message
      : undefined
  return { ...(q ? { q } : {}), ...(message ? { message } : {}) }
}
