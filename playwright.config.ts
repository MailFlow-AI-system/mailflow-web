import switching from './playwright.workspace-switching.config'

const servers = switching.webServer
if (!Array.isArray(servers) || servers.length !== 2)
  throw new Error('Expected the Core and Web harness servers')

export default {
  ...switching,
  testDir: './e2e',
  testIgnore: ['**/workspaces/**', '**/workspace-telemetry/**'],
  outputDir: './test-results',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { ...switching.use, baseURL: 'http://workspace.test:3003' },
  webServer: [
    servers[0],
    {
      ...servers[1],
      env: {
        ...servers[1].env,
        VITE_FARO_COLLECTOR_URL: 'http://127.0.0.1:4318/collect',
        VITE_FARO_APP_NAME: 'mailflow-web',
        VITE_FARO_APP_ENVIRONMENT: 'test',
        VITE_FARO_APP_VERSION: 'e2e',
      },
    },
  ],
} satisfies import('@playwright/test').PlaywrightTestConfig
