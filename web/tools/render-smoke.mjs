/**
 * 三维渲染冒烟（依据 docs/DECISIONS.md DEC-27 第 3 条；方案见 Q-R2-D3）。
 *
 * 用真实浏览器（Playwright + Chromium）打开页面，断言：
 *   1) 画布存在且尺寸 > 0；
 *   2) WebGL 上下文可用（不是降级失败）；
 *   3) 渲染循环真的在跑（帧数递增、draw call > 0）—— 这是"不是白屏"的程序化证据；
 *   4) 页面无 JS 异常 / console.error；
 *   5) Unity 类 TaskType 显示占位提示（证明 DEC-06 的分流生效）。
 *
 * 产物：tools/smoke/artifacts/*.png（截图，供人工核对）。
 * 用法：npm run smoke
 */

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdir, writeFile } from 'node:fs/promises'
import { inflateSync } from 'node:zlib'
import { chromium } from 'playwright'
import { createServer } from 'vite'

/**
 * 解码 PNG 并统计色彩分布 —— 用来**确定性**地判断"画布不是纯色白屏"，
 * 而不是靠人眼看图（8bit / 非隔行 / RGB 或 RGBA，Playwright 截图即此格式）。
 */
function pngStats(buffer) {
  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  const idat = []
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    const data = buffer.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
    } else if (type === 'IDAT') {
      idat.push(data)
    } else if (type === 'IEND') {
      break
    }
    offset += 12 + length
  }
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0
  if (channels === 0 || bitDepth !== 8) {
    throw new Error(`不支持的 PNG 格式：colorType=${colorType} bitDepth=${bitDepth}`)
  }
  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const pixels = Buffer.alloc(height * stride)
  let pos = 0
  for (let y = 0; y < height; y += 1) {
    const filter = raw[pos]
    pos += 1
    const line = raw.subarray(pos, pos + stride)
    pos += stride
    const prev = y === 0 ? null : pixels.subarray((y - 1) * stride, y * stride)
    const cur = pixels.subarray(y * stride, (y + 1) * stride)
    for (let x = 0; x < stride; x += 1) {
      const a = x >= channels ? cur[x - channels] : 0
      const b = prev ? prev[x] : 0
      const c = prev && x >= channels ? prev[x - channels] : 0
      let v = line[x]
      if (filter === 1) v = (v + a) & 0xff
      else if (filter === 2) v = (v + b) & 0xff
      else if (filter === 3) v = (v + ((a + b) >> 1)) & 0xff
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff
      } else if (filter !== 0) {
        throw new Error(`未知 PNG 过滤器：${filter}`)
      }
      cur[x] = v
    }
  }

  const unique = new Set()
  let minLum = 255
  let maxLum = 0
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = y * stride + x * channels
      unique.add((pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2])
      const lum = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3
      if (lum < minLum) minLum = lum
      if (lum > maxLum) maxLum = lum
    }
  }
  return {
    width,
    height,
    uniqueColors: unique.size,
    minLum: Math.round(minLum),
    maxLum: Math.round(maxLum),
  }
}

const here = dirname(fileURLToPath(import.meta.url))
const webRoot = resolve(here, '..')
const artifactsDir = resolve(here, 'smoke', 'artifacts')

const failures = []

function check(ok, label, detail = '') {
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(label)
}

const server = await createServer({
  root: webRoot,
  logLevel: 'error',
  server: { host: '127.0.0.1', port: 0 },
})
await server.listen()
const port = server.httpServer.address().port
const base = `http://127.0.0.1:${port}`
console.log(`dev server: ${base}`)

await mkdir(artifactsDir, { recursive: true })

const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
})

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text())
  })

  // ---------- 1. Three.js 任务页（TaskType.Purpose = 1 → Three 栈）----------
  await page.goto(`${base}/#/task/1`, { waitUntil: 'load' })
  await page.waitForSelector('canvas', { timeout: 20000 })
  await page.waitForTimeout(1500) // 让渲染循环跑几帧

  const three = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    const viewer = window.__WSU3_VIEWER__
    const gl = canvas ? canvas.getContext('webgl2') || canvas.getContext('webgl') : null
    return {
      canvasWidth: canvas ? canvas.clientWidth : 0,
      canvasHeight: canvas ? canvas.clientHeight : 0,
      hasViewer: Boolean(viewer),
      frame: viewer && viewer.renderStats ? viewer.renderStats.frame : -1,
      calls: viewer && viewer.renderStats ? viewer.renderStats.calls : -1,
      glVersion: gl ? gl.getParameter(gl.VERSION) : null,
      glError: gl ? gl.getError() : -1,
      bodyText: document.body.innerText.slice(0, 300),
    }
  })

  check(three.canvasWidth > 0 && three.canvasHeight > 0, 'Three 页：画布尺寸 > 0', `${three.canvasWidth}x${three.canvasHeight}`)
  check(three.hasViewer, 'Three 页：Viewer 已挂载', three.hasViewer ? '' : 'window.__WSU3_VIEWER__ 不存在')
  check(three.frame > 3, 'Three 页：渲染循环在跑', `frame=${three.frame}`)
  check(three.calls > 0, 'Three 页：有 draw call', `calls=${three.calls}`)
  check(
    three.glVersion !== null && three.glError === 0,
    'Three 页：WebGL 上下文正常',
    `version=${three.glVersion} glError=${three.glError}`,
  )
  check(!three.bodyText.includes('渲染器初始化失败'), 'Three 页：无渲染器初始化失败提示')

  await page.screenshot({ path: resolve(artifactsDir, 'task-three.png'), fullPage: false })

  // 关键一条：把画布区域单独截下来解码像素，确认"真的画出了东西"而不是纯色。
  const canvasHandle = await page.$('canvas')
  const canvasBox = canvasHandle ? await canvasHandle.boundingBox() : null
  if (canvasBox) {
    const canvasShot = await page.screenshot({ clip: canvasBox })
    await writeFile(resolve(artifactsDir, 'task-three-canvas.png'), canvasShot)
    const stats = pngStats(canvasShot)
    check(
      stats.uniqueColors >= 5 && stats.maxLum - stats.minLum >= 10,
      'Three 页：画布像素非纯色（不是白屏）',
      JSON.stringify(stats),
    )
  } else {
    check(false, 'Three 页：画布像素非纯色（不是白屏）', '未取得 canvas 的 boundingBox')
  }

  // ---------- 2. Unity 类任务页（TaskType.Training = 5 → Unity 栈）----------
  await page.goto(`${base}/#/task/5`, { waitUntil: 'load' })
  await page.waitForTimeout(800)
  const unity = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    return { hasCanvas: Boolean(canvas), bodyText: document.body.innerText.slice(0, 400) }
  })

  check(!unity.hasCanvas, 'Unity 页：未创建 three 画布（不越权渲染）')
  check(unity.bodyText.includes('Unity WebGL'), 'Unity 页：显示 Unity 占位提示', unity.bodyText.replace(/\s+/g, ' ').slice(0, 80))
  await page.screenshot({ path: resolve(artifactsDir, 'task-unity-placeholder.png'), fullPage: false })

  // ---------- 3. 回到 Three 页（覆盖 Unity → Three 的重建路径）----------
  await page.goto(`${base}/#/task/1`, { waitUntil: 'load' })
  await page.waitForSelector('canvas', { timeout: 20000 })
  await page.waitForTimeout(1200)
  const back = await page.evaluate(() => {
    const viewer = window.__WSU3_VIEWER__
    return {
      hasViewer: Boolean(viewer),
      frame: viewer && viewer.renderStats ? viewer.renderStats.frame : -1,
      calls: viewer && viewer.renderStats ? viewer.renderStats.calls : -1,
    }
  })
  check(back.hasViewer && back.frame > 3 && back.calls > 0, 'Unity → Three 切回：画布重建且渲染恢复', `frame=${back.frame} calls=${back.calls}`)

  // ---------- 4. 首页 ----------
  await page.goto(`${base}/#/`, { waitUntil: 'load' })
  await page.waitForTimeout(400)
  const home = await page.evaluate(() => document.body.innerText)
  check(home.includes('电路连接') && home.includes('Three.js') && home.includes('Unity'), '首页：任务清单与技术栈标注齐全')
  await page.screenshot({ path: resolve(artifactsDir, 'home.png'), fullPage: false })

  check(pageErrors.length === 0, '全程无 JS 异常 / console.error', pageErrors.slice(0, 3).join(' | '))
} finally {
  await browser.close()
  await server.close()
}

console.log(`\n截图产物：${artifactsDir}`)
if (failures.length > 0) {
  console.error(`\n冒烟失败 ${failures.length} 项：\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
console.log('\n冒烟全部通过。')
