import { Button, Input } from '@mailflow/ui/components'
import { Link, useNavigate } from '@tanstack/react-router'
import { type FormEvent, useEffect, useState } from 'react'
import {
  ACCOUNT_NOT_FOUND,
  AUTH_UPSTREAM_UNAVAILABLE,
  PASSWORD_ALREADY_IN_USE,
  PASSWORD_RESET_EMAIL_DELIVERY_FAILED,
} from './authErrorCodes'
import { PasswordInput } from './PasswordInput'

const INVALID_RESET_MESSAGE = 'This reset link is invalid or has expired. Request a new one.'
const RECOVERY_COOLDOWN_SECONDS = 60
const RECOVERY_COOLDOWN_KEY = 'mailflow.password-recovery.cooldown-until'
const RATE_LIMITED_MESSAGE = 'Please wait before requesting another recovery link.'
const PASSWORD_ALREADY_IN_USE_MESSAGE =
  'Choose a new password that differs from your current password.'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasRequested, setHasRequested] = useState(false)
  const [error, setError] = useState<string>()
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const cooldownSeconds = Math.max(0, Math.ceil((cooldownUntil - now) / 1000))

  useEffect(() => {
    const savedCooldown = readSavedCooldown()
    if (savedCooldown > Date.now()) {
      setCooldownUntil(savedCooldown)
      setNow(Date.now())
      return
    }
    clearSavedCooldown()
  }, [])

  useEffect(() => {
    const remainingMs = cooldownUntil - now
    if (remainingMs <= 0) {
      if (cooldownUntil > 0) {
        clearSavedCooldown()
        setCooldownUntil(0)
      }
      return
    }

    const timeout = window.setTimeout(() => setNow(Date.now()), Math.min(remainingMs, 1000))
    return () => window.clearTimeout(timeout)
  }, [cooldownUntil, now])

  function startCooldown(seconds: number) {
    const nextCooldown = Date.now() + seconds * 1000
    try {
      window.sessionStorage.setItem(RECOVERY_COOLDOWN_KEY, String(nextCooldown))
    } catch {
      // The server still enforces the cooldown when browser storage is unavailable.
    }
    setCooldownUntil(nextCooldown)
    setNow(Date.now())
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setHasRequested(false)
    setError(undefined)

    try {
      const response = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          redirectTo: new URL('/reset-password', window.location.origin).toString(),
        }),
      })
      if (response.status === 429) {
        startCooldown(readRetryAfter(response))
        setError(RATE_LIMITED_MESSAGE)
        return
      }
      if (!response.ok) {
        const code = await readErrorCode(response)
        if (response.status === 404 && code === ACCOUNT_NOT_FOUND) {
          setError('No account is registered with that email address.')
          return
        }
        if (response.status === 503 && code === PASSWORD_RESET_EMAIL_DELIVERY_FAILED) {
          startCooldown(RECOVERY_COOLDOWN_SECONDS)
          setError("We couldn't send recovery instructions right now. Please try again shortly.")
          return
        }
        if (response.status === 502 && code === AUTH_UPSTREAM_UNAVAILABLE) {
          setError('Authentication is temporarily unavailable. Please try again shortly.')
          return
        }
        throw new Error('Reset request failed')
      }
      startCooldown(RECOVERY_COOLDOWN_SECONDS)
      setHasRequested(true)
    } catch {
      setError('Unable to request a reset. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="mt-6 grid gap-5" onSubmit={submit}>
      <div className="grid gap-2">
        <label className="font-semibold" htmlFor="recovery-email">
          Email
        </label>
        <Input
          id="recovery-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
        />
      </div>
      {hasRequested ? (
        <p className="m-0 text-sm text-muted-foreground" role="status">
          Recovery instructions were sent to the email address on your account.
        </p>
      ) : null}
      {cooldownSeconds > 0 ? (
        <p className="m-0 text-sm text-muted-foreground" role="status">
          You can request another recovery link in {cooldownSeconds} seconds.
        </p>
      ) : null}
      {error ? (
        <p className="m-0 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={isSubmitting || cooldownSeconds > 0}>
        {isSubmitting
          ? 'Sending…'
          : cooldownSeconds > 0
            ? `Try again in ${cooldownSeconds} seconds`
            : 'Send recovery link'}
      </Button>
    </form>
  )
}

async function readErrorCode(response: Response): Promise<string | undefined> {
  const body: unknown = await response.json().catch(() => undefined)
  if (typeof body !== 'object' || body === null || !('code' in body)) return undefined
  return typeof body.code === 'string' ? body.code : undefined
}

function readRetryAfter(response: Response) {
  const seconds = Number(
    response.headers.get('x-retry-after') ?? response.headers.get('retry-after'),
  )
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : RECOVERY_COOLDOWN_SECONDS
}

function readSavedCooldown() {
  try {
    const savedCooldown = Number(window.sessionStorage.getItem(RECOVERY_COOLDOWN_KEY))
    if (Number.isFinite(savedCooldown) && savedCooldown > Date.now()) {
      return Math.min(savedCooldown, Date.now() + RECOVERY_COOLDOWN_SECONDS * 1000)
    }
  } catch {
    // Browser storage is optional; Core owns enforcement.
  }
  return 0
}

function clearSavedCooldown() {
  try {
    window.sessionStorage.removeItem(RECOVERY_COOLDOWN_KEY)
  } catch {
    // Browser storage is optional; Core owns enforcement.
  }
}

export function ResetPasswordForm({ token }: { token?: string }) {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string>()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(undefined)

    if (!token) {
      setError(INVALID_RESET_MESSAGE)
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmation) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      })
      if (response.status === 400) {
        const code = await readErrorCode(response)
        setError(
          code === PASSWORD_ALREADY_IN_USE
            ? PASSWORD_ALREADY_IN_USE_MESSAGE
            : INVALID_RESET_MESSAGE,
        )
        return
      }
      if (!response.ok) throw new Error('Password reset failed')

      const result: unknown = await response.json().catch(() => undefined)
      if (!isSuccessfulReset(result)) {
        setError(INVALID_RESET_MESSAGE)
        return
      }
      await navigate({ to: '/login', replace: true })
    } catch {
      setError('Unable to reset your password. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!token) {
    return (
      <div className="mt-6 grid gap-4">
        <p className="m-0 text-sm text-destructive" role="alert">
          {INVALID_RESET_MESSAGE}
        </p>
        <Link
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          to="/forgot-password"
        >
          Request a new reset link
        </Link>
      </div>
    )
  }

  return (
    <form className="mt-6 grid gap-5" onSubmit={submit}>
      <div className="grid gap-2">
        <label className="font-semibold" htmlFor="new-password">
          New password
        </label>
        <PasswordInput
          id="new-password"
          autoComplete="new-password"
          minLength={8}
          required
          visibilityLabel="new password"
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
        />
      </div>
      <div className="grid gap-2">
        <label className="font-semibold" htmlFor="confirm-new-password">
          Confirm new password
        </label>
        <PasswordInput
          id="confirm-new-password"
          autoComplete="new-password"
          minLength={8}
          required
          visibilityLabel="confirm new password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.currentTarget.value)}
        />
      </div>
      {error ? (
        <p className="m-0 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : 'Reset password'}
      </Button>
      <Link
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        to="/login"
      >
        Back to sign in
      </Link>
    </form>
  )
}

function isSuccessfulReset(value: unknown): value is { status: true } {
  return typeof value === 'object' && value !== null && 'status' in value && value.status === true
}
