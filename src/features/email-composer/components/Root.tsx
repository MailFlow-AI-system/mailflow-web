import { Window } from '@mailflow/ui/components'
import { FormProvider } from 'react-hook-form'
import { ComposerContext } from '../context'
import { useComposerController } from '../hooks/useComposerController'
import type { ComposerRootProps } from '../types/composer'

export function Root({ children, theme = 'dark', onValidated }: ComposerRootProps) {
  const { draft, context, setState, ...window } = useComposerController(theme, onValidated)
  return (
    <FormProvider {...draft}>
      <ComposerContext.Provider value={context}>
        <Window {...window} onStateChange={setState}>
          {children}
        </Window>
      </ComposerContext.Provider>
    </FormProvider>
  )
}
