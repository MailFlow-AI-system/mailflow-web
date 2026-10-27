import { webcrypto } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sendEmail } from './sendEmail'

const composition = {
  to: ['ada@example.test'],
  cc: [],
  bcc: ['hidden@example.test'],
  subject: 'Hello',
  body: '<p>Hello</p>',
  attachments: [],
}
const hash = '185f8db32271fe25f561a6fc938b2e264306ec304eda518007d1764826381969'
const file = () => ({ id: 'file', file: new File(['Hello'], 'hello.txt', { type: 'text/plain' }) })
const workspaceContext = {
  userId: 'user-one',
  workspace: { id: 'workspace-a', name: 'Workspace A', slug: 'workspace-a', role: 'owner' },
}
const context = () => ({ uploads: new Map(), scope: { current: null }, onProgress: vi.fn() })
beforeEach(() => vi.stubGlobal('crypto', webcrypto))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function provider() {
  const metadata = new Map<string, object>()
  let created = 0
  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input)
    if (url === '/api/mail/context') return Response.json(workspaceContext)
    if (url === '/api/mail/attachments') {
      const id = `00000000-0000-4000-8000-${String(++created).padStart(12, '0')}`
      metadata.set(id, {
        ...JSON.parse(String(init?.body)),
        associated: false,
        attachmentExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      })
      return Response.json({
        id,
        uploadUrl: `https://objects.example.test/upload/${id}`,
        headers: { 'Content-Type': (metadata.get(id) as { contentType: string }).contentType },
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
      })
    }
    if (url.startsWith('https://objects.example.test/upload/'))
      return new Response(null, { status: 200 })
    const completion = /^\/api\/mail\/attachments\/([^/]+)(?:\/complete)?$/.exec(url)
    if (completion)
      return Response.json({ id: completion[1], status: 'clean', ...metadata.get(completion[1]) })
    if (url === '/api/mail/send') return Response.json({ id: 'message', status: 'sent' })
    throw new Error(`Unexpected URL: ${url}`)
  })
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}
const callsTo = (fetcher: ReturnType<typeof provider>, url: string) =>
  fetcher.mock.calls.filter(([input]) => String(input) === url)

describe('sendEmail private uploads', () => {
  it('resolves and pins the server context even without a workspace UI and scopes every private request', async () => {
    const fetcher = provider()
    const delivery = { ...context(), userId: 'user-one' }
    await sendEmail({ ...composition, attachments: [file()] }, 'id', delivery)
    expect(callsTo(fetcher, '/api/mail/context')).toHaveLength(2)
    expect(delivery.scope.current).toEqual(workspaceContext)
    for (const [url, options] of fetcher.mock.calls) {
      if (!String(url).startsWith('/api/mail/')) continue
      const headers = new Headers(options?.headers)
      expect(headers.get('x-workspace-identity')).toBe('user-one')
      expect(headers.get('x-workspace-id')).toBe(
        String(url) === '/api/mail/context' ? null : 'workspace-a',
      )
    }
  })

  it.each(['workspace', 'identity'] as const)(
    'keeps the draft upload and blocks retry after a %s context change',
    async (change) => {
      const fetcher = provider()
      const normal = fetcher.getMockImplementation()
      if (!normal) throw new Error('Missing mock implementation')
      let changed = false
      fetcher.mockImplementation(async (url, init) => {
        if (String(url) === '/api/mail/context' && changed)
          return Response.json(
            change === 'workspace'
              ? {
                  ...workspaceContext,
                  workspace: {
                    ...workspaceContext.workspace,
                    id: 'workspace-b',
                    name: 'Workspace B',
                  },
                }
              : { ...workspaceContext, userId: 'user-two' },
          )
        if (String(url) === '/api/mail/send') return new Response(null, { status: 502 })
        return normal(url, init)
      })
      const delivery = context()
      const message = { ...composition, attachments: [file()] }
      await expect(sendEmail(message, 'same-id', delivery)).rejects.toThrow()
      changed = true
      await expect(sendEmail(message, 'same-id', delivery)).rejects.toThrow(
        change === 'workspace' ? 'workspace' : 'sessão',
      )
      expect(callsTo(fetcher, '/api/mail/send')).toHaveLength(1)
      expect(callsTo(fetcher, '/api/mail/attachments')).toHaveLength(1)
      expect(delivery.uploads.size).toBe(1)
      expect(delivery.scope.current).toEqual(workspaceContext)
      expect(message.attachments).toHaveLength(1)
    },
  )

  it('rechecks the default context before provider delivery if it changes during upload', async () => {
    const fetcher = provider()
    const normal = fetcher.getMockImplementation()
    if (!normal) throw new Error('Missing mock implementation')
    let resolving = 0
    fetcher.mockImplementation(async (url, init) => {
      if (String(url) === '/api/mail/context' && resolving++ > 0)
        return Response.json({
          ...workspaceContext,
          workspace: { ...workspaceContext.workspace, id: 'workspace-b' },
        })
      return normal(url, init)
    })
    const delivery = context()
    await expect(
      sendEmail({ ...composition, attachments: [file()] }, 'id', delivery),
    ).rejects.toThrow('workspace')
    expect(callsTo(fetcher, '/api/mail/send')).toHaveLength(0)
    expect(delivery.uploads.size).toBe(1)
  })

  it('refuses a server context for another authenticated UI identity before uploading', async () => {
    const fetcher = provider()
    await expect(
      sendEmail({ ...composition, attachments: [file()] }, 'id', {
        ...context(),
        userId: 'another-user',
      }),
    ).rejects.toThrow('sessão')
    expect(callsTo(fetcher, '/api/mail/attachments')).toHaveLength(0)
    expect(callsTo(fetcher, '/api/mail/send')).toHaveLength(0)
  })

  it.each(['workspace a', 'workspace,a', 'workspace\na'])(
    'refuses malformed workspace selectors from the context response (%j)',
    async (workspaceId) => {
      const fetcher = provider()
      const normal = fetcher.getMockImplementation()
      if (!normal) throw new Error('Missing mock implementation')
      fetcher.mockImplementation((url, init) =>
        String(url) === '/api/mail/context'
          ? Promise.resolve(
              Response.json({
                ...workspaceContext,
                workspace: { ...workspaceContext.workspace, id: workspaceId },
              }),
            )
          : normal(url, init),
      )
      const delivery = context()
      await expect(
        sendEmail({ ...composition, attachments: [file()] }, 'id', delivery),
      ).rejects.toThrow('mantida')
      expect(callsTo(fetcher, '/api/mail/attachments')).toHaveLength(0)
      expect(delivery.scope.current).toBeNull()
    },
  )

  it('can retry the same immutable message after returning to its original workspace', async () => {
    const fetcher = provider()
    const normal = fetcher.getMockImplementation()
    if (!normal) throw new Error('Missing mock implementation')
    let current = workspaceContext
    let fail = true
    fetcher.mockImplementation(async (url, init) => {
      if (String(url) === '/api/mail/context') return Response.json(current)
      if (String(url) === '/api/mail/send' && fail) {
        fail = false
        return new Response(null, { status: 502 })
      }
      return normal(url, init)
    })
    const delivery = context()
    const message = { ...composition, attachments: [file()] }
    await expect(sendEmail(message, 'original-id', delivery)).rejects.toThrow()
    current = {
      ...workspaceContext,
      workspace: { ...workspaceContext.workspace, id: 'workspace-b' },
    }
    await expect(sendEmail(message, 'original-id', delivery)).rejects.toThrow('workspace')
    current = workspaceContext
    await sendEmail(message, 'original-id', delivery)
    expect(callsTo(fetcher, '/api/mail/attachments')).toHaveLength(1)
    const sends = callsTo(fetcher, '/api/mail/send')
    expect(sends).toHaveLength(2)
    expect(JSON.parse(String(sends[0]?.[1]?.body))).toEqual(JSON.parse(String(sends[1]?.[1]?.body)))
  })

  it('does not reuse another workspace upload even if a caller shares its cache with a new scope', async () => {
    const fetcher = provider()
    const normal = fetcher.getMockImplementation()
    if (!normal) throw new Error('Missing mock implementation')
    let current = workspaceContext
    fetcher.mockImplementation((url, init) =>
      String(url) === '/api/mail/context'
        ? Promise.resolve(Response.json(current))
        : normal(url, init),
    )
    const delivery = context()
    const message = { ...composition, attachments: [file()] }
    await sendEmail(message, 'first-id', delivery)
    current = {
      ...workspaceContext,
      workspace: { ...workspaceContext.workspace, id: 'workspace-b' },
    }
    await sendEmail(message, 'second-id', { ...context(), uploads: delivery.uploads })
    expect(callsTo(fetcher, '/api/mail/attachments')).toHaveLength(2)
    const second = JSON.parse(String(callsTo(fetcher, '/api/mail/send')[1]?.[1]?.body))
    expect(second.attachments).toEqual([{ id: '00000000-0000-4000-8000-000000000002' }])
  })

  it('keeps the original scope when the UI identity changes within the same workspace', async () => {
    const fetcher = provider()
    const normal = fetcher.getMockImplementation()
    if (!normal) throw new Error('Missing mock implementation')
    let current = workspaceContext
    fetcher.mockImplementation((url, init) =>
      String(url) === '/api/mail/context'
        ? Promise.resolve(Response.json(current))
        : normal(url, init),
    )
    const delivery = { ...context(), userId: 'user-one' }
    const message = { ...composition, attachments: [file()] }
    await sendEmail(message, 'first-id', delivery)
    current = { ...workspaceContext, userId: 'user-two' }
    delivery.userId = 'user-two'
    await expect(sendEmail(message, 'second-id', delivery)).rejects.toThrow('sessão')
    expect(delivery.scope.current).toEqual(workspaceContext)
    expect(callsTo(fetcher, '/api/mail/send')).toHaveLength(1)
  })

  it.each([401, 403, 409, 503])(
    'preserves files and does not upload when mail context is unavailable (%s)',
    async (status) => {
      const fetcher = vi.fn<typeof fetch>(async () =>
        Response.json(
          { code: status === 409 ? 'workspace_required' : 'workspace_unavailable' },
          { status },
        ),
      )
      vi.stubGlobal('fetch', fetcher)
      const delivery = context()
      await expect(
        sendEmail({ ...composition, attachments: [file()] }, 'id', delivery),
      ).rejects.toThrow('mantida')
      expect(fetcher).toHaveBeenCalledTimes(1)
      expect(delivery.uploads.size).toBe(0)
      expect(delivery.scope.current).toBeNull()
    },
  )
  it('uploads, verifies and sends immutable references without file bytes in the send request', async () => {
    const fetcher = provider()
    const delivery = context()
    await sendEmail(
      { ...composition, recipientName: 'Ada Lovelace', attachments: [file()] },
      'request-id',
      delivery,
    )
    const create = callsTo(fetcher, '/api/mail/attachments')[0]
    expect(JSON.parse(String(create?.[1]?.body))).toEqual({
      filename: 'hello.txt',
      contentType: 'text/plain',
      size: 5,
      sha256: hash,
    })
    const put = fetcher.mock.calls.find(([input]) =>
      String(input).startsWith('https://objects.example.test/'),
    )
    expect(put?.[1]).toMatchObject({
      method: 'PUT',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    })
    expect(put?.[1]?.body).toBeInstanceOf(File)
    const send = callsTo(fetcher, '/api/mail/send')[0]
    const body = JSON.parse(String(send?.[1]?.body))
    expect(body).toMatchObject({
      id: 'request-id',
      recipientName: 'Ada Lovelace',
      to: composition.to,
      bcc: composition.bcc,
      html: composition.body,
      text: 'Hello',
      attachments: [{ id: '00000000-0000-4000-8000-000000000001' }],
    })
    expect(body.attachments[0]).not.toHaveProperty('content')
    expect(delivery.onProgress.mock.calls.map(([progress]) => progress.phase)).toEqual([
      'uploading',
      'verifying',
      'sending',
    ])
  })

  it('reuses uploaded attachment IDs after an uncertain send failure', async () => {
    const fetcher = provider()
    const normal = fetcher.getMockImplementation()
    if (!normal) throw new Error('Missing mock implementation')
    let fail = true
    fetcher.mockImplementation(async (url, init) => {
      if (String(url) === '/api/mail/send' && fail) {
        fail = false
        return new Response(null, { status: 502 })
      }
      return normal(url, init)
    })
    const delivery = context()
    const message = { ...composition, attachments: [file()] }
    await expect(sendEmail(message, 'request-id', delivery)).rejects.toThrow('mantida')
    await sendEmail(message, 'request-id', delivery)
    expect(callsTo(fetcher, '/api/mail/attachments')).toHaveLength(1)
    const sends = callsTo(fetcher, '/api/mail/send')
    expect(JSON.parse(String(sends[0]?.[1]?.body))).toEqual(JSON.parse(String(sends[1]?.[1]?.body)))
  })

  it('retries completion without uploading another object when verification was temporarily unavailable', async () => {
    const fetcher = provider()
    const normal = fetcher.getMockImplementation()
    if (!normal) throw new Error('Missing mock implementation')
    let fail = true
    fetcher.mockImplementation(async (url, init) => {
      if (String(url).endsWith('/complete') && fail) {
        fail = false
        return new Response(null, { status: 503 })
      }
      return normal(url, init)
    })
    const delivery = context()
    const message = { ...composition, attachments: [file()] }
    await expect(sendEmail(message, 'id', delivery)).rejects.toThrow()
    expect(callsTo(fetcher, '/api/mail/send')).toHaveLength(0)
    await sendEmail(message, 'id', delivery)
    expect(callsTo(fetcher, '/api/mail/attachments')).toHaveLength(1)
    expect(
      fetcher.mock.calls.filter(([url]) => String(url).startsWith('https://objects.example.test/')),
    ).toHaveLength(1)
  })

  it.each(['pending', 'clean'] as const)(
    'renews an expired %s upload only after Core confirms it is unassociated',
    async (status) => {
      const fetcher = provider()
      const normal = fetcher.getMockImplementation()
      if (!normal) throw new Error('Missing mock implementation')
      const clock = vi.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000)
      let expired = false
      fetcher.mockImplementation(async (url, init) => {
        const response = await normal(url, init)
        if (String(url).includes('/attachments/00000000-0000-4000-8000-000000000001'))
          return Response.json({
            ...(await response.json()),
            status: expired ? 'expired' : status,
            associated: false,
          })
        if (
          status === 'clean' &&
          String(url).includes('/attachments/00000000-0000-4000-8000-000000000002') &&
          !expired
        )
          return Response.json({ ...(await response.json()), status: 'error' })
        if (
          status === 'clean' &&
          String(url).includes('/attachments/00000000-0000-4000-8000-000000000002') &&
          expired
        )
          return Response.json({ ...(await response.json()), status: 'expired', associated: false })
        return response
      })
      const delivery = context()
      const message = {
        ...composition,
        attachments: status === 'clean' ? [file(), { ...file(), id: 'second' }] : [file()],
      }
      await expect(sendEmail(message, 'same-message', delivery)).rejects.toThrow()
      expired = true
      clock.mockReturnValue(1_800_000_000_000 + 86_400_001)
      await sendEmail(message, 'same-message', delivery)
      expect(callsTo(fetcher, '/api/mail/attachments')).toHaveLength(status === 'clean' ? 4 : 2)
      const sends = callsTo(fetcher, '/api/mail/send')
      expect(JSON.parse(String(sends.at(-1)?.[1]?.body))).toMatchObject({
        id: 'same-message',
        attachments:
          status === 'clean'
            ? [
                { id: '00000000-0000-4000-8000-000000000003' },
                { id: '00000000-0000-4000-8000-000000000004' },
              ]
            : [{ id: '00000000-0000-4000-8000-000000000002' }],
      })
    },
  )

  it('keeps the immutable references after an uncertain send and an associated file passes its TTL', async () => {
    const fetcher = provider()
    const normal = fetcher.getMockImplementation()
    if (!normal) throw new Error('Missing mock implementation')
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000)
    let attempted = false
    fetcher.mockImplementation(async (url, init) => {
      const response = await normal(url, init)
      if (String(url).startsWith('/api/mail/attachments/'))
        return Response.json({ ...(await response.json()), associated: attempted })
      if (String(url) === '/api/mail/send' && !attempted) {
        attempted = true
        return new Response(null, { status: 502 })
      }
      return response
    })
    const delivery = context()
    const message = { ...composition, attachments: [file()] }
    await expect(sendEmail(message, 'same-message', delivery)).rejects.toThrow()
    clock.mockReturnValue(1_800_000_000_000 + 86_400_001)
    await sendEmail(message, 'same-message', delivery)
    expect(callsTo(fetcher, '/api/mail/attachments')).toHaveLength(1)
    expect(
      callsTo(fetcher, '/api/mail/attachments/00000000-0000-4000-8000-000000000001'),
    ).toHaveLength(1)
    const sends = callsTo(fetcher, '/api/mail/send')
    expect(JSON.parse(String(sends[0]?.[1]?.body))).toEqual(JSON.parse(String(sends[1]?.[1]?.body)))
  })

  it.each(['missing', 'expired'] as const)(
    'does not replace a %s upload after an uncertain provider send',
    async (status) => {
      const fetcher = provider()
      const normal = fetcher.getMockImplementation()
      if (!normal) throw new Error('Missing mock implementation')
      const clock = vi.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000)
      let attempted = false
      fetcher.mockImplementation(async (url, init) => {
        const response = await normal(url, init)
        if (attempted && String(url).startsWith('/api/mail/attachments/'))
          return status === 'missing'
            ? Response.json({ code: 'attachment_not_found' }, { status: 404 })
            : Response.json({ ...(await response.json()), status: 'expired', associated: false })
        if (String(url) === '/api/mail/send') {
          attempted = true
          return new Response(null, { status: 502 })
        }
        return response
      })
      const delivery = context()
      const message = { ...composition, attachments: [file()] }
      await expect(sendEmail(message, 'same-message', delivery)).rejects.toThrow()
      clock.mockReturnValue(1_800_000_000_000 + 86_400_001)
      await expect(sendEmail(message, 'same-message', delivery)).rejects.toThrow('confirmar')
      expect(callsTo(fetcher, '/api/mail/attachments')).toHaveLength(1)
      expect(callsTo(fetcher, '/api/mail/send')).toHaveLength(1)
    },
  )

  it('recovers a missing upload only when it has never been submitted for sending', async () => {
    const fetcher = provider()
    const normal = fetcher.getMockImplementation()
    if (!normal) throw new Error('Missing mock implementation')
    fetcher.mockImplementation(async (url, init) =>
      String(url).includes('/attachments/00000000-0000-4000-8000-000000000001')
        ? Response.json({ code: 'attachment_not_found' }, { status: 404 })
        : normal(url, init),
    )
    await sendEmail({ ...composition, attachments: [file()] }, 'same-message', context())
    expect(callsTo(fetcher, '/api/mail/attachments')).toHaveLength(2)
    expect(JSON.parse(String(callsTo(fetcher, '/api/mail/send')[0]?.[1]?.body))).toMatchObject({
      id: 'same-message',
      attachments: [{ id: '00000000-0000-4000-8000-000000000002' }],
    })
  })

  it.each(['pending', 'rejected', 'error'])(
    'does not send attachments that are %s',
    async (status) => {
      const fetcher = provider()
      const normal = fetcher.getMockImplementation()
      if (!normal) throw new Error('Missing mock implementation')
      fetcher.mockImplementation(async (url, init) =>
        String(url).endsWith('/complete')
          ? Response.json({
              id: '00000000-0000-4000-8000-000000000001',
              filename: 'hello.txt',
              contentType: 'text/plain',
              size: 5,
              sha256: hash,
              status,
            })
          : normal(url, init),
      )
      await expect(
        sendEmail({ ...composition, attachments: [file()] }, 'id', context()),
      ).rejects.toThrow()
      expect(callsTo(fetcher, '/api/mail/send')).toHaveLength(0)
    },
  )

  it('uses a fresh upload for changed bytes and another Composition session', async () => {
    const fetcher = provider()
    const delivery = context()
    await sendEmail({ ...composition, attachments: [file()] }, 'one', delivery)
    await sendEmail(
      {
        ...composition,
        attachments: [
          { id: 'file', file: new File(['Different'], 'hello.txt', { type: 'text/plain' }) },
        ],
      },
      'two',
      delivery,
    )
    await sendEmail({ ...composition, attachments: [file()] }, 'three', context())
    expect(callsTo(fetcher, '/api/mail/attachments')).toHaveLength(3)
  })

  it('embeds duplicate local images once, keeps stable CIDs and leaves remote images unchanged', async () => {
    const fetcher = provider()
    const body =
      '<p><strong>Formatted</strong> 🎉</p><img src="data:image/png;base64,aGVsbG8="><img src="data:image/png;base64,aGVsbG8="><img src="https://example.test/image.png">'
    const delivery = context()
    await sendEmail({ ...composition, body }, 'id', delivery)
    await sendEmail({ ...composition, body }, 'id', delivery)
    const first = JSON.parse(String(callsTo(fetcher, '/api/mail/send')[0]?.[1]?.body))
    expect(first.html).not.toContain('data:image')
    expect(first.html.match(/cid:mailflow-inline-1/g)).toHaveLength(2)
    expect(first.html).toContain('https://example.test/image.png')
    expect(first.attachments).toEqual([
      { id: '00000000-0000-4000-8000-000000000001', contentId: 'mailflow-inline-1' },
    ])
    expect(callsTo(fetcher, '/api/mail/attachments')).toHaveLength(1)
  })

  it('rejects invalid inline data and size/count overflow before any request', async () => {
    const fetcher = provider()
    await expect(
      sendEmail({ ...composition, body: '<img src="data:image/svg+xml;base64,aGVsbG8=">' }, 'id'),
    ).rejects.toThrow()
    const oversized = file()
    Object.defineProperty(oversized.file, 'size', { value: 10_000_001 })
    await expect(sendEmail({ ...composition, attachments: [oversized] }, 'id')).rejects.toThrow()
    const tiny = file()
    await expect(
      sendEmail({ ...composition, attachments: Array.from({ length: 11 }, () => tiny) }, 'id'),
    ).rejects.toThrow()
    const countTen = Array.from({ length: 10 }, (_, index) => ({ ...file(), id: String(index) }))
    await expect(
      sendEmail(
        {
          ...composition,
          attachments: countTen,
          body: '<img src="data:image/png;base64,aGVsbG8=">',
        },
        'id',
      ),
    ).rejects.toThrow()
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('does not leak upstream details or accept malformed send confirmation', async () => {
    let sending = 0
    const fetcher = vi.fn<typeof fetch>(async (url) =>
      String(url) === '/api/mail/context'
        ? Response.json(workspaceContext)
        : ++sending === 1
          ? Response.json({ message: 'private' }, { status: 502 })
          : Response.json({ status: 'failed' }),
    )
    vi.stubGlobal('fetch', fetcher)
    await expect(sendEmail(composition, 'id')).rejects.toThrow('Não foi possível enviar')
    await expect(sendEmail(composition, 'id')).rejects.toThrow('Não foi possível enviar')
  })

  it('preserves paragraph, list and explicit line break separation in plain text', async () => {
    const fetcher = provider()
    await sendEmail(
      {
        ...composition,
        body: '<p>First paragraph</p><p>Second<br>line</p><ul><li>Alpha item</li><li>Beta item</li></ul>',
      },
      'id',
    )
    const body = JSON.parse(String(callsTo(fetcher, '/api/mail/send')[0]?.[1]?.body))
    expect(body.text).toBe('First paragraph\nSecond\nline\nAlpha item\nBeta item')
    expect(body.html).toContain('<br>')
    expect(body.html).not.toContain('\n')
  })
  it('uses application/octet-stream when the browser does not provide a file MIME type', async () => {
    const fetcher = provider()
    await sendEmail(
      { ...composition, attachments: [{ id: 'unknown', file: new File(['Hello'], 'file.bin') }] },
      'id',
      context(),
    )
    expect(
      JSON.parse(String(callsTo(fetcher, '/api/mail/attachments')[0]?.[1]?.body)),
    ).toMatchObject({ contentType: 'application/octet-stream' })
  })

  it.each(['size', 'sha256', 'contentType'] as const)(
    'refuses a clean completion with different %s metadata',
    async (field) => {
      const fetcher = provider()
      const normal = fetcher.getMockImplementation()
      if (!normal) throw new Error('Missing mock implementation')
      fetcher.mockImplementation(async (url, init) => {
        const response = await normal(url, init)
        if (!String(url).endsWith('/complete')) return response
        const metadata = await response.json()
        metadata[field] = field === 'size' ? 99 : field === 'sha256' ? 'a'.repeat(64) : 'image/png'
        return Response.json(metadata)
      })
      await expect(
        sendEmail({ ...composition, attachments: [file()] }, 'id', context()),
      ).rejects.toThrow()
      expect(callsTo(fetcher, '/api/mail/send')).toHaveLength(0)
    },
  )

  it.each([
    { uploadUrl: 'http://external.example.test/upload', headers: {} },
    {
      uploadUrl: 'https://objects.example.test/upload',
      headers: { Authorization: 'private-secret' },
    },
  ])('rejects unsafe upload configuration before sending bytes', async (configuration) => {
    const fetcher = vi.fn<typeof fetch>(async (url) =>
      String(url) === '/api/mail/context'
        ? Response.json(workspaceContext)
        : Response.json({
            id: '00000000-0000-4000-8000-000000000001',
            expiresAt: new Date(Date.now() + 300_000).toISOString(),
            ...configuration,
          }),
    )
    vi.stubGlobal('fetch', fetcher)
    await expect(
      sendEmail({ ...composition, attachments: [file()] }, 'id', context()),
    ).rejects.toThrow('Não foi possível enviar')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['unsupported_archive', 'formato ZIP'],
    ['unsafe_archive', 'Reduza seu tamanho'],
    ['checksum_mismatch', 'Remova e anexe'],
    ['infected', 'Remova ou substitua'],
  ])('provides safe remediation for rejected files (%s)', async (rejectionReason, message) => {
    const fetcher = provider()
    const normal = fetcher.getMockImplementation()
    if (!normal) throw new Error('Missing mock implementation')
    fetcher.mockImplementation(async (url, init) => {
      const response = await normal(url, init)
      return String(url).endsWith('/complete')
        ? Response.json({ ...(await response.json()), status: 'rejected', rejectionReason })
        : response
    })
    await expect(
      sendEmail({ ...composition, attachments: [file()] }, 'id', context()),
    ).rejects.toThrow(message)
    expect(callsTo(fetcher, '/api/mail/send')).toHaveLength(0)
  })
})
