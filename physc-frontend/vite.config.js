import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Prevent Vite from scanning the emsdk folder
    exclude: ['emsdk'],
    // Don't auto-discover deps in emsdk
    entries: ['src/**/*.{js,jsx,ts,tsx}'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
    watch: {
      ignored: ['**/emsdk/**', '**/build/**']
    }
  }
})
