import { fileURLToPath, URL } from 'node:url'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { copyFile, mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import { extname, join, relative, resolve, sep } from 'node:path'
// `vitest/config` re-exports vite's defineConfig with the `test` field typed.
import { defineConfig, type Plugin } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

/**
 * **不进 git 的大资产**的发布链（DEC-98 / 原 P1-5；2026-10-14 扩到原理视频）。
 *
 * 为什么不用"拷进 `web/public/`"：那是 git 管的目录，而这些是**不进 git 的大资产**（DEC-57）——
 * 拷进去会被误提交，也会让 `git status` 常年显示一堆脏文件。
 * 所以每棵树分两条路，但**dev 与 build 给同一个 URL 前缀**：
 *   · dev  —— 中间件直接从 `content/assets/<树>` 读盘（不产生任何落盘副本）；
 *   · build —— 打包收尾把同一批文件拷进 `dist/assets/<树>/**`（`dist` 不进 git）。
 * 这样页面代码在 dev / smoke / build / 打包 里都只有一套 URL，不需要分支。
 *
 * 每棵树在 `_meta/` 下的东西分两种：
 *   · **流水线产出的表**（`meta`）：如三维资产的材质规格 / 贴图查找表 / 转换报告；
 *   · **目录清单**（`index`）：`_meta/index.json` = "这棵树里到底有哪些文件" —— 视频用这个，
 *     因为它没有别的表可依赖，而"产物里有没有这段视频"必须**有判据**（页面据此显示
 *     "未包含"而不是发一个必然 404 的请求；冒烟要求 console 零错误）。
 */
interface AssetTree {
  /** 日志里的名字 */
  label: string
  /** 产物 URL 前缀（dev / build 同一套） */
  prefix: string
  /** 源目录（相对本文件） */
  source: string
  /** 流水线产出的元数据表：`[产物里的名字, 仓库内相对路径]`（路径相对**仓库根**） */
  meta: readonly (readonly [string, string])[]
  /** 是否额外发布 `_meta/index.json`（**按目录实际内容现算**） */
  index: boolean
}

const ASSET_TREES: readonly AssetTree[] = [
  {
    label: '三维资产',
    prefix: '/assets/three/',
    source: '../content/assets/three',
    meta: [
      ['material-spec.json', 'content/asset-material-spec.json'],
      ['material-textures.json', 'content/asset-material-textures.json'],
      ['convert-report.json', 'content/asset-convert-report.json'],
    ],
    index: false,
  },
  {
    label: '原理视频',
    prefix: '/assets/video/',
    source: '../content/assets/video',
    meta: [],
    index: true,
  },
]

const ASSET_MIME: Readonly<Record<string, string>> = {
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.exr': 'application/octet-stream',
  '.json': 'application/json; charset=utf-8',
  '.hdr': 'application/octet-stream',
  // 原理视频（DEC-99）：mp4 必须给对 MIME，否则 <video> 直接拒播
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
}

/** 仓库根（`web/vite.config.ts` → 上一级是仓库根）。 */
const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))

const sourceRootOf = (tree: AssetTree): string => fileURLToPath(new URL(tree.source, import.meta.url))
const mimeOf = (file: string): string => ASSET_MIME[extname(file).toLowerCase()] ?? 'application/octet-stream'

/** 产物里的相对路径 → 真实文件路径；越界、表里没有、不存在一律 `null`。 */
function resolveTreeFile(tree: AssetTree, relative: string): string | null {
  const sourceRoot = sourceRootOf(tree)
  if (relative.startsWith('_meta/')) {
    const name = relative.slice('_meta/'.length)
    const found = tree.meta.find(([fileName]) => fileName === name)
    return found ? resolve(REPO_ROOT, found[1]) : null
  }
  const target = resolve(sourceRoot, '.' + sep + relative)
  if (target !== sourceRoot && !target.startsWith(sourceRoot + sep)) return null
  try {
    return statSync(target).isFile() ? target : null
  } catch {
    return null
  }
}

/** 目录清单（递归；路径用 `/`，按名字排序）—— `_meta/index.json` 的内容。 */
async function listTree(dir: string, base = dir): Promise<{ files: { name: string; bytes: number }[] }> {
  const files: { name: string; bytes: number }[] = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      const nested = await listTree(full, base)
      files.push(...nested.files)
    } else if (entry.isFile()) {
      files.push({ name: relative(base, full).split(sep).join('/'), bytes: (await stat(full)).size })
    }
  }
  files.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
  return { files }
}

/**
 * 按 `Range` 发文件（206）。
 *
 * 为什么非要有它：**视频要能拖进度条**。没有 `Accept-Ranges` / 206 时，
 * Safari 直接拖不动，Chrome 会退化成"每次 seek 整段重下"（30 MB 那一段尤其明显）。
 */
function sendAsset(
  request: { method?: string; headers: { range?: string | string[] } },
  response: import('node:http').ServerResponse,
  file: string,
): void {
  const size = statSync(file).size
  const headers: Record<string, string | number> = {
    'Content-Type': mimeOf(file),
    'Accept-Ranges': 'bytes',
    // 资产按文件名引用（不带指纹），改动要立刻生效：与发布清单一样走 no-cache
    'Cache-Control': 'no-cache',
  }
  const raw = Array.isArray(request.headers.range) ? request.headers.range[0] : request.headers.range
  const range = /^bytes=(\d*)-(\d*)$/.exec(raw ?? '')
  if (range && (range[1] !== '' || range[2] !== '')) {
    const start = range[1] === '' ? Math.max(0, size - Number(range[2])) : Number(range[1])
    const end = range[1] === '' || range[2] === '' ? size - 1 : Math.min(Number(range[2]), size - 1)
    if (start > end || start >= size) {
      response.writeHead(416, { 'Content-Range': `bytes */${size}` })
      response.end()
      return
    }
    response.writeHead(206, {
      ...headers,
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': end - start + 1,
    })
    if (request.method === 'HEAD') {
      response.end()
      return
    }
    createReadStream(file, { start, end }).pipe(response)
    return
  }
  response.writeHead(200, { ...headers, 'Content-Length': size })
  if (request.method === 'HEAD') {
    response.end()
    return
  }
  createReadStream(file).pipe(response)
}

/** dev：把每棵树的源目录挂到它的 URL 前缀下（不产生任何落盘副本）。 */
function assetsServe(): Plugin {
  return {
    name: 'wsu3-assets-serve',
    apply: 'serve',
    configureServer(server) {
      for (const tree of ASSET_TREES) {
        const sourceRoot = sourceRootOf(tree)
        // connect 会把挂载前缀剥掉，所以这里拿到的是 `/contactor/NewACContactor.glb`
        server.middlewares.use(tree.prefix, (request, response, next) => {
          let relativePath: string
          try {
            relativePath = decodeURIComponent((request.url ?? '/').split('?')[0] ?? '/').replace(/^\/+/, '')
          } catch {
            return next()
          }
          if (tree.index && relativePath === '_meta/index.json') {
            if (!existsSync(sourceRoot)) return next()
            void listTree(sourceRoot).then((listing) => {
              const body = Buffer.from(`${JSON.stringify(listing, null, 2)}\n`, 'utf8')
              response.writeHead(200, {
                'Content-Type': 'application/json; charset=utf-8',
                'Content-Length': body.length,
                'Cache-Control': 'no-cache',
              })
              response.end(body)
            })
            return
          }
          const file = relativePath === '' ? null : resolveTreeFile(tree, relativePath)
          if (!file) return next() // 资产缺席（大资产不进 git，DEC-57）：交给后面的处理器去 404
          sendAsset(request, response, file)
        })
      }
    },
  }
}

/** build：把每棵树的文件拷进 `dist/<前缀>/**`（`dist` 不进 git）。 */
function assetsBuild(): Plugin {
  return {
    name: 'wsu3-assets-build',
    apply: 'build',
    async closeBundle() {
      const copyTree = async (from: string, to: string): Promise<void> => {
        await mkdir(to, { recursive: true })
        for (const entry of await readdir(from, { withFileTypes: true })) {
          const source = join(from, entry.name)
          const target = join(to, entry.name)
          if (entry.isDirectory()) await copyTree(source, target)
          else await copyFile(source, target)
        }
      }
      for (const tree of ASSET_TREES) {
        const sourceRoot = sourceRootOf(tree)
        const outRoot = resolve(
          fileURLToPath(new URL('./dist', import.meta.url)),
          ...tree.prefix.split('/').filter(Boolean),
        )
        try {
          await stat(sourceRoot)
        } catch {
          // 大资产按 DEC-57 不进 git，新克隆的机器上就是没有 —— 明确说清，不静默出半个包
          console.warn(
            `[wsu3-assets] 找不到 ${sourceRoot}：本次产物里**没有${tree.label}**，` +
              '相关页面会显示"未包含在本次发布里"（接入方式见 README §4「大资产」）。',
          )
          continue
        }
        await copyTree(sourceRoot, outRoot)
        for (const [fileName, relative] of tree.meta) {
          try {
            await mkdir(join(outRoot, '_meta'), { recursive: true })
            await copyFile(resolve(REPO_ROOT, relative), join(outRoot, '_meta', fileName))
          } catch {
            console.warn(`[wsu3-assets] 元数据表缺失：${relative}`)
          }
        }
        if (tree.index) {
          // 清单按**源目录**现算（不是拷完之后再列目标目录，否则会把刚写进去的 index 自己算进来）
          const listing = await listTree(sourceRoot)
          await mkdir(join(outRoot, '_meta'), { recursive: true })
          await writeFile(
            join(outRoot, '_meta', 'index.json'),
            `${JSON.stringify(listing, null, 2)}\n`,
            'utf8',
          )
          // 不在这里打日志：真正的"这个包里有什么"由发布清单回答（tools/pipeline/pack.mjs 会统计）
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
  plugins: [vue(), assetsServe(), assetsBuild()],
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
