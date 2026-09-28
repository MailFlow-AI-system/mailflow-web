import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input } from '@mailflow/ui/components'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { authClient } from './client'
import { loginSchema } from './schemas/loginSchema'
import type { LoginValues } from './types/LoginValues'

export function LoginForm() {
  const navigate = useNavigate()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  const submit = handleSubmit(async ({ email, password }) => {
    setError(null)
    try {
      const result = await authClient.signIn.email({ email, password })
      if (result.error) {
        setError(
          result.error.status === 401 || result.error.code === 'INVALID_EMAIL_OR_PASSWORD'
            ? 'Email or password is incorrect.'
            : 'Unable to sign in. Please try again.',
        )
        return
      }
      await router.invalidate()
      await navigate({ to: '/app' })
    } catch {
      setError('Unable to sign in. Please try again.')
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
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? 'login-password-error' : undefined}
          {...register('password')}
        />
        {errors.password ? (
          <p className="m-0 text-sm text-destructive" id="login-password-error" role="alert">
            {errors.password.message}
          </p>
        ) : null}
      </div>
      {error ? (
        <p className="m-0 text-sm text-destructive" role="alert">
          {error}
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
