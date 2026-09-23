import { Dialog as SheetPrimitive } from '@base-ui/react/dialog'
import { X } from '@mailflow/ui/icons'
import { cn } from 'cn'
import type * as React from 'react'
import { useRef } from 'react'

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-black/60 transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0',
        className,
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = 'right',
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: 'top' | 'right' | 'bottom' | 'left'
  showCloseButton?: boolean
}) {
  const closeRef = useRef<HTMLButtonElement>(null)

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        initialFocus={showCloseButton ? closeRef : undefined}
        className={cn(
          'fixed z-50 flex flex-col bg-sidebar text-sm text-sidebar-foreground shadow-xl transition duration-200 ease-in-out data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:border-r data-[side=left]:data-[starting-style]:-translate-x-full data-[side=left]:data-[ending-style]:-translate-x-full data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:border-l',
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <SheetPrimitive.Close
            ref={closeRef}
            data-slot="sheet-close"
            aria-label="Fechar menu"
            className="absolute top-3 right-3 inline-flex size-7 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <X aria-hidden="true" className="size-4" />
          </SheetPrimitive.Close>
        ) : null}
      </SheetPrimitive.Popup>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-header"
      className={cn('flex flex-col gap-0.5 p-4', className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn('text-base font-medium', className)}
      {...props}
    />
  )
}

function SheetDescription({ className, ...props }: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle }
