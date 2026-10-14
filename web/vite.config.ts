import { fileURLToPath, URL } from 'node:url'
import { createReadStream, statSync } from 'node:fs'
import { copyFile, mkdir, readdir, stat } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'
// `vitest/config` re-exports vite's defineConfig with the `test` field typed.
import { defineConfig, type Plugin } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

/**
 * `content/assets/three/**` 的发布链（DEC-98 / 原 P1-5）。
 *
 * 为什么不用"拷进 `web/public/`"：那是 git 管的目录，而这些是**不进 git 的大资产**（DEC-57）——
 * 拷进去会被误提交，也会让 `git status` 常年显示一堆脏文件。
 * 所以分两条路，但**给同一个 URL 前缀 `/assets/three/`**：
 *   · dev  —— 中间件直接从 `content/assets/three` 读盘（不产生任何落盘副本）；
 *   · build —— 打包收尾把同一批文件拷进 `dist/assets/three/**`（`dist` 不进 git）。
 * 这样页面代码在 dev / smoke / build / 打包 里都只有一套 URL，不需要分支。
 *
 * 三张元数据表（材质规格 / 贴图查找表 / 转换报告）发到 `/assets/three/_meta/`：
 *   产品只认产物里的这张表，不硬编材质名与文件路径。
 */
const ASSET_PREFIX = '/assets/three/'

/** 元数据表：`[产物里的名字, 仓库内相对路径]`（路径相对**仓库根**）。 */
const META_FILES = [
  ['material-spec.json', 'content/asset-material-spec.json'],
  ['material-textures.json', 'content/asset-material-textures.json'],
  ['convert-report.json', 'content/asset-convert-report.json'],
] as const

const ASSET_MIME: Readonly<Record<string, string>> = {
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.exr': 'application/octet-stream',
  '.json': 'application/json; charset=utf-8',
  '.hdr': 'application/octet-stream',
}

/** 仓库根与 Three 侧资产根（`web/vite.config.ts` → 上一级是仓库根）。 */
const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))
const ASSET_SOURCE_ROOT = fileURLToPath(new URL('../content/assets/three', import.meta.url))

/** 产物里的相对路径 → 真实文件路径；越界、表里没有、不存在一律 `null`。 */
function resolveAssetFile(relative: string): string | null {
  if (relative.startsWith('_meta/')) {
    const name = relative.slice('_meta/'.length)
    const found = META_FILES.find(([fileName]) => fileName === name)
    return found ? resolve(REPO_ROOT, found[1]) : null
  }
  const target = resolve(ASSET_SOURCE_ROOT, '.' + sep + relative)
  if (target !== ASSET_SOURCE_ROOT && !target.startsWith(ASSET_SOURCE_ROOT + sep)) return null
  try {
    return statSync(target).isFile() ? target : null
  } catch {
    return null
  }
}

/** dev：直接把 `content/assets/three/**` 挂到 `/assets/three/**`（不产生任何落盘副本）。 */
function threeAssetsServe(): Plugin {
  return {
    name: 'wsu3-three-assets-serve',
    apply: 'serve',
    configureServer(server) {
      // connect 会把挂载前缀剥掉，所以这里拿到的是 `/contactor/NewACContactor.glb`
      server.middlewares.use(ASSET_PREFIX, (request, response, next) => {
        let relative: string
        try {
          relative = decodeURIComponent((request.url ?? '/').split('?')[0] ?? '/').replace(/^\/+/, '')
        } catch {
          return next()
        }
        const file = relative === '' ? null : resolveAssetFile(relative)
        if (!file) return next() // 资产缺席（大资产不进 git，DEC-57）：交给后面的处理器去 404
        response.setHeader(
          'Content-Type',
          ASSET_MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
        )
        response.setHeader('Content-Length', statSync(file).size)
        // 资产按文件名引用（不带指纹），改动要立刻生效：与发布清单一样走 no-cache
        response.setHeader('Cache-Control', 'no-cache')
        createReadStream(file).pipe(response)
      })
    },
  }
}

/** build：把同一批文件拷进 `dist/assets/three/**`（`dist` 不进 git）。 */
function threeAssetsBuild(): Plugin {
  return {
    name: 'wsu3-three-assets-build',
    apply: 'build',
    async closeBundle() {
      const outRoot = fileURLToPath(new URL('./dist/assets/three', import.meta.url))
      const copyTree = async (from: string, to: string): Promise<void> => {
        await mkdir(to, { recursive: true })
        for (const entry of await readdir(from, { withFileTypes: true })) {
          const source = join(from, entry.name)
          const target = join(to, entry.name)
          if (entry.isDirectory()) await copyTree(source, target)
          else await copyFile(source, target)
        }
      }
      try {
        await stat(ASSET_SOURCE_ROOT)
      } catch {
        // 大资产按 DEC-57 不进 git，新克隆的机器上就是没有 —— 明确说清，不静默出半个包
        console.warn(
          `[wsu3-three-assets] 找不到 ${ASSET_SOURCE_ROOT}：本次产物里**没有三维资产**，` +
            '相关页面会显示"资产未包含在本次发布里"（接入方式见 README §4「三维资产」）。',
        )
        return
      }
      await copyTree(ASSET_SOURCE_ROOT, outRoot)
      for (const [fileName, relative] of META_FILES) {
        try {
          await mkdir(join(outRoot, '_meta'), { recursive: true })
          await copyFile(resolve(REPO_ROOT, relative), join(outRoot, '_meta', fileName))
        } catch {
          console.warn(`[wsu3-three-assets] 元数据表缺失：${relative}`)
        }
      }
    },
  }
}

// base: './' keeps the build usable from any sub-path. If the target server
// fixes a deployment prefix, set VITE_BASE (e.g. VITE_BASE=/sim/) instead.
// See docs/research/02-web-threejs-line.md section 6 and DEC-22.
const base = process.env.VITE_BASE ?? './'

export default defineConfig({
  base,
  plugins: [vue(), threeAssetsServe(), threeAssetsBuild()],
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
