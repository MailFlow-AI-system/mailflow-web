const user = {
  initials: 'JD',
  name: 'João Dev',
  email: 'joao@mailflow.ai',
}

export function SidebarUser() {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:hidden">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sidebar-primary/20 text-[10px] font-medium text-sidebar-primary">
        {user.initials}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium leading-4 text-sidebar-foreground">
          {user.name}
        </span>
        <span className="block truncate text-[10px] leading-4 text-muted-foreground">
          {user.email}
        </span>
      </span>
    </div>
  )
}
