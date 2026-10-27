import { describe, expect, it } from 'vitest'
import { localDevelopmentEnvironment } from './localDevelopment'

describe('local development environment', () => {
  const env = {
    VITE_API_BASE_URL: 'http://localhost:8080',
    VITE_WORKSPACE_BASE_HOST: 'app-dev.mailflow-ai.online',
  }
  it('uses localhost only for a real local dev server, overriding injected published hosts', () => {
    expect(localDevelopmentEnvironment(env, { command: 'serve', isPreview: false })).toMatchObject({
      VITE_WORKSPACE_BASE_HOST: 'localhost',
      VITE_WORKSPACE_LOCAL_SWITCHING_ENABLED: 'true',
      VITE_WORKSPACE_SWITCHING_ENABLED: 'false',
      VITE_API_BASE_URL: env.VITE_API_BASE_URL,
    })
  })
  it.each([
    { command: 'build', isPreview: false },
    { command: 'serve', isPreview: true },
  ])('preserves build and preview configuration', (context) => {
    expect(localDevelopmentEnvironment(env, context)).toEqual(env)
  })
  it('preserves explicit test zones and disabled local profiles', () => {
    expect(
      localDevelopmentEnvironment(
        { ...env, VITE_WORKSPACE_BASE_HOST: 'workspace.test' },
        { command: 'serve', isPreview: false },
      ).VITE_WORKSPACE_BASE_HOST,
    ).toBe('workspace.test')
    expect(
      localDevelopmentEnvironment(
        { ...env, MAILFLOW_LOCAL_PROFILE: 'false' },
        { command: 'serve', isPreview: false },
      ).VITE_WORKSPACE_BASE_HOST,
    ).toBe(env.VITE_WORKSPACE_BASE_HOST)
  })
  it('does not turn Cloudflare or CI execution into localhost', () => {
    for (const marker of ['CI', 'CLOUDFLARE_ENV', 'RAILWAY_ENVIRONMENT_ID'])
      expect(
        localDevelopmentEnvironment(
          { ...env, [marker]: 'development' },
          { command: 'serve', isPreview: false },
        ),
      ).toMatchObject(env)
  })
  it('replaces injected published API origins only in the automatic local profile', () => {
    expect(
      localDevelopmentEnvironment(
        { ...env, VITE_API_BASE_URL: 'https://api-dev.mailflow-ai.online' },
        { command: 'serve', isPreview: false },
      ),
    ).toMatchObject({ VITE_API_BASE_URL: 'http://localhost:8080' })
    expect(
      localDevelopmentEnvironment(
        { ...env, VITE_API_BASE_URL: 'http://127.0.0.1:8083' },
        { command: 'serve', isPreview: false },
      ),
    ).toMatchObject({ VITE_API_BASE_URL: 'http://127.0.0.1:8083' })
  })
})
