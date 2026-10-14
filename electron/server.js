'use strict'
/**
 * 壳内置的本机静态服务器。
 *
 * 为什么壳不直接 `loadFile('web/dist/index.html')`（file://）：
 *   ① **Unity WebGL 要加载 `.wasm` / `.data`** —— file:// 下 MIME 全错，
 *      `WebAssembly.instantiateStreaming` 会直接失败；Unity 的 loader 也依赖正确的 Content-Type。
 *   ② 多线程 Unity 需要 `SharedArrayBuffer`（COOP/COEP 头），file:// 下拿不到。
 *   ③ DEC-22/DEC-55 要求"先本地静态服务器验证（含 MIME/压缩/缓存清单）" ——
 *      本机服务器与目标部署形态**一致**，在壳里验过的行为，部署到静态站点上不会变。
 *
 * 两个根目录（DEC-23：内容/资源与代码物理分开）：
 *   · `root`      —— Web 产物（`web/dist`，打包后在 `resources/web`）：应用本体 + 内容 JSON + 发布清单；
 *   · `unityRoot` —— Unity 产物（`unity/builds`，打包后在 `resources/unity`）：挂在 `/unity/` 前缀下。
 *   分开的好处：将来 Unity 改成按需下载或换 CDN，**只换这一个根目录**，其余不动。
 */
const http = require('node:http')
const { createReadStream, existsSync, statSync } = require('node:fs')
const { extname, join, resolve, sep } = require('node:path')

/** MIME 表：`.wasm` / `.data` / `.unityweb` 是 Unity WebGL 必需的（错一个就在运行时才炸）。 */
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
  // Three 侧资产（DEC-98）：GLB 与影棚 HDRI。这两类都是按 arrayBuffer 读的，
  // 但清单里必须写对 —— 部署方照抄 `release-manifest.json` 的 serving.mime，写错只会在运行时才炸。
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.exr': 'image/x-exr',
  // 原理视频（DEC-99）：MIME 写错 <video> 直接拒播；`.mp4` 还必须能发 Range（见 sendFile）
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  // Unity WebGL
  '.wasm': 'application/wasm',
  '.data': 'application/octet-stream',
  '.unityweb': 'application/octet-stream',
  '.mem': 'application/octet-stream',
  '.symbols': 'application/octet-stream',
}

const COMPRESSED = [
  ['.br', 'br'],
  ['.gz', 'gzip'],
]

/** Unity 目录的 URL 前缀；与 web 侧加载器、发布清单保持一致。 */
const UNITY_PREFIX = '/unity/'

/**
 * @param {{
 *   root: string,
 *   unityRoot?: string | null,
 *   port?: number,
 *   host?: string,
 *   coopCoep?: boolean,
 * }} options
 */
async function startStaticServer({ root, unityRoot = null, port = 0, host = '127.0.0.1', coopCoep = false }) {
  const webRoot = resolve(root)
  const entry = join(webRoot, 'index.html')
  if (!existsSync(entry)) {
    throw new Error(
      `Web 产物不存在：${entry}\n先在 web/ 执行 npm run build（或把 WSU3_WEB_ROOT 指向已构建的产物目录）`,
    )
  }
  const unityBase = unityRoot ? resolve(unityRoot) : null

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

    // —— 路由：/unity/** 走 Unity 根目录，其余走 Web 根目录
    const isUnity = pathname === '/unity' || pathname.startsWith(UNITY_PREFIX)
    if (isUnity) {
      if (!unityBase) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
        return res.end('未配置 Unity 目录（本机 unity/builds 为空）')
      }
      pathname = pathname.slice('/unity'.length) || '/'
    } else {
      // 只有 Web 根目录做 SPA 回退
    }
    if (pathname.endsWith('/')) pathname += 'index.html'

    const base = isUnity ? unityBase : webRoot
    const target = resolve(base, '.' + pathname)
    // 目录穿越防护：解析后必须仍在对应根目录之内
    if (target !== base && !target.startsWith(base + sep)) {
      res.writeHead(403)
      return res.end()
    }

    let file = target
    if (!existsSync(file) || !statSync(file).isFile()) {
      // SPA 回退：**只**对 Web 根的页面请求生效。
      // Unity 目录下缺文件必须老实 404 —— 若回退成 index.html，
      // Unity 的 loader 会把一段 HTML 当成 wasm 去实例化，报出来的错完全看不出根因。
      const wantsHtml = (req.headers.accept || '').includes('text/html')
      if (isUnity || !wantsHtml) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
        return res.end('404 ' + (isUnity ? '/unity' : '') + pathname)
      }
      file = entry
    }

    // 预压缩产物直接命中（Unity WebGL 构建默认就带 .br；vite 产物也可能带 .gz）
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
    const stats = statSync(file)
    // 缓存口径（按 **URL** 判，别看文件系统的分隔符）：
    //   · 指纹资源（vite 的 /assets/<name>-<hash>.js、Unity 的 /Build/**）—— 名字里带哈希，可长缓存；
    //   · **不带指纹的资产树**（/assets/three/**、/assets/video/**）—— 名字固定（`NewACContactor.glb`、
    //     `01jcq_yl.mp4`），标 immutable 会让"换了资产但包更新了"的机器一直吃旧文件；
    //     改成 no-cache + ETag/Last-Modified：**每次请求都会来问一句，答案没变就回 304**，
    //     既不会读到旧文件，也不会把 30 MB 的视频每次重下一遍。
    const isTreeAsset = pathname.startsWith('/assets/three/') || pathname.startsWith('/assets/video/')
    const isFingerprinted = (isUnity && pathname.startsWith('/Build/')) ||
      (!isUnity && pathname.startsWith('/assets/') && !isTreeAsset)
    const etag = `"${stats.size.toString(16)}-${Math.floor(stats.mtimeMs).toString(16)}"`
    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': isFingerprinted ? 'public, max-age=31536000, immutable' : 'no-cache',
      'Accept-Ranges': 'bytes',
      ETag: etag,
      'Last-Modified': stats.mtime.toUTCString(),
      'X-Content-Type-Options': 'nosniff',
    }
    if (encoding) headers['Content-Encoding'] = encoding
    if (coopCoep) {
      headers['Cross-Origin-Opener-Policy'] = 'same-origin'
      // 视频跨源不可用时也不该被 COEP 拦下（本地同源，这里只是把口径写清）
      headers['Cross-Origin-Embedder-Policy'] = 'require-corp'
    }

    // 校验器命中：内容没变就只回一个 304，不带正文
    if (!encoding && req.headers['if-none-match'] === etag) {
      res.writeHead(304, headers)
      return res.end()
    }

    // Range：视频拖进度条靠它（Safari 缺了直接拖不动，Chrome 会退化成整段重下）。
    // 预压缩产物（.br/.gz）不做 Range —— 字节范围是相对**编码后**的实体算的，混在一起容易算错。
    const rawRange = req.headers.range
    const range = encoding ? null : /^bytes=(\d*)-(\d*)$/.exec(rawRange || '')
    if (range && (range[1] !== '' || range[2] !== '')) {
      const size = stats.size
      const start = range[1] === '' ? Math.max(0, size - Number(range[2])) : Number(range[1])
      const end = range[1] === '' || range[2] === '' ? size - 1 : Math.min(Number(range[2]), size - 1)
      if (start > end || start >= size) {
        res.writeHead(416, { 'Content-Range': `bytes */${size}` })
        return res.end()
      }
      res.writeHead(206, {
        ...headers,
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Content-Length': end - start + 1,
      })
      if (req.method === 'HEAD') return res.end()
      return createReadStream(file, { start, end }).pipe(res)
    }

    res.writeHead(200, { ...headers, 'Content-Length': stats.size })
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
    unityRoot: unityBase,
    coopCoep,
    close: () => new Promise((done) => server.close(() => done())),
  }
}

module.exports = { startStaticServer, MIME, UNITY_PREFIX }
