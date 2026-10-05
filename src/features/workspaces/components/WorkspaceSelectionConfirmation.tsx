import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  Button,
} from '@mailflow/ui/components'
import { useRef } from 'react'
import type { WorkspaceSelectionConfirmationProps } from '../types/selection'

export function WorkspaceSelectionConfirmation({
  workspace,
  busy,
  theme,
  error,
  onCancel,
  onConfirm,
}: WorkspaceSelectionConfirmationProps) {
  const safeRef = useRef<HTMLButtonElement>(null)
  return (
    <AlertDialog
      open={Boolean(workspace)}
      onOpenChange={(open) => {
        if (!open && !busy) onCancel()
      }}
    >
      <AlertDialogContent lang="pt-BR" data-theme={theme} initialFocus={safeRef}>
        <AlertDialogTitle>Trocar de workspace?</AlertDialogTitle>
        <AlertDialogDescription>
          Sua mensagem está armazenada somente nesta aba, mesmo se marcada como salva. Trocar para{' '}
          {workspace?.name} descartará a mensagem e os anexos.
        </AlertDialogDescription>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            Não foi possível trocar. Sua mensagem foi preservada. Tente novamente.
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            ref={safeRef}
            variant="outline"
            className="cursor-pointer"
            disabled={busy}
            onClick={onCancel}
          >
            Continuar editando
          </Button>
          <Button
            variant="destructive"
            className="cursor-pointer"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? 'Trocando…' : 'Descartar e trocar'}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
