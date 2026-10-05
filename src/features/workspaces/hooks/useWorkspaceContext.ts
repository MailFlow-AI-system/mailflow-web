import { createContext, useContext } from 'react'
import type { WorkspaceState } from '../types'

export const WorkspaceContext = createContext<WorkspaceState | null>(null)
export function useWorkspaceContext() {
  return useContext(WorkspaceContext)
}
