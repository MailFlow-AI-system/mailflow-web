import { act, renderHook, waitFor } from '@testing-library/react'
import { useFormState } from 'react-hook-form'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ComposerRootProps } from '../types/composer'
import { useComposerController } from './useComposerController'

const { loading, success, error, info, discardRemote } = vi.hoisted(() => ({
  loading: vi.fn(() => 'delivery-toast'),
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  discardRemote: vi.fn<
    (context: unknown, selection?: unknown) => Promise<{ retainedMessageIds: string[] }>
  >(async () => ({ retainedMessageIds: [] })),
}))
vi.mock('@mailflow/ui/components', async (original) => ({
  ...(await original<object>()),
  toast: { loading, success, error, info },
}))
vi.mock('../clients/discardEmail', () => ({ discardEmail: discardRemote }))
afterEach(() => {
  vi.clearAllMocks()
  discardRemote.mockResolvedValue({ retainedMessageIds: [] })
})

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
      recipientName: '',
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
    Object.defineProperty(oversizedFile, 'size', { value: 10 * 1_000_000 + 1 })

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

it('retains the recipient name on failure, changes retry identity after editing it, and clears it on success', async () => {
  const onSend = vi.fn().mockRejectedValueOnce(new Error('failed')).mockResolvedValue(undefined)
  const { result } = renderHook(() => useComposerController('light', undefined, onSend))
  await waitFor(() => expect(result.current.context.editor).toBeTruthy())
  act(() => {
    result.current.draft.setValue('to', 'ada@example.test')
    result.current.draft.setValue('recipientName', '  Ada Lovelace  ')
    result.current.draft.setValue('subject', 'Named message')
    result.current.context.editor?.commands.setContent('<p>Hello</p>')
  })
  await act(async () => result.current.context.validation.validate())
  expect(onSend.mock.calls[0]?.[0]).toMatchObject({ recipientName: 'Ada Lovelace' })
  expect(result.current.draft.getValues('recipientName')).toBe('  Ada Lovelace  ')
  act(() => result.current.draft.setValue('recipientName', 'Grace Hopper'))
  await act(async () => result.current.context.validation.validate())
  expect(onSend.mock.calls[1]?.[0]).toMatchObject({ recipientName: 'Grace Hopper' })
  expect(onSend.mock.calls[1]?.[1]).not.toBe(onSend.mock.calls[0]?.[1])
  expect(result.current.draft.getValues('recipientName')).toBe('')
})

it('owns upload progress and retry cache within the Composition and clears them on discard', async () => {
  const deliveries: unknown[] = []
  const onSend = vi.fn<NonNullable<ComposerRootProps['onSend']>>(
    async (_composition, _id, context) => {
      if (!context) throw new Error('Missing delivery context')
      deliveries.push(context)
      context.scope.current = {
        userId: 'owner',
        workspace: { id: 'workspace-a', name: 'Workspace A', slug: 'workspace-a', role: 'owner' },
      }
      context.uploads.set('file', {
        id: 'uploaded',
        uploadUrl: 'https://upload.example.test',
        expiresAt: '2026-12-01T12:00:00.000Z',
        headers: {},
        uploaded: true,
        clean: true,
      })
      context.onProgress?.({ phase: 'uploading', completed: 0, total: 1 })
      throw new Error('failure')
    },
  )
  const { result } = renderHook(() =>
    useComposerController('light', undefined, onSend, undefined, 'owner'),
  )
  const compose = async () => {
    await waitFor(() => expect(result.current.context.editor).toBeTruthy())
    act(() => {
      result.current.draft.setValue('to', 'ada@example.test')
      result.current.draft.setValue('subject', 'With upload')
      result.current.context.editor?.commands.setContent('<p>Hello</p>')
    })
  }
  await compose()
  await act(async () => result.current.context.validation.validate())
  expect(loading).toHaveBeenCalledWith('Salvando arquivo 1 de 1…', { id: 'delivery-toast' })
  expect(result.current.context.sendFailed).toBe(true)
  await act(async () => result.current.context.validation.validate())
  const first = deliveries[0] as {
    uploads: Map<string, unknown>
    scope: { current: unknown }
    userId: string
  }
  expect(first.userId).toBe('owner')
  expect(first.scope.current).toMatchObject({ userId: 'owner', workspace: { id: 'workspace-a' } })
  expect((deliveries[1] as typeof first).scope).toBe(first.scope)
  expect((deliveries[1] as { uploads: Map<string, unknown> }).uploads).toBe(first.uploads)
  expect(first.uploads.size).toBe(1)
  await act(async () => result.current.context.discard())
  expect(first.uploads.size).toBe(0)
  expect(first.scope.current).toBeNull()
  await compose()
  await act(async () => result.current.context.validation.validate())
  expect((deliveries[2] as { uploads: Map<string, unknown> }).uploads).not.toBe(first.uploads)
  expect((deliveries[2] as typeof first).scope).not.toBe(first.scope)
})

describe('Composition remote discard', () => {
  const membership = {
    userId: 'owner',
    workspace: {
      id: 'workspace-a',
      name: 'Workspace A',
      slug: 'workspace-a',
      role: 'owner' as const,
    },
  }
  async function failedComposition() {
    const attempts: string[] = []
    const onSend = vi.fn<NonNullable<ComposerRootProps['onSend']>>(
      async (_composition, id, context) => {
        if (!context) throw new Error('Missing context')
        attempts.push(id)
        context.scope.current = membership
        context.messageIds?.add(id)
        context.uploads.set('file', {
          id: '00000000-0000-4000-8000-000000000001',
          uploadUrl: 'https://r2.example.test',
          headers: {},
          expiresAt: '',
          uploaded: true,
          clean: true,
          localKey: 'file:local-file',
        })
        throw new Error('failed')
      },
    )
    const { result } = renderHook(() =>
      useComposerController('light', undefined, onSend, undefined, 'owner'),
    )
    await waitFor(() => expect(result.current.context.editor).toBeTruthy())
    act(() => {
      result.current.draft.setValue('to', 'ada@example.test')
      result.current.draft.setValue('subject', 'Original subject')
      result.current.draft.setValue('attachments', [
        { id: 'local-file', file: new File(['Hello'], 'hello.txt') },
      ])
      result.current.context.editor?.commands.setContent('<p>Hello</p>')
    })
    await act(async () => result.current.context.validation.validate())
    return { result, attempts, onSend }
  }

  it('keeps pre-send removal and discard local without calling cancellation', async () => {
    const { result } = renderHook(() => useComposerController('light'))
    act(() => result.current.context.addAttachments([new File(['Hello'], 'hello.txt')]))
    const [attachment] = result.current.draft.getValues('attachments')
    act(() => result.current.context.removeAttachment(attachment.id))
    act(() => result.current.context.discard())
    expect(discardRemote).not.toHaveBeenCalled()
  })

  it('notifies Core before clearing references, locks editing and preserves uncertain attachments', async () => {
    const { result, attempts } = await failedComposition()
    let resolve!: (value: { retainedMessageIds: string[] }) => void
    discardRemote.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    let discarding: void | Promise<void>
    act(() => {
      discarding = result.current.context.discard()
    })
    expect(discardRemote).toHaveBeenCalledTimes(1)
    const context = discardRemote.mock
      .calls[0]?.[0] as unknown as import('../types/EmailDelivery').EmailDeliveryContext
    expect(context.messageIds?.has(attempts[0])).toBe(true)
    expect(context.uploads.size).toBe(1)
    expect(result.current.draft.getValues('subject')).toBe('Original subject')
    expect(result.current.context.editor?.isEditable).toBe(false)
    await act(async () => {
      resolve({ retainedMessageIds: [attempts[0]] })
      await discarding
    })
    expect(result.current.draft.getValues('subject')).toBe('')
    expect(info).toHaveBeenCalledWith(expect.stringContaining('anexos foram preservados'))
  })

  it('retains the draft and retry references if remote discard fails', async () => {
    const { result } = await failedComposition()
    discardRemote.mockRejectedValueOnce(new Error('offline'))
    await act(async () => result.current.context.discard())
    expect(result.current.draft.getValues('subject')).toBe('Original subject')
    expect(result.current.draft.getValues('attachments')).toHaveLength(1)
    expect(error).toHaveBeenCalledWith(expect.stringContaining('rascunho foi mantido'))
    expect(result.current.context.editor?.isEditable).toBe(true)
  })

  it('blocks sending edited content when the earlier attempt may have been accepted', async () => {
    const { result, onSend, attempts } = await failedComposition()
    discardRemote.mockResolvedValueOnce({ retainedMessageIds: [attempts[0]] })
    act(() => result.current.draft.setValue('subject', 'Edited subject'))
    await act(async () => result.current.context.validation.validate())
    expect(onSend).toHaveBeenCalledTimes(1)
    expect(result.current.draft.getValues('subject')).toBe('Edited subject')
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('envio anterior'),
      expect.any(Object),
    )
  })

  it('releases a removed uploaded file without cancelling other message attempts', async () => {
    const { result } = await failedComposition()
    await act(async () => result.current.context.removeAttachment('local-file'))
    expect(discardRemote).toHaveBeenCalledWith(expect.any(Object), {
      messageIds: [],
      attachmentIds: ['00000000-0000-4000-8000-000000000001'],
    })
    expect(result.current.draft.getValues('attachments')).toEqual([])
  })

  it('cancels old safe attempts before composing a new identity after an edit', async () => {
    const { result, onSend, attempts } = await failedComposition()
    act(() => result.current.draft.setValue('subject', 'Edited subject'))
    await act(async () => result.current.context.validation.validate())
    expect(discardRemote).toHaveBeenCalledTimes(1)
    expect(onSend).toHaveBeenCalledTimes(2)
    expect(attempts[1]).not.toBe(attempts[0])
    expect(discardRemote.mock.invocationCallOrder[0]).toBeLessThan(
      onSend.mock.invocationCallOrder[1],
    )
  })
})

it('does not abandon a successful delivery or its associated uploads', async () => {
  const onSend = vi.fn<NonNullable<ComposerRootProps['onSend']>>(
    async (_composition, id, context) => {
      context?.messageIds?.add(id)
      context?.uploads.set('file', {
        id: '00000000-0000-4000-8000-000000000001',
        uploadUrl: 'https://r2.example.test',
        headers: {},
        expiresAt: '',
        uploaded: true,
        clean: true,
        sendAttempted: true,
      })
    },
  )
  const { result } = renderHook(() => useComposerController('light', undefined, onSend))
  await waitFor(() => expect(result.current.context.editor).toBeTruthy())
  act(() => {
    result.current.draft.setValue('to', 'ada@example.test')
    result.current.draft.setValue('subject', 'Successful message')
    result.current.context.editor?.commands.setContent('<p>Hello</p>')
  })
  await act(async () => result.current.context.validation.validate())
  expect(discardRemote).not.toHaveBeenCalled()
  expect(result.current.draft.getValues('subject')).toBe('')
})

it('releases an inline upload only after its final image occurrence is removed', async () => {
  const image = 'data:image/png;base64,aGVsbG8='
  const onSend = vi.fn<NonNullable<ComposerRootProps['onSend']>>(
    async (_composition, _id, context) => {
      if (!context) throw new Error('Missing context')
      context.scope.current = {
        userId: 'owner',
        workspace: { id: 'workspace-a', name: 'Workspace A', slug: 'workspace-a', role: 'owner' },
      }
      context.uploads.set('inline', {
        id: '00000000-0000-4000-8000-000000000001',
        uploadUrl: 'https://r2.example.test',
        headers: {},
        expiresAt: '',
        uploaded: true,
        clean: true,
        inlineSource: image,
      })
      throw new Error('upload complete, send not attempted')
    },
  )
  const { result } = renderHook(() => useComposerController('light', undefined, onSend))
  await waitFor(() => expect(result.current.context.editor).toBeTruthy())
  act(() => {
    result.current.draft.setValue('to', 'ada@example.test')
    result.current.draft.setValue('subject', 'Inline message')
    result.current.context.editor?.commands.setContent(
      `<p>Hello</p><img src="${image}"><img src="${image}">`,
    )
  })
  await act(async () => result.current.context.validation.validate())
  await act(async () =>
    result.current.context.editor?.commands.setContent(`<p>Hello</p><img src="${image}">`, {
      emitUpdate: true,
    }),
  )
  expect(discardRemote).not.toHaveBeenCalled()
  await act(async () =>
    result.current.context.editor?.commands.setContent('<p>Hello</p>', { emitUpdate: true }),
  )
  expect(discardRemote).toHaveBeenCalledWith(expect.any(Object), {
    messageIds: [],
    attachmentIds: ['00000000-0000-4000-8000-000000000001'],
  })
})

it('preserves associated inline references and delivery identity when image removal is undone', async () => {
  const image = 'data:image/png;base64,aGVsbG8='
  const body = `<p>Hello</p><img src="${image}">`
  const attempts: string[] = []
  let firstUploads: Map<string, unknown> | undefined
  const onSend = vi.fn<NonNullable<ComposerRootProps['onSend']>>(
    async (_composition, id, context) => {
      if (!context) throw new Error('Missing context')
      attempts.push(id)
      if (attempts.length === 2) {
        expect(context.uploads).toBe(firstUploads)
        expect(context.uploads.get('inline')).toMatchObject({
          id: '00000000-0000-4000-8000-000000000001',
          sendAttempted: true,
        })
        return
      }
      firstUploads = context.uploads
      context.messageIds?.add(id)
      context.scope.current = {
        userId: 'owner',
        workspace: { id: 'workspace-a', name: 'Workspace A', slug: 'workspace-a', role: 'owner' },
      }
      context.uploads.set('inline', {
        id: '00000000-0000-4000-8000-000000000001',
        uploadUrl: 'https://r2.example.test',
        headers: {},
        expiresAt: '',
        uploaded: true,
        clean: true,
        inlineSource: image,
        sendAttempted: true,
      })
      throw new Error('uncertain provider response')
    },
  )
  const { result } = renderHook(() => useComposerController('light', undefined, onSend))
  await waitFor(() => expect(result.current.context.editor).toBeTruthy())
  act(() => {
    result.current.draft.setValue('to', 'ada@example.test')
    result.current.draft.setValue('subject', 'Inline retry')
    result.current.context.editor?.commands.setContent(body)
  })
  await act(async () => result.current.context.validation.validate())
  await act(async () =>
    result.current.context.editor?.commands.setContent('<p>Hello</p>', { emitUpdate: true }),
  )
  expect(discardRemote).toHaveBeenCalledTimes(1)
  expect(firstUploads?.size).toBe(1)
  await act(async () =>
    result.current.context.editor?.commands.setContent(body, { emitUpdate: true }),
  )
  await act(async () => result.current.context.validation.validate())
  expect(attempts).toHaveLength(2)
  expect(attempts[1]).toBe(attempts[0])
  expect(discardRemote).toHaveBeenCalledTimes(1)
})

it('uses secure random bytes for HTTP workspace delivery IDs and preserves the ID across retry', async () => {
  const getRandomValues = vi.fn((bytes: Uint8Array) => bytes.fill(17))
  vi.stubGlobal('crypto', { getRandomValues })
  try {
    const onSend = vi
      .fn()
      .mockRejectedValueOnce(new Error('retry'))
      .mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useComposerController('light', undefined, onSend))
    await waitFor(() => expect(result.current.context.editor).toBeTruthy())
    act(() => {
      result.current.draft.setValue('to', 'ada@example.test')
      result.current.draft.setValue('subject', 'HTTP workspace send')
      result.current.context.editor?.commands.setContent('<p>Hello</p>')
    })
    await act(async () => result.current.context.validation.validate())
    expect(onSend).toHaveBeenCalledTimes(1)
    const id = onSend.mock.calls[0]?.[1]
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(getRandomValues).toHaveBeenCalled()
    await act(async () => result.current.context.validation.validate())
    expect(onSend).toHaveBeenCalledTimes(2)
    expect(onSend.mock.calls[1]?.[1]).toBe(id)
    expect(result.current.draft.getValues('subject')).toBe('')
  } finally {
    vi.unstubAllGlobals()
  }
})
