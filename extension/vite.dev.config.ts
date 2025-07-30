import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dev-dist',
    rollupOptions: {
      input: {
        dev: './dev.html'
      }
    }
  },
  server: {
    port: 3000,
    open: '/dev.html'
  },
  define: {
    global: 'globalThis',
  }
}) 