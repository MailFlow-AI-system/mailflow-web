import { defineConfig, devices } from '@playwright/test'

const coreDirectory = process.env.MAILFLOW_CORE_WORKTREE
if (!coreDirectory || !process.env.MAILFLOW_WORKSPACE_TEST_DATABASE_URL)
  throw new Error(
    'Local telemetry requires Core, the isolated database and the local OTLP collector',
  )

export default defineConfig({
  testDir: './e2e/workspace-telemetry',
  outputDir: './workspace-switching-test-results/telemetry',
  timeout: 60000,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  use: {
    ...devices['Desktop Chrome'],
    trace: 'off',
    launchOptions: {
      args: ['--host-resolver-rules=MAP *.workspace.test 127.0.0.1, MAP workspace.test 127.0.0.1'],
    },
  },
  webServer: [
    {
      command: 'bun run test:workspace-switching:server',
      cwd: coreDirectory,
      url: 'http://127.0.0.1:8083/__fixture',
      env: { MAILFLOW_WORKSPACE_TELEMETRY_LOCAL: 'true' },
      reuseExistingServer: false,
    },
    {
      command: 'bun run e2e/workspace-telemetry/receiver.ts',
      url: 'http://127.0.0.1:14319/__snapshot',
      reuseExistingServer: false,
    },
    {
      command: 'bun run vite dev --port 3003 --host 127.0.0.1',
      url: 'http://127.0.0.1:3003',
      reuseExistingServer: false,
      env: {
        VITE_API_BASE_URL: 'http://127.0.0.1:8083',
        VITE_WORKSPACE_BASE_HOST: 'workspace.test',
        VITE_WORKSPACE_LOCAL_SWITCHING_ENABLED: 'true',
        VITE_FARO_COLLECTOR_URL: 'http://127.0.0.1:14319/collect',
        VITE_FARO_APP_NAME: 'mailflow-web',
        VITE_FARO_APP_ENVIRONMENT: 'workspace-local',
        VITE_FARO_APP_VERSION: 'workspace-browser-local',
      },
    },
  ],
})
