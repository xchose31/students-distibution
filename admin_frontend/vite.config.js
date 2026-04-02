import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: [
    'lis.1502.moscow'
    ],
    proxy: {
      '/api': {
        target: 'http://lis.1502.moscow:5000',
        changeOrigin: true
      }
    }
  }
})