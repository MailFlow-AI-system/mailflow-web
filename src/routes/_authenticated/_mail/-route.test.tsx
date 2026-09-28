import { cleanup, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const routerState = vi.hoisted(() => ({ pathname: '/sent' }))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  Link: ({
    to,
    children,
    activeProps,
    activeOptions,
  }: {
    to: string
    children: ReactNode
    activeProps?: Record<string, string>
    activeOptions?: { exact?: boolean }
  }) => {
    const isActive = activeOptions?.exact
      ? routerState.pathname === to
      : routerState.pathname.startsWith(to)

    return (
      <a href={to} {...(isActive ? activeProps : {})}>
        {children}
      </a>
    )
  },
  Outlet: () => <div data-testid="route-outlet" />,
}))

vi.mock('#/features/auth/LogoutButton', () => ({
  LogoutButton: () => <button type="button">Sign out</button>,
}))

import { Route } from './route'

const MailLayout = Route.options.component
if (!MailLayout) throw new Error('Mail layout route has no component')

describe('MailLayout', () => {
  afterEach(cleanup)

  beforeEach(() => {
    routerState.pathname = '/sent'
  })

  it('provides navigation to every mail folder and renders the child route', () => {
    render(<MailLayout />)

    const navigation = screen.getByRole('navigation', { name: 'Mail folders' })
    const expectedFolders = [
      ['Inbox', '/inbox'],
      ['Sent', '/sent'],
      ['Drafts', '/drafts'],
      ['Starred', '/starred'],
      ['Spam', '/spam'],
      ['Trash', '/trash'],
    ]

    for (const [label, path] of expectedFolders) {
      expect(within(navigation).getByRole('link', { name: label })).toHaveAttribute('href', path)
    }

    expect(within(screen.getByRole('main')).getByTestId('route-outlet')).toBeInTheDocument()
    expect(within(navigation).getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
  })

  it('marks only the current folder as the active page', () => {
    render(<MailLayout />)

    const navigation = screen.getByRole('navigation', { name: 'Mail folders' })

    expect(within(navigation).getByRole('link', { name: 'Sent' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(navigation).getByRole('link', { name: 'Inbox' })).not.toHaveAttribute(
      'aria-current',
    )
  })
})
