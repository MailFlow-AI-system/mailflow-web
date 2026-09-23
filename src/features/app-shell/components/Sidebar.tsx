import { Button } from '@mailflow/ui/components'
import { Moon, Sparkles, Sun } from '@mailflow/ui/icons'
import { useTheme } from '@mailflow/ui/theme'
import { Link, useRouterState } from '@tanstack/react-router'

import { navigationSections, settingsItem } from '../navigation'
import type { NavigationItem } from '../types'
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
  const { resolvedTheme, setTheme } = useTheme()
  const switchToLight = resolvedTheme === 'dark'
  const ThemeIcon = switchToLight ? Sun : Moon
  const themeLabel = switchToLight ? 'Light theme' : 'Dark theme'

  return (
    <>
      <SidebarHeader className="flex-row items-center justify-between group-data-[collapsible=icon]:justify-center">
        <Link
          aria-label="MailFlow AI — Início"
          className="flex min-w-0 items-center gap-3 px-2 text-sm font-semibold text-sidebar-foreground no-underline group-data-[collapsible=icon]:hidden"
          to="/app"
        >
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-sm bg-sidebar-primary text-sidebar-primary-foreground [&_svg]:size-[1.125rem]"
          >
            <Sparkles />
          </span>
          <span className="truncate">MailFlow AI</span>
        </Link>
        <SidebarTrigger className="hidden shrink-0 md:inline-flex" />
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
            <Button
              aria-label={switchToLight ? 'Switch to light theme' : 'Switch to dark theme'}
              className="h-8 w-full min-w-0 justify-start gap-2 px-2 font-normal text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-2 [&_svg]:size-4"
              onClick={() => setTheme(switchToLight ? 'light' : 'dark')}
              title={themeLabel}
              type="button"
              variant="ghost"
            >
              <ThemeIcon aria-hidden="true" />
              <span className="group-data-[collapsible=icon]:hidden">{themeLabel}</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
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
