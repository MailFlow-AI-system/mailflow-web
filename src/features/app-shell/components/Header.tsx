import type { AppShellHeaderProps } from '../types'
import { SidebarTrigger } from './ui/sidebar'

export function Header({ children, actions }: AppShellHeaderProps) {
  return (
    <header className="flex min-h-14 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-3 backdrop-blur-[12px]">
      <SidebarTrigger className="md:hidden" />
      <span aria-hidden="true" className="h-5 w-px shrink-0 bg-border md:hidden" />
      {children}
      {actions ? <div className="ml-auto flex items-center">{actions}</div> : null}
    </header>
  )
}
