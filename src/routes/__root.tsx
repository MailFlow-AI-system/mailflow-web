import { Toaster, TooltipProvider } from '@mailflow/ui/components'
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
import { NuqsAdapter } from 'nuqs/adapters/tanstack-router'
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
      // Same brand icons as the landing page (mailflow-site/public).
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'icon', type: 'image/png', sizes: '64x64', href: '/favicon.png' },
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
    ],
  }),
  component: AppShell,
  errorComponent: RootErrorComponent,
  notFoundComponent: RootNotFoundComponent,
  shellComponent: RootDocument,
})

function AppShell() {
  return (
    <NuqsAdapter>
      <Outlet />
    </NuqsAdapter>
  )
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
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static theme bootstrap from @mailflow/ui, not user input */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <HeadContent />
      </head>
      <body>
        <BrowserObservability />
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
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
