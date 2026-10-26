import { afterEach, describe, expect, it, vi } from 'vitest'
import { sendEmail } from './sendEmail'

const composition = {
  to: ['ada@example.test'],
  cc: [],
  bcc: ['hidden@example.test'],
  subject: 'Hello',
  body: '<p>Hello</p>',
  attachments: [],
}
afterEach(() => vi.unstubAllGlobals())
describe('sendEmail client', () => {
  it('posts normalized recipients, rich content, text and base64 attachments to the BFF', async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({ id: 'message', status: 'sent' }),
    )
    vi.stubGlobal('fetch', fetcher)
    await sendEmail(
      {
        ...composition,
        recipientName: 'Ada Lovelace',
        attachments: [
          { id: 'file', file: new File(['Hello'], 'hello.txt', { type: 'text/plain' }) },
        ],
      },
      'request-id',
    )
    expect(fetcher).toHaveBeenCalledWith(
      '/api/mail/send',
      expect.objectContaining({ method: 'POST', credentials: 'same-origin' }),
    )
    const body = JSON.parse(fetcher.mock.calls[0]?.[1]?.body as string)
    expect(body).toMatchObject({
      id: 'request-id',
      recipientName: 'Ada Lovelace',
      to: composition.to,
      bcc: composition.bcc,
      html: composition.body,
      text: 'Hello',
      attachments: [{ filename: 'hello.txt', content: 'SGVsbG8=' }],
    })
  })
  it('does not expose upstream details on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => Response.json({ message: 'secret' }, { status: 502 })),
    )
    await expect(sendEmail(composition, 'id')).rejects.toThrow('Não foi possível enviar')
  })
  it('rejects a malformed success response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => Response.json({ status: 'failed' })),
    )
    await expect(sendEmail(composition, 'id')).rejects.toThrow()
  })
})

it('embeds local images as stable CID attachments and keeps remote images unchanged', async () => {
  const fetcher = vi.fn<typeof fetch>(async () => Response.json({ id: 'message', status: 'sent' }))
  vi.stubGlobal('fetch', fetcher)
  const imageBody =
    '<p><strong>Formatted</strong> 🎉</p><img src="data:image/png;base64,aGVsbG8=" alt="local.png"><img src="data:image/png;base64,aGVsbG8=" alt="duplicate.png"><img src="https://example.test/image.png">'
  await sendEmail({ ...composition, body: imageBody }, 'id')
  await sendEmail({ ...composition, body: imageBody }, 'id')
  const first = JSON.parse(fetcher.mock.calls[0]?.[1]?.body as string)
  const retry = JSON.parse(fetcher.mock.calls[1]?.[1]?.body as string)
  expect(first.html).not.toContain('data:image')
  expect(first.html.match(/cid:mailflow-inline-1/g)).toHaveLength(2)
  expect(first.html).toContain('https://example.test/image.png')
  expect(first.attachments).toEqual([
    {
      filename: 'inline-image-1.png',
      content: 'aGVsbG8=',
      contentType: 'image/png',
      contentId: 'mailflow-inline-1',
    },
  ])
  expect(retry).toEqual(first)
})
it('rejects invalid inline image data without making a request', async () => {
  const fetcher = vi.fn<typeof fetch>()
  vi.stubGlobal('fetch', fetcher)
  await expect(
    sendEmail({ ...composition, body: '<img src="data:image/svg+xml;base64,aGVsbG8=">' }, 'id'),
  ).rejects.toThrow()
  expect(fetcher).not.toHaveBeenCalled()
})

it('enforces attachment size and count limits before encoding or sending', async () => {
  const fetcher = vi.fn<typeof fetch>()
  vi.stubGlobal('fetch', fetcher)
  const attachments = [10, 10, 6].map((size, index) => {
    const file = new File(['x'], `part-${index}.txt`)
    Object.defineProperty(file, 'size', { value: size * 1024 * 1024 })
    return { id: String(index), file }
  })
  await expect(sendEmail({ ...composition, attachments }, 'id')).rejects.toThrow()
  const tiny = { id: 'file', file: new File(['x'], 'tiny.txt') }
  await expect(
    sendEmail({ ...composition, attachments: Array.from({ length: 101 }, () => tiny) }, 'id'),
  ).rejects.toThrow()
  expect(fetcher).not.toHaveBeenCalled()
})

it('preserves paragraph, list and explicit line break separation in plain text', async () => {
  const fetcher = vi.fn<typeof fetch>(async () => Response.json({ id: 'message', status: 'sent' }))
  vi.stubGlobal('fetch', fetcher)
  await sendEmail(
    {
      ...composition,
      body: '<p>First paragraph</p><p>Second<br>line</p><ul><li>Alpha item</li><li>Beta item</li></ul>',
    },
    'id',
  )
  const body = JSON.parse(fetcher.mock.calls[0]?.[1]?.body as string)
  expect(body.text).toBe('First paragraph\nSecond\nline\nAlpha item\nBeta item')
  expect(body.html).toContain('<br>')
  expect(body.html).not.toContain('\n')
})
