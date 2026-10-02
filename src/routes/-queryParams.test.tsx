import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { cleanup, render, screen } from '@testing-library/react'
import { parseAsString, useQueryState } from 'nuqs'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Route } from './__root'

function SearchProbe() {
  const [q] = useQueryState('q', parseAsString.withDefault(''))
  return <p data-testid="url-query">{q}</p>
}

async function createTestRouter(url: string) {
  const root = createRootRoute({ component: Route.options.component })
  const page = createRoute({
    getParentRoute: () => root,
    path: '/query-test',
    component: SearchProbe,
  })
  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory({ initialEntries: [url] }),
    scrollRestoration: false,
  })
  await router.load()
  return router
}

describe('Application query parameter provider', () => {
  beforeEach(() => vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined))
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('reads request query parameters during server rendering through the root adapter', async () => {
    const router = await createTestRouter('/query-test?q=AuroraLedger')
    expect(renderToString(<RouterProvider router={router} />)).toContain('AuroraLedger')
  })

  it('renders the same initial query value on the client', async () => {
    const router = await createTestRouter('/query-test?q=AuroraLedger')
    render(<RouterProvider router={router} />)
    expect(await screen.findByTestId('url-query')).toHaveTextContent('AuroraLedger')
  })
})
