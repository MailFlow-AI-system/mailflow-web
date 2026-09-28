import { createFileRoute } from '@tanstack/react-router'

import { LogoutButton } from '#/features/auth/LogoutButton'

export const Route = createFileRoute('/_protected/app')({ component: ApplicationShell })

function ApplicationShell() {
  const { user } = Route.useRouteContext()

  return (
    <section className="mx-auto w-[min(72rem,calc(100%_-_2rem))] py-24">
      <p className="mb-5 text-xs font-extrabold tracking-[0.16em] text-primary uppercase">
        Dashboard
      </p>
      <h1 className="m-0 max-w-[13ch] text-[clamp(2.5rem,5vw,4.5rem)] leading-[0.96] tracking-[-0.055em]">
        Welcome, {user.name}
      </h1>
      <p className="mt-7 max-w-2xl text-lg leading-[1.7] text-muted-foreground">
        Your MailFlow workspace is ready.
      </p>
      <LogoutButton />
    </section>
  )
}
