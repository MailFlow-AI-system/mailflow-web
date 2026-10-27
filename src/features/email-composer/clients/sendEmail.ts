import { z } from 'zod'
import { getAttachmentSizeIssues } from '../schemas/compositionSchema'
import type { ValidatedComposition } from '../types/composer'
import { type EmailDeliveryContext, EmailDeliveryError } from '../types/EmailDelivery'
import { mailRequestFailure, resolveDeliveryScope } from './mailContext'

const failureMessage =
  'Não foi possível enviar o e-mail. Sua mensagem foi mantida. Tente novamente.'
const verificationFailure =
  'Não foi possível verificar os arquivos. Sua mensagem foi mantida. Tente novamente.'
const uncertainDelivery =
  'Não foi possível confirmar o envio anterior. Sua mensagem foi mantida. Verifique a pasta Enviados antes de tentar outro envio.'
class MissingAttachmentError extends EmailDeliveryError {}
const reservationSchema = z.object({
  id: z.uuid(),
  uploadUrl: z.url().refine((value) => {
    const url = new URL(value)
    return (
      !url.username &&
      !url.password &&
      !url.hash &&
      (url.protocol === 'https:' ||
        (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))
    )
  }),
  headers: z
    .record(z.string(), z.string())
    .refine((headers) =>
      Object.keys(headers).every((name) =>
        ['content-type', 'x-amz-checksum-sha256', 'x-amz-meta-sha256'].includes(name.toLowerCase()),
      ),
    ),
  expiresAt: z.iso.datetime(),
})
const verifiedSchema = z.object({
  id: z.uuid(),
  status: z.enum(['pending', 'clean', 'rejected', 'error', 'deleting', 'expired']),
  attachmentExpiresAt: z.iso.datetime(),
  associated: z.boolean(),
  filename: z.string(),
  contentType: z.string(),
  size: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  rejectionReason: z
    .enum(['unsupported_archive', 'unsafe_archive', 'checksum_mismatch', 'infected'])
    .nullable()
    .optional(),
})

type LocalAttachment = { key: string; file: File; contentId?: string }

function readFile(file: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new EmailDeliveryError(failureMessage))
    reader.onload = () =>
      reader.result instanceof ArrayBuffer
        ? resolve(reader.result)
        : reject(new EmailDeliveryError(failureMessage))
    reader.readAsArrayBuffer(file)
  })
}

function embedInlineImages(document: Document): LocalAttachment[] {
  const attachments: LocalAttachment[] = []
  const sources = new Map<string, string>()
  for (const image of document.querySelectorAll('img')) {
    const source = image.getAttribute('src') ?? ''
    if (!source.startsWith('data:')) continue
    let contentId = sources.get(source)
    if (!contentId) {
      const match = /^data:(image\/(png|jpeg|gif|webp));base64,([A-Za-z0-9+/]*={0,2})$/.exec(source)
      if (!match) throw new EmailDeliveryError(failureMessage)
      const [, contentType, extension, content] = match
      if (!contentType || !content || !extension) throw new EmailDeliveryError(failureMessage)
      const bytes = Uint8Array.from(atob(content), (character) => character.charCodeAt(0))
      contentId = `mailflow-inline-${attachments.length + 1}`
      sources.set(source, contentId)
      attachments.push({
        key: contentId,
        file: new File([bytes], `inline-image-${attachments.length + 1}.${extension}`, {
          type: contentType,
        }),
        contentId,
      })
    }
    image.setAttribute('src', `cid:${contentId}`)
  }
  return attachments
}

function getPlainText(document: Document) {
  const body = document.body.cloneNode(true) as HTMLElement
  for (const lineBreak of body.querySelectorAll('br')) lineBreak.replaceWith('\n')
  for (const block of [...body.querySelectorAll('p, li, div')].reverse()) {
    if (!block.textContent?.endsWith('\n')) block.append('\n')
  }
  return body.textContent?.trim() ?? ''
}

async function attachmentRequest(path: string, headers: Record<string, string>, body?: unknown) {
  const response = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
    signal: AbortSignal.timeout(45_000),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  if (response.status === 404) {
    const problem: unknown = await response.clone().json()
    if (
      problem &&
      typeof problem === 'object' &&
      'code' in problem &&
      problem.code === 'attachment_not_found'
    )
      throw new MissingAttachmentError(verificationFailure)
  }
  if (!response.ok) throw await mailRequestFailure(response, verificationFailure)
  return response.json() as Promise<unknown>
}

async function upload(
  attachment: LocalAttachment,
  context: EmailDeliveryContext,
  completed: number,
  total: number,
  headers: Record<string, string>,
) {
  const contentType = attachment.file.type || 'application/octet-stream'
  const bytes = await readFile(attachment.file)
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes))
  const sha256 = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
  const metadata = {
    filename: attachment.file.name,
    contentType,
    size: attachment.file.size,
    sha256,
  }
  const key = JSON.stringify({ scope: context.scope.current, key: attachment.key, ...metadata })
  for (let attempt = 0; attempt < 2; attempt++) {
    let reservation = context.uploads.get(key)
    if (reservation && !reservation.uploaded && Date.parse(reservation.expiresAt) <= Date.now()) {
      context.uploads.delete(key)
      reservation = undefined
    }
    if (!reservation) {
      reservation = {
        ...reservationSchema.parse(
          await attachmentRequest('/api/mail/attachments', headers, metadata),
        ),
        uploaded: false,
        clean: false,
      }
      context.uploads.set(key, reservation)
    }
    if (!reservation.uploaded) {
      context.onProgress?.({ phase: 'uploading', completed, total })
      const response = await fetch(reservation.uploadUrl, {
        method: 'PUT',
        headers: reservation.headers,
        body: attachment.file,
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        redirect: 'error',
        signal: AbortSignal.timeout(90_000),
      })
      if (!response.ok)
        throw new EmailDeliveryError(
          'Não foi possível salvar os arquivos. Sua mensagem foi mantida. Tente novamente.',
        )
      reservation.uploaded = true
    }
    if (
      !reservation.clean ||
      !reservation.attachmentExpiresAt ||
      Date.parse(reservation.attachmentExpiresAt) <= Date.now()
    ) {
      context.onProgress?.({ phase: 'verifying', completed, total })
      let verified: z.infer<typeof verifiedSchema>
      try {
        verified = verifiedSchema.parse(
          await attachmentRequest(
            `/api/mail/attachments/${reservation.id}${reservation.clean ? '' : '/complete'}`,
            headers,
            reservation.clean ? undefined : {},
          ),
        )
      } catch (error) {
        if (!(error instanceof MissingAttachmentError)) throw error
        if (reservation.sendAttempted) throw new EmailDeliveryError(uncertainDelivery)
        context.uploads.delete(key)
        continue
      }
      if (
        verified.id !== reservation.id ||
        verified.filename !== metadata.filename ||
        verified.contentType !== contentType ||
        verified.size !== metadata.size ||
        verified.sha256 !== sha256
      )
        throw new EmailDeliveryError(verificationFailure)
      reservation.attachmentExpiresAt = verified.attachmentExpiresAt
      if (verified.status === 'expired' && !verified.associated) {
        if (reservation.sendAttempted) throw new EmailDeliveryError(uncertainDelivery)
        context.uploads.delete(key)
        continue
      }
      if (verified.status === 'rejected') {
        const message =
          verified.rejectionReason === 'unsupported_archive'
            ? 'O formato compactado não é suportado. Anexe o arquivo em formato ZIP.'
            : verified.rejectionReason === 'unsafe_archive'
              ? 'O arquivo compactado excede os limites de verificação. Reduza seu tamanho ou a quantidade de pastas e arquivos.'
              : verified.rejectionReason === 'checksum_mismatch'
                ? 'O arquivo salvo não corresponde ao original. Remova e anexe o arquivo novamente.'
                : 'Um arquivo não foi aprovado na verificação. Remova ou substitua o arquivo antes de enviar.'
        throw new EmailDeliveryError(message)
      }
      if (verified.status !== 'clean') throw new EmailDeliveryError(verificationFailure)
      reservation.clean = true
    }
    return {
      id: reservation.id,
      ...(attachment.contentId ? { contentId: attachment.contentId } : {}),
    }
  }
  throw new EmailDeliveryError(verificationFailure)
}

export async function sendEmail(
  composition: ValidatedComposition,
  id: string,
  context: EmailDeliveryContext = { uploads: new Map(), scope: { current: null } },
) {
  try {
    const document = new DOMParser().parseFromString(composition.body, 'text/html')
    const inlineImages = embedInlineImages(document)
    const files: LocalAttachment[] = [
      ...composition.attachments.map(({ id, file }) => ({ key: `file:${id}`, file })),
      ...inlineImages,
    ]
    if (getAttachmentSizeIssues(files.map(({ file }) => file.size)).length) {
      throw new EmailDeliveryError(
        'Use até 10 arquivos, com no máximo 10 MB por arquivo e 20 MB no total, incluindo imagens. Sua mensagem foi mantida.',
      )
    }
    const scope = await resolveDeliveryScope(context)
    const headers = { 'X-Workspace-Id': scope.workspace.id, 'X-Workspace-Identity': scope.userId }
    const attachments = []
    for (const [index, attachment] of files.entries()) {
      attachments.push(await upload(attachment, context, index, files.length, headers))
    }
    await resolveDeliveryScope(context)
    context.onProgress?.({ phase: 'sending', completed: files.length, total: files.length })
    const attachmentIds = new Set(attachments.map((attachment) => attachment.id))
    // A timeout cannot prove that Core or the provider rejected this immutable delivery.
    for (const reservation of context.uploads.values()) {
      if (attachmentIds.has(reservation.id)) reservation.sendAttempted = true
    }
    const response = await fetch('/api/mail/send', {
      signal: AbortSignal.timeout(45_000),
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
      body: JSON.stringify({
        id,
        to: composition.to,
        cc: composition.cc,
        bcc: composition.bcc,
        ...(composition.recipientName ? { recipientName: composition.recipientName } : {}),
        subject: composition.subject,
        html: document.body.innerHTML,
        text: getPlainText(document),
        attachments,
      }),
    })
    if (!response.ok) throw await mailRequestFailure(response, failureMessage)
    const result: unknown = await response.json()
    if (
      !result ||
      typeof result !== 'object' ||
      !('status' in result) ||
      result.status !== 'sent' ||
      !('id' in result) ||
      typeof result.id !== 'string'
    )
      throw new EmailDeliveryError(failureMessage)
  } catch (error) {
    if (error instanceof EmailDeliveryError) throw error
    throw new EmailDeliveryError(failureMessage)
  }
}
