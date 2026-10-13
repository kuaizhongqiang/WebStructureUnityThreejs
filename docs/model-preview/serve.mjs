#!/usr/bin/env node
/**
 * 模型检视页的静态服务器（审核用，与 `docs/ui-mockups/` 同级）。
 *
 * 为什么需要它（而不是 `python -m http.server`）：
 *   1. **服务根必须是仓库根** —— 页面要同时取到三处：`docs/model-preview/`（自己）、
 *      `content/assets/three/**`（13 个 GLB，**不进 git** 所以不会出现在任何 `dist` 里）、
 *      `web/node_modules/three/**`（three 库，一份库两处用）；
 *   2. **MIME 必须对** —— ESM 的 `<script type="module">` 与 import map 对 `.mjs` 的
 *      MIME 是强校验的（`text/javascript`），python 的 http.server 在 Windows 上给不出
 *      稳定结果；`.glb` 给 `model/gltf-binary` 也让 `fetch`/`HEAD` 校验更可读。
 *
 * 用法（在仓库根或任意目录都能跑）：
 *     node docs/model-preview/serve.mjs
 *     PORT=5300 node docs/model-preview/serve.mjs
 *
 * 安全边界：只读、只绑 127.0.0.1、禁止路径穿越（目标必须落在仓库根内）。
 */

import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..', '..') // 仓库根
const HOST = '127.0.0.1'
const BASE_PORT = Number(process.env.PORT ?? 5281)
const PAGE = '/docs/model-preview/index.html'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.bin': 'application/octet-stream',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.exr': 'image/x-exr',
  '.hdr': 'image/vnd.radiance',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
}

function send(response, status, headers, body) {
  response.writeHead(status, headers)
  if (body === undefined) response.end()
  else response.end(body)
}

/** 把请求路径解析成仓库内的绝对路径；越界返回 null。 */
function resolveTarget(pathname) {
  let clean = decodeURIComponent(pathname)
  if (clean.endsWith('/')) clean += 'index.html'
  const target = join(ROOT, clean)
  const normalizedRoot = ROOT.endsWith(sep) ? ROOT : ROOT + sep
  if (target !== ROOT && !target.startsWith(normalizedRoot)) return null
  return target
}

const server = createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    send(response, 405, { 'content-type': 'text/plain; charset=utf-8' }, '只支持 GET / HEAD')
    return
  }

  let pathname = '/'
  try {
    pathname = new URL(request.url, `http://${HOST}`).pathname
  } catch {
    send(response, 400, { 'content-type': 'text/plain; charset=utf-8' }, '坏请求')
    return
  }

  const target = resolveTarget(pathname)
  if (!target) {
    send(response, 403, { 'content-type': 'text/plain; charset=utf-8' }, '越界')
    return
  }

  let stats = null
  try {
    stats = statSync(target)
  } catch {
    send(response, 404, { 'content-type': 'text/plain; charset=utf-8' }, `找不到：${pathname}`)
    return
  }

  if (stats.isDirectory()) {
    // 目录一律带斜杠跳一次，避免相对路径解析歧义（import map 全靠相对路径）
    send(response, 301, { location: `${pathname.replace(/\/?$/, '/')}` })
    return
  }

  const headers = {
    'content-type': MIME[extname(target).toLowerCase()] ?? 'application/octet-stream',
    'content-length': String(stats.size),
    // 审核页要"改完刷新就见效"，所以不缓存；GLB 很大但本机读盘够快
    'cache-control': 'no-store',
  }
  // 注意：**不能**先 send()（那会 response.end()），否则 pipe 写进已结束的响应，
  // 响应头写着 content-length 而正文一个字节都没有 —— 浏览器会一直等，页面永远不 load。
  response.writeHead(200, headers)
  if (request.method === 'HEAD') {
    response.end()
    return
  }
  const stream = createReadStream(target)
  stream.on('error', () => response.destroy())
  stream.pipe(response)
})

let port = BASE_PORT
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE' && port < BASE_PORT + 10) {
    port += 1
    server.listen(port, HOST)
    return
  }
  console.error(`模型检视页服务启动失败：${error.message}`)
  process.exit(1)
})

server.listen(port, HOST, () => {
  console.log('模型检视页（审核用）已启动：')
  console.log(`  http://${HOST}:${port}${PAGE}`)
  console.log('')
  console.log(`服务根 = 仓库根：${ROOT}`)
  console.log('  · 13 个 GLB ← content/assets/three/**（不进 git，只在本机磁盘上）')
  console.log('  · three 库 ← web/node_modules/three/**')
  console.log('停止：Ctrl+C')
})
