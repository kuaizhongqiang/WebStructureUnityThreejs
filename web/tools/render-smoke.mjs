/**
 * 三维渲染冒烟（依据 docs/DECISIONS.md DEC-27 第 3 条；方案见 Q-R2-D3）。
 *
 * 用真实浏览器（Playwright + Chromium）打开页面，断言：
 *   1) 画布存在且尺寸 > 0；
 *   2) WebGL 上下文可用（不是降级失败）；
 *   3) 渲染循环真的在跑（帧数递增、draw call > 0）—— 这是"不是白屏"的程序化证据；
 *   4) 页面无 JS 异常 / console.error；
 *   5) Unity 类 TaskType 显示 Unity 视口骨架（证明 DEC-06 的分流生效）；
 *   6) **内容层吃到真实数据**（第 7 节）：菜单出 9 个项目、进项目出真实正文、
 *      未启用的槽位显示"本项目未启用"而不是空白、小测验出题目。
 *
 * 说明：三维断言用 `#/task/8`（结构）而不是 `#/task/2`（实验仪器）—— 采纳数据里
 * 接触器启用了结构槽位，"实验仪器"的槽位是 `null`（会正确地显示"本项目未启用"）。
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

  // ---------- 1. Three.js 任务页（TaskType.Equipment = 2 → list 骨架 + Three 三维视口）----------
  // ⚠️ 用**兜底演示项目**：采纳数据里 8 个器件都没有填 `taskEquipmentData` 槽位
  //    （内容侧缺口，见第 7 节），所以今天只有兜底项目能走到这条 Three 路径。
  await page.goto(`${base}/#/task/2?project=demo-temperature`, { waitUntil: 'load' })
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

  check(
    three.canvasWidth > 0 && three.canvasHeight > 0,
    'Three 页：画布尺寸 > 0',
    `${three.canvasWidth}x${three.canvasHeight}`,
  )
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
  await page.goto(`${base}/#/task/5?project=clip_contactor`, { waitUntil: 'load' })
  await page.waitForTimeout(800)
  const unity = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    return { hasCanvas: Boolean(canvas), bodyText: document.body.innerText.slice(0, 600) }
  })

  check(!unity.hasCanvas, 'Unity 页：未创建 three 画布（不越权渲染）')
  check(
    unity.bodyText.includes('三维视口（Unity）'),
    'Unity 页：显示 Unity 视口骨架（DEC-06 分流生效）',
    unity.bodyText.replace(/\s+/g, ' ').slice(0, 80),
  )
  await page.screenshot({ path: resolve(artifactsDir, 'task-unity-placeholder.png'), fullPage: false })

  // ---------- 3. 回到 Three 页（覆盖 Unity → Three 的重建路径）----------
  await page.goto(`${base}/#/task/2?project=demo-temperature`, { waitUntil: 'load' })
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
  check(
    back.hasViewer && back.frame > 3 && back.calls > 0,
    'Unity → Three 切回：画布重建且渲染恢复',
    `frame=${back.frame} calls=${back.calls}`,
  )

  // ---------- 4. 欢迎页（A1）：主视觉 + 外壳浮卡 + 设计系统令牌真的加载了 ----------
  await page.goto(`${base}/#/start`, { waitUntil: 'load' })
  await page.waitForTimeout(400)
  const home = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement)
    return {
      text: document.body.innerText,
      radiusPanel: style.getPropertyValue('--radius-panel').trim(),
      border3: style.getPropertyValue('--border-3').trim(),
      caption: style.getPropertyValue('--shell-caption-h').trim(),
      theme: document.documentElement.getAttribute('data-theme') ?? '',
      hasCard: Boolean(document.querySelector('.ui-titlebar.ui-titlebar--float')),
    }
  })
  check(
    home.text.includes('虚拟仿真教学平台') && home.text.includes('开始实验'),
    '欢迎页：主视觉与主按钮存在',
  )
  check(home.hasCard, '外壳：浮卡（.ui-titlebar--float）已渲染')
  check(
    home.radiusPanel === '28px' && home.border3.length > 0,
    '设计系统已生效（@ds/tokens.css 已加载）',
    `radius-panel=${home.radiusPanel} border-3=${home.border3}`,
  )
  check(
    home.caption === '0px',
    '浏览器下桌面壳标题栏高度为 0（不影响布局）',
    `--shell-caption-h=${home.caption}`,
  )
  check(home.theme === 'dark' || home.theme === 'light', '主题属性已设置', home.theme)
  await page.screenshot({ path: resolve(artifactsDir, 'start.png'), fullPage: false })

  // ---------- 5. 站点线：11 站、契约标签、技术栈标注 ----------
  await page.goto(`${base}/#/task/8?project=clip_contactor`, { waitUntil: 'load' })
  await page.waitForTimeout(600)
  const route = await page.evaluate(() => {
    const stops = [...document.querySelectorAll('.ui-route__stop')]
    return {
      count: stops.length,
      labels: stops.map((el) => el.querySelector('.ui-route__label')?.textContent?.trim() ?? ''),
      stacks: [...document.querySelectorAll('.ui-route__stack')].map((el) => el.textContent?.trim() ?? ''),
    }
  })
  check(route.count === 11, '站点线：11 站（由契约 TASK_TYPES 驱动）', `count=${route.count}`)
  check(
    route.labels.includes('电路连接') && route.labels.includes('考核'),
    '站点线：标签逐字来自契约',
    route.labels.join('/'),
  )
  check(route.stacks.includes('Unity') && route.stacks.includes('Three'), '站点线：技术栈标注齐全（DEC-06）')

  // ---------- 6. 骨架自检页（原两个演示页的合并版）----------
  await page.goto(`${base}/#/debug`, { waitUntil: 'load' })
  await page.waitForTimeout(500)
  const debugText = await page.evaluate(() => document.body.innerText)
  check(debugText.includes('真源读数') || debugText.includes('骨架自检'), '骨架自检页（/#/debug）可访问')

  // ---------- 7. 内容层：真的吃到了被采纳的数据 ----------
  await page.goto(`${base}/#/menu`, { waitUntil: 'load' })
  await page.waitForTimeout(900)
  const menu = await page.evaluate(() => {
    const tiles = [...document.querySelectorAll('.ui-tile-grid .ui-tile')]
    return {
      count: tiles.length,
      names: tiles.map((el) => el.querySelector('.ui-tile__name')?.textContent?.trim() ?? ''),
      text: document.body.innerText,
    }
  })
  check(menu.count >= 9, '菜单页：项目卡片 ≥ 9 个（来自 content/data/MenuData.json）', `count=${menu.count}`)
  check(
    menu.names.some((name) => name.includes('接触器')) && menu.names.some((name) => name.includes('小测验')),
    '菜单页：出现了真实项目名（器件 + 小测验）',
    menu.names.join(' / ').slice(0, 120),
  )
  check(!menu.text.includes('内容数据未就位'), '内容层：没退化到兜底内容（说明真实数据读到了）')
  await page.screenshot({ path: resolve(artifactsDir, 'menu.png'), fullPage: false })

  // 7b. 进项目能出真实正文（TaskType.Info = 7 → article，接触器启用了简介槽位）
  await page.goto(`${base}/#/task/7?project=clip_contactor`, { waitUntil: 'load' })
  await page.waitForTimeout(600)
  const article = await page.evaluate(() => {
    const paragraphs = [...document.querySelectorAll('.ui-article p')].map(
      (el) => el.textContent?.trim() ?? '',
    )
    return { text: document.body.innerText, longest: Math.max(0, ...paragraphs.map((item) => item.length)) }
  })
  check(
    article.longest > 20,
    '项目任务页：正文来自内容数据（不是占位文字）',
    `最长段落 ${article.longest} 字`,
  )
  check(article.text.includes('接触器'), '项目任务页：面包屑显示项目名（内容数据里的 displayName）')
  await page.screenshot({ path: resolve(artifactsDir, 'task-article.png'), fullPage: false })

  // 7b-2. Info 页的三维区（DEC-98）：左边真的挂上了模型，不是占位块。
  //       断言四件事：有画布、ModelStage 已就绪、真的画出了三角面、材质解算零错误。
  await page.waitForFunction(() => Boolean(window.__WSU3_MODEL__), null, { timeout: 30_000 }).catch(() => {})
  await page.waitForTimeout(900) // 放开几帧，让 renderStats 里有真实的 draw call / 三角面
  const model = await page.evaluate(() => {
    const stage = window.__WSU3_MODEL__
    const canvas = document.querySelector('.app-model__stage canvas')
    return {
      mounted: Boolean(stage),
      canvas: Boolean(canvas),
      width: canvas?.width ?? 0,
      stats: stage ? stage.renderStats : null,
      records: stage
        ? stage.solveRecords.map((item) => ({ name: item.name, orm: item.orm, errors: item.errors.length }))
        : [],
    }
  })
  check(model.canvas && model.width > 0, 'Info 页：三维视口真的有画布', `width=${model.width}`)
  check(model.mounted, 'Info 页：ModelStage 已就绪（模型加载完成）')
  check(
    (model.stats?.triangles ?? 0) > 1000,
    'Info 页：模型真的画出了三角面（不是空场景）',
    `triangles=${model.stats?.triangles} calls=${model.stats?.calls}`,
  )
  check(
    model.records.length > 0 && model.records.every((item) => item.errors === 0),
    'Info 页：材质解算零错误（含 mask→ORM）',
    JSON.stringify(model.records),
  )
  const modelCanvas = await page.$('.app-model__stage canvas')
  const modelBox = modelCanvas ? await modelCanvas.boundingBox() : null
  if (modelBox) {
    const shot = await page.screenshot({ clip: modelBox })
    await writeFile(resolve(artifactsDir, 'task-info-model-canvas.png'), shot)
    const stats = pngStats(shot)
    // 画布**透明**（底色交给毛玻璃框），所以判据是"颜色有明显分布"而不是"不是纯白"
    check(
      stats.uniqueColors > 200 && stats.maxLum - stats.minLum > 40,
      'Info 页：三维画布画出了内容（透明底 + 模型明暗分布）',
      `unique=${stats.uniqueColors} lum=${stats.minLum}~${stats.maxLum}`,
    )
  } else {
    check(false, 'Info 页：拿不到三维画布的截图区域')
  }
  await page.screenshot({ path: resolve(artifactsDir, 'task-info.png'), fullPage: false })

  // 7c. 未启用的槽位要说清，而不是给个空白页（"实验仪器"(2) 在接触器里是 null）
  await page.goto(`${base}/#/task/2?project=clip_contactor`, { waitUntil: 'load' })
  await page.waitForTimeout(500)
  const disabled = await page.evaluate(() => document.body.innerText)
  check(disabled.includes('本项目未启用'), '未启用槽位：显示“本项目未启用”的明确状态（不是空白正文）')

  // 7d. 小测验项目出题目（TaskType.Exam = 10 → 项目自备题组）
  await page.goto(`${base}/#/task/10?project=clip_quiz`, { waitUntil: 'load' })
  await page.waitForTimeout(600)
  const quiz = await page.evaluate(() => {
    const badge = document.querySelector('.ui-panel__right .ui-badge')?.textContent ?? ''
    return { badge, text: document.body.innerText }
  })
  const questionCount = Number(/共\s*(\d+)\s*题/.exec(quiz.badge)?.[1] ?? 0)
  check(questionCount > 0, '小测验页：题目来自内容数据（项目题组）', `badge=${quiz.badge.trim()}`)
  await page.screenshot({ path: resolve(artifactsDir, 'task-quiz.png'), fullPage: false })

  // 7e. 坏链接（项目 id 不存在）：换成兜底内容并**明说**，而且不能把目录也换掉
  //     （页面是 SPA，hash 跳转不重载 —— 曾经这里把整个菜单也换成了兜底，被本节抓到）
  await page.goto(`${base}/#/task/7?project=does-not-exist`, { waitUntil: 'load' })
  await page.waitForTimeout(600)
  const stale = await page.evaluate(() => document.body.innerText)
  check(stale.includes('找不到项目'), '坏链接：状态条明说“找不到项目”并退到兜底内容（不静默）')

  await page.goto(`${base}/#/menu`, { waitUntil: 'load' })
  await page.waitForTimeout(500)
  const menuAfter = await page.evaluate(() => document.querySelectorAll('.ui-tile-grid .ui-tile').length)
  check(menuAfter >= 9, '坏链接之后目录仍然是完整的（一次坏链接不能污染全局状态）', `count=${menuAfter}`)

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
