import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@mailflow/ui/components'

import type { SidebarUserProps } from '../types'

export function userInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  const first = Array.from(parts[0])[0] ?? ''
  const last = parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] ?? '') : ''
  return (first + last).toLocaleUpperCase()
}

export function SidebarUser({ user, signOutAction }: SidebarUserProps) {
  const initials = userInitials(user.name)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Abrir menu de ${user.name}`}
        className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-1 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:hidden"
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sidebar-primary/20 text-[10px] font-medium text-sidebar-primary">
          {initials}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-medium leading-4 text-sidebar-foreground">
            {user.name}
          </span>
          <span className="block truncate text-[10px] leading-4 text-muted-foreground">
            {user.email}
          </span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" sideOffset={8} className="min-w-48">
        {signOutAction}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
