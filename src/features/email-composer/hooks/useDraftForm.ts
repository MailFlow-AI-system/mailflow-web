import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { emptyBody, emptyFields } from '../draft'
import { draftSchema } from '../schemas/draftSchema'
import type { DraftValues } from '../types/DraftValues'

export const emptyDraft: DraftValues = {
  ...emptyFields,
  body: emptyBody,
  attachments: [],
}

export function useDraftForm() {
  return useForm<DraftValues>({
    resolver: zodResolver(draftSchema),
    defaultValues: emptyDraft,
    mode: 'onTouched',
  })
}
