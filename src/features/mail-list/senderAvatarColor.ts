const senderAvatarColors = [
  'bg-violet-500/20 text-violet-700 dark:text-violet-300',
  'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300',
  'bg-amber-500/20 text-amber-800 dark:text-amber-300',
  'bg-pink-500/20 text-pink-800 dark:text-pink-300',
  'bg-cyan-500/20 text-cyan-800 dark:text-cyan-300',
  'bg-orange-500/20 text-orange-800 dark:text-orange-300',
  'bg-rose-500/20 text-rose-800 dark:text-rose-300',
] as const

function getSenderAvatarColorClass(name: string) {
  const trimmedName = name.trim()
  if (!trimmedName) return 'bg-muted text-foreground'

  return senderAvatarColors[trimmedName.charCodeAt(0) % senderAvatarColors.length]
}

export { getSenderAvatarColorClass }
