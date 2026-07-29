import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The site is served from https://quangshuynh.github.io/retrocam/, so built
// asset URLs need that prefix. Dev and preview are unaffected.
export default defineConfig({
  base: '/retrocam/',
  plugins: [react()],
})
