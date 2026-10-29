import { describe, expect, it } from 'vitest'
import { emptySelection, selectionReducer } from './selectionReducer'

describe('selectionReducer', () => {
  it('selects and deselects a single id', () => {
    const selected = selectionReducer(emptySelection, { type: 'set', ids: ['a'], selected: true })
    expect([...selected.ids]).toEqual(['a'])

    const deselected = selectionReducer(selected, { type: 'set', ids: ['a'], selected: false })
    expect(deselected.ids.size).toBe(0)
  })

  it('adds several ids without dropping the existing selection', () => {
    const first = selectionReducer(emptySelection, { type: 'set', ids: ['a'], selected: true })
    const next = selectionReducer(first, { type: 'set', ids: ['b', 'c'], selected: true })

    expect([...next.ids].sort()).toEqual(['a', 'b', 'c'])
  })

  it('removes only the given ids and keeps ids that are not in the list', () => {
    const all = selectionReducer(emptySelection, {
      type: 'set',
      ids: ['a', 'b', 'hidden'],
      selected: true,
    })
    const next = selectionReducer(all, { type: 'set', ids: ['a', 'b'], selected: false })

    expect([...next.ids]).toEqual(['hidden'])
  })

  it('keeps the same state object when nothing changes', () => {
    const selected = selectionReducer(emptySelection, { type: 'set', ids: ['a'], selected: true })

    expect(selectionReducer(selected, { type: 'set', ids: ['a'], selected: true })).toBe(selected)
    expect(selectionReducer(selected, { type: 'set', ids: ['z'], selected: false })).toBe(selected)
    expect(selectionReducer(emptySelection, { type: 'clear' })).toBe(emptySelection)
  })

  it('does not mutate the previous state', () => {
    const before = selectionReducer(emptySelection, { type: 'set', ids: ['a'], selected: true })
    selectionReducer(before, { type: 'set', ids: ['b'], selected: true })

    expect([...before.ids]).toEqual(['a'])
  })

  it('clears every selected id', () => {
    const selected = selectionReducer(emptySelection, {
      type: 'set',
      ids: ['a', 'b'],
      selected: true,
    })

    expect(selectionReducer(selected, { type: 'clear' }).ids.size).toBe(0)
  })
  describe('selection mode', () => {
    it('enters the mode with no ids and keeps it when ids are cleared', () => {
      const entered = selectionReducer(emptySelection, { type: 'enter' })
      expect(entered.mode).toBe(true)
      expect(entered.ids.size).toBe(0)
      expect(selectionReducer(entered, { type: 'enter' })).toBe(entered)

      const picked = selectionReducer(entered, { type: 'set', ids: ['a'], selected: true })
      const cleared = selectionReducer(picked, { type: 'clear' })
      expect(cleared.ids.size).toBe(0)
      expect(cleared.mode).toBe(true)
    })

    it('enters the mode with exactly one id, replacing earlier ids', () => {
      const before = selectionReducer(emptySelection, {
        type: 'set',
        ids: ['a', 'b'],
        selected: true,
      })
      const next = selectionReducer(before, { type: 'enterWith', id: 'c' })

      expect([...next.ids]).toEqual(['c'])
      expect(next.mode).toBe(true)
    })

    it('exits the mode and drops every id, and is a no-op when already idle', () => {
      const active = selectionReducer(emptySelection, { type: 'enterWith', id: 'a' })

      expect(selectionReducer(active, { type: 'exit' })).toBe(emptySelection)
      expect(selectionReducer(emptySelection, { type: 'exit' })).toBe(emptySelection)
    })
  })
})
