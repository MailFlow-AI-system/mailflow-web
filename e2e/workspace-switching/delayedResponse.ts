import type { Page } from '@playwright/test'
import type { PausedWorkspacePath, PausedWorkspaceResponse } from './types'

export async function pauseWorkspaceResponse(
  page: Page,
  path: PausedWorkspacePath = '/api/workspace-context',
) {
  const session = await page.context().newCDPSession(page)
  const paused = new Promise<PausedWorkspaceResponse>((resolve) => {
    session.on('Fetch.requestPaused', (event: PausedWorkspaceResponse) => {
      if (new URL(event.request.url).pathname === path) resolve(event)
    })
  })
  await session.send('Fetch.enable', {
    patterns: [
      { urlPattern: `*${path}`, requestStage: 'Response' },
      ...(path === '/api/workspace-context'
        ? [{ urlPattern: '*/api/v1/workspaces*', requestStage: 'Response' as const }]
        : []),
    ],
  })
  return {
    paused,
    release: async () => {
      await session.send('Fetch.disable')
      await session.detach()
    },
  }
}
