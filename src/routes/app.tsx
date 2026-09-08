import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app')({ component: ApplicationShell })

function ApplicationShell() {
  return (
    <section className="placeholder-page">
      <p className="eyebrow">Authenticated application</p>
      <h1>Application shell</h1>
      <p>
        Authentication and product capabilities will be introduced by their own
        vertical feature slices.
      </p>
    </section>
  )
}
