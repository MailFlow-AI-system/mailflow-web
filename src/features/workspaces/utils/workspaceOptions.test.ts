import { describe, expect, it } from 'vitest'
import type { Workspace } from '../types'
import { workspaceOptions } from './workspaceOptions'

const current: Workspace = { id: 'a', name: 'Acme', slug: 'acme', role: 'owner' }
const other: Workspace = { id: 'b', name: 'Northwind', slug: 'northwind', role: 'member' }

describe('workspace options', () => {
  it('keeps the current authorized workspace available before its list page loads', () => {
    expect(workspaceOptions([other], current)).toEqual([other, current])
  })
  it('deduplicates pages and uses the freshly authorized current summary', () => {
    expect(workspaceOptions([{ ...current, name: 'Old name' }, other, other], current)).toEqual([
      current,
      other,
    ])
  })
  it('does not invent a context when no workspace is authorized', () => {
    expect(workspaceOptions([], null)).toEqual([])
  })
})
