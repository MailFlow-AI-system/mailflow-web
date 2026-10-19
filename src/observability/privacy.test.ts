import type { TransportItem } from '@grafana/faro-web-sdk'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { sanitizeTelemetryItem } from './privacy'

describe('sanitizeTelemetryItem', () => {
  afterEach(() => vi.unstubAllEnvs())
  it('masks plain tenant hosts in actual Faro performance and OTel address attributes', () => {
    vi.stubEnv('VITE_WORKSPACE_BASE_HOST', 'workspace.test')
    const item = sanitizeTelemetryItem({
      type: 'trace',
      payload: {
        attributes: {
          httpHost: 'private-acme.workspace.test:3003',
          'server.address': 'private-acme.workspace.test',
        },
        spans: [
          {
            attributes: [
              { key: 'server.address', value: { stringValue: 'private-acme.workspace.test' } },
            ],
          },
        ],
      },
      meta: {},
    } as unknown as TransportItem)
    expect(JSON.stringify(item)).not.toContain('private-acme')
    expect(item?.payload).toMatchObject({
      attributes: { httpHost: 'workspace.test:3003', 'server.address': 'workspace.test' },
    })
  })
  it('does not export the workspace identity precondition through headers or span attributes', () => {
    const item = sanitizeTelemetryItem({
      type: 'event',
      payload: {
        name: 'request',
        attributes: {
          'request.headers.x-workspace-identity': 'private-actor',
          identityId: 'private-actor',
          technical: 'X-Workspace-Identity: private-actor',
          spans: [{ key: 'http.request.header.x-workspace-identity', value: 'private-actor' }],
        },
      },
      meta: {},
    } as unknown as TransportItem)
    expect(JSON.stringify(item)).not.toContain('private-actor')
    expect(item?.payload).toMatchObject({
      attributes: { technical: '[redacted-secret]', spans: [] },
    })
  })
  it('redacts tenant hostnames and workspace identity from browser telemetry', () => {
    vi.stubEnv('VITE_WORKSPACE_BASE_HOST', 'workspace.test')
    const item = sanitizeTelemetryItem({
      type: 'event',
      payload: {
        name: 'mailflow.navigation',
        attributes: {
          workspaceId: 'private-id',
          workspaceSlug: 'private-acme',
          hostname: 'private-acme.workspace.test',
        },
      },
      meta: { page: { url: 'https://private-acme.workspace.test/inbox?token=secret' } },
    } as unknown as TransportItem)
    expect(item?.meta).toEqual({ page: { url: 'https://workspace.test/inbox' } })
    expect(JSON.stringify(item)).not.toMatch(/private-acme|private-id|secret/)
  })
  it('removes dotted workspace attributes from Faro and OpenTelemetry payloads', () => {
    const item = sanitizeTelemetryItem({
      type: 'trace',
      payload: {
        attributes: {
          'workspace.name': 'private-workspace',
          'workspace.id': 'private-id',
          'tenant.name': 'private-tenant',
          'mailflow.workspace.slug': 'private-slug',
          'mailflow.workspace.operation': 'selection',
          'mailflow.workspace.result': 'denied',
        },
        spans: [
          {
            attributes: [
              {
                key: 'workspace.name',
                value: { stringValue: 'private-workspace' },
              },
              { key: 'tenant.name', value: { stringValue: 'private-tenant' } },
              { key: 'mailflow.workspace.slug', value: { stringValue: 'private-slug' } },
              {
                key: 'mailflow.workspace.operation',
                value: { stringValue: 'selection' },
              },
              { key: 'mailflow.workspace.result', value: { stringValue: 'denied' } },
            ],
          },
        ],
      },
      meta: {},
    } as unknown as TransportItem)

    expect(item?.payload).toEqual({
      attributes: {
        'mailflow.workspace.operation': 'selection',
        'mailflow.workspace.result': 'denied',
      },
      spans: [
        {
          attributes: [
            { key: 'mailflow.workspace.operation', value: { stringValue: 'selection' } },
            { key: 'mailflow.workspace.result', value: { stringValue: 'denied' } },
          ],
        },
      ],
    })
    expect(JSON.stringify(item)).not.toMatch(
      /private-workspace|private-id|private-tenant|private-slug/,
    )
  })
  it('removes reset tokens from page URLs before transport', () => {
    const item = sanitizeTelemetryItem({
      type: 'view',
      payload: {
        view: { url: 'https://app.example.test/reset-password?token=private-reset-token' },
      },
      meta: { page: { url: 'https://app.example.test/reset-password?token=private-reset-token' } },
    } as unknown as TransportItem)

    expect(item?.payload).toEqual({ view: { url: 'https://app.example.test/reset-password' } })
    expect(item?.meta).toEqual({ page: { url: 'https://app.example.test/reset-password' } })
    expect(JSON.stringify(item)).not.toContain('private-reset-token')
  })

  it('removes sensitive fields and normalizes URLs before transport', () => {
    const item = sanitizeTelemetryItem({
      type: 'event',
      payload: {
        name: 'mailflow.navigation',
        attributes: {
          route: '/inbox/workspaces/123',
          email: 'person@example.test',
          authorization: 'Bearer secret',
          content: 'private message body',
        },
        url: 'https://app.example.test/inbox?email=person@example.test',
      },
      meta: {
        user: { email: 'person@example.test', id: 'user-123' },
        page: { url: 'https://app.example.test/inbox?token=secret' },
      },
    } as unknown as TransportItem)

    expect(item).not.toBeNull()
    expect(item?.payload).toEqual({
      name: 'mailflow.navigation',
      attributes: { route: '/:path' },
      url: 'https://app.example.test/inbox',
    })
    expect(item?.meta).toEqual({ page: { url: 'https://app.example.test/inbox' } })
  })

  it('preserves bounded auth failure dimensions while removing sensitive attributes', () => {
    const item = sanitizeTelemetryItem({
      type: 'event',
      payload: {
        name: 'mailflow.auth.operation',
        attributes: {
          operation: 'sign_in',
          result: 'unavailable',
          durationBucket: '100_499ms',
          email: 'person@example.test',
          token: 'private-token',
        },
      },
      meta: {},
    } as unknown as TransportItem)

    expect(item?.payload).toEqual({
      name: 'mailflow.auth.operation',
      attributes: {
        operation: 'sign_in',
        result: 'unavailable',
        durationBucket: '100_499ms',
      },
    })
    expect(JSON.stringify(item)).not.toMatch(/person@example\.test|private-token/)
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
      value: '[redacted]',
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

  it('removes private URLs from SDK performance and tracing attributes', () => {
    const item = sanitizeTelemetryItem({
      type: 'event',
      payload: {
        name: 'faro.tracing.fetch',
        attributes: {
          name: 'https://api.example.test/messages/private-message?access_token=private123',
          'url.full': 'https://api.example.test/messages/private-message?access_token=private123',
          accessToken: 'private123',
          'request.headers.authorization': 'Bearer private123',
          duration: '12',
        },
      },
      meta: {
        page: {
          url: 'https://app.example.test/inbox/messages/person@example.test',
        },
      },
    } as unknown as TransportItem)

    expect(item?.payload).toMatchObject({
      attributes: {
        name: 'https://api.example.test/:path',
        'url.full': 'https://api.example.test/:path',
        duration: '12',
      },
    })
    expect(item?.meta).toEqual({ page: { url: 'https://app.example.test/:path' } })
    expect(JSON.stringify(item)).not.toMatch(/private-message|private123|person@example/)
  })

  it('redacts arbitrary exception messages and keeps asset filenames for source maps', () => {
    const item = sanitizeTelemetryItem({
      type: 'exception',
      payload: {
        type: 'Error',
        value: 'Failed to process private message body',
        stacktrace: {
          frames: [{ filename: 'https://app.example.test/assets/app.js?token=secret' }],
        },
      },
      meta: {},
    } as unknown as TransportItem)

    expect(item?.payload).toMatchObject({
      value: '[redacted]',
      stacktrace: { frames: [{ filename: 'https://app.example.test/assets/app.js' }] },
    })
    expect(JSON.stringify(item)).not.toMatch(/private message body|token=secret/)
  })

  it('sanitizes OpenTelemetry span attributes stored as key/value entries', () => {
    const item = sanitizeTelemetryItem({
      type: 'trace',
      payload: {
        resourceSpans: [
          {
            scopeSpans: [
              {
                spans: [
                  {
                    attributes: [
                      {
                        key: 'http.request.header.authorization',
                        value: { stringValue: 'Bearer private123' },
                      },
                      {
                        key: 'url.full',
                        value: {
                          stringValue:
                            'https://api.example.test/messages/private-message?token=private123',
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      meta: {},
    } as unknown as TransportItem)

    expect(JSON.stringify(item)).not.toMatch(/private123|private-message/)
    expect(item?.payload).toMatchObject({
      resourceSpans: [
        {
          scopeSpans: [
            {
              spans: [
                {
                  attributes: [
                    { key: 'url.full', value: { stringValue: 'https://api.example.test/:path' } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })
  })
})
