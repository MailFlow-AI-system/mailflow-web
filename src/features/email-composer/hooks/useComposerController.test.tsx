import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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
    await waitFor(() => expect(result.current.context.bodyDirty).toBe(true))
    await act(async () => result.current.context.validation.validate())
    expect(result.current.context.validation.ready).toBe(true)

    act(() => result.current.context.editor?.commands.insertContent(' updated'))
    expect(result.current.context.bodyDirty).toBe(true)
    await waitFor(() => expect(result.current.context.validation.ready).toBe(false))

    await act(async () => result.current.context.validation.validate())
    expect(result.current.context.validation.ready).toBe(true)
    act(() => result.current.draft.setValue('subject', 'Edited subject'))
    await waitFor(() => expect(result.current.context.validation.ready).toBe(false))
  })

  it('resets validation when discarding a draft session', async () => {
    let resolveCallback: () => void = () => {}
    const onValidated = () => new Promise<void>((resolve) => (resolveCallback = resolve))
    const { result } = renderHook(() => useComposerController('light', onValidated))
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
    expect(result.current.context.validation.submitting).toBe(true)

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
    await act(async () => {
      resolveCallback()
      await attempt
    })
    expect(result.current.context.validation.ready).toBe(false)
  })

  it('shows attachment size errors immediately and clears them when the file is removed', async () => {
    const { result } = renderHook(() => useComposerController('light'))
    await waitFor(() => expect(result.current.context.editor).toBeTruthy())
    const oversizedFile = {
      name: 'oversized.bin',
      size: 10 * 1024 * 1024 + 1,
    } as File

    act(() => result.current.context.addAttachments([oversizedFile]))
    expect(result.current.context.validation.attachmentIssues).toHaveLength(1)
    expect(result.current.draft.getValues('attachments')).toHaveLength(1)

    const [attachment] = result.current.draft.getValues('attachments')
    act(() => result.current.context.removeAttachment(attachment.id))
    expect(result.current.context.validation.attachmentIssues).toEqual([])
    expect(result.current.draft.getValues('attachments')).toEqual([])
  })
})
