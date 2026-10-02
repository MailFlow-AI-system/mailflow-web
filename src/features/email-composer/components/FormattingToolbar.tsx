import { Toolbar, ToolbarButton, ToolbarSeparator } from '@mailflow/ui/components'
import {
  Bold,
  Image,
  Italic,
  Link2,
  List,
  ListOrdered,
  Paperclip,
  Smile,
  Underline,
} from '@mailflow/ui/icons'
import { useEditorState } from '@tiptap/react'
import { useRef, useState } from 'react'
import { useFormContext, useFormState } from 'react-hook-form'
import { useComposer } from '../context'
import { readInlineImage } from '../editor/images'
import type { DraftValues } from '../types/DraftValues'
import type { FormatAction } from '../types/editor'
import { EmojiPicker } from './EmojiPicker'
import { LinkEditor } from './LinkEditor'

const marks: FormatAction[] = [
  { name: 'Negrito', mark: 'bold', icon: Bold, command: (chain) => chain.toggleBold() },
  { name: 'Itálico', mark: 'italic', icon: Italic, command: (chain) => chain.toggleItalic() },
  {
    name: 'Sublinhado',
    mark: 'underline',
    icon: Underline,
    command: (chain) => chain.toggleUnderline(),
  },
]
const lists: FormatAction[] = [
  {
    name: 'Lista com marcadores',
    mark: 'bulletList',
    icon: List,
    command: (chain) => chain.toggleBulletList(),
  },
  {
    name: 'Lista numerada',
    mark: 'orderedList',
    icon: ListOrdered,
    command: (chain) => chain.toggleOrderedList(),
  },
]

export function FormattingToolbar() {
  const { revision } = useComposer()
  return <EditorToolbar key={revision} />
}

function EditorToolbar() {
  const { editor, addAttachments, sessionRef, attachmentTriggerRef, attachmentErrorId } =
    useComposer()
  const { control } = useFormContext<DraftValues>()
  const { errors } = useFormState({ control })
  const hasAttachmentErrors = Boolean(errors.attachments)
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive('bold'),
      italic: editor?.isActive('italic'),
      underline: editor?.isActive('underline'),
      bulletList: editor?.isActive('bulletList'),
      orderedList: editor?.isActive('orderedList'),
      link: editor?.isActive('link'),
    }),
  })
  const [panel, setPanel] = useState<'link' | 'emoji' | null>(null)
  const [error, setError] = useState('')
  const imageInput = useRef<HTMLInputElement>(null)
  const attachmentInput = useRef<HTMLInputElement>(null)
  const disabled = !editor
  function renderActions(actions: FormatAction[]) {
    return actions.map(({ name, mark, icon: Icon, command }) => (
      <ToolbarButton
        key={name}
        aria-label={name}
        title={name}
        aria-pressed={active?.[mark as keyof typeof active] ?? false}
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor && command(editor.chain().focus()).run()}
      >
        <Icon aria-hidden="true" className="size-3.5" />
      </ToolbarButton>
    ))
  }
  return (
    <>
      <Toolbar
        aria-label="Formatação da mensagem"
        className="flex-wrap border-t border-border bg-muted/20 px-2 py-1.5"
      >
        {renderActions(marks)}
        <ToolbarSeparator className="mx-1 h-4" />
        {renderActions(lists)}
        <ToolbarSeparator className="mx-1 h-4" />
        <ToolbarButton
          aria-label="Inserir link"
          title="Inserir link"
          aria-pressed={active?.link ?? false}
          aria-expanded={panel === 'link'}
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setPanel((previous) => (previous === 'link' ? null : 'link'))}
        >
          <Link2 aria-hidden="true" className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          aria-label="Inserir imagem"
          title="Inserir imagem"
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => imageInput.current?.click()}
        >
          <Image aria-hidden="true" className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          aria-label="Inserir emoji"
          title="Inserir emoji"
          disabled={disabled}
          aria-expanded={panel === 'emoji'}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setPanel((previous) => (previous === 'emoji' ? null : 'emoji'))}
        >
          <Smile aria-hidden="true" className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          ref={attachmentTriggerRef}
          aria-label="Anexar arquivo"
          title="Anexar arquivo"
          aria-invalid={hasAttachmentErrors}
          aria-describedby={hasAttachmentErrors ? attachmentErrorId : undefined}
          onClick={() => attachmentInput.current?.click()}
        >
          <Paperclip aria-hidden="true" className="size-3.5" />
        </ToolbarButton>
      </Toolbar>
      <input
        hidden
        ref={imageInput}
        type="file"
        aria-label="Selecionar imagem"
        accept="image/png,image/jpeg,image/gif,image/webp"
        onChange={async (event) => {
          const file = event.currentTarget.files?.[0]
          event.currentTarget.value = ''
          if (!file || !editor) return
          const session = sessionRef.current
          const selection = editor.state.selection
          setError('')
          try {
            const src = await readInlineImage(file)
            if (session !== sessionRef.current || editor.isDestroyed) return
            const from = Math.min(selection.from, editor.state.doc.content.size)
            editor.chain().focus().setTextSelection(from).setImage({ src, alt: file.name }).run()
          } catch (cause) {
            if (session === sessionRef.current)
              setError(
                cause instanceof Error ? cause.message : 'Não foi possível inserir a imagem.',
              )
          }
        }}
      />
      <input
        hidden
        ref={attachmentInput}
        type="file"
        multiple
        aria-label="Selecionar anexos"
        onChange={(event) => {
          addAttachments(Array.from(event.currentTarget.files ?? []))
          event.currentTarget.value = ''
        }}
      />
      {error && (
        <p role="alert" className="px-4 py-2 text-xs text-destructive">
          {error}
        </p>
      )}
      {editor && panel === 'link' && <LinkEditor editor={editor} onClose={() => setPanel(null)} />}
      {panel === 'emoji' && <EmojiPicker onClose={() => setPanel(null)} />}
    </>
  )
}
