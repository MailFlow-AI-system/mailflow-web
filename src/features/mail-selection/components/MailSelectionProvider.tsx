import { type ReactNode, useMemo, useReducer } from 'react'
import { MailSelectionContext } from '../hooks/useMailSelection'
import type { MailSelection } from '../types/selection'
import { getVisibleSelectionState } from '../utils/getVisibleSelectionState'
import { emptySelection, selectionReducer } from '../utils/selectionReducer'

export function MailSelectionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(selectionReducer, emptySelection)
  const value = useMemo<MailSelection>(
    () => ({
      count: state.ids.size,
      selecting: state.mode || state.ids.size > 0,
      isSelected: (id) => state.ids.has(id),
      setSelected: (id, selected) => dispatch({ type: 'set', ids: [id], selected }),
      setManySelected: (ids, selected) => dispatch({ type: 'set', ids, selected }),
      clear: () => dispatch({ type: 'clear' }),
      enter: () => dispatch({ type: 'enter' }),
      enterWith: (id) => dispatch({ type: 'enterWith', id }),
      exit: () => dispatch({ type: 'exit' }),
      visibleState: (visibleIds) => getVisibleSelectionState(state.ids, visibleIds),
    }),
    [state],
  )

  return <MailSelectionContext.Provider value={value}>{children}</MailSelectionContext.Provider>
}
