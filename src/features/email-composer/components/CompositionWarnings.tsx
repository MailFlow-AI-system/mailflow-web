import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  Button,
} from '@mailflow/ui/components'
import { useRef } from 'react'
import { useFormContext, useFormState } from 'react-hook-form'
import { useComposer } from '../context'
import type { DraftValues } from '../types/DraftValues'

export function CompositionWarnings() {
  const { theme, validation } = useComposer()
  const { control } = useFormContext<DraftValues>()
  const { isSubmitting } = useFormState({ control })
  const safeRef = useRef<HTMLButtonElement>(null)

  return (
    <AlertDialog
      open={validation.warningsOpen}
      onOpenChange={(open) => {
        if (!open) validation.cancelWarnings()
      }}
    >
      <AlertDialogContent lang="pt-BR" data-theme={theme} initialFocus={safeRef}>
        <AlertDialogTitle>Revisar antes de continuar</AlertDialogTitle>
        <AlertDialogDescription>
          A mensagem tem estes avisos. Você pode continuar editando ou aceitar os avisos.
        </AlertDialogDescription>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {validation.warnings.map((warning) => (
            <li key={warning.code}>{warning.message}</li>
          ))}
        </ul>
        <div className="flex flex-wrap justify-end gap-2">
          <AlertDialogClose ref={safeRef} render={<Button type="button" variant="outline" />}>
            Continuar editando
          </AlertDialogClose>
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={() => void validation.confirmWarnings()}
          >
            Continuar mesmo assim
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
