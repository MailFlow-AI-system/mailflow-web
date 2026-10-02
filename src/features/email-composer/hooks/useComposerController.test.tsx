import { act, renderHook, waitFor } from '@testing-library/react'
import { useFormState } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import { useComposerController } from './useComposerController'

describe('useComposerController composition validation', () => {
  it('invalidates readiness on every editor update and draft field edit', async () => {
    const { result } = renderHook(() => useComposerController('light'))
    await waitFor(() => expect(result.current.context.editor).toBeTruthy())

    act(() => {
      result.current.draft.setValue('to', 'ada@example.test')
      result.current.draft.setValue('subject', 'Update')
      result.current.context.editor?.commands.insertContent('First body')
    })
    await act(async () => result.current.context.validation.validate())
    expect(result.current.context.validation.ready).toBe(true)

    act(() => result.current.context.editor?.commands.insertContent(' updated'))
    await waitFor(() => expect(result.current.context.validation.ready).toBe(false))

    await act(async () => result.current.context.validation.validate())
    expect(result.current.context.validation.ready).toBe(true)
    act(() => result.current.draft.setValue('subject', 'Edited subject'))
    await waitFor(() => expect(result.current.context.validation.ready).toBe(false))
  })

  it('resets validation when discarding a draft session', async () => {
    const callbacks: { resolve: () => void; reject: (reason?: unknown) => void }[] = []
    const onValidated = vi.fn(
      () =>
        new Promise<void>((resolve, reject) => {
          callbacks.push({ resolve, reject })
        }),
    )
    const { result } = renderHook(() => {
      const controller = useComposerController('light', onValidated)
      const { errors, isSubmitting } = useFormState({ control: controller.draft.control })
      return { ...controller, errors, isSubmitting }
    })
    await waitFor(() => expect(result.current.context.editor).toBeTruthy())
    act(() => {
      result.current.draft.setValue('to', 'ada@example.test')
      result.current.draft.setValue('subject', 'Update')
      result.current.context.editor?.commands.insertContent('Body')
    })
    let attempt!: Promise<void>
    act(() => {
      attempt = result.current.context.validation.validate()
    })
    await waitFor(() => expect(onValidated).toHaveBeenCalledTimes(1))
    expect(result.current.isSubmitting).toBe(true)

    act(() => result.current.context.discard())
    expect(result.current.context.validation.ready).toBe(false)
    expect(result.current.draft.getValues()).toEqual({
      to: '',
      cc: '',
      bcc: '',
      subject: '',
      body: '<p></p>',
      attachments: [],
    })
    await waitFor(() => expect(result.current.context.editor).toBeTruthy())
    act(() => {
      result.current.draft.setValue('to', 'grace@example.test')
      result.current.draft.setValue('subject', 'Fresh draft')
      result.current.context.editor?.commands.insertContent('New body')
    })
    let freshAttempt!: Promise<void>
    act(() => {
      freshAttempt = result.current.context.validation.validate()
    })
    await waitFor(() => expect(onValidated).toHaveBeenCalledTimes(2))
    expect(result.current.isSubmitting).toBe(true)

    await act(async () => {
      callbacks[0]?.reject(new Error('stale callback failure'))
      await attempt
    })
    expect(result.current.context.validation.ready).toBe(false)
    expect(result.current.errors.root?.server).toBeUndefined()
    expect(result.current.isSubmitting).toBe(true)

    await act(async () => {
      callbacks[1]?.resolve()
      await freshAttempt
    })
    expect(result.current.context.validation.ready).toBe(true)
    expect(result.current.isSubmitting).toBe(false)
  })

  it('ignores an obsolete callback rejection after the new draft is already ready', async () => {
    const callbacks: { resolve: () => void; reject: (reason?: unknown) => void }[] = []
    const onValidated = vi.fn(
      () =>
        new Promise<void>((resolve, reject) => {
          callbacks.push({ resolve, reject })
        }),
    )
    const { result } = renderHook(() => {
      const controller = useComposerController('light', onValidated)
      const { errors, isSubmitting } = useFormState({ control: controller.draft.control })
      return { ...controller, errors, isSubmitting }
    })
    await waitFor(() => expect(result.current.context.editor).toBeTruthy())
    act(() => {
      result.current.draft.setValue('to', 'ada@example.test')
      result.current.draft.setValue('subject', 'First draft')
      result.current.context.editor?.commands.insertContent('First body')
    })
    let firstAttempt!: Promise<void>
    act(() => {
      firstAttempt = result.current.context.validation.validate()
    })
    await waitFor(() => expect(onValidated).toHaveBeenCalledTimes(1))

    act(() => result.current.context.discard())
    await act(async () => firstAttempt)
    await waitFor(() => expect(result.current.context.editor).toBeTruthy())
    act(() => {
      result.current.draft.setValue('to', 'grace@example.test')
      result.current.draft.setValue('subject', 'Fresh draft')
      result.current.context.editor?.commands.insertContent('Fresh body')
    })
    let freshAttempt!: Promise<void>
    act(() => {
      freshAttempt = result.current.context.validation.validate()
    })
    await waitFor(() => expect(onValidated).toHaveBeenCalledTimes(2))
    await act(async () => {
      callbacks[1]?.resolve()
      await freshAttempt
    })
    expect(result.current.context.validation.ready).toBe(true)
    expect(result.current.isSubmitting).toBe(false)

    await act(async () => {
      callbacks[0]?.reject(new Error('late obsolete failure'))
      await Promise.resolve()
    })
    expect(result.current.context.validation.ready).toBe(true)
    expect(result.current.errors.root?.server).toBeUndefined()
    expect(result.current.isSubmitting).toBe(false)
  })

  it('shows attachment size errors immediately and clears them when the file is removed', async () => {
    const { result } = renderHook(() => useComposerController('light'))
    await waitFor(() => expect(result.current.context.editor).toBeTruthy())
    const oversizedFile = new File(['x'], 'oversized.bin')
    Object.defineProperty(oversizedFile, 'size', { value: 10 * 1024 * 1024 + 1 })

    act(() => result.current.context.addAttachments([oversizedFile]))
    expect(result.current.draft.getFieldState('attachments.0.file').error?.message).toBeTruthy()
    expect(result.current.draft.getValues('attachments')).toHaveLength(1)

    const [attachment] = result.current.draft.getValues('attachments')
    act(() => result.current.context.removeAttachment(attachment.id))
    expect(result.current.draft.getFieldState('attachments.0.file').error).toBeUndefined()
    expect(result.current.draft.getValues('attachments')).toEqual([])
  })
})
