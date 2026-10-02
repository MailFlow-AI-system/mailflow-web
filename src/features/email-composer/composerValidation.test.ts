import { describe, expect, it } from 'vitest'

import { validateComposition } from './composerValidation'

const validInput = {
  to: 'ada@example.test',
  cc: '',
  bcc: '',
  subject: 'Hello',
  body: '<p>Hello</p>',
  hasBodyContent: true,
  attachments: [{ id: 'asset-1', name: 'report.pdf', size: 1024 }],
}

describe('validateComposition', () => {
  it('returns normalized composition and no warnings for valid content', () => {
    const result = validateComposition({
      ...validInput,
      to: ' ada@example.test; grace@example.test, ',
      subject: ' Hello ',
      body: '<p>  Hello</p>',
    })

    expect(result).toEqual({
      success: true,
      issues: [],
      warnings: [],
      composition: {
        to: ['ada@example.test', 'grace@example.test'],
        cc: [],
        bcc: [],
        subject: ' Hello ',
        body: '<p>  Hello</p>',
        attachments: validInput.attachments,
      },
    })
  })

  it('returns all independent warnings with reusable codes and messages', () => {
    const result = validateComposition({
      ...validInput,
      subject: '  ',
      body: '<p><br></p>',
      hasBodyContent: false,
    })

    expect(result.success).toBe(true)
    expect(result.warnings).toEqual([
      {
        code: 'empty-subject',
        field: 'subject',
        message: 'O assunto está vazio. Deseja continuar mesmo assim?',
      },
      {
        code: 'empty-body',
        field: 'body',
        message: 'O corpo do e-mail está vazio. Deseja continuar mesmo assim?',
      },
    ])
  })

  it('returns blocking issues and warnings together when both apply', () => {
    const result = validateComposition({
      ...validInput,
      to: '',
      subject: '',
      hasBodyContent: false,
    })

    expect(result.success).toBe(false)
    expect(result.issues).toContainEqual({
      field: 'to',
      message: 'Adicione pelo menos um destinatário.',
    })
    expect(result.warnings.map(({ code }) => code)).toEqual(['empty-subject', 'empty-body'])
  })

  it('does not return a composition while blocking issues exist', () => {
    const result = validateComposition({ ...validInput, to: 'bad-address' })

    expect(result.success).toBe(false)
    expect('composition' in result).toBe(false)
  })
})
