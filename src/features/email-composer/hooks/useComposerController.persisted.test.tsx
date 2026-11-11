import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useComposerController } from './useComposerController'

const { saveRemote } = vi.hoisted(() => ({
  saveRemote: vi.fn(async (input: { id: string; version: number }) => ({
    id: input.id,
    version: input.version + 1,
  })),
}))
vi.mock('../clients/discardEmail', () => ({
  discardEmail: vi.fn(async () => ({ retainedMessageIds: [] })),
}))
vi.mock('../clients/drafts', async (original) => ({
  ...(await original<object>()),
  saveDraft: saveRemote,
  deleteDraft: vi.fn(async () => {}),
  readDraft: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function unload() {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event
}

async function ready() {
  const view = renderHook(() =>
    useComposerController('light', undefined, vi.fn(), undefined, 'owner'),
  )
  await waitFor(() => expect(view.result.current.context.editor).toBeTruthy())
  act(() => view.result.current.onOpenChange(true, { cancel: vi.fn() } as never))
  return view
}

describe('useComposerController unsaved changes with a stored draft', () => {
  it('only counts edits that the server has not stored yet', async () => {
    const { result } = await ready()
    expect(result.current.context.isDirty()).toBe(false)

    act(() => result.current.draft.setValue('subject', 'Quarterly report'))
    expect(result.current.context.isDirty()).toBe(true)
    expect(unload().defaultPrevented).toBe(true)

    await act(async () => {
      expect(await result.current.context.saveDraft()).toBe(true)
    })
    expect(result.current.context.isDirty()).toBe(false)
    expect(unload().defaultPrevented).toBe(false)
  })

  it('keeps the warning and the composer open when the save fails', async () => {
    saveRemote.mockRejectedValueOnce(new Error('offline'))
    const { result } = await ready()
    act(() => result.current.draft.setValue('subject', 'Quarterly report'))

    await act(async () => {
      expect(await result.current.context.saveDraft()).toBe(false)
    })
    expect(result.current.context.isDirty()).toBe(true)
    expect(unload().defaultPrevented).toBe(true)

    saveRemote.mockRejectedValueOnce(new Error('offline'))
    await act(async () => result.current.context.saveAndClose())
    expect(result.current.open).toBe(true)
  })

  it('saves and then closes the composer', async () => {
    const { result } = await ready()
    act(() => result.current.draft.setValue('subject', 'Quarterly report'))
    await act(async () => result.current.context.saveAndClose())
    expect(saveRemote).toHaveBeenCalled()
    expect(result.current.open).toBe(false)
    expect(result.current.context.isDirty()).toBe(false)
  })
})
