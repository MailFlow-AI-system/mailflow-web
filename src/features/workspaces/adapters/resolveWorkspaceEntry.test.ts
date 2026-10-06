import { afterEach, expect, it, vi } from 'vitest'
import { getWorkspaceEntryBootstrap } from './getWorkspaceEntryBootstrap'
import { resolveWorkspaceEntry } from './resolveWorkspaceEntry'

vi.mock('./getWorkspaceEntryBootstrap', () => ({ getWorkspaceEntryBootstrap: vi.fn() }))
afterEach(() => vi.resetAllMocks())

it.each([
  [undefined, false],
  ['workspace.test', false],
  [undefined, true],
] as const)(
  'does not execute an inactive workspace server function (%s, %s)',
  async (baseHost, enabled) => {
    expect(await resolveWorkspaceEntry('/inbox', baseHost, enabled)).toEqual({
      kind: 'passthrough',
    })
    expect(getWorkspaceEntryBootstrap).not.toHaveBeenCalled()
  },
)

it('keeps configured entry resolution server-authoritative', async () => {
  vi.mocked(getWorkspaceEntryBootstrap).mockResolvedValueOnce({ kind: 'empty' })
  expect(await resolveWorkspaceEntry('/sent', 'workspace.test', true)).toEqual({ kind: 'empty' })
  expect(getWorkspaceEntryBootstrap).toHaveBeenCalledWith({ data: { pathname: '/sent' } })
})

it('does not turn a configured server failure into passthrough', async () => {
  vi.mocked(getWorkspaceEntryBootstrap).mockRejectedValueOnce(
    new Error('Synthetic resolver failure'),
  )
  await expect(resolveWorkspaceEntry('/inbox', 'workspace.test', true)).rejects.toThrow(
    'Synthetic resolver failure',
  )
})
