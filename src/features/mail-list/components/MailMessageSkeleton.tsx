const rowKeys = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth']

export function MailMessageSkeletonRows() {
  return rowKeys.map((key) => (
    <li
      aria-hidden="true"
      className="border-b border-border px-3 py-3 motion-safe:animate-pulse"
      data-testid="mail-message-skeleton"
      key={key}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="size-9 shrink-0 rounded-full bg-primary/10" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="h-4 w-28 rounded bg-muted" />
          <div className="h-4 w-4/5 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
        </div>
      </div>
    </li>
  ))
}
