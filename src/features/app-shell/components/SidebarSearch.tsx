import { Command, Search } from '@mailflow/ui/icons'

export function SidebarSearch() {
  return (
    <button
      className="flex h-8 w-full items-center gap-2 rounded-md border border-sidebar-border bg-background px-2.5 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden"
      type="button"
    >
      <Search aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-left">Buscar tudo...</span>
      <kbd className="inline-flex items-center gap-0.5 rounded border border-sidebar-border px-1.5 py-0.5 font-sans text-[10px] leading-4 font-medium text-muted-foreground">
        <Command aria-hidden="true" className="size-2.5" />K
      </kbd>
    </button>
  )
}
