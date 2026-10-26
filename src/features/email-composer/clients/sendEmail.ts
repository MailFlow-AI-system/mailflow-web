import { getAttachmentSizeIssues } from '../schemas/compositionSchema'
import type { ValidatedComposition } from '../types/composer'

const failureMessage =
  'Não foi possível enviar o e-mail. Sua mensagem foi mantida. Tente novamente.'

function encodeAttachment(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error(failureMessage))
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.readAsDataURL(file)
  })
}

function embedInlineImages(document: Document) {
  const attachments: {
    filename: string
    content: string
    contentType: string
    contentId: string
  }[] = []
  const sources = new Map<string, string>()
  for (const image of document.querySelectorAll('img')) {
    const source = image.getAttribute('src') ?? ''
    if (!source.startsWith('data:')) continue
    let contentId = sources.get(source)
    if (!contentId) {
      const match = /^data:(image\/(png|jpeg|gif|webp));base64,([A-Za-z0-9+/]*={0,2})$/.exec(source)
      if (!match) throw new Error(failureMessage)
      const [, contentType, extension, content] = match
      if (!contentType || !content || !extension) throw new Error(failureMessage)
      contentId = `mailflow-inline-${attachments.length + 1}`
      sources.set(source, contentId)
      attachments.push({
        filename: `inline-image-${attachments.length + 1}.${extension}`,
        content,
        contentType,
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

export async function sendEmail(composition: ValidatedComposition, id: string) {
  try {
    const document = new DOMParser().parseFromString(composition.body, 'text/html')
    const inlineImages = embedInlineImages(document)
    const sizes = [
      ...composition.attachments.map(({ file }) => file.size),
      ...inlineImages.map(({ content }) => atob(content).length),
    ]
    if (getAttachmentSizeIssues(sizes).length || sizes.length > 100) throw new Error(failureMessage)
    const attachments = await Promise.all(
      composition.attachments.map(async ({ file }) => ({
        filename: file.name,
        content: await encodeAttachment(file),
      })),
    )
    const response = await fetch('/api/mail/send', {
      signal: AbortSignal.timeout(45_000),
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        id,
        to: composition.to,
        cc: composition.cc,
        bcc: composition.bcc,
        subject: composition.subject,
        html: document.body.innerHTML,
        text: getPlainText(document),
        attachments: [...attachments, ...inlineImages],
      }),
    })
    if (!response.ok) throw new Error(failureMessage)
    const result: unknown = await response.json()
    if (
      !result ||
      typeof result !== 'object' ||
      !('status' in result) ||
      result.status !== 'sent' ||
      !('id' in result) ||
      typeof result.id !== 'string'
    )
      throw new Error(failureMessage)
  } catch {
    throw new Error(failureMessage)
  }
}
