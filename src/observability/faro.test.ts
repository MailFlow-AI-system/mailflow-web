import { describe, expect, it, vi } from 'vitest'

import { initializeBrowserObservability } from './faro'

describe('initializeBrowserObservability', () => {
  it('is a no-op during SSR', async () => {
    vi.stubGlobal('window', undefined)

    await expect(
      initializeBrowserObservability(
        { subscribe: vi.fn() },
        {
          VITE_FARO_COLLECTOR_URL: 'https://faro.example.test/collect',
          VITE_FARO_APP_NAME: 'mailflow-web',
          VITE_FARO_APP_ENVIRONMENT: 'test',
          VITE_FARO_APP_VERSION: '0.1.0',
        },
      ),
    ).resolves.toBeUndefined()
  })
})
