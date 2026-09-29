import { cleanup, render, screen } from '@testing-library/react'
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
    expect(userInitials('João')).toBe('J')
  })
})
