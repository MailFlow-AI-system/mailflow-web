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
      attributes: { route: '/app/:path' },
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
          url: 'https://app.example.test/app/messages/person@example.test',
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
    expect(item?.meta).toEqual({ page: { url: 'https://app.example.test/app/:path' } })
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
