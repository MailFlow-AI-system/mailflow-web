import type { WindowOpenChangeDetails, WindowState } from '@mailflow/ui/components'
import type { Editor } from '@tiptap/react'
import type { ReactNode, RefObject } from 'react'
import type { UseFormReturn } from 'react-hook-form'

import type { Attachment, DraftValues } from './DraftValues'

export type { Attachment } from './DraftValues'
export type RecipientField = 'to' | 'cc' | 'bcc' | 'subject'
export type DraftFields = Record<RecipientField, string>
export type ComposerRootProps = { children: ReactNode; theme?: 'dark' | 'light' }
export type ComposerLayoutProps = { children: ReactNode; assistant?: ReactNode }
export type ComposerContextValue = {
  revision: number
  sessionRef: RefObject<number>
  editor: Editor | null
  fields: DraftFields
  attachments: Attachment[]
  addAttachments: (files: File[]) => void
  removeAttachment: (id: string) => void
  dirty: boolean
  saved: boolean
  saveDraft: () => void
  confirm: boolean
  setConfirm: (value: boolean) => void
  discard: () => void
  state: WindowState
  theme: 'dark' | 'light'
  triggerRef: RefObject<HTMLButtonElement | null>
  recipientRef: RefObject<HTMLInputElement | null>
}

export type ComposerController = {
  draft: UseFormReturn<DraftValues>
  context: ComposerContextValue
  open: boolean
  state: WindowState
  setState: (state: WindowState) => void
  onOpenChange: (open: boolean, details: WindowOpenChangeDetails) => void
}

export type ComposerFocusMemory = { element: HTMLElement | null; revision: number }
