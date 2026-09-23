import { z } from 'zod'

type RuntimeEnvironment = Record<string, unknown>

const identifier = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/)

const collectorUrl = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    try {
      const url = new URL(value)
      return (
        (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password
      )
    } catch {
      return false
    }
  })

const faroEnvironment = z.object({
  VITE_FARO_COLLECTOR_URL: collectorUrl,
  VITE_FARO_APP_NAME: identifier,
  VITE_FARO_APP_ENVIRONMENT: identifier,
  VITE_FARO_APP_VERSION: identifier,
})

export type FaroConfig = {
  collectorUrl: string
  appName: string
  environment: string
  version: string
  apiBaseUrl: string
  tracePropagationPattern: RegExp
}

export function createFaroConfig(runtimeEnv: RuntimeEnvironment): FaroConfig | undefined {
  const parsed = faroEnvironment.safeParse(runtimeEnv)
  if (!parsed.success) {
    return undefined
  }

  const apiBaseUrl = parseApiBaseUrl(runtimeEnv.VITE_API_BASE_URL)
  if (!apiBaseUrl) {
    return undefined
  }

  try {
    return {
      collectorUrl: parsed.data.VITE_FARO_COLLECTOR_URL,
      appName: parsed.data.VITE_FARO_APP_NAME,
      environment: parsed.data.VITE_FARO_APP_ENVIRONMENT,
      version: parsed.data.VITE_FARO_APP_VERSION,
      apiBaseUrl,
      tracePropagationPattern: createTracePropagationPattern(apiBaseUrl),
    }
  } catch {
    return undefined
  }
}

export function createTracePropagationPattern(apiBaseUrl: string): RegExp {
  const normalized = parseApiBaseUrl(apiBaseUrl)
  if (!normalized) {
    throw new Error('Invalid API base URL')
  }

  if (normalized.startsWith('/')) {
    const origin = typeof window === 'undefined' ? '' : window.location.origin
    return new RegExp(`^${escapeRegExp(origin)}${escapeRegExp(normalized)}(?:/|$)`)
  }

  const url = new URL(normalized)
  return new RegExp(`^${escapeRegExp(url.origin)}${escapeRegExp(url.pathname)}(?:/|$)`)
}

export function normalizeRoute(pathname: string): string {
  const path = pathname.split(/[?#]/, 1)[0] || '/'
  const normalized = path
    .split('/')
    .map((segment) => {
      if (!segment) return ''
      if (/^\d{1,18}$/.test(segment) || /^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(segment)) {
        return ':id'
      }
      if (/^[^/\s@]+@[^/\s@]+\.[^/\s@]+$/.test(segment)) {
        return ':id'
      }
      return segment.length > 64 ? ':segment' : segment
    })
    .join('/')

  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

function parseApiBaseUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.trim() === '') {
    return '/api'
  }

  const trimmed = value.trim()
  if (trimmed.startsWith('/')) {
    if (!/^\/[^?#]*$/.test(trimmed)) return undefined
    return trimmed.replace(/\/+$/, '') || '/'
  }

  try {
    const url = new URL(trimmed)
    if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password) {
      return undefined
    }
    url.search = ''
    url.hash = ''
    url.pathname = url.pathname.replace(/\/+$/, '') || '/'
    return url.toString().replace(/\/$/, url.pathname === '/' ? '/' : '')
  } catch {
    return undefined
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
