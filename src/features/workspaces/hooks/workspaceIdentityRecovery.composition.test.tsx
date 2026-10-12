import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { getCurrentSession } from '../../auth/adapters/getCurrentSession'
import { useWorkspaceData } from './useWorkspaceData'
import { useWorkspaceSelection } from './useWorkspaceSelection'

vi.mock('../../auth/adapters/getCurrentSession', () => ({ getCurrentSession: vi.fn() }))

const acme = { id: 'a', name: 'Acme', slug: 'acme', role: 'owner' }
const northwind = { id: 'b', name: 'Northwind', slug: 'northwind', role: 'member' }

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.resetAllMocks()
})

function browser() {
  const replace = vi.fn(),
    assign = vi.fn()
  const location = {
    href: 'http://acme.workspace.test/sent',
    pathname: '/sent',
    hostname: 'acme.workspace.test',
    replace,
    assign,
  }
  const actualWindow = window
  vi.stubGlobal(
    'window',
    new Proxy(actualWindow, {
      get(target, key) {
        if (key === 'location') return location
        const value = Reflect.get(target, key, target)
        return typeof value === 'function' ? value.bind(target) : value
      },
    }),
  )
  return { replace, assign }
}

function response(payload: unknown) {
  return Response.json(payload, { headers: { 'X-Workspace-Identity': 'actor' } })
}

function wrapper(client: QueryClient) {
  return function QueryWrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

it('hides old workspace authority and rejects a delayed selection after discovery detects session expiry', async () => {
  const navigation = browser()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  vi.mocked(getCurrentSession).mockResolvedValue({
    id: 'actor',
    name: 'Fixture',
    email: 'fixture@mailflow.invalid',
  })
  let releaseSelection: (response: Response) => void = () => {}
  const pendingSelection = new Promise<Response>((resolve) => {
    releaseSelection = resolve
  })
  let selectionSignal: AbortSignal | null | undefined
  let expired = false
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(async (input, init) => {
      const path = String(input)
      if (path === '/api/v1/workspace-selection') {
        selectionSignal = init?.signal
        return pendingSelection
      }
      if (expired) return new Response(null, { status: 401 })
      return response(
        path === '/api/workspace-context'
          ? { workspace: acme }
          : { items: [acme, northwind], nextCursor: null },
      )
    }),
  )
  const { result, unmount } = renderHook(
    () => {
      const state = useWorkspaceData('actor', true)
      const selection = useWorkspaceSelection({ state, baseHost: 'workspace.test', enabled: true })
      return { state, selection }
    },
    { wrapper: wrapper(client) },
  )
  await waitFor(() => expect(result.current.state.status).toBe('ready'))
  act(() => result.current.selection.request('b'))
  await waitFor(() => expect(selectionSignal).toBeDefined())
  expired = true
  vi.mocked(getCurrentSession).mockResolvedValue(null)
  act(() => result.current.state.retry())
  await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/sent#'))
  expect(result.current.state.current).toBeNull()
  expect(result.current.state.items).toEqual([])
  expect(client.getQueryCache().getAll()).toHaveLength(0)
  await act(async () => releaseSelection(response({ workspace: northwind })))
  await waitFor(() => expect(result.current.selection.error).toContain('session changed'))
  expect(navigation.assign).not.toHaveBeenCalled()
  expect(navigation.replace.mock.calls.every(([path]) => path === '/sent#')).toBe(true)
  unmount()
  client.clear()
})

it('rejects late selection data after another identity logs in, without navigating to its workspace', async () => {
  const navigation = browser()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  vi.mocked(getCurrentSession).mockResolvedValue({
    id: 'actor',
    name: 'Fixture',
    email: 'fixture@mailflow.invalid',
  })
  let releaseSelection: (response: Response) => void = () => {}
  const pendingSelection = new Promise<Response>((resolve) => {
    releaseSelection = resolve
  })
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(async (input) => {
      if (String(input) === '/api/v1/workspace-selection') return pendingSelection
      return response(
        String(input) === '/api/workspace-context'
          ? { workspace: acme }
          : { items: [acme, northwind], nextCursor: null },
      )
    }),
  )
  const { result, unmount } = renderHook(
    () => {
      const state = useWorkspaceData('actor', true)
      return useWorkspaceSelection({ state, baseHost: 'workspace.test', enabled: true })
    },
    { wrapper: wrapper(client) },
  )
  await waitFor(() =>
    expect(
      client.getQueryData(['workspaces', 'actor', 'acme.workspace.test', 'context']),
    ).toBeDefined(),
  )
  await waitFor(() => expect(client.isFetching()).toBe(0))
  act(() => result.current.request('b'))
  vi.mocked(getCurrentSession).mockResolvedValue({
    id: 'other',
    name: 'Other',
    email: 'other@mailflow.invalid',
  })
  await act(async () => releaseSelection(response({ workspace: northwind })))
  await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/sent#'))
  expect(navigation.assign).not.toHaveBeenCalled()
  expect(client.getQueryCache().getAll()).toHaveLength(0)
  unmount()
  client.clear()
})
