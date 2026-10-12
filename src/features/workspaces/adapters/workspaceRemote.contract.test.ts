import { describe, expect, it, vi } from 'vitest'
import { readWorkspaceEntryBootstrap } from './workspaceEntryBootstrap'
import { createWorkspaceEntryGateway } from './workspaceEntryGateway'
import { createWorkspaceGateway } from './workspaceGateway'
import { createWorkspaceSelectionGateway } from './workspaceSelectionGateway'

const baseHost = 'app.staging.example.com'
const api = 'https://api.staging.example.com'
const workspace = { id: 'b', name: 'Northwind', slug: 'northwind', role: 'member' }
const cookie = '__Secure-better-auth.session_token=opaque'

describe('remote workspace contracts', () => {
  it('forwards authorized HTTPS selection without forwarding cookies or redirects from Core', async () => {
    const origin = `https://acme.${baseHost}`
    const fetcher = vi.fn(async () =>
      Response.json({ workspace }, { headers: { 'Set-Cookie': 'discard=value' } }),
    )
    const gateway = createWorkspaceSelectionGateway(api, baseHost, true, fetcher)
    const request = (source: string, requestOrigin = source) =>
      new Request(`${source}/api/v1/workspace-selection`, {
        method: 'POST',
        headers: { Cookie: cookie, Origin: requestOrigin, 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: workspace.id }),
      })
    expect((await gateway(request(origin))).status).toBe(200)
    expect((await gateway(request(origin, `https://northwind.${baseHost}`))).status).toBe(403)
    expect((await gateway(request(`http://acme.${baseHost}`))).status).toBe(404)
    expect((await gateway(request('https://acme.app.production.example.com'))).status).toBe(404)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('resumes only on the exact generic HTTPS origin and produces an environment-scoped destination', async () => {
    const fetcher = vi.fn(async () => Response.json({ source: 'preference', workspace }))
    const gateway = createWorkspaceEntryGateway(api, baseHost, true, fetcher)
    const request = (origin: string) =>
      new Request(`${origin}/api/v1/workspace-entry`, { headers: { Cookie: cookie } })
    expect((await gateway(request(`https://${baseHost}`))).status).toBe(200)
    expect((await gateway(request(`http://${baseHost}`))).status).toBe(404)
    expect((await gateway(request(`https://acme.${baseHost}`))).status).toBe(404)
    expect(
      await readWorkspaceEntryBootstrap(
        new Request(`https://${baseHost}/sent?private=value`, { headers: { Cookie: cookie } }),
        '/sent',
        api,
        baseHost,
        true,
        fetcher,
      ),
    ).toEqual({ kind: 'redirect', href: `https://northwind.${baseHost}/sent#` })
  })

  it('does not discover on insecure or unrelated remote hosts and stays dark without the gate', async () => {
    const fetcher = vi.fn(async () => Response.json({ items: [workspace], nextCursor: null }))
    const gateway = createWorkspaceGateway(api, baseHost, fetcher)
    for (const origin of [
      `http://acme.${baseHost}`,
      `https://acme.${baseHost}.attacker.com`,
      `https://a.b.${baseHost}`,
    ]) {
      expect(
        (await gateway(new Request(`${origin}/api/v1/workspaces`, { headers: { Cookie: cookie } })))
          .status,
      ).toBe(404)
    }
    expect(
      (
        await createWorkspaceEntryGateway(
          api,
          baseHost,
          false,
          fetcher,
        )(
          new Request(`https://${baseHost}/api/v1/workspace-entry`, {
            headers: { Cookie: cookie },
          }),
        )
      ).status,
    ).toBe(503)
    expect(fetcher).not.toHaveBeenCalled()
  })
})
