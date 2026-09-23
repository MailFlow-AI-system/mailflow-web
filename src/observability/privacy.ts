import type { TransportItem } from '@grafana/faro-web-sdk'

import { normalizeRoute } from './config'

const blockedKeys =
  /^(authorization|cookie|set-cookie|password|secret|token|api[-_]?key|email|subject|recipient|recipients|prompt|content|body|payload|user|username|fullname|workspace[-_]?id|job[-_]?id|email[-_]?id)$/i
const emailPattern = /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g
const credentialPattern =
  /\b(?:authorization|cookie|set-cookie|password|secret|token|api[-_]?key)\s*[:=]\s*(?:Bearer\s+)?[^\s,;]+/gi
const bearerPattern = /\bBearer\s+[^\s,;]+/gi

export function sanitizeTelemetryItem(item: TransportItem): TransportItem | null {
  const payload = sanitizeValue(item.payload, '')
  const meta = sanitizeValue(item.meta, 'meta')

  if (!isRecord(payload) || !isRecord(meta)) {
    return null
  }

  return { ...item, payload, meta }
}

function sanitizeValue(value: unknown, key: string): unknown {
  if (blockedKeys.test(key)) {
    return undefined
  }

  if (typeof value === 'string') {
    if (key === 'route' || key === 'fromRoute' || key === 'toRoute' || key === 'pathname') {
      return normalizeRoute(value)
    }
    if (key === 'url' || key === 'href' || key === 'filename' || key === 'source') {
      return stripUrlDetails(value)
    }
    return value
      .replace(credentialPattern, '[redacted-secret]')
      .replace(bearerPattern, 'Bearer [redacted-secret]')
      .replace(emailPattern, '[redacted-email]')
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => sanitizeValue(entry, key))
      .filter((entry): entry is Exclude<unknown, undefined> => entry !== undefined)
  }

  if (isRecord(value)) {
    const result: Record<string, unknown> = {}
    for (const [entryKey, entryValue] of Object.entries(value)) {
      const sanitized = sanitizeValue(entryValue, entryKey)
      if (sanitized !== undefined) {
        result[entryKey] = sanitized
      }
    }
    return result
  }

  return value
}

function stripUrlDetails(value: string): string {
  try {
    const url = new URL(value, 'https://mailflow.invalid')
    url.search = ''
    url.hash = ''
    const pathname = url.pathname
      .split('/')
      .map((segment) => (/^\d{1,18}$/.test(segment) ? ':id' : segment))
      .join('/')
    return url.origin === 'https://mailflow.invalid'
      ? pathname || '/'
      : `${url.origin}${pathname || '/'}`
  } catch {
    return value.split(/[?#]/, 1)[0] || '/'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
