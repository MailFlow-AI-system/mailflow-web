import { describe, expect, it } from 'vitest'
import { folderMoveActions, needsConfirmation } from './folderActions'

describe('folderMoveActions', () => {
  it('offers archive and delete in regular folders', () => {
    for (const folder of ['inbox', 'starred'] as const) {
      expect(folderMoveActions(folder)).toEqual(['archive', 'spam', 'trash'])
    }
    expect(folderMoveActions('archive')).toEqual(['unarchive', 'spam', 'trash'])
  })

  it('offers restore and permanent deletion in Trash and recovery in Spam', () => {
    expect(folderMoveActions('trash')).toEqual(['restore', 'delete_permanently'])
    expect(folderMoveActions('spam')).toEqual(['not_spam', 'trash'])
  })
})

describe('needsConfirmation', () => {
  it('confirms only destructive moves', () => {
    expect(needsConfirmation('trash')).toBe(true)
    expect(needsConfirmation('delete_permanently')).toBe(true)
    expect(needsConfirmation('archive')).toBe(false)
    expect(needsConfirmation('spam')).toBe(false)
  })
})
