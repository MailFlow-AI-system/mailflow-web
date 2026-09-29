import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  useRouterState: ({ select }: { select: (state: { location: { pathname: string } }) => string }) =>
    select({ location: { pathname: '/spam' } }),
}))

import { Header } from './Header'

describe('Header mailbox toolbar', () => {
  afterEach(cleanup)

  it('scopes search to the current mailbox and reserves the list column on desktop', () => {
    render(
      <Header.Mailbox>
        <Header.Search />
        <Header.Filters />
        <button type="button">Compose</button>
      </Header.Mailbox>,
    )

    const search = screen.getByRole('searchbox', { name: 'Buscar em spam…' })
    const toolbar = search.parentElement?.parentElement
    expect(toolbar).toHaveClass(
      'md:w-[29vw]',
      'md:max-w-[419px]',
      'md:border-r',
      'md:py-2.5',
      'md:pr-3',
    )
    expect(toolbar).not.toHaveClass('border-r')
    expect(toolbar).not.toHaveClass('pr-3')
    expect(search).toHaveAttribute('placeholder', 'Buscar em spam…')
    expect(search).toHaveClass(
      'focus-visible:border-input',
      'focus-visible:ring-1',
      'focus-visible:ring-ring',
    )
    expect(search).not.toHaveClass('focus-visible:ring-[3px]')
    expect(search).not.toHaveClass('focus-visible:ring-ring/50')
    expect(search).not.toHaveClass('focus-visible:border-ring')
    expect(toolbar).toContainElement(screen.getByRole('button', { name: 'Filtros' }))
    expect(toolbar).toContainElement(screen.getByRole('button', { name: 'Compose' }))
  })
})
