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
 *   7) **站点线跟着数据走**（第 5 节）：只画当前项目启用的任务，换项目即换站。
 *   8) **启动流程真的点得通**（第 4b 节）：`start → login → menu` 且目录页能退出回登录；
 *      登录页**不该有输入框**（DEC-101：本期只允许游客）。
 *   9) **结构任务的新桥协议**（第 2c 节）：桩会说 `scene:parts`（部件树成树）、
 *      `object:hover`（`.ui-parttip` 浮标出现 / 移出消失）、点部件行出站 `view:focus`
 *      （DEC-130 / DEC-131；悬停由冒烟经 `__WSU3_STUB_HOVER__` 在稳定时机触发）。
 *
 * 说明：三维断言用 `#/task/8`（结构）而不是 `#/task/2`（实验仪器）—— 采纳数据里
 * 接触器启用了结构槽位，"实验仪器"的槽位是 `null`（会正确地显示"本项目未启用"）。
 *
 * 产物：tools/smoke/artifacts/*.png（截图，供人工核对）。
 * 用法：npm run smoke
 */

import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { pngStats } from './lib/png-stats.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const webRoot = resolve(here, '..')
const repoRoot = resolve(webRoot, '..')
const artifactsDir = resolve(here, 'smoke', 'artifacts')

const failures = []

/**
 * GitHub Actions 的**注解**（`::error title=…::message`）。
 *
 * 为什么要有：冒烟的读数只在 job 日志里，而日志要仓库权限才看得到（check-runs API 上看不到）——
 * 于是"CI 红了一条、但只知道 exit 1"就得翻几百行日志。写成注解后，**PR 的 Checks 面板与
 * check-runs API 都能直接看到"哪一条失败、当时的读数/异常是什么"**，不用登录也能定位。
 * 本地不在 Actions 里（没有 `GITHUB_ACTIONS`）就不打印，输出与以前逐字一致。
 */
function annotate(level, title, message) {
  if (process.env.GITHUB_ACTIONS !== 'true') return
  const escape = (text) =>
    String(text).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A').slice(0, 900)
  console.log(`::${level} title=${escape(title)}::${escape(message)}`)
}

function check(ok, label, detail = '') {
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) {
    failures.push(label)
    annotate('error', '冒烟断言失败', detail ? `${label} — ${detail}` : label)
  }
}

/**
 * 打开目录页（A5 环形菜单）后**等环真的停稳**，返回一份静止态快照
 * （`{ count, names, text }`）。
 *
 * 为什么必须等：产品 `MenuView.vue` 的 `SPIN_MS = 1900` —— 进目录后环先转一圈再精确停在
 * 环序 1（负责人 2026-10-16 需求）。旋转期间 `applyRing()` 每帧改 `--a5r-dx / --a5r-dy`，
 * 而卡片的屏幕位置**全部**由这两枚变量表达 ⇒ 每张卡都在动、`.is-focus` 也逐帧换人。
 * 实测到的机制（Issue #80 的产品批，日志见 `docs/RECORD.md` §5.10）：
 *   ① 旋转期间点 `.a5r-card.is-focus` ⇒ `element is not stable` **反复重试**（实测
 *      54 × 500ms ≈ 27s 之后才转成"稳定"）。**不能指望"它自己会停"**：点击自身的
 *      `pointerdown` 会调 `stopIntro()` 把环**冻在非整数格路上**，而 `snapTo()` 只在
 *      `pointerup` 里 `Math.round` ⇒ 冻住的位置不会再吸附；同一时刻 hover 也**不**中止旋转
 *      ⇒ 两个条件可能一直不满足，重试到 30s 超时。
 *   ② 侥幸稳定下来时 `.is-focus` 还在换卡 ⇒ 点到的是别人。
 * 还要注意 `MenuView.vue` 的**点击语义**（`onCardClick`）：点非焦点卡只把它转到前方正中、
 * **不进项目** —— 只有点当前焦点卡才等价于"点一张项目卡进项目"。
 *
 * ⚠️ 判据**不是**"等一个固定时长"（`SPIN_MS` 的手抄副本会静默漂）：真正的判据是
 * 「`.is-focus` 那张卡的 rect 在连续 rAF 里不变」—— 产品改动画时长、CI runner 跑得慢，
 * 这里都自动跟随。逐帧取全部 9 张（不只焦点卡）是为了顺带抓住"环在动但焦点卡恰好没动"
 * 的窗口。**只读、不改**页面状态：`getBoundingClientRect()` 读的是**屏幕**坐标，
 * 改视口会让后续断言拿到另一套坐标。
 */
async function waitForMenuSettled(page, { timeout = 15_000 } = {}) {
  return page.evaluate(
    ({ timeout }) =>
      new Promise((resolve, reject) => {
        const snapshot = () => {
          const cards = [...document.querySelectorAll('.a5r-card')]
          return {
            count: cards.length,
            names: cards.map((el) => el.querySelector('.ui-tile__name')?.textContent?.trim() ?? ''),
            text: document.body.innerText,
          }
        }
        const start = performance.now()
        let stable = 0
        let last = ''
        const tick = () => {
          /**
           * ⚠️ 卡片是**异步**来的（路由懒加载 + 内容数据 `ensureCatalog()`），而本函数在
           * `page.goto()` 之后**立刻**被调用 ⇒ 第一帧大概率一张都没有。这里必须**重试到出现**，
           * 不能一帧判死（实测踩过：直接抛"目录页没有 .a5r-card"）。
           */
          const cards = [...document.querySelectorAll('.a5r-card')]
          if (cards.length === 0) {
            if (performance.now() - start > timeout) {
              reject(new Error(`目录页一直没有 .a5r-card（${timeout}ms 内环形菜单没渲染出来）`))
              return
            }
            requestAnimationFrame(tick)
            return
          }
          let focusIdx = -1
          const boxes = cards.map((el) => {
            if (el.classList.contains('is-focus')) focusIdx = cards.indexOf(el)
            const r = el.getBoundingClientRect()
            return [Math.round(r.x * 10), Math.round(r.y * 10)]
          })
          const now = `${focusIdx}|${JSON.stringify(boxes)}`
          stable = now === last ? stable + 1 : 1
          last = now
          /**
           * 连续两帧（含焦点卡在内）9 张卡的 rect **完全一致** ⇒ 环停了。
           * 与 `.is-focus` 的身份一起比，顺带覆盖"位置恰好没动、但焦点换人了"那一档。
           */
          if (stable >= 2) {
            resolve(snapshot())
            return
          }
          if (performance.now() - start > timeout) {
            reject(new Error(`目录页环没有停稳（${timeout}ms 内焦点卡 rect 仍在变）`))
            return
          }
          requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }),
    { timeout },
  )
}

/** 过渡类名（页面级 / 站间级，见 `docs/ui-mockups/components.css` §22 与 DEC-157）。 */
const TRANSITION_SELECTOR =
  '.ui-page-enter-active, .ui-page-leave-active, .ui-station-enter-active, .ui-station-leave-active'

/**
 * 等这一次**换页 / 换站**的过渡跑完（Issue #57，DEC-157）。
 *
 * 为什么需要：换页现在是 160ms 级的过渡（路由级 `out-in` 两段、合计约 320ms），
 * 原先"点一下 + `waitForTimeout(400)` 再读页面"的写法在慢 runner 上只剩几十毫秒余量 ——
 * CI 实测就这么红了两条（"欢迎页主按钮"、"登录页游客入口"：读到的还是上一屏）。
 *
 * ⚠️ 不能只等"过渡类消失"：hash 路由的 `push` 是异步的，点完立刻查会在导航还没起来时
 * 误判成"已经稳定"（本地实测把 `#/login` 读成了 `#/start`）。所以**先等过渡出现**，
 * 等不到才认为这次没换页（例如整页加载出来的首屏）—— 那时调用方本来也不该等过渡。
 */
async function settle(page, { startTimeout = 3000, endTimeout = 10_000 } = {}) {
  const started = await page
    .waitForFunction((selector) => Boolean(document.querySelector(selector)), TRANSITION_SELECTOR, {
      timeout: startTimeout,
    })
    .then(() => true)
    .catch(() => false)
  if (!started) return
  await page
    .waitForFunction((selector) => !document.querySelector(selector), TRANSITION_SELECTOR, {
      timeout: endTimeout,
    })
    .catch(() => {})
}

/**
 * 等**已经起来**的过渡收干净（不推动任何导航）。
 *
 * 与 `settle()` 的分工：`settle()` 用在"我刚点了一下、过渡即将开始"之后；
 * `quiet()` 用在"我马上要开始数过渡类"之前 —— 否则上一屏的离场影子
 * （站间过渡是交叉淡入淡出，离场层会留在 DOM 里约 160ms）会被记进这一轮。
 */
async function quiet(page, timeout = 10_000) {
  await page
    .waitForFunction((selector) => !document.querySelector(selector), TRANSITION_SELECTOR, { timeout })
    .catch(() => {})
}

// ---------- 0. 冒烟自备的 Unity 桩构建（隔离在临时目录，**绝不**覆盖 unity/builds）----------
// 为什么需要：`/unity/**` 与 `release-manifest.json` 原本只有壳的静态服务器提供，于是"点进 Unity 任务"
// 在冒烟里永远走"产物未就位"那条分支 —— 整条桥交互没有任何自动化证据。真 WebGL 构建又要求先关编辑器
// （DEC-59），不适合放进冒烟。
//
// 做法：用 `unity-stage --stage-root` 把桩暂存到**临时目录**，再让 dev 服务器从那里取
// （`WSU3_UNITY_DEV_ROOT`，见 web/vite.config.ts 的 unityDevServe）。`unity/builds/` 是负责人
// 真打好的产物落点，冒烟不该碰它。
const stubRoot = await mkdtemp(join(tmpdir(), 'wsu3-unity-stub-'))
const stubBuilds = join(stubRoot, 'builds')

function runNode(script, argv) {
  const result = spawnSync(process.execPath, [resolve(repoRoot, script), ...argv], {
    stdio: 'pipe',
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    throw new Error(
      `${script} 失败（exit ${result.status}）：\n${result.stdout ?? ''}\n${result.stderr ?? ''}`,
    )
  }
}

// 桩**故意只声明 4/5/8**（不含 9 检测）：这样"清单没声明该任务 ⇒ 明确显示产物未就位"那条分支
// 仍然能被第 2 节验到，而 8（结构）走完整的桥交互。
runNode('tools/pipeline/make-stub-unity.mjs', [
  '--key',
  'main',
  '--task-types',
  '4,5,8',
  '--out',
  join(stubRoot, 'src'),
])
runNode('tools/pipeline/unity-stage.mjs', [
  '--from',
  join(stubRoot, 'src'),
  '--key',
  'main',
  '--task-types',
  '4,5,8',
  '--bridge',
  '--stage-root',
  stubBuilds,
])
process.env.WSU3_UNITY_DEV_ROOT = stubBuilds

/** 步骤题 `contactor_q_mainContact` 的正确选项下标 —— **从内容数据算**，不在冒烟里硬编。 */
const questionBank = JSON.parse(
  await readFile(resolve(repoRoot, 'web/public/content/data/QuestionData.json'), 'utf8'),
)
const stepQuestion = (questionBank.questions ?? []).find((item) => item.id === 'contactor_q_mainContact')
const correctIndex = (stepQuestion?.options ?? []).findIndex((option) => option.isCorrect === true)
if (correctIndex < 0) throw new Error('内容数据里找不到 contactor_q_mainContact 的正确选项')

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

  // 让桩构建按契约"回消息"（等价于在地址栏加 `?wsu3_stub=protocol`，见 tools/pipeline/make-stub-unity.mjs）
  await page.addInitScript(() => {
    window.__WSU3_STUB_PROTOCOL__ = true
    // 预置"画质已选过"（A4 首启弹窗不出现）—— 仅在**没有**本机存档时播种（不覆盖冒烟过程积累的进度）；
    // A4 自己的断言在 4c 节：清掉这个键再专门验首启弹窗。
    if (!localStorage.getItem('wsu3.progress')) {
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
    }
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

  // ---------- 2. Unity 类任务页：**清单没声明**该任务 ⇒ 明确显示"产物未就位" ----------
  // 用 TaskType.Inspection = 9：桩只声明了 4/5/8，所以这里走的正是"缺席必须明说"那条分支（DEC-79）。
  await page.goto(`${base}/#/task/9?project=clip_contactor`, { waitUntil: 'load' })
  await page.waitForTimeout(800)
  const unity = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    return { hasCanvas: Boolean(canvas), bodyText: document.body.innerText.slice(0, 900) }
  })

  check(!unity.hasCanvas, 'Unity 页：未创建 three 画布（不越权渲染）')
  check(
    unity.bodyText.includes('三维视口（Unity）'),
    'Unity 页：显示 Unity 视口骨架（DEC-06 分流生效）',
    unity.bodyText.replace(/\s+/g, ' ').slice(0, 80),
  )
  check(
    unity.bodyText.includes('Unity 产物未包含在本次发布里') || unity.bodyText.includes('产物未就位'),
    'Unity 页：清单未声明该任务 → 明说"产物未就位"（不是卡在加载中）',
    unity.bodyText.replace(/\s+/g, ' ').slice(0, 110),
  )
  await page.screenshot({ path: resolve(artifactsDir, 'task-unity-placeholder.png'), fullPage: false })

  // ---------- 2b. Web ⇄ Unity **全量交互**（桩仿真 Unity 侧；TaskType.Structure = 8）----------
  // 这一节是"两线交互跑通"的程序化证据：Web 发出的 app:init / scene:enter / input:enable / ui:result
  // 与 Unity 发出的 assets:ready / scene:ready / step:changed / ui:request / task:completed
  // 走的是同一套契约（载荷口径见 docs/design/02 §3）。
  await page.goto(`${base}/#/task/8?project=clip_contactor`, { waitUntil: 'load' })
  await page.waitForSelector('.ui-mask .ui-dialog', { timeout: 25000 })

  const opened = await page.evaluate(() => ({
    title: document.querySelector('.ui-dialog__title')?.innerText ?? '',
    body: document.querySelector('.ui-dialog__body')?.innerText ?? '',
    tips: document.querySelector('.ui-tips-float')?.innerText ?? '',
    stub: window.__WSU3_STUB_STATE__ ?? null,
    status: document.body.innerText,
  }))
  check(
    opened.stub?.entered?.taskType === 8 && opened.stub?.entered?.projectId === 'clip_contactor',
    '桥交互：Web 发出 scene:enter{taskType:8, projectId:clip_contactor}',
    JSON.stringify(opened.stub?.entered ?? null),
  )
  check(
    opened.stub?.appInit?.protocolVersion === 1,
    '桥交互：握手后发出 app:init（带语言/画质/协议版本）',
    JSON.stringify(opened.stub?.appInit ?? null),
  )
  check(
    opened.tips.includes('步骤提示') && opened.tips.includes('操作提示'),
    '桥交互：提示条（tips，无需回执）拿到内容数据里的两行文案',
    opened.tips.replace(/\s+/g, ' ').slice(0, 70),
  )
  check(
    opened.title.includes('接触器检测'),
    '桥交互：信息面板标题来自内容数据（StepContentData.json）',
    opened.title.replace(/\s+/g, ' ').slice(0, 40),
  )
  check(
    opened.body.includes('万用表'),
    '桥交互：信息面板正文来自内容数据（不是空框）',
    opened.body.replace(/\s+/g, ' ').slice(0, 50),
  )
  check(
    opened.stub?.inputEnabled === false,
    '桥交互：模态面板打开 → input:enable{false}（DEC-84 §6：盖住的面板不能被拖）',
    String(opened.stub?.inputEnabled),
  )
  const stepBadge = (opened.status.match(/步骤\s*\d+\s*\/\s*\d+/) ?? [''])[0].replace(/\s+/g, '')
  check(stepBadge === '步骤1/3', '桥交互：step:changed 落到页面进度（扁平序号）', stepBadge)
  await page.screenshot({ path: resolve(artifactsDir, 'task-unity-step-panel.png'), fullPage: false })

  // ① 翻完信息面板的几页再确认（关闭即完成 ⇒ success）
  for (let i = 0; i < 6; i += 1) {
    const label = await page.evaluate(
      () => document.querySelector('.ui-dialog__foot .ui-btn--primary')?.innerText?.trim() ?? '',
    )
    if (label.includes('确认')) break
    await page.click('.ui-dialog__foot .ui-btn--primary')
    await page.waitForTimeout(120)
  }
  await page.click('.ui-dialog__foot .ui-btn--primary')
  await page.waitForFunction(() => (window.__WSU3_STUB_STATE__?.replies?.length ?? 0) >= 1, null, {
    timeout: 15000,
  })
  const afterUi = await page.evaluate(() => window.__WSU3_STUB_STATE__?.replies?.[0] ?? null)
  check(
    afterUi?.kind === 'ui' && afterUi?.result === 'success',
    '桥交互：关信息面板 → ui:result{kind:ui, result:success}（关闭即完成）',
    JSON.stringify(afterUi),
  )

  // ② 答题面板：题干来自题库（判定也在 Web 侧）
  await page.waitForFunction(
    () => (document.querySelector('.ui-dialog__body')?.innerText ?? '').includes('主触点'),
    null,
    { timeout: 15000 },
  )
  const questionText = await page.evaluate(() => document.querySelector('.ui-dialog__body')?.innerText ?? '')
  check(
    questionText.includes('辅助常开触点对'),
    '桥交互：答题面板取到题库里的题干（refId=contactor_q_mainContact）',
    questionText.replace(/\s+/g, ' ').slice(0, 50),
  )

  // ③ 先**答错**一次：界面层判定（不回 failed，先让人看到错在哪）→ 点"重试"才回 failed
  const wrongIndex = correctIndex === 0 ? 1 : 0
  await page.locator('.ui-option').nth(wrongIndex).click()
  await page.click('.ui-dialog__foot .ui-btn--primary')
  await page.waitForSelector('.ui-alert--warn', { timeout: 10000 })
  const wrongJudged = await page.evaluate(() => ({
    warn: document.querySelector('.ui-alert--warn')?.innerText ?? '',
    replies: window.__WSU3_STUB_STATE__?.replies?.length ?? 0,
  }))
  check(
    wrongJudged.replies === 1,
    '桥交互：答错先由**界面层**判定并提示，不立刻回执（判定在 Web 侧）',
    wrongJudged.warn.replace(/\s+/g, ' ').slice(0, 40),
  )
  await page.click('.ui-dialog__foot .ui-btn--primary') // 重试 → 回 failed
  await page.waitForFunction(() => (window.__WSU3_STUB_STATE__?.replies?.length ?? 0) >= 2, null, {
    timeout: 15000,
  })
  const wrongReply = await page.evaluate(() => window.__WSU3_STUB_STATE__?.replies?.[1] ?? null)
  check(
    wrongReply?.kind === 'question' && wrongReply?.result === 'failed',
    '桥交互：答错 → ui:result{kind:question, result:failed}，由条件层决定"再问一次"',
    JSON.stringify(wrongReply),
  )
  // 重问：面板重新出现且选项回到未作答态（重试上限在 Unity 侧，默认 3 次）
  await page.waitForFunction(
    () => document.querySelectorAll('.ui-option--right, .ui-option--wrong').length === 0,
    null,
    { timeout: 15000 },
  )
  check(true, '桥交互：failed 之后题目被重新弹出（选项回到未作答态）')

  // ④ 答对 → 末步 → task:completed
  await page.locator('.ui-option').nth(correctIndex).click()
  await page.click('.ui-dialog__foot .ui-btn--primary')
  await page.waitForFunction(() => Boolean(window.__WSU3_STUB_STATE__?.completed), null, {
    timeout: 15000,
  })
  await page.waitForTimeout(300)
  const finished = await page.evaluate(() => ({
    replies: window.__WSU3_STUB_STATE__?.replies ?? [],
    body: document.body.innerText,
    inputEnabled: window.__WSU3_STUB_STATE__?.inputEnabled,
  }))
  check(
    finished.replies[2]?.result === 'success',
    '桥交互：答对 → ui:result{kind:question, result:success}',
    JSON.stringify(finished.replies[2] ?? null),
  )
  check(
    finished.body.includes('任务完成'),
    '桥交互：task:completed 落到页面（用时如实显示，分数不编造）',
    (finished.body.match(/任务完成[^\n]*/) ?? [''])[0].slice(0, 60),
  )
  check(
    finished.inputEnabled === true,
    '桥交互：面板全部关闭 → input:enable{true}（输入放回）',
    String(finished.inputEnabled),
  )
  await page.screenshot({ path: resolve(artifactsDir, 'task-unity-completed.png'), fullPage: false })

  // ---------- 2c. 结构任务的新协议：scene:parts / object:hover / view:focus（DEC-130 / DEC-131）----------
  // 桩在 scene:enter{taskType:8} 后自动发 scene:parts；悬停与移出由冒烟在稳定时机经
  // __WSU3_STUB_HOVER__ 触发（避免与对话框时序赛跑）；点选部件行的出站 view:focus 由桩记录。
  // 此时 2b 的面板已全部关完，点击不会被 .ui-mask 挡住。
  await page.waitForFunction(() => document.querySelectorAll('.ui-list__item').length >= 4, null, {
    timeout: 15000,
  })
  const partRows = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.ui-list__item')).map((el) =>
      (el.innerText ?? '').replace(/\s+/g, ' ').trim(),
    ),
  )
  check(
    partRows.length === 4,
    '结构新协议：scene:parts → 右侧部件树渲染 4 行（含计数徽标的数据源）',
    partRows.join(' | '),
  )
  check(
    partRows[0]?.includes('交流接触器') &&
      partRows[1]?.includes('线圈') &&
      partRows[2]?.includes('主触点') &&
      partRows[3]?.includes('辅助触点'),
    '结构新协议：buildPartTree 按 parentKey 成树（根在前、子随其后，DFS 序）',
    partRows.join(' | '),
  )

  // ① 悬停 → .ui-parttip 出现（中英文名）
  await page.evaluate(() => window.__WSU3_STUB_HOVER__('contactor/MainContact', 0.62, 0.38))
  await page.waitForSelector('.ui-parttip', { timeout: 5000 })
  const tipShown = await page.evaluate(() => {
    const el = document.querySelector('.ui-parttip')
    return {
      text: (el?.innerText ?? '').replace(/\s+/g, ' ').trim(),
      left: el ? el.style.left : '',
    }
  })
  check(
    tipShown.text.includes('主触点') && tipShown.text.includes('Main Contact'),
    '结构新协议：object:hover → .ui-parttip 出现（中英文名）',
    tipShown.text,
  )
  check(
    tipShown.left === 'calc(62.00% + var(--sp-3))',
    '结构新协议：浮标位置按归一化坐标换算（x=0.62 → left 以 62% 计）',
    tipShown.left,
  )
  await page.screenshot({ path: resolve(artifactsDir, 'task-structure-parttip.png'), fullPage: false })

  // ② 移出（key=""）→ 浮标消失
  await page.evaluate(() => window.__WSU3_STUB_HOVER__(''))
  await page.waitForSelector('.ui-parttip', { state: 'detached', timeout: 5000 })
  check(true, '结构新协议：object:hover{key:""}（移出）→ 浮标消失')

  // ③ 点部件行 → 出站 view:focus{objectKey}，行进入选中态
  await page.locator('.ui-list__item', { hasText: '线圈' }).click()
  await page.waitForFunction(() => Boolean(window.__WSU3_STUB_STATE__?.focused), null, {
    timeout: 5000,
  })
  const focused = await page.evaluate(() => window.__WSU3_STUB_STATE__?.focused ?? null)
  check(
    focused?.objectKey === 'contactor/Coil' && focused?.animate === false,
    '结构新协议：点部件行 → 出站 view:focus{objectKey, animate}',
    JSON.stringify(focused),
  )
  const activeRow = await page.evaluate(() => {
    const el = document.querySelector('.ui-list__item--active')
    return el ? (el.innerText ?? '').replace(/\s+/g, ' ').trim() : ''
  })
  check(activeRow.includes('线圈'), '结构新协议：点中的行带选中态（.ui-list__item--active）', activeRow)
  await page.screenshot({ path: resolve(artifactsDir, 'task-structure-parts.png'), fullPage: false })

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
  await settle(page)
  const home = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement)
    return {
      text: document.body.innerText,
      radiusPanel: style.getPropertyValue('--radius-panel').trim(),
      border3: style.getPropertyValue('--border-3').trim(),
      caption: style.getPropertyValue('--shell-caption-h').trim(),
      theme: document.documentElement.getAttribute('data-theme') ?? '',
      hasCard: Boolean(document.querySelector('.ui-titlebar.ui-titlebar--float')),
      // 页面底图（Issue #44）：外壳的 background-image 里要有那张图（深浅两套主题都铺，
      // 差别在面纱 `--board-veil`：深色 0、亮色 42% 白纱）
      rootBg: getComputedStyle(document.querySelector('.app-root') ?? document.body).backgroundImage,
      veil: style.getPropertyValue('--board-veil').trim(),
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
  check(
    /room-dark\.jpg/.test(home.rootBg),
    '外壳：页面底图已铺（Issue #44，与排版稿同一张图）',
    home.rootBg.slice(0, 90) || '(空)',
  )
  check(home.veil !== '', '外壳：底图面纱走令牌 --board-veil（不写第二次颜色）', home.veil)
  await page.screenshot({ path: resolve(artifactsDir, 'start.png'), fullPage: false })

  // ---------- 4c. A4 画质 / 首次设置：首启弹窗（三档卡片）+「使用推荐值」写存档 ----------
  // 前面各节都带着"画质已选过"的种子跑；这里显式写入 qualityChosen:false 模拟首启
  // （不能 removeItem —— addInitScript 见键缺失会重新播种），首启弹窗应当出现，
  // 桌面环境点「使用推荐值」= 高清 + 记"已选过"，之后弹窗不再出现。
  await page.evaluate(() => {
    localStorage.setItem(
      'wsu3.progress',
      JSON.stringify({
        version: 1,
        user: { type: 'unknown', name: '' },
        tasks: {},
        attempts: [],
        settings: { quality: 'high', theme: 'dark', qualityChosen: false },
      }),
    )
  })
  // ⚠️ hash 导航不会重载页面 —— store 在首次启动时就读过存档了，必须**真 reload** 才能让
  // qualityChosen:false 生效（这也是首启弹窗的真实场景：第一次进页面时就读到 false）。
  await page.reload({ waitUntil: 'load' })
  await page.waitForSelector('.ui-mask .ui-dialog', { timeout: 10000 })
  const qualityText = await page.evaluate(
    () => document.querySelector('.ui-dialog__body')?.innerText.replace(/\s+/g, ' ') ?? '',
  )
  check(
    qualityText.includes('选择画面质量') && qualityText.includes('标清') && qualityText.includes('超清'),
    'A4 画质：首启弹窗出现（三档卡片齐全）',
    qualityText.slice(0, 60),
  )
  await page.screenshot({ path: resolve(artifactsDir, 'a4-quality.png'), fullPage: false })
  await page.locator('.ui-dialog__foot .ui-btn', { hasText: '使用推荐值' }).click()
  await page.waitForSelector('.ui-dialog', { state: 'detached', timeout: 5000 })
  const savedSettings = await page.evaluate(
    () => JSON.parse(localStorage.getItem('wsu3.progress') ?? '{}')?.settings ?? {},
  )
  check(
    savedSettings.qualityChosen === true && savedSettings.quality === 'high',
    'A4 画质：使用推荐值 → 存档写入（高清 + 已选标记，桌面推荐=高清）',
    JSON.stringify(savedSettings),
  )

  // ---------- 4b. 启动流程（DEC-101）：start → login → menu，且目录页能退出回登录 ----------
  // 判据是**真的点**（不是读路由表）：本期只允许游客，所以登录页**不该有输入框**。
  await page.click('button.ui-btn--primary') // 「开始实验」
  await settle(page)
  const loginPage = await page.evaluate(() => ({
    hash: location.hash,
    text: document.body.innerText,
    inputs: document.querySelectorAll('input').length,
    crumb: document.querySelector('.ui-titlebar__crumb')?.textContent?.trim() ?? '',
  }))
  check(loginPage.hash === '#/login', '启动流程：开始实验 → 登录页（start → login）', loginPage.hash)
  check(loginPage.text.includes('以游客身份进入'), '登录页：提供游客入口', loginPage.crumb)
  check(
    loginPage.inputs === 0,
    '登录页：不摆账号 / 密码输入框（DEC-101：本期只允许游客）',
    `inputs=${loginPage.inputs}`,
  )
  await page.screenshot({ path: resolve(artifactsDir, 'login.png'), fullPage: false })

  await page.click('button.ui-btn--primary') // 「以游客身份进入」
  await settle(page)
  const menuSettled = await waitForMenuSettled(page) // 等目录的内容层与环形开场旋转都收尾
  const menuAfterLogin = await page.evaluate(
    (tiles) => ({ hash: location.hash, tiles, text: document.body.innerText }),
    menuSettled.count,
  )
  check(
    menuAfterLogin.hash === '#/menu',
    '启动流程：游客进入 → 项目目录（login → menu）',
    menuAfterLogin.hash,
  )
  check(menuAfterLogin.tiles >= 9, '启动流程：登录之后目录照常加载内容数据', `tiles=${menuAfterLogin.tiles}`)
  check(menuAfterLogin.text.includes('退出'), '项目目录：有「退出」入口（DEC-101）')

  await page.click('button.ui-iconbtn--back') // 「退出」
  await settle(page)
  const afterExit = await page.evaluate(() => location.hash)
  check(afterExit === '#/login', '项目目录：退出 → 回到登录页', afterExit)

  // ---------- 5. 站点线：**只画本项目启用的站**（DEC-100）+ 契约标签 + 技术栈标注 ----------
  // 站点由**内容数据**决定（不再是"契约里 11 个都画"）：接触器只填了
  // 简介 / 结构 / 实验原理 / 检测 四个槽位，其余七个在数据里是 `null` ⇒ 不该出现。
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
  check(route.count === 4, '站点线：只画本项目启用的 4 站（数据驱动，DEC-100）', `count=${route.count}`)
  check(
    route.labels.join('/') === '简介/结构/实验原理/检测',
    '站点线：顺序按来源工程装配顺序（DEC-148）、标签逐字来自契约',
    route.labels.join('/'),
  )
  check(
    !route.labels.includes('任务目的') && !route.labels.includes('电路连接'),
    '站点线：数据里没填槽位的任务不出现（不是把 11 个契约任务都画上）',
    route.labels.join('/'),
  )
  check(route.stacks.includes('Unity') && route.stacks.includes('Three'), '站点线：技术栈标注齐全（DEC-06）')

  // 5b. 换一个项目：小测验只启用「考核」一个槽位 ⇒ 站点线只剩 1 站（同一份代码，跟着数据走）
  await page.goto(`${base}/#/task/10?project=clip_quiz`, { waitUntil: 'load' })
  await page.waitForTimeout(600)
  const singleRoute = await page.evaluate(() => ({
    count: document.querySelectorAll('.ui-route__stop').length,
    labels: [...document.querySelectorAll('.ui-route__label')].map((el) => el.textContent?.trim() ?? ''),
  }))
  check(
    singleRoute.count === 1 && singleRoute.labels.join('/') === '考核',
    '站点线：换项目即换站（小测验项目只有「考核」1 站）',
    `count=${singleRoute.count} ${singleRoute.labels.join('/')}`,
  )

  // ---------- 6. 骨架自检页（原两个演示页的合并版）----------
  /**
   * ⚠️ 这里必须**等这个视图自己挂上**，不能只等 `load` 再固定等 500ms：`/#/debug` 是**懒加载路由**
   * （`DebugView` 是独立 chunk），`waitUntil: 'load'` 只保证 document 与初始 chunk 就绪，
   * 之后还要下载并执行 DebugView 的 chunk 才会渲出正文。
   *
   * 实测（`gate` run `38872469073`，2026-10-16）：**两次连跑都红在同一条断言**，而失败点距上一条
   * 断言恰好 **0.5s**（就是原来那个固定等待）⇒ CI runner 上 500ms 不够（本机够、所以本地看不出来）。
   * 该 run 全程无 404、无 JS 异常，且同一 job 后续断言（含目录页 `count=9`）全 PASS。
   *
   * ⚠️ 判据**不能**用 `.app-task` 这类"两屏共用"的选择器：换页过渡期间**两屏共存**，
   * `.app-task` 会命中**上一屏**（实测：改成等 `.app-task` 后，断言拿到 `body.innerText`
   * 只剩 `仿`/外壳标题栏 —— 命中早了、比等 500ms 还糟）。⇒ 只等 DebugView **独有**的
   * 那行面板头「真源读数（session store）」（`DebugView.vue:81`，别的视图没有这串字）。
   */
  await page.goto(`${base}/#/debug`, { waitUntil: 'load' })
  await page.waitForSelector('.ui-panel__head:has-text("真源读数")', { timeout: 10_000 })
  const debugText = await page.evaluate(() => document.body.innerText)
  check(
    debugText.includes('真源读数') || debugText.includes('骨架自检'),
    '骨架自检页（/#/debug）可访问',
    debugText.slice(0, 200),
  )

  // ---------- 7. 内容层：真的吃到了被采纳的数据 ----------
  await page.goto(`${base}/#/menu`, { waitUntil: 'load' })
  const menu = await waitForMenuSettled(page) // 等开场旋转停稳（判据见该函数）
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
  //
  // ⚠️ 判据是**二择一**，与壳里那段 Unity 取证同一口径：大资产按 DEC-57 **不进 git**，
  //    干净 checkout（CI）里没有 `content/assets/three`，那时页面必须**明确报告**
  //    "没有模型 / 加载不了"；本机有资产时则必须真的挂上模型。**"卡在加载中"算失败**。
  await page
    .waitForFunction(
      () => {
        const text = document.body.innerText
        return (
          Boolean(window.__WSU3_MODEL__) ||
          text.includes('本项目没有三维模型') ||
          text.includes('三维模型没能加载')
        )
      },
      null,
      { timeout: 30_000 },
    )
    .catch(() => {})
  await page.waitForTimeout(900) // 放开几帧，让 renderStats 里有真实的 draw call / 三角面
  const model = await page.evaluate(() => {
    const stage = window.__WSU3_MODEL__
    const canvas = document.querySelector('.app-model__stage canvas')
    const text = document.body.innerText
    return {
      mounted: Boolean(stage),
      // "没有模型"与"加载不了"两种文案都算**明确状态**：不做假设 ≠ 失败，**卡在加载中**才是失败
      reported: text.includes('本项目没有三维模型') || text.includes('三维模型没能加载'),
      canvas: Boolean(canvas),
      width: canvas?.width ?? 0,
      stats: stage ? stage.renderStats : null,
      records: stage
        ? stage.solveRecords.map((item) => ({ name: item.name, orm: item.orm, errors: item.errors.length }))
        : [],
    }
  })
  const materialsSolved = model.records.length > 0 && model.records.every((item) => item.errors === 0)
  const withModel = model.mounted && (model.stats?.triangles ?? 0) > 1000 && materialsSolved
  check(model.canvas && model.width > 0, 'Info 页：三维视口真的有画布', `width=${model.width}`)
  check(
    withModel || model.reported,
    'Info 页：三维区要么挂着模型（材质零错误）、要么明确报告"没有/加载不了"',
    model.mounted
      ? `triangles=${model.stats?.triangles} calls=${model.stats?.calls} 材质=${JSON.stringify(model.records)}`
      : `明确状态=${model.reported}（本 checkout 没有 content/assets/three，DEC-57 不进 git）`,
  )
  if (!withModel && model.reported) {
    console.log('[SKIP] 本 checkout 没有三维资产：模型断言按"页面明确报告未包含"通过（卡在加载中才算失败）')
  }
  const modelCanvas = await page.$('.app-model__stage canvas')
  const modelBox = modelCanvas ? await modelCanvas.boundingBox() : null
  if (!modelBox) {
    check(false, 'Info 页：拿不到三维画布的截图区域')
  } else if (model.mounted) {
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
    // 没有模型时画布是空的（透明），这一条此时没有意义 —— 明确跳过，不当成通过
    console.log('[SKIP] 本 checkout 没有三维资产（模型未随包发布），跳过"画布有内容"断言')
  }
  await page.screenshot({ path: resolve(artifactsDir, 'task-info.png'), fullPage: false })

  // 7b-3. 原理页（DEC-99）：讲解视频真的挂上了；右栏是"说明"；**单段视频时列表不出现**。
  //
  // 判据同样是**二择一**（与三维资产、Unity 产物一个口径）：大资产按 DEC-57 不进 git，
  // 干净 checkout（CI）里没有 `content/assets/video`，那时页面必须明确报告"未包含"；
  // 本机有视频时则必须**真的读到元数据**（readyState ≥ 1 = 浏览器认这个文件）。
  // **"卡在载入中"算失败。**
  await page.goto(`${base}/#/task/3?project=clip_contactor`, { waitUntil: 'load' })
  await page
    .waitForFunction(
      () => {
        const probe = window.__WSU3_VIDEO__
        return probe ? probe.phase === 'ready' || probe.phase === 'absent' : false
      },
      null,
      { timeout: 30_000 },
    )
    .catch(() => {})
  // 元数据要真的读出来才算"能播"（对 30 MB 那一段尤其明显）
  await page
    .waitForFunction(
      () => {
        const probe = window.__WSU3_VIDEO__
        const element = document.querySelector('video.app-video__el')
        return Boolean(probe && probe.phase !== 'ready') || Boolean(element && element.readyState >= 1)
      },
      null,
      { timeout: 20_000 },
    )
    .catch(() => {})
  const video = await page.evaluate(() => {
    const probe = window.__WSU3_VIDEO__ ?? null
    const element = document.querySelector('video.app-video__el')
    const text = document.body.innerText
    return {
      probe,
      hasElement: Boolean(element),
      src: element ? element.currentSrc || element.getAttribute('src') || '' : '',
      controlsList: element ? String(element.controlsList ?? element.getAttribute('controlslist') ?? '') : '',
      readyState: element ? element.readyState : -1,
      videoWidth: element ? element.videoWidth : 0,
      videoHeight: element ? element.videoHeight : 0,
      duration: element ? Math.round(element.duration || 0) : 0,
      playlistRows: document.querySelectorAll('.app-video__side .ui-playlist__item').length,
      panels: [...document.querySelectorAll('.app-video__side .ui-panel__head')].map((n) =>
        n.textContent.trim(),
      ),
      paragraphs: [...document.querySelectorAll('.app-video__side .ui-article p')].map((n) =>
        n.textContent.trim(),
      ),
      reported: text.includes('讲解视频未包含在本次发布里') || text.includes('讲解视频没能播放'),
    }
  })
  const videoReady = Boolean(video.probe && video.probe.phase === 'ready')
  const videoPlayable = videoReady && video.readyState >= 1 && video.videoWidth > 0
  check(
    videoPlayable || video.reported,
    '原理页：要么真的能播（读到元数据）、要么明确报告"未包含"（卡在载入中算失败）',
    videoPlayable
      ? `readyState=${video.readyState} ${video.videoWidth}x${video.videoHeight} ${video.duration}s`
      : `明确状态=${video.reported}`,
  )
  if (videoReady) {
    check(
      video.probe.sections === 1 && video.probe.playlist === false && video.playlistRows === 0,
      '原理页：单段视频 ⇒ 视频列表整块不出现（DEC-99）',
      `sections=${video.probe.sections} playlist=${video.probe.playlist} rows=${video.playlistRows}`,
    )
    check(
      video.panels.length === 1 && video.panels[0] === '原理说明',
      '原理页：右栏只有"原理说明"这一个面板',
      video.panels.join(' + ') || '(空)',
    )
    check(
      video.hasElement && /\/assets\/video\/.*\.mp4/.test(video.src),
      '原理页：<video> 指向产物里的视频（不是硬编路径）',
      video.src.slice(-44),
    )
    check(
      video.controlsList.includes('nodownload'),
      '原理页：播放器不带下载按钮（controlslist=nodownload）',
      video.controlsList || '(空)',
    )
    check(
      video.paragraphs.some((item) => item.length > 10),
      '原理页：右栏"原理说明"来自内容数据（不是占位文字）',
      video.paragraphs.map((item) => item.length).join('/'),
    )
  } else {
    console.log('[SKIP] 本 checkout 没有视频资产（DEC-57 不进 git）：按"页面明确报告未包含"通过')
  }
  await page.screenshot({ path: resolve(artifactsDir, 'task-principle.png'), fullPage: false })

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
  const menuAfter = (await waitForMenuSettled(page)).count // 等开场旋转停稳再数
  check(menuAfter >= 9, '坏链接之后目录仍然是完整的（一次坏链接不能污染全局状态）', `count=${menuAfter}`)

  // ---------- 8. 页面过渡（Issue #57）：路由级 / 站间级，以及"常驻画布不许跟着淡" ----------
  // 判据是 **Vue 真的把过渡类挂上过**（MutationObserver 收 class 属性变化），
  // 不是"截图看着像在淡" —— 后者复跑不稳，也没法机器判定。
  // 类名与令牌口径：docs/ui-mockups/components.css §22、web/src/domain/page-transition.ts。
  const watchTransitions = () =>
    page.evaluate(() => {
      window.__WSU3_T_CLASSES__ = []
      const observer = new MutationObserver((records) => {
        for (const record of records) {
          const target = record.target
          if (!(target instanceof Element)) continue
          for (const name of target.classList) window.__WSU3_T_CLASSES__.push(name)
        }
      })
      // 只听 class 属性（不监听 childList）：探针元素自己插入 / 移除不会被记成"播过过渡"
      observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] })
      window.__WSU3_T_OBSERVER__ = observer
    })
  const readTransitions = () =>
    page.evaluate(() => {
      window.__WSU3_T_OBSERVER__?.disconnect()
      const seen = [...new Set(window.__WSU3_T_CLASSES__ ?? [])]
      return seen.filter((name) => /^ui-(page|station)-(enter|leave)-(active|from|to)$/.test(name))
    })
  /** 就地量一个过渡类的 computed 时长（用于证明"时长真的来自令牌"）。 */
  const measureTransition = (className) =>
    page.evaluate((name) => {
      const probe = document.createElement('div')
      probe.className = name
      document.body.appendChild(probe)
      const duration = getComputedStyle(probe).transitionDuration
      probe.remove()
      const root = getComputedStyle(document.documentElement)
      return {
        duration,
        token: root.getPropertyValue('--dur-page').trim(),
        easing: root.getPropertyValue('--ease-page').trim(),
        shift: root.getPropertyValue('--page-shift').trim(),
      }
    }, className)
  /**
   * 点站点线的一站。
   *
   * 用 DOM `click()` 而不是 Playwright 的命中测试：站点线末尾几站会被右上按钮组
   * （`.app-topright`，z 在画布之上）压住，Playwright 会一直等"不被遮挡"直到超时；
   * 而这里要的是"点这一站"这件事本身（点击事件照走组件的 `@click` 处理）。
   */
  const clickStation = (title) =>
    page.evaluate((name) => {
      const stop = [...document.querySelectorAll('.ui-route__stop')].find(
        (el) => el.getAttribute('title') === name,
      )
      if (!stop) throw new Error(`站点线里没有「${name}」站`)
      stop.click()
    }, title)

  // 8a. 外壳给主内容区留了过渡包裹层，且**不许定位**（`ui:request` 的叠层靠"最近的定位祖先"）
  const shellBox = await page.evaluate(() => {
    const body = document.querySelector('.app-main > .app-main__body')
    return { exists: Boolean(body), position: body ? getComputedStyle(body).position : '' }
  })
  check(shellBox.exists, '过渡：主内容区有外壳提供的过渡包裹层（AppShell 的 .app-main__body）')
  check(
    shellBox.position === 'static',
    '过渡：包裹层不定位于（.ui-tips-float / .ui-mask 的定位祖先必须仍是 .app-main）',
    `position=${shellBox.position}`,
  )

  // 8b. 路由级：目录页点项目 → 任务页（换整个视图 ⇒ `ui-page-*`，且不该混进站间那套）
  await quiet(page) // 装探针前先收干净，别把上一屏的离场记进这一轮
  await watchTransitions()
  // 环形卡点**非焦点卡**只把它转到前方正中（不换页），只有点焦点卡才进项目
  // ⇒ 这里必须点 `.is-focus` 那张，才等价于原来"点一张项目卡进项目"。
  await page.locator('.a5r-card.is-focus').click()
  await settle(page) // 等这次换页的过渡整段跑完（类才记全）
  const routeClasses = await readTransitions()
  check(
    routeClasses.some((name) => name.startsWith('ui-page-')),
    '过渡：路由级切换播了页面过渡（ui-page-*）',
    routeClasses.join(' ') || '(一个类都没挂上)',
  )
  check(
    !routeClasses.some((name) => name.startsWith('ui-station-')),
    '过渡：路由级切换不带站间过渡（两套各管一段）',
    routeClasses.join(' '),
  )

  // 8c. 站间（Unity → Unity）：**不许播过渡**（画布会被搬走并淡出再淡入 = 闪断，DEC-145）
  await page.goto(`${base}/#/task/8?project=clip_contactor`, { waitUntil: 'load' })
  await page.waitForTimeout(900)
  const canvasBefore = await page.evaluate(() => {
    const canvas = document.querySelector('#unity-canvas')
    if (canvas) canvas.dataset.wsu3Mark = 'kept'
    return {
      hasCanvas: Boolean(canvas),
      current: document.querySelector('.ui-route__stop--current .ui-route__label')?.textContent?.trim() ?? '',
    }
  })
  check(
    canvasBefore.hasCanvas,
    '过渡：结构站已挂上 Unity 画布（下面"画布不许被搬"才有对象可查）',
    `当前站=${canvasBefore.current}`,
  )

  await quiet(page) // 上一屏（换到结构站）的离场层收干净再开始数
  await watchTransitions()
  await clickStation('检测') // 8 → 9：同为 Unity
  await page.waitForTimeout(600)
  await clickStation('结构') // 9 → 8：回到有构建的那一站
  await page.waitForTimeout(700)
  const unityStation = await page.evaluate(() => ({
    sameCanvas: document.querySelector('#unity-canvas')?.dataset.wsu3Mark === 'kept',
    insideViewport: Boolean(document.querySelector('.app-viewport #unity-canvas')),
  }))
  const unityStationClasses = await readTransitions()
  check(
    unityStationClasses.length === 0,
    '过渡：Unity ↔ Unity 翻站**不播过渡**（画布不许跟着淡出再淡入）',
    unityStationClasses.join(' ') || '(没有过渡类)',
  )
  check(
    unityStation.sameCanvas,
    '过渡：Unity ↔ Unity 翻站后是**同一块画布**（没被重建）',
    `同节点=${unityStation.sameCanvas}`,
  )
  check(
    unityStation.insideViewport,
    '过渡：翻站回来后画布仍在视口里（常驻实例只是被搬挂，没有被丢掉）',
    `在视口内=${unityStation.insideViewport}`,
  )

  // 8d. 站间（Three → Three）：同一节奏的站间过渡**真的播**，且不触发路由级那套
  await clickStation('简介') // 8(Unity) → 7(Three)：跨栈
  await page.waitForTimeout(800)
  await quiet(page) // 跨栈那一次的离场层收干净
  await watchTransitions()
  await clickStation('实验原理') // 7 → 3：同为 Three
  await settle(page) // 等这次换站的过渡整段跑完
  const stationClasses = await readTransitions()
  check(
    stationClasses.some((name) => name.startsWith('ui-station-')),
    '过渡：站间切换播了站间过渡（ui-station-*）',
    stationClasses.join(' ') || '(一个类都没挂上)',
  )
  check(
    !stationClasses.some((name) => name.startsWith('ui-page-')),
    '过渡：站间切换不触发路由级过渡（同一组件实例换站，不该换整屏）',
    stationClasses.join(' '),
  )

  // 8e. 时长 / 缓动**走令牌**，不是零散字面值；「减少动态效果」一开就压到瞬时
  const measured = await measureTransition('ui-station-enter-active')
  check(
    measured.token === '160ms' && measured.duration.startsWith('0.16s'),
    '过渡：站间过渡时长等于令牌 --dur-page（不是写死值）',
    `token=${measured.token} computed=${measured.duration}`,
  )
  check(
    measured.shift !== '' && measured.easing.includes('cubic-bezier'),
    '过渡：位移与缓动也来自令牌',
    `--page-shift=${measured.shift} --ease-page=${measured.easing}`,
  )

  await page.emulateMedia({ reducedMotion: 'reduce' })
  const reduced = await measureTransition('ui-station-enter-active')
  await page.emulateMedia({ reducedMotion: null })
  check(
    Number.parseFloat(reduced.duration) < 0.01,
    '过渡：系统「减少动态效果」打开后过渡被压到瞬时（§20.6 全局兜底）',
    `computed=${reduced.duration}`,
  )

  check(pageErrors.length === 0, '全程无 JS 异常 / console.error', pageErrors.slice(0, 3).join(' | '))
} catch (error) {
  // 中断（定位器超时、断言外的异常）也要变成一条注解：否则 CI 上只剩"exit code 1"
  annotate('error', '冒烟中断', error instanceof Error ? error.message : String(error))
  throw error
} finally {
  await browser.close()
  await server.close()
  // 桩构建在临时目录里，用完就删（`unity/builds/` 从头到尾没被碰过）
  await rm(stubRoot, { recursive: true, force: true })
}

console.log(`\n截图产物：${artifactsDir}`)
if (failures.length > 0) {
  console.error(`\n冒烟失败 ${failures.length} 项：\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
console.log('\n冒烟全部通过。')
