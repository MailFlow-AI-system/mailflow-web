import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { SidebarUser, userInitials } from './SidebarUser'

describe('SidebarUser', () => {
  afterEach(cleanup)

  it('shows the signed-in name, email, and initials', () => {
    render(
      <SidebarUser
        user={{ name: 'Ada Lovelace', email: 'ada@example.test' }}
        signOutAction={<button type="button">Sign out</button>}
      />,
    )

    const trigger = screen.getByRole('button', { name: 'Abrir menu de Ada Lovelace' })
    expect(trigger).toHaveTextContent('Ada Lovelace')
    expect(trigger).toHaveTextContent('ada@example.test')
    expect(trigger).toHaveTextContent('AL')
    expect(screen.getByText('AL').closest('[aria-hidden="true"]')).toBeInTheDocument()
    expect(userInitials('João')).toBe('J')
  })

  it('opens the signed-in user actions from the avatar trigger', async () => {
    render(
      <SidebarUser
        user={{ name: 'Ada Lovelace', email: 'ada@example.test' }}
        signOutAction={<button type="button">Sign out</button>}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu de Ada Lovelace' }))

    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
  })
})
