import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { FormProvider } from 'react-hook-form'
import { afterEach, describe, expect, it } from 'vitest'
import { ComposerContext } from '../context'
import { useComposerController } from '../hooks/useComposerController'
import { Fields } from './Fields'

afterEach(cleanup)

function FieldsHarness() {
  const controller = useComposerController('light')
  return (
    <FormProvider {...controller.draft}>
      <ComposerContext.Provider value={controller.context}>
        <Fields />
        <button
          type="button"
          onClick={() => {
            controller.draft.setValue('to', 'ada@example.test')
            controller.draft.setValue('cc', 'invalid-address')
            controller.draft.setValue('subject', 'Update')
            void controller.context.validation.validate()
          }}
        >
          Validate message
        </button>
        <button
          type="button"
          onClick={() => {
            controller.draft.setValue('to', 'ada@example.test')
            controller.draft.setValue('bcc', 'invalid-address')
            controller.draft.setValue('subject', 'Update')
            void controller.context.validation.validate()
          }}
        >
          Validate Bcc
        </button>
      </ComposerContext.Provider>
    </FormProvider>
  )
}

describe('recipient validation focus', () => {
  it('reveals and focuses a hidden Cc field with its accessible error', async () => {
    render(<FieldsHarness />)
    expect(screen.queryByLabelText('Cc')).not.toBeInTheDocument()

    act(() => fireEvent.click(screen.getByRole('button', { name: 'Validate message' })))

    const cc = await screen.findByLabelText('Cc')
    await waitFor(() => expect(cc).toHaveFocus())
    expect(cc).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Informe e-mails válidos.')
  })

  it('reveals and focuses hidden Bcc after each corrected validation attempt', async () => {
    render(<FieldsHarness />)
    expect(screen.queryByLabelText('Bcc')).not.toBeInTheDocument()

    act(() => fireEvent.click(screen.getByRole('button', { name: 'Validate Bcc' })))

    const bcc = await screen.findByLabelText('Bcc')
    await waitFor(() => expect(bcc).toHaveFocus())
    expect(bcc).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Informe e-mails válidos.')

    act(() => fireEvent.change(bcc, { target: { value: 'grace@example.test' } }))
    await waitFor(() => expect(bcc).toHaveAttribute('aria-invalid', 'false'))

    act(() => {
      fireEvent.change(bcc, { target: { value: 'still-invalid' } })
      fireEvent.click(screen.getByRole('button', { name: 'Validate Bcc' }))
    })
    await waitFor(() => expect(bcc).toHaveFocus())
    expect(bcc).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Informe e-mails válidos.')
  })
})
