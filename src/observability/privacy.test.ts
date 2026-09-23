import type { TransportItem } from '@grafana/faro-web-sdk'
import { describe, expect, it } from 'vitest'

import { sanitizeTelemetryItem } from './privacy'

describe('sanitizeTelemetryItem', () => {
  it('removes sensitive fields and normalizes URLs before transport', () => {
    const item = sanitizeTelemetryItem({
      type: 'event',
      payload: {
        name: 'mailflow.navigation',
        attributes: {
          route: '/app/workspaces/123',
          email: 'person@example.test',
          authorization: 'Bearer secret',
          content: 'private message body',
        },
        url: 'https://app.example.test/app?email=person@example.test',
      },
      meta: {
        user: { email: 'person@example.test', id: 'user-123' },
        page: { url: 'https://app.example.test/app?token=secret' },
      },
    } as unknown as TransportItem)

    expect(item).not.toBeNull()
    expect(item?.payload).toEqual({
      name: 'mailflow.navigation',
      attributes: { route: '/app/workspaces/:id' },
      url: 'https://app.example.test/app',
    })
    expect(item?.meta).toEqual({ page: { url: 'https://app.example.test/app' } })
  })

  it('preserves safe technical error fields while removing user metadata', () => {
    const item = sanitizeTelemetryItem({
      type: 'exception',
      payload: {
        type: 'Error',
        value: 'Request failed for person@example.test',
        stacktrace: { frames: [{ filename: '/assets/app.js', function: 'load' }] },
      },
      meta: { app: { name: 'mailflow-web', version: '0.1.0' } },
    } as unknown as TransportItem)

    expect(item?.payload).toMatchObject({
      type: 'Error',
      value: 'Request failed for [redacted-email]',
    })
    expect(item?.meta).toEqual({ app: { name: 'mailflow-web', version: '0.1.0' } })
  })

  it('redacts credentials embedded in technical strings', () => {
    const item = sanitizeTelemetryItem({
      type: 'exception',
      payload: {
        type: 'Error',
        value: 'Authorization: Bearer super-secret Cookie: session=private-token',
      },
      meta: { app: { name: 'mailflow-web' } },
    } as unknown as TransportItem)

    expect(JSON.stringify(item)).not.toContain('super-secret')
    expect(JSON.stringify(item)).not.toContain('private-token')
  })
})
