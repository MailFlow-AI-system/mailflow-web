import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { FormProvider } from 'react-hook-form'
import { afterEach, describe, expect, it } from 'vitest'
import { ComposerContext } from '../context'
import { useComposerController } from './useComposerController'
import { useDraftStatus } from './useDraftStatus'

afterEach(cleanup)

function DraftStatusHarness() {
  const controller = useComposerController('light')
  return (
    <FormProvider {...controller.draft}>
      <ComposerContext.Provider value={controller.context}>
        <DraftStatus />
        <button
          type="button"
          onClick={() => controller.context.editor?.commands.insertContent('First edit')}
        >
          Edit body
        </button>
        <button
          type="button"
          onClick={() => controller.context.editor?.commands.insertContent(' again')}
        >
          Edit body again
        </button>
        <button
          type="button"
          onClick={() => controller.context.editor?.commands.setContent('<p></p>')}
        >
          Undo body
        </button>
        <button type="button" onClick={() => controller.draft.setValue('subject', 'Changed')}>
          Edit subject
        </button>
        <button type="button" onClick={() => controller.draft.setValue('subject', '')}>
          Undo subject
        </button>
        <button
          type="button"
          onClick={() =>
            controller.draft.setValue('attachments', [
              { id: 'saved-file', file: new File(['report'], 'report.pdf') },
            ])
          }
        >
          Set saved attachment
        </button>
        <button type="button" onClick={() => controller.context.saveDraft()}>
          Save current draft
        </button>
        <button type="button" onClick={() => controller.draft.setValue('attachments', [])}>
          Remove attachment
        </button>
        <button
          type="button"
          onClick={() =>
            controller.draft.setValue('attachments', [
              { id: 'saved-file', file: new File(['report'], 'report.pdf') },
            ])
          }
        >
          Restore attachment
        </button>
      </ComposerContext.Provider>
    </FormProvider>
  )
}

function DraftStatus() {
  const { dirty, saved } = useDraftStatus()
  return (
    <output data-testid="draft-status">
      {dirty ? 'dirty' : 'clean'}; {saved ? 'saved' : 'not saved'}
    </output>
  )
}

describe('useDraftStatus', () => {
  it('tracks every body edit and becomes clean when body or fields return to baseline', async () => {
    render(<DraftStatusHarness />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit body' })).toBeEnabled())

    fireEvent.click(screen.getByRole('button', { name: 'Edit body' }))
    expect(screen.getByTestId('draft-status')).toHaveTextContent('dirty')
    fireEvent.click(screen.getByRole('button', { name: 'Edit body again' }))
    expect(screen.getByTestId('draft-status')).toHaveTextContent('dirty')
    fireEvent.click(screen.getByRole('button', { name: 'Undo body' }))
    await waitFor(() => expect(screen.getByTestId('draft-status')).toHaveTextContent('clean'))

    fireEvent.click(screen.getByRole('button', { name: 'Edit subject' }))
    expect(screen.getByTestId('draft-status')).toHaveTextContent('dirty')
    fireEvent.click(screen.getByRole('button', { name: 'Undo subject' }))
    expect(screen.getByTestId('draft-status')).toHaveTextContent('clean')
  })

  it('compares attachment ids with the saved File baseline', () => {
    render(<DraftStatusHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Set saved attachment' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save current draft' }))
    expect(screen.getByTestId('draft-status')).toHaveTextContent('clean; saved')

    fireEvent.click(screen.getByRole('button', { name: 'Remove attachment' }))
    expect(screen.getByTestId('draft-status')).toHaveTextContent('dirty; saved')
    fireEvent.click(screen.getByRole('button', { name: 'Restore attachment' }))
    expect(screen.getByTestId('draft-status')).toHaveTextContent('clean; saved')
  })
})
