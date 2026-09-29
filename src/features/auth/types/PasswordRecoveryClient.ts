export type RequestPasswordResetResult =
  | { kind: 'accepted' }
  | { kind: 'rate-limited'; retryAfterSeconds: number }
  | { kind: 'account-not-found' }
  | { kind: 'delivery-failed' }
  | { kind: 'upstream-unavailable' }
  | { kind: 'failed' }

export type ResetPasswordResult =
  | { kind: 'success' }
  | { kind: 'invalid-link' }
  | { kind: 'password-already-in-use' }
  | { kind: 'failed' }

export type PasswordRecoveryClient = {
  requestPasswordReset: (email: string) => Promise<RequestPasswordResetResult>
  resetPassword: (token: string, password: string) => Promise<ResetPasswordResult>
}
