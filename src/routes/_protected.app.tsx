import { createFileRoute } from '@tanstack/react-router'

import { LogoutButton } from '#/features/auth/LogoutButton'

export const Route = createFileRoute('/_protected/app')({ component: ApplicationShell })

function ApplicationShell() {
  const { user } = Route.useRouteContext()

  return (
    <section className="placeholder-page">
      <p className="eyebrow">Dashboard</p>
      <h1>Welcome, {user.name}</h1>
      <p>Your MailFlow workspace is ready.</p>
      <LogoutButton />
    </section>
  )
}
