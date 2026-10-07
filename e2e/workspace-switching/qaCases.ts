import type { WorkspaceQaCase } from './types'

export const LOCAL_QA_READINESS_MS = 30000

export const workspaceQaCases: readonly WorkspaceQaCase[] = [
  { name: 'desktop dark', theme: 'dark', viewport: { width: 1440, height: 900 }, isMobile: false },
  {
    name: 'desktop light',
    theme: 'light',
    viewport: { width: 1440, height: 900 },
    isMobile: false,
  },
  { name: 'mobile dark', theme: 'dark', viewport: { width: 390, height: 844 }, isMobile: true },
  { name: 'mobile light', theme: 'light', viewport: { width: 390, height: 844 }, isMobile: true },
]
