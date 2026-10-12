import { fileURLToPath, URL } from 'node:url'
// `vitest/config` re-exports vite's defineConfig with the `test` field typed.
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// base: './' keeps the build usable from any sub-path. If the target server
// fixes a deployment prefix, set VITE_BASE (e.g. VITE_BASE=/sim/) instead.
// See docs/research/02-web-threejs-line.md section 6 and DEC-22.
const base = process.env.VITE_BASE ?? './'

export default defineConfig({
  base,
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5273,
    open: false,
    // Unity WebGL threads would need COOP/COEP; keep it off until measured (DEC-13).
    headers: {},
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 4096,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
})
