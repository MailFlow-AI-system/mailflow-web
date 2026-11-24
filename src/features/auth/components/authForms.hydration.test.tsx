import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Server-rendered HTML is interactive before React hydrates. A native submission at that point
// would send credentials as a GET query string, so the forms must not submit until hydrated.
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
  useRouter: () => ({ invalidate: vi.fn() }),
  useHydrated: () => false,
}))
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ clear: vi.fn(), cancelQueries: vi.fn() }),
}))
vi.mock('#/config/env', () => ({ clientEnvironment: { workspaceSwitchingEnabled: false } }))

import { LoginForm } from './LoginForm'
import { ForgotPasswordForm, ResetPasswordForm } from './PasswordRecoveryForms'

afterEach(cleanup)

describe.each([
  ['login', () => <LoginForm />, 'Sign in'],
  [
    'forgot password',
    () => <ForgotPasswordForm requestPasswordReset={vi.fn()} />,
    'Send recovery link',
  ],
  [
    'reset password',
    () => <ResetPasswordForm token="token" resetPassword={vi.fn()} />,
    'Reset password',
  ],
])('%s form before hydration', (_name, renderForm, submitLabel) => {
  it('cannot submit natively and never uses GET', () => {
    const { container } = render(renderForm())
    expect(screen.getByRole('button', { name: submitLabel })).toBeDisabled()
    expect(container.querySelector('form')?.getAttribute('method')).toBe('post')
  })
})
