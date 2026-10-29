import { Badge, Button, Checkbox } from '@mailflow/ui/components'
import { EyeOff, X } from '@mailflow/ui/icons'
import { useEffect, useId, useRef, useState } from 'react'
import type { MailSelection } from '../types/selection'

type MailSelectionBarProps = {
  heading: string
  selection: MailSelection
  visibleIds: readonly string[]
  controls?: string
  disabled?: boolean
  hiddenReason?: string
  touch?: boolean
}

export function MailSelectionBar({
  heading,
  selection,
  visibleIds,
  controls,
  disabled = false,
  hiddenReason = 'not shown',
  touch = false,
}: MailSelectionBarProps) {
  const checkboxId = useId()
  const { count, selecting } = selection
  const visibleState = selection.visibleState(visibleIds)
  const allSelected = visibleState === 'all'
  const hiddenCount = disabled ? 0 : count - visibleIds.filter(selection.isSelected).length
  const [announcement, setAnnouncement] = useState('')
  const previousCount = useRef(0)
  const wasSelecting = useRef(false)

  useEffect(() => {
    if (count > 0) setAnnouncement(`${count} message${count === 1 ? '' : 's'} selected`)
    else if (selecting) setAnnouncement('Selection mode')
    else if (previousCount.current > 0 || wasSelecting.current) setAnnouncement('Selection cleared')
    previousCount.current = count
    wasSelecting.current = selecting
  }, [count, selecting])

  const live = (
    <p aria-atomic="true" aria-live="polite" className="sr-only" role="status">
      {announcement}
    </p>
  )

  if (touch) {
    return (
      <>
        <div
          className={`flex h-14 shrink-0 items-center gap-1.5 border-b border-border transition-colors ${selecting ? 'bg-primary/10 px-1.5' : 'pr-1.5 pl-4'}`}
        >
          {selecting ? (
            <>
              <Button
                aria-label="Clear selection and exit selection mode"
                className="size-11 shrink-0"
                onClick={selection.exit}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X aria-hidden="true" className="size-5" />
              </Button>
              <h1 className="sr-only">{heading}</h1>
              <span className="whitespace-nowrap text-[15px] font-semibold">
                {count === 0 ? 'Select items' : `${count} selected`}
              </span>
              <Button
                aria-controls={controls}
                className="ml-auto h-11 px-3 text-sm text-primary"
                disabled={disabled || visibleIds.length === 0}
                onClick={() => selection.setManySelected(visibleIds, !allSelected)}
                type="button"
                variant="ghost"
              >
                {allSelected ? 'Deselect all' : 'Select all'}
              </Button>
            </>
          ) : (
            <>
              <h1 className="text-[15px] font-semibold">{heading}</h1>
              <Button
                aria-controls={controls}
                className="ml-auto h-11 px-3 text-sm text-primary"
                disabled={disabled || visibleIds.length === 0}
                onClick={selection.enter}
                type="button"
                variant="ghost"
              >
                Select
              </Button>
            </>
          )}
          {live}
        </div>
        {selecting && hiddenCount > 0 ? (
          <div className="flex h-9 shrink-0 items-center gap-1.5 border-b border-border bg-muted px-4 text-xs text-muted-foreground">
            <EyeOff aria-hidden="true" className="size-3.5 shrink-0" />
            {`${hiddenCount} selected ${hiddenCount === 1 ? 'message is' : 'messages are'} ${hiddenReason}`}
          </div>
        ) : null}
      </>
    )
  }

  return (
    <div
      className={`flex h-[52px] shrink-0 items-center gap-3 border-b border-border px-3 transition-colors ${selecting ? 'bg-primary/10' : ''}`}
    >
      <label
        className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg"
        htmlFor={checkboxId}
      >
        <Checkbox
          aria-controls={controls}
          aria-label="Select all loaded messages"
          checked={allSelected}
          className="size-[18px] rounded-[5px] focus-visible:ring-2 focus-visible:ring-offset-2"
          disabled={disabled || visibleIds.length === 0}
          id={checkboxId}
          indeterminate={visibleState === 'some'}
          onCheckedChange={(checked) => selection.setManySelected(visibleIds, checked)}
          title="Select all loaded messages"
        />
      </label>
      <h1 className={selecting ? 'sr-only' : 'text-sm font-semibold'}>{heading}</h1>
      {selecting ? (
        <>
          <span className="whitespace-nowrap text-[13px] font-medium">{`${count} selected`}</span>
          {hiddenCount > 0 ? (
            <Badge
              className="h-[22px] shrink-0 gap-1 rounded-full border-border px-2 text-[11px] font-medium text-muted-foreground"
              variant="secondary"
            >
              <EyeOff aria-hidden="true" className="size-3" />
              {`${hiddenCount} ${hiddenReason}`}
            </Badge>
          ) : null}
          <Button
            className="ml-auto h-7 text-xs"
            onClick={selection.clear}
            size="sm"
            type="button"
            variant="ghost"
          >
            Clear selection
          </Button>
        </>
      ) : null}
      {live}
    </div>
  )
}
