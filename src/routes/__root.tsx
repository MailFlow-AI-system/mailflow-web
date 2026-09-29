import { themeScript } from '@mailflow/ui/theme-script'
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
  notFoundComponent: RootNotFoundComponent,
  shellComponent: RootDocument,
})

function AppShell() {
  return <Outlet />
}

export function RootNotFoundComponent() {
  return (
    <section className="mx-auto grid min-h-screen w-[min(36rem,calc(100%_-_2rem))] content-center gap-4">
      <h1 className="m-0 text-4xl">Page not found</h1>
      <p className="m-0 text-muted-foreground">
        The page you requested does not exist or may have moved.
      </p>
      <Link className="font-medium text-primary underline-offset-4 hover:underline" to="/">
        Go to MailFlow
      </Link>
    </section>
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
    <html
      lang="en"
      className="dark"
      data-theme="dark"
      style={{ colorScheme: 'dark' }}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
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
