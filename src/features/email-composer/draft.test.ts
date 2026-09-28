import { expect, it } from 'vitest'
import { draftSignature, emptyBody, emptyFields } from './draft'

it('detects body formatting, hidden recipients and attachment removal and becomes clean when reverted', () => {
  const baseline = draftSignature(emptyFields, emptyBody, [])
  expect(draftSignature({ ...emptyFields, bcc: 'hidden@example.com' }, emptyBody, [])).not.toBe(
    baseline,
  )
  expect(draftSignature(emptyFields, '<p><strong>Text</strong></p>', [])).not.toBe(baseline)
  const attachment = { id: 'test', file: new File(['test'], 'test.txt') }
  expect(draftSignature(emptyFields, emptyBody, [attachment])).not.toBe(baseline)
  expect(draftSignature({ ...emptyFields }, emptyBody, [])).toBe(baseline)
})
