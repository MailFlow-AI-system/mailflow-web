import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  Button,
} from '@mailflow/ui/components'
import { useRef } from 'react'
import { useComposer } from '../context'

export function CloseConfirmation() {
  const { confirm, setConfirm, discard, triggerRef, theme } = useComposer()
  const safeRef = useRef<HTMLButtonElement>(null)
  const confirmed = useRef(false)
  return (
    <AlertDialog open={confirm} onOpenChange={setConfirm}>
      <AlertDialogContent
        lang="pt-BR"
        data-theme={theme}
        initialFocus={safeRef}
        finalFocus={() => {
          if (!confirmed.current) return true
          confirmed.current = false
          return triggerRef.current ?? true
        }}
      >
        <AlertDialogTitle>Fechar sem salvar?</AlertDialogTitle>
        <AlertDialogDescription>
          Há alterações não salvas. Continue editando ou descarte a mensagem.
        </AlertDialogDescription>
        <div className="flex flex-wrap justify-end gap-2">
          <AlertDialogClose ref={safeRef} render={<Button variant="outline" />}>
            Continuar editando
          </AlertDialogClose>
          <Button
            variant="destructive"
            onClick={() => {
              confirmed.current = true
              discard()
            }}
          >
            Descartar mensagem
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
