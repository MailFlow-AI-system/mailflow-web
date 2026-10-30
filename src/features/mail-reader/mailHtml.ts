import createDOMPurify from 'dompurify'
import type { MailAttachment } from './mailDetail'

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ??
      character,
  )
}

export function linkifyMailText(text: string) {
  const parts: string[] = []
  let position = 0
  for (const match of text.matchAll(/https?:\/\/[^\s<>"']+/gi)) {
    const url = match[0].replace(/[.,;:!?)}\]]+$/, '')
    parts.push(escapeHtml(text.slice(position, match.index)))
    parts.push(
      `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`,
    )
    position = match.index + url.length
  }
  parts.push(escapeHtml(text.slice(position)))
  return `<div style="white-space:pre-wrap;overflow-wrap:anywhere">${parts.join('')}</div>`
}

export function createMailDocument(html: string, attachments: MailAttachment[]) {
  const purifier = createDOMPurify(window)
  purifier.addHook('uponSanitizeAttribute', (node, attribute) => {
    if (attribute.attrName === 'href') {
      attribute.keepAttr =
        node.nodeName === 'A' && /^(https?:|mailto:)/i.test(attribute.attrValue.trim())
    }
    if (attribute.attrName === 'src') {
      const cid = /^cid:(.*)$/i.exec(attribute.attrValue.trim())
      if (cid) {
        const attachment = attachments.find(
          (item) => item.contentId?.replace(/^<|>$/g, '') === cid[1],
        )
        attribute.keepAttr = Boolean(attachment?.contentType.startsWith('image/'))
        if (attachment && attribute.keepAttr)
          attribute.attrValue = `/api/mail/attachments/${encodeURIComponent(attachment.id)}/inline`
      } else {
        attribute.keepAttr =
          node.nodeName === 'IMG' &&
          /^(https?:\/\/|data:image\/(png|jpeg|gif|webp);base64,)/i.test(attribute.attrValue.trim())
      }
    }
  })
  purifier.addHook('afterSanitizeAttributes', (node) => {
    if (node.nodeName === 'A' && node.hasAttribute('href')) {
      node.setAttribute('target', '_blank')
      node.setAttribute('rel', 'noopener noreferrer')
    }
  })
  const clean = purifier.sanitize(html, {
    WHOLE_DOCUMENT: true,
    USE_PROFILES: { html: true },
    ADD_TAGS: ['style'],
    FORBID_TAGS: [
      'script',
      'iframe',
      'form',
      'input',
      'button',
      'textarea',
      'select',
      'object',
      'embed',
      'base',
      'meta',
      'link',
      'audio',
      'video',
    ],
    FORBID_ATTR: ['srcset', 'action', 'formaction', 'background', 'ping', 'autofocus'],
  })
  // The sandbox and CSP also constrain email CSS, which DOMPurify intentionally preserves.
  const policy = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' https: http: data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none';"><meta name="referrer" content="no-referrer"><style>html{color-scheme:light}body{margin:0;font-family:Arial,sans-serif;font-size:14px;line-height:1.625;overflow-wrap:anywhere}img{max-width:100%;height:auto}a{color:#2563eb}</style>`
  return clean.replace('<head>', `<head>${policy}`)
}
