import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { FormProvider, useForm } from 'react-hook-form'
import { afterEach, describe, expect, it } from 'vitest'
import { ComposerContext } from '../context'
import { useComposerController } from '../hooks/useComposerController'
import { emptyDraft } from '../hooks/useDraftForm'
import type { ComposerContextValue } from '../types/composer'
import type { DraftValues } from '../types/DraftValues'
import { Footer } from './Footer'

afterEach(cleanup)

function ReadyComposer() {
  const draft = useForm<DraftValues>({ defaultValues: emptyDraft })
  const context = {
    revision: 0,
    sessionRef: { current: 0 },
    editor: null,
    addAttachments: () => {},
    removeAttachment: () => {},
    baselineDraftSignature: '',
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
    pendingRecipientFocusRef: { current: null },
    showCc: false,
    setShowCc: () => {},
    validation: {
      cancelWarnings: () => {},
      confirmWarnings: async () => {},
      invalidate: () => {},
      ready: true,
      reset: () => {},
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

function SavedComposer() {
  const controller = useComposerController('light')
  const file = new File(['report'], 'report.pdf')

  return (
    <FormProvider {...controller.draft}>
      <ComposerContext.Provider value={controller.context}>
        <Footer />
        <button
          type="button"
          onClick={() => controller.draft.setValue('attachments', [{ id: 'saved-file', file }])}
        >
          Add saved file
        </button>
        <button type="button" onClick={() => controller.draft.setValue('subject', 'Update')}>
          Edit subject
        </button>
        <button type="button" onClick={() => controller.draft.setValue('attachments', [])}>
          Remove saved file
        </button>
        <button
          type="button"
          onClick={() => controller.draft.setValue('attachments', [{ id: 'saved-file', file }])}
        >
          Restore saved file
        </button>
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

  it('refreshes the saved baseline on repeated saves and retains attachment ids', async () => {
    render(<SavedComposer />)
    fireEvent.click(screen.getByRole('button', { name: 'Add saved file' }))
    fireEvent.click(screen.getByRole('button', { name: 'Rascunho' }))
    expect(screen.getByRole('status')).toHaveTextContent('Rascunho nesta aba')

    fireEvent.click(screen.getByRole('button', { name: 'Edit subject' }))
    expect(screen.getByRole('status')).toHaveTextContent('Alterações não salvas')
    fireEvent.click(screen.getByRole('button', { name: 'Rascunho' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Rascunho nesta aba'))

    fireEvent.click(screen.getByRole('button', { name: 'Remove saved file' }))
    expect(screen.getByRole('status')).toHaveTextContent('Alterações não salvas')
    fireEvent.click(screen.getByRole('button', { name: 'Restore saved file' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Rascunho nesta aba'))
  })
})
