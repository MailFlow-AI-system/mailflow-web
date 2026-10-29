import type { VisibleSelectionState } from '../types/selection'

export function getVisibleSelectionState(
  selectedIds: ReadonlySet<string>,
  visibleIds: readonly string[],
): VisibleSelectionState {
  if (visibleIds.length === 0) return 'none'
  const selectedVisible = visibleIds.filter((id) => selectedIds.has(id)).length
  if (selectedVisible === 0) return 'none'
  return selectedVisible === visibleIds.length ? 'all' : 'some'
}
