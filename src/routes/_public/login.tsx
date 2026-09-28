import { createFileRoute } from '@tanstack/react-router'

import { LoginForm } from '#/features/auth/LoginForm'
import { redirectAuthenticatedLogin } from '#/features/auth/routeGuards'

export const Route = createFileRoute('/_public/login')({
  beforeLoad: redirectAuthenticatedLogin,
  component: LoginPage,
})

function LoginPage() {
  return (
    <section className="mx-auto my-20 w-[min(28rem,calc(100%_-_2rem))] rounded-[var(--radius-xl)] border border-border bg-card p-8">
      <h1 className="m-0 text-3xl">Sign in to MailFlow</h1>
      <p className="text-muted-foreground">
        Enter your account credentials to open your dashboard.
      </p>
      <LoginForm />
    </section>
  )
}
