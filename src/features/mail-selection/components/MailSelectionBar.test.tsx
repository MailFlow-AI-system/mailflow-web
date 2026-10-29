import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { useMailSelection } from '../hooks/useMailSelection'
import { MailSelectionBar } from './MailSelectionBar'
import { MailSelectionProvider } from './MailSelectionProvider'

const visibleIds = ['a', 'b', 'c']

type BarProps = {
  ids?: string[]
  disabled?: boolean
  hiddenReason?: string
  controls?: string
  touch?: boolean
}

function Bar({ ids = visibleIds, disabled = false, hiddenReason, controls, touch }: BarProps) {
  const selection = useMailSelection()
  if (!selection) return null
  return (
    <>
      <MailSelectionBar
        disabled={disabled}
        heading="Inbox"
        selection={selection}
        visibleIds={ids}
        {...(hiddenReason ? { hiddenReason } : {})}
        {...(controls ? { controls } : {})}
        {...(touch ? { touch } : {})}
      />
      <button onClick={() => selection.setSelected('a', true)} type="button">
        pick a
      </button>
    </>
  )
}

function renderBar(props?: BarProps) {
  return render(
    <MailSelectionProvider>
      <Bar {...props} />
    </MailSelectionProvider>,
  )
}

const selectAll = () => screen.getByRole('checkbox', { name: 'Select all loaded messages' })

describe('MailSelectionBar', () => {
  afterEach(cleanup)

  it('shows the mailbox title next to an unchecked Select all and no selection controls', () => {
    renderBar()

    const heading = screen.getByRole('heading', { level: 1, name: 'Inbox' })
    expect(heading).not.toHaveClass('sr-only')
    expect(selectAll()).toHaveAttribute('aria-checked', 'false')
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear selection' })).not.toBeInTheDocument()
  })

  it('turns the title row into the selection bar when messages are selected', async () => {
    const user = userEvent.setup()
    renderBar()

    await user.click(selectAll())

    expect(selectAll()).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('3 selected')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear selection' })).toBeInTheDocument()
    // The heading stays in the document for assistive technology, hidden visually.
    expect(screen.getByRole('heading', { level: 1, name: 'Inbox' })).toHaveClass('sr-only')
  })

  it('shows the mixed state for a partial selection and completes it on the next click', async () => {
    const user = userEvent.setup()
    renderBar()

    await user.click(screen.getByRole('button', { name: 'pick a' }))
    expect(selectAll()).toHaveAttribute('aria-checked', 'mixed')
    expect(screen.getByText('1 selected')).toBeInTheDocument()

    await user.click(selectAll())
    expect(selectAll()).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('3 selected')).toBeInTheDocument()
  })

  it('deselects the loaded messages when everything is already selected', async () => {
    const user = userEvent.setup()
    renderBar()

    await user.click(selectAll())
    await user.click(selectAll())

    expect(selectAll()).toHaveAttribute('aria-checked', 'false')
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Inbox' })).not.toHaveClass('sr-only')
  })

  it('clears the whole selection from the clear button and announces it', async () => {
    const user = userEvent.setup()
    renderBar()

    await user.click(selectAll())
    expect(screen.getByRole('status')).toHaveTextContent('3 messages selected')

    await user.click(screen.getByRole('button', { name: 'Clear selection' }))
    expect(screen.getByRole('status')).toHaveTextContent('Selection cleared')
    expect(screen.queryByRole('button', { name: 'Clear selection' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Inbox' })).not.toHaveClass('sr-only')
  })

  it('announces a single message with singular wording and stays silent at first render', async () => {
    const user = userEvent.setup()
    renderBar()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()

    await user.click(screen.getByRole('button', { name: 'pick a' }))
    expect(screen.getByRole('status')).toHaveTextContent('1 message selected')
  })

  it('reports selected messages that are outside the visible list with the given reason', async () => {
    const user = userEvent.setup()
    const view = renderBar({ hiddenReason: 'hidden by search' })
    await user.click(selectAll())
    expect(screen.queryByText(/hidden by search/)).not.toBeInTheDocument()

    await act(async () => {
      view.rerender(
        <MailSelectionProvider>
          <Bar hiddenReason="hidden by search" ids={['a', 'x']} />
        </MailSelectionProvider>,
      )
    })

    expect(screen.getByText('3 selected')).toBeInTheDocument()
    expect(screen.getByText('2 hidden by search')).toBeInTheDocument()
    expect(selectAll()).toHaveAttribute('aria-checked', 'mixed')
  })

  it('uses a neutral reason when none is given', async () => {
    const user = userEvent.setup()
    const view = renderBar()
    await user.click(selectAll())

    await act(async () => {
      view.rerender(
        <MailSelectionProvider>
          <Bar ids={['x']} />
        </MailSelectionProvider>,
      )
    })

    expect(screen.getByText('3 not shown')).toBeInTheDocument()
  })

  it('does not report hidden messages while the list is loading', async () => {
    const user = userEvent.setup()
    const view = renderBar()
    await user.click(selectAll())

    await act(async () => {
      view.rerender(
        <MailSelectionProvider>
          <Bar disabled ids={[]} />
        </MailSelectionProvider>,
      )
    })

    expect(screen.getByText('3 selected')).toBeInTheDocument()
    expect(screen.queryByText(/not shown|hidden/)).not.toBeInTheDocument()
  })

  it('links Select all to the list it controls', () => {
    renderBar({ controls: 'message-list' })

    expect(selectAll()).toHaveAttribute('aria-controls', 'message-list')
  })

  it('toggles from the Select all label, not only from the box', async () => {
    const user = userEvent.setup()
    renderBar()

    await user.click(selectAll().closest('label') as HTMLElement)

    expect(selectAll()).toHaveAttribute('aria-checked', 'true')
  })

  it('disables Select all without loaded messages or while loading', () => {
    renderBar({ ids: [] })
    expect(selectAll()).toHaveAttribute('aria-disabled', 'true')
    cleanup()

    renderBar({ disabled: true })
    expect(selectAll()).toHaveAttribute('aria-disabled', 'true')
  })
  describe('touch layout', () => {
    const select = () => screen.getByRole('button', { name: 'Select' })

    it('offers an explicit Select button and no checkbox at rest', () => {
      renderBar({ touch: true })

      expect(screen.getByRole('heading', { level: 1, name: 'Inbox' })).not.toHaveClass('sr-only')
      expect(select()).toBeInTheDocument()
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
      expect(screen.queryByText(/selected/)).not.toBeInTheDocument()
    })

    it('enters selection mode with zero items and announces it', async () => {
      const user = userEvent.setup()
      renderBar({ touch: true })

      await user.click(select())

      expect(screen.getByText('Select items')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Select all' })).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Clear selection and exit selection mode' }),
      ).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 1, name: 'Inbox' })).toHaveClass('sr-only')
      expect(screen.getByRole('status')).toHaveTextContent('Selection mode')
    })

    it('selects and deselects every loaded message but stays in the mode', async () => {
      const user = userEvent.setup()
      renderBar({ touch: true })
      await user.click(select())

      await user.click(screen.getByRole('button', { name: 'Select all' }))
      expect(screen.getByText('3 selected')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Deselect all' }))
      expect(screen.getByText('Select items')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Select all' })).toBeInTheDocument()
    })

    it('exits the mode and clears the selection with the close button', async () => {
      const user = userEvent.setup()
      renderBar({ touch: true })
      await user.click(select())
      await user.click(screen.getByRole('button', { name: 'Select all' }))

      await user.click(
        screen.getByRole('button', { name: 'Clear selection and exit selection mode' }),
      )

      expect(select()).toBeInTheDocument()
      expect(screen.queryByText(/selected/)).not.toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveTextContent('Selection cleared')
    })

    it('explains selections that are outside the visible list in a strip', async () => {
      const user = userEvent.setup()
      const view = renderBar({ touch: true, hiddenReason: 'hidden by search' })
      await user.click(select())
      await user.click(screen.getByRole('button', { name: 'Select all' }))

      await act(async () => {
        view.rerender(
          <MailSelectionProvider>
            <Bar hiddenReason="hidden by search" ids={['a']} touch />
          </MailSelectionProvider>,
        )
      })

      expect(screen.getByText('2 selected messages are hidden by search')).toBeInTheDocument()
    })

    it('disables Select when there is nothing to select', () => {
      renderBar({ touch: true, ids: [] })

      expect(select()).toBeDisabled()
    })
  })
})
