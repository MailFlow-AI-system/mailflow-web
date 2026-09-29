import { createFileRoute, Link } from '@tanstack/react-router'

import { ForgotPasswordForm } from '#/features/auth/PasswordRecoveryForms'
import { passwordRecoveryClient } from '#/features/auth/passwordRecoveryClient'

export const Route = createFileRoute('/_public/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  return (
    <section className="mx-auto my-20 w-[min(28rem,calc(100%_-_2rem))] rounded-[var(--radius-xl)] border border-border bg-card p-8">
      <h1 className="m-0 text-3xl">Reset your password</h1>
      <p className="text-muted-foreground">
        Enter your account email. If it is registered, we will send a recovery link.
      </p>
      <ForgotPasswordForm requestPasswordReset={passwordRecoveryClient.requestPasswordReset} />
      <Link
        className="mt-5 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
        to="/login"
      >
        Back to sign in
      </Link>
    </section>
  )
}
