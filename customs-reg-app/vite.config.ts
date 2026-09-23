import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the built app works at a domain root OR any subfolder
// (e.g. public_html/ or public_html/customs-reg/) without rebuilding.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      output: {
        // Split the ~450 kB gazette JSON into its own cacheable chunk so the
        // app chunk stays under the 500 kB warning limit.
        manualChunks: {
          'customs-reg-data': ['./src/data/customs-reg.json'],
        },
      },
    },
  },
  server: {
    port: 5175,
    strictPort: true,
  },
})
