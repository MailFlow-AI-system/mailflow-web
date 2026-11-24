export type SwitchingFixture = {
  host: string
  targetHost: string
  email: string
  otherEmail: string
  emptyEmail: string
  currentId: string
  password: string
  targetId: string
  unrelatedId: string
  unrelatedHost: string
  controlKey: string
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

export type PausedWorkspacePath = '/api/workspace-context' | '/api/auth/workspace-handoff/issue'

export type WorkspaceQaCase = {
  name: string
  theme: 'dark' | 'light'
  viewport: { width: number; height: number }
  isMobile: boolean
}
