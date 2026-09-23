import { TanStackDevtools } from '@tanstack/react-devtools'
import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  type ErrorComponentProps,
  HeadContent,
  Link,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { useEffect } from 'react'

import { BrowserObservability } from '../observability/BrowserObservability'
import { captureBrowserError } from '../observability/faro'
import appCss from '../styles.css?url'

type RouterContext = {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'MailFlow',
      },
      {
        name: 'description',
        content: 'MailFlow workspace email application.',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  component: AppShell,
  errorComponent: RootErrorComponent,
  shellComponent: RootDocument,
})

function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="brand" to="/" aria-label="MailFlow home">
          <span aria-hidden="true">M·F</span>
          <span>MailFlow</span>
        </Link>
        <nav aria-label="Primary navigation">
          <Link to="/" activeOptions={{ exact: true }} activeProps={{ 'aria-current': 'page' }}>
            Home
          </Link>
          <Link to="/app" activeProps={{ 'aria-current': 'page' }}>
            App
          </Link>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}

export function RootErrorComponent({ error, reset }: ErrorComponentProps) {
  useEffect(() => {
    captureBrowserError(error)
  }, [error])

  return (
    <section role="alert" aria-live="assertive">
      <h1>Something went wrong</h1>
      <p>Reload the page or try again.</p>
      <button type="button" onClick={reset}>
        Try again
      </button>
    </section>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <BrowserObservability />
        {children}
        {import.meta.env.DEV ? (
          <TanStackDevtools
            config={{ position: 'bottom-right' }}
            plugins={[
              {
                name: 'TanStack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        ) : null}
        <Scripts />
      </body>
    </html>
  )
}
