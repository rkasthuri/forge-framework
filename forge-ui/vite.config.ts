import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import * as path from 'path'

// FORGE Platform UI — Vite dev server + build.
// Dev server proxies /api to the Express control-plane (forge ui starts both).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
  },
})
