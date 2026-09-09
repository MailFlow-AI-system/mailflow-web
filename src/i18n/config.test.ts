import { describe, expect, it } from 'vitest'

import { formatInTimeZone } from './config'

describe('formatInTimeZone', () => {
  it('renders the same UTC instant in the selected user timezone', () => {
    expect(formatInTimeZone('2026-01-15T12:00:00Z', 'America/Sao_Paulo')).toBe(
      'Jan 15, 2026, 9:00 AM',
    )
  })
})
