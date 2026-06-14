import { defineConfig } from 'vite'

export default defineConfig({
  // Simple config for the harness viewer
  server: {
    port: 5173,
    open: true
  },
  build: {
    // Do not empty dist on Windows — prevents EPERM when previous large harness-*.exe files are locked by the OS/Defender
    emptyOutDir: false
  }
})