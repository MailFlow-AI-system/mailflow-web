import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import { SidebarSearch } from './SidebarSearch'

describe('SidebarSearch', () => {
  afterEach(cleanup)

  it('focuses like the header search and accepts input', async () => {
    const user = userEvent.setup()
    render(<SidebarSearch />)

    const search = screen.getByRole('searchbox', { name: 'Buscar tudo' })
    expect(search).toHaveClass('text-xs', 'md:text-sm')
    expect(search).toHaveClass(
      'focus-visible:border-input',
      'focus-visible:ring-1',
      'focus-visible:ring-ring',
    )
    expect(search).not.toHaveClass('focus-visible:ring-[3px]')
    expect(search).not.toHaveClass('focus-visible:ring-ring/50')
    expect(search).not.toHaveClass('focus-visible:border-ring')

    await user.click(search)
    expect(search).toHaveFocus()
    expect(document.querySelector('kbd')).toBeVisible()
    await user.type(search, 'fatura')
    expect(search).toHaveValue('fatura')
  })

  it('uses a smaller font when compact is set', () => {
    render(<SidebarSearch textSize="compact" />)

    const search = screen.getByRole('searchbox', { name: 'Buscar tudo' })
    expect(search).toHaveClass('text-xs', 'md:text-xs')
    expect(search).not.toHaveClass('md:text-sm')
  })
})
