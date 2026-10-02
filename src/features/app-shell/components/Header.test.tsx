import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('shows Clear search only for a nonempty controlled value with a change callback', () => {
    const { rerender } = render(<Header.Search onChange={vi.fn()} value="" />)
    expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull()

    rerender(<Header.Search value="invoice" />)
    expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull()

    rerender(<Header.Search onChange={vi.fn()} value="invoice" />)
    expect(screen.getByRole('button', { name: 'Clear search' })).toBeVisible()
  })

  it('clears search on click and returns focus to the input', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Header.Search onChange={onChange} value="invoice" />)

    const search = screen.getByRole('searchbox', { name: 'Buscar em spam…' })
    await user.click(screen.getByRole('button', { name: 'Clear search' }))

    expect(onChange).toHaveBeenCalledWith('')
    expect(search).toHaveFocus()
  })

  it.each(['{Enter}', ' '])(
    'clears search with keyboard input %s and restores focus',
    async (key) => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(<Header.Search onChange={onChange} value="invoice" />)

      const search = screen.getByRole('searchbox', { name: 'Buscar em spam…' })
      const clear = screen.getByRole('button', { name: 'Clear search' })
      await user.click(search)
      await user.tab()
      expect(clear).toHaveFocus()

      await user.keyboard(key)

      expect(onChange).toHaveBeenCalledWith('')
      expect(search).toHaveFocus()
    },
  )
})
