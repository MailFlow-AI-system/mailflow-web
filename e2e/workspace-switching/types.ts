export type SwitchingFixture = {
  host: string
  targetHost: string
  email: string
  otherEmail: string
  emptyEmail: string
  currentId: string
  fallbackHost: string
  password: string
  targetId: string
  unrelatedId: string
  controlKey: string
  selections: number
  globalMailCalls: number
  preference: string | null
  hasActiveOrganization: boolean
}
