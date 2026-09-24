import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { cloudflare } from '@cloudflare/vite-plugin'
import { fileURLToPath } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(
    mode,
    fileURLToPath(new URL('.', import.meta.url)),
    ''
  )

  const backendTarget =
    env.BACKEND_PROXY_URL ||
    `http://localhost:${env.BACKEND_PORT || '3000'}`

  const configuredHosts = (env.VITE_ALLOWED_HOSTS || '')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean)

  return {
    plugins: [
      react(),
      // cloudflare(),
    ],

    server: {
      host: '0.0.0.0',

      allowedHosts: configuredHosts.length
        ? configuredHosts
        : [
          '.trycloudflare.com',
          '.devtunnels.ms',
          '.ngrok-free.dev',
          '.ngrok.io',
        ],

      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})