import { describe, expect, it } from 'vitest'
import { resolveWorkspaceHost, workspaceInitials } from './workspaceHost'

describe('workspace host resolution', () => {
  it('recognizes only an exact environment zone or a single DNS-safe child', () => {
    expect(resolveWorkspaceHost('workspace.test', 'workspace.test')).toEqual({ kind: 'generic' })
    expect(resolveWorkspaceHost('acme.workspace.test', 'workspace.test')).toEqual({
      kind: 'workspace',
      slug: 'acme',
    })
  })
  it.each([
    'workspace.test.attacker.test',
    'evilworkspace.test',
    'a.b.workspace.test',
    '-a.workspace.test',
    'acme.workspace.test.',
    'preview.workers.dev',
  ])('rejects %s', (hostname) => {
    expect(resolveWorkspaceHost(hostname, 'workspace.test')).toEqual({ kind: 'invalid' })
  })
  it('uses at most two word initials', () => {
    expect(workspaceInitials('  Acme Corp Group ')).toBe('AC')
  })
})
