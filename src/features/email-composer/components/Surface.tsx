import {
  Button,
  WindowBody,
  WindowClose,
  WindowContent,
  WindowDescription,
  WindowHeader,
  WindowMaximize,
  WindowMinimize,
  WindowMinimized,
  WindowRestore,
  WindowTitle,
  WindowTrigger,
} from '@mailflow/ui/components'
import { Maximize2, SquarePen, X } from '@mailflow/ui/icons'
import { useRef } from 'react'
import { useComposer } from '../context'
import type { ComposerFocusMemory, ComposerLayoutProps, ComposerRootProps } from '../types/composer'

export function Trigger() {
  const { triggerRef, theme, editor } = useComposer()
  return (
    <WindowTrigger
      ref={triggerRef}
      disabled={!editor}
      render={<Button />}
      data-theme={theme}
      className="fixed bottom-6 left-6 z-30 gap-2 shadow-lg"
    >
      <SquarePen aria-hidden="true" className="size-4" /> Compose
    </WindowTrigger>
  )
}

export function Content({ children }: Pick<ComposerRootProps, 'children'>) {
  const { theme, recipientRef, revision } = useComposer()
  const lastFocus = useRef<ComposerFocusMemory>({ element: null, revision })
  return (
    <WindowContent
      lang="pt-BR"
      data-theme={theme}
      initialFocus={() =>
        lastFocus.current.revision === revision && lastFocus.current.element?.isConnected
          ? lastFocus.current.element
          : (recipientRef.current ?? true)
      }
      onFocusCapture={(event) => {
        if (
          event.target instanceof HTMLElement &&
          !event.target.closest('[data-slot="window-state-control"]')
        ) {
          lastFocus.current = { element: event.target, revision }
        }
      }}
    >
      <WindowDescription className="sr-only">
        Edite sua mensagem. O envio e a IA ainda não estão disponíveis.
      </WindowDescription>
      {children}
    </WindowContent>
  )
}

export function Header() {
  const { state } = useComposer()
  return (
    <WindowHeader>
      <WindowTitle>Nova mensagem</WindowTitle>
      <div className="flex items-center gap-1">
        <WindowMinimize aria-label="Minimizar janela" className="size-7 [&_svg]:size-3.5" />
        <WindowMaximize
          aria-label={state === 'maximized' ? 'Restaurar tamanho' : 'Maximizar janela'}
          className="size-7 [&_svg]:size-3.5"
        />
        <WindowClose
          aria-label="Fechar janela"
          render={<Button variant="ghost" size="icon" />}
          className="size-7"
        >
          <X aria-hidden="true" className="size-3.5" />
        </WindowClose>
      </div>
    </WindowHeader>
  )
}

export function Layout({ children, assistant }: ComposerLayoutProps) {
  return (
    <WindowBody className="flex flex-col">
      <div
        className={`grid min-h-[520px] flex-1 grid-cols-1 ${assistant ? 'md:grid-cols-[minmax(0,1fr)_220px]' : ''}`}
      >
        <div className="flex min-w-0 flex-col">{children}</div>
        {assistant}
      </div>
    </WindowBody>
  )
}

export function Minimized() {
  const { theme, fields } = useComposer()
  return (
    <WindowMinimized
      lang="pt-BR"
      className="bottom-20"
      aria-label="Mensagem minimizada"
      data-theme={theme}
    >
      <WindowRestore aria-label="Restaurar mensagem" className="max-w-60 gap-2">
        <Maximize2 aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="truncate">{fields.subject || 'Nova mensagem'}</span>
      </WindowRestore>
      <WindowClose aria-label="Fechar janela" render={<Button variant="ghost" size="icon" />}>
        <X aria-hidden="true" className="size-3.5" />
      </WindowClose>
    </WindowMinimized>
  )
}
