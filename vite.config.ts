import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

import { createClientEnvironment } from './src/config/env-schema.ts'

const config = defineConfig(({ command, mode }) => {
  if (command === 'build') {
    createClientEnvironment(loadEnv(mode, process.cwd(), ''))
  }

  return {
    resolve: { tsconfigPaths: true },
    plugins: [
      devtools(),
      cloudflare({ viteEnvironment: { name: 'ssr' } }),
      tailwindcss(),
      tanstackStart(),
      viteReact(),
    ],
  }
})

export default config
