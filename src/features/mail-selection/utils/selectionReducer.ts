import type { MailSelectionAction, MailSelectionState } from '../types/selection'

export const emptySelection: MailSelectionState = { ids: new Set(), mode: false }

export function selectionReducer(
  state: MailSelectionState,
  action: MailSelectionAction,
): MailSelectionState {
  switch (action.type) {
    case 'clear':
      return state.ids.size === 0 ? state : { ...state, ids: emptySelection.ids }
    case 'enter':
      return state.mode ? state : { ...state, mode: true }
    case 'enterWith':
      return { ids: new Set([action.id]), mode: true }
    case 'exit':
      return state.mode || state.ids.size > 0 ? emptySelection : state
    case 'set': {
      const next = new Set(state.ids)
      for (const id of action.ids) {
        if (action.selected) next.add(id)
        else next.delete(id)
      }
      return next.size === state.ids.size && [...next].every((id) => state.ids.has(id))
        ? state
        : { ...state, ids: next }
    }
  }
}
