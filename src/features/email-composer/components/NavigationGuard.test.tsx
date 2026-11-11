import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ComposerContext } from '../context'
import type { ComposerContextValue } from '../types/composer'
import { NavigationGuard } from './NavigationGuard'

afterEach(cleanup)

function setup({ dirty = true, discardWorks = true, saveWorks = true } = {}) {
  const sessionRef = { current: 0 }
  const discard = vi.fn(async () => {
    if (discardWorks) sessionRef.current += 1
  })
  const saveDraft = vi.fn(async () => saveWorks)
  const context = {
    theme: 'light',
    sessionRef,
    isDirty: () => dirty,
    discard,
    saveDraft,
  } as unknown as ComposerContextValue
  const root = createRootRoute({
    component: () => (
      <ComposerContext.Provider value={context}>
        <NavigationGuard scope="/mail" />
        <Outlet />
      </ComposerContext.Provider>
    ),
  })
  const page = (path: string) =>
    createRoute({ getParentRoute: () => root, path, component: () => <p>page {path}</p> })
  const router = createRouter({
    routeTree: root.addChildren([page('/mail/a'), page('/mail/b'), page('/login')]),
    history: createMemoryHistory({ initialEntries: ['/mail/a'] }),
  })
  render(<RouterProvider router={router} />)
  return { router, discard, saveDraft }
}

type Router = ReturnType<typeof setup>['router']

const leave = (router: Router) =>
  act(async () => {
    void router.navigate({ to: '/login' })
  })

describe('NavigationGuard', () => {
  it('asks before leaving the mail layout with unsaved changes', async () => {
    const { router } = setup()
    await screen.findByText('page /mail/a')
    await leave(router)
    expect(await screen.findByRole('alertdialog', { name: 'Leave this page?' })).toBeVisible()
    expect(router.state.location.pathname).toBe('/mail/a')
  })

  it('does not interrupt navigation between mail pages, where the composer stays mounted', async () => {
    const { router } = setup()
    await screen.findByText('page /mail/a')
    await act(async () => router.history.push('/mail/b'))
    await waitFor(() => expect(router.state.location.pathname).toBe('/mail/b'))
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('does not interrupt navigation when nothing is unsaved', async () => {
    const { router } = setup({ dirty: false })
    await screen.findByText('page /mail/a')
    await act(async () => {
      await router.navigate({ to: '/login' })
    })
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('stays on the page when the user keeps editing', async () => {
    const user = userEvent.setup()
    const { router } = setup()
    await screen.findByText('page /mail/a')
    await leave(router)
    await user.click(await screen.findByRole('button', { name: 'Continue editing' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(router.state.location.pathname).toBe('/mail/a')
  })

  it('discards the message and then leaves', async () => {
    const user = userEvent.setup()
    const { router, discard } = setup()
    await screen.findByText('page /mail/a')
    await leave(router)
    await user.click(await screen.findByRole('button', { name: 'Discard changes' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(discard).toHaveBeenCalledTimes(1)
  })

  it('stays on the page when discarding fails so the message is not lost', async () => {
    const user = userEvent.setup()
    const { router, discard } = setup({ discardWorks: false })
    await screen.findByText('page /mail/a')
    await leave(router)
    await user.click(await screen.findByRole('button', { name: 'Discard changes' }))
    await waitFor(() => expect(discard).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(router.state.location.pathname).toBe('/mail/a')
  })

  it('saves the draft and then leaves', async () => {
    const user = userEvent.setup()
    const { router, saveDraft } = setup()
    await screen.findByText('page /mail/a')
    await leave(router)
    await user.click(await screen.findByRole('button', { name: 'Save draft' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(saveDraft).toHaveBeenCalledTimes(1)
  })

  it('stays on the page when saving fails so the message is not lost', async () => {
    const user = userEvent.setup()
    const { router, saveDraft } = setup({ saveWorks: false })
    await screen.findByText('page /mail/a')
    await leave(router)
    await user.click(await screen.findByRole('button', { name: 'Save draft' }))
    await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(router.state.location.pathname).toBe('/mail/a')
  })
})
