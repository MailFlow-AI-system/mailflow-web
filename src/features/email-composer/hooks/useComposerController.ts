import type { WindowOpenChangeDetails, WindowState } from '@mailflow/ui/components'
import { useEditor } from '@tiptap/react'
import { cn } from 'cn'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { draftFieldsSignature, emptyBody, emptyFields } from '../draft'
import { getEditorBodySnapshot } from '../editor/bodyContent'
import { composerExtensions } from '../editor/extensions'
import type { ComposerController, DraftFields, ValidatedComposition } from '../types/composer'
import type { DraftValues } from '../types/DraftValues'
import { useCompositionValidation } from './useCompositionValidation'
import { emptyDraft, useDraftForm } from './useDraftForm'

function recipientFields(values: DraftValues): DraftFields {
  return { to: values.to, cc: values.cc, bcc: values.bcc, subject: values.subject }
}

export function useComposerController(
  theme: 'dark' | 'light',
  onValidated?: (composition: ValidatedComposition) => void | Promise<void>,
): ComposerController {
  const draft = useDraftForm()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<WindowState>('normal')
  const [saved, setSaved] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [bodyDirty, setBodyDirty] = useState(false)
  const [showCc, setShowCc] = useState(false)
  const [focusRequest, setFocusRequest] = useState<{
    field: 'to' | 'cc' | 'bcc' | 'attachments'
    sequence: number
  } | null>(null)
  const baselineFieldsRef = useRef(draftFieldsSignature(emptyFields, []))
  const baselineBodyRef = useRef(emptyBody)
  const bodyDirtyRef = useRef(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const recipientRef = useRef<HTMLInputElement>(null)
  const ccRef = useRef<HTMLInputElement>(null)
  const bccRef = useRef<HTMLInputElement>(null)
  const attachmentTriggerRef = useRef<HTMLButtonElement>(null)
  const attachmentErrorId = useId()
  const sessionRef = useRef(0)
  const [session, setSession] = useState(0)
  const editorRef = useRef<ReturnType<typeof useEditor>>(null)
  const invalidateValidationRef = useRef<() => void>(() => {})
  const setDraftBodyRef = useRef(draft.setValue)
  setDraftBodyRef.current = draft.setValue
  const markBodyDirty = useCallback((dirty: boolean) => {
    if (bodyDirtyRef.current === dirty) return
    bodyDirtyRef.current = dirty
    setBodyDirty(dirty)
  }, [])
  const editor = useEditor(
    {
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
      extensions: composerExtensions,
      content: emptyBody,
      editorProps: {
        attributes: {
          role: 'textbox',
          'aria-label': 'Corpo da mensagem',
          'aria-multiline': 'true',
          class: cn(
            'min-h-[280px] wrap-anywhere p-2 text-sm outline-none',
            '[&_p]:m-0 [&_p+p]:mt-2',
            '[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6',
            '[&_strong]:font-bold [&_em]:italic [&_u]:underline',
            '[&_a]:text-primary [&_a]:underline',
            '[&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-md',
            '[&_p.is-editor-empty]:before:float-left',
            '[&_p.is-editor-empty]:before:h-0',
            '[&_p.is-editor-empty]:before:pointer-events-none',
            '[&_p.is-editor-empty]:before:text-foreground',
            '[&_p.is-editor-empty]:before:content-[attr(data-placeholder)]',
          ),
        },
      },
      onUpdate: ({ transaction }) => {
        if (!transaction.docChanged) return
        markBodyDirty(true)
        const currentEditor = editorRef.current
        if (currentEditor) {
          const bodySnapshot = getEditorBodySnapshot(currentEditor)
          setDraftBodyRef.current('body', bodySnapshot.body, { shouldDirty: true })
        }
        invalidateValidationRef.current()
      },
    },
    [session, markBodyDirty],
  )
  editorRef.current = editor

  const focusInvalidField = useCallback((field: 'to' | 'cc' | 'bcc' | 'attachments') => {
    if (field === 'cc' || field === 'bcc') setShowCc(true)
    setFocusRequest((previous) => ({ field, sequence: (previous?.sequence ?? 0) + 1 }))
  }, [])
  const validation = useCompositionValidation({ draft, editor, onValidated, focusInvalidField })
  invalidateValidationRef.current = validation.invalidate

  useEffect(() => {
    if (!focusRequest) return
    const fieldRef =
      focusRequest.field === 'to'
        ? recipientRef
        : focusRequest.field === 'cc'
          ? ccRef
          : focusRequest.field === 'bcc'
            ? bccRef
            : attachmentTriggerRef
    fieldRef.current?.focus()
  }, [focusRequest])

  const readFieldsSignature = useCallback(() => {
    const current = draft.getValues()
    return draftFieldsSignature(recipientFields(current), current.attachments)
  }, [draft])

  const isDirty = useCallback(() => {
    const body = editorRef.current?.getHTML() ?? emptyBody
    return readFieldsSignature() !== baselineFieldsRef.current || body !== baselineBodyRef.current
  }, [readFieldsSignature])

  const discard = useCallback(() => {
    sessionRef.current += 1
    setSession((previous) => previous + 1)
    editorRef.current?.commands.clearContent()
    draft.reset(emptyDraft)
    baselineFieldsRef.current = draftFieldsSignature(emptyFields, [])
    baselineBodyRef.current = emptyBody
    markBodyDirty(false)
    setSaved(false)
    setConfirm(false)
    setOpen(false)
    setShowCc(false)
    setFocusRequest(null)
    validation.reset()
  }, [draft, markBodyDirty, validation.reset])

  const saveDraft = useCallback(() => {
    baselineFieldsRef.current = readFieldsSignature()
    baselineBodyRef.current = editorRef.current?.getHTML() ?? emptyBody
    markBodyDirty(false)
    setSaved(true)
  }, [markBodyDirty, readFieldsSignature])

  const addAttachments = useCallback(
    (files: File[]) => {
      if (files.length === 0) return
      const attachments = [
        ...draft.getValues('attachments'),
        ...files.map((file) => ({ id: crypto.randomUUID(), file })),
      ]
      draft.setValue('attachments', attachments)
      validation.validateAttachments(attachments)
    },
    [draft, validation.validateAttachments],
  )

  const removeAttachment = useCallback(
    (id: string) => {
      const attachments = draft.getValues('attachments').filter((item) => item.id !== id)
      draft.setValue('attachments', attachments)
      validation.validateAttachments(attachments)
    },
    [draft, validation.validateAttachments],
  )

  return {
    draft,
    context: {
      sessionRef,
      revision: session,
      editor,
      addAttachments,
      removeAttachment,
      bodyDirty,
      baselineFieldsRef,
      saved,
      saveDraft,
      confirm,
      setConfirm,
      discard,
      state,
      theme,
      triggerRef,
      recipientRef,
      ccRef,
      bccRef,
      attachmentTriggerRef,
      attachmentErrorId,
      showCc,
      setShowCc,
      validation,
    },
    open,
    state,
    setState,
    onOpenChange: (next: boolean, details: WindowOpenChangeDetails) => {
      if (!next && isDirty()) {
        details.cancel()
        setConfirm(true)
        return
      }
      setOpen(next)
    },
  }
}
