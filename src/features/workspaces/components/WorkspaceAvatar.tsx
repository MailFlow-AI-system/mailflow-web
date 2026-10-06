import { Avatar, AvatarFallback } from '@mailflow/ui/components'
import type { WorkspaceAvatarProps } from '../types/avatar'

export function WorkspaceAvatar({ initials }: WorkspaceAvatarProps) {
  return (
    <Avatar aria-hidden="true" className="size-6 shrink-0">
      <AvatarFallback className="bg-primary/15 text-sidebar-foreground text-[10px] font-medium leading-none">
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
