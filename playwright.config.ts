import { defineConfig, devices } from '@playwright/test'

const origin = `http://127.0.0.1:${process.env.E2E_PORT ?? '3000'}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: origin,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'bun e2e/auth-session-stub.mjs',
      url: 'http://127.0.0.1:8099/health',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `bun run vite dev --port ${process.env.E2E_PORT ?? '3000'} --host 127.0.0.1`,
      url: origin,
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_API_BASE_URL: 'http://127.0.0.1:8099',
        VITE_FARO_COLLECTOR_URL: 'http://127.0.0.1:4318/collect',
        VITE_FARO_APP_NAME: 'mailflow-web',
        VITE_FARO_APP_ENVIRONMENT: 'test',
        VITE_FARO_APP_VERSION: 'e2e',
      },
    },
  ],
})
