import type { AppShellContentProps } from '../types'

export function Content({ children }: AppShellContentProps) {
  return (
    <main
      className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain"
      id="main-content"
      tabIndex={-1}
    >
      {children}
    </main>
  )
}
