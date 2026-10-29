import type { ReactNode } from 'react'

type MailboxLayoutProps = {
  title: string
  showTitle?: boolean
  children: ReactNode
}

export function MailboxLayout({ title, showTitle = true, children }: MailboxLayoutProps) {
  return (
    <div className="flex h-full min-h-0 min-w-0">
      <section
        aria-label={title}
        className="flex min-h-0 w-full min-w-0 flex-col md:w-[29vw] md:max-w-[419px] md:border-r md:border-border"
      >
        {showTitle ? <h1 className="px-3 py-3 text-sm font-semibold">{title}</h1> : null}
        {children}
      </section>
      <div aria-hidden="true" className="hidden min-w-0 flex-1 bg-muted/10 md:block" />
    </div>
  )
}
