import { Button } from '@mailflow/ui/components'
import { Clock, Save, Send, Trash2 } from '@mailflow/ui/icons'
import { useFormContext, useFormState } from 'react-hook-form'
import { showFeatureUnavailable } from '#/lib/showFeatureUnavailable'
import { useComposer } from '../context'
import { useDraftStatus } from '../hooks/useDraftStatus'
import type { DraftValues } from '../types/DraftValues'
import { ComposerLabels } from './ComposerLabels'
import { CompositionWarnings } from './CompositionWarnings'

export function Footer() {
  const {
    labels,
    saveDraft,
    validation,
    sending,
    discarding,
    sendFailed,
    sendProgress,
    persistence,
    setConfirm,
  } = useComposer()
  const { control } = useFormContext<DraftValues>()
  const { errors, isSubmitting } = useFormState({ control })
  const { dirty, saved } = useDraftStatus()
  const status = sending
    ? sendProgress || 'Sending email…'
    : persistence?.status === 'saving'
      ? 'Saving…'
      : persistence?.status === 'error'
        ? 'Failed to save the draft'
        : sendFailed
          ? 'Failed to send. Try again.'
          : validation.ready
            ? 'Message ready'
            : persistence
              ? persistence.status === 'saved'
                ? 'Draft saved'
                : dirty
                  ? 'Unsaved changes'
                  : 'Not sent'
              : dirty
                ? 'Unsaved changes'
                : saved
                  ? 'Draft in this tab'
                  : 'Not sent'

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-background px-4 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            className="gap-2"
            disabled={validation.ready || isSubmitting || sending}
            aria-busy={isSubmitting || sending}
            onClick={() => void validation.validate()}
          >
            <Send aria-hidden="true" className="size-4" />
            {discarding
              ? 'Please wait…'
              : sending
                ? 'Sending…'
                : sendFailed
                  ? 'Try again'
                  : validation.ready
                    ? 'Message ready'
                    : 'Send'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Schedule send"
            onClick={showFeatureUnavailable}
            title="Scheduling is not available yet"
          >
            <Clock aria-hidden="true" className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={saveDraft}
            disabled={sending}
            title={persistence ? 'Save draft' : 'Keep the draft in this tab'}
          >
            <Save aria-hidden="true" className="size-4" />
            Save draft
          </Button>
          {labels ? <ComposerLabels /> : null}
          {persistence ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={sending}
              aria-label="Discard draft"
              title="Discard draft"
              onClick={() => setConfirm(true)}
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </Button>
          ) : null}
        </div>
        <span role="status" className="text-xs text-muted-foreground">
          {status}
        </span>
      </div>
      {persistence?.error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-2 px-4 pb-3 text-xs text-destructive"
        >
          <p>{persistence.error}</p>
          <Button type="button" variant="outline" size="sm" disabled={sending} onClick={saveDraft}>
            Try saving again
          </Button>
          {persistence.conflict ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={sending}
              onClick={() => void persistence.saveCopy()}
            >
              Save as new draft
            </Button>
          ) : null}
        </div>
      ) : null}
      {errors.root?.server?.message ? (
        <p role="alert" className="px-4 pb-3 text-xs text-destructive">
          {errors.root.server.message}
        </p>
      ) : null}
      <CompositionWarnings />
    </>
  )
}
