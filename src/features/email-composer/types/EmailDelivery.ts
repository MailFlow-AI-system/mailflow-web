import type { Workspace } from '#/features/workspaces/types'
import type { MailLabel } from '../clients/labels'

export type MailDeliveryScope = { userId: string; workspace: Workspace }

export type AttachmentUploadState = {
  id: string
  uploadUrl: string
  headers: Record<string, string>
  expiresAt: string
  uploaded: boolean
  clean: boolean
  attachmentExpiresAt?: string
  sendAttempted?: boolean
  localKey?: string
  inlineSource?: string
  removed?: boolean
}

export type DeliveryProgress = {
  phase: 'uploading' | 'verifying' | 'sending'
  completed: number
  total: number
}

export type EmailDeliveryContext = {
  draft?: { id: string; version: number }
  labels?: MailLabel[]
  uploads: Map<string, AttachmentUploadState>
  scope: { current: MailDeliveryScope | null }
  userId?: string
  messageIds?: Set<string>
  attachmentIds?: Set<string>
  onProgress?: (progress: DeliveryProgress) => void
}

export class EmailDeliveryError extends Error {}
