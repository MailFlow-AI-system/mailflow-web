import { clientEnvironment } from '@/config/env'

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const baseUrl = clientEnvironment.VITE_API_BASE_URL.replace(/\/$/, '')

  return `${baseUrl}${normalizedPath}`
}
