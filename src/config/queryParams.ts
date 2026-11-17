export function parseQueryParams(search: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(search))
}

// List state (search, then order) precedes the open message, so a URL reads the same however
// it was reached; other keys follow in insertion order.
const leadingKeys = ['q', 'sort', 'message']

export function stringifyQueryParams(search: Record<string, unknown>): string {
  const params = new URLSearchParams()
  for (const [key, value] of byLeadingKeys(Object.entries(search))) {
    if (value === undefined || value === null) continue
    params.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value))
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

function rank(key: string) {
  const index = leadingKeys.indexOf(key)
  return index === -1 ? leadingKeys.length : index
}

function byLeadingKeys<T extends [string, unknown]>(entries: T[]) {
  // Array sort is stable, so keys outside the list keep their relative order.
  return entries.sort(([a], [b]) => rank(a) - rank(b))
}

/** Same order for the URLs nuqs writes in place, which bypass the router's stringifySearch. */
export function orderQueryParams(search: URLSearchParams): URLSearchParams {
  return new URLSearchParams(byLeadingKeys([...search.entries()]))
}
