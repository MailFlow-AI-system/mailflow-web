import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Button } from './button'

describe('Button', () => {
  it('supports accessible user interaction', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(<Button onClick={handleClick}>Continue</Button>)
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(handleClick).toHaveBeenCalledOnce()
  })
})
