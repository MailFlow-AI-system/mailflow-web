import { describe, expect, it } from 'vitest'
import { workspaceContextSchema, workspaceSchema } from './schemas'

const base = { id: 'w1', name: 'Acme', slug: 'acme' }

describe('workspaceSchema', () => {
  it.each([
    'owner',
    'admin',
    'member',
    'manager',
    'marketing_specialist',
    'analyst',
    'viewer',
    'custom',
  ])('accepts the %s role', (role) => {
    expect(workspaceSchema.parse({ ...base, role }).role).toBe(role)
  })

  it('rejects an unknown role', () => {
    expect(workspaceSchema.safeParse({ ...base, role: 'root' }).success).toBe(false)
  })

  it('keeps capabilities when the context response carries them', () => {
    const parsed = workspaceContextSchema.parse({
      workspace: { ...base, role: 'viewer', capabilities: ['mail.read'] },
    })
    expect(parsed.workspace?.capabilities).toEqual(['mail.read'])
  })

  it('does not require capabilities on list responses', () => {
    expect(workspaceSchema.parse({ ...base, role: 'member' }).capabilities).toBeUndefined()
  })
})
