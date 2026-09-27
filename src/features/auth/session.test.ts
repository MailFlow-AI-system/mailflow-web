import { describe, expect, it, vi } from 'vitest'

import { readAuthSession } from './session'

describe('readAuthSession', () => {
  it('forwards the request cookie to Core without caching', async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        session: { id: 'session-1' },
        user: { id: 'user-1', name: 'Ada', email: 'ada@example.test' },
      }),
    )

    await expect(
      readAuthSession('http://localhost:8080', 'better-auth.session_token=abc', fetcher),
    ).resolves.toEqual({ id: 'user-1', name: 'Ada', email: 'ada@example.test' })
    expect(fetcher).toHaveBeenCalledWith('http://localhost:8080/api/auth/get-session', {
      headers: { Cookie: 'better-auth.session_token=abc' },
      cache: 'no-store',
    })
  })

  it('treats absent and revoked sessions as unauthenticated', async () => {
    const fetcher = vi.fn(async () => Response.json(null))
    await expect(readAuthSession('http://localhost:8080', undefined, fetcher)).resolves.toBeNull()
    expect(fetcher).not.toHaveBeenCalled()
    await expect(readAuthSession('http://localhost:8080', 'expired=1', fetcher)).resolves.toBeNull()
  })

  it('treats an unauthorized response as a revoked session', async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 401 }))
    await expect(
      readAuthSession('http://localhost:8080', 'token=revoked', fetcher),
    ).resolves.toBeNull()
  })

  it('rejects a malformed success response', async () => {
    const fetcher = vi.fn(async () =>
      Response.json({ user: { id: 'user-1', name: 'Ada', email: 'ada@example.test' } }),
    )
    await expect(readAuthSession('http://localhost:8080', 'token=1', fetcher)).rejects.toThrow(
      'Unable to verify the session',
    )
  })

  it('does not turn an API outage into a login redirect', async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 503 }))
    await expect(readAuthSession('http://localhost:8080', 'token=1', fetcher)).rejects.toThrow(
      'Unable to verify the session',
    )
  })
})
