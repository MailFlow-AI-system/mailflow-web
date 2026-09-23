import type { TransportItem } from '@grafana/faro-web-sdk'

import { normalizeRoute } from './config'

const blockedKeys =
  /^(authorization|cookie|set-cookie|password|secret|token|accessToken|refreshToken|api[-_]?key|email|subject|recipient|recipients|prompt|content|body|payload|user|username|fullname|workspace[-_]?id|job[-_]?id|email[-_]?id|detail)$/i
const emailPattern = /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g
const credentialPattern =
  /\b(?:authorization|cookie|set-cookie|password|secret|token|api[-_]?key)\s*[:=]\s*(?:Bearer\s+)?[^\s,;]+/gi
const bearerPattern = /\bBearer\s+[^\s,;]+/gi

export function sanitizeTelemetryItem(item: TransportItem): TransportItem | null {
  const payload = sanitizeValue(item.payload, '', item.type)
  const meta = sanitizeValue(item.meta, 'meta', item.type)

  if (!isRecord(payload) || !isRecord(meta)) {
    return null
  }

  return { ...item, payload, meta }
}

function sanitizeValue(value: unknown, key: string, signalType: string): unknown {
  if (isBlockedKey(key)) {
    return undefined
  }

  if (typeof value === 'string') {
    if (key === 'message' || (signalType === 'exception' && key === 'value')) {
      return '[redacted]'
    }
    if (key === 'route' || key === 'fromRoute' || key === 'toRoute' || key === 'pathname') {
      return normalizeRoute(value)
    }
    if (
      /(?:^|[._-])(url|href|filename|source)(?:$|[._-])/i.test(key) ||
      /^https?:\/\//i.test(value) ||
      value.startsWith('/')
    ) {
      return stripUrlDetails(value)
    }
    return value
      .replace(credentialPattern, '[redacted-secret]')
      .replace(bearerPattern, 'Bearer [redacted-secret]')
      .replace(emailPattern, '[redacted-email]')
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => sanitizeValue(entry, key, signalType))
      .filter((entry): entry is Exclude<unknown, undefined> => entry !== undefined)
  }

  if (isRecord(value)) {
    if (typeof value.key === 'string' && 'value' in value && isBlockedKey(value.key)) {
      return undefined
    }
    const result: Record<string, unknown> = {}
    for (const [entryKey, entryValue] of Object.entries(value)) {
      const sanitized = sanitizeValue(entryValue, entryKey, signalType)
      if (sanitized !== undefined) {
        result[entryKey] = sanitized
      }
    }
    return result
  }

  return value
}

function isBlockedKey(key: string): boolean {
  return key.split(/[._-]/).some((part) => blockedKeys.test(part)) || blockedKeys.test(key)
}

function stripUrlDetails(value: string): string {
  try {
    const url = new URL(value, 'https://mailflow.invalid')
    url.search = ''
    url.hash = ''
    const pathname = /^\/assets\/[A-Za-z0-9._-]+\.(?:js|css)$/.test(url.pathname)
      ? url.pathname
      : normalizeRoute(url.pathname)
    return url.origin === 'https://mailflow.invalid'
      ? pathname || '/'
      : `${url.origin}${pathname || '/'}`
  } catch {
    return '/:path'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
