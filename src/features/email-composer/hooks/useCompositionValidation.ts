import type { Editor } from '@tiptap/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FieldPath, UseFormReturn } from 'react-hook-form'
import { validateComposition } from '../composerValidation'
import { COMPOSITION_VALIDATION_MESSAGES } from '../composerValidationConstants'
import { getEditorBodySnapshot } from '../editor/bodyContent'
import type {
  CompositionValidationIssue,
  CompositionValidationResult,
  CompositionWarning,
} from '../types/CompositionValidation'
import type { ValidatedComposition } from '../types/composer'
import type { Attachment, DraftValues } from '../types/DraftValues'

type FocusField = CompositionValidationIssue['field']
type PendingWarnings = { warnings: CompositionWarning[]; revision: number }
type CallbackOutcome = 'completed' | 'failed' | 'cancelled'

type UseCompositionValidationOptions = {
  draft: UseFormReturn<DraftValues>
  editor: Editor | null
  onValidated?: (composition: ValidatedComposition) => void | Promise<void>
  focusInvalidField?: (field: FocusField) => void
}

function isRecipientField(field: FocusField): field is 'to' | 'cc' | 'bcc' {
  return field === 'to' || field === 'cc' || field === 'bcc'
}

export function useCompositionValidation({
  draft,
  editor,
  onValidated,
  focusInvalidField,
}: UseCompositionValidationOptions) {
  const [pendingWarnings, setPendingWarnings] = useState<PendingWarnings | null>(null)
  const [ready, setReady] = useState(false)
  const revisionRef = useRef(0)
  const operationRef = useRef(0)
  const busyRef = useRef(false)
  const readyRef = useRef(false)
  const activeCancelRef = useRef<(() => void) | null>(null)
  const submissionCleanupRef = useRef<Promise<void>>(Promise.resolve())

  const invalidate = useCallback(() => {
    revisionRef.current += 1
    readyRef.current = false
    setReady(false)
    draft.clearErrors('root.server')
  }, [draft])

  const snapshot = useCallback(
    (attachmentsOverride?: Attachment[]) => {
      const values = draft.getValues()
      const bodySnapshot = editor
        ? getEditorBodySnapshot(editor)
        : { body: values.body, hasBodyContent: false }

      if (bodySnapshot.body !== values.body) {
        draft.setValue('body', bodySnapshot.body, { shouldDirty: true })
      }

      return {
        to: values.to,
        cc: values.cc,
        bcc: values.bcc,
        subject: values.subject,
        body: bodySnapshot.body,
        hasBodyContent: bodySnapshot.hasBodyContent,
        attachments: (attachmentsOverride ?? values.attachments).map(({ id, file }) => ({
          id,
          name: file.name,
          size: file.size,
        })),
      }
    },
    [draft, editor],
  )

  const setAttachmentErrors = useCallback(
    (issues: CompositionValidationIssue[], clear = true) => {
      if (clear) draft.clearErrors('attachments')
      const seen = new Set<string>()

      for (const issue of issues) {
        if (issue.field !== 'attachments') continue
        const path =
          typeof issue.attachmentIndex === 'number'
            ? (`attachments.${issue.attachmentIndex}.file` as FieldPath<DraftValues>)
            : ('attachments.root' as FieldPath<DraftValues>)
        if (seen.has(path)) continue
        seen.add(path)
        draft.setError(path, { type: 'composition', message: issue.message })
      }
    },
    [draft],
  )

  const applyIssues = useCallback(
    (issues: CompositionValidationIssue[]) => {
      draft.clearErrors()
      const seen = new Set<string>()
      for (const issue of issues) {
        if (issue.field === 'attachments' || !isRecipientField(issue.field)) continue
        if (seen.has(issue.field)) continue
        seen.add(issue.field)
        draft.setError(issue.field, { type: 'composition', message: issue.message })
      }
      setAttachmentErrors(issues, false)
    },
    [draft, setAttachmentErrors],
  )

  const evaluateCurrent = useCallback((): CompositionValidationResult => {
    const result = validateComposition(snapshot())
    applyIssues(result.success ? [] : result.issues)
    return result
  }, [applyIssues, snapshot])

  const focusFirstIssue = useCallback(
    (issues: CompositionValidationIssue[]) => {
      const first = issues[0]
      if (first) focusInvalidField?.(first.field)
    },
    [focusInvalidField],
  )

  const makeValidatedComposition = useCallback(
    (result: Extract<CompositionValidationResult, { success: true }>): ValidatedComposition => {
      const attachmentsById = new Map(draft.getValues('attachments').map((item) => [item.id, item]))
      return {
        ...result.composition,
        attachments: result.composition.attachments.flatMap((item) => {
          const original = attachmentsById.get(item.id)
          return original ? [original] : []
        }),
      }
    },
    [draft],
  )

  const submitComposition = useCallback(
    (confirmedRevision?: number): Promise<void> => {
      if (busyRef.current || readyRef.current) return Promise.resolve()

      busyRef.current = true
      const operation = ++operationRef.current
      const cleanupBeforeAttempt = submissionCleanupRef.current
      let submissionRevision: number | null = null

      const run = async () => {
        await cleanupBeforeAttempt
        if (operation !== operationRef.current) return

        snapshot()
        const revision = revisionRef.current
        submissionRevision = revision
        let cancel!: () => void
        const cancelled = new Promise<CallbackOutcome>((resolve) => {
          cancel = () => resolve('cancelled')
        })
        activeCancelRef.current = cancel
        const isCurrent = () =>
          operation === operationRef.current && revision === revisionRef.current

        const onValid = async () => {
          if (!isCurrent()) return
          const result = evaluateCurrent()

          if (!result.success) {
            if (confirmedRevision !== undefined) setPendingWarnings(null)
            focusFirstIssue(result.issues)
            return
          }

          if (result.warnings.length > 0 && confirmedRevision !== revision) {
            setPendingWarnings({ warnings: result.warnings, revision })
            return
          }

          setPendingWarnings(null)
          draft.clearErrors('root.server')
          let callback: Promise<void>
          try {
            callback = Promise.resolve(onValidated?.(makeValidatedComposition(result)))
          } catch {
            callback = Promise.reject(new Error('Composition continuation failed'))
          }
          const outcome = await Promise.race([
            callback.then(
              () => 'completed' as const,
              () => 'failed' as const,
            ),
            cancelled,
          ])

          if (outcome === 'cancelled' || !isCurrent()) return
          if (outcome === 'failed') {
            draft.setError('root.server', {
              type: 'server',
              message: COMPOSITION_VALIDATION_MESSAGES.continuationFailed,
            })
            return
          }

          readyRef.current = true
          setReady(true)
        }

        const onInvalid = () => {
          if (!isCurrent()) return
          const result = evaluateCurrent()
          if (confirmedRevision !== undefined) setPendingWarnings(null)
          if (!result.success) focusFirstIssue(result.issues)
        }

        const submission = draft.handleSubmit(onValid, onInvalid)()
        const cleanup = submission.then(
          () => undefined,
          () => undefined,
        )
        submissionCleanupRef.current = cleanup
        try {
          await submission
        } catch {
          if (isCurrent()) {
            draft.setError('root.server', {
              type: 'server',
              message: COMPOSITION_VALIDATION_MESSAGES.continuationFailed,
            })
          }
        } finally {
          if (activeCancelRef.current === cancel) activeCancelRef.current = null
        }
      }

      const attempt = run().then(
        () => undefined,
        () => {
          if (operation === operationRef.current && submissionRevision === revisionRef.current) {
            draft.setError('root.server', {
              type: 'server',
              message: COMPOSITION_VALIDATION_MESSAGES.continuationFailed,
            })
          }
        },
      )
      return attempt.finally(() => {
        if (operation === operationRef.current) busyRef.current = false
      })
    },
    [draft, evaluateCurrent, focusFirstIssue, makeValidatedComposition, onValidated, snapshot],
  )

  const validate = useCallback(() => submitComposition(), [submitComposition])

  const confirmWarnings = useCallback(() => {
    if (!pendingWarnings) return Promise.resolve()
    return submitComposition(pendingWarnings.revision)
  }, [pendingWarnings, submitComposition])

  const cancelWarnings = useCallback(() => {
    operationRef.current += 1
    busyRef.current = false
    activeCancelRef.current?.()
    activeCancelRef.current = null
    setPendingWarnings(null)
  }, [])

  const validateAttachments = useCallback(
    (attachments: Attachment[]) => {
      invalidate()
      const result = validateComposition(snapshot(attachments))
      setAttachmentErrors(result.success ? [] : result.issues)
    },
    [invalidate, setAttachmentErrors, snapshot],
  )

  const reset = useCallback(() => {
    revisionRef.current += 1
    operationRef.current += 1
    busyRef.current = false
    readyRef.current = false
    activeCancelRef.current?.()
    activeCancelRef.current = null
    draft.clearErrors()
    setPendingWarnings(null)
    setReady(false)
  }, [draft])

  useEffect(() => {
    const unsubscribe = draft.subscribe({
      formState: { values: true },
      callback: () => {
        invalidate()
        const hasValidationErrors = (['to', 'cc', 'bcc', 'attachments'] as const).some(
          (field) => draft.getFieldState(field).error,
        )
        if (hasValidationErrors) {
          const result = validateComposition(snapshot())
          applyIssues(result.success ? [] : result.issues)
        }
      },
    })
    return unsubscribe
  }, [applyIssues, draft, invalidate, snapshot])

  return {
    cancelWarnings,
    confirmWarnings,
    invalidate,
    ready,
    reset,
    validate,
    validateAttachments,
    warnings: pendingWarnings?.warnings ?? [],
    warningsOpen: pendingWarnings !== null,
  }
}
