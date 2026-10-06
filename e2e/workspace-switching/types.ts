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
  unrelatedHost: string
  controlKey: string
  selections: number
  globalMailCalls: number
  preference: string | null
  hasActiveOrganization: boolean
}

export type PausedWorkspaceResponse = {
  requestId: string
  request: { url: string }
  responseStatusCode?: number
  responseHeaders?: { name: string; value: string }[]
}
