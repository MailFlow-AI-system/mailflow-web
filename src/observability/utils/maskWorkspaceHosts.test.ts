import { expect, it } from 'vitest'
import { maskWorkspaceHosts } from './maskWorkspaceHosts'

it('masks configured tenant hosts without touching unrelated hosts or technical IDs', () => {
  expect(maskWorkspaceHosts('acme.workspace.test:3003', 'workspace.test')).toBe(
    'workspace.test:3003',
  )
  expect(maskWorkspaceHosts('Address: ACME.WORKSPACE.TEST, trace=123', 'workspace.test')).toBe(
    'Address: workspace.test, trace=123',
  )
  expect(maskWorkspaceHosts('nested.acme.workspace.test', 'workspace.test')).toBe('workspace.test')
  expect(maskWorkspaceHosts('acme.workspace.test.evil', 'workspace.test')).toBe(
    'acme.workspace.test.evil',
  )
  expect(maskWorkspaceHosts('acme.workspaceXtest', 'workspace.test')).toBe('acme.workspaceXtest')
  expect(maskWorkspaceHosts('workspace.test trace=123', 'workspace.test')).toBe(
    'workspace.test trace=123',
  )
  expect(maskWorkspaceHosts('acme.workspace.test', undefined)).toBe('acme.workspace.test')
})
