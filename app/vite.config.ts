import { defineConfig } from 'vite'

export default defineConfig({
  // Simple config for the harness viewer
  server: {
    port: 5173,
    open: true
  }
})