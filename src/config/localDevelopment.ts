import type { RuntimeEnvironment } from './types.ts'

export function localDevelopmentEnvironment(
  environment: RuntimeEnvironment,
  context: { command: string; isPreview: boolean },
): RuntimeEnvironment {
  if (
    context.command !== 'serve' ||
    context.isPreview ||
    environment.CI ||
    environment.CLOUDFLARE_ENV ||
    environment.RAILWAY_ENVIRONMENT_ID ||
    environment.MAILFLOW_LOCAL_PROFILE === 'false' ||
    environment.VITE_WORKSPACE_BASE_HOST === 'workspace.test'
  )
    return environment
  const api = new URL(String(environment.VITE_API_BASE_URL))
  const localApi =
    api.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(api.hostname)
  return {
    ...environment,
    VITE_API_BASE_URL: localApi ? environment.VITE_API_BASE_URL : 'http://localhost:8080',
    VITE_WORKSPACE_BASE_HOST: 'localhost',
    VITE_WORKSPACE_LOCAL_SWITCHING_ENABLED: 'true',
    VITE_WORKSPACE_SWITCHING_ENABLED: 'false',
  }
}
