import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'bun run vite dev --port 3000 --host localhost',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_API_BASE_URL: 'http://localhost:8080',
      VITE_FARO_COLLECTOR_URL: 'http://127.0.0.1:4318/collect',
      VITE_FARO_APP_NAME: 'mailflow-web',
      VITE_FARO_APP_ENVIRONMENT: 'test',
      VITE_FARO_APP_VERSION: 'e2e',
    },
  },
})
