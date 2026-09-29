import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { signOut, invalidate, navigate, recordAuthTransportFailure, toastError } = vi.hoisted(
  () => ({
    signOut: vi.fn(),
    invalidate: vi.fn(async () => {}),
    navigate: vi.fn(async () => {}),
    recordAuthTransportFailure: vi.fn(),
    toastError: vi.fn(),
  }),
)

vi.mock('@mailflow/ui/components', async (importOriginal) => {
  const original = await importOriginal<typeof import('@mailflow/ui/components')>()
  return { ...original, toast: { ...original.toast, error: toastError } }
})
vi.mock('./client', () => ({ authClient: { signOut } }))
vi.mock('../../observability/faro', () => ({ recordAuthTransportFailure }))
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  useRouter: () => ({ invalidate }),
}))

import { LogoutButton } from './LogoutButton'

describe('LogoutButton', () => {
  afterEach(cleanup)
  beforeEach(() => {
    signOut.mockReset()
    invalidate.mockReset()
    invalidate.mockImplementation(async () => {})
    navigate.mockReset()
    navigate.mockImplementation(async () => {})
    recordAuthTransportFailure.mockReset()
    toastError.mockReset()
  })

  it('revokes the session before redirecting to login', async () => {
    signOut.mockResolvedValue({ data: { success: true } })
    render(<LogoutButton />)
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/login' }))
    expect(signOut).toHaveBeenCalledOnce()
    expect(invalidate).toHaveBeenCalledOnce()
    expect(toastError).not.toHaveBeenCalled()
  })

  it('stays on the page if revocation fails', async () => {
    signOut.mockResolvedValue({ error: { status: 503 } })
    render(<LogoutButton />)
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('Unable to sign out. Please try again.'),
    )
    expect(navigate).not.toHaveBeenCalled()
    expect(recordAuthTransportFailure).not.toHaveBeenCalled()
  })

  it('reports a proxy upstream outage but not a Core HTTP failure', async () => {
    signOut.mockResolvedValueOnce({
      error: { status: 502, code: 'AUTH_UPSTREAM_UNAVAILABLE' },
    })
    render(<LogoutButton />)
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('Unable to sign out. Please try again.'),
    )
    expect(recordAuthTransportFailure).toHaveBeenCalledOnce()
    expect(recordAuthTransportFailure).toHaveBeenCalledWith('sign_out', expect.any(Number))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign out' })).toBeEnabled())
    recordAuthTransportFailure.mockReset()
    signOut.mockResolvedValueOnce({ error: { status: 503, code: 'INTERNAL_SERVER_ERROR' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign out' })).toBeEnabled())
    expect(recordAuthTransportFailure).not.toHaveBeenCalled()
  })

  it('reports an auth transport failure without recording credentials or errors', async () => {
    signOut.mockRejectedValue(new TypeError('private@example.test private-token'))
    render(<LogoutButton />)
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('Unable to sign out. Please try again.'),
    )
    expect(recordAuthTransportFailure).toHaveBeenCalledWith('sign_out', expect.any(Number))
    expect(JSON.stringify(recordAuthTransportFailure.mock.calls)).not.toMatch(
      /private@example\.test|private-token/,
    )
    expect(JSON.stringify(toastError.mock.calls)).not.toMatch(/private@example\.test|private-token/)
  })

  it('does not report a router failure after Core returned a response', async () => {
    signOut.mockResolvedValue({ data: { success: true } })
    invalidate.mockRejectedValueOnce(new TypeError('private navigation detail'))
    render(<LogoutButton />)
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('Unable to sign out. Please try again.'),
    )
    expect(recordAuthTransportFailure).not.toHaveBeenCalled()
  })
})
