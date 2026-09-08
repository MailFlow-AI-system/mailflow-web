import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <section className="hero">
      <div className="hero__content">
        <p className="eyebrow">Project foundation</p>
        <h1>Email workflows, built on a dependable foundation.</h1>
        <p className="hero__lede">
          MailFlow is ready for feature development with server rendering, typed
          routing, server-state caching, and Cloudflare Workers support.
        </p>
        <div className="hero__actions">
          <Button render={<Link to="/app" />} size="lg">
            Open application shell
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </div>
      <aside className="foundation-card" aria-label="Foundation status">
        <p className="foundation-card__label">Initialization status</p>
        <h2>Ready for the MVP</h2>
        <ul>
          <li>
            <CheckCircle2 aria-hidden="true" /> React and TypeScript
          </li>
          <li>
            <CheckCircle2 aria-hidden="true" /> TanStack Start and Query
          </li>
          <li>
            <CheckCircle2 aria-hidden="true" /> Cloudflare Workers runtime
          </li>
          <li>
            <CheckCircle2 aria-hidden="true" /> Base UI design foundation
          </li>
        </ul>
      </aside>
    </section>
  )
}
