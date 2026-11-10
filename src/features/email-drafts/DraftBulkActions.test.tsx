import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MailSelectionProvider } from '#/features/mail-selection/components/MailSelectionProvider'
import { useMailSelection } from '#/features/mail-selection/hooks/useMailSelection'
import { discardDrafts } from '../email-composer/clients/drafts'
import { DraftBulkActions } from './DraftBulkActions'

const { success, error } = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('@mailflow/ui/components', async (original) => ({
  ...(await original<object>()),
  toast: { success, error },
}))
vi.mock('../email-composer/clients/drafts', () => ({ discardDrafts: vi.fn() }))

const workspace = { id: 'workspace-a', name: 'Acme', slug: 'acme', role: 'owner' as const }
const item = (id: string, version: number) => ({
  id,
  version,
  to: '',
  subject: id,
  text: '',
  updatedAt: '2026-11-10T12:00:00.000Z',
  attachmentCount: 0,
})
const items = [item('a', 1), item('b', 4), item('c', 2)]

function Harness({ onDiscarded = () => {} }: { onDiscarded?: (ids: string[]) => void }) {
  const selection = useMailSelection()
  return (
    <>
      <button type="button" onClick={() => selection?.setManySelected(['a', 'b'], true)}>
        pick two
      </button>
      <button type="button" onClick={() => selection?.setManySelected(['gone'], true)}>
        pick hidden
      </button>
      <output data-testid="count">{selection?.count}</output>
      <DraftBulkActions
        userId="owner"
        workspace={workspace}
        items={items}
        onDiscarded={onDiscarded}
      />
    </>
  )
}
function mount(onDiscarded?: (ids: string[]) => void) {
  const client = new QueryClient()
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  render(
    <QueryClientProvider client={client}>
      <MailSelectionProvider>
        <Harness {...(onDiscarded ? { onDiscarded } : {})} />
      </MailSelectionProvider>
    </QueryClientProvider>,
  )
  return { invalidate }
}
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

describe('DraftBulkActions', () => {
  it('shows no delete action until drafts are selected', async () => {
    mount()
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'pick two' }))
    expect(screen.getByRole('button', { name: 'Delete selected drafts' })).toBeInTheDocument()
  })

  it('asks for confirmation and deletes the selected versions in one request', async () => {
    vi.mocked(discardDrafts).mockResolvedValue([
      { id: 'a', status: 'discarded' },
      { id: 'b', status: 'discarded' },
    ])
    const onDiscarded = vi.fn()
    const { invalidate } = mount(onDiscarded)
    await userEvent.click(screen.getByRole('button', { name: 'pick two' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete selected drafts' }))
    expect(await screen.findByText('Delete 2 drafts?')).toBeInTheDocument()
    expect(discardDrafts).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Delete drafts' }))
    await waitFor(() => expect(success).toHaveBeenCalledWith('2 drafts deleted.'))
    expect(discardDrafts).toHaveBeenCalledWith(
      [
        { id: 'a', version: 1 },
        { id: 'b', version: 4 },
      ],
      expect.objectContaining({ userId: 'owner' }),
    )
    expect(onDiscarded).toHaveBeenCalledWith(['a', 'b'])
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['drafts', 'owner'] })
    expect(screen.getByTestId('count')).toHaveTextContent('0')
  })

  it('keeps drafts that changed elsewhere selected and says so', async () => {
    vi.mocked(discardDrafts).mockResolvedValue([
      { id: 'a', status: 'discarded' },
      { id: 'b', status: 'conflict' },
    ])
    const onDiscarded = vi.fn()
    mount(onDiscarded)
    await userEvent.click(screen.getByRole('button', { name: 'pick two' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete selected drafts' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Delete drafts' }))
    await waitFor(() =>
      expect(error).toHaveBeenCalledWith(
        '1 draft could not be deleted because it changed elsewhere. The list was refreshed.',
      ),
    )
    expect(success).toHaveBeenCalledWith('1 draft deleted.')
    expect(onDiscarded).toHaveBeenCalledWith(['a'])
    expect(screen.getByTestId('count')).toHaveTextContent('1')
  })

  it('keeps everything and reports a failed request', async () => {
    vi.mocked(discardDrafts).mockRejectedValue(new Error('Network down'))
    mount()
    await userEvent.click(screen.getByRole('button', { name: 'pick two' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete selected drafts' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Delete drafts' }))
    await waitFor(() => expect(error).toHaveBeenCalledWith('Network down'))
    expect(screen.getByTestId('count')).toHaveTextContent('2')
  })

  it('does not delete selected drafts that are not loaded in the list', async () => {
    mount()
    await userEvent.click(screen.getByRole('button', { name: 'pick hidden' }))
    expect(screen.queryByRole('button', { name: 'Delete selected drafts' })).not.toBeInTheDocument()
  })
})
