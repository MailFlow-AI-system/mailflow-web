import type { ReactNode } from 'react'

export function MailboxLayout({
  title,
  showTitle = true,
  children,
  reader,
}: {
  title: string
  showTitle?: boolean
  children: ReactNode
  reader?: ReactNode
}) {
  return (
    <div className="flex h-full min-h-0 min-w-0">
      <section
        aria-label={title}
        className={`min-h-0 w-full min-w-0 shrink-0 flex-col lg:flex lg:w-[380px] xl:w-[420px] lg:border-r lg:border-border ${reader ? 'hidden' : 'flex'}`}
      >
        {showTitle ? <h1 className="px-3 py-3 text-sm font-semibold">{title}</h1> : null}
        {children}
      </section>
      {reader ?? <div aria-hidden="true" className="hidden min-w-0 flex-1 bg-muted/10 lg:block" />}
    </div>
  )
}
