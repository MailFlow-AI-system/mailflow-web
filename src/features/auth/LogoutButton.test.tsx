import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { signOut, invalidate, navigate } = vi.hoisted(() => ({
  signOut: vi.fn(),
  invalidate: vi.fn(async () => {}),
  navigate: vi.fn(async () => {}),
}))

vi.mock('./client', () => ({ authClient: { signOut } }))
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  useRouter: () => ({ invalidate }),
}))

import { LogoutButton } from './LogoutButton'

describe('LogoutButton', () => {
  afterEach(cleanup)
  beforeEach(() => {
    signOut.mockReset()
    invalidate.mockClear()
    navigate.mockClear()
  })

  it('revokes the session before redirecting to login', async () => {
    signOut.mockResolvedValue({ data: { success: true } })
    render(<LogoutButton />)
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/login' }))
    expect(signOut).toHaveBeenCalledOnce()
    expect(invalidate).toHaveBeenCalledOnce()
  })

  it('stays on the page if revocation fails', async () => {
    signOut.mockResolvedValue({ error: { status: 503 } })
    render(<LogoutButton />)
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to sign out. Please try again.',
    )
    expect(navigate).not.toHaveBeenCalled()
  })
})
