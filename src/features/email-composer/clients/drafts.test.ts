import { afterEach, describe, expect, it, vi } from 'vitest'
import { emptyDraft } from '../hooks/useDraftForm'
import type { EmailDeliveryContext } from '../types/EmailDelivery'
import { deleteDraft, discardDrafts, draftRequest, readDraft, saveDraft } from './drafts'

const id = '0198f0a8-0000-7000-8000-000000000001'
const fileId = '0198f0a8-0000-7000-8000-000000000002'
const scope = {
  userId: 'owner',
  workspace: { id: 'workspace', name: 'Workspace', slug: 'workspace', role: 'owner' as const },
}
const { prepare, resolve } = vi.hoisted(() => ({ prepare: vi.fn(), resolve: vi.fn() }))
vi.mock('./mailContext', async (original) => ({
  ...(await original<object>()),
  resolveDeliveryScope: resolve,
}))
vi.mock('./sendEmail', () => ({ prepareEmail: prepare }))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})
const headers = { 'X-Workspace-Id': 'workspace', 'X-Workspace-Identity': 'owner' }
const record = {
  ...emptyDraft,
  id,
  html: '<p>Content</p>',
  text: 'Content',
  version: 1,
  updatedAt: '2026-11-10T12:00:00.000Z',
  labels: [],
  attachments: [],
}
function setup() {
  const context: EmailDeliveryContext = {
    userId: 'owner',
    scope: { current: scope },
    uploads: new Map(),
  }
  resolve.mockResolvedValue(scope)
  prepare.mockResolvedValue({ html: '<p>Content</p>', text: 'Content', attachments: [], scope })
  return context
}
describe('draft client', () => {
  it('persists incomplete recipients with the version and mutation id without send validation', async () => {
    const context = setup()
    const fetcher = vi.fn(async () => Response.json(record, { headers }))
    vi.stubGlobal('fetch', fetcher)
    await saveDraft(
      {
        id,
        version: 0,
        mutationId: fileId,
        values: { ...emptyDraft, to: 'unfinished@' },
        labels: [],
      },
      context,
    )
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(`/api/mail/drafts/${id}`)
    expect(JSON.parse(String(init.body))).toMatchObject({
      to: 'unfinished@',
      version: 0,
      mutationId: fileId,
    })
    expect(new Headers(init.headers).get('X-Workspace-Identity')).toBe('owner')
  })
  it('rejects successful responses with a different identity or workspace', async () => {
    const context = setup()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json(record, { headers: { ...headers, 'X-Workspace-Identity': 'other' } }),
      ),
    )
    await expect(draftRequest(`/${id}`, context)).rejects.toThrow('account')
  })
  it('reports a version conflict and sends scoped deletion with the expected version', async () => {
    const context = setup()
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ code: 'draft_conflict' }, { status: 409 }))
      .mockResolvedValueOnce(Response.json({ status: 'discarded' }, { headers }))
    vi.stubGlobal('fetch', fetcher)
    await expect(deleteDraft(id, 3, context)).rejects.toThrow('another tab')
    await deleteDraft(id, 3, context)
    expect(JSON.parse(fetcher.mock.calls[1]?.[1]?.body)).toEqual({ version: 3 })
  })
  it('discards several drafts in one scoped request and returns each outcome', async () => {
    const context = setup()
    const results = [
      { id, status: 'discarded' },
      { id: fileId, status: 'conflict' },
    ]
    const fetcher = vi.fn(async () => Response.json({ results }, { headers }))
    vi.stubGlobal('fetch', fetcher)
    const items = [
      { id, version: 1 },
      { id: fileId, version: 4 },
    ]
    await expect(discardDrafts(items, context)).resolves.toEqual(results)
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/mail/drafts/discard')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({ items })
    expect(new Headers(init.headers).get('X-Workspace-Identity')).toBe('owner')
  })
  it('recovers files and inline images and reuses their verified upload references', async () => {
    const context = setup()
    const sha256 = 'a'.repeat(64)
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          {
            ...record,
            html: '<p><strong>Content</strong></p><img src="cid:mailflow-inline-1">',
            attachments: [
              {
                id: fileId,
                filename: 'notes.txt',
                contentType: 'text/plain',
                size: 5,
                sha256,
                contentId: null,
              },
              {
                id,
                filename: 'inline-image-1.png',
                contentType: 'image/png',
                size: 1,
                sha256,
                contentId: 'mailflow-inline-1',
              },
            ],
          },
          { headers },
        ),
      )
      .mockResolvedValueOnce(new Response('notes', { headers }))
      .mockResolvedValueOnce(new Response(new Uint8Array([1]), { headers }))
    vi.stubGlobal('fetch', fetcher)
    const restored = await readDraft(id, context)
    expect(restored.values.attachments[0]?.file.name).toBe('notes.txt')
    expect(restored.values.body).toContain('<strong>Content</strong>')
    expect(restored.values.body).toContain('data:image/png;base64,AQ==')
    expect(context.uploads.size).toBe(2)
    expect([...context.uploads.values()].every((file) => file.uploaded && file.clean)).toBe(true)
  })
})
