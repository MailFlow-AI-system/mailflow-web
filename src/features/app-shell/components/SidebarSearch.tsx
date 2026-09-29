import { Input } from '@mailflow/ui/components'
import { Command, Search } from '@mailflow/ui/icons'

import { type SidebarSearchProps, sidebarSearchTextSize } from '../types'

export function SidebarSearch({ textSize = 'xs' }: SidebarSearchProps) {
  return (
    <div className="relative group-data-[collapsible=icon]:hidden">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        aria-label="Buscar tudo"
        className={`h-8 border-sidebar-border bg-background pr-12 pl-8 focus-visible:border-input focus-visible:ring-1 focus-visible:ring-ring ${sidebarSearchTextSize[textSize]}`}
        placeholder="Buscar tudo..."
        type="search"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-2 inline-flex -translate-y-1/2 items-center gap-0.5 rounded border border-sidebar-border px-1.5 py-0.5 font-sans text-[10px] leading-4 font-medium text-muted-foreground">
        <Command aria-hidden="true" className="size-2.5" />K
      </kbd>
    </div>
  )
}
