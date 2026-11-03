import { afterEach, expect, it, vi } from 'vitest'
import { assignSentLabels, createLabel, fetchLabelPalette } from './labels'

afterEach(() => vi.unstubAllGlobals())

it('associates a label with the confirmed message in the original workspace and surfaces a retryable failure', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response(null, { status: 502 }))
    .mockResolvedValueOnce(Response.json({ items: [] }))
  vi.stubGlobal('fetch', fetcher)
  const scope = {
    userId: 'owner',
    workspace: { id: 'a', slug: 'team-a', name: 'Team A', role: 'owner' as const },
  }
  await expect(assignSentLabels(scope, 'sent-id', ['label-id'])).rejects.toThrow()
  await expect(assignSentLabels(scope, 'sent-id', ['label-id'])).resolves.toBeUndefined()
  expect(fetcher).toHaveBeenCalledTimes(2)
  expect(fetcher).toHaveBeenLastCalledWith(
    '/api/mail/labels/team-a/sent/sent-id/label-id',
    expect.objectContaining({
      method: 'PUT',
      headers: expect.objectContaining({ 'X-Workspace-Identity': 'owner' }),
    }),
  )
})

it('loads the suggested palette and sends the explicitly selected color', async () => {
  const color = '#9333ea'
  const label = { id: '00000000-0000-4000-8000-000000000001', name: 'Invoice', color }
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ colors: ['#2563eb', color], suggestedColor: '#2563eb' }))
    .mockResolvedValueOnce(Response.json(label))
  vi.stubGlobal('fetch', fetcher)
  const scope = {
    userId: 'owner',
    workspace: { id: 'a', slug: 'team-a', name: 'Team A', role: 'owner' as const },
  }
  await expect(fetchLabelPalette(scope, new AbortController().signal)).resolves.toMatchObject({
    suggestedColor: '#2563eb',
  })
  await expect(createLabel(scope, label.name, color)).resolves.toEqual(label)
  expect(fetcher.mock.calls[0]?.[0]).toBe('/api/mail/labels/team-a/palette')
  expect(JSON.parse(fetcher.mock.calls[1]?.[1].body)).toEqual({ name: label.name, color })
})
