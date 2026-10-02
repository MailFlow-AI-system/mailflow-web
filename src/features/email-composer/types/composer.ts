import type { WindowOpenChangeDetails, WindowState } from '@mailflow/ui/components'
import type { Editor } from '@tiptap/react'
import type { ReactNode, RefObject } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import type {
  CompositionValidationIssue,
  CompositionWarning,
  NormalizedComposition,
} from './CompositionValidation'

import type { DraftValues } from './DraftValues'

export type { Attachment } from './DraftValues'
export type RecipientField = 'to' | 'cc' | 'bcc' | 'subject'
export type DraftFields = Record<RecipientField, string>
export type ValidatedComposition = Omit<NormalizedComposition, 'attachments'> & {
  attachments: DraftValues['attachments']
}
export type ComposerRootProps = {
  children: ReactNode
  theme?: 'dark' | 'light'
  onValidated?: (composition: ValidatedComposition) => void | Promise<void>
}
export type ComposerLayoutProps = { children: ReactNode; assistant?: ReactNode }
export type ComposerValidationState = {
  attachmentIssues: CompositionValidationIssue[]
  cancelWarnings: () => void
  confirmWarnings: () => Promise<void>
  errorMessage: string | null
  invalidate: () => void
  ready: boolean
  reset: () => void
  submitting: boolean
  validate: () => Promise<void>
  validateAttachments: (attachments: DraftValues['attachments']) => void
  warnings: CompositionWarning[]
  warningsOpen: boolean
}
export type ComposerContextValue = {
  revision: number
  sessionRef: RefObject<number>
  editor: Editor | null
  addAttachments: (files: File[]) => void
  removeAttachment: (id: string) => void
  bodyDirty: boolean
  baselineFieldsRef: RefObject<string>
  saved: boolean
  saveDraft: () => void
  confirm: boolean
  setConfirm: (value: boolean) => void
  discard: () => void
  state: WindowState
  theme: 'dark' | 'light'
  triggerRef: RefObject<HTMLButtonElement | null>
  recipientRef: RefObject<HTMLInputElement | null>
  ccRef: RefObject<HTMLInputElement | null>
  bccRef: RefObject<HTMLInputElement | null>
  attachmentTriggerRef: RefObject<HTMLButtonElement | null>
  attachmentErrorId: string
  showCc: boolean
  setShowCc: (value: boolean | ((previous: boolean) => boolean)) => void
  validation: ComposerValidationState
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
