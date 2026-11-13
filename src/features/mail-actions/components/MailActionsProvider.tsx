import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  Button,
} from '@mailflow/ui/components'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { MailFolderName } from '#/features/mail-list/types/mailFolder'
import { folderMoveActions, needsConfirmation } from '../folderActions'
import { useMessageActions } from '../hooks/useMessageActions'
import type { MessageAction } from '../messageActions'

type RequestOptions = { onDone?: () => void }

type MailActions = {
  folder: MailFolderName
  /** Runs an action, asking first when it deletes messages. */
  request: (ids: readonly string[], action: MessageAction, options?: RequestOptions) => void
}

type Pending = { ids: readonly string[]; action: 'trash' | 'delete_permanently' } & RequestOptions

const MailActionsContext = createContext<MailActions | null>(null)

export function useMailActions() {
  return useContext(MailActionsContext)
}

function confirmationCopy({ ids, action }: Pending) {
  const many = ids.length > 1
  const subject = many ? `${ids.length} messages` : 'message'
  if (action === 'trash')
    return {
      title: `Move ${subject} to Trash?`,
      description: `You can restore ${many ? 'them' : 'it'} from Trash until ${many ? 'they are' : 'it is'} deleted permanently.`,
      confirm: 'Move to Trash',
    }
  return {
    title: `Delete ${subject} permanently?`,
    description: `${many ? 'They' : 'It'} will be removed from Trash for everyone in this workspace. This cannot be undone.`,
    confirm: 'Delete permanently',
  }
}

function leavesFolder(folder: MailFolderName, action: MessageAction) {
  return (
    (folderMoveActions(folder) as MessageAction[]).includes(action) ||
    (folder === 'starred' && action === 'unstar')
  )
}

export function MailActionsProvider({
  folder,
  userId,
  workspaceSlug,
  onLeave,
  children,
}: {
  folder: MailFolderName
  userId: string
  workspaceSlug: string
  // Called before messages leave the current folder, while they are still listed.
  onLeave?: (ids: readonly string[]) => void
  children: ReactNode
}) {
  const { run: runAction } = useMessageActions({ userId, workspaceSlug })
  const run = useCallback(
    (ids: readonly string[], action: MessageAction) => {
      if (leavesFolder(folder, action)) onLeave?.(ids)
      runAction(ids, action)
    },
    [folder, onLeave, runAction],
  )
  const [pending, setPending] = useState<Pending | null>(null)
  // Keeps the copy stable while the dialog animates out.
  const shown = useRef<Pending | null>(null)
  if (pending) shown.current = pending
  const cancelRef = useRef<HTMLButtonElement>(null)

  const value = useMemo<MailActions>(
    () => ({
      folder,
      request: (ids, action, options = {}) => {
        if (ids.length === 0) return
        if (needsConfirmation(action)) {
          setPending({ ids, action: action as Pending['action'], ...options })
          return
        }
        run(ids, action)
        options.onDone?.()
      },
    }),
    [folder, run],
  )

  function confirm() {
    if (!pending) return
    run(pending.ids, pending.action)
    pending.onDone?.()
    setPending(null)
  }

  const copy = shown.current ? confirmationCopy(shown.current) : null

  return (
    <MailActionsContext.Provider value={value}>
      {children}
      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent initialFocus={cancelRef}>
          {copy ? (
            <>
              <AlertDialogTitle>{copy.title}</AlertDialogTitle>
              <AlertDialogDescription>{copy.description}</AlertDialogDescription>
              <div className="flex flex-wrap justify-end gap-2">
                <AlertDialogClose render={<Button ref={cancelRef} variant="outline" />}>
                  Cancel
                </AlertDialogClose>
                <Button variant="destructive" onClick={confirm}>
                  {copy.confirm}
                </Button>
              </div>
            </>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>
    </MailActionsContext.Provider>
  )
}
