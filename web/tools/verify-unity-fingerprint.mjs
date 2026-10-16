/**
 * Issue #60 的**机器可读验收探针**：页面实际请求的 `.data` URL 是否跟着产物指纹换。
 *
 * 背景（为什么必须有它）：`webGLDataCaching = 1` 时 Unity 按 `.data` 的 **URL** 建 IndexedDB 缓存条目，
 * URL 不变 ⇒ 重建 + 重暂存之后浏览器仍然跑上一版场景，只能靠"清站点数据"救。
 * 修复（`unity-stage.mjs` 写 `treeSha256` + dev 合成清单透传）有没有真的生效，
 * **只能**用"真浏览器真的发了哪条请求"来回答 —— 看清单字段、看 curl 都只是中间态。
 *
 * 做法（自备隔离环境，**绝不碰** `unity/builds/`）：
 *   ① `make-stub-unity.mjs` 造一份桩构建 → `unity-stage.mjs --stage-root <临时目录>` 暂存；
 *   ② `WSU3_UNITY_DEV_ROOT` 指向临时目录起真 dev 服务器；
 *   ③ Playwright 进 Unity 类任务（`#/task/8`），读桩 loader 记下的 `.data` 实际 URL；
 *   ④ 在**同一份临时暂存目录**上再暂存一版**内容不同**的桩（等价于"重建"），刷新页面，
 *      确认 `.data` 的 URL 带了新的 `?v=` —— 这正是"不清站点数据也能换包"的判据。
 *
 * 用法：node web/tools/verify-unity-fingerprint.mjs（在 web/ 下 `npm i` 过即可）
 * 退出码：0 = 两条判据都成立；1 = 有判据不成立（打印读数，不掩盖）。
 */
import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const here = dirname(fileURLToPath(import.meta.url))
const webRoot = resolve(here, '..')
const repoRoot = resolve(webRoot, '..')

const failures = []
function check(ok, label, detail = '') {
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(label)
}

const key = 'main'
const taskTypes = '4,5,8'
const tmpRoot = await mkdtemp(join(tmpdir(), 'wsu3-fp-'))
const stubSrc = join(tmpRoot, 'src')
const stubBuilds = join(tmpRoot, 'builds')

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

/**
 * 造一版桩构建并暂存，返回这一版清单里的 `treeSha256`（= 页面应当拼进 URL 的来源）。
 *
 * `variant` 会写进桩源码的一个注释里：真"重建"产出的包内容就是不同的，
 * 所以第二版必须与第一版**真的不一样** —— 否则测的还是同一份产物。
 * （本探针第一版就踩过这个坑：先改再生成，改动被生成器覆盖，两版指纹相同，判据 ③ 白测。）
 */
async function stageStub(variant) {
  runNode('tools/pipeline/make-stub-unity.mjs', ['--key', key, '--task-types', taskTypes, '--out', stubSrc])
  const loader = join(stubSrc, 'Build', `stub-${key}.loader.js`)
  const content = await readFile(loader, 'utf8')
  await writeFile(loader, `${content}\n// fingerprint probe variant: ${variant}\n`)
  runNode('tools/pipeline/unity-stage.mjs', [
    '--from',
    stubSrc,
    '--key',
    key,
    '--task-types',
    taskTypes,
    '--stage-root',
    stubBuilds,
  ])
  const manifest = JSON.parse(await readFile(join(stubBuilds, 'manifest.json'), 'utf8'))
  const build = (manifest.builds ?? []).find((item) => item.key === key)
  if (!build?.treeSha256) throw new Error(`暂存清单里没有 treeSha256（${key}）：${JSON.stringify(build)}`)
  return build.treeSha256
}

/**
 * 打开任务页，读出：① dev 合成清单里报的指纹；② 桩 loader 真去请求的 `.data` URL。
 * 用页面自己记下的 URL（`__WSU3_STUB_DATA_URL__`）而不是监听网络：确定性更好，不受时序影响。
 */
async function observe(page, base) {
  await page.goto(base, { waitUntil: 'domcontentloaded' })
  const manifest = await page.evaluate(async () => {
    const response = await fetch('/release-manifest.json', { cache: 'no-store' })
    return response.json()
  })
  const build = (manifest.unity?.builds ?? [])[0] ?? {}

  await page.goto(`${base}/#/task/8`, { waitUntil: 'domcontentloaded' })
  await page
    .waitForFunction(() => Boolean(window.__WSU3_STUB_DATA_URL__), { timeout: 25_000 })
    .catch(() => {})
  const dataUrl = await page.evaluate(() => window.__WSU3_STUB_DATA_URL__ ?? null)

  return { manifestTreeSha256: build.treeSha256, dataUrl }
}

let server
let browser
try {
  const first = await stageStub('v1')
  process.env.WSU3_UNITY_DEV_ROOT = stubBuilds

  server = await createServer({ root: webRoot, logLevel: 'error', server: { host: '127.0.0.1', port: 0 } })
  await server.listen()
  const base = `http://127.0.0.1:${server.httpServer.address().port}`
  console.log(`dev server: ${base}`)

  browser = await chromium.launch({
    args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
  })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await page.addInitScript(() => {
    window.__WSU3_STUB_PROTOCOL__ = true
  })

  // —— 判据 ①：dev 合成清单里报的指纹 = 暂存脚本算出来的指纹（前半段 = Issue #60 验收 ①）
  const firstSeen = await observe(page, base)
  check(
    firstSeen.manifestTreeSha256 === first,
    'dev 合成清单里的 treeSha256 与暂存清单一致',
    `manifest=${firstSeen.manifestTreeSha256?.slice(0, 12) ?? '（缺失）'} stage=${first.slice(0, 12)}`,
  )

  // —— 判据 ②：页面实际请求的 `.data` URL 带 ?v=<指纹前 12 位>（Issue #60 验收 ②）
  const firstExpected = `?v=${first.slice(0, 12)}`
  check(
    Boolean(firstSeen.dataUrl) && firstSeen.dataUrl.includes(firstExpected),
    '.data 请求带 ?v=<treeSha256 前 12 位>',
    firstSeen.dataUrl ?? '（桩 loader 没记下 .data URL：页面可能没挂载成功）',
  )

  // —— 判据 ③：重暂存一份内容不同的包后刷新，URL 自己换掉（Issue #60 验收 ③，全程不清站点数据）
  const second = await stageStub('v2-重建后的新包')
  check(second !== first, '内容改了 ⇒ 指纹变了', `${first.slice(0, 12)} → ${second.slice(0, 12)}`)

  const secondSeen = await observe(page, base)
  check(
    Boolean(secondSeen.dataUrl) && secondSeen.dataUrl.includes(`?v=${second.slice(0, 12)}`),
    '重暂存后刷新的 .data URL 换成了新指纹',
    secondSeen.dataUrl ?? '（桩 loader 没记下 .data URL）',
  )
  check(
    secondSeen.dataUrl !== firstSeen.dataUrl,
    '两版产物的 .data URL 不同（"不清站点数据也拿到新包"的判据）',
    `${firstSeen.dataUrl} → ${secondSeen.dataUrl}`,
  )
} finally {
  await browser?.close().catch(() => {})
  await server?.close().catch(() => {})
  // 临时暂存目录不留痕（真产物 unity/builds/ 全程没被碰过）
  if (process.env.WSU3_KEEP_FP_TMP === '1') console.log(`（保留了临时目录以便排查：${tmpRoot}）`)
  else await rm(tmpRoot, { recursive: true, force: true })
}

if (failures.length > 0) {
  console.error(`\n✗ 指纹探针失败 ${failures.length} 条：${failures.join(' / ')}`)
  process.exitCode = 1
} else {
  console.log('\n✓ 指纹探针通过：页面请求的 .data URL 跟着产物指纹换，不需要清站点数据。')
}
