import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useRouterState: ({ select }: { select: (state: { location: { pathname: string } }) => string }) =>
    select({ location: { pathname: '/spam' } }),
}))

import { Breadcrumbs } from './Breadcrumbs'

describe('Breadcrumbs', () => {
  afterEach(cleanup)

  it('composes the Design System primitives with the current route state', () => {
    const { container } = render(<Breadcrumbs />)

    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Mail' })).toHaveAttribute('href', '/inbox')
    expect(screen.getByText('Spam')).toHaveAttribute('aria-current', 'page')
    expect(container.querySelectorAll('[data-slot="breadcrumb-separator"]')).toHaveLength(1)
  })
})
