import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  Button,
  toast,
} from '@mailflow/ui/components'
import { Trash2 } from '@mailflow/ui/icons'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useMailSelection } from '#/features/mail-selection/hooks/useMailSelection'
import type { Workspace } from '#/features/workspaces/types'
import { type DraftListItem, discardDrafts } from '../email-composer/clients/drafts'

const plural = (count: number) => `${count} draft${count === 1 ? '' : 's'}`

export function DraftBulkActions({
  userId,
  workspace,
  items,
  onDiscarded,
}: {
  userId: string
  workspace?: Workspace | null | undefined
  items: DraftListItem[]
  onDiscarded?: (ids: string[]) => void
}) {
  const selection = useMailSelection()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  // Only loaded drafts have a known version, so only those can be deleted from here.
  const selected = items.filter((item) => selection?.isSelected(item.id))
  if (!selection || !workspace || selected.length === 0) return null

  async function discard() {
    if (!selection || !workspace || busy) return
    setBusy(true)
    try {
      const results = await discardDrafts(
        selected.map(({ id, version }) => ({ id, version })),
        { userId, uploads: new Map(), scope: { current: { userId, workspace } } },
      )
      const discarded = results.filter(({ status }) => status === 'discarded').map(({ id }) => id)
      const conflicts = results.length - discarded.length
      selection.setManySelected(discarded, false)
      setOpen(false)
      onDiscarded?.(discarded)
      await queryClient.invalidateQueries({ queryKey: ['drafts', userId] })
      if (discarded.length) toast.success(`${plural(discarded.length)} deleted.`)
      if (conflicts)
        toast.error(
          `${plural(conflicts)} could not be deleted because ${conflicts === 1 ? 'it' : 'they'} changed elsewhere. The list was refreshed.`,
        )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Drafts could not be deleted.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button
        aria-label="Delete selected drafts"
        className="h-7 gap-1.5 text-xs"
        onClick={() => setOpen(true)}
        size="sm"
        type="button"
        variant="ghost"
      >
        <Trash2 aria-hidden="true" className="size-3.5" />
        Delete
      </Button>
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (!next && !busy) setOpen(false)
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>{`Delete ${plural(selected.length)}?`}</AlertDialogTitle>
          <AlertDialogDescription>
            The selected drafts and their attachments will be deleted. This action cannot be undone.
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogClose disabled={busy} render={<Button variant="outline" />}>
              Cancel
            </AlertDialogClose>
            <Button variant="destructive" disabled={busy} onClick={() => void discard()}>
              {busy ? 'Deleting…' : selected.length === 1 ? 'Delete draft' : 'Delete drafts'}
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
