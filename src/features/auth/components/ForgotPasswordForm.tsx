import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input } from '@mailflow/ui/components'
import { useForm } from 'react-hook-form'
import { usePasswordRecoveryCooldown } from '../hooks/usePasswordRecoveryCooldown'
import { RECOVERY_COOLDOWN_SECONDS } from '../passwordRecoveryConstants'
import { forgotPasswordSchema } from '../schemas/passwordRecoverySchema'
import type { PasswordRecoveryClient } from '../types/PasswordRecoveryClient'
import type { ForgotPasswordValues } from '../types/PasswordRecoveryValues'

const RATE_LIMITED_MESSAGE = 'Please wait before requesting another recovery link.'
const EMAIL_DELIVERY_FAILED_MESSAGE =
  "We couldn't send recovery instructions right now. Please try again shortly."
const UPSTREAM_UNAVAILABLE_MESSAGE =
  'Authentication is temporarily unavailable. Please try again shortly.'
const REQUEST_FAILED_MESSAGE = 'Unable to request a reset. Please try again.'

export function ForgotPasswordForm({
  requestPasswordReset,
}: Pick<PasswordRecoveryClient, 'requestPasswordReset'>) {
  const {
    register,
    handleSubmit,
    setError: setFormError,
    clearErrors,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })
  const { cooldownSeconds, startCooldown } = usePasswordRecoveryCooldown()

  const submit = handleSubmit(async ({ email }) => {
    clearErrors('root.server')

    try {
      const result = await requestPasswordReset(email)
      switch (result.kind) {
        case 'accepted':
          startCooldown(RECOVERY_COOLDOWN_SECONDS)
          return
        case 'rate-limited':
          startCooldown(result.retryAfterSeconds)
          setFormError('root.server', { type: 'server', message: RATE_LIMITED_MESSAGE })
          return
        case 'account-not-found':
          setFormError('root.server', {
            type: 'server',
            message: 'No account is registered with that email address.',
          })
          return
        case 'delivery-failed':
          startCooldown(RECOVERY_COOLDOWN_SECONDS)
          setFormError('root.server', {
            type: 'server',
            message: EMAIL_DELIVERY_FAILED_MESSAGE,
          })
          return
        case 'upstream-unavailable':
          setFormError('root.server', {
            type: 'server',
            message: UPSTREAM_UNAVAILABLE_MESSAGE,
          })
          return
        case 'failed':
          throw new Error('Reset request failed')
      }
    } catch {
      setFormError('root.server', {
        type: 'server',
        message: REQUEST_FAILED_MESSAGE,
      })
    }
  })

  return (
    <form className="mt-6 grid gap-5" onSubmit={submit} noValidate>
      <div className="grid gap-2">
        <label className="font-semibold" htmlFor="recovery-email">
          Email
        </label>
        <Input
          id="recovery-email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'recovery-email-error' : undefined}
          {...register('email')}
        />
        {errors.email ? (
          <p className="m-0 text-sm text-destructive" id="recovery-email-error" role="alert">
            {errors.email.message}
          </p>
        ) : null}
      </div>
      {isSubmitSuccessful ? (
        <p className="m-0 text-sm text-muted-foreground" role="status">
          Recovery instructions were sent to the email address on your account.
        </p>
      ) : null}
      {cooldownSeconds > 0 ? (
        <p className="m-0 text-sm text-muted-foreground" role="status">
          You can request another recovery link in {cooldownSeconds} seconds.
        </p>
      ) : null}
      {errors.root?.server?.message ? (
        <p className="m-0 text-sm text-destructive" role="alert">
          {errors.root.server.message}
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
