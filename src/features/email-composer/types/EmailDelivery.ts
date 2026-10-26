export type AttachmentUploadState = {
  id: string
  uploadUrl: string
  headers: Record<string, string>
  expiresAt: string
  uploaded: boolean
  clean: boolean
  attachmentExpiresAt?: string
  sendAttempted?: boolean
}

export type DeliveryProgress = {
  phase: 'uploading' | 'verifying' | 'sending'
  completed: number
  total: number
}

export type EmailDeliveryContext = {
  uploads: Map<string, AttachmentUploadState>
  onProgress?: (progress: DeliveryProgress) => void
}

export class EmailDeliveryError extends Error {}
