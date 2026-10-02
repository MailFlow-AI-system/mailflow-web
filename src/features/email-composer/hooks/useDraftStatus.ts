import { useFormContext, useWatch } from 'react-hook-form'
import { useComposer } from '../context'
import { draftSignature, emptyBody } from '../draft'
import type { DraftValues } from '../types/DraftValues'

export function useDraftStatus() {
  const { saved, baselineDraftSignature } = useComposer()
  const { control } = useFormContext<DraftValues>()
  const [to, cc, bcc, subject, body, attachments] = useWatch({
    control,
    name: ['to', 'cc', 'bcc', 'subject', 'body', 'attachments'],
  })
  const signature = draftSignature(
    { to: to ?? '', cc: cc ?? '', bcc: bcc ?? '', subject: subject ?? '' },
    body ?? emptyBody,
    attachments ?? [],
  )

  return { dirty: signature !== baselineDraftSignature, saved }
}
