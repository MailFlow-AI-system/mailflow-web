import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@mailflow/ui/components'
import { Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { resetPasswordSchema } from '../schemas/passwordRecoverySchema'
import type { PasswordRecoveryClient } from '../types/PasswordRecoveryClient'
import type { ResetPasswordValues } from '../types/PasswordRecoveryValues'
import { PasswordInput } from './PasswordInput'

const INVALID_RESET_MESSAGE = 'This reset link is invalid or has expired. Request a new one.'
const PASSWORD_ALREADY_IN_USE_MESSAGE =
  'Choose a new password that differs from your current password.'

export function ResetPasswordForm({
  token,
  resetPassword,
}: { token?: string } & Pick<PasswordRecoveryClient, 'resetPassword'>) {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    setError: setFormError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmation: '' },
  })

  const submit = handleSubmit(async ({ password }) => {
    clearErrors('root.server')

    try {
      if (!token) return
      const result = await resetPassword(token, password)
      switch (result.kind) {
        case 'success':
          await navigate({ to: '/login', replace: true })
          return
        case 'invalid-link':
          setFormError('root.server', { type: 'server', message: INVALID_RESET_MESSAGE })
          return
        case 'password-already-in-use':
          setFormError('root.server', {
            type: 'server',
            message: PASSWORD_ALREADY_IN_USE_MESSAGE,
          })
          return
        case 'failed':
          throw new Error('Password reset failed')
      }
    } catch {
      setFormError('root.server', {
        type: 'server',
        message: 'Unable to reset your password. Please try again.',
      })
    }
  })

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
    <form className="mt-6 grid gap-5" onSubmit={submit} noValidate>
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
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? 'new-password-error' : undefined}
          {...register('password')}
        />
        {errors.password ? (
          <p className="m-0 text-sm text-destructive" id="new-password-error" role="alert">
            {errors.password.message}
          </p>
        ) : null}
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
          aria-invalid={Boolean(errors.confirmation)}
          aria-describedby={errors.confirmation ? 'confirm-new-password-error' : undefined}
          {...register('confirmation')}
        />
        {errors.confirmation ? (
          <p className="m-0 text-sm text-destructive" id="confirm-new-password-error" role="alert">
            {errors.confirmation.message}
          </p>
        ) : null}
      </div>
      {errors.root?.server?.message ? (
        <p className="m-0 text-sm text-destructive" role="alert">
          {errors.root.server.message}
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
