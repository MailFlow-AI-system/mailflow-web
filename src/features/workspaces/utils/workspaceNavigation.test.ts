import { describe, expect, it } from 'vitest'
import { workspaceDestination } from './workspaceNavigation'

const workspace = { id: 'b', name: 'Northwind', slug: 'northwind', role: 'member' as const }
describe('workspace destination', () => {
  it.each(['/inbox', '/sent', '/drafts', '/starred', '/spam', '/trash'])(
    'preserves collection %s and clears old tenant selectors',
    (path) => {
      expect(
        workspaceDestination(
          `http://acme.workspace.test:3003${path}?q=private&messageId=a#old`,
          'workspace.test',
          workspace,
        ),
      ).toBe(`http://northwind.workspace.test:3003${path}`)
    },
  )
  it('falls back to Inbox for routes with IDs or unrelated feature pages', () => {
    expect(
      workspaceDestination(
        'http://acme.workspace.test:3003/inbox/old-id',
        'workspace.test',
        workspace,
      ),
    ).toBe('http://northwind.workspace.test:3003/inbox')
  })
  it('rejects external origins and unsafe returned slugs', () => {
    expect(() =>
      workspaceDestination('https://evil.test/inbox', 'workspace.test', workspace),
    ).toThrow()
    expect(() =>
      workspaceDestination('http://acme.workspace.test/inbox', 'workspace.test', {
        ...workspace,
        slug: 'evil.example',
      }),
    ).toThrow()
  })
})

it('navigates between localhost hosts while clearing selectors', () => {
  expect(
    workspaceDestination('http://localhost:3000/sent?q=private#old', 'localhost', workspace),
  ).toBe('http://northwind.localhost:3000/sent')
})
