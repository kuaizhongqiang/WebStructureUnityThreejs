#!/usr/bin/env node
/**
 * 生成一个**形状正确的 Unity WebGL 桩构建**（不是真 Unity 产物）。
 *
 * 用途：Unity 构建要人工做（DEC-59：构建前必须关编辑器），所以在它就位之前，
 * 我们无法验证"流水线 + 服务器 + 加载器 + 桥"这一整条链路。这个桩让链路**今天就能被测**：
 *   · 文件形状与真产物一致（index.html / Build/*.loader.js / *.framework.js / *.wasm / *.data）；
 *   · `createUnityInstance` 的行为与官方 loader 同形（返回实例、上报进度、可 Quit）；
 *   · 启动时会调 `window.__WSU3_BRIDGE__.onReady('1')` —— 正好把 DEC-07 的握手也走一遍。
 *
 * 用法：node tools/pipeline/make-stub-unity.mjs --key main --task-types 4,5,8,9
 *       （生成到 NewStructureUnity/Builds/stub-main，再按 design/05 用 unity-stage 暂存）
 *       node tools/pipeline/make-stub-unity.mjs --key main --task-types 4,5,8,9 --stage   # 直接暂存
 *
 * 默认承载 4,5,8,9（电路连接 / 仿真实验 / 结构 / 检测）—— DEC-81：一个构建承载全部 Unity 类任务。
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))

/** Unity 类任务的 TaskType 序号（与契约一致：4 电路连接 / 5 仿真实验 / 8 结构 / 9 检测）。 */
const DEFAULT_TASK_TYPES = '4,5,8,9'

const args = { key: 'main', taskTypes: DEFAULT_TASK_TYPES, stage: false, out: '' }
const argv = process.argv.slice(2)
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i] === '--key') args.key = argv[++i]
  else if (argv[i] === '--task-types') args.taskTypes = argv[++i]
  else if (argv[i] === '--task-type') {
    // 已废弃（DEC-81）：保留是为不打断肌肉记忆，会转成 --task-types 单值
    console.warn('[stub] ⚠️ --task-type 已废弃，请改用 --task-types 4,5,8,9')
    args.taskTypes = argv[++i]
  } else if (argv[i] === '--out') args.out = argv[++i]
  else if (argv[i] === '--stage') args.stage = true
}

const outDir = resolve(repoRoot, args.out || join('NewStructureUnity', 'Builds', `stub-${args.key}`))
const buildName = `stub-${args.key}`

/**
 * 桩 loader：与官方 `createUnityInstance(canvas, config, onProgress)` 同形。
 * 它做四件事，正好覆盖我们要验的行为：
 *   ① 画一块可见的画布（证明"挂载后画面区不是空白"）；
 *   ② 上报进度（DEC-12：加载必须有进度）；
 *   ③ 调桥的 onReady 完成握手（DEC-07：版本不匹配要报错）；
 *   ④ 提供 SendMessage / Quit（DEC-12：退出必须显式销毁）。
 *
 * ⑤ 真去请求一次 `config.dataUrl`（=`<base><prefix>.data?v=<指纹>`）并把**实际用的 URL**
 *    记在 `window.__WSU3_STUB_DATA_URL__` 上：真 Unity 的 dataCaching 就是按这个 URL 建缓存条目的
 *    （url + 一个字节范围做 key），所以"URL 有没有跟着产物指纹换"这件事**只能在真浏览器里**验
 *    （Issue #60 的验收口径）。桩本身不做缓存，只保证这条请求真的发生过。
 *
 * 另外内置一份**可选的协议仿真**（`__wsu3StubProtocol`）：默认**关**，桩就是一画布加一次握手；
 * 显式打开（`window.__WSU3_STUB_PROTOCOL__ = true` 或 URL 带 `?wsu3_stub=protocol`）后，
 * 它会按契约回消息 —— 于是"Web 侧到底有没有把 `app:init` / `scene:enter` 发对、
 * `assets:ready` / `scene:ready` / `step:changed` / `ui:request` 有没有被处理、
 * `ui:result` 有没有回、`task:completed` 有没有落地"这一整条**能在浏览器里自动验**，
 * 不必等真 WebGL 构建就位（DEC-59 要求构建前关编辑器，那条路很慢）。
 *
 * 结构任务（TaskType 8，DEC-130 / DEC-131）额外会说**新协议**：
 *   · 进站自动发一条 `scene:parts`（部件清单，扁平条目 + `parentKey` 表达层级，树由 Web 侧组装）；
 *   · `object:hover` 不定时自动发 —— 冒烟脚本在稳定时机调 `window.__WSU3_STUB_HOVER__(key, x, y)`
 *     手动触发（key 空串 = 移出），避免与对话框时序赛跑；
 *   · Web 发来的 `view:focus`（部件树点选）记录在 `window.__WSU3_STUB_STATE__.focused`。
 *
 * 仿真用的 refId 取**真实内容数据里的 id**（`contactor_ui_measure` /
 * `contactor_q_mainContact` / `contactor_measure_step1_tips`），所以它顺带验了
 * "内容数据 → 面板文案"这一段；可用 `window.__WSU3_STUB_UI_REF__` 等覆盖。
 */
const loader = `// 桩 loader（由 tools/pipeline/make-stub-unity.mjs 生成，不是真 Unity 产物）
function __wsu3StubEmulationEnabled() {
  if (window.__WSU3_STUB_PROTOCOL__ === true) return true
  return /(^|[?&])wsu3_stub=protocol(&|$)/.test(String(window.location.search || ''))
}

function __wsu3StubProtocol(config) {
  var enabled = __wsu3StubEmulationEnabled()
  var seq = 0
  var taskType = 0
  var questionAttempts = 0
  var state = {
    readyAt: null, appInit: null, entered: null, inputEnabled: null,
    replies: [], exited: null, completed: null, focused: null,
  }
  window.__WSU3_STUB_STATE__ = state

  var STEPS = 3
  var uiRef = window.__WSU3_STUB_UI_REF__ || 'contactor_ui_measure'
  var questionRef = window.__WSU3_STUB_QUESTION_REF__ || 'contactor_q_mainContact'
  var tipsRef = window.__WSU3_STUB_TIPS_REF__ || 'contactor_measure_step1_tips'

  // 结构任务的部件清单（名字随意，关键是"扁平条目 + parentKey"这一形状与契约一致）：
  // 根在前、子随 parentKey 挂下，Web 侧 buildPartTree 组装成树（缺父/成环在那里面挡住）。
  var PARTS = [
    { key: 'contactor/Root', name: '交流接触器', nameEn: 'AC Contactor' },
    { key: 'contactor/Coil', name: '线圈', nameEn: 'Coil', parentKey: 'contactor/Root' },
    { key: 'contactor/MainContact', name: '主触点', nameEn: 'Main Contact', parentKey: 'contactor/Root' },
    { key: 'contactor/AuxContact', name: '辅助触点', nameEn: 'Aux Contact', parentKey: 'contactor/Root' },
  ]

  function post(type, payload) {
    var bridge = window.__WSU3_BRIDGE__
    if (!bridge || typeof bridge.post !== 'function') return
    seq += 1
    bridge.post(JSON.stringify({
      type: type, version: Number(config.protocolVersion || 1), seq: seq, payload: payload,
    }))
  }
  function later(ms, fn) { setTimeout(fn, ms) }

  // 进任务：两条就绪（DEC-84 的顺序）→ 步骤 → 提示条 → 信息面板
  function enter() {
    later(40, function () { post('assets:ready', { taskType: taskType }) })
    later(80, function () { post('unity:progress', { progress: 0.5 }) })
    later(120, function () { post('scene:ready', { taskType: taskType }) })
    later(180, function () { post('step:changed', { stepIndex: 0, stepTotal: STEPS, stepName: 'Step_1' }) })
    later(200, function () { post('ui:request', { kind: 'tips', refId: tipsRef }) })
    later(260, function () { post('ui:request', { kind: 'ui', refId: uiRef }) })
    if (taskType === 8) {
      // 结构任务：部件清单进站上报一次（层级由 parentKey 表达；悬停见 __WSU3_STUB_HOVER__）
      later(140, function () { post('scene:parts', { parts: PARTS }) })
    }
  }

  function handle(payload) {
    if (!enabled) return
    var message
    try { message = JSON.parse(payload) } catch (error) { return }
    if (!message || !message.type) return
    var body = message.payload || {}

    if (message.type === 'app:init') { state.appInit = body; return }
    if (message.type === 'input:enable') { state.inputEnabled = body.enabled; return }
    if (message.type === 'view:focus') { state.focused = body; return }
    if (message.type === 'debug:ping') { post('debug:pong', { at: body.at }); return }
    if (message.type === 'scene:exit') { state.exited = true; post('scene:exited', { taskType: taskType }); return }

    if (message.type === 'scene:enter') {
      taskType = body.taskType
      state.entered = body
      questionAttempts = 0
      enter()
      return
    }

    if (message.type === 'ui:result') {
      state.replies.push(body)
      if (body.kind === 'question') {
        if (body.result === 'success') {
          later(40, function () { post('step:changed', { stepIndex: 2, stepTotal: STEPS, stepName: 'Step_3' }) })
          later(90, function () {
            state.completed = { taskType: taskType, elapsedMs: 4321 }
            post('task:completed', { taskType: taskType, elapsedMs: 4321 })
          })
          return
        }
        // 答错：按 ConditionQuestion 的口径"再问一次"（上限 3 次）
        questionAttempts += 1
        if (questionAttempts < 3) {
          later(60, function () { post('ui:request', { kind: 'question', refId: questionRef }) })
        }
        return
      }
      if (body.kind === 'ui') {
        later(40, function () { post('step:changed', { stepIndex: 1, stepTotal: STEPS, stepName: 'Step_2' }) })
        later(80, function () { post('ui:request', { kind: 'question', refId: questionRef }) })
      }
    }
  }

  // 冒烟驱动口：在稳定时机手动发一条 object:hover（key 空串 = 移出）。
  // 不自动定时发 —— 那会跟对话框时序赛跑，浮标"出现/消失"没法断言。
  window.__WSU3_STUB_HOVER__ = function (key, x, y) {
    post('object:hover', {
      key: key || '',
      x: typeof x === 'number' ? x : 0.5,
      y: typeof y === 'number' ? y : 0.5,
    })
  }

  return { handle: handle }
}

var createUnityInstance = function (canvas, config, onProgress) {
  return new Promise(function (resolve, reject) {
    var ctx = canvas.getContext('2d')
    var steps = 0
    var timer = setInterval(function () {
      steps += 1
      if (onProgress) onProgress(steps / 4)
      if (steps >= 4) {
        clearInterval(timer)
        if (ctx) {
          ctx.fillStyle = '#0e141d'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.fillStyle = '#7ef0d0'
          ctx.font = '16px sans-serif'
          ctx.fillText('STUB UNITY WEBGL', 20, 40)
          ctx.fillStyle = '#93a4b8'
          ctx.font = '12px sans-serif'
          ctx.fillText('build: ' + config.dataUrl, 20, 68)
        }
        var emulator = __wsu3StubProtocol(config)
        // ⑤ 真拉一次 .data（官方 loader 的 startup 也会这么做），并把实际 URL 记下来：
        //    指纹有没有拼进 v 查询串、换了包 URL 有没有变，都靠它来断言（Issue #60）。
        //    注意：本行以上都处在**生成出来的 JS 文本**里 —— 注释里不许出现反引号，
        //    那会提前闭合本文件的外层模板字符串（本文件今天就是这么坏过一次）。
        try {
          if (config.dataUrl) {
            window.__WSU3_STUB_DATA_URL__ = config.dataUrl
            fetch(config.dataUrl).catch(function () {})
          }
        } catch (error) {
          console.error('[stub unity] .data 请求失败：', error)
        }
        var instance = {
          SendMessage: function (object, method, payload) {
            window.__WSU3_STUB_CALLS__ = (window.__WSU3_STUB_CALLS__ || [])
            window.__WSU3_STUB_CALLS__.push({ object: object, method: method, payload: payload })
            emulator.handle(payload)
          },
          Quit: function () {
            window.__WSU3_STUB_QUIT__ = true
            return Promise.resolve()
          },
        }
        // ③ 走一遍握手：真 Unity 是"场景起来之后"才调 onReady，宿主此时才 attach 完桥，
        //    所以这里也延后一拍调（否则桥还没挂上，等于跳过了握手这一环）。
        setTimeout(function () {
          try {
            if (window.__WSU3_BRIDGE__ && window.__WSU3_BRIDGE__.onReady) {
              if (window.__WSU3_STUB_STATE__) window.__WSU3_STUB_STATE__.readyAt = Date.now()
              window.__WSU3_BRIDGE__.onReady(String(config.protocolVersion || 1))
            }
          } catch (error) {
            console.error('[stub unity] 握手失败：', error)
          }
        }, 200)
        resolve(instance)
      }
    }, 60)
  })
}
window.createUnityInstance = createUnityInstance
`

const framework = `// 桩 framework（占位；真产物是被压缩的 WebAssembly 运行时胶水）
window.__WSU3_STUB_FRAMEWORK__ = true
`

const indexHtml = `<!DOCTYPE html>
<html lang="zh-CN">
  <head><meta charset="utf-8" /><title>${buildName}</title></head>
  <body>
    <p>桩构建：真 Unity 产物由 Unity 编辑器构建后替换本目录（见 docs/design/05）。</p>
  </body>
</html>
`

async function main() {
  const buildDir = join(outDir, 'Build')
  await mkdir(buildDir, { recursive: true })

  await writeFile(join(outDir, 'index.html'), indexHtml, 'utf8')
  await writeFile(join(buildDir, `${buildName}.loader.js`), loader, 'utf8')
  await writeFile(join(buildDir, `${buildName}.framework.js`), framework, 'utf8')
  // 最小合法 wasm 模块（8 字节魔数+版本）：让"MIME 必须是 application/wasm"这条也能被验到
  await writeFile(join(buildDir, `${buildName}.wasm`), Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]))
  await writeFile(
    join(buildDir, `${buildName}.data`),
    Buffer.from(`stub data for ${args.key}\n`, 'utf8'),
  )

  console.log(`已生成桩构建：${outDir}`)
  console.log(`  loader：Build/${buildName}.loader.js`)

  if (args.stage) {
    const { spawnSync } = await import('node:child_process')
    const result = spawnSync(
      process.execPath,
      [
        join(repoRoot, 'tools', 'pipeline', 'unity-stage.mjs'),
        '--from',
        outDir,
        '--key',
        args.key,
        '--task-types',
        args.taskTypes,
      ],
      { stdio: 'inherit' },
    )
    if (result.status !== 0) process.exitCode = result.status ?? 1
  } else {
    console.log(
      `下一步：node tools/pipeline/unity-stage.mjs --from ${outDir} --key ${args.key} --task-types ${args.taskTypes}`,
    )
  }
}

await main()
