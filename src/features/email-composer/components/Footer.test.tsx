import { render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import { ComposerContext } from '../context'
import { emptyDraft } from '../hooks/useDraftForm'
import type { ComposerContextValue } from '../types/composer'
import type { DraftValues } from '../types/DraftValues'
import { Footer } from './Footer'

function ReadyComposer() {
  const draft = useForm<DraftValues>({ defaultValues: emptyDraft })
  const baselineFieldsRef = useRef('')
  const context = {
    revision: 0,
    sessionRef: { current: 0 },
    editor: null,
    addAttachments: () => {},
    removeAttachment: () => {},
    bodyDirty: true,
    baselineFieldsRef,
    saved: false,
    saveDraft: () => {},
    confirm: false,
    setConfirm: () => {},
    discard: () => {},
    state: 'normal',
    theme: 'light',
    triggerRef: { current: null },
    recipientRef: { current: null },
    ccRef: { current: null },
    bccRef: { current: null },
    attachmentTriggerRef: { current: null },
    attachmentErrorId: 'attachment-errors',
    showCc: false,
    setShowCc: () => {},
    validation: {
      attachmentIssues: [],
      cancelWarnings: () => {},
      confirmWarnings: async () => {},
      errorMessage: null,
      invalidate: () => {},
      ready: true,
      reset: () => {},
      submitting: false,
      validate: async () => {},
      validateAttachments: () => {},
      warnings: [],
      warningsOpen: false,
    },
  } as unknown as ComposerContextValue

  return (
    <FormProvider {...draft}>
      <ComposerContext.Provider value={context}>
        <Footer />
      </ComposerContext.Provider>
    </FormProvider>
  )
}

describe('composer footer', () => {
  it('shows ready status even when draft fields or body remain dirty', () => {
    render(<ReadyComposer />)

    expect(screen.getByRole('status')).toHaveTextContent(
      'Mensagem pronta; envio ainda indisponível',
    )
    expect(screen.getByRole('button', { name: 'Mensagem pronta' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Agendar envio' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Rascunho' })).toBeVisible()
  })
})
