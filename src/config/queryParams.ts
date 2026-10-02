export function parseQueryParams(search: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(search))
}

export function stringifyQueryParams(search: Record<string, unknown>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null) continue
    params.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value))
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}
