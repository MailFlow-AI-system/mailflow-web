import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { signIn, invalidate, navigate } = vi.hoisted(() => ({
  signIn: vi.fn(),
  invalidate: vi.fn(async () => {}),
  navigate: vi.fn(async () => {}),
}))

vi.mock('./client', () => ({ authClient: { signIn: { email: signIn } } }))
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
    invalidate.mockClear()
    navigate.mockClear()
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
  })

  it('navigates to the dashboard after successful login', async () => {
    signIn.mockResolvedValue({ data: { user: { id: '1' } } })
    render(<LoginForm />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.test' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/app' }))
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
})
