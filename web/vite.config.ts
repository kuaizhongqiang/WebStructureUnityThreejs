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
      // 设计系统**单一来源**（DEC-74）：产品直接引用排版稿目录下的 tokens/components，
      // 不做复制、不做第二份事实源。注意：**不许** import 同目录的 mockup-shell.css ——
      // 那是评审外壳（.board 缩放画布 / .spec-* 展示卡片），进产品会把演示样式带进产物。
      '@ds': fileURLToPath(new URL('../docs/ui-mockups', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5273,
    open: false,
    // Unity WebGL threads would need COOP/COEP; keep it off until measured (DEC-13).
    headers: {},
    // @ds 指向仓库内的排版稿目录，需要显式允许 dev server 读取 workspace 根
    fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] },
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
