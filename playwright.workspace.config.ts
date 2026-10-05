import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/workspaces',
  outputDir: './workspace-test-results',
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  retries: 0,
  use: {
    ...devices['Desktop Chrome'],
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    launchOptions: {
      args: ['--host-resolver-rules=MAP *.workspace.test 127.0.0.1, MAP workspace.test 127.0.0.1'],
    },
  },
  webServer: {
    command: 'bun run vite dev --port 3001 --host 127.0.0.1',
    url: 'http://127.0.0.1:3001',
    reuseExistingServer: false,
    env: { VITE_API_BASE_URL: 'http://127.0.0.1:8081', VITE_WORKSPACE_BASE_HOST: 'workspace.test' },
  },
})
