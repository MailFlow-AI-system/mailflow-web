import { toast } from '@mailflow/ui/components'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MailReaderView } from './MailReader'
import type { MailDetail } from './mailDetail'

vi.mock('./useMailDetail', () => ({ useMailDetail: vi.fn() }))

const message: MailDetail = {
  id: 'one',
  subject: 'Quarterly report',
  senderName: 'Ada Lovelace',
  senderEmail: 'ada@example.test',
  to: ['to@example.test'],
  cc: ['cc@example.test'],
  bcc: ['bcc@example.test'],
  date: '2026-10-29T12:34:56Z',
  html: null,
  text: 'Visit https://example.test.\nSecond line.',
  attachments: [
    {
      id: 'real-file',
      filename: 'report.pdf',
      size: 2048,
      contentType: 'application/pdf',
      contentId: null,
    },
  ],
}
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
describe('MailReader', () => {
  it('renders actual metadata, safe body, attachments, and unavailable actions', () => {
    const warning = vi.spyOn(toast, 'warning').mockReturnValue('feature-unavailable')
    render(<MailReaderView message={message} onBack={vi.fn()} />)
    expect(screen.getByRole('heading', { name: message.subject })).toBeVisible()
    expect(screen.getByText('<ada@example.test>')).toBeVisible()
    expect(screen.getByText('to@example.test')).toBeVisible()
    expect(screen.getByText('cc@example.test')).toBeVisible()
    expect(screen.getByText('bcc@example.test')).toBeVisible()
    expect(screen.getByRole('link', { name: 'https://example.test' })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    )
    expect(screen.getByRole('link', { name: 'Download report.pdf' })).toHaveAttribute(
      'href',
      '/api/mail/attachments/real-file/download',
    )
    expect(screen.getByText('report.pdf')).toBeVisible()
    expect(document.querySelector('time')).toHaveAttribute('datetime', message.date)
    for (const name of [
      'Reply',
      'Reply all',
      'Forward',
      'Archive',
      'Tag',
      'Trash',
      'Print',
      'More',
      'Ask AI',
      'Usar resposta',
      'Regenerar',
    ]) {
      const button = screen.getByRole('button', { name })
      expect(button).toBeEnabled()
      fireEvent.click(button)
      expect(warning).toHaveBeenLastCalledWith(
        'Esta funcionalidade está em desenvolvimento e ainda não está disponível.',
        { id: 'feature-unavailable' },
      )
    }
    expect(warning).toHaveBeenCalledTimes(11)
    expect(screen.queryByText('relatorio-mensal.pdf')).toBeNull()
  })
  it.each(['{Enter}', ' '])('announces an unavailable action with keyboard %s', async (key) => {
    const warning = vi.spyOn(toast, 'warning').mockReturnValue('feature-unavailable')
    const user = userEvent.setup()
    const submit = vi.fn((event) => event.preventDefault())
    render(
      <form onSubmit={submit}>
        <MailReaderView message={message} onBack={vi.fn()} />
      </form>,
    )
    screen.getByRole('button', { name: 'Reply' }).focus()
    await user.keyboard(key)
    expect(warning).toHaveBeenCalledOnce()
    expect(submit).not.toHaveBeenCalled()
  })
  it('keeps HTML metadata and attachments hidden until the complete document has its final height', async () => {
    render(
      <MailReaderView
        message={{ ...message, html: '<p>Complete HTML message</p>' }}
        onBack={vi.fn()}
      />,
    )
    const frame = screen.getByTitle('Message content') as HTMLIFrameElement
    const article = frame.closest('article')
    expect(screen.getByRole('status')).toHaveTextContent('Loading message')
    expect(article).not.toBeVisible()
    expect(screen.getByText('report.pdf')).not.toBeVisible()
    const inner = frame.contentDocument
    if (!inner) throw new Error('Message iframe has no document')
    Object.defineProperty(inner.body, 'scrollHeight', { configurable: true, value: 470 })
    Object.defineProperty(inner.documentElement, 'scrollHeight', { configurable: true, value: 503 })
    fireEvent.load(frame)
    await waitFor(() => expect(article).toBeVisible())
    expect(frame.style.height).toBe('503px')
    expect(screen.getByText('report.pdf')).toBeVisible()
    expect(screen.queryByRole('status')).toBeNull()
  })
  it('offers retry when the HTML document does not finish loading before the deadline', () => {
    vi.useFakeTimers()
    try {
      render(
        <MailReaderView
          message={{ ...message, html: '<p>Pending document</p>' }}
          onBack={vi.fn()}
          onRetry={vi.fn()}
        />,
      )
      act(() => vi.advanceTimersByTime(15_000))
      expect(screen.getByRole('alert')).toHaveTextContent('Message could not be loaded')
      expect(screen.getByRole('button', { name: 'Retry loading message' })).toBeEnabled()
    } finally {
      cleanup()
      vi.useRealTimers()
    }
  })
  it('fits the whole HTML document including collapsed margins and shrinks after viewport changes', async () => {
    render(
      <MailReaderView
        message={{ ...message, html: '<p>Full HTML content</p>' }}
        onBack={vi.fn()}
      />,
    )
    const frame = (await screen.findByTitle('Message content')) as HTMLIFrameElement
    const inner = frame.contentDocument
    if (!inner) throw new Error('Message iframe has no document')
    let contentHeight = 367
    Object.defineProperty(inner.body, 'scrollHeight', {
      configurable: true,
      get: () => contentHeight - 33,
    })
    vi.spyOn(inner.body, 'getBoundingClientRect').mockImplementation(
      () => ({ height: contentHeight - 33 }) as DOMRect,
    )
    Object.defineProperty(inner.documentElement, 'scrollHeight', {
      configurable: true,
      get: () => Math.max(contentHeight, Number.parseInt(frame.style.height, 10) || 0),
    })
    fireEvent.load(frame)
    await waitFor(() => expect(frame.style.height).toBe('367px'))
    contentHeight = 220
    fireEvent(window, new Event('resize'))
    await waitFor(() => expect(frame.style.height).toBe('240px'))
  })
  it('keeps the initial 240px reservation when short HTML finishes loading', async () => {
    render(
      <MailReaderView message={{ ...message, html: '<p>Short message</p>' }} onBack={vi.fn()} />,
    )
    const frame = (await screen.findByTitle('Message content')) as HTMLIFrameElement
    const inner = frame.contentDocument
    if (!inner) throw new Error('Message iframe has no document')
    Object.defineProperty(inner.body, 'scrollHeight', { configurable: true, value: 232 })
    Object.defineProperty(inner.documentElement, 'scrollHeight', { configurable: true, value: 232 })
    vi.spyOn(inner.body, 'getBoundingClientRect').mockReturnValue({ height: 232 } as DOMRect)
    expect(frame.style.height).toBe('240px')
    fireEvent.load(frame)
    await waitFor(() => expect(frame.style.height).toBe('240px'))
  })
  it('keeps the toolbar during loading and errors and supports back and retry', () => {
    const back = vi.fn()
    const retry = vi.fn()
    const view = render(<MailReaderView onBack={back} />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading message')
    expect(screen.getByRole('button', { name: 'Reply' })).toBeEnabled()
    view.rerender(<MailReaderView onBack={back} error onRetry={retry} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Message could not be loaded')
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading message' }))
    expect(retry).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Back to messages' }))
    expect(back).toHaveBeenCalledOnce()
  })
})
