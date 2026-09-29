import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn(async () => {}) }))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => navigate,
}))

import { ForgotPasswordForm, ResetPasswordForm } from './PasswordRecoveryForms'
import { passwordRecoveryClient } from './passwordRecoveryClient'

function renderForgotPasswordForm() {
  return render(
    <ForgotPasswordForm requestPasswordReset={passwordRecoveryClient.requestPasswordReset} />,
  )
}

function renderResetPasswordForm(token?: string) {
  return render(
    <ResetPasswordForm token={token} resetPassword={passwordRecoveryClient.resetPassword} />,
  )
}

describe('ForgotPasswordForm', () => {
  const fetcher = vi.fn<typeof fetch>()

  afterEach(() => {
    cleanup()
    window.sessionStorage.clear()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  beforeEach(() => {
    fetcher.mockReset()
    vi.stubGlobal('fetch', fetcher)
  })

  it('validates email with the form schema before requesting a reset', async () => {
    renderForgotPasswordForm()
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send recovery link' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid email address.')
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('requests a reset through the same-origin proxy and confirms accepted delivery', async () => {
    fetcher.mockResolvedValue(Response.json({ status: true }))
    renderForgotPasswordForm()
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'ada@example.test' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send recovery link' }))

    expect(
      await screen.findByText(
        'Recovery instructions were sent to the email address on your account.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again in 60 seconds' })).toBeDisabled()
    expect(fetcher).toHaveBeenCalledWith('/api/auth/request-password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ada@example.test',
        redirectTo: `${window.location.origin}/reset-password`,
      }),
    })
  })

  it('clears delivery confirmation when a later request finds no account', async () => {
    vi.useFakeTimers()
    fetcher
      .mockResolvedValueOnce(Response.json({ status: true }))
      .mockResolvedValueOnce(Response.json({ code: 'ACCOUNT_NOT_FOUND' }, { status: 404 }))
    renderForgotPasswordForm()
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'ada@example.test' },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Send recovery link' }))
      await Promise.resolve()
    })
    expect(
      screen.getByText('Recovery instructions were sent to the email address on your account.'),
    ).toBeInTheDocument()

    for (let second = 0; second < 61; second += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_000)
      })
    }
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'unknown@example.test' },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Send recovery link' }))
      await Promise.resolve()
    })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No account is registered with that email address.',
    )
    expect(
      screen.queryByText('Recovery instructions were sent to the email address on your account.'),
    ).not.toBeInTheDocument()
  })

  it('explains that the email has no registered account without reflecting API text', async () => {
    fetcher
      .mockResolvedValueOnce(
        Response.json(
          { code: 'ACCOUNT_NOT_FOUND', message: 'No account for ada@example.test' },
          { status: 404 },
        ),
      )
      .mockResolvedValueOnce(Response.json({ status: true }))
    renderForgotPasswordForm()
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'ada@example.test' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send recovery link' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No account is registered with that email address.',
    )
    expect(screen.queryByText(/ada@example\.test/)).not.toBeInTheDocument()
    expect(
      screen.queryByText('Recovery instructions were sent to the email address on your account.'),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Try again in/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send recovery link' })).toBeEnabled()

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'grace@example.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send recovery link' }))

    expect(
      await screen.findByText(
        'Recovery instructions were sent to the email address on your account.',
      ),
    ).toBeInTheDocument()
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('explains password recovery email delivery failure without displaying response details', async () => {
    fetcher.mockResolvedValue(
      Response.json(
        {
          code: 'PASSWORD_RESET_EMAIL_DELIVERY_FAILED',
          message: 'provider failed for ada@example.test with private-token',
        },
        { status: 503 },
      ),
    )
    renderForgotPasswordForm()
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'ada@example.test' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send recovery link' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "We couldn't send recovery instructions right now. Please try again shortly.",
    )
    expect(screen.queryByText(/ada@example\.test|private-token/)).not.toBeInTheDocument()
    expect(
      screen.queryByText('Recovery instructions were sent to the email address on your account.'),
    ).not.toBeInTheDocument()
  })

  it('shows a generic upstream failure without displaying response details', async () => {
    fetcher.mockResolvedValue(
      Response.json(
        { code: 'AUTH_UPSTREAM_UNAVAILABLE', message: 'ada@example.test token secret-detail' },
        { status: 502 },
      ),
    )
    renderForgotPasswordForm()
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'ada@example.test' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send recovery link' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Authentication is temporarily unavailable. Please try again shortly.',
    )
    expect(screen.queryByText(/ada@example\.test|secret-detail|token/)).not.toBeInTheDocument()
  })

  it('uses Retry-After for a clear cooldown and restores it after reload', async () => {
    vi.useFakeTimers()
    fetcher.mockResolvedValue(
      Response.json(
        { message: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'X-Retry-After': '12' } },
      ),
    )
    const firstRender = renderForgotPasswordForm()
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'ada@example.test' },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Send recovery link' }))
      await Promise.resolve()
    })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please wait before requesting another recovery link.',
    )
    expect(screen.getByRole('button', { name: 'Try again in 12 seconds' })).toBeDisabled()

    firstRender.unmount()
    renderForgotPasswordForm()
    expect(screen.getByRole('button', { name: 'Try again in 12 seconds' })).toBeDisabled()

    for (let second = 0; second < 12; second += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_000)
      })
    }
    expect(screen.getByRole('button', { name: 'Send recovery link' })).toBeEnabled()
  })

  it('accepts the standard Retry-After header when the Better Auth header is absent', async () => {
    fetcher.mockResolvedValue(
      Response.json(
        { message: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '9' } },
      ),
    )
    renderForgotPasswordForm()
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'ada@example.test' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send recovery link' }))

    expect(await screen.findByRole('button', { name: 'Try again in 9 seconds' })).toBeDisabled()
  })
})

describe('ResetPasswordForm', () => {
  const fetcher = vi.fn<typeof fetch>()

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  beforeEach(() => {
    fetcher.mockReset()
    navigate.mockReset()
    navigate.mockImplementation(async () => {})
    vi.stubGlobal('fetch', fetcher)
  })

  it('requires matching passwords before sending the token to Core', async () => {
    renderResetPasswordForm('reset-token')
    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'new-password-1' },
    })
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'new-password-2' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Passwords do not match.')
    expect(screen.getByLabelText('Confirm new password')).toHaveAttribute('aria-invalid', 'true')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('rejects a password shorter than eight characters before resetting', async () => {
    renderResetPasswordForm('reset-token')
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'short' } })
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'short' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Password must be at least 8 characters.',
    )
    expect(screen.getByLabelText('New password')).toHaveAttribute('aria-invalid', 'true')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('posts the token and new password, then returns to login without signing in', async () => {
    fetcher.mockResolvedValue(Response.json({ status: true }))
    renderResetPasswordForm('reset-token')
    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'new-password-123' },
    })
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'new-password-123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }))

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/login', replace: true }))
    expect(fetcher).toHaveBeenCalledWith('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'reset-token', newPassword: 'new-password-123' }),
    })
  })

  it('explains when a reset token is invalid or expired without exposing it', async () => {
    fetcher.mockResolvedValue(Response.json({ code: 'INVALID_TOKEN' }, { status: 400 }))
    renderResetPasswordForm('private-reset-token')
    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'new-password-123' },
    })
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'new-password-123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This reset link is invalid or has expired. Request a new one.',
    )
    expect(screen.queryByText('private-reset-token')).not.toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('explains that the new password must differ from the current password', async () => {
    fetcher.mockResolvedValue(
      Response.json(
        { code: 'PASSWORD_ALREADY_IN_USE', message: 'The same password is already in use.' },
        { status: 400 },
      ),
    )
    renderResetPasswordForm('private-reset-token')
    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'safe-current-password-123' },
    })
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'safe-current-password-123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Choose a new password that differs from your current password.',
    )
    expect(screen.queryByText('private-reset-token')).not.toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('does not submit when the reset token is missing', async () => {
    renderResetPasswordForm()

    expect(screen.getByRole('alert')).toHaveTextContent(
      'This reset link is invalid or has expired. Request a new one.',
    )
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('reveals and hides each password when its visibility toggle is clicked', () => {
    renderResetPasswordForm('reset-token')
    const newPassword = screen.getByLabelText('New password')
    const confirmation = screen.getByLabelText('Confirm new password')
    expect(newPassword).toHaveAttribute('type', 'password')
    expect(confirmation).toHaveAttribute('type', 'password')

    fireEvent.click(screen.getByRole('button', { name: 'Show new password' }))
    expect(newPassword).toHaveAttribute('type', 'text')
    expect(confirmation).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: 'Hide new password' })).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Hide new password' }))
    expect(newPassword).toHaveAttribute('type', 'password')

    fireEvent.click(screen.getByRole('button', { name: 'Show confirm new password' }))
    expect(confirmation).toHaveAttribute('type', 'text')
    expect(newPassword).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: 'Hide confirm new password' })).toBeVisible()
  })
})
