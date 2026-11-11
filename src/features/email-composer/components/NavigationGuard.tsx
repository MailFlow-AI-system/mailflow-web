import { useBlocker } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { useComposer } from '../context'
import { UnsavedChangesDialog } from './UnsavedChangesDialog'

/** Route id of the layout that keeps the composer mounted. */
const MAIL_LAYOUT_ROUTE_ID = '/_authenticated/_mail'

/**
 * Confirms in-app navigation that would unmount the composer (sign out, back to
 * the public pages) while it holds unsaved changes. Moving between mail pages is
 * not blocked because the composer stays mounted there. Reloads and tab closes
 * are covered by the browser prompt instead.
 */
export function NavigationGuard({ scope = MAIL_LAYOUT_ROUTE_ID }: { scope?: string }) {
  const { isDirty, discard, saveDraft, sessionRef, theme } = useComposer()
  const isDirtyRef = useRef(isDirty)
  isDirtyRef.current = isDirty
  const [busy, setBusy] = useState(false)
  const blocker = useBlocker({
    shouldBlockFn: ({ next }) => !isInsideScope(next.routeId, scope) && isDirtyRef.current(),
    enableBeforeUnload: false,
    withResolver: true,
  })

  async function run(action: () => Promise<boolean>) {
    if (blocker.status !== 'blocked') return
    const { proceed, reset } = blocker
    setBusy(true)
    try {
      if (await action()) proceed()
      else reset()
    } catch {
      reset()
    } finally {
      setBusy(false)
    }
  }

  return (
    <UnsavedChangesDialog
      open={blocker.status === 'blocked'}
      theme={theme}
      title="Leave this page?"
      description="Your message has changes that were not saved. Save it as a draft, discard it, or stay and keep editing."
      busy={busy}
      onContinue={() => blocker.reset?.()}
      onDiscard={() =>
        void run(async () => {
          const session = sessionRef.current
          await discard()
          // A failed discard keeps the session, so the message stays and we stay put.
          return sessionRef.current !== session
        })
      }
      onSave={() => void run(saveDraft)}
    />
  )
}

function isInsideScope(routeId: string, scope: string) {
  return routeId === scope || routeId.startsWith(`${scope}/`)
}
