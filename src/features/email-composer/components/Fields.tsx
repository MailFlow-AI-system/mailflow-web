import { Button, Input } from '@mailflow/ui/components'
import { useId, useState } from 'react'
import { useComposer } from '../context'
import type { RecipientField } from '../types/composer'

const fieldLabels: Record<RecipientField, string> = {
  to: 'Para',
  cc: 'Cc',
  bcc: 'Bcc',
  subject: 'Assunto',
}

export function Fields() {
  const { fields, setField, recipientRef } = useComposer()
  const [showCc, setShowCc] = useState(false)
  const id = useId()
  const visible: RecipientField[] = showCc ? ['to', 'cc', 'bcc', 'subject'] : ['to', 'subject']
  return (
    <div className="border-b border-border">
      {visible.map((field) => (
        <div
          key={field}
          className="flex items-center gap-2 border-b border-border px-4 last:border-0"
        >
          <label htmlFor={`${id}-${field}`} className="w-16 shrink-0 text-xs text-muted-foreground">
            {fieldLabels[field]}
          </label>
          <Input
            id={`${id}-${field}`}
            ref={field === 'to' ? recipientRef : undefined}
            value={fields[field]}
            onChange={(event) => setField(field, event.target.value)}
            className="h-8 min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none"
            placeholder={
              field === 'to'
                ? 'destinatario@email.com'
                : field === 'subject'
                  ? 'Assunto do email'
                  : undefined
            }
            autoComplete="off"
          />
          {field === 'to' && (
            <Button
              variant="ghost"
              size="sm"
              aria-expanded={showCc}
              className="h-7 shrink-0 px-0 text-xs font-normal text-muted-foreground"
              onClick={() => setShowCc((previous) => !previous)}
            >
              Cc/Bcc
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}
