import { act, renderHook, waitFor } from '@testing-library/react'
import { useFormState } from 'react-hook-form'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useComposerController } from './useComposerController'

const { loading, success, error } = vi.hoisted(() => ({
  loading: vi.fn(() => 'delivery-toast'),
  success: vi.fn(),
  error: vi.fn(),
}))
vi.mock('@mailflow/ui/components', async (original) => ({
  ...(await original<object>()),
  toast: { loading, success, error },
}))
afterEach(() => vi.clearAllMocks())

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

describe('useComposerController email delivery', () => {
  it('locks editing and closing during send, prevents duplicates, then clears and closes after success', async () => {
    let resolve!: () => void
    const onSend = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done
        }),
    )
    const onSent = vi.fn()
    const { result } = renderHook(() => useComposerController('light', undefined, onSend, onSent))
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
    await waitFor(() => expect(onSend).toHaveBeenCalledTimes(1))
    expect(loading).toHaveBeenCalledWith('Enviando e-mail…')
    expect(onSent).not.toHaveBeenCalled()
    expect(result.current.context.sending).toBe(true)
    expect(result.current.context.editor?.isEditable).toBe(false)
    const details = { cancel: vi.fn() } as never
    act(() => result.current.onOpenChange(false, details))
    expect((details as { cancel: () => void }).cancel).toHaveBeenCalled()
    act(() => result.current.context.discard())
    expect(result.current.draft.getValues('subject')).toBe('Update')
    await act(async () => result.current.context.validation.validate())
    expect(onSend).toHaveBeenCalledTimes(1)
    await act(async () => {
      resolve()
      await attempt
    })
    expect(result.current.draft.getValues('to')).toBe('')
    expect(result.current.draft.getValues('attachments')).toEqual([])
    expect(result.current.open).toBe(false)
    expect(result.current.context.sending).toBe(false)
    expect(success).toHaveBeenCalledWith('E-mail enviado com sucesso.', { id: 'delivery-toast' })
    expect(onSent).toHaveBeenCalledTimes(1)
  })
  it('retains recipients, content and attachments on failure and allows retry', async () => {
    const onSend = vi.fn().mockRejectedValueOnce(new Error('failed')).mockResolvedValue(undefined)
    const { result } = renderHook(() => useComposerController('light', undefined, onSend))
    await waitFor(() => expect(result.current.context.editor).toBeTruthy())
    act(() => {
      result.current.draft.setValue('to', 'ada@example.test')
      result.current.draft.setValue('subject', 'Update')
      result.current.context.editor?.commands.insertContent('Body')
      result.current.context.addAttachments([new File(['Hello'], 'hello.txt')])
    })
    await act(async () => result.current.context.validation.validate())
    expect(result.current.context.sendFailed).toBe(true)
    expect(error).toHaveBeenCalledWith(expect.stringContaining('mantida'), { id: 'delivery-toast' })
    expect(result.current.draft.getValues('to')).toBe('ada@example.test')
    expect(result.current.draft.getValues('attachments')).toHaveLength(1)
    expect(result.current.context.editor?.isEditable).toBe(true)
    await act(async () => result.current.context.validation.validate())
    expect(onSend).toHaveBeenCalledTimes(2)
    expect(onSend.mock.calls[0]?.[1]).toEqual(expect.any(String))
    expect(onSend.mock.calls[1]?.[1]).toBe(onSend.mock.calls[0]?.[1])
    expect(result.current.draft.getValues('to')).toBe('')
  })
})

describe('Composition delivery identity', () => {
  it.each(['discard', 'edit', 'success'] as const)(
    'starts a new delivery after %s, even when content is reused',
    async (transition) => {
      const onSend = vi.fn().mockImplementation(async (_composition: unknown, _id: string) => {
        if (transition !== 'success') throw new Error('uncertain delivery')
      })
      const { result } = renderHook(() => useComposerController('light', undefined, onSend))
      const compose = async () => {
        await waitFor(() => expect(result.current.context.editor).toBeTruthy())
        act(() => {
          result.current.draft.setValue('to', 'ada@example.test')
          result.current.draft.setValue('subject', 'Same composition')
          result.current.context.editor?.commands.setContent('<p>Body</p>')
        })
      }
      await compose()
      await act(async () => result.current.context.validation.validate())
      const firstId = onSend.mock.calls[0]?.[1]
      expect(firstId).toEqual(expect.any(String))
      if (transition === 'discard') act(() => result.current.context.discard())
      if (transition === 'edit') {
        act(() => result.current.draft.setValue('subject', 'Edited composition'))
      } else {
        await compose()
      }
      await act(async () => result.current.context.validation.validate())
      expect(onSend).toHaveBeenCalledTimes(2)
      expect(onSend.mock.calls[1]?.[1]).not.toBe(firstId)
    },
  )
})
