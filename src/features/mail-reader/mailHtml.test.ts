import { describe, expect, it } from 'vitest'
import { createMailDocument, linkifyMailText } from './mailHtml'

const attachment = {
  id: 'attachment-1',
  filename: 'logo.png',
  contentType: 'image/png',
  size: 42,
  contentId: '<logo>',
}

describe('mail HTML isolation', () => {
  it('preserves email layout and image dimensions while resolving known CID images', () => {
    const html = createMailDocument(
      '<style>td{color:red}</style><table><tr><td>Welcome<img src="cid:logo" width="120" height="60"></td></tr></table>',
      [attachment],
    )
    const doc = new DOMParser().parseFromString(html, 'text/html')
    expect(doc.querySelector('table td')?.textContent).toBe('Welcome')
    expect([...doc.querySelectorAll('style')].map((style) => style.textContent).join('')).toContain(
      'color:red',
    )
    expect(doc.querySelector('img')?.getAttribute('src')).toBe(
      '/api/mail/attachments/attachment-1/inline',
    )
    expect(doc.querySelector('img')?.getAttribute('width')).toBe('120')
    expect(doc.querySelector('img')?.getAttribute('height')).toBe('60')
  })

  it('removes executable content, forms, navigation and unsafe URLs', () => {
    const html = createMailDocument(
      '<script>alert(1)</script><iframe src="https://evil.test"></iframe><form action="/api/mail/send"><input></form><meta http-equiv="refresh" content="0;url=https://evil.test"><a href="javascript:alert(1)">Bad</a><img src="/api/auth/sign-out" onerror="alert(1)"><img src="cid:unknown"><a href="https://example.test">Good</a>',
      [],
    )
    const doc = new DOMParser().parseFromString(html, 'text/html')
    expect(
      doc.querySelector('script,iframe,form,input,[onerror],meta[http-equiv="refresh"]'),
    ).toBeNull()
    expect(doc.querySelector('a')?.hasAttribute('href')).toBe(false)
    expect([...doc.querySelectorAll('img')].every((img) => !img.hasAttribute('src'))).toBe(true)
    const link = doc.querySelectorAll('a')[1]
    expect(link?.getAttribute('target')).toBe('_blank')
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer')
    expect(
      doc.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content'),
    ).toContain("default-src 'none'")
  })

  it('escapes plain text and links only external HTTP URLs', () => {
    const html = linkifyMailText(
      '<img onerror=alert(1)> https://example.test/path?x=1&y=2. javascript:alert(1)',
    )
    const doc = new DOMParser().parseFromString(html, 'text/html')
    expect(doc.querySelector('img')).toBeNull()
    expect(doc.querySelectorAll('a')).toHaveLength(1)
    expect(doc.querySelector('a')?.getAttribute('href')).toBe('https://example.test/path?x=1&y=2')
    expect(doc.body.textContent).toContain('<img onerror=alert(1)>')
  })
})
