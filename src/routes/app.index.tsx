import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/')({ component: ApplicationHome })

function ApplicationHome() {
  return (
    <section className="max-w-[72rem] p-6">
      <h1 className="m-0 text-2xl font-semibold">Início</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        O espaço de trabalho está pronto para as próximas funcionalidades do MailFlow.
      </p>
    </section>
  )
}
