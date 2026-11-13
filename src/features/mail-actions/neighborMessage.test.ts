import { describe, expect, it } from 'vitest'
import { neighborMessageId } from './neighborMessage'

describe('neighborMessageId', () => {
  const list = ['a', 'b', 'c', 'd']

  it('opens the next remaining message, then the previous one', () => {
    expect(neighborMessageId(list, 'b', ['b'])).toBe('c')
    expect(neighborMessageId(list, 'b', ['b', 'c'])).toBe('d')
    expect(neighborMessageId(list, 'd', ['d'])).toBe('c')
    expect(neighborMessageId(list, 'c', ['c', 'd'])).toBe('b')
  })

  it('returns null when nothing remains or the open message is not listed', () => {
    expect(neighborMessageId(['a'], 'a', ['a'])).toBeNull()
    expect(neighborMessageId(list, 'x', ['x'])).toBeNull()
  })
})
