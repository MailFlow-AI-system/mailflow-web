import { ThemeProvider } from '@mailflow/ui/theme'
import { themeScript } from '@mailflow/ui/theme-script'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import appCss from '../styles.css?url'
import type { RootDocumentProps, RouterContext } from '../types/router'

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'MailFlow' },
      { name: 'description', content: 'MailFlow workspace email application.' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: Outlet,
  shellComponent: RootDocument,
})

function RootDocument({ children }: RootDocumentProps) {
  return (
    <html
      className="dark"
      data-theme="dark"
      lang="en"
      style={{ colorScheme: 'dark' }}
      suppressHydrationWarning
    >
      <head>
        <HeadContent />
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: package-owned theme bootstrap */}
        <script data-mailflow-theme dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
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
