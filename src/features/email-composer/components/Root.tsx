import { Window } from '@mailflow/ui/components'
import { ComposerContext } from '../context'
import { useComposerController } from '../hooks/useComposerController'
import type { ComposerRootProps } from '../types/composer'

export function Root({ children, theme = 'dark' }: ComposerRootProps) {
  const { context, setState, ...window } = useComposerController(theme)
  return (
    <ComposerContext.Provider value={context}>
      <Window {...window} onStateChange={setState}>
        {children}
      </Window>
    </ComposerContext.Provider>
  )
}
