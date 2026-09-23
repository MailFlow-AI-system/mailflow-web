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

  const absoluteUrl = normalized.startsWith('/') ? undefined : new URL(normalized)
  const origin = !absoluteUrl
    ? typeof window === 'undefined'
      ? ''
      : window.location.origin
    : absoluteUrl.origin
  const pathname = absoluteUrl?.pathname ?? normalized
  const suffix = pathname === '/' ? '' : '(?:/|$)'
  return new RegExp(`^${escapeRegExp(origin)}${escapeRegExp(pathname)}${suffix}`)
}

export function normalizeRoute(pathname: string): string {
  const path = pathname.split(/[?#]/, 1)[0] || '/'
  if (path === '/' || path === '/app') return path
  if (path.startsWith('/app/')) return '/app/:path'
  return '/:path'
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
