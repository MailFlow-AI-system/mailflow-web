/** The message to open after `openId` leaves the list: the next remaining one, else the previous. */
export function neighborMessageId(
  listIds: readonly string[],
  openId: string,
  removedIds: readonly string[],
) {
  const index = listIds.indexOf(openId)
  if (index === -1) return null
  const removed = new Set(removedIds)
  const remaining = (id: string | undefined) => (id !== undefined && !removed.has(id) ? id : null)
  for (let next = index + 1; next < listIds.length; next++) {
    const id = remaining(listIds[next])
    if (id) return id
  }
  for (let previous = index - 1; previous >= 0; previous--) {
    const id = remaining(listIds[previous])
    if (id) return id
  }
  return null
}
