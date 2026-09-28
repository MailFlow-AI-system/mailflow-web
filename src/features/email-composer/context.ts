import { createContext, useContext } from 'react'
import type { ComposerContextValue } from './types/composer'

export const ComposerContext = createContext<ComposerContextValue | null>(null)

export function useComposer() {
  const context = useContext(ComposerContext)
  if (!context) throw new Error('EmailComposer parts must be rendered inside EmailComposer.Root')
  return context
}
