import { parseAsStringLiteral } from 'nuqs'

/** List orders supported by Core for messages, sent mail and drafts. */
export const mailSortValues = [
  'newest',
  'oldest',
  'sender-asc',
  'sender-desc',
  'subject-asc',
  'subject-desc',
] as const

export type MailSortValue = (typeof mailSortValues)[number]

export const defaultMailSort: MailSortValue = 'newest'

/** `?sort=` parser; unknown values read as absent so the stored preference applies. */
export const mailSortParser = parseAsStringLiteral(mailSortValues)

export function isMailSortValue(value: unknown): value is MailSortValue {
  return typeof value === 'string' && (mailSortValues as readonly string[]).includes(value)
}

export function parseMailSort(value: unknown): MailSortValue {
  return isMailSortValue(value) ? value : defaultMailSort
}

/** The `sort` query value to send: a supported order other than the default, else nothing. */
export function explicitMailSort(value: unknown): Exclude<MailSortValue, 'newest'> | null {
  return isMailSortValue(value) && value !== defaultMailSort
    ? (value as Exclude<MailSortValue, 'newest'>)
    : null
}

/** Order of a list hook; `enabled: false` waits until the stored order is known. */
export type MailListOrder = { sort?: MailSortValue; enabled?: boolean }

/** Link search that keeps only the current list order when moving between mailboxes. */
export function keepMailSort(previous: { sort?: unknown }): { sort?: MailSortValue } {
  return isMailSortValue(previous.sort) && previous.sort !== defaultMailSort
    ? { sort: previous.sort }
    : {}
}
