import { describe, expect, it } from 'vitest'

import { emptyBody, emptyFields } from '../draft'
import { draftSchema } from './draftSchema'

const emptyDraft = { ...emptyFields, body: emptyBody, attachments: [] }
const mib = 1024 * 1024

function fileWithSize(name: string, size: number): File {
  const file = new File([], name)
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('draftSchema', () => {
  it('accepts an empty draft and a valid recipient list', () => {
    expect(draftSchema.safeParse(emptyDraft).success).toBe(true)
    expect(draftSchema.safeParse({ ...emptyDraft, to: 'ada@example.test' }).success).toBe(true)
    expect(
      draftSchema.safeParse({ ...emptyDraft, to: 'ada@example.test; grace@example.test' }).success,
    ).toBe(true)
  })

  it('rejects an invalid recipient and keeps subject and body unconstrained', () => {
    expect(draftSchema.safeParse({ ...emptyDraft, cc: 'not-an-email' }).success).toBe(false)
    expect(
      draftSchema.safeParse({ ...emptyDraft, cc: 'ada@example.test, not-an-email' }).success,
    ).toBe(false)
    expect(
      draftSchema.safeParse({ ...emptyDraft, subject: 'Hello', body: '<p>Hi</p>' }).success,
    ).toBe(true)
  })

  it('accepts attachments exactly at the individual and aggregate limits', () => {
    const result = draftSchema.safeParse({
      ...emptyDraft,
      attachments: [
        { id: 'first', file: fileWithSize('first.pdf', 10 * mib) },
        { id: 'second', file: fileWithSize('second.pdf', 10 * mib) },
        { id: 'third', file: fileWithSize('third.pdf', 5 * mib) },
      ],
    })

    expect(result.success).toBe(true)
  })

  it('reports an oversized attachment with its array index', () => {
    const result = draftSchema.safeParse({
      ...emptyDraft,
      attachments: [
        { id: 'first', file: fileWithSize('first.pdf', 10 * mib) },
        { id: 'too-large', file: fileWithSize('large.pdf', 10 * mib + 1) },
      ],
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['attachments', 1],
          message: 'Cada anexo deve ter no máximo 10 MiB.',
        }),
      )
    }
  })

  it('reports aggregate overflow at the attachments path for individually valid files', () => {
    const result = draftSchema.safeParse({
      ...emptyDraft,
      attachments: [
        { id: 'first', file: fileWithSize('first.pdf', 9 * mib) },
        { id: 'second', file: fileWithSize('second.pdf', 9 * mib) },
        { id: 'third', file: fileWithSize('third.pdf', 7 * mib + 1) },
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
      expect(result.error.issues.some((issue) => issue.path.length > 1)).toBe(false)
    }
  })
})
