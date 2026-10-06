export function workspaceRetryAfter(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null
  const seconds = Number(value)
  return Number.isSafeInteger(seconds) && seconds > 0 && seconds <= 60 ? seconds : null
}
