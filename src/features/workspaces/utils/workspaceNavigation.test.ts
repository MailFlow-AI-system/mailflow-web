import { describe, expect, it } from 'vitest'
import { workspaceHandoffDestination } from './workspaceNavigation'

const workspace = { id: 'b', name: 'Northwind', slug: 'northwind', role: 'member' as const }
const code = 'A'.repeat(43)

describe('workspace handoff destination', () => {
  it('accepts only the selected workspace handoff on the current protocol and port', () => {
    expect(
      workspaceHandoffDestination(
        `https://northwind.example.com/auth/handoff?code=${code}`,
        'https://acme.example.com/sent?q=private#old',
        'example.com',
        workspace,
      ),
    ).toBe(`https://northwind.example.com/auth/handoff?code=${code}`)
    expect(
      workspaceHandoffDestination(
        `http://northwind.localhost:3000/auth/handoff?code=${code}`,
        'http://acme.localhost:3000/inbox',
        'localhost',
        workspace,
      ),
    ).toBe(`http://northwind.localhost:3000/auth/handoff?code=${code}`)
  })
  it.each([
    `https://evil.test/auth/handoff?code=${code}`,
    `https://acme.example.com/auth/handoff?code=${code}`,
    `https://northwind.example.com.evil.test/auth/handoff?code=${code}`,
    `http://northwind.example.com/auth/handoff?code=${code}`,
    `https://northwind.example.com:8443/auth/handoff?code=${code}`,
    `https://northwind.example.com/inbox?code=${code}`,
    `https://northwind.example.com/auth/handoff?code=${code}&next=https://evil.test`,
    `https://northwind.example.com/auth/handoff?code=${code}#fragment`,
    'https://northwind.example.com/auth/handoff?code=short',
    `https://user@northwind.example.com/auth/handoff?code=${code}`,
    'not a url',
  ])('rejects %s', (handoff) => {
    expect(() =>
      workspaceHandoffDestination(
        handoff,
        'https://acme.example.com/inbox',
        'example.com',
        workspace,
      ),
    ).toThrow()
  })
  it('rejects a source page outside the workspace hosts', () => {
    expect(() =>
      workspaceHandoffDestination(
        `https://northwind.example.com/auth/handoff?code=${code}`,
        'https://evil.test/inbox',
        'example.com',
        workspace,
      ),
    ).toThrow()
  })
})
