import type { Page } from '@playwright/test'
import type { PausedWorkspaceResponse } from './types'

export async function pauseWorkspaceResponse(page: Page) {
  const session = await page.context().newCDPSession(page)
  const paused = new Promise<PausedWorkspaceResponse>((resolve) => {
    session.on('Fetch.requestPaused', (event: PausedWorkspaceResponse) => {
      if (new URL(event.request.url).pathname === '/api/workspace-context') resolve(event)
    })
  })
  await session.send('Fetch.enable', {
    patterns: [
      { urlPattern: '*/api/workspace-context', requestStage: 'Response' },
      { urlPattern: '*/api/v1/workspaces*', requestStage: 'Response' },
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
