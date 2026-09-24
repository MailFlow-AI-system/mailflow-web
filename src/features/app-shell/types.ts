import type { LucideIcon } from '@mailflow/ui/icons'
import type { ReactNode } from 'react'

export type BreadcrumbItem = {
  label: string
  to?: '/app'
}

export type NavigationItem = {
  label: string
  icon: LucideIcon
  to?: '/app'
}

export type NavigationSection = {
  label: string
  items: readonly NavigationItem[]
}

export type AppShellRootProps = {
  children: ReactNode
}

export type AppShellHeaderProps = {
  children: ReactNode
  actions?: ReactNode
}

export type AppShellContentProps = {
  children: ReactNode
}

export type AppShellBreadcrumbsProps = {
  items?: readonly BreadcrumbItem[]
}
