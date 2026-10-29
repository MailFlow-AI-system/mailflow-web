import { createContext, useContext } from 'react'
import type { MailSelection } from '../types/selection'

export const MailSelectionContext = createContext<MailSelection | null>(null)

export function useMailSelection() {
  return useContext(MailSelectionContext)
}
