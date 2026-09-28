import { Button, Input } from '@mailflow/ui/components'
import { useCallback, useId, useState } from 'react'
import { normalizeLink } from '../editor/links'
import type { LinkEditorProps } from '../types/editor'

export function LinkEditor({ editor, onClose }: LinkEditorProps) {
  const [url, setUrl] = useState<string>(editor.getAttributes('link').href ?? '')
  const [error, setError] = useState('')
  const id = useId()
  const focusInput = useCallback((element: HTMLInputElement | null) => {
    element?.focus()
  }, [])
  return (
    <form
      aria-label="Editar link"
      className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          onClose()
          editor.commands.focus()
        }
      }}
      onSubmit={(event) => {
        event.preventDefault()
        const href = normalizeLink(url)
        if (!href) {
          setError('Informe um endereço HTTP, HTTPS ou mailto válido.')
          return
        }
        const chain = editor.chain().focus().extendMarkRange('link')
        if (editor.state.selection.empty && !editor.isActive('link')) {
          chain
            .insertContent({ type: 'text', text: href, marks: [{ type: 'link', attrs: { href } }] })
            .run()
        } else chain.setLink({ href }).run()
        onClose()
      }}
    >
      <label htmlFor={id} className="text-xs">
        Link
      </label>
      <Input
        id={id}
        ref={focusInput}
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="https://exemplo.com"
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className="h-8 min-w-0 flex-1 border-0 bg-transparent shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
      />
      <Button size="sm" type="submit">
        Aplicar
      </Button>
      {editor.isActive('link') && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            editor.chain().focus().extendMarkRange('link').unsetLink().run()
            onClose()
          }}
        >
          Remover link
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          onClose()
          editor.commands.focus()
        }}
      >
        Cancelar
      </Button>
      {error && (
        <p role="alert" id={`${id}-error`} className="w-full text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}
