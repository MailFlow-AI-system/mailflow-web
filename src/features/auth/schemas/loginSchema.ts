import { z } from 'zod'

import type { LoginValues } from '../types/LoginValues'

export const loginSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
}) satisfies z.ZodType<LoginValues>
