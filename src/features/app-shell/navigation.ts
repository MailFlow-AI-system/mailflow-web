import {
  ChartColumn,
  FilePenLine,
  House,
  Inbox,
  LayoutTemplate,
  Lightbulb,
  ListChecks,
  Megaphone,
  Moon,
  Send,
  Settings,
  ShieldAlert,
  Sparkles,
  Star,
  Trash2,
  Users,
  WandSparkles,
  Workflow,
} from '@mailflow/ui/icons'

import type { BreadcrumbItem, NavigationItem, NavigationSection } from './types'

export const navigationSections: readonly NavigationSection[] = [
  {
    label: 'Mail',
    items: [
      { label: 'Início', icon: House, to: '/app' },
      { label: 'Inbox', icon: Inbox },
      { label: 'Sent', icon: Send },
      { label: 'Drafts', icon: FilePenLine },
      { label: 'Starred', icon: Star },
      { label: 'Spam', icon: ShieldAlert },
      { label: 'Trash', icon: Trash2 },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { label: 'Campaigns', icon: Megaphone },
      { label: 'Contacts', icon: Users },
      { label: 'Lists', icon: ListChecks },
      { label: 'Templates', icon: LayoutTemplate },
      { label: 'Automations', icon: Workflow },
      { label: 'Analytics', icon: ChartColumn },
    ],
  },
  {
    label: 'AI',
    items: [
      { label: 'AI Assistant', icon: Sparkles },
      { label: 'AI Templates', icon: WandSparkles },
      { label: 'AI Insights', icon: Lightbulb },
    ],
  },
]

export const settingsItem: NavigationItem = { label: 'Settings', icon: Settings }

export const themeItem: NavigationItem = { label: 'Theme', icon: Moon }

export const breadcrumbsByPath: Readonly<Record<string, readonly BreadcrumbItem[]>> = {
  '/app': [{ label: 'Início' }],
  '/app/': [{ label: 'Início' }],
}
