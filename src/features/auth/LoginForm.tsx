import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input } from '@mailflow/ui/components'
import { Eye, EyeOff } from '@mailflow/ui/icons'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { recordAuthTransportFailure } from '../../observability/faro'
import { AUTH_UPSTREAM_UNAVAILABLE } from './authErrorCodes'
import { authClient } from './client'
import { loginSchema } from './schemas/loginSchema'
import type { LoginValues } from './types/LoginValues'

const INVALID_CREDENTIALS_MESSAGE = 'Email or password is incorrect.'
const SIGN_IN_ERROR_MESSAGE = 'Unable to sign in. Please try again.'

export function LoginForm() {
  const navigate = useNavigate()
  const router = useRouter()
  const [passwordVisible, setPasswordVisible] = useState(false)
  const {
    register,
    handleSubmit,
    setError: setFormError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  const submit = handleSubmit(async ({ email, password }) => {
    clearErrors('root.server')
    const authStartedAt = performance.now()
    let authRequestReturned = false
    try {
      const result = await authClient.signIn.email({ email, password })
      authRequestReturned = true
      if (result.error) {
        if (result.error.code === AUTH_UPSTREAM_UNAVAILABLE) {
          recordAuthTransportFailure('sign_in', performance.now() - authStartedAt)
        }
        throw new Error(
          result.error.status === 401 || result.error.code === 'INVALID_EMAIL_OR_PASSWORD'
            ? INVALID_CREDENTIALS_MESSAGE
            : SIGN_IN_ERROR_MESSAGE,
        )
      }
      await router.invalidate()
      await navigate({ to: '/inbox' })
    } catch (error) {
      if (!authRequestReturned && error instanceof TypeError) {
        recordAuthTransportFailure('sign_in', performance.now() - authStartedAt)
      }
      const message =
        error instanceof Error &&
        (error.message === INVALID_CREDENTIALS_MESSAGE || error.message === SIGN_IN_ERROR_MESSAGE)
          ? error.message
          : SIGN_IN_ERROR_MESSAGE
      setFormError('root.server', { type: 'server', message })
    }
  })

  return (
    <form className="mt-6 grid gap-5" onSubmit={submit} noValidate>
      <div className="grid gap-2">
        <label className="font-semibold" htmlFor="login-email">
          Email
        </label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'login-email-error' : undefined}
          {...register('email')}
        />
        {errors.email ? (
          <p className="m-0 text-sm text-destructive" id="login-email-error" role="alert">
            {errors.email.message}
          </p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <label className="font-semibold" htmlFor="login-password">
          Password
        </label>
        <div className="relative">
          <Input
            id="login-password"
            type={passwordVisible ? 'text' : 'password'}
            autoComplete="current-password"
            className="pr-10"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'login-password-error' : undefined}
            {...register('password')}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-0 right-0 text-muted-foreground hover:text-foreground"
            aria-label={passwordVisible ? 'Hide password' : 'Show password'}
            aria-pressed={passwordVisible}
            onClick={() => setPasswordVisible((visible) => !visible)}
          >
            {passwordVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </Button>
        </div>
        {errors.password ? (
          <p className="m-0 text-sm text-destructive" id="login-password-error" role="alert">
            {errors.password.message}
          </p>
        ) : null}
      </div>
      {errors.root?.server?.message ? (
        <p className="m-0 text-sm text-destructive" role="alert">
          {errors.root.server.message}
        </p>
      ) : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </Button>
      <Link
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        to="/forgot-password"
      >
        Forgot password?
      </Link>
    </form>
  )
}
