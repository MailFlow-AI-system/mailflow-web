import { Button, Select, SelectContent, SelectItem, SelectTrigger } from '@mailflow/ui/components'
import { ChevronUp } from '@mailflow/ui/icons'
import type { WorkspaceSwitcherProps } from '../types'
import { workspaceInitials } from '../utils/workspaceHost'

export function WorkspaceSelector({ state }: WorkspaceSwitcherProps) {
  const label =
    state.status === 'loading'
      ? 'Loading workspace…'
      : state.status === 'error'
        ? 'Workspace unavailable'
        : state.status === 'unconfigured'
          ? 'Workspace not configured'
          : state.status === 'empty'
            ? 'No workspace available'
            : (state.current?.name ?? 'Workspaces')
  const initials = state.current ? workspaceInitials(state.current.name) : '—'
  return (
    <div className="min-w-0">
      <Select value={state.current?.id ?? null} readOnly disabled={state.status !== 'ready'}>
        <SelectTrigger
          aria-label={`Workspace: ${label}`}
          title={label}
          className="h-auto w-full cursor-pointer gap-2 rounded-md border-0 bg-transparent px-2 py-1 text-sidebar-foreground shadow-none hover:bg-accent focus-visible:ring-sidebar-ring data-[popup-open]:bg-accent group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          icon={
            <ChevronUp
              aria-hidden="true"
              className="size-4 text-muted-foreground group-data-[collapsible=icon]:hidden"
            />
          }
        >
          <span
            aria-hidden="true"
            className="grid size-6 shrink-0 place-items-center rounded-full bg-sidebar-accent text-[10px] font-semibold leading-none text-sidebar-primary"
          >
            {initials}
          </span>
          <span className="min-w-0 flex-1 text-left group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-xs font-semibold leading-4">{label}</span>
            <span className="block truncate text-[10px] leading-4 text-muted-foreground">
              Workspace
            </span>
          </span>
        </SelectTrigger>
        <SelectContent
          align="start"
          className="bg-sidebar text-sidebar-foreground ring-sidebar-border"
        >
          {state.items.map((workspace) => (
            <SelectItem key={workspace.id} value={workspace.id}>
              <span
                aria-hidden="true"
                className="grid size-6 shrink-0 place-items-center rounded-full bg-sidebar-accent text-[10px] font-semibold text-sidebar-primary"
              >
                {workspaceInitials(workspace.name)}
              </span>
              <span className="truncate text-xs font-semibold">{workspace.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div aria-live="polite" className="text-xs text-muted-foreground">
        {state.status === 'error' && (
          <Button size="sm" variant="ghost" className="w-full cursor-pointer" onClick={state.retry}>
            Try again
          </Button>
        )}
        {(state.hasMore || state.pageError) && (
          <Button
            size="sm"
            variant="ghost"
            className="w-full cursor-pointer"
            disabled={state.loadingMore}
            onClick={state.loadMore}
          >
            {state.loadingMore
              ? 'Loading…'
              : state.pageError
                ? 'Retry loading workspaces'
                : 'Load more workspaces'}
          </Button>
        )}
      </div>
    </div>
  )
}
