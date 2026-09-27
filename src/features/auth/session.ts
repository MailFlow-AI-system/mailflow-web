import { z } from 'zod'

const authSessionSchema = z.object({
  session: z.object({ id: z.string() }),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }),
})

export type AuthUser = {
  id: string
  name: string
  email: string
}

export async function readAuthSession(
  apiBaseUrl: string,
  cookie: string | undefined,
  fetcher: typeof fetch = fetch,
): Promise<AuthUser | null> {
  if (!cookie) return null

  const response = await fetcher(`${apiBaseUrl.replace(/\/$/, '')}/api/auth/get-session`, {
    headers: { Cookie: cookie },
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
