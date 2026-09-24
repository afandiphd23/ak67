import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the built app works at a domain root OR any subfolder
// (e.g. public_html/ or public_html/free-zones-reg-app/) without rebuilding.
// Dev port 5177: landing 5173, act 5174, reg 5175, fz 5176, fz-reg 5177.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5177,
    strictPort: true,
  },
})
