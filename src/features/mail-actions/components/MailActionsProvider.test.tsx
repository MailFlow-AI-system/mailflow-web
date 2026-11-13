import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

const run = vi.fn()
vi.mock('../hooks/useMessageActions', () => ({
  useMessageActions: () => ({ run, isPending: false }),
}))

import type { MessageAction } from '../messageActions'
import { MailActionsProvider, useMailActions } from './MailActionsProvider'

function Trigger({ ids, action }: { ids: string[]; action: MessageAction }) {
  const actions = useMailActions()
  const onDone = vi.fn()
  return (
    <button type="button" onClick={() => actions?.request(ids, action, { onDone })}>
      {`${action} ${ids.length}`}
    </button>
  )
}

function renderWith(ids: string[], action: MessageAction) {
  return render(
    <MailActionsProvider folder="inbox" userId="u1" workspaceSlug="acme">
      <Trigger ids={ids} action={action} />
    </MailActionsProvider>,
  )
}

describe('MailActionsProvider', () => {
  afterEach(() => {
    cleanup()
    run.mockReset()
  })

  it('runs non-destructive moves immediately', async () => {
    const user = userEvent.setup()
    renderWith(['a'], 'archive')
    await user.click(screen.getByRole('button', { name: 'archive 1' }))
    expect(run).toHaveBeenCalledWith(['a'], 'archive')
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('asks before moving messages to Trash, focusing Cancel first', async () => {
    const user = userEvent.setup()
    renderWith(['a', 'b'], 'trash')
    await user.click(screen.getByRole('button', { name: 'trash 2' }))

    const dialog = await screen.findByRole('alertdialog', { name: 'Move 2 messages to Trash?' })
    expect(dialog).toHaveAccessibleDescription(
      'You can restore them from Trash until they are deleted permanently.',
    )
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus())
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(run).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'trash 2' }))
    await user.click(await screen.findByRole('button', { name: 'Move to Trash' }))
    expect(run).toHaveBeenCalledWith(['a', 'b'], 'trash')
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
  })

  it('announces messages leaving the folder before running, but not state toggles', async () => {
    const user = userEvent.setup()
    const onLeave = vi.fn()
    render(
      <MailActionsProvider folder="starred" userId="u1" workspaceSlug="acme" onLeave={onLeave}>
        <Trigger ids={['a']} action="read" />
        <Trigger ids={['b']} action="unstar" />
        <Trigger ids={['c']} action="archive" />
      </MailActionsProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'read 1' }))
    expect(onLeave).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'unstar 1' }))
    await user.click(screen.getByRole('button', { name: 'archive 1' }))
    expect(onLeave.mock.calls).toEqual([[['b']], [['c']]])
    expect(onLeave.mock.invocationCallOrder[0]).toBeLessThan(run.mock.invocationCallOrder[1] ?? 0)
  })

  it('warns that permanent deletion cannot be undone', async () => {
    const user = userEvent.setup()
    renderWith(['a'], 'delete_permanently')
    await user.click(screen.getByRole('button', { name: 'delete_permanently 1' }))

    const dialog = await screen.findByRole('alertdialog', { name: 'Delete message permanently?' })
    expect(dialog).toHaveAccessibleDescription(
      'It will be removed from Trash for everyone in this workspace. This cannot be undone.',
    )
    await user.click(screen.getByRole('button', { name: 'Delete permanently' }))
    expect(run).toHaveBeenCalledWith(['a'], 'delete_permanently')
  })
})
