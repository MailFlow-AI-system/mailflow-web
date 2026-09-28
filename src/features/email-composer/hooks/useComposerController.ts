import type { WindowOpenChangeDetails, WindowState } from '@mailflow/ui/components'
import { useEditor } from '@tiptap/react'
import { cn } from 'cn'
import { useRef, useState } from 'react'
import { draftSignature, emptyBody, emptyFields } from '../draft'
import { composerExtensions } from '../editor/extensions'
import type { Attachment, ComposerController, DraftFields, RecipientField } from '../types/composer'

export function useComposerController(theme: 'dark' | 'light'): ComposerController {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<WindowState>('normal')
  const [fields, setFields] = useState<DraftFields>(emptyFields)
  const [body, setBody] = useState(emptyBody)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [baseline, setBaseline] = useState(() => draftSignature(emptyFields, emptyBody, []))
  const [saved, setSaved] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const recipientRef = useRef<HTMLInputElement>(null)
  const sessionRef = useRef(0)
  const [session, setSession] = useState(0)
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
      onUpdate: ({ editor }) => setBody(editor.getHTML()),
    },
    [session],
  )
  const dirty = draftSignature(fields, body, attachments) !== baseline

  function setField(field: RecipientField, value: string) {
    setFields((previous) => ({ ...previous, [field]: value }))
  }

  function discard() {
    sessionRef.current += 1
    setSession((previous) => previous + 1)
    editor?.commands.clearContent()
    setFields(emptyFields)
    setBody(emptyBody)
    setAttachments([])
    setBaseline(draftSignature(emptyFields, emptyBody, []))
    setSaved(false)
    setConfirm(false)
    setOpen(false)
  }

  return {
    context: {
      sessionRef,
      revision: session,
      editor,
      fields,
      setField,
      attachments,
      addAttachments: (files) =>
        setAttachments((previous) => [
          ...previous,
          ...files.map((file) => ({ id: crypto.randomUUID(), file })),
        ]),
      removeAttachment: (id) =>
        setAttachments((previous) => previous.filter((item) => item.id !== id)),
      dirty,
      saved,
      saveDraft: () => {
        setBaseline(draftSignature(fields, editor?.getHTML() ?? body, attachments))
        setSaved(true)
      },
      confirm,
      setConfirm,
      discard,
      state,
      theme,
      triggerRef,
      recipientRef,
    },
    open,
    state,
    setState,
    onOpenChange: (next: boolean, details: WindowOpenChangeDetails) => {
      if (!next && dirty) {
        details.cancel()
        setConfirm(true)
        return
      }
      setOpen(next)
    },
  }
}
