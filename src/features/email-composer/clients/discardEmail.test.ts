import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EmailDeliveryContext } from '../types/EmailDelivery'
import { discardEmail } from './discardEmail'

const first = '00000000-0000-4000-8000-000000000001'
const second = '00000000-0000-4000-8000-000000000002'
const scope = {
  userId: 'owner',
  workspace: {
    id: 'workspace-a',
    name: 'Workspace A',
    slug: 'workspace-a',
    role: 'owner' as const,
  },
}
function delivery(): EmailDeliveryContext {
  return { uploads: new Map(), scope: { current: scope }, userId: 'owner', messageIds: new Set() }
}
afterEach(() => vi.unstubAllGlobals())

describe('discardEmail', () => {
  it('does not make a request for a draft without remote resources', async () => {
    const fetcher = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetcher)
    expect(await discardEmail(delivery())).toEqual({ retainedMessageIds: [] })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('notifies Core about all attempts and reservations using the pinned verified identity', async () => {
    const context = delivery()
    context.messageIds?.add(first)
    context.messageIds?.add(second)
    context.uploads.set('inline-image-1', {
      id: first,
      uploadUrl: 'https://r2.example.test',
      headers: {},
      expiresAt: '',
      uploaded: true,
      clean: true,
    })
    const fetcher = vi.fn<typeof fetch>(async (path) =>
      String(path) === '/api/mail/context'
        ? Response.json(scope)
        : Response.json({ status: 'discarded', retainedMessageIds: [second] }),
    )
    vi.stubGlobal('fetch', fetcher)
    expect(await discardEmail(context)).toEqual({ retainedMessageIds: [second] })
    const [, init] = fetcher.mock.calls[1] ?? []
    expect(JSON.parse(String(init?.body))).toEqual({
      messageIds: [first, second],
      attachmentIds: [first],
    })
    expect(new Headers(init?.headers).get('X-Workspace-Identity')).toBe('owner')
    expect(new Headers(init?.headers).get('X-Workspace-Id')).toBe('workspace-a')
    expect(context.uploads.size).toBe(1)
    expect(context.messageIds?.size).toBe(2)
  })

  it('can release only removed attachment reservations without cancelling delivery identities', async () => {
    const context = delivery()
    context.messageIds?.add(first)
    const fetcher = vi.fn<typeof fetch>(async (path) =>
      String(path) === '/api/mail/context'
        ? Response.json(scope)
        : Response.json({ status: 'discarded', retainedMessageIds: [] }),
    )
    vi.stubGlobal('fetch', fetcher)
    await discardEmail(context, { messageIds: [], attachmentIds: [second] })
    expect(JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body))).toEqual({
      messageIds: [],
      attachmentIds: [second],
    })
  })

  it.each(['identity', 'workspace'])(
    'refuses cleanup after a %s context change',
    async (change) => {
      const context = delivery()
      context.messageIds?.add(first)
      const fetcher = vi.fn<typeof fetch>(async () =>
        Response.json(
          change === 'identity'
            ? { ...scope, userId: 'other-user' }
            : { ...scope, workspace: { ...scope.workspace, id: 'workspace-b' } },
        ),
      )
      vi.stubGlobal('fetch', fetcher)
      await expect(discardEmail(context)).rejects.toThrow(
        change === 'identity' ? 'sessão' : 'workspace',
      )
      expect(fetcher).toHaveBeenCalledTimes(1)
      expect(context.messageIds?.has(first)).toBe(true)
    },
  )

  it('retains references on cancellation failure and rejects unexpected retained message identities', async () => {
    const context = delivery()
    context.messageIds?.add(first)
    const fetcher = vi.fn<typeof fetch>(async (path) =>
      String(path) === '/api/mail/context'
        ? Response.json(scope)
        : new Response(null, { status: 502 }),
    )
    vi.stubGlobal('fetch', fetcher)
    await expect(discardEmail(context)).rejects.toThrow('mantido')
    expect(context.messageIds?.has(first)).toBe(true)
    fetcher.mockImplementation(async (path) =>
      String(path) === '/api/mail/context'
        ? Response.json(scope)
        : Response.json({ status: 'discarded', retainedMessageIds: [second] }),
    )
    await expect(discardEmail(context)).rejects.toThrow('mantido')
  })

  it('chunks long sessions into bounded idempotent requests', async () => {
    const context = delivery()
    for (let index = 0; index < 201; index++) {
      context.messageIds?.add(`00000000-0000-4000-8000-${String(index).padStart(12, '0')}`)
    }
    const fetcher = vi.fn<typeof fetch>(async (path) =>
      String(path) === '/api/mail/context'
        ? Response.json(scope)
        : Response.json({ status: 'discarded', retainedMessageIds: [] }),
    )
    vi.stubGlobal('fetch', fetcher)
    await discardEmail(context)
    const sizes = fetcher.mock.calls
      .filter(([path]) => path === '/api/mail/discard')
      .map(([, init]) => JSON.parse(String(init?.body)).messageIds.length)
    expect(sizes).toEqual([100, 100, 1])
  })
})

it('includes superseded reservations even after their upload cache entry is gone', async () => {
  const context = delivery()
  context.attachmentIds = new Set([first, second])
  const fetcher = vi.fn<typeof fetch>(async (path) =>
    String(path) === '/api/mail/context'
      ? Response.json(scope)
      : Response.json({ status: 'discarded', retainedMessageIds: [] }),
  )
  vi.stubGlobal('fetch', fetcher)
  await discardEmail(context)
  expect(JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body))).toEqual({
    messageIds: [],
    attachmentIds: [first, second],
  })
})
