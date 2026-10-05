import { createContext, useContext } from 'react'
import type { ComposerContextValue, ComposerNavigationGuard } from './types/composer'

export const ComposerContext = createContext<ComposerContextValue | null>(null)

// Optional because the shell also exists on pages without a composer.
export function useComposerNavigationGuard(): ComposerNavigationGuard | null {
  const context = useContext(ComposerContext)
  if (!context) return null
  const { hasLocalDraft, discard, theme, setNavigationPending } = context
  return { hasLocalDraft, discard, theme, setNavigationPending }
}

export function useComposer() {
  const context = useContext(ComposerContext)
  if (!context) throw new Error('EmailComposer parts must be rendered inside EmailComposer.Root')
  return context
}
