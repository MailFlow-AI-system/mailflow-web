import { Button } from '@mailflow/ui/components'
import { ArrowRight, CheckCircle2 } from '@mailflow/ui/icons'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

const foundationItems = [
  'React and TypeScript',
  'TanStack Start and Query',
  'Cloudflare Workers runtime',
  'Base UI design foundation',
]

function Home() {
  return (
    <div className="min-h-svh">
      <header className="mx-auto flex min-h-18 w-[min(72rem,calc(100%-2rem))] items-center justify-between border-b border-border max-md:min-h-16">
        <Link
          aria-label="MailFlow home"
          className="inline-flex items-center gap-2.5 font-bold no-underline"
          to="/"
        >
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-sm bg-primary text-xs text-primary-foreground"
          >
            M·F
          </span>
          <span>MailFlow</span>
        </Link>
        <nav aria-label="Primary navigation" className="flex gap-5">
          <Link
            activeOptions={{ exact: true }}
            activeProps={{ 'aria-current': 'page' }}
            className="text-sm font-semibold text-muted-foreground no-underline hover:text-foreground aria-[current=page]:text-foreground"
            to="/"
          >
            Home
          </Link>
          <Link
            activeProps={{ 'aria-current': 'page' }}
            className="text-sm font-semibold text-muted-foreground no-underline hover:text-foreground aria-[current=page]:text-foreground"
            to="/app"
          >
            App
          </Link>
        </nav>
      </header>
      <main>
        <section className="mx-auto grid w-[min(72rem,calc(100%-2rem))] items-center gap-[clamp(2rem,7vw,7rem)] py-20 max-md:min-h-0 max-md:py-16 md:min-h-[calc(100vh-4.5rem)] md:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
          <div>
            <p className="mb-5 text-xs font-bold tracking-[0.16em] text-primary uppercase">
              Project foundation
            </p>
            <h1 className="m-0 max-w-[13ch] text-[clamp(2.25rem,7vw,4.5rem)] leading-[0.96] tracking-[-0.055em]">
              Email workflows, built on a dependable foundation.
            </h1>
            <p className="mt-7 max-w-[42rem] text-lg leading-[1.7] text-muted-foreground">
              MailFlow is ready for feature development with server rendering, typed routing,
              server-state caching, and Cloudflare Workers support.
            </p>
            <div className="mt-8">
              <Button nativeButton={false} render={<Link to="/app" />} size="lg">
                Open application shell
                <ArrowRight aria-hidden="true" data-icon="inline-end" />
              </Button>
            </div>
          </div>
          <aside
            aria-label="Foundation status"
            className="rounded-xl border border-border bg-card p-8 shadow-xl"
          >
            <p className="m-0 text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase">
              Initialization status
            </p>
            <h2 className="mt-2 mb-6 text-2xl">Ready for the MVP</h2>
            <ul className="m-0 grid list-none gap-4 p-0">
              {foundationItems.map((item) => (
                <li className="flex items-center gap-3 text-sm text-muted-foreground" key={item}>
                  <CheckCircle2 aria-hidden="true" className="size-[1.125rem] text-success" />
                  {item}
                </li>
              ))}
            </ul>
          </aside>
        </section>
      </main>
    </div>
  )
}
