import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': 'http://localhost:8000',
      '/crowd': 'http://localhost:8002',
      '/static': 'http://localhost:8000',
      '/crowd/ws': {
        target: 'ws://localhost:8002',
        ws: true
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true
      }
    }
  }
})
