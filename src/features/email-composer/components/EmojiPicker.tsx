import { Button } from '@mailflow/ui/components'
import { useCallback } from 'react'
import { useComposer } from '../context'
import { composerEmojis } from '../editor/emojis'
import type { LinkEditorProps } from '../types/editor'

export function EmojiPicker({ onClose }: Pick<LinkEditorProps, 'onClose'>) {
  const { editor } = useComposer()
  const focusFirst = useCallback((element: HTMLButtonElement | null) => {
    element?.focus()
  }, [])
  return (
    <fieldset
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          onClose()
          editor?.commands.focus()
        }
      }}
      aria-label="Escolher emoji"
      className="flex max-h-36 flex-wrap items-center gap-1 overflow-y-auto border-t border-border px-4 py-2"
    >
      {composerEmojis.map(({ emoji, label }, index) => (
        <Button
          key={label}
          ref={index === 0 ? focusFirst : undefined}
          variant="ghost"
          size="icon"
          aria-label={label}
          onClick={() => {
            editor?.chain().focus().insertContent({ type: 'text', text: emoji }).run()
            onClose()
          }}
        >
          {emoji}
        </Button>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          onClose()
          editor?.commands.focus()
        }}
      >
        Cancelar
      </Button>
    </fieldset>
  )
}
