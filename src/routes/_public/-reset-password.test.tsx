import { cleanup, render, screen } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import type { ComponentType } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('#/features/auth/components/PasswordRecoveryForms', () => ({
  ResetPasswordForm: ({ token }: { token?: string }) => (
    <p data-testid="reset-token">{token ?? 'missing'}</p>
  ),
}))

import { Route } from './reset-password'

const ResetPasswordPage = Route.options.component as ComponentType

describe('Password reset query state', () => {
  afterEach(cleanup)

  it('reads the opaque token through Nuqs without changing its contents', () => {
    render(
      <NuqsTestingAdapter searchParams="?token=opaque%2Bvalue%2Fsegment%3D">
        <ResetPasswordPage />
      </NuqsTestingAdapter>,
    )
    expect(screen.getByTestId('reset-token')).toHaveTextContent('opaque+value/segment=')
  })

  it('keeps absent tokens absent rather than serializing undefined into a string', () => {
    render(
      <NuqsTestingAdapter searchParams="">
        <ResetPasswordPage />
      </NuqsTestingAdapter>,
    )
    expect(screen.getByTestId('reset-token')).toHaveTextContent('missing')
  })

  it('omits missing and non-string token values from the router search object', () => {
    const validate = Route.options.validateSearch
    if (typeof validate !== 'function')
      throw new Error('Password reset search validator is missing')
    expect(validate({})).toEqual({})
    expect(validate({ token: 123 })).toEqual({})
    expect(validate({ token: 'opaque+value/segment=' })).toEqual({ token: 'opaque+value/segment=' })
  })
})
