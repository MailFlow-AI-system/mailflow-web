import { Button } from '@mailflow/ui/components'
import { Paperclip, X } from '@mailflow/ui/icons'
import { useFormContext, useWatch } from 'react-hook-form'
import { useComposer } from '../context'
import type { DraftValues } from '../types/DraftValues'

export function Attachments() {
  const { removeAttachment } = useComposer()
  const { control } = useFormContext<DraftValues>()
  const attachments = useWatch({ control, name: 'attachments' })
  if (!attachments.length) return null
  return (
    <ul aria-label="Arquivos anexados" className="flex list-none flex-wrap gap-2 px-4 pb-3">
      {attachments.map(({ id, file }) => (
        <li
          key={id}
          className="flex max-w-full items-center gap-2 rounded-md border border-border px-2 py-1 text-xs"
        >
          <Paperclip aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">{file.name}</span>
          <span className="shrink-0 text-muted-foreground">
            {Math.max(1, Math.ceil(file.size / 1024))} KB
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 shrink-0"
            aria-label={`Remover ${file.name}`}
            onClick={() => removeAttachment(id)}
          >
            <X aria-hidden="true" className="size-3" />
          </Button>
        </li>
      ))}
    </ul>
  )
}
