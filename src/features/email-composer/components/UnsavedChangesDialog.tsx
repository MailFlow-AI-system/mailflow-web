import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  Button,
} from '@mailflow/ui/components'
import { type ComponentProps, useRef } from 'react'

type UnsavedChangesDialogProps = {
  open: boolean
  theme: 'dark' | 'light'
  title: string
  description: string
  /** Disables every choice while an earlier choice is still being applied. */
  busy?: boolean
  /** Called for "Continue editing", Escape and outside clicks. */
  onContinue: () => void
  onDiscard: () => void
  /** Omit when the caller has nothing to save; the button is then hidden. */
  onSave?: () => void
  /** Button labels; the defaults suit an unsaved message. */
  continueLabel?: string
  discardLabel?: string
  saveLabel?: string
  finalFocus?: ComponentProps<typeof AlertDialogContent>['finalFocus']
}

export function UnsavedChangesDialog({
  open,
  theme,
  title,
  description,
  busy = false,
  onContinue,
  onDiscard,
  onSave,
  continueLabel = 'Continue editing',
  discardLabel = 'Discard changes',
  saveLabel = 'Save draft',
  finalFocus,
}: UnsavedChangesDialogProps) {
  const safeRef = useRef<HTMLButtonElement>(null)
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onContinue()
      }}
    >
      <AlertDialogContent
        lang="en-US"
        data-theme={theme}
        initialFocus={safeRef}
        finalFocus={finalFocus}
      >
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
        <div className="flex flex-wrap justify-end gap-2">
          <AlertDialogClose ref={safeRef} disabled={busy} render={<Button variant="outline" />}>
            {continueLabel}
          </AlertDialogClose>
          <Button variant="destructive" disabled={busy} onClick={onDiscard}>
            {discardLabel}
          </Button>
          {onSave ? (
            <Button disabled={busy} onClick={onSave}>
              {saveLabel}
            </Button>
          ) : null}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
