import { buttonVariants } from '@mailflow/ui/components'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <section className="mx-auto grid w-[min(72rem,calc(100%_-_2rem))] grid-cols-1 items-center gap-8 py-16 md:min-h-[calc(100vh_-_4.5rem)] md:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)] md:gap-[clamp(2rem,7vw,7rem)] md:py-20">
      <div>
        <p className="mb-5 text-xs font-extrabold tracking-[0.16em] text-primary uppercase">
          Project foundation
        </p>
        <h1 className="m-0 max-w-[13ch] text-[clamp(2.75rem,7vw,5.75rem)] leading-[0.96] tracking-[-0.055em]">
          Email workflows, built on a dependable foundation.
        </h1>
        <p className="mt-7 max-w-2xl text-lg leading-[1.7] text-muted-foreground">
          MailFlow is ready for feature development with server rendering, typed routing,
          server-state caching, and Cloudflare Workers support.
        </p>
        <div className="mt-8">
          <Link className={buttonVariants({ size: 'lg' })} to="/app">
            Open application shell
            <ArrowRight data-icon="inline-end" />
          </Link>
        </div>
      </div>
      <aside
        className="rounded-[var(--radius-xl)] border border-border bg-card p-8 shadow-xl"
        aria-label="Foundation status"
      >
        <p className="mb-0 text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase">
          Initialization status
        </p>
        <h2 className="mt-2 mb-6 text-2xl">Ready for the MVP</h2>
        <ul className="m-0 grid list-none gap-4 p-0">
          <li className="flex items-center gap-3 text-sm text-muted-foreground">
            <CheckCircle2 className="size-5 text-success" aria-hidden="true" /> React and TypeScript
          </li>
          <li className="flex items-center gap-3 text-sm text-muted-foreground">
            <CheckCircle2 className="size-5 text-success" aria-hidden="true" /> TanStack Start and
            Query
          </li>
          <li className="flex items-center gap-3 text-sm text-muted-foreground">
            <CheckCircle2 className="size-5 text-success" aria-hidden="true" /> Cloudflare Workers
            runtime
          </li>
          <li className="flex items-center gap-3 text-sm text-muted-foreground">
            <CheckCircle2 className="size-5 text-success" aria-hidden="true" /> Base UI design
            foundation
          </li>
        </ul>
      </aside>
    </section>
  )
}
