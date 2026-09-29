import { z } from 'zod'

import type { ForgotPasswordValues, ResetPasswordValues } from '../types/PasswordRecoveryValues'

export const forgotPasswordSchema = z.object({
  email: z.email('Enter a valid email address.'),
}) satisfies z.ZodType<ForgotPasswordValues>

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmation: z.string(),
  })
  .refine(({ password, confirmation }) => password === confirmation, {
    path: ['confirmation'],
    message: 'Passwords do not match.',
  }) satisfies z.ZodType<ResetPasswordValues>
