import { Avatar, AvatarFallback, Button, buttonVariants } from '@mailflow/ui/components'
import {
  Archive,
  ArrowLeft,
  Forward,
  MoreHorizontal,
  Paperclip,
  Printer,
  Reply,
  ReplyAll,
  Sparkles,
  Tag,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getSenderAvatarColorClass } from '#/features/mail-list/senderAvatarColor'
import { showFeatureUnavailable } from '#/lib/showFeatureUnavailable'
import type { MailDetail, MailFolder } from './mailDetail'
import { createMailDocument, linkifyMailText } from './mailHtml'
import { useMailDetail } from './useMailDetail'

export function MailReader({
  userId,
  folder,
  id,
  onBack,
  toolbarClassName,
}: {
  userId: string
  folder: MailFolder
  id: string
  onBack: () => void
  toolbarClassName?: string
}) {
  const detail = useMailDetail(userId, folder, id)
  return (
    <MailReaderView
      message={detail.data}
      error={detail.isError}
      onRetry={() => void detail.refetch()}
      onBack={onBack}
      toolbarClassName={toolbarClassName}
    />
  )
}

function MailBody({
  message,
  onReady,
  onError,
}: {
  message: MailDetail
  onReady: () => void
  onError: () => void
}) {
  const [document, setDocument] = useState('')
  const frame = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(240)
  const didLoad = useRef(false)
  useEffect(() => {
    if (!document) return
    const timeout = window.setTimeout(() => {
      if (!didLoad.current) onError()
    }, 15_000)
    return () => window.clearTimeout(timeout)
  }, [document, onError])
  useEffect(() => {
    setDocument(message.html ? createMailDocument(message.html, message.attachments) : '')
  }, [message])
  const observer = useRef<ResizeObserver | null>(null)
  const resize = useCallback(() => {
    const element = frame.current
    const inner = element?.contentDocument
    if (!element || !inner?.body) return
    // Reset the viewport while measuring so a wider email can shrink as well as grow.
    const previousHeight = element.style.height
    element.style.height = '0px'
    const contentHeight = Math.max(
      inner.documentElement.scrollHeight,
      inner.body.scrollHeight,
      inner.body.getBoundingClientRect().height,
    )
    element.style.height = previousHeight
    setHeight(Math.max(240, Math.ceil(contentHeight)))
  }, [])
  useEffect(() => {
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      observer.current?.disconnect()
    }
  }, [resize])
  function loaded() {
    observer.current?.disconnect()
    resize()
    const body = frame.current?.contentDocument?.body
    if (body && typeof ResizeObserver !== 'undefined') {
      observer.current = new ResizeObserver(resize)
      observer.current.observe(body)
    }
    if (!didLoad.current) {
      didLoad.current = true
      onReady()
    }
  }
  if (!message.html)
    return (
      <div
        className="text-sm leading-relaxed text-foreground/90"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: linkifyMailText escapes all input and emits only fixed HTTP link markup.
        dangerouslySetInnerHTML={{ __html: linkifyMailText(message.text) }}
      />
    )
  return document ? (
    <iframe
      ref={frame}
      title="Message content"
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      srcDoc={document}
      onLoad={loaded}
      className="block w-full border-0 bg-white"
      style={{ height }}
    />
  ) : (
    <div aria-hidden="true" className="h-60 w-full rounded bg-muted motion-safe:animate-pulse" />
  )
}

export function ReaderToolbar({
  onBack,
  className = '',
}: {
  onBack?: () => void
  className?: string
}) {
  return (
    <header
      className={`flex min-h-[49px] w-full shrink-0 flex-wrap items-center gap-1 border-b px-4 py-2 ${className}`}
      role="toolbar"
      aria-label="Message actions"
    >
      {onBack ? (
        <Button
          aria-label="Back to messages"
          variant="ghost"
          size="icon"
          className="h-8 w-8 lg:hidden"
          onClick={onBack}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>
      ) : null}
      {[
        [Reply, 'Reply'],
        [ReplyAll, 'Reply all'],
        [Forward, 'Forward'],
      ].map(([Icon, label]) => {
        const ActionIcon = Icon as typeof Reply
        return (
          <Button
            key={String(label)}
            aria-label={String(label)}
            type="button"
            onClick={showFeatureUnavailable}
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs"
          >
            <ActionIcon className="h-3.5 w-3.5" />
            {String(label)}
          </Button>
        )
      })}
      <div aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
      {[
        [Archive, 'Archive'],
        [Tag, 'Tag'],
        [Trash2, 'Trash'],
        [Printer, 'Print'],
        [MoreHorizontal, 'More'],
      ].map(([Icon, label]) => {
        const ActionIcon = Icon as typeof Reply
        return (
          <Button
            key={String(label)}
            aria-label={String(label)}
            type="button"
            onClick={showFeatureUnavailable}
            variant="ghost"
            size="icon"
            className="h-8 w-8"
          >
            <ActionIcon className="h-3.5 w-3.5" />
          </Button>
        )
      })}
      <div className="ml-auto">
        <Button
          type="button"
          onClick={showFeatureUnavailable}
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 border-primary/30 bg-primary/5 text-xs text-primary"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Ask AI
        </Button>
      </div>
    </header>
  )
}

export function MailReaderView({
  message,
  error = false,
  onRetry,
  onBack,
  toolbarClassName,
}: {
  message?: MailDetail
  error?: boolean
  onRetry?: () => void
  onBack: () => void
  toolbarClassName?: string
}) {
  const [bodyState, setBodyState] = useState<{ id: string; status: 'ready' | 'error' } | null>(null)
  const messageId = message?.id
  const onBodyReady = useCallback(() => {
    if (messageId) setBodyState({ id: messageId, status: 'ready' })
  }, [messageId])
  const onBodyError = useCallback(() => {
    if (messageId) setBodyState({ id: messageId, status: 'error' })
  }, [messageId])
  const htmlPending = Boolean(
    message?.html && !(bodyState?.id === message.id && bodyState.status === 'ready'),
  )
  const showError = error || (bodyState?.id === messageId && bodyState?.status === 'error')
  const sender = message?.senderName || message?.senderEmail || 'Unknown sender'
  const date = message ? new Date(message.date) : null
  return (
    <section aria-label="Message reader" className="flex min-h-0 min-w-0 flex-1 flex-col">
      <ReaderToolbar onBack={onBack} className={toolbarClassName} />
      <div className="relative min-h-0 flex-1 overflow-auto overscroll-contain [scrollbar-gutter:stable]">
        {showError ? (
          <div className="grid justify-items-center gap-3 p-8">
            <p role="alert" className="text-sm text-muted-foreground">
              Message could not be loaded.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setBodyState(null)
                onRetry?.()
              }}
            >
              Retry loading message
            </Button>
          </div>
        ) : (
          <>
            {!message || htmlPending ? (
              <div
                role="status"
                aria-label="Loading message"
                className="absolute inset-x-0 top-0 mx-auto max-w-3xl space-y-6 px-6 py-8"
              >
                <span className="sr-only">Loading message</span>
                <div
                  aria-hidden="true"
                  className="h-8 w-3/4 rounded bg-muted motion-safe:animate-pulse"
                />
                <div
                  aria-hidden="true"
                  className="h-10 w-full rounded bg-muted motion-safe:animate-pulse"
                />
                <hr className="border-border" />
                <div
                  aria-hidden="true"
                  className="h-60 w-full rounded bg-muted motion-safe:animate-pulse"
                />
              </div>
            ) : null}
            {message ? (
              <article
                key={message.id}
                aria-hidden={htmlPending || undefined}
                style={{ visibility: htmlPending ? 'hidden' : undefined }}
                className="mx-auto max-w-3xl px-6 py-8"
              >
                <h2 className="break-words text-2xl font-semibold tracking-tight">
                  {message.subject || '(No subject)'}
                </h2>
                <div className="mt-6 flex items-start gap-3">
                  <Avatar aria-hidden="true" className="h-10 w-10 shrink-0">
                    <AvatarFallback
                      className={`text-xs ${getSenderAvatarColorClass(sender, message.senderEmail ?? undefined)}`}
                    >
                      {sender
                        .trim()
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((name) => name[0]?.toUpperCase())
                        .join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="min-w-0 text-sm font-medium [overflow-wrap:anywhere]">
                        {sender}
                      </span>
                      {message.senderEmail ? (
                        <span className="break-all text-xs text-muted-foreground">
                          &lt;{message.senderEmail}&gt;
                        </span>
                      ) : null}
                      <time
                        className="ml-auto text-xs text-muted-foreground"
                        dateTime={message.date}
                      >
                        {date && !Number.isNaN(date.getTime())
                          ? date.toLocaleString()
                          : 'Date unavailable'}
                      </time>
                    </div>
                    {(['to', 'cc', 'bcc'] as const).map((field) =>
                      message[field].length ? (
                        <p key={field} className="break-all text-xs text-muted-foreground">
                          <span className="font-medium">
                            {field === 'to' ? 'To' : field.toUpperCase()}:{' '}
                          </span>
                          <span>{message[field].join(', ')}</span>
                        </p>
                      ) : null,
                    )}
                  </div>
                </div>
                <hr className="my-6 border-border" />
                <MailBody
                  key={message.id}
                  message={message}
                  onReady={onBodyReady}
                  onError={onBodyError}
                />
                {message.attachments.length ? (
                  <div className="mt-8 space-y-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      {message.attachments.length} attachment
                      {message.attachments.length === 1 ? '' : 's'}
                    </p>
                    {message.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3"
                      >
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/10">
                          <Paperclip className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium" title={attachment.filename}>
                            {attachment.filename}
                          </p>
                          <p
                            className="break-all text-xs text-muted-foreground"
                            title={`${attachment.size} bytes`}
                          >
                            {new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(
                              attachment.size < 1024 ? attachment.size : attachment.size / 1024,
                            )}{' '}
                            {attachment.size < 1024 ? 'bytes' : 'KB'} · {attachment.contentType}
                          </p>
                        </div>
                        <a
                          className={buttonVariants({
                            variant: 'outline',
                            size: 'sm',
                            className: 'h-7 shrink-0 text-xs',
                          })}
                          aria-label={`Download ${attachment.filename}`}
                          href={`/api/mail/attachments/${encodeURIComponent(attachment.id)}/download`}
                          download
                        >
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="mt-10 rounded-xl border bg-gradient-to-br from-primary/5 to-transparent p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Sugestão de resposta com IA</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    AI suggestions are currently unavailable.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button
                      type="button"
                      onClick={showFeatureUnavailable}
                      size="sm"
                      className="gap-1.5"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Usar resposta
                    </Button>
                    <Button
                      type="button"
                      onClick={showFeatureUnavailable}
                      size="sm"
                      variant="ghost"
                    >
                      Regenerar
                    </Button>
                  </div>
                </div>
              </article>
            ) : null}
          </>
        )}
      </div>
    </section>
  )
}
