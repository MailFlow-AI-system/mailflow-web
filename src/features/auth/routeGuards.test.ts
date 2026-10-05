import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getCurrentSession, redirect } = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
  redirect: vi.fn((options: unknown) => ({ isRedirect: true, options })),
}))

vi.mock('./adapters/getCurrentSession', () => ({ getCurrentSession }))
vi.mock('@tanstack/react-router', () => ({ redirect }))

import {
  redirectAuthenticatedLogin,
  redirectRootEntry,
  requireAuthenticatedUser,
} from './routeGuards'

const user = { id: 'user-1', name: 'Ada', email: 'ada@example.test' }

describe('auth route guards', () => {
  beforeEach(() => {
    getCurrentSession.mockReset()
    redirect.mockClear()
    redirect.mockImplementation((options) => ({ isRedirect: true, options }))
  })

  it('replaces the root entry with login when no session exists', async () => {
    getCurrentSession.mockResolvedValue(null)
    await expect(redirectRootEntry()).rejects.toEqual({
      isRedirect: true,
      options: { to: '/login', replace: true },
    })
  })

  it('replaces the root entry with inbox for an authenticated user', async () => {
    getCurrentSession.mockResolvedValue(user)
    await expect(redirectRootEntry()).rejects.toEqual({
      isRedirect: true,
      options: { to: '/inbox', replace: true },
    })
  })

  it('redirects authenticated users away from login and leaves public users there', async () => {
    getCurrentSession.mockResolvedValue(user)
    await expect(redirectAuthenticatedLogin()).rejects.toEqual({
      isRedirect: true,
      options: { to: '/inbox', replace: true },
    })

    redirect.mockClear()
    getCurrentSession.mockResolvedValue(null)
    await expect(redirectAuthenticatedLogin()).resolves.toBeUndefined()
    expect(redirect).not.toHaveBeenCalled()
  })

  it('returns the current user from the authenticated layout', async () => {
    getCurrentSession.mockResolvedValue(user)
    await expect(requireAuthenticatedUser()).resolves.toEqual({ user })
  })

  it('replaces protected navigation with login when no session exists', async () => {
    getCurrentSession.mockResolvedValue(null)
    await expect(requireAuthenticatedUser()).rejects.toEqual({
      isRedirect: true,
      options: { to: '/login', replace: true },
    })
  })

  it('propagates session lookup failures instead of treating them as signed out', async () => {
    const error = new Error('Unable to verify the session')
    getCurrentSession.mockRejectedValue(error)

    for (const guard of [redirectRootEntry, redirectAuthenticatedLogin, requireAuthenticatedUser]) {
      await expect(guard()).rejects.toBe(error)
    }
    expect(redirect).not.toHaveBeenCalled()
  })
  it('preserves only a collection and clears inherited fragments when workspace login is required', async () => {
    getCurrentSession.mockResolvedValue(null)
    await expect(
      requireAuthenticatedUser({ location: { pathname: '/sent' }, clearFragment: true }),
    ).rejects.toEqual({
      isRedirect: true,
      options: { href: '/login?returnTo=%2Fsent#', replace: true, reloadDocument: true },
    })
    await expect(
      requireAuthenticatedUser({ location: { pathname: '//attacker.test' }, clearFragment: true }),
    ).rejects.toMatchObject({ options: { href: '/login#' } })
  })
  it('continues an already authenticated login only to the validated collection', async () => {
    getCurrentSession.mockResolvedValue(user)
    await expect(
      redirectAuthenticatedLogin({ search: { returnTo: '/drafts' } }),
    ).rejects.toMatchObject({ options: { to: '/drafts', replace: true } })
  })
})
