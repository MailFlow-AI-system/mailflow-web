import { describe, expect, it } from 'vitest'

import { compositionSchema } from './compositionSchema'

const validInput = {
  to: 'ada@example.test',
  cc: '',
  bcc: '',
  subject: 'Hello',
  body: '<p>Hello</p>',
  hasBodyContent: true,
  attachments: [],
}

describe('compositionSchema', () => {
  it('normalizes recipient lists and ignores empty segments', () => {
    const result = compositionSchema.safeParse({
      ...validInput,
      to: ' ada@example.test ; ; grace@example.test, ',
      cc: ' lin@example.test,',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.to).toEqual(['ada@example.test', 'grace@example.test'])
      expect(result.data.cc).toEqual(['lin@example.test'])
      expect(result.data.bcc).toEqual([])
      expect(result.data.attachments).toEqual([])
    }
  })

  it('requires at least one recipient across To, Cc, and Bcc', () => {
    const result = compositionSchema.safeParse({ ...validInput, to: ' ; , ', cc: '', bcc: '' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ path: ['to'], message: 'Adicione pelo menos um destinatário.' }),
      )
    }
  })

  it.each([
    ['cc', 'grace@example.test'],
    ['bcc', 'lin@example.test'],
  ] as const)('accepts a recipient in %s when To is empty', (field, address) => {
    const result = compositionSchema.safeParse({ ...validInput, to: '', [field]: address })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data[field]).toEqual([address])
  })

  it('validates every non-empty email address in recipient lists', () => {
    const result = compositionSchema.safeParse({
      ...validInput,
      to: 'ada@example.test, invalid-address',
      cc: 'also-invalid',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ['to'], message: 'Informe e-mails válidos.' }),
          expect.objectContaining({ path: ['cc'], message: 'Informe e-mails válidos.' }),
        ]),
      )
    }
  })

  it('rejects display-name address syntax', () => {
    const result = compositionSchema.safeParse({
      ...validInput,
      to: 'Ada Lovelace <ada@example.test>',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ path: ['to'], message: 'Informe e-mails válidos.' }),
      )
    }
  })

  it('accepts attachment sizes exactly at the individual and aggregate limits', () => {
    const result = compositionSchema.safeParse({
      ...validInput,
      attachments: [
        { id: 'first', name: 'first.pdf', size: 10 * 1024 * 1024 },
        { id: 'second', name: 'second.pdf', size: 10 * 1024 * 1024 },
        { id: 'third', name: 'third.pdf', size: 5 * 1024 * 1024 },
      ],
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.attachments.map(({ id }) => id)).toEqual(['first', 'second', 'third'])
    }
  })

  it('reports oversized attachments by index and a total-size issue', () => {
    const result = compositionSchema.safeParse({
      ...validInput,
      attachments: [
        { id: 'first', name: 'first.pdf', size: 10 * 1024 * 1024 },
        { id: 'too-large', name: 'large.pdf', size: 10 * 1024 * 1024 + 1 },
        { id: 'third', name: 'third.pdf', size: 5 * 1024 * 1024 },
      ],
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['attachments', 1],
            message: 'Cada anexo deve ter no máximo 10 MiB.',
          }),
          expect.objectContaining({
            path: ['attachments'],
            message: 'Os anexos devem somar no máximo 25 MiB.',
          }),
        ]),
      )
    }
  })

  it('reports total-size overflow when each attachment is individually valid', () => {
    const result = compositionSchema.safeParse({
      ...validInput,
      attachments: [
        { id: 'first', name: 'first.pdf', size: 9 * 1024 * 1024 },
        { id: 'second', name: 'second.pdf', size: 9 * 1024 * 1024 },
        { id: 'third', name: 'third.pdf', size: 8 * 1024 * 1024 + 1 },
      ],
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['attachments'],
          message: 'Os anexos devem somar no máximo 25 MiB.',
        }),
      )
      expect(result.error.issues.some((issue) => issue.path.length === 2)).toBe(false)
    }
  })

  it('keeps original attachment metadata order and body HTML', () => {
    const input = {
      ...validInput,
      body: '<p>  <img src="inline.png" /></p>',
      attachments: [{ id: 'asset-2', name: 'second.pdf', size: 2 }],
    }
    const result = compositionSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.body).toBe(input.body)
      expect(result.data.attachments).toEqual(input.attachments)
    }
  })
})
