import { describe, expect, it } from 'vitest'

import { emptyBody, emptyFields } from '../draft'
import { draftSchema } from './draftSchema'

const emptyDraft = { ...emptyFields, body: emptyBody, attachments: [] }

describe('draftSchema', () => {
  it('accepts an empty draft and a valid recipient', () => {
    expect(draftSchema.safeParse(emptyDraft).success).toBe(true)
    expect(draftSchema.safeParse({ ...emptyDraft, to: 'ada@example.test' }).success).toBe(true)
  })

  it('rejects an invalid recipient and keeps subject and body unconstrained', () => {
    expect(draftSchema.safeParse({ ...emptyDraft, cc: 'not-an-email' }).success).toBe(false)
    expect(
      draftSchema.safeParse({ ...emptyDraft, subject: 'Hello', body: '<p>Hi</p>' }).success,
    ).toBe(true)
  })
})
