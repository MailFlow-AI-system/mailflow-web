import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useComposerController } from './useComposerController'

vi.mock('../clients/discardEmail', () => ({
  discardEmail: vi.fn(async () => ({ retainedMessageIds: [] })),
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
  const view = renderHook(() => useComposerController('light'))
  await waitFor(() => expect(view.result.current.context.editor).toBeTruthy())
  return view
}

describe('useComposerController unsaved changes', () => {
  it('lets the browser leave freely while the composer is pristine', async () => {
    const { result } = await ready()
    expect(result.current.context.isDirty()).toBe(false)
    expect(unload().defaultPrevented).toBe(false)
  })

  it('asks the browser to confirm a refresh once the user typed something', async () => {
    const { result } = await ready()
    act(() => result.current.draft.setValue('subject', 'Quarterly report'))
    expect(result.current.context.isDirty()).toBe(true)
    expect(unload().defaultPrevented).toBe(true)
  })

  it('also protects edits made only in the message body', async () => {
    const { result } = await ready()
    act(() => result.current.context.editor?.commands.insertContent('Hello'))
    expect(unload().defaultPrevented).toBe(true)
  })

  it('stops warning after the message is discarded', async () => {
    const { result } = await ready()
    act(() => result.current.draft.setValue('subject', 'Quarterly report'))
    await act(async () => result.current.context.discard())
    expect(result.current.context.isDirty()).toBe(false)
    expect(unload().defaultPrevented).toBe(false)
  })

  it('stops warning after the draft is saved', async () => {
    const { result } = await ready()
    act(() => result.current.draft.setValue('subject', 'Quarterly report'))
    await act(async () => result.current.context.saveDraft())
    expect(unload().defaultPrevented).toBe(false)
  })

  it('asks for confirmation when closing a dirty composer and closes after saving', async () => {
    const { result } = await ready()
    act(() => result.current.draft.setValue('subject', 'Quarterly report'))
    act(() => result.current.setState('normal'))
    const cancel = vi.fn()
    act(() => result.current.onOpenChange(true, { cancel } as never))
    expect(result.current.open).toBe(true)

    act(() => result.current.onOpenChange(false, { cancel } as never))
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(result.current.context.confirm).toBe(true)
    expect(result.current.open).toBe(true)

    await act(async () => result.current.context.saveAndClose())
    expect(result.current.context.confirm).toBe(false)
    expect(result.current.open).toBe(false)
    expect(result.current.context.isDirty()).toBe(false)
  })
})
