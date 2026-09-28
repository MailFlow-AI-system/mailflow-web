import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  Outlet: () => <div data-testid="route-outlet" />,
}))

vi.mock('@/features/app-shell', () => {
  const Header = ({ children }: { children: ReactNode }) => <header>{children}</header>
  Header.Actions = ({ children }: { children: ReactNode }) => <div>{children}</div>

  return {
    AppShell: {
      Root: ({ children }: { children: ReactNode }) => (
        <div data-testid="app-shell">{children}</div>
      ),
      Sidebar: () => <aside aria-label="Application navigation" />,
      Main: ({ children }: { children: ReactNode }) => <div>{children}</div>,
      Header,
      Breadcrumbs: () => <nav aria-label="Breadcrumb" />,
      Content: ({ children }: { children: ReactNode }) => <main>{children}</main>,
    },
  }
})

vi.mock('@/features/email-composer', () => ({
  EmailComposer: {
    Root: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Trigger: () => <button type="button">Compose</button>,
    Content: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Header: () => null,
    Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Fields: () => null,
    Editor: () => null,
    Attachments: () => null,
    Toolbar: () => null,
    Footer: () => null,
    Assistant: () => null,
    Minimized: () => null,
    CloseConfirmation: () => null,
  },
}))

import { Route } from './route'

const MailLayout = Route.options.component
if (!MailLayout) throw new Error('Mail layout route has no component')

describe('MailLayout', () => {
  afterEach(cleanup)

  it('renders the application shell, route content, and compose action in the header', () => {
    render(<MailLayout />)

    expect(screen.getByTestId('app-shell')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Compose' })).toBeInTheDocument()
    expect(screen.getByTestId('route-outlet')).toBeInTheDocument()
  })
})
