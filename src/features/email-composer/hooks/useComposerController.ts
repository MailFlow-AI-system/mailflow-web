import { toast, type WindowOpenChangeDetails, type WindowState } from '@mailflow/ui/components'
import { useEditor } from '@tiptap/react'
import { cn } from 'cn'
import { useCallback, useId, useRef, useState } from 'react'
import { discardEmail } from '../clients/discardEmail'
import { draftSignature, emptyBody, emptyFields } from '../draft'
import { getEditorBodySnapshot } from '../editor/bodyContent'
import { composerExtensions } from '../editor/extensions'
import type {
  ComposerController,
  ComposerRootProps,
  DraftFields,
  ValidatedComposition,
} from '../types/composer'
import type { DraftValues } from '../types/DraftValues'
import { type EmailDeliveryContext, EmailDeliveryError } from '../types/EmailDelivery'
import { createAttachmentId } from '../utils/attachmentId'
import { useCompositionValidation } from './useCompositionValidation'
import { emptyDraft, useDraftForm } from './useDraftForm'

function recipientFields(values: DraftValues): DraftFields {
  return {
    to: values.to,
    cc: values.cc,
    bcc: values.bcc,
    recipientName: values.recipientName,
    subject: values.subject,
  }
}

export function useComposerController(
  theme: 'dark' | 'light',
  onValidated?: (composition: ValidatedComposition) => void | Promise<void>,
  onSend?: ComposerRootProps['onSend'],
  onSent?: ComposerRootProps['onSent'],
  userId?: string,
): ComposerController {
  const draft = useDraftForm()
  const [sending, setSending] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const discardingRef = useRef(false)
  const [sendFailed, setSendFailed] = useState(false)
  const [sendProgress, setSendProgress] = useState('')
  const messageIds = useRef(new Set<string>())
  const attachmentIds = useRef(new Set<string>())
  const uploads = useRef<EmailDeliveryContext['uploads']>(new Map())
  const scope = useRef<EmailDeliveryContext['scope']>({ current: null })
  const sendingRef = useRef(false)
  const pendingDelivery = useRef<{ signature: string; id: string } | null>(null)
  const discardRef = useRef<() => void>(() => {})
  const releaseRemovedInlineRef = useRef<(body: string) => void>(() => {})
  const deliveryContext = useCallback(
    (): EmailDeliveryContext => ({
      uploads: uploads.current,
      scope: scope.current,
      messageIds: messageIds.current,
      attachmentIds: attachmentIds.current,
      userId,
    }),
    [userId],
  )
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<WindowState>('normal')
  const [saved, setSaved] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [showCc, setShowCc] = useState(false)
  const [baselineDraftSignature, setBaselineDraftSignature] = useState(
    draftSignature(emptyFields, emptyBody, []),
  )
  const triggerRef = useRef<HTMLButtonElement>(null)
  const recipientRef = useRef<HTMLInputElement>(null)
  const recipientNameRef = useRef<HTMLInputElement>(null)
  const ccRef = useRef<HTMLInputElement>(null)
  const bccRef = useRef<HTMLInputElement>(null)
  const attachmentTriggerRef = useRef<HTMLButtonElement>(null)
  const pendingRecipientFocusRef = useRef<'cc' | 'bcc' | null>(null)
  const attachmentErrorId = useId()
  const sessionRef = useRef(0)
  const [session, setSession] = useState(0)
  const editorRef = useRef<ReturnType<typeof useEditor>>(null)
  const invalidateValidationRef = useRef<() => void>(() => {})
  const setDraftBodyRef = useRef(draft.setValue)
  setDraftBodyRef.current = draft.setValue
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
        const currentEditor = editorRef.current
        if (currentEditor) {
          const bodySnapshot = getEditorBodySnapshot(currentEditor)
          setDraftBodyRef.current('body', bodySnapshot.body, { shouldDirty: true })
          releaseRemovedInlineRef.current(bodySnapshot.body)
        }
        invalidateValidationRef.current()
      },
    },
    [session],
  )
  editorRef.current = editor

  const focusInvalidField = useCallback(
    (field: 'to' | 'cc' | 'bcc' | 'recipientName' | 'attachments') => {
      if (field === 'to') {
        recipientRef.current?.focus()
        return
      }
      if (field === 'recipientName') {
        recipientNameRef.current?.focus()
        return
      }
      if (field === 'attachments') {
        attachmentTriggerRef.current?.focus()
        return
      }

      const fieldRef = field === 'cc' ? ccRef : bccRef
      if (fieldRef.current) {
        pendingRecipientFocusRef.current = null
        fieldRef.current.focus()
        return
      }
      pendingRecipientFocusRef.current = field
      setShowCc(true)
    },
    [],
  )
  const deliverComposition = useCallback(
    async (composition: ValidatedComposition) => {
      if (!onSend || sendingRef.current || discardingRef.current) return
      sendingRef.current = true
      setSending(true)
      setSendFailed(false)
      editorRef.current?.setEditable(false)
      const signature = JSON.stringify({
        ...composition,
        attachments: composition.attachments.map(({ id, file }) => ({
          id,
          name: file.name,
          size: file.size,
          lastModified: file.lastModified,
        })),
      })
      const notification = toast.loading('Enviando e-mail…')
      try {
        if (
          pendingDelivery.current &&
          pendingDelivery.current.signature !== signature &&
          messageIds.current.size
        ) {
          const result = await discardEmail(deliveryContext())
          if (result.retainedMessageIds.length)
            throw new EmailDeliveryError(
              'Não foi possível descartar o envio anterior com segurança. Seus anexos foram preservados. Verifique Enviados antes de iniciar outra mensagem.',
            )
          messageIds.current.clear()
          attachmentIds.current.clear()
          uploads.current.clear()
        }
        if (pendingDelivery.current?.signature !== signature)
          pendingDelivery.current = { signature, id: crypto.randomUUID() }
        await onSend(composition, pendingDelivery.current.id, {
          ...deliveryContext(),
          onProgress: ({ phase, completed, total }) => {
            const progress =
              phase === 'uploading'
                ? `Salvando arquivo ${completed + 1} de ${total}…`
                : phase === 'verifying'
                  ? `Verificando arquivo ${completed + 1} de ${total}…`
                  : 'Enviando e-mail…'
            setSendProgress(progress)
            toast.loading(progress, { id: notification })
          },
        })
      } catch (error) {
        setSendFailed(true)
        const message =
          error instanceof EmailDeliveryError
            ? error.message
            : 'Não foi possível confirmar o envio. Sua mensagem foi mantida. Tente novamente.'
        toast.error(message, { id: notification })
        throw new Error(message)
      } finally {
        sendingRef.current = false
        setSending(false)
        setSendProgress('')
        editorRef.current?.setEditable(true)
      }
      discardRef.current()
      toast.success('E-mail enviado com sucesso.', { id: notification })
      onSent?.()
    },
    [onSend, onSent, deliveryContext],
  )
  const validation = useCompositionValidation({
    draft,
    editor,
    onValidated: onSend ? deliverComposition : onValidated,
    focusInvalidField,
  })
  invalidateValidationRef.current = validation.invalidate

  const readDraftSignature = useCallback(() => {
    const values = draft.getValues()
    const body = editorRef.current ? getEditorBodySnapshot(editorRef.current).body : values.body
    if (body !== values.body) draft.setValue('body', body, { shouldDirty: true })
    return draftSignature(recipientFields(values), body, values.attachments)
  }, [draft])

  const isDirty = useCallback(
    () => readDraftSignature() !== baselineDraftSignature,
    [baselineDraftSignature, readDraftSignature],
  )

  const resetDraft = useCallback(() => {
    if (sendingRef.current) return
    pendingDelivery.current = null
    messageIds.current.clear()
    messageIds.current = new Set()
    attachmentIds.current.clear()
    attachmentIds.current = new Set()
    uploads.current.clear()
    uploads.current = new Map()
    scope.current.current = null
    scope.current = { current: null }
    setSendFailed(false)
    sessionRef.current += 1
    setSession((previous) => previous + 1)
    validation.reset()
    editorRef.current?.commands.clearContent()
    draft.reset(emptyDraft)
    setBaselineDraftSignature(draftSignature(emptyFields, emptyBody, []))
    setSaved(false)
    setConfirm(false)
    setOpen(false)
    setShowCc(false)
    pendingRecipientFocusRef.current = null
  }, [draft, validation.reset])

  discardRef.current = resetDraft

  const discard = useCallback(() => {
    if (sendingRef.current || discardingRef.current) return
    if (!messageIds.current.size && !attachmentIds.current.size && !uploads.current.size) {
      resetDraft()
      return
    }
    discardingRef.current = true
    setDiscarding(true)
    editorRef.current?.setEditable(false)
    return discardEmail(deliveryContext())
      .then((result) => {
        resetDraft()
        if (result.retainedMessageIds.length)
          toast.info(
            'O rascunho foi descartado. O envio anterior pode ter sido aceito; seus anexos foram preservados. Verifique Enviados.',
          )
      })
      .catch((error) => {
        toast.error(
          error instanceof EmailDeliveryError
            ? error.message
            : 'Não foi possível concluir o descarte. O rascunho foi mantido. Tente novamente.',
        )
      })
      .finally(() => {
        discardingRef.current = false
        setDiscarding(false)
        editorRef.current?.setEditable(true)
      })
  }, [deliveryContext, resetDraft])

  const releaseRemovedUploads = useCallback(
    (keys: string[]) => {
      if (!keys.length || sendingRef.current || discardingRef.current) return
      const reservations = keys.flatMap((key) => {
        const reservation = uploads.current.get(key)
        return reservation ? [{ key, reservation }] : []
      })
      if (!reservations.length) return
      discardingRef.current = true
      setDiscarding(true)
      editorRef.current?.setEditable(false)
      return discardEmail(deliveryContext(), {
        messageIds: [],
        attachmentIds: reservations.map(({ reservation }) => reservation.id),
      })
        .then(() => {
          for (const { key, reservation } of reservations) {
            if (reservation.sendAttempted) reservation.removed = true
            else uploads.current.delete(key)
          }
          return true
        })
        .catch((error) => {
          toast.error(
            error instanceof EmailDeliveryError
              ? error.message
              : 'Não foi possível liberar o arquivo. Suas referências foram mantidas para tentar novamente.',
          )
          return false
        })
        .finally(() => {
          discardingRef.current = false
          setDiscarding(false)
          editorRef.current?.setEditable(true)
        })
    },
    [deliveryContext],
  )

  releaseRemovedInlineRef.current = (body) => {
    if (!uploads.current.size) return
    const document = new DOMParser().parseFromString(body, 'text/html')
    const sources = new Set(
      [...document.querySelectorAll('img')].map((image) => image.getAttribute('src')),
    )
    const removed = [...uploads.current]
      .filter(
        ([, upload]) => upload.inlineSource && !upload.removed && !sources.has(upload.inlineSource),
      )
      .map(([key]) => key)
    void releaseRemovedUploads(removed)
  }

  const saveDraft = useCallback(() => {
    setBaselineDraftSignature(readDraftSignature())
    setSaved(true)
  }, [readDraftSignature])

  const addAttachments = useCallback(
    (files: File[]) => {
      if (files.length === 0 || sendingRef.current || discardingRef.current) return
      const attachments = [
        ...draft.getValues('attachments'),
        ...files.map((file) => ({ id: createAttachmentId(), file })),
      ]
      draft.setValue('attachments', attachments, { shouldDirty: true })
      validation.validateAttachments(attachments)
    },
    [draft, validation.validateAttachments],
  )

  const removeAttachment = useCallback(
    (id: string) => {
      if (sendingRef.current || discardingRef.current) return
      const keys = [...uploads.current]
        .filter(([, upload]) => upload.localKey === `file:${id}`)
        .map(([key]) => key)
      const remove = () => {
        const attachments = draft.getValues('attachments').filter((item) => item.id !== id)
        draft.setValue('attachments', attachments, { shouldDirty: true })
        validation.validateAttachments(attachments)
      }
      const released = releaseRemovedUploads(keys)
      if (released)
        return released.then((complete) => {
          if (complete) remove()
        })
      remove()
    },
    [draft, validation.validateAttachments, releaseRemovedUploads],
  )

  return {
    draft,
    context: {
      sending: sending || discarding,
      discarding,
      sendFailed,
      sendProgress: discarding ? 'Descartando arquivos…' : sendProgress,
      sessionRef,
      revision: session,
      editor,
      addAttachments,
      removeAttachment,
      baselineDraftSignature,
      saved,
      saveDraft,
      confirm,
      setConfirm,
      discard,
      state,
      theme,
      triggerRef,
      recipientRef,
      recipientNameRef,
      ccRef,
      bccRef,
      attachmentTriggerRef,
      attachmentErrorId,
      pendingRecipientFocusRef,
      showCc,
      setShowCc,
      validation,
    },
    open,
    state,
    setState,
    onOpenChange: (next: boolean, details: WindowOpenChangeDetails) => {
      if (!next && (sendingRef.current || discardingRef.current)) {
        details.cancel()
        return
      }
      if (!next && isDirty()) {
        details.cancel()
        setConfirm(true)
        return
      }
      setOpen(next)
    },
  }
}
