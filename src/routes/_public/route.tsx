import { createFileRoute, Link, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_public')({ component: PublicLayout })

function PublicLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex min-h-18 w-[min(72rem,calc(100%_-_2rem))] items-center border-b border-border">
        <Link className="inline-flex items-center gap-2.5 font-bold no-underline" to="/">
          <span
            className="grid size-8 place-items-center rounded-lg bg-primary text-xs text-primary-foreground"
            aria-hidden="true"
          >
            M·F
          </span>
          <span>MailFlow</span>
        </Link>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
