import { describe, expect, it } from 'vitest'
import { getVisibleSelectionState } from './getVisibleSelectionState'

describe('getVisibleSelectionState', () => {
  it('is none for an empty list or when no visible id is selected', () => {
    expect(getVisibleSelectionState(new Set(['a']), [])).toBe('none')
    expect(getVisibleSelectionState(new Set(), ['a', 'b'])).toBe('none')
    expect(getVisibleSelectionState(new Set(['hidden']), ['a', 'b'])).toBe('none')
  })

  it('is some when only part of the visible ids are selected', () => {
    expect(getVisibleSelectionState(new Set(['a']), ['a', 'b'])).toBe('some')
  })

  it('is all when every visible id is selected, even with extra hidden selections', () => {
    expect(getVisibleSelectionState(new Set(['a', 'b', 'hidden']), ['a', 'b'])).toBe('all')
  })
})
