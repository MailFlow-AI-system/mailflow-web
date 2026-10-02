import { Button, Input, SidebarTrigger } from '@mailflow/ui/components'
import { Filter, Search, X } from '@mailflow/ui/icons'
import { useRouterState } from '@tanstack/react-router'
import { useRef } from 'react'

import { mailboxSearchScope } from '../navigation'
import type {
  AppShellHeaderActionsProps,
  AppShellHeaderMailboxProps,
  AppShellHeaderProps,
  AppShellHeaderSearchProps,
} from '../types'

function HeaderRoot({ children }: AppShellHeaderProps) {
  return (
    <header className="flex w-full shrink-0 items-center gap-2 border-b border-border bg-background/80 px-3 py-2.5 backdrop-blur-[12px] md:w-[29vw] md:max-w-[419px] md:pr-0">
      <SidebarTrigger className="md:hidden" />
      {children}
    </header>
  )
}

function Actions({ children }: AppShellHeaderActionsProps) {
  return <div className="ml-auto flex items-center">{children}</div>
}

function Mailbox({ children }: AppShellHeaderMailboxProps) {
  return (
    <div className="flex w-full min-w-0 items-center gap-2 border-border md:-my-2.5 md:w-[29vw] md:max-w-[419px] md:border-r md:py-2.5 md:pr-3">
      {children}
    </div>
  )
}

function MailboxSearch({ value, onChange }: AppShellHeaderSearchProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const label = `Buscar em ${mailboxSearchScope(pathname)}…`
  const inputRef = useRef<HTMLInputElement>(null)
  const canClear = Boolean(value && onChange)

  return (
    <div className="relative min-w-0 flex-1">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        aria-label={label}
        className={`h-8 pl-8 text-xs focus-visible:border-input focus-visible:ring-1 focus-visible:ring-ring ${
          canClear ? 'pr-8' : ''
        } [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none`}
        onChange={onChange ? (event) => onChange(event.currentTarget.value) : undefined}
        placeholder={label}
        ref={inputRef}
        type="search"
        value={value}
      />
      {canClear ? (
        <Button
          aria-label="Clear search"
          className="absolute top-1/2 right-1 h-6 w-6 -translate-y-1/2"
          onClick={() => {
            onChange?.('')
            inputRef.current?.focus()
          }}
          size="icon"
          type="button"
          variant="ghost"
        >
          <X aria-hidden="true" className="size-3.5" />
        </Button>
      ) : null}
    </div>
  )
}

function MailboxFilters() {
  return (
    <Button
      aria-label="Filtros"
      className="h-8 w-8 shrink-0"
      size="icon"
      type="button"
      variant="ghost"
    >
      <Filter aria-hidden="true" className="size-3.5" />
    </Button>
  )
}

export const Header = Object.assign(HeaderRoot, {
  Actions,
  Mailbox,
  Search: MailboxSearch,
  Filters: MailboxFilters,
})
