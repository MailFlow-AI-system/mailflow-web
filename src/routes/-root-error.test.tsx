import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { RootErrorComponent, RootNotFoundComponent, Route } from './__root'

const captureBrowserError = vi.hoisted(() => vi.fn())

vi.mock('../observability/faro', () => ({ captureBrowserError }))
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    ),
  }
})

describe('root head', () => {
  it('links the MailFlow brand icons used by the landing page', async () => {
    const head = await Route.options.head?.({} as never)
    expect(head?.links).toEqual(
      expect.arrayContaining([
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/png', sizes: '64x64', href: '/favicon.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      ]),
    )
  })
})

describe('RootErrorComponent', () => {
  it('reports the route error without rendering its contents', async () => {
    const error = new Error('private message body')
    const reset = vi.fn()

    render(<RootErrorComponent error={error} reset={reset} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
    expect(screen.getByRole('alert')).not.toHaveTextContent('private message body')
    await waitFor(() => expect(captureBrowserError).toHaveBeenCalledWith(error))
  })

  it('shows a global not-found page with a session-aware entry link', () => {
    render(<RootNotFoundComponent />)

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Go to MailFlow' })).toHaveAttribute('href', '/')
  })
})
