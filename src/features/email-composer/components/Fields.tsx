import { Button, Input } from '@mailflow/ui/components'
import { useId } from 'react'
import { useFormContext } from 'react-hook-form'
import { useComposer } from '../context'
import type { RecipientField } from '../types/composer'
import type { DraftValues } from '../types/DraftValues'

const fieldLabels: Record<RecipientField, string> = {
  to: 'Para',
  cc: 'Cc',
  bcc: 'Bcc',
  subject: 'Assunto',
}

export function Fields() {
  const { recipientRef, ccRef, bccRef, pendingRecipientFocusRef, showCc, setShowCc } = useComposer()
  const {
    register,
    formState: { errors },
  } = useFormContext<DraftValues>()
  const id = useId()
  const visible: RecipientField[] = showCc ? ['to', 'cc', 'bcc', 'subject'] : ['to', 'subject']
  return (
    <div className="border-b border-border">
      {visible.map((field) => {
        const registration = register(field)
        const error = errors[field]
        return (
          <div
            key={field}
            className="flex flex-wrap items-center gap-2 border-b border-border px-4 last:border-0"
          >
            <label
              htmlFor={`${id}-${field}`}
              className="w-16 shrink-0 text-xs text-muted-foreground"
            >
              {fieldLabels[field]}
            </label>
            <Input
              id={`${id}-${field}`}
              {...registration}
              ref={(node) => {
                registration.ref(node)
                if (field === 'to') recipientRef.current = node
                if (field === 'cc') ccRef.current = node
                if (field === 'bcc') bccRef.current = node
                if (
                  node &&
                  (field === 'cc' || field === 'bcc') &&
                  pendingRecipientFocusRef.current === field
                ) {
                  pendingRecipientFocusRef.current = null
                  node.focus()
                }
              }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${id}-${field}-error` : undefined}
              className="h-8 min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
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
                type="button"
                variant="ghost"
                size="sm"
                aria-expanded={showCc}
                className="h-7 shrink-0 px-0 text-xs font-normal text-muted-foreground"
                onClick={() => setShowCc((previous) => !previous)}
              >
                Cc/Bcc
              </Button>
            )}
            {error?.message ? (
              <p
                role="alert"
                id={`${id}-${field}-error`}
                className="w-full pb-2 text-xs text-destructive"
              >
                {error.message}
              </p>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
