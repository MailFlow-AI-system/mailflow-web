import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { FormProvider } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import { ComposerContext } from '../context'
import { useComposerController } from '../hooks/useComposerController'
import { Attachments } from './Attachments'

function fileWithSize(name: string, size: number) {
  const file = new File(['x'], name)
  Object.defineProperty(file, 'size', { value: size })
  return file
}

function AttachmentsHarness() {
  const controller = useComposerController('light')
  return (
    <FormProvider {...controller.draft}>
      <ComposerContext.Provider value={controller.context}>
        <Attachments />
        <button
          type="button"
          onClick={() => {
            controller.draft.setValue('attachments', [
              { id: 'first', file: fileWithSize('first.bin', 13 * 1024 * 1024) },
              { id: 'second', file: fileWithSize('second.bin', 13 * 1024 * 1024) },
            ])
            void controller.draft.trigger('attachments')
          }}
        >
          Validate attachments
        </button>
      </ComposerContext.Provider>
    </FormProvider>
  )
}

describe('attachment validation presentation', () => {
  it('shows indexed and aggregate RHF attachment errors together', async () => {
    render(<AttachmentsHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Validate attachments' }))

    const alert = await screen.findByRole('alert')
    await waitFor(() => expect(alert.querySelectorAll('li')).toHaveLength(3))
    expect(alert).toHaveTextContent('Anexo 1:')
    expect(alert).toHaveTextContent('Anexo 2:')
    expect(alert).toHaveTextContent('25 MiB')

    fireEvent.click(screen.getByRole('button', { name: 'Remover first.bin' }))
    await waitFor(() => expect(alert.querySelectorAll('li')).toHaveLength(1))
    expect(alert).toHaveTextContent('Anexo 1:')
    expect(alert).not.toHaveTextContent('25 MiB')

    fireEvent.click(screen.getByRole('button', { name: 'Remover second.bin' }))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })
})
