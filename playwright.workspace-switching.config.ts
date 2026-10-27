import { defineConfig, devices } from '@playwright/test'

const coreDirectory = process.env.MAILFLOW_CORE_WORKTREE
if (!coreDirectory || !process.env.MAILFLOW_WORKSPACE_TEST_DATABASE_URL)
  throw new Error(
    'Workspace switching requires MAILFLOW_CORE_WORKTREE and the dedicated test database; it cannot be skipped',
  )
export default defineConfig({
  testDir: './e2e/workspace-switching',
  outputDir: './workspace-switching-test-results',
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // First visits include the localhost binding handshake and SSR hydration.
  expect: { timeout: 15000 },
  use: {
    ...devices['Desktop Chrome'],
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'bun run test:workspace-switching:server',
      cwd: coreDirectory,
      url: 'http://127.0.0.1:8083/__fixture',
      reuseExistingServer: false,
      env: { MAILFLOW_WORKSPACE_TEST_BASE_HOST: 'localhost' },
      timeout: 30000,
    },
    {
      command: 'bun run vite dev --port 3003 --host 127.0.0.1',
      url: 'http://127.0.0.1:3003',
      reuseExistingServer: false,
      env: {
        MAILFLOW_VITE_CACHE_DIR: 'node_modules/.vite-workspace-tests',
        VITE_API_BASE_URL: 'http://127.0.0.1:8083',
        VITE_WORKSPACE_BASE_HOST: 'localhost',
        VITE_WORKSPACE_LOCAL_SWITCHING_ENABLED: 'true',
      },
    },
  ],
})
