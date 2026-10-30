import { SidebarProvider, toast } from '@mailflow/ui/components'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: React.PropsWithChildren<{ to: string }>) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useRouterState: ({ select }: { select: (state: { location: { pathname: string } }) => string }) =>
    select({ location: { pathname: '/inbox' } }),
}))
vi.mock('./WorkspaceSwitcher', () => ({ WorkspaceSwitcher: () => null }))
vi.mock('./SidebarSearch', () => ({ SidebarSearch: () => null }))
vi.mock('./SidebarUser', () => ({ SidebarUser: () => null }))

import { Sidebar } from './Sidebar'

afterEach(cleanup)

it('keeps unavailable navigation disabled without warnings and preserves working links', async () => {
  const warning = vi.spyOn(toast, 'warning').mockReturnValue('feature-unavailable')
  const user = userEvent.setup()
  render(
    <SidebarProvider>
      <Sidebar user={{ name: 'Ada', email: 'ada@example.test' }} userMenu={null} />
    </SidebarProvider>,
  )
  const labels = [
    'Drafts',
    'Starred',
    'Spam',
    'Trash',
    'Campaigns',
    'Contacts',
    'Lists',
    'Templates',
    'Automations',
    'Analytics',
    'AI Assistant',
    'AI Templates',
    'AI Insights',
    'Settings',
    'Theme',
  ]
  for (const label of labels) {
    const button = screen.getByRole('button', { name: label })
    expect(button).toHaveAttribute('aria-disabled', 'true')
    button.click()
  }
  const drafts = screen.getByRole('button', { name: 'Drafts' })
  drafts.focus()
  await user.keyboard('{Enter}')
  expect(warning).not.toHaveBeenCalled()
  expect(screen.getByRole('link', { name: 'Inbox' })).toHaveAttribute('href', '/inbox')
  expect(screen.getByRole('link', { name: 'Sent' })).toHaveAttribute('href', '/sent')
  warning.mockRestore()
})
