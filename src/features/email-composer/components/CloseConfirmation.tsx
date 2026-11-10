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
  const { confirm, setConfirm, discard, sending, triggerRef, theme, persistence } = useComposer()
  const safeRef = useRef<HTMLButtonElement>(null)
  const confirmed = useRef(false)
  return (
    <AlertDialog open={confirm} onOpenChange={setConfirm}>
      <AlertDialogContent
        lang="en-US"
        data-theme={theme}
        initialFocus={safeRef}
        finalFocus={() => {
          if (!confirmed.current) return true
          confirmed.current = false
          return triggerRef.current ?? true
        }}
      >
        <AlertDialogTitle>
          {persistence ? 'Discard draft?' : 'Close without saving?'}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {persistence
            ? 'The draft and its attachments will be deleted. This action cannot be undone.'
            : 'There are unsaved changes. Keep editing or discard the message.'}
        </AlertDialogDescription>
        <div className="flex flex-wrap justify-end gap-2">
          <AlertDialogClose ref={safeRef} render={<Button variant="outline" />}>
            Keep editing
          </AlertDialogClose>
          <Button
            variant="destructive"
            disabled={sending}
            onClick={() => {
              confirmed.current = true
              void discard()
            }}
          >
            Discard message
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
