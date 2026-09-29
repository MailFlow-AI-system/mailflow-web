import type { User } from '#/types/User'

export type AuthUser = Pick<User, 'id' | 'name' | 'email'>
