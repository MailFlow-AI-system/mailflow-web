import { emojis } from '@tiptap/extension-emoji'

export type ComposerEmoji = {
  emoji: string
  label: string
}

export const composerEmojis: ComposerEmoji[] = emojis.flatMap((item) => {
  if (!item.emoji || item.name.startsWith('regional_indicator') || item.group === 'components') {
    return []
  }
  if (!item.group && (item.version ?? 0) < 1) return []
  return [{ emoji: item.emoji, label: item.name.replaceAll('_', ' ') }]
})
