import { Button, Input } from '@mailflow/ui/components'
import { useCallback, useId } from 'react'
import { useLinkForm } from '../hooks/useLinkForm'
import type { LinkEditorProps } from '../types/editor'

export function LinkEditor({ editor, onClose }: LinkEditorProps) {
  const { register, errors, submit } = useLinkForm(editor, onClose)
  const id = useId()
  const error = errors.url?.message
  const focusInput = useCallback((element: HTMLInputElement | null) => {
    element?.focus()
  }, [])
  const urlField = register('url')
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
      onSubmit={submit}
    >
      <label htmlFor={id} className="text-xs">
        Link
      </label>
      <Input
        id={id}
        {...urlField}
        ref={(node) => {
          urlField.ref(node)
          focusInput(node)
        }}
        placeholder="https://exemplo.com"
        aria-invalid={Boolean(error)}
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
      {error ? (
        <p role="alert" id={`${id}-error`} className="w-full text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  )
}
