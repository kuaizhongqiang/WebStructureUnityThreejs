'use strict'
/**
 * 壳内置的本机静态服务器。
 *
 * 为什么壳不直接 `loadFile('web/dist/index.html')`（file://）：
 *   ① **Unity WebGL 将来要加载 `.wasm` / `.data`** —— file:// 下 MIME 全错，
 *      `WebAssembly.instantiateStreaming` 会直接失败；Unity 的 loader 也依赖正确的 Content-Type。
 *   ② 将来若需要 `SharedArrayBuffer`（多线程 / 部分 Unity 版本），file:// 下拿不到 COOP/COEP 头。
 *   ③ DEC-22/DEC-55 要求"先本地静态服务器验证" —— 本机服务器与目标部署形态**一致**，
 *      在壳里验过的行为，部署到静态站点上不会变（file:// 会让你验了个假的东西）。
 *
 * 所以：壳起一个只绑 127.0.0.1 的静态服务器，窗口 `loadURL(http://127.0.0.1:<随机端口>/)`。
 */
const http = require('node:http')
const { createReadStream, existsSync, statSync } = require('node:fs')
const { extname, join, resolve, sep } = require('node:path')

/** MIME 表：`.wasm` / `.data` / `.unityweb` 是为将来 Unity WebGL 预留的（不能漏，否则运行时才炸）。 */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  // Unity WebGL
  '.wasm': 'application/wasm',
  '.data': 'application/octet-stream',
  '.unityweb': 'application/octet-stream',
  '.mem': 'application/octet-stream',
}

const COMPRESSED = [
  ['.br', 'br'],
  ['.gz', 'gzip'],
]

/**
 * @param {{ root: string, port?: number, host?: string }} options
 * @returns {Promise<{ url: string, port: number, root: string, close: () => Promise<void> }>}
 */
async function startStaticServer({ root, port = 0, host = '127.0.0.1' }) {
  const webRoot = resolve(root)
  const entry = join(webRoot, 'index.html')
  if (!existsSync(entry)) {
    throw new Error(`Web 产物不存在：${entry}\n先在 web/ 执行 npm run build（或把 WSU3_WEB_ROOT 指向已构建的产物目录）`)
  }

  const server = http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' })
      return res.end()
    }

    let pathname
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname)
    } catch {
      res.writeHead(400)
      return res.end()
    }
    if (pathname.endsWith('/')) pathname += 'index.html'

    // 目录穿越防护：解析后必须仍在 webRoot 之内
    const target = resolve(webRoot, '.' + pathname)
    if (target !== webRoot && !target.startsWith(webRoot + sep)) {
      res.writeHead(403)
      return res.end()
    }

    let file = target
    if (!existsSync(file) || !statSync(file).isFile()) {
      // SPA 回退：只要请求的是页面（接受 html），就交给 index.html；静态资源则老实 404
      const wantsHtml = (req.headers.accept || '').includes('text/html')
      if (!wantsHtml) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
        return res.end('404 ' + pathname)
      }
      file = entry
    }

    // 预压缩产物直接命中（Unity WebGL 与 vite 的压缩产物都可能带 .br/.gz）
    const acceptEncoding = req.headers['accept-encoding'] || ''
    let encoding = null
    for (const [suffix, name] of COMPRESSED) {
      if (acceptEncoding.includes(name) && existsSync(file + suffix)) {
        file += suffix
        encoding = name
        break
      }
    }

    const ext = extname(file.replace(/\.(br|gz)$/, ''))
    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': statSync(file).size,
      // 指纹资源（vite 的 assets/）可长缓存；页面与其它一律不缓存，避免壳里看到旧版本
      'Cache-Control': file.includes(`${sep}assets${sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    }
    if (encoding) headers['Content-Encoding'] = encoding

    res.writeHead(200, headers)
    if (req.method === 'HEAD') return res.end()
    createReadStream(file).pipe(res)
  })

  await new Promise((ok, fail) => {
    server.once('error', fail)
    server.listen(port, host, ok)
  })

  const actualPort = server.address().port
  return {
    url: `http://${host}:${actualPort}/`,
    port: actualPort,
    root: webRoot,
    close: () => new Promise((done) => server.close(() => done())),
  }
}

module.exports = { startStaticServer, MIME }
