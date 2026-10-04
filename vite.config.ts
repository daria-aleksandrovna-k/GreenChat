/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { pruneRadixCssPlugin } from './build/prune-radix-css'

export default defineConfig({
  // On GitHub Pages the site lives under /<repo>/; the workflow passes the path
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), pruneRadixCssPlugin()],
  build: {
    // A single CSS file referenced only from index.html, as pruneRadixCssPlugin requires
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        // The React core goes to its own chunk: every page needs it and it rarely changes,
        // so it stays in the browser cache when the app code is updated
        manualChunks: (id) =>
          /node_modules\/(react|react-dom|scheduler|react-router|react-router-dom)\//.test(id)
            ? 'react'
            : undefined,
      },
    },
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
