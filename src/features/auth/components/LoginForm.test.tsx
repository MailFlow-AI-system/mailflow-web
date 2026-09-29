import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { signIn, invalidate, navigate, recordAuthTransportFailure } = vi.hoisted(() => ({
  signIn: vi.fn(),
  invalidate: vi.fn(async () => {}),
  navigate: vi.fn(async () => {}),
  recordAuthTransportFailure: vi.fn(),
}))

vi.mock('../clients/authClient', () => ({ authClient: { signIn: { email: signIn } } }))
vi.mock('../../../observability/faro', () => ({ recordAuthTransportFailure }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/forgot-password">{children}</a>,
  useNavigate: () => navigate,
  useRouter: () => ({ invalidate }),
}))

import { LoginForm } from './LoginForm'

describe('LoginForm', () => {
  afterEach(cleanup)
  beforeEach(() => {
    signIn.mockReset()
    invalidate.mockReset()
    invalidate.mockImplementation(async () => {})
    navigate.mockReset()
    navigate.mockImplementation(async () => {})
    recordAuthTransportFailure.mockReset()
  })

  it('validates fields before contacting Core', async () => {
    render(<LoginForm />)
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Enter a valid email address.')).toBeVisible()
    expect(screen.getByText('Enter your password.')).toBeVisible()
    expect(signIn).not.toHaveBeenCalled()
  })

  it('shows a friendly error for invalid credentials', async () => {
    signIn.mockResolvedValue({ error: { status: 401, code: 'INVALID_EMAIL_OR_PASSWORD' } })
    render(<LoginForm />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.test' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'incorrect' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.')
    expect(navigate).not.toHaveBeenCalled()
    expect(recordAuthTransportFailure).not.toHaveBeenCalled()
  })

  it('reports a proxy upstream outage but not a Core HTTP failure', async () => {
    signIn.mockResolvedValueOnce({
      error: { status: 502, code: 'AUTH_UPSTREAM_UNAVAILABLE' },
    })
    render(<LoginForm />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.test' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to sign in. Please try again.',
    )
    expect(recordAuthTransportFailure).toHaveBeenCalledOnce()
    expect(recordAuthTransportFailure).toHaveBeenCalledWith('sign_in', expect.any(Number))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled())
    recordAuthTransportFailure.mockReset()
    signIn.mockResolvedValueOnce({ error: { status: 503, code: 'INTERNAL_SERVER_ERROR' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled())
    expect(recordAuthTransportFailure).not.toHaveBeenCalled()
  })

  it('navigates to the inbox after successful login', async () => {
    signIn.mockResolvedValue({ data: { user: { id: '1' } } })
    render(<LoginForm />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.test' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/inbox' }))
    expect(invalidate).toHaveBeenCalledOnce()
  })

  it('reveals and hides the password when the visibility toggle is clicked', () => {
    render(<LoginForm />)
    const password = screen.getByLabelText('Password')
    expect(password).toHaveAttribute('type', 'password')

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(password).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: 'Show password' })).toBeVisible()
  })

  it('reports an auth transport failure without recording credentials or errors', async () => {
    signIn.mockRejectedValue(new TypeError('private@example.test private-password'))
    render(<LoginForm />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.test' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to sign in. Please try again.',
    )
    expect(recordAuthTransportFailure).toHaveBeenCalledWith('sign_in', expect.any(Number))
    expect(JSON.stringify(recordAuthTransportFailure.mock.calls)).not.toMatch(
      /private@example\.test|private-password/,
    )
  })

  it('does not report a router failure after Core returned a response', async () => {
    signIn.mockResolvedValue({ data: { user: { id: '1' } } })
    invalidate.mockRejectedValueOnce(new TypeError('private navigation detail'))
    render(<LoginForm />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.test' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to sign in. Please try again.',
    )
    expect(recordAuthTransportFailure).not.toHaveBeenCalled()
  })
})
