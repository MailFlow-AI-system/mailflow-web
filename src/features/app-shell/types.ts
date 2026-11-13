import type { LucideIcon } from '@mailflow/ui/icons'
import type { ReactNode } from 'react'

import type { User } from '#/types/User'

export type BreadcrumbItem = {
  label: string
  to?: MailRoutePath
}

export type NavigationItem = {
  label: string
  icon: LucideIcon
  to?: MailRoutePath
}

export type MailRoutePath =
  | '/inbox'
  | '/sent'
  | '/drafts'
  | '/starred'
  | '/archive'
  | '/spam'
  | '/trash'

export type NavigationSection = {
  label: string
  items: readonly NavigationItem[]
}

export type NavigationItemButtonProps = {
  item: NavigationItem
  unread?: number
}

export type MailboxBadges = Partial<Record<MailRoutePath, number>>

export type AppShellRootProps = {
  children: ReactNode
}

export type ShellUser = Pick<User, 'name' | 'email'>

export type AppShellSidebarProps = {
  user: ShellUser
  userMenu: ReactNode
  // Unread counts shown beside mailbox links.
  badges?: MailboxBadges | undefined
}

export const sidebarSearchTextSize = {
  xs: 'text-xs',
  compact: 'text-xs md:text-xs',
} as const

export type SidebarSearchTextSize = keyof typeof sidebarSearchTextSize

export type SidebarSearchProps = {
  textSize?: SidebarSearchTextSize
}

export type SidebarUserProps = {
  user: ShellUser
  signOutAction: ReactNode
}

export type AppShellHeaderProps = {
  children: ReactNode
}

export type AppShellHeaderActionsProps = {
  className?: string
  children: ReactNode
}

export type AppShellHeaderMailboxProps = {
  children: ReactNode
  // Spans the header instead of reserving the list column, for lists with no reading pane.
  fullWidth?: boolean
}

export type AppShellHeaderSearchProps = {
  value?: string
  onChange?: (value: string) => void
}

export type AppShellContentProps = {
  children: ReactNode
}

export type AppShellBreadcrumbsProps = {
  items?: readonly BreadcrumbItem[]
}
