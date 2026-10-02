import { createParser } from 'nuqs'

export const mailQueryParser = createParser({
  parse: (value) => value.trim() || null,
  serialize: (value: string) => value,
})

export function normalizeMailSearch(search: Record<string, unknown>): { q?: string } {
  const q = typeof search.q === 'string' ? mailQueryParser.parse(search.q) : null
  return q ? { q } : {}
}
