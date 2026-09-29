import { createFileRoute } from '@tanstack/react-router'

import { ResetPasswordForm } from '#/features/auth/PasswordRecoveryForms'

export const Route = createFileRoute('/_public/reset-password')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : undefined,
  }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { token } = Route.useSearch()

  return (
    <section className="mx-auto my-20 w-[min(28rem,calc(100%_-_2rem))] rounded-[var(--radius-xl)] border border-border bg-card p-8">
      <h1 className="m-0 text-3xl">Choose a new password</h1>
      <p className="text-muted-foreground">Enter and confirm your new password below.</p>
      <ResetPasswordForm token={token} />
    </section>
  )
}
