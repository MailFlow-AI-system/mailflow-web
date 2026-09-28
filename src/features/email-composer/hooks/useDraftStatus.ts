import { useFormContext, useWatch } from 'react-hook-form'
import { useComposer } from '../context'
import { draftFieldsSignature } from '../draft'
import type { DraftValues } from '../types/DraftValues'

export function useDraftStatus() {
  const { saved, bodyDirty, baselineFieldsRef } = useComposer()
  const { control } = useFormContext<DraftValues>()
  const [to, cc, bcc, subject, attachments] = useWatch({
    control,
    name: ['to', 'cc', 'bcc', 'subject', 'attachments'],
  })
  const fieldsDirty =
    draftFieldsSignature(
      { to: to ?? '', cc: cc ?? '', bcc: bcc ?? '', subject: subject ?? '' },
      attachments ?? [],
    ) !== baselineFieldsRef.current

  return { dirty: fieldsDirty || bodyDirty, saved }
}
