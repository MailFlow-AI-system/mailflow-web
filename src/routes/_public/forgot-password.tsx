import { Button, Input } from '@mailflow/ui/components'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_public/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  return (
    <section className="mx-auto my-20 w-[min(28rem,calc(100%_-_2rem))] rounded-[var(--radius-xl)] border border-border bg-card p-8">
      <h1 className="m-0 text-3xl">Password recovery</h1>
      <p className="text-muted-foreground">
        Email delivery is not available yet. You cannot request a reset at this time.
      </p>
      <form className="mt-6 grid gap-5" onSubmit={(event) => event.preventDefault()}>
        <div className="grid gap-2">
          <label className="font-semibold" htmlFor="recovery-email">
            Email
          </label>
          <Input id="recovery-email" type="email" autoComplete="email" disabled />
        </div>
        <Button type="submit" disabled>
          Send recovery link
        </Button>
      </form>
      <Link
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        to="/login"
      >
        Back to sign in
      </Link>
    </section>
  )
}
