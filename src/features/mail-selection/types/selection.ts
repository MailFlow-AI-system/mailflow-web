export type MailSelectionState = {
  ids: ReadonlySet<string>
  // Touch layouts enter an explicit selection mode, which can hold zero ids.
  mode: boolean
}

export type MailSelectionAction =
  | { type: 'set'; ids: readonly string[]; selected: boolean }
  | { type: 'clear' }
  | { type: 'enter' }
  | { type: 'enterWith'; id: string }
  | { type: 'exit' }

export type VisibleSelectionState = 'none' | 'some' | 'all'

export type MailSelection = {
  count: number
  selecting: boolean
  isSelected: (id: string) => boolean
  setSelected: (id: string, selected: boolean) => void
  setManySelected: (ids: readonly string[], selected: boolean) => void
  clear: () => void
  enter: () => void
  enterWith: (id: string) => void
  exit: () => void
  visibleState: (visibleIds: readonly string[]) => VisibleSelectionState
}
