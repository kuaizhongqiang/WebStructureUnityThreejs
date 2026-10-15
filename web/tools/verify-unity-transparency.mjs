#!/usr/bin/env node
/**
 * 结构站画布透明的**验收探针**（DEC-151 的验收项，方案见 `docs/design/13` §8）。
 *
 * 为什么单独一个工具、不塞进 `render-smoke.mjs`：
 *   冒烟跑的是**桩构建**（CI 里没有真 Unity 产物），而"画布到底透没透"只能在**真 WebGL 产物**上看。
 *   所以这条检查需要一个"solve 真产物 + 真浏览器"的入口，由人（或本地脚本）在有暂存产物时跑。
 *
 * 它回答三个问题（每条都有判据，不靠"看着像"）：
 *   ① **上下文口径**：画布的 WebGL 上下文是不是 `alpha=true` + `premultipliedAlpha=true`
 *      （这是"网页能按预乘 alpha 合成"的前提，任一为假，整套透明方案都不成立）；
 *   ② **画布与宿主**：画布及其容器的计算背景是不是全透明（不透明就会盖住页面）；
 *   ③ **真的透出来了**：把画布区域截图解码 —— **不是一整块黑**、且有真实颜色分布
 *      （不透明黑底 ⇒ 大面积近黑像素；透出来 ⇒ 看到的是页面的底图与模型本体）。
 *
 * 用法：
 *   node web/tools/verify-unity-transparency.mjs [baseUrl] [--wait 秒数] [--task 8] [--project clip_contactor]
 *   例：node web/tools/verify-unity-transparency.mjs http://127.0.0.1:5173 --wait 25
 * 前置：dev 服务在跑（`npm run dev`），且 `unity/builds/` 里有**真**产物（暂存后）。
 * 产物：web/tools/smoke/artifacts/unity-transparent.png（人工核对用）。
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { meanAbsDiff, pngDecode, pngStats } from './lib/png-stats.mjs'

const here = fileURLToPath(new URL('.', import.meta.url))
const artifactsDir = resolve(here, 'smoke', 'artifacts')

const argv = process.argv.slice(2)
const options = { wait: '25', task: '8', project: 'clip_contactor' }
let baseFromArgs = ''

// 手写解析（不引依赖）：`--key value` 与裸参数各归各位。
// ⚠️ 不能"只按前缀过滤"取裸参数 —— `--wait 60` 的 `60` 会被误当成 URL（这个坑踩过一次）。
for (let i = 0; i < argv.length; i += 1) {
  const arg = argv[i]
  if (!arg.startsWith('--')) {
    if (baseFromArgs === '') baseFromArgs = arg
    continue
  }
  const key = arg.slice(2)
  const value = argv[i + 1]
  if (value === undefined || value.startsWith('--')) {
    options[key] = 'true'
  } else {
    options[key] = value
    i += 1
  }
}

const base = baseFromArgs || 'http://127.0.0.1:5173'
const waitSeconds = Number(options.wait)
const taskType = options.task
const project = options.project
/** `--alpha-debug`：带 `wsu3_alphaDebug=1` 打开（把 alpha 画成颜色：绿=透、红=不透）。 */
const alphaDebug = options['alpha-debug'] === 'true'

let failures = 0
function check(ok, title, detail = '') {
  if (ok) {
    console.log(`[PASS] ${title}${detail ? ` — ${detail}` : ''}`)
  } else {
    failures += 1
    console.log(`[FAIL] ${title}${detail ? ` — ${detail}` : ''}`)
  }
}

const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
})

try {
  await mkdir(artifactsDir, { recursive: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

  // 捕获 Unity 侧日志（Unity WebGL 把 Debug.Log 直接打到浏览器控制台）——
  // "合成器没装配上"这类问题，答案就在这些行里；**全量留**（含各管理器的日志）才有时间线，
  // 能看出"内容场景什么时候加载完、之后合成器还在不在被驱动"。
  const allLogs = []
  page.on('console', (message) => {
    const text = message.text().replace(/\s+/g, ' ').trim()
    if (text !== '') allLogs.push(text)
  })
  page.on('pageerror', (error) => allLogs.push(`[pageerror] ${error}`))

  // ⚠️ 必须先播种"画质已选过"：新浏览器上下文里没有本机存档 ⇒ **A4 首启弹窗**会盖在画布上，
  //    那时截到的是弹窗而不是画布（这个坑踩过一次：量到 darkRatio=0，其实量的是对话框）。
  //    形状必须与存档 schema 完全一致（少 `version`/`user`/`attempts` 会被 store 判为无效并重置）。
  await page.addInitScript(() => {
    localStorage.setItem(
      'wsu3.progress',
      JSON.stringify({
        version: 1,
        user: { type: 'unknown', name: '' },
        tasks: {},
        attempts: [],
        settings: { quality: 'high', theme: 'dark', qualityChosen: true },
      }),
    )
  })

  await page.goto(`${base}/${alphaDebug ? '?wsu3_alphaDebug=1' : ''}#/task/${taskType}?project=${project}`, {
    waitUntil: 'load',
  })

  // 兜底：万一还是弹了（例如将来改了首启条件），就把它点掉再量 —— 绝不在有遮挡的情况下量画布
  if (await page.locator('.ui-mask .ui-dialog').count()) {
    const dismiss = page.locator('.ui-dialog__foot .ui-btn', { hasText: '使用推荐值' })
    if (await dismiss.count()) {
      await dismiss.first().click()
      await page.waitForSelector('.ui-dialog', { state: 'detached', timeout: 5000 }).catch(() => {})
    }
  }
  await page.waitForSelector('canvas', { timeout: 30_000 })
  console.log(`[info] 画布已创建，等 Unity 起来（最多 ${waitSeconds}s）…`)

  // 等真上下文出现（Unity 编译 wasm 要时间；桩构建不会走这条，所以这里会超时失败）
  const hasContext = await page
    .waitForFunction(
      () => {
        const canvas = document.querySelector('canvas')
        if (!canvas) return false
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
        return Boolean(gl)
      },
      null,
      { timeout: waitSeconds * 1000 },
    )
    .then(() => true)
    .catch(() => false)
  check(hasContext, 'Unity 画布已建立 WebGL 上下文（真产物）')

  // ⚠️ 必须**等合成器真的装配完**再量：
  //    WebGL 上下文在 Unity 启动早期就有了，而内容场景与 AA 包是之后才加载的 ——
  //    早量会量到"RawImage 还没接上贴图"的白图（这个坑踩过：误判成"画布是白的"）。
  //    判据用合成器自己打的那行日志（`[CanvasComposite] 已装配：…`）。
  const assembled = await (async () => {
    const deadline = Date.now() + waitSeconds * 1000
    while (Date.now() < deadline) {
      if (allLogs.some((line) => line.includes('CanvasComposite] 已装配'))) return true
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    return false
  })()
  check(assembled, '合成器已装配（日志出现「已装配」）', assembled ? '' : '超时未装配 —— 后面的像素数不作数')
  if (assembled) await page.waitForTimeout(2500) // 装配后再放几帧，等画面稳定

  // 测量前先确认"没有模态盖在画布上"：盖着的话量到的就不是画布（见上面 addInitScript 的说明）
  const overlay = await page.evaluate(() => {
    const masks = document.querySelectorAll('.ui-mask')
    const visible = Array.from(masks).filter((el) => el.getBoundingClientRect().width > 0)
    return {
      count: masks.length,
      visible: visible.length,
      text: visible.length > 0 ? (visible[0].innerText ?? '').replace(/\s+/g, ' ').slice(0, 40) : '',
    }
  })
  check(
    overlay.visible === 0,
    '画布区域没有被模态（首启弹窗等）遮挡 —— 否则量到的不是画布',
    overlay.visible === 0 ? '' : `${overlay.visible} 个遮罩：${overlay.text}`,
  )

  const probe = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    const gl = canvas ? canvas.getContext('webgl2') || canvas.getContext('webgl') : null
    const attrs = gl ? gl.getContextAttributes() : null
    const style = canvas ? getComputedStyle(canvas) : null
    const parent = canvas ? canvas.parentElement : null
    const parentStyle = parent ? getComputedStyle(parent) : null
    return {
      attrs,
      canvasBg: style ? `${style.backgroundColor} / ${style.backgroundImage}` : '(无画布)',
      parentBg: parentStyle ? parentStyle.backgroundColor : '(无父级)',
      canvasId: canvas ? canvas.id : '',
    }
  })

  console.log(`[info] 上下文属性：${JSON.stringify(probe.attrs)}`)
  console.log(`[info] 画布背景：${probe.canvasBg}`)
  console.log(`[info] 父容器背景：${probe.parentBg}`)

  check(probe.attrs?.alpha === true, '上下文 alpha=true（网页能拿到画布 alpha）', String(probe.attrs?.alpha))
  check(
    probe.attrs?.premultipliedAlpha === true,
    '上下文 premultipliedAlpha=true（合成必须输出预乘颜色）',
    String(probe.attrs?.premultipliedAlpha),
  )
  check(!/rgb\(0, 0, 0\)/.test(probe.canvasBg), '画布自身背景不透明黑 已被排掉', probe.canvasBg)

  // ②b **黑底是不是 CSS 给的**：把画布位置上由顶到底的层列出来 ——
  //     最上面必须是画布本身；画布下面不许有"不透明且没有背景图"的纯色层。
  //     （这一条是为了不用每次靠肉眼去翻样式：是画布写的黑，还是某个容器铺的纯色。）
  const stack = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    const rect = canvas.getBoundingClientRect()
    const layers = document.elementsFromPoint(
      Math.round(rect.left + rect.width / 2),
      Math.round(rect.top + rect.height / 2),
    )
    const opaque = []
    for (const el of layers.slice(1, 6)) {
      if (el === canvas) continue
      const style = getComputedStyle(el)
      const match = style.backgroundColor.match(/rgba?\(([^)]+)\)/)
      if (!match) continue
      const parts = match[1].split(',').map((value) => Number.parseFloat(value))
      const alpha = parts.length === 4 ? parts[3] : 1
      if (alpha >= 0.95 && style.backgroundImage === 'none') {
        opaque.push(`${el.tagName}.${String(el.className).slice(0, 30)} bg=${style.backgroundColor}`)
      }
    }
    const pseudoOpaque = []
    for (const el of layers.slice(1, 6)) {
      for (const name of ['::before', '::after']) {
        const style = getComputedStyle(el, name)
        if (style.content === 'none' || style.content === '') continue
        const match = style.backgroundColor.match(/rgba?\(([^)]+)\)/)
        const parts = match ? match[1].split(',').map((value) => Number.parseFloat(value)) : []
        const alpha = parts.length === 4 ? parts[3] : 1
        if (parts.length > 0 && alpha >= 0.95 && style.backgroundImage === 'none') {
          pseudoOpaque.push(`${el.tagName}.${String(el.className).slice(0, 24)}${name}`)
        }
      }
    }
    return {
      top: layers[0] ? layers[0].tagName : '(无)',
      count: layers.length,
      opaque,
      pseudoOpaque,
    }
  })
  check(stack.top === 'CANVAS', '画布是那一块最上面的层（没有被别的元素盖住）', stack.top)
  check(
    stack.opaque.length === 0 && stack.pseudoOpaque.length === 0,
    '画布之下没有不透明纯色层（黑底不是 CSS 给的）',
    [...stack.opaque, ...stack.pseudoOpaque].join(' | ') || '(无)',
  )

  // ③ 两条判据（**都不受颜色影响**）：
  //    · **透没透**：把画布藏起来（`visibility:hidden`，不改布局），同一块区域再截一次 ——
  //      四个角几乎不变 ⇒ 画布本来就没盖住页面（= 透明）；
  //    · **画了没有**：同一对比里，中心区域明显变化 ⇒ 那里真的画了模型。
  //    比"看颜色深不深"可靠得多：页面底图本身也是暗的，光看亮度容易误判。
  const canvasHandle = await page.$('canvas')
  const box = canvasHandle ? await canvasHandle.boundingBox() : null
  if (!box) {
    check(false, '拿得到画布区域（可截图验收）')
  } else {
    const withCanvas = await page.screenshot({ clip: box })
    await writeFile(resolve(artifactsDir, 'unity-transparent.png'), withCanvas)

    await page.evaluate(() => {
      const canvas = document.querySelector('canvas')
      if (canvas) canvas.style.visibility = 'hidden'
    })
    await page.waitForTimeout(400)
    const withoutCanvas = await page.screenshot({ clip: box })
    await writeFile(resolve(artifactsDir, 'unity-transparent-hidden.png'), withoutCanvas)
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas')
      if (canvas) canvas.style.visibility = ''
    })

    const stats = pngStats(withCanvas)
    console.log(
      `[info] 画布区域像素：unique=${stats.uniqueColors} lum=${stats.minLum}~${stats.maxLum} meanLum=${stats.meanLum} darkRatio=${stats.darkRatio}`,
    )

    // 诊断模式（`--alpha-debug`）下 alpha 被画成了颜色，这里把"绿(透)/红(不透)"占比量出来 ——
    // 于是"alpha 到底丢在哪一段"有个可读的数字，不必靠肉眼猜。
    const colorSplit = (() => {
      const shotPixels = pngDecode(withCanvas)
      if (shotPixels.channels < 3) return null
      let green = 0
      let red = 0
      let other = 0
      for (let y = 0; y < shotPixels.height; y += 3) {
        for (let x = 0; x < shotPixels.width; x += 3) {
          const i = (y * shotPixels.width + x) * shotPixels.channels
          const r = shotPixels.pixels[i]
          const g = shotPixels.pixels[i + 1]
          if (g > r * 1.5 && g > 60) green += 1
          else if (r > g * 1.5 && r > 60) red += 1
          else other += 1
        }
      }
      const total = green + red + other
      if (total === 0) return null
      return {
        green: (green / total).toFixed(3),
        red: (red / total).toFixed(3),
        other: (other / total).toFixed(3),
      }
    })()
    if (colorSplit) {
      console.log(
        `[info] 颜色分布：绿(透)=${colorSplit.green} 红(不透)=${colorSplit.red} 其它=${colorSplit.other}` +
          (alphaDebug ? ' ← 诊断模式：期望「背景大块绿 + 模型轮廓红」' : ''),
      )
    }

    const shot = pngDecode(withCanvas)
    const blank = pngDecode(withoutCanvas)
    const patch = 60
    const corners = [
      { name: '左上', x: 0, y: 0 },
      { name: '右上', x: shot.width - patch, y: 0 },
      { name: '左下', x: 0, y: shot.height - patch },
      { name: '右下', x: shot.width - patch, y: shot.height - patch },
    ]
    const cornerDiffs = corners.map((corner) => ({
      name: corner.name,
      diff: meanAbsDiff(shot, blank, { x: corner.x, y: corner.y, width: patch, height: patch }),
    }))
    const maxCorner = Math.max(...cornerDiffs.map((item) => item.diff))
    const centerDiff = meanAbsDiff(shot, blank, {
      x: Math.round(shot.width / 2 - patch),
      y: Math.round(shot.height / 2 - patch),
      width: patch * 2,
      height: patch * 2,
    })

    check(
      maxCorner <= 12,
      '画布四角是透的（藏掉画布后同一区域几乎不变）',
      `各角差异=${cornerDiffs.map((item) => `${item.name}:${item.diff}`).join(' ')}`,
    )
    check(centerDiff >= 8, '画布中心真的画了东西（藏掉画布后同一区域明显变化）', `中心差异=${centerDiff}`)
    check(stats.uniqueColors > 200, '画布区域有真实内容（不是纯色块）', `unique=${stats.uniqueColors}`)
    console.log(
      '[info] 截图：unity-transparent.png（含画布）/ unity-transparent-hidden.png（藏掉画布，供对比）',
    )

    // ④ **画布自己写出的 alpha 是多少？** —— 一次量清"黑底是画布写的，还是 CSS 层给的"。
    //    做法：把画布之外所有元素的 CSS 背景临时清空，再用 `omitBackground` 截图 ⇒
    //    这块区域里剩下的 alpha 只能来自画布本身：
    //      alpha≈0 ⇒ 画布是透的（黑底来自 CSS/浏览器那一侧）
    //      alpha≈1 且 RGB≈黑 ⇒ 画布写的就是不透明黑（Unity 侧 alpha 没对上）
    const clearedCount = await page.evaluate(() => {
      const canvas = document.querySelector('canvas')
      let count = 0
      document.querySelectorAll('*').forEach((el) => {
        if (el === canvas) return
        el.style.backgroundColor = 'transparent'
        el.style.backgroundImage = 'none'
        count += 1
      })
      return count
    })
    await page.waitForTimeout(300)
    const bare = await page.screenshot({ omitBackground: true, clip: box })
    await writeFile(resolve(artifactsDir, 'unity-transparent-bare.png'), bare)
    await page.evaluate((count) => {
      const canvas = document.querySelector('canvas')
      const els = Array.from(document.querySelectorAll('*')).filter((el) => el !== canvas)
      for (let i = 0; i < count && i < els.length; i += 1) {
        els[i].style.backgroundColor = ''
        els[i].style.backgroundImage = ''
      }
    }, clearedCount)

    const bareImage = pngDecode(bare)
    if (bareImage.channels !== 4) {
      console.log('[info] 画布自身 alpha 探测跳过：截图不是 RGBA（读不到 alpha）')
    } else {
      const readPixel = (x, y) => {
        const i = (y * bareImage.width + x) * bareImage.channels
        return [
          bareImage.pixels[i],
          bareImage.pixels[i + 1],
          bareImage.pixels[i + 2],
          bareImage.pixels[i + 3],
        ]
      }
      const points = [
        ['左上', 4, 4],
        ['右上', bareImage.width - 5, 4],
        ['左下', 4, bareImage.height - 5],
        ['右下', bareImage.width - 5, bareImage.height - 5],
      ]
      console.log(
        `[info] 画布自身像素（背后 CSS 已清空 + omitBackground）：${points
          .map(([name, x, y]) => `${name}=rgba(${readPixel(x, y).join(',')})`)
          .join('  ')}`,
      )

      // 边缘一圈取样：背景处的 alpha 应该是 0
      let opaque = 0
      let total = 0
      for (let x = 2; x < bareImage.width - 2; x += 20) {
        for (const y of [2, bareImage.height - 3]) {
          const i = (y * bareImage.width + x) * bareImage.channels
          total += 1
          if (bareImage.pixels[i + 3] > 200) opaque += 1
        }
      }
      const opaqueRatio = total === 0 ? 1 : Number((opaque / total).toFixed(3))
      check(
        opaqueRatio <= 0.05,
        '画布背景处自己写的 alpha ≈ 0（画布是透的）',
        `边缘不透明占比=${opaqueRatio}（≈1 ⇒ 画布写的就是不透明黑，问题在 Unity 侧）`,
      )
    }
  }

  console.log(
    failures === 0
      ? '\n== 验收通过：上下文口径与宿主都对上了、画布区域也确实是透出来的 =='
      : `\n== 有 ${failures} 条没通过，逐条看上面的 [FAIL] ==`,
  )

  // 合成器日志全量打印 + 计数：用来区分"重试停了"与"一直在失败"
  const composite = allLogs.filter((line) => line.includes('CanvasComposite'))
  console.log(
    `\n== Unity 侧日志：共捕获 ${allLogs.length} 条，其中 [CanvasComposite] ${composite.length} 条 ==`,
  )
  for (const line of composite.slice(0, 40)) console.log(`  [合成] ${line.slice(0, 200)}`)
  if (composite.length > 40) console.log(`  …其余 ${composite.length - 40} 条同类省略`)

  console.log(`== 日志尾部（最近 25 条，看时间线与各管理器走到哪一步）==`)
  for (const line of allLogs.slice(-25)) console.log(`  ${line.slice(0, 200)}`)
} finally {
  await browser.close()
}

process.exit(failures === 0 ? 0 : 1)
