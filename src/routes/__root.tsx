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
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex min-h-18 w-[min(72rem,calc(100%_-_2rem))] items-center justify-between border-b border-border">
        <Link
          className="inline-flex items-center gap-2.5 font-bold no-underline"
          to="/"
          aria-label="MailFlow home"
        >
          <span
            className="grid size-8 place-items-center rounded-lg bg-primary text-xs text-primary-foreground"
            aria-hidden="true"
          >
            M·F
          </span>
          <span>MailFlow</span>
        </Link>
        <nav className="flex gap-5" aria-label="Primary navigation">
          <Link
            className="text-sm font-semibold text-muted-foreground hover:text-foreground aria-[current=page]:text-foreground"
            to="/"
            activeOptions={{ exact: true }}
            activeProps={{ 'aria-current': 'page' }}
          >
            Home
          </Link>
          <Link
            className="text-sm font-semibold text-muted-foreground hover:text-foreground aria-[current=page]:text-foreground"
            to="/app"
            activeProps={{ 'aria-current': 'page' }}
          >
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
