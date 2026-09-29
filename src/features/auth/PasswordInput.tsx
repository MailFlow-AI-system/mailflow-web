import { Button, Input } from '@mailflow/ui/components'
import { Eye, EyeOff } from '@mailflow/ui/icons'
import { cn } from 'cn'
import { type ComponentProps, useState } from 'react'

type PasswordInputProps = Omit<ComponentProps<typeof Input>, 'type'> & {
  visibilityLabel?: string
}

export function PasswordInput({
  className,
  visibilityLabel = 'password',
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input type={visible ? 'text' : 'password'} className={cn('pr-10', className)} {...props} />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute top-0 right-0 text-muted-foreground hover:text-foreground"
        aria-label={visible ? `Hide ${visibilityLabel}` : `Show ${visibilityLabel}`}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </Button>
    </div>
  )
}
