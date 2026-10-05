export type SwitchingFixture = {
  host: string
  targetHost: string
  email: string
  password: string
  targetId: string
  unrelatedId: string
  controlKey: string
  selections: number
  globalMailCalls: number
  preference: string | null
  hasActiveOrganization: boolean
}
