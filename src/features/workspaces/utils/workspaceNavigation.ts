import { workspaceSchema } from '../schemas'
import type { Workspace } from '../types'
import { isWorkspaceRequestOrigin } from './workspaceOrigin'

const handoffCode = /^[A-Za-z0-9_-]{43}$/

// Core issues `https://{slug}.{base}/auth/handoff?code=…`. Navigate only to that exact shape on
// the selected workspace host, keeping the current protocol and port.
export function workspaceHandoffDestination(
  handoff: string,
  current: string,
  baseHost: string,
  workspace: Workspace,
) {
  const source = new URL(current)
  if (!isWorkspaceRequestOrigin(source, baseHost)) throw new Error('Invalid workspace origin')
  const target = workspaceSchema.parse(workspace)
  const expected = new URL(source)
  expected.hostname = `${target.slug}.${baseHost}`
  const url = new URL(handoff)
  const codes = url.searchParams.getAll('code')
  if (
    url.origin !== expected.origin ||
    url.username ||
    url.password ||
    url.hash ||
    url.pathname !== '/auth/handoff' ||
    [...url.searchParams.keys()].length !== 1 ||
    codes.length !== 1 ||
    !handoffCode.test(codes[0] ?? '')
  )
    throw new Error('Invalid workspace handoff')
  return url.href
}
