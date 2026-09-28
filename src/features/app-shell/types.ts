import type { LucideIcon } from '@mailflow/ui/icons'
import type { ReactNode } from 'react'

export type BreadcrumbItem = {
  label: string
  to?: MailRoutePath
}

export type NavigationItem = {
  label: string
  icon: LucideIcon
  to?: MailRoutePath
}

export type MailRoutePath = '/inbox' | '/sent' | '/drafts' | '/starred' | '/spam' | '/trash'

export type NavigationSection = {
  label: string
  items: readonly NavigationItem[]
}

export type NavigationItemButtonProps = {
  item: NavigationItem
}

export type WorkspaceMarkProps = {
  initials: string
}

export type WorkspaceLabelProps = {
  name: string
}

export type AppShellRootProps = {
  children: ReactNode
}

export type AppShellSidebarProps = {
  footer?: ReactNode
}

export type AppShellHeaderProps = {
  children: ReactNode
}

export type AppShellHeaderActionsProps = {
  children: ReactNode
}

export type AppShellContentProps = {
  children: ReactNode
}

export type AppShellBreadcrumbsProps = {
  items?: readonly BreadcrumbItem[]
}
