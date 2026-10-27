import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { createClientEnvironment } from './src/config/env-schema.ts'
import { localDevelopmentEnvironment } from './src/config/localDevelopment.ts'
import { localSessionPlugin } from './src/config/localSessionPlugin.ts'

const config = defineConfig(({ command, isPreview }) => {
  const environment = localDevelopmentEnvironment(process.env, {
    command,
    isPreview: Boolean(isPreview),
  })
  for (const name of [
    'VITE_API_BASE_URL',
    'VITE_WORKSPACE_BASE_HOST',
    'VITE_WORKSPACE_LOCAL_SWITCHING_ENABLED',
    'VITE_WORKSPACE_SWITCHING_ENABLED',
  ]) {
    if (environment[name] !== undefined) process.env[name] = String(environment[name])
  }
  if (command === 'build') {
    const environment = createClientEnvironment(process.env)
    if (environment.VITE_WORKSPACE_BASE_HOST === 'localhost')
      throw new Error('Localhost workspaces cannot be built or deployed')
  }

  return {
    cacheDir: process.env.MAILFLOW_VITE_CACHE_DIR,
    server: {
      port: 3000,
      strictPort: true,
      allowedHosts: process.env.VITE_WORKSPACE_BASE_HOST
        ? [`.${process.env.VITE_WORKSPACE_BASE_HOST}`]
        : [],
    },
    envDir: false,
    resolve: { tsconfigPaths: true },
    ssr: { noExternal: ['@mailflow/ui'] },
    plugins: [
      ...(command === 'serve' && !isPreview && environment.VITE_WORKSPACE_BASE_HOST === 'localhost'
        ? [localSessionPlugin()]
        : []),
      devtools(),
      cloudflare({ viteEnvironment: { name: 'ssr' } }),
      tailwindcss(),
      tanstackStart(),
      viteReact(),
    ],
  }
})

export default config
