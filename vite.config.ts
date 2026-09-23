import { defineConfig } from 'vite'

// Dev server for the landing page only (the readers run their own dev
// servers on 5174 / 5175 from their folders). The landing rewrites its
// card links to those dev URLs only when served on this port.
export default defineConfig({
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  },
})
