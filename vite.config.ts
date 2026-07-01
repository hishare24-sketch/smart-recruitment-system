import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

// https://vite.dev/config/
// Base path differs per deploy target:
//  - GitHub Pages project site serves under /smart-recruitment-system/
//  - Netlify / Vercel (and dev) serve from the root, so assets live at /
// Netlify sets NETLIFY=true and Vercel sets VERCEL=1 during their builds.
const isRootHost = !!process.env.NETLIFY || !!process.env.VERCEL
export default defineConfig(({ command }) => ({
  base: command === 'build' && !isRootHost ? '/smart-recruitment-system/' : '/',
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@styles': fileURLToPath(new URL('./src/styles', import.meta.url)),
      '@images': fileURLToPath(new URL('./src/assets/images', import.meta.url)),
    },
  },
  server: {
    port: Number(process.env.PORT) || 5173,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        // Split large vendors into their own chunks for better caching
        manualChunks: {
          vue: ['vue', 'vue-router', 'pinia', 'vue-i18n'],
          vuetify: ['vuetify'],
        },
      },
    },
  },
}))
