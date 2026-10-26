import { describe, expect, it } from 'vitest'

import { getSenderAvatarColorClass } from './senderAvatarColor'

describe('getSenderAvatarColorClass', () => {
  it('maps the first trimmed UTF-16 character to the sender palette', () => {
    expect(getSenderAvatarColorClass('  Hana  ')).toBe(
      'bg-violet-500/20 text-violet-700 dark:text-violet-300',
    )
    expect(getSenderAvatarColorClass('Ada')).toBe('bg-blue-500/20 text-blue-700 dark:text-blue-300')
    expect(getSenderAvatarColorClass('Bea')).toBe(
      'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300',
    )
    expect(getSenderAvatarColorClass('Cora')).toBe(
      'bg-amber-500/20 text-amber-800 dark:text-amber-300',
    )
    expect(getSenderAvatarColorClass('Dina')).toBe(
      'bg-pink-500/20 text-pink-800 dark:text-pink-300',
    )
    expect(getSenderAvatarColorClass('Eli')).toBe('bg-cyan-500/20 text-cyan-800 dark:text-cyan-300')
    expect(getSenderAvatarColorClass('Fay')).toBe(
      'bg-orange-500/20 text-orange-800 dark:text-orange-300',
    )
    expect(getSenderAvatarColorClass('Gus')).toBe('bg-rose-500/20 text-rose-800 dark:text-rose-300')
    expect(getSenderAvatarColorClass('😀 Sender')).toBe(
      'bg-cyan-500/20 text-cyan-800 dark:text-cyan-300',
    )
  })

  it('uses semantic muted colors for empty or whitespace-only names', () => {
    expect(getSenderAvatarColorClass('')).toBe('bg-muted text-foreground')
    expect(getSenderAvatarColorClass(' \t\n ')).toBe('bg-muted text-foreground')
  })
  it('keeps a recipient color stable when the display name, casing or surrounding spaces change', () => {
    expect(getSenderAvatarColorClass('Ada Lovelace', 'ada@example.test')).toBe(
      getSenderAvatarColorClass('Different name', '  ADA@EXAMPLE.TEST  '),
    )
  })

  it('uses the complete recipient address so shared initials do not collapse the palette', () => {
    const colors = ['ada@example.test', 'amy@example.test', 'alex@example.test'].map((email) =>
      getSenderAvatarColorClass('Recipient', email),
    )
    expect(new Set(colors).size).toBeGreaterThan(1)
  })
})
