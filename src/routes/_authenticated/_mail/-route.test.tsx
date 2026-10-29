import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const selection = vi.hoisted(() => ({ message: undefined as string | undefined }))
const sent = vi.hoisted(() => ({
  onSent: undefined as (() => void) | undefined,
  readSentWorkspace: vi.fn(),
  fetchSentEmails: vi.fn(),
}))
vi.mock('#/features/mail-list/clients/sentEmailsClient', () => ({
  readSentWorkspace: sent.readSentWorkspace,
  fetchSentEmails: sent.fetchSentEmails,
}))
const environment = vi.hoisted(() => ({
  VITE_WORKSPACE_BASE_HOST: undefined as string | undefined,
}))
vi.mock('#/config/env', () => ({ clientEnvironment: environment }))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  Outlet: () => <div data-testid="route-outlet" />,
  getRouteApi: () => ({
    useSearch: () => ({ message: selection.message }),
    useRouteContext: () => ({
      user: { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.test' },
    }),
  }),
  useRouterState: ({ select }: { select: (state: { location: { pathname: string } }) => string }) =>
    select({ location: { pathname: '/inbox' } }),
}))

vi.mock('#/features/mail-list/components/MailboxSearch', () => ({
  MailboxSearch: () => <input aria-label="Buscar em inbox" data-testid="global-mailbox-search" />,
}))

vi.mock('@/features/app-shell', () => {
  const Header = ({ children }: { children: ReactNode }) => <header>{children}</header>
  Header.Mailbox = ({ children }: { children: ReactNode }) => (
    <div data-testid="mailbox-toolbar">{children}</div>
  )
  Header.Actions = ({ children }: { children: ReactNode }) => (
    <div data-testid="reader-header-actions">{children}</div>
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
    Root: ({ children, onSent }: { children: ReactNode; onSent?: () => void }) => {
      sent.onSent = onSent
      return <div>{children}</div>
    },
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

import { SentMailList } from '#/features/mail-list/components/SentMailList'
import { normalizeMailSearch } from '#/features/mail-list/types/mailSearch'
import { Route } from './route'

const MailLayout = Route.options.component
if (!MailLayout) throw new Error('Mail layout route has no component')

describe('MailLayout', () => {
  afterEach(() => {
    cleanup()
    environment.VITE_WORKSPACE_BASE_HOST = undefined
    selection.message = undefined
  })

  it('mounts workspace search in workspace mode', () => {
    environment.VITE_WORKSPACE_BASE_HOST = 'workspace.test'
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MailLayout />
      </QueryClientProvider>,
    )
    expect(screen.getByTestId('global-mailbox-search')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Compose' })).toBeVisible()
  })

  it('places one persistent message action toolbar in the shell header only for a selected message', () => {
    const client = new QueryClient()
    const view = render(
      <QueryClientProvider client={client}>
        <MailLayout />
      </QueryClientProvider>,
    )
    expect(screen.queryByRole('toolbar', { name: 'Message actions' })).toBeNull()
    selection.message = 'message-1'
    view.rerender(
      <QueryClientProvider client={client}>
        <MailLayout />
      </QueryClientProvider>,
    )
    expect(screen.getAllByRole('toolbar', { name: 'Message actions' })).toHaveLength(1)
    expect(screen.getByTestId('reader-header-actions')).toContainElement(
      screen.getByRole('toolbar', { name: 'Message actions' }),
    )
    expect(screen.getByRole('button', { name: 'Reply' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Back to messages' })).toBeNull()
    client.clear()
  })
  it('normalizes the inbox query parameter', () => {
    expect(normalizeMailSearch({ q: '  AuroraLedger  ' })).toEqual({ q: 'AuroraLedger' })
    expect(normalizeMailSearch({ q: '   ' })).toEqual({})
    expect(normalizeMailSearch({})).toEqual({})
    expect(normalizeMailSearch({ q: 123 })).toEqual({})
    expect(normalizeMailSearch({ q: false })).toEqual({})
    expect(normalizeMailSearch({ q: ['AuroraLedger'] })).toEqual({})
  })

  it('renders the mailbox toolbar in the header without breadcrumbs', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MailLayout />
      </QueryClientProvider>,
    )

    const toolbar = screen.getByTestId('mailbox-toolbar')
    expect(screen.getByTestId('app-shell')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).not.toBeInTheDocument()
    expect(toolbar).toContainElement(screen.getByRole('textbox', { name: 'Buscar em inbox' }))
    expect(toolbar).toContainElement(screen.getByRole('button', { name: 'Filtros' }))
    expect(toolbar).toContainElement(screen.getByRole('button', { name: 'Compose' }))
    expect(screen.getByTestId('route-outlet')).toBeInTheDocument()
  })
})

it('re-resolves the disabled-UI default after send so a newly selected workspace appears without focus', async () => {
  let workspace = { id: 'a', name: 'Acme', slug: 'acme', role: 'owner' as const }
  sent.readSentWorkspace.mockImplementation(async () => workspace)
  sent.fetchSentEmails.mockImplementation(async (_userId: string, workspaceId: string) => ({
    items: [
      {
        id: `sent-${workspaceId}`,
        to: ['ada@example.test'],
        cc: [],
        bcc: [],
        subject: `Sent in ${workspaceId}`,
        recipientName: '',
        text: '',
        sentAt: null,
      },
    ],
    nextOffset: null,
  }))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view = render(
    <QueryClientProvider client={client}>
      <MailLayout />
      <SentMailList userId="user-1" />
    </QueryClientProvider>,
  )
  await screen.findByText('Sent in a')
  workspace = { ...workspace, id: 'b', name: 'Northwind', slug: 'northwind' }
  await act(async () => sent.onSent?.())
  expect(await screen.findByText('Sent in b')).toBeVisible()
  expect(screen.queryByText('Sent in a')).toBeNull()
  view.unmount()
  client.clear()
})
