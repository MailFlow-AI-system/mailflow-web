import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@mailflow/ui/components'
import { SlidersHorizontal } from 'lucide-react'

import { isMailSortValue, type MailSortValue, mailSortValues } from './mailSort'

type MailSortMenuProps = {
  value: MailSortValue
  onChange: (value: MailSortValue) => void
  // Outgoing lists show the recipient where incoming lists show the sender.
  correspondent?: 'sender' | 'recipient'
}

function sortLabel(value: MailSortValue, correspondent: string) {
  switch (value) {
    case 'newest':
      return 'Newest first'
    case 'oldest':
      return 'Oldest first'
    case 'sender-asc':
      return `${correspondent} (A-Z)`
    case 'sender-desc':
      return `${correspondent} (Z-A)`
    case 'subject-asc':
      return 'Subject (A-Z)'
    case 'subject-desc':
      return 'Subject (Z-A)'
  }
}

/** Header control that chooses the order of a mail list. */
export function MailSortMenu({ value, onChange, correspondent = 'sender' }: MailSortMenuProps) {
  const correspondentLabel = correspondent === 'recipient' ? 'Recipient' : 'Sender'
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Sort messages"
            className="h-8 w-8 shrink-0"
            size="icon"
            type="button"
            variant="ghost"
          />
        }
      >
        <SlidersHorizontal aria-hidden="true" className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4} className="min-w-44">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => {
            if (isMailSortValue(next) && next !== value) onChange(next)
          }}
        >
          <DropdownMenuLabel className="text-xs text-muted-foreground">Sort by</DropdownMenuLabel>
          {mailSortValues.map((option) => (
            <DropdownMenuRadioItem
              key={option}
              value={option}
              closeOnClick
              // @mailflow/ui v0.10.0 renders the radio dot as an inline span, which collapses
              // to 0x0; drop this once the design system makes the indicator a block.
              className="[&_span[aria-hidden=true]]:block"
            >
              {sortLabel(option, correspondentLabel)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
