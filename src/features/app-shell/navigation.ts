import {
  ChartColumn,
  FilePenLine,
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

import type { BreadcrumbItem, MailRoutePath, NavigationItem, NavigationSection } from './types'

export const navigationSections: readonly NavigationSection[] = [
  {
    label: 'Mail',
    items: [
      { label: 'Inbox', icon: Inbox, to: '/inbox' },
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

const mailBreadcrumb = (label: string, to: MailRoutePath): readonly BreadcrumbItem[] => [
  { label: 'Mail', to: '/inbox' },
  { label, to },
]

export const breadcrumbsByPath: Readonly<Record<string, readonly BreadcrumbItem[]>> = {
  '/inbox': mailBreadcrumb('Inbox', '/inbox'),
  '/sent': mailBreadcrumb('Sent', '/sent'),
  '/drafts': mailBreadcrumb('Drafts', '/drafts'),
  '/starred': mailBreadcrumb('Starred', '/starred'),
  '/spam': mailBreadcrumb('Spam', '/spam'),
  '/trash': mailBreadcrumb('Trash', '/trash'),
}

export function mailboxSearchScope(pathname: string) {
  const breadcrumbs = breadcrumbsByPath[pathname]
  const label = breadcrumbs?.at(-1)?.label
  return (label ?? 'mail').toLowerCase()
}
