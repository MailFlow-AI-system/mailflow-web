import { env } from 'cloudflare:workers'
import { createServerOnlyFn } from '@tanstack/react-start'

/** Reads the `MAILFLOW_PROXY_SECRET` Worker secret per request; empty means unset. */
export const readProxySecret = createServerOnlyFn(
  (): string | undefined => env.MAILFLOW_PROXY_SECRET || undefined,
)
