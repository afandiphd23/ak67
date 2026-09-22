import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the built app works at a domain root OR any subfolder
// (e.g. public_html/ or public_html/customs-act/) without rebuilding.
export default defineConfig({
  plugins: [react()],
  base: './',
})
