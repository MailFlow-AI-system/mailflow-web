import { createFileRoute } from '@tanstack/react-router'

import { LoginForm } from '#/features/auth/LoginForm'

export const Route = createFileRoute('/login')({ component: LoginPage })

function LoginPage() {
  return (
    <section className="auth-page">
      <h1>Sign in to MailFlow</h1>
      <p>Enter your account credentials to open your dashboard.</p>
      <LoginForm />
    </section>
  )
}
