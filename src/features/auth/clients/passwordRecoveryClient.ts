import {
  ACCOUNT_NOT_FOUND,
  AUTH_UPSTREAM_UNAVAILABLE,
  PASSWORD_ALREADY_IN_USE,
  PASSWORD_RESET_EMAIL_DELIVERY_FAILED,
} from '../authErrorCodes'
import { RECOVERY_COOLDOWN_SECONDS } from '../passwordRecoveryConstants'
import type { PasswordRecoveryClient } from '../types/PasswordRecoveryClient'

export const passwordRecoveryClient: PasswordRecoveryClient = {
  async requestPasswordReset(email) {
    const response = await fetch('/api/auth/request-password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        redirectTo: new URL('/reset-password', window.location.origin).toString(),
      }),
    })
    if (response.status === 429) {
      return { kind: 'rate-limited', retryAfterSeconds: readRetryAfter(response) }
    }
    if (!response.ok) {
      const code = await readErrorCode(response)
      if (response.status === 404 && code === ACCOUNT_NOT_FOUND) {
        return { kind: 'account-not-found' }
      }
      if (response.status === 503 && code === PASSWORD_RESET_EMAIL_DELIVERY_FAILED) {
        return { kind: 'delivery-failed' }
      }
      if (response.status === 502 && code === AUTH_UPSTREAM_UNAVAILABLE) {
        return { kind: 'upstream-unavailable' }
      }
      return { kind: 'failed' }
    }
    return { kind: 'accepted' }
  },

  async resetPassword(token, password) {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword: password }),
    })
    if (response.status === 400) {
      const code = await readErrorCode(response)
      return {
        kind: code === PASSWORD_ALREADY_IN_USE ? 'password-already-in-use' : 'invalid-link',
      }
    }
    if (!response.ok) return { kind: 'failed' }

    const result: unknown = await response.json().catch(() => undefined)
    return isSuccessfulReset(result) ? { kind: 'success' } : { kind: 'invalid-link' }
  },
}

async function readErrorCode(response: Response): Promise<string | undefined> {
  const body: unknown = await response.json().catch(() => undefined)
  if (typeof body !== 'object' || body === null || !('code' in body)) return undefined
  return typeof body.code === 'string' ? body.code : undefined
}

function readRetryAfter(response: Response) {
  const seconds = Number(
    response.headers.get('x-retry-after') ?? response.headers.get('retry-after'),
  )
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : RECOVERY_COOLDOWN_SECONDS
}

function isSuccessfulReset(value: unknown): value is { status: true } {
  return typeof value === 'object' && value !== null && 'status' in value && value.status === true
}
