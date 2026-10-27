import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const environment = vi.hoisted(() => ({
  VITE_WORKSPACE_BASE_HOST: undefined as string | undefined,
}))
vi.mock('#/config/env', () => ({ clientEnvironment: environment }))
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: { component: () => ReactNode }) => ({ options }),
  getRouteApi: () => ({
    useRouteContext: () => ({ user: { id: 'owner' } }),
    useSearch: () => ({}),
  }),
}))
vi.mock('nuqs', async (original) => ({
  ...(await original<object>()),
  useQueryState: () => ['', vi.fn()],
}))
vi.mock('#/features/workspaces/hooks/useWorkspaceContext', () => ({
  useWorkspaceContext: () => ({ current: { slug: 'acme' } }),
}))
vi.mock('#/features/mail-list/components/MailList', () => ({
  MailList: () => <div data-testid="inbox-list" />,
}))
vi.mock('#/features/mail-list/components/SentMailList', () => ({
  SentMailList: ({ userId }: { userId: string }) => (
    <div data-testid="sent-list" data-owner={userId} />
  ),
}))

import { Route as InboxRoute } from './inbox'
import { Route as SentRoute } from './sent'

const Inbox = InboxRoute.options.component
const Sent = SentRoute.options.component
if (!Inbox || !Sent) throw new Error('Mailbox routes must have components')

afterEach(() => {
  cleanup()
  environment.VITE_WORKSPACE_BASE_HOST = undefined
})

describe('Sent page', () => {
  it('uses the Inbox panel, heading, and empty reader layout at every breakpoint', () => {
    const inbox = render(<Inbox />)
    const inboxPanel = screen.getByRole('region', { name: 'Inbox' })
    const layoutClass = inboxPanel.parentElement?.className
    const panelClass = inboxPanel.className
    const headingClass = screen.getByRole('heading', { level: 1 }).className
    const readerClass = inboxPanel.nextElementSibling?.className
    inbox.unmount()

    render(<Sent />)
    const sentPanel = screen.getByRole('region', { name: 'Enviados' })
    expect(sentPanel.parentElement).toHaveClass(layoutClass ?? '')
    expect(sentPanel.className).toBe(panelClass)
    expect(screen.getByRole('heading', { name: 'Enviados', level: 1 }).className).toBe(headingClass)
    expect(sentPanel.nextElementSibling?.className).toBe(readerClass)
    expect(screen.getByTestId('sent-list')).toHaveAttribute('data-owner', 'owner')
  })

  it('mounts Sent when workspace UI is enabled', () => {
    environment.VITE_WORKSPACE_BASE_HOST = 'workspace.test'
    render(<Sent />)
    expect(screen.getByTestId('sent-list')).toHaveAttribute('data-owner', 'owner')
    expect(screen.getByRole('heading', { name: 'Enviados' })).toBeVisible()
  })
})
