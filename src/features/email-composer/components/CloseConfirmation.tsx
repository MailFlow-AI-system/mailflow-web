import { useRef } from 'react'
import { useComposer } from '../context'
import { UnsavedChangesDialog } from './UnsavedChangesDialog'

export function CloseConfirmation() {
  const { confirm, setConfirm, discard, saveAndClose, sending, triggerRef, theme, persistence } =
    useComposer()
  const confirmed = useRef(false)
  // A persisted draft is saved as it is edited, so the only choice left is deleting it.
  const stored = Boolean(persistence)
  return (
    <UnsavedChangesDialog
      open={confirm}
      theme={theme}
      title={stored ? 'Discard draft?' : 'Unsaved changes'}
      description={
        stored
          ? 'The draft and its attachments will be deleted. This action cannot be undone.'
          : 'Your message has changes that were not saved. Save it as a draft, discard it, or keep editing.'
      }
      continueLabel={stored ? 'Keep editing' : undefined}
      discardLabel={stored ? 'Discard message' : undefined}
      busy={sending}
      onContinue={() => setConfirm(false)}
      onDiscard={() => {
        confirmed.current = true
        void discard()
      }}
      onSave={
        stored
          ? undefined
          : () => {
              confirmed.current = true
              void saveAndClose()
            }
      }
      finalFocus={() => {
        if (!confirmed.current) return true
        confirmed.current = false
        return triggerRef.current ?? true
      }}
    />
  )
}
