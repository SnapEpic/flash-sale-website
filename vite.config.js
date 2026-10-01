import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In development the browser talks to Vite (5173) and Vite forwards /api to the Express server,
// so the login cookie is same-origin and no CORS setup is needed.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': { target: process.env.VITE_PROXY_TARGET || 'http://localhost:5000', changeOrigin: true } },
  },
})
