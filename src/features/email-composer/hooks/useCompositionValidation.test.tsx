import { act, renderHook, waitFor } from '@testing-library/react'
import type { Editor } from '@tiptap/react'
import { type ReactNode, StrictMode } from 'react'
import { useFormState } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import type { CompositionValidationIssue } from '../types/CompositionValidation'
import type { ValidatedComposition } from '../types/composer'
import type { Attachment } from '../types/DraftValues'
import { useCompositionValidation } from './useCompositionValidation'
import { emptyDraft, useDraftForm } from './useDraftForm'

function setup(
  options: {
    onValidated?: (composition: ValidatedComposition) => void | Promise<void>
    focusInvalidField?: (field: CompositionValidationIssue['field']) => void
    body?: 'text' | 'empty'
    strictMode?: boolean
  } = {},
) {
  const html = { current: options.body === 'empty' ? '<p></p>' : '<p>Body</p>' }
  const document = {
    current:
      options.body === 'empty'
        ? { type: 'doc', content: [{ type: 'paragraph' }] }
        : {
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Body' }] }],
          },
  }
  const editor = {
    getHTML: () => html.current,
    getJSON: () => document.current,
  } as unknown as Editor
  const useValidation = () => {
    const draft = useDraftForm()
    const formState = useFormState({ control: draft.control })
    const validation = useCompositionValidation({
      draft,
      editor,
      onValidated: options.onValidated,
      focusInvalidField: options.focusInvalidField,
    })
    return {
      draft,
      validation,
      errors: formState.errors,
      isSubmitting: formState.isSubmitting,
      isSubmitSuccessful: formState.isSubmitSuccessful,
    }
  }
  const StrictWrapper = ({ children }: { children: ReactNode }) => (
    <StrictMode>{children}</StrictMode>
  )
  const hook = renderHook(
    useValidation,
    options.strictMode ? { wrapper: StrictWrapper } : undefined,
  )
  act(() =>
    hook.result.current.draft.reset({
      ...emptyDraft,
      to: 'ada@example.test',
      subject: 'Update',
      body: html.current,
    }),
  )
  return { ...hook, html, document, editor }
}

function fileWithSize(name: string, size: number): File {
  const file = new File(['x'], name)
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('useCompositionValidation', () => {
  it('validates recipient lists from Cc or Bcc and preserves original File references', async () => {
    const onValidated = vi.fn()
    const { result } = setup({ onValidated })
    const attachment = {
      id: 'attachment-1',
      file: new File(['report'], 'report.pdf', { type: 'application/pdf' }),
    } satisfies Attachment

    act(() => {
      result.current.draft.setValue('to', '')
      result.current.draft.setValue('cc', 'grace@example.test; ada@example.test')
      result.current.draft.setValue('bcc', 'linus@example.test')
      result.current.draft.setValue('attachments', [attachment])
    })
    await act(async () => result.current.validation.validate())

    expect(onValidated).toHaveBeenCalledTimes(1)
    expect(onValidated).toHaveBeenCalledWith({
      to: [],
      cc: ['grace@example.test', 'ada@example.test'],
      bcc: ['linus@example.test'],
      subject: 'Update',
      body: '<p>Body</p>',
      attachments: [attachment],
    })
    expect(onValidated.mock.calls[0]?.[0].attachments[0]?.file).toBe(attachment.file)
    expect(result.current.validation.ready).toBe(true)
    await act(async () => result.current.validation.validate())
    expect(onValidated).toHaveBeenCalledTimes(1)
  })

  it('keeps warning cancellation safe and calls back only after explicit acceptance', async () => {
    const onValidated = vi.fn()
    const { result } = setup({ onValidated, body: 'empty' })
    act(() => result.current.draft.setValue('subject', ''))
    await act(async () => result.current.validation.validate())

    expect(result.current.validation.warnings).toHaveLength(2)
    expect(result.current.isSubmitSuccessful).toBe(true)
    expect(result.current.validation.ready).toBe(false)
    act(() => result.current.validation.cancelWarnings())
    expect(onValidated).not.toHaveBeenCalled()
    expect(result.current.validation.ready).toBe(false)

    await act(async () => result.current.validation.validate())
    await act(async () => result.current.validation.confirmWarnings())

    expect(onValidated).toHaveBeenCalledTimes(1)
    expect(result.current.validation.ready).toBe(true)
  })

  it('revalidates a changed snapshot and requires a fresh confirmation for changed warnings', async () => {
    const onValidated = vi.fn()
    const { result, html, document } = setup({ onValidated, body: 'empty' })
    act(() => result.current.draft.setValue('subject', ''))
    await act(async () => result.current.validation.validate())

    html.current = '<p>Now filled</p>'
    document.current = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Now filled' }] }],
    }
    act(() => {
      result.current.draft.setValue('body', html.current)
      result.current.validation.invalidate()
    })
    await act(async () => result.current.validation.confirmWarnings())

    expect(onValidated).not.toHaveBeenCalled()
    expect(result.current.validation.warnings.map(({ code }) => code)).toEqual(['empty-subject'])
    await act(async () => result.current.validation.confirmWarnings())
    expect(onValidated).toHaveBeenCalledTimes(1)
    expect(onValidated).toHaveBeenCalledWith(expect.objectContaining({ body: '<p>Now filled</p>' }))
  })

  it('cancels a warning confirmation before the async resolver can invoke the callback', async () => {
    const onValidated = vi.fn()
    const { result } = setup({ onValidated, body: 'empty' })
    await act(async () => result.current.validation.validate())
    expect(result.current.validation.warningsOpen).toBe(true)

    let confirmation!: Promise<void>
    act(() => {
      confirmation = result.current.validation.confirmWarnings()
      result.current.validation.cancelWarnings()
    })
    await act(async () => confirmation)

    expect(onValidated).not.toHaveBeenCalled()
    expect(result.current.validation.ready).toBe(false)
    expect(result.current.validation.warningsOpen).toBe(false)
  })

  it('guards duplicate async callbacks and does not mark failed callbacks ready', async () => {
    let rejectCallback: (reason?: unknown) => void = () => {}
    const onValidated = vi.fn(
      () => new Promise<void>((_resolve, reject) => (rejectCallback = reject)),
    )
    const { result } = setup({ onValidated })
    act(() => result.current.draft.setValue('cc', 'ada@example.test'))

    let firstAttempt!: Promise<void>
    act(() => {
      firstAttempt = result.current.validation.validate()
    })
    await act(async () => result.current.validation.validate())
    await waitFor(() => expect(onValidated).toHaveBeenCalledTimes(1))
    expect(onValidated).toHaveBeenCalledTimes(1)
    expect(result.current.isSubmitting).toBe(true)

    await act(async () => {
      rejectCallback(new Error('provider detail'))
      await firstAttempt
    })
    expect(result.current.validation.ready).toBe(false)
    expect(result.current.errors.root?.server?.message).toMatch(/tente novamente/i)
    expect(result.current.draft.getValues('cc')).toBe('ada@example.test')
    onValidated.mockImplementationOnce(() => Promise.resolve())
    await act(async () => result.current.validation.validate())
    expect(onValidated).toHaveBeenCalledTimes(2)
    expect(result.current.validation.ready).toBe(true)
  })

  it('does not mark a changed draft ready when an earlier async callback completes', async () => {
    let resolveCallback: () => void = () => {}
    const onValidated = vi.fn(() => new Promise<void>((resolve) => (resolveCallback = resolve)))
    const { result, html, document } = setup({ onValidated })
    act(() => result.current.draft.setValue('cc', 'grace@example.test'))

    let attempt!: Promise<void>
    act(() => {
      attempt = result.current.validation.validate()
    })
    await waitFor(() => expect(onValidated).toHaveBeenCalledTimes(1))
    expect(result.current.isSubmitting).toBe(true)
    html.current = '<p>Changed body</p>'
    document.current = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Changed body' }] }],
    }
    act(() => {
      result.current.draft.setValue('body', html.current)
      result.current.validation.invalidate()
    })
    await act(async () => {
      resolveCallback()
      await attempt
    })

    expect(result.current.validation.ready).toBe(false)
    expect(onValidated).toHaveBeenCalledTimes(1)
  })

  it('ignores callback rejection after the draft changes while submission is pending', async () => {
    let rejectCallback: (reason?: unknown) => void = () => {}
    const onValidated = vi.fn(
      () => new Promise<void>((_resolve, reject) => (rejectCallback = reject)),
    )
    const { result } = setup({ onValidated })
    act(() => result.current.draft.setValue('cc', 'grace@example.test'))

    let attempt!: Promise<void>
    act(() => {
      attempt = result.current.validation.validate()
    })
    await waitFor(() => expect(onValidated).toHaveBeenCalledTimes(1))
    expect(result.current.isSubmitting).toBe(true)
    act(() => result.current.draft.setValue('subject', 'Changed while pending'))
    await act(async () => {
      rejectCallback(new Error('stale provider detail'))
      await attempt
    })

    expect(result.current.validation.ready).toBe(false)
    expect(result.current.errors.root?.server).toBeUndefined()
  })

  it('focuses the first blocking field, validates attachments after changes, and resets readiness', async () => {
    const focusInvalidField = vi.fn()
    const onValidated = vi.fn()
    const { result } = setup({ onValidated, focusInvalidField })
    const tooLarge = {
      id: 'large',
      file: fileWithSize('large.bin', 10 * 1024 * 1024 + 1),
    } satisfies Attachment

    act(() => {
      result.current.draft.setValue('cc', 'bad-address')
      result.current.draft.setValue('attachments', [tooLarge])
    })
    act(() => result.current.validation.validateAttachments([tooLarge]))
    await act(async () => result.current.validation.validate())

    expect(onValidated).not.toHaveBeenCalled()
    expect(focusInvalidField).toHaveBeenCalledWith('cc')
    expect(result.current.draft.getFieldState('cc').error?.message).toBeTruthy()
    expect(result.current.draft.getFieldState('attachments.0.file').error?.message).toBeTruthy()

    act(() => result.current.draft.setValue('cc', 'grace@example.test'))
    expect(result.current.draft.getFieldState('cc').error).toBeUndefined()

    act(() => result.current.draft.setValue('attachments', []))
    act(() => result.current.validation.validateAttachments([]))
    expect(result.current.draft.getFieldState('attachments.0.file').error).toBeUndefined()

    act(() => result.current.draft.setValue('cc', 'grace@example.test'))
    await act(async () => result.current.validation.validate())
    expect(result.current.validation.ready).toBe(true)
    act(() => result.current.validation.invalidate())
    expect(result.current.validation.ready).toBe(false)
    act(() => result.current.validation.reset())
    expect(result.current.validation.warningsOpen).toBe(false)
    expect(result.current.validation.ready).toBe(false)
  })

  it('does not call back while any recipient list is invalid or all are empty', async () => {
    const focusInvalidField = vi.fn()
    const onValidated = vi.fn()
    const { result } = setup({ onValidated, focusInvalidField })
    act(() => {
      result.current.draft.setValue('to', '')
      result.current.draft.setValue('cc', '')
      result.current.draft.setValue('bcc', '')
    })

    await act(async () => result.current.validation.validate())

    expect(onValidated).not.toHaveBeenCalled()
    expect(focusInvalidField).toHaveBeenCalledWith('to')
    expect(result.current.draft.getFieldState('to').error?.message).toBeTruthy()
  })

  it('subscribes once under StrictMode and invalidates on a subsequent field edit', async () => {
    const onValidated = vi.fn()
    const { result } = setup({ onValidated, strictMode: true })

    await act(async () => result.current.validation.validate())
    expect(onValidated).toHaveBeenCalledTimes(1)
    expect(result.current.validation.ready).toBe(true)

    act(() => result.current.draft.setValue('subject', 'Changed'))
    expect(result.current.validation.ready).toBe(false)
    await act(async () => result.current.validation.validate())
    expect(onValidated).toHaveBeenCalledTimes(2)
    expect(result.current.validation.ready).toBe(true)
  })
})
