import { zodResolver } from '@hookform/resolvers/zod'
import type { ResolverOptions } from 'react-hook-form'
import { describe, expect, it } from 'vitest'

import { emptyBody, emptyFields } from '../draft'
import type { DraftValues } from '../types/DraftValues'
import { draftSchema } from './draftSchema'

const mib = 1024 * 1024
const resolver = zodResolver(draftSchema)
const resolverOptions: ResolverOptions<DraftValues> = {
  criteriaMode: 'firstError',
  fields: {},
  names: [],
  shouldUseNativeValidation: false,
}

function fileWithSize(name: string, size: number): File {
  const file = new File([], name)
  Object.defineProperty(file, 'size', { value: size })
  return file
}

function draftWithSizes(...sizes: number[]): DraftValues {
  return {
    ...emptyFields,
    body: emptyBody,
    attachments: sizes.map((size, index) => ({
      id: `attachment-${index}`,
      file: fileWithSize(`attachment-${index}.pdf`, size),
    })),
  }
}

async function resolveDraft(values: DraftValues) {
  return resolver(values, undefined, resolverOptions)
}

describe('draft zodResolver attachment errors', () => {
  it('places an individual size error on the attachment file field', async () => {
    const result = await resolveDraft(draftWithSizes(9 * mib, 10 * mib + 1))

    expect(result.errors.attachments?.[1]).toMatchObject({
      file: { message: 'Cada anexo deve ter no máximo 10 MiB.' },
    })
  })

  it('places aggregate overflow on the attachment array root', async () => {
    const result = await resolveDraft(draftWithSizes(9 * mib, 9 * mib, 7 * mib + 1))

    expect(result.errors.attachments).toMatchObject({
      root: { message: 'Os anexos devem somar no máximo 25 MiB.' },
    })
  })

  it('keeps individual and aggregate errors together', async () => {
    const result = await resolveDraft(draftWithSizes(10 * mib, 10 * mib + 1, 5 * mib))

    expect(result.errors.attachments).toMatchObject({
      1: { file: { message: 'Cada anexo deve ter no máximo 10 MiB.' } },
      root: { message: 'Os anexos devem somar no máximo 25 MiB.' },
    })
  })

  it('clears attachment errors after corrected values pass validation', async () => {
    const invalid = await resolveDraft(draftWithSizes(9 * mib, 10 * mib + 1))
    expect(invalid.errors.attachments?.[1]).toBeDefined()

    const corrected = await resolveDraft(draftWithSizes(9 * mib, 10 * mib))
    expect(corrected.errors).toEqual({})
  })
})
