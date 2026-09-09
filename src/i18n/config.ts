export const supportedLocales = ['en'] as const
export type SupportedLocale = (typeof supportedLocales)[number]

export const defaultLocale: SupportedLocale = 'en'

export function formatInTimeZone(
  value: Date | string | number,
  timeZone: string,
  locale: SupportedLocale = defaultLocale,
) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(value))
}
