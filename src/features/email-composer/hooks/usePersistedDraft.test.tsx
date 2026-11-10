import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DraftConflictError, DraftRejectedError } from '../clients/drafts'
import { emptyDraft } from './useDraftForm'
import { usePersistedDraft } from './usePersistedDraft'

const { saveRemote, discardRemote } = vi.hoisted(() => ({
  saveRemote: vi.fn(),
  discardRemote: vi.fn(),
}))
vi.mock('../clients/drafts', async (original) => ({
  ...(await original<object>()),
  saveDraft: saveRemote,
  deleteDraft: discardRemote,
}))
afterEach(() => {
  vi.useRealTimers()
  vi.resetAllMocks()
})
const context = () => ({ uploads: new Map(), scope: { current: null }, userId: 'owner' })
describe('persisted draft lifecycle', () => {
  it('preserves conflicting edits and only saves a new copy after an explicit request', async () => {
    const values = { ...emptyDraft, subject: 'My changes' }
    saveRemote
      .mockRejectedValueOnce(new DraftConflictError('Changed in another tab'))
      .mockResolvedValueOnce({ version: 1 })
    const { result } = renderHook(() =>
      usePersistedDraft({
        enabled: true,
        active: true,
        signature: 'conflict',
        read: () => ({ values, labels: [] }),
        context,
      }),
    )
    await act(async () => {
      expect(await result.current.save()).toBe(false)
    })
    expect(result.current.conflict).toBe(true)
    const firstId = saveRemote.mock.calls[0]?.[0].id
    await act(async () => {
      expect(await result.current.saveCopy()).toBe(true)
    })
    expect(saveRemote.mock.calls[1]?.[0].id).not.toBe(firstId)
    expect(saveRemote.mock.calls[1]?.[0].values.subject).toBe('My changes')
    expect(result.current.conflict).toBe(false)
  })
  it('allows correcting a definitively rejected snapshot instead of retrying its invalid fields forever', async () => {
    let values = { ...emptyDraft, subject: 'Invalid snapshot' }
    saveRemote
      .mockRejectedValueOnce(new DraftRejectedError('Invalid snapshot'))
      .mockResolvedValueOnce({ version: 1 })
    const { result, rerender } = renderHook(() =>
      usePersistedDraft({
        enabled: true,
        active: true,
        signature: JSON.stringify(values),
        read: () => ({ values, labels: [] }),
        context,
      }),
    )
    await act(async () => {
      expect(await result.current.save()).toBe(false)
    })
    values = { ...values, subject: 'Corrected snapshot' }
    rerender()
    await act(async () => {
      expect(await result.current.save()).toBe(true)
    })
    expect(saveRemote.mock.calls[1]?.[0].values.subject).toBe('Corrected snapshot')
  })
  it('does not save an empty composer and debounces incomplete compositions', async () => {
    vi.useFakeTimers()
    let values = { ...emptyDraft }
    const read = () => ({ values, labels: [] })
    const { result, rerender } = renderHook(() =>
      usePersistedDraft({
        enabled: true,
        active: true,
        signature: JSON.stringify(values),
        read,
        context,
      }),
    )
    await act(async () => vi.advanceTimersByTimeAsync(1500))
    expect(saveRemote).not.toHaveBeenCalled()
    values = { ...values, to: 'unfinished@' }
    saveRemote.mockResolvedValue({ id: 'draft', version: 1 })
    rerender()
    await act(async () => vi.advanceTimersByTimeAsync(999))
    expect(saveRemote).not.toHaveBeenCalled()
    await act(async () => vi.advanceTimersByTimeAsync(1))
    expect(saveRemote).toHaveBeenCalledTimes(1)
    expect(result.current.status).toBe('saved')
    expect(result.current.reference()).toMatchObject({ version: 1 })
  })
  it('serializes a manual save with autosave and persists edits made during a request', async () => {
    let values = { ...emptyDraft, subject: 'First' }
    let resolve!: (value: { version: number }) => void
    saveRemote.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    saveRemote.mockResolvedValueOnce({ version: 2 })
    const { result, rerender } = renderHook(() =>
      usePersistedDraft({
        enabled: true,
        active: true,
        signature: JSON.stringify(values),
        read: () => ({ values, labels: [] }),
        context,
      }),
    )
    let first!: Promise<boolean>, second!: Promise<boolean>
    act(() => {
      first = result.current.save()
      second = result.current.save()
    })
    expect(saveRemote).toHaveBeenCalledTimes(1)
    values = { ...values, subject: 'Latest' }
    rerender()
    await act(async () => {
      resolve({ version: 1 })
      await Promise.all([first, second])
    })
    expect(saveRemote).toHaveBeenCalledTimes(2)
    expect(saveRemote.mock.calls[1]?.[0]).toMatchObject({
      values: { subject: 'Latest' },
      version: 1,
    })
    expect(result.current.status).toBe('saved')
  })
  it('keeps content unsaved on failure and retries the same mutation after a lost response', async () => {
    saveRemote.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ version: 1 })
    const values = { ...emptyDraft, subject: 'Keep me' }
    const { result } = renderHook(() =>
      usePersistedDraft({
        enabled: true,
        active: true,
        signature: 'subject',
        read: () => ({ values, labels: [] }),
        context,
      }),
    )
    await act(async () => {
      expect(await result.current.save()).toBe(false)
    })
    expect(result.current.status).toBe('error')
    await act(async () => {
      expect(await result.current.save()).toBe(true)
    })
    expect(saveRemote.mock.calls[0]?.[0].mutationId).toBe(saveRemote.mock.calls[1]?.[0].mutationId)
  })
  it('waits for an in-flight save before discarding and does not schedule another autosave', async () => {
    vi.useFakeTimers()
    let resolve!: (value: { version: number }) => void
    saveRemote.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    discardRemote.mockResolvedValue(undefined)
    const values = { ...emptyDraft, subject: 'Discard' }
    const { result } = renderHook(() =>
      usePersistedDraft({
        enabled: true,
        active: true,
        signature: 'discard',
        read: () => ({ values, labels: [] }),
        context,
      }),
    )
    let discarded!: Promise<boolean>
    act(() => {
      void result.current.save()
      discarded = result.current.discard()
    })
    expect(discardRemote).not.toHaveBeenCalled()
    await act(async () => {
      resolve({ version: 1 })
      expect(await discarded).toBe(true)
    })
    expect(discardRemote.mock.calls[0]?.[1]).toBe(1)
    await act(async () => vi.advanceTimersByTimeAsync(2000))
    expect(saveRemote).toHaveBeenCalledTimes(1)
  })
})
