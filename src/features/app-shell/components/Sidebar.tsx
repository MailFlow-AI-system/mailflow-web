import { Sparkles } from '@mailflow/ui/icons'
import { Link, useRouterState } from '@tanstack/react-router'

import { navigationSections, settingsItem, themeItem } from '../navigation'
import type { NavigationItem } from '../types'
import { SidebarSearch } from './SidebarSearch'
import { SidebarUser } from './SidebarUser'
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  Sidebar as SidebarRoot,
  SidebarTrigger,
} from './ui/sidebar'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'

function NavigationItemButton({ item }: { item: NavigationItem }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const Icon = item.icon
  const active = Boolean(item.to && (pathname === item.to || pathname === `${item.to}/`))

  if (!item.to) {
    return (
      <SidebarMenuButton
        aria-disabled="true"
        title={`${item.label} — em breve`}
        tooltip={item.label}
      >
        <Icon aria-hidden="true" />
        <span>{item.label}</span>
      </SidebarMenuButton>
    )
  }

  return (
    <SidebarMenuButton
      isActive={active}
      render={<Link aria-current={active ? 'page' : undefined} to={item.to} />}
      tooltip={item.label}
    >
      <Icon aria-hidden="true" />
      <span>{item.label}</span>
    </SidebarMenuButton>
  )
}

function SidebarNavigation() {
  return (
    <>
      <SidebarHeader>
        <div className="flex items-center justify-between px-2 gap-2 group-data-[collapsible=icon]:justify-center">
          <Link
            aria-label="MailFlow AI — Início"
            className="flex min-w-0 items-center gap-2 text-sidebar-foreground no-underline group-data-[collapsible=icon]:hidden"
            to="/app"
          >
            <span
              aria-hidden="true"
              className="grid size-8 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground [&_svg]:size-4"
            >
              <Sparkles />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold leading-5">MailFlow AI</span>
              <span className="block truncate text-[10px] leading-4 text-muted-foreground">
                v2.0 · Pro plan
              </span>
            </span>
          </Link>
          <SidebarTrigger className="hidden shrink-0 md:inline-flex" />
        </div>
        <WorkspaceSwitcher />
        <SidebarSearch />
      </SidebarHeader>
      <SidebarContent>
        {navigationSections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarMenu>
              {section.items.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <NavigationItemButton item={item} />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <NavigationItemButton item={settingsItem} />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <NavigationItemButton item={themeItem} />
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarUser />
      </SidebarFooter>
    </>
  )
}

export function Sidebar() {
  return (
    <SidebarRoot collapsible="icon">
      <SidebarNavigation />
    </SidebarRoot>
  )
}
