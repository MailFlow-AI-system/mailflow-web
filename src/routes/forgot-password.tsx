import { Button, Input } from '@mailflow/ui/components'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/forgot-password')({ component: ForgotPasswordPage })

function ForgotPasswordPage() {
  return (
    <section className="auth-page">
      <h1>Password recovery</h1>
      <p>Email delivery is not available yet. You cannot request a reset at this time.</p>
      <form className="auth-form" onSubmit={(event) => event.preventDefault()}>
        <div className="auth-field">
          <label htmlFor="recovery-email">Email</label>
          <Input id="recovery-email" type="email" autoComplete="email" disabled />
        </div>
        <Button type="submit" disabled>
          Send recovery link
        </Button>
      </form>
      <Link to="/login">Back to sign in</Link>
    </section>
  )
}
