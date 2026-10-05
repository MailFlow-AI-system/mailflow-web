import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import { WorkspaceSwitcher } from './WorkspaceSwitcher'

describe('WorkspaceSwitcher', () => {
  afterEach(cleanup)

  it('keeps the selected workspace visible after choosing another option', async () => {
    const user = userEvent.setup()
    render(<WorkspaceSwitcher />)

    const trigger = screen.getByRole('combobox', { name: 'Workspace: Acme Corp' })
    expect(trigger).toHaveTextContent('Acme Corp')

    await user.click(trigger)
    await user.click(await screen.findByRole('option', { name: /Northwind/ }))

    expect(screen.getByRole('combobox', { name: 'Workspace: Northwind' })).toHaveTextContent(
      'Northwind',
    )
    expect(screen.queryByRole('option', { name: /Acme Corp/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
