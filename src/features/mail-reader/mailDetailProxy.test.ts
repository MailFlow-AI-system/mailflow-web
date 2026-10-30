import { describe, expect, it, vi } from 'vitest'
import { createMailDetailProxy } from './mailDetailProxy'

describe('message detail proxy', () => {
  it('pins inbox detail to the workspace host and forwards verified response headers', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      Response.json(
        { id: 'message-1' },
        { headers: { 'X-Workspace-Id': 'workspace-1', 'X-Workspace-Identity': 'user-1' } },
      ),
    )
    const response = await createMailDetailProxy(
      'https://api.test',
      fetcher,
      'workspace.test',
    )(
      new Request('http://acme.workspace.test/api/mail/messages/message-1?workspace=evil', {
        headers: { cookie: 'better-auth.session_token=secret', 'X-Workspace-Identity': 'user-1' },
      }),
    )
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      'https://api.test/api/v1/workspaces/acme/mail/messages/message-1',
    )
    expect(response.headers.get('X-Workspace-Id')).toBe('workspace-1')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })
  it('rejects generic hosts, traversal IDs and requests without a session', async () => {
    const fetcher = vi.fn()
    const proxy = createMailDetailProxy('https://api.test', fetcher, 'workspace.test')
    for (const path of [
      'http://workspace.test/api/mail/messages/one',
      'http://acme.workspace.test/api/mail/messages/%2Fprivate',
      'http://acme.workspace.test/api/mail/messages/one',
    ]) {
      expect((await proxy(new Request(path))).status).toBeGreaterThanOrEqual(400)
    }
    expect(fetcher).not.toHaveBeenCalled()
  })
})
