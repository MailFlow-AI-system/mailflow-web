import type { LucideIcon } from '@mailflow/ui/icons'
import type { ChainedCommands, Editor } from '@tiptap/react'

export type FormatAction = {
  name: string
  mark: string
  icon: LucideIcon
  command: (chain: ChainedCommands) => ChainedCommands
}
export type LinkEditorProps = { editor: Editor; onClose: () => void }
