import { filterBetterAuthCookies } from './authCookies'
import { authSessionSchema } from './schemas/authSessionSchema'
import type { AuthUser } from './types/AuthUser'

export async function readAuthSession(
  apiBaseUrl: string,
  cookie: string | undefined,
  fetcher: typeof fetch = fetch,
): Promise<AuthUser | null> {
  const authCookies = filterBetterAuthCookies(cookie)
  if (!authCookies) return null

  const response = await fetcher(`${apiBaseUrl.replace(/\/$/, '')}/api/auth/get-session`, {
    headers: { Cookie: authCookies },
    cache: 'no-store',
  })

  if (!response.ok) {
    if (response.status === 401) return null
    throw new Error('Unable to verify the session')
  }

  const data: unknown = await response.json()
  if (!data) return null
  const parsed = authSessionSchema.safeParse(data)
  if (!parsed.success) throw new Error('Unable to verify the session')

  return parsed.data.user
}
