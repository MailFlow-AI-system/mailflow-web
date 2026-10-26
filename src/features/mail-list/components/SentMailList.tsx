import { Button } from '@mailflow/ui/components'
import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchSentEmails } from '../clients/sentEmailsClient'
import { MailMessageSkeletonRows } from './MailMessageSkeleton'

export function SentMailList({ userId }: { userId: string }) {
  const mail = useInfiniteQuery({
    queryKey: ['sent-emails', userId],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => fetchSentEmails(pageParam, signal),
    getNextPageParam: (page) => page.nextOffset ?? undefined,
    retry: false,
  })
  const seen = new Set<string>()
  const messages = (mail.data?.pages.flatMap((page) => page.items) ?? []).filter(({ id }) => {
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
  return (
    <section
      aria-label="E-mails enviados"
      aria-busy={mail.isFetching}
      className="min-h-0 flex-1 overflow-y-auto"
    >
      <p role="status" className="sr-only">
        {mail.isFetching
          ? 'Carregando e-mails enviados…'
          : `${messages.length} e-mail${messages.length === 1 ? '' : 's'} enviado${messages.length === 1 ? '' : 's'}`}
      </p>
      {mail.isPending ? (
        <ul>
          <MailMessageSkeletonRows />
        </ul>
      ) : messages.length ? (
        <ul className="m-0 list-none p-0">
          {messages.map((message) => (
            <li key={message.id} className="space-y-1 border-b border-border px-4 py-3">
              <p className="truncate text-xs text-muted-foreground">
                Para: {[...message.to, ...message.cc, ...message.bcc].join(', ')}
              </p>
              <p className="truncate text-sm font-medium">{message.subject || '(Sem assunto)'}</p>
              <p className="truncate text-xs text-muted-foreground">
                {message.text || '(Sem texto)'}
              </p>
              {message.sentAt ? (
                <time className="text-xs text-muted-foreground" dateTime={message.sentAt}>
                  {new Date(message.sentAt).toLocaleString('pt-BR')}
                </time>
              ) : null}
            </li>
          ))}
        </ul>
      ) : !mail.isError ? (
        <p className="p-6 text-center text-sm text-muted-foreground">Nenhum e-mail enviado.</p>
      ) : null}
      {mail.isError ? (
        <div className="space-y-2 p-4">
          <p role="alert" className="text-sm text-destructive">
            Não foi possível carregar os e-mails enviados.
          </p>
          <Button
            onClick={() => void (mail.isFetchNextPageError ? mail.fetchNextPage() : mail.refetch())}
          >
            Tentar novamente
          </Button>
        </div>
      ) : null}
      {mail.hasNextPage ? (
        <div className="p-4">
          <Button disabled={mail.isFetching} onClick={() => void mail.fetchNextPage()}>
            Carregar mais
          </Button>
        </div>
      ) : null}
    </section>
  )
}
