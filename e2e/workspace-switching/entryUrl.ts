export function matchesEntryUrl(url: URL, expected: string) {
  const actual = new URL(url)
  const destination = new URL(expected)
  const messages = actual.searchParams.getAll('message')
  if (
    (destination.pathname === '/inbox' || destination.pathname === '/sent') &&
    !destination.searchParams.has('message') &&
    messages.length === 1 &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(messages[0] ?? '')
  ) {
    // Keep every other parameter's literal encoding for the strict destination comparison.
    actual.search = actual.search
      .slice(1)
      .split('&')
      .filter((parameter) => !parameter.startsWith('message='))
      .join('&')
  }
  return actual.href.replace(/#$/, '') === expected
}
