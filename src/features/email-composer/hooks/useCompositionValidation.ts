import type { Editor } from '@tiptap/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FieldPath, UseFormReturn } from 'react-hook-form'
import { validateComposition } from '../composerValidation'
import { getEditorBodySnapshot } from '../editor/bodyContent'
import type {
  CompositionValidationIssue,
  CompositionValidationResult,
  CompositionWarning,
} from '../types/CompositionValidation'
import type { ValidatedComposition } from '../types/composer'
import type { Attachment, DraftValues } from '../types/DraftValues'

const callbackFailureMessage = 'Não foi possível continuar com a mensagem. Tente novamente.'

type FocusField = CompositionValidationIssue['field']

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
  const [warnings, setWarnings] = useState<CompositionWarning[]>([])
  const [warningsOpen, setWarningsOpen] = useState(false)
  const [attachmentIssues, setAttachmentIssues] = useState<CompositionValidationIssue[]>([])
  const [ready, setReady] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const revisionRef = useRef(0)
  const pendingWarningRevisionRef = useRef<number | null>(null)
  const operationRef = useRef(0)
  const busyRef = useRef(false)
  const readyRef = useRef(false)

  const invalidate = useCallback(() => {
    revisionRef.current += 1
    readyRef.current = false
    setReady(false)
    setErrorMessage(null)
  }, [])

  const snapshot = useCallback(
    (attachmentsOverride?: Attachment[]) => {
      const values = draft.getValues()
      const bodySnapshot = editor
        ? getEditorBodySnapshot(editor)
        : { body: values.body, hasBodyContent: false }

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

  const setAttachmentErrorFields = useCallback(
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
      setAttachmentIssues(issues.filter((issue) => issue.field === 'attachments'))
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
      setAttachmentErrorFields(issues, false)
    },
    [draft, setAttachmentErrorFields],
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

  const acceptComposition = useCallback(
    async (result: Extract<CompositionValidationResult, { success: true }>) => {
      if (busyRef.current || readyRef.current) return
      busyRef.current = true
      const operation = ++operationRef.current
      const revision = revisionRef.current
      setSubmitting(true)
      setErrorMessage(null)

      try {
        await onValidated?.(makeValidatedComposition(result))
        if (operation === operationRef.current && revision === revisionRef.current) {
          readyRef.current = true
          setReady(true)
        }
      } catch {
        if (operation === operationRef.current) {
          readyRef.current = false
          setReady(false)
          setErrorMessage(callbackFailureMessage)
        }
      } finally {
        if (operation === operationRef.current) {
          busyRef.current = false
          setSubmitting(false)
        }
      }
    },
    [makeValidatedComposition, onValidated],
  )

  const validate = useCallback(async () => {
    if (busyRef.current || readyRef.current) return
    setErrorMessage(null)
    const result = evaluateCurrent()

    if (!result.success) {
      setWarnings(result.warnings)
      setWarningsOpen(false)
      pendingWarningRevisionRef.current = null
      focusFirstIssue(result.issues)
      return
    }

    if (result.warnings.length > 0) {
      setWarnings(result.warnings)
      setWarningsOpen(true)
      pendingWarningRevisionRef.current = revisionRef.current
      return
    }

    setWarnings([])
    setWarningsOpen(false)
    pendingWarningRevisionRef.current = null
    await acceptComposition(result)
  }, [acceptComposition, evaluateCurrent, focusFirstIssue])

  const confirmWarnings = useCallback(async () => {
    if (!warningsOpen || busyRef.current) return
    const result = evaluateCurrent()

    if (!result.success) {
      setWarningsOpen(false)
      pendingWarningRevisionRef.current = null
      focusFirstIssue(result.issues)
      return
    }

    const confirmationIsCurrent = pendingWarningRevisionRef.current === revisionRef.current
    if (result.warnings.length > 0 && !confirmationIsCurrent) {
      setWarnings(result.warnings)
      pendingWarningRevisionRef.current = revisionRef.current
      return
    }

    setWarningsOpen(false)
    pendingWarningRevisionRef.current = null
    if (result.warnings.length === 0) setWarnings([])
    await acceptComposition(result)
  }, [acceptComposition, evaluateCurrent, focusFirstIssue, warningsOpen])

  const cancelWarnings = useCallback(() => {
    setWarningsOpen(false)
    setWarnings([])
    pendingWarningRevisionRef.current = null
  }, [])

  const validateAttachments = useCallback(
    (attachments: Attachment[]) => {
      invalidate()
      const result = validateComposition(snapshot(attachments))
      setAttachmentErrorFields(result.success ? [] : result.issues)
    },
    [invalidate, setAttachmentErrorFields, snapshot],
  )

  const reset = useCallback(() => {
    revisionRef.current += 1
    operationRef.current += 1
    busyRef.current = false
    readyRef.current = false
    pendingWarningRevisionRef.current = null
    draft.clearErrors()
    setWarnings([])
    setWarningsOpen(false)
    setAttachmentIssues([])
    setReady(false)
    setSubmitting(false)
    setErrorMessage(null)
  }, [draft])

  useEffect(() => {
    const subscription = draft.watch((_values, { name }) => {
      invalidate()
      if (name !== 'to' && name !== 'cc' && name !== 'bcc') return
      const hadRecipientError = (['to', 'cc', 'bcc'] as const).some(
        (field) => draft.getFieldState(field).error,
      )
      if (hadRecipientError) {
        const result = validateComposition(snapshot())
        applyIssues(result.success ? [] : result.issues)
      }
    })
    return () => subscription.unsubscribe()
  }, [applyIssues, draft, invalidate, snapshot])

  return {
    attachmentIssues,
    cancelWarnings,
    confirmWarnings,
    errorMessage,
    invalidate,
    ready,
    reset,
    submitting,
    validate,
    validateAttachments,
    warnings,
    warningsOpen,
  }
}
