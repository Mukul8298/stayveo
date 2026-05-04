import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'unrippling-crista-wearisomely.ngrok-free.dev' // your current ngrok domain
    ]
  }
})
