import { ChevronUp } from '@mailflow/ui/icons'
import { useState } from 'react'

import { Select, SelectContent, SelectItem, SelectTrigger } from './ui/select.tsx'

const workspaces = [
  { value: 'acme', initials: 'AC', name: 'Acme Corp' },
  { value: 'northwind', initials: 'NW', name: 'Northwind' },
  { value: 'globex', initials: 'GX', name: 'Globex' },
]

function WorkspaceMark({ initials }: { initials: string }) {
  return (
    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-sidebar-accent text-[10px] font-semibold leading-none text-sidebar-primary">
      {initials}
    </span>
  )
}

function WorkspaceLabel({ name }: { name: string }) {
  return (
    <span className="min-w-0">
      <span className="block truncate text-xs font-semibold leading-4">{name}</span>
      <span className="block truncate text-[10px] leading-4 text-muted-foreground">Workspace</span>
    </span>
  )
}

export function WorkspaceSwitcher() {
  const [value, setValue] = useState(workspaces[0].value)
  const selected = workspaces.find((workspace) => workspace.value === value) ?? workspaces[0]

  return (
    <div className="group-data-[collapsible=icon]:hidden">
      <Select
        value={value}
        onValueChange={(next) => {
          if (next) setValue(next)
        }}
      >
        <SelectTrigger
          className="h-auto w-full cursor-pointer gap-2 rounded-md border-0 bg-transparent px-2 py-1 text-sidebar-foreground shadow-none hover:bg-accent focus-visible:ring-sidebar-ring data-[popup-open]:bg-accent"
          icon={<ChevronUp aria-hidden="true" className="size-4 text-muted-foreground" />}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <WorkspaceMark initials={selected.initials} />
            <WorkspaceLabel name={selected.name} />
          </span>
        </SelectTrigger>
        <SelectContent
          align="start"
          className="bg-sidebar text-sidebar-foreground ring-sidebar-border"
        >
          {workspaces.map((workspace) => (
            <SelectItem key={workspace.value} value={workspace.value}>
              <WorkspaceMark initials={workspace.initials} />
              <WorkspaceLabel name={workspace.name} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
