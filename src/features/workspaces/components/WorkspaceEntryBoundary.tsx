import { Button } from '@mailflow/ui/components'
import { useHydrated } from '@tanstack/react-router'
import type { WorkspaceEntryBoundaryProps } from '../types/entry'

export function WorkspaceEntryBoundary({
  kind,
  retry,
  children,
  accountAction,
}: WorkspaceEntryBoundaryProps) {
  const hydrated = useHydrated()
  if (kind === 'passthrough') return children
  return (
    <section
      className="mx-auto grid min-h-screen w-[min(28rem,calc(100%_-_2rem))] content-center gap-3 text-center"
      aria-live="polite"
    >
      <h1 className="text-lg font-semibold">
        {kind === 'empty' ? 'No workspace available' : 'Workspace unavailable'}
      </h1>
      <p className="text-sm text-muted-foreground">
        {kind === 'empty'
          ? 'Your account has no available workspace. Contact your workspace administrator.'
          : 'Access could not be verified. No workspace content has been loaded.'}
      </p>
      {kind === 'error' && (
        <Button disabled={!hydrated} onClick={retry}>
          Try again
        </Button>
      )}
      {accountAction && <div inert={!hydrated}>{accountAction}</div>}
    </section>
  )
}
