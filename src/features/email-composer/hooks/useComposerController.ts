import type { WindowOpenChangeDetails, WindowState } from '@mailflow/ui/components'
import { useEditor } from '@tiptap/react'
import { cn } from 'cn'
import { useRef, useState } from 'react'
import { draftSignature, emptyBody, emptyFields } from '../draft'
import { composerExtensions } from '../editor/extensions'
import type { ComposerController, DraftFields } from '../types/composer'
import type { DraftValues } from '../types/DraftValues'
import { emptyDraft, useDraftForm } from './useDraftForm'

function recipientFields(values: DraftValues): DraftFields {
  return { to: values.to, cc: values.cc, bcc: values.bcc, subject: values.subject }
}

export function useComposerController(theme: 'dark' | 'light'): ComposerController {
  const draft = useDraftForm()
  const values = draft.watch()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<WindowState>('normal')
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
      onUpdate: ({ editor }) => {
        draft.setValue('body', editor.getHTML())
      },
    },
    [session],
  )
  const fields = recipientFields(values)
  const dirty = draftSignature(fields, values.body, values.attachments) !== baseline

  function discard() {
    sessionRef.current += 1
    setSession((previous) => previous + 1)
    editor?.commands.clearContent()
    draft.reset(emptyDraft)
    setBaseline(draftSignature(emptyFields, emptyBody, []))
    setSaved(false)
    setConfirm(false)
    setOpen(false)
  }

  return {
    draft,
    context: {
      sessionRef,
      revision: session,
      editor,
      fields,
      attachments: values.attachments,
      addAttachments: (files) =>
        draft.setValue('attachments', [
          ...draft.getValues('attachments'),
          ...files.map((file) => ({ id: crypto.randomUUID(), file })),
        ]),
      removeAttachment: (id) =>
        draft.setValue(
          'attachments',
          draft.getValues('attachments').filter((item) => item.id !== id),
        ),
      dirty,
      saved,
      saveDraft: () => {
        const current = draft.getValues()
        setBaseline(draftSignature(recipientFields(current), current.body, current.attachments))
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
