import { Button } from '@mailflow/ui/components'
import { useWorkspaceContext } from '../hooks/useWorkspaceContext'
import type { WorkspaceBoundaryProps } from '../types'

export function WorkspaceBoundary({ children }: WorkspaceBoundaryProps) {
  const state = useWorkspaceContext()
  if (!state || state.status === 'unconfigured') return children
  if (state.status === 'ready' && state.current) return children
  return (
    <section
      className="grid min-h-48 place-content-center gap-3 p-6 text-center"
      aria-live="polite"
    >
      <h1 className="text-lg font-semibold">
        {state.status === 'loading'
          ? 'Loading workspace…'
          : state.status === 'error'
            ? 'Workspace unavailable'
            : state.status === 'empty'
              ? 'No workspace available'
              : 'Open a workspace address'}
      </h1>
      <p className="text-sm text-muted-foreground">
        {state.status === 'error'
          ? 'Access could not be verified. No workspace content has been loaded.'
          : 'Your workspace context is verified before content is displayed.'}
      </p>
      {state.status === 'error' && <Button onClick={state.retry}>Try again</Button>}
    </section>
  )
}
