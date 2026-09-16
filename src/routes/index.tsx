import { Button } from '@mailflow/ui/button'
import { ArrowRight, CheckCircle2 } from '@mailflow/ui/icons'
import { Label } from '@mailflow/ui/label'
import { useTheme } from '@mailflow/ui/theme'

import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <section className="hero">
      <div className="hero__content">
        <p className="eyebrow">Project foundation</p>
        <h1>Email workflows, built on a dependable foundation.</h1>
        <p className="hero__lede">
          MailFlow is ready for feature development with server rendering, typed routing,
          server-state caching, and Cloudflare Workers support.
        </p>
        <div className="hero__actions">
          <Button nativeButton={false} render={<Link to="/app" />} size="lg">
            Open application shell
            <ArrowRight aria-hidden="true" data-icon="inline-end" />
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
        <ThemeControl />
      </aside>
    </section>
  )
}

function ThemeControl() {
  const { resolvedTheme, setTheme, theme } = useTheme()

  return (
    <div className="theme-control">
      <Label htmlFor="theme-preference">Theme preference</Label>
      <select
        id="theme-preference"
        value={theme}
        onChange={(event) => setTheme(event.target.value as typeof theme)}
      >
        <option value="dark">Dark</option>
        <option value="light">Light</option>
        <option value="system">System</option>
      </select>
      <span className="theme-control__status" aria-live="polite">
        Using {resolvedTheme} palette
      </span>
    </div>
  )
}
