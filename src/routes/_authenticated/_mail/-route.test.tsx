import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  Outlet: () => <div data-testid="route-outlet" />,
}))

vi.mock('@/features/app-shell', () => {
  const Header = ({ children }: { children: ReactNode }) => <header>{children}</header>
  Header.Mailbox = ({ children }: { children: ReactNode }) => (
    <div data-testid="mailbox-toolbar">{children}</div>
  )
  Header.Search = () => <input aria-label="Buscar em inbox" />
  Header.Filters = () => <button type="button">Filtros</button>

  return {
    AppShell: {
      Root: ({ children }: { children: ReactNode }) => (
        <div data-testid="app-shell">{children}</div>
      ),
      Sidebar: () => <aside aria-label="Application navigation" />,
      Main: ({ children }: { children: ReactNode }) => <div>{children}</div>,
      Header,
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

  it('renders the mailbox toolbar in the header without breadcrumbs', () => {
    render(<MailLayout />)

    const toolbar = screen.getByTestId('mailbox-toolbar')
    expect(screen.getByTestId('app-shell')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).not.toBeInTheDocument()
    expect(toolbar).toContainElement(screen.getByRole('textbox', { name: 'Buscar em inbox' }))
    expect(toolbar).toContainElement(screen.getByRole('button', { name: 'Filtros' }))
    expect(toolbar).toContainElement(screen.getByRole('button', { name: 'Compose' }))
    expect(screen.getByTestId('route-outlet')).toBeInTheDocument()
  })
})
