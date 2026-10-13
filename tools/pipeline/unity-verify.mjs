#!/usr/bin/env node
/**
 * 校验 Unity 暂存区（`unity/builds/`）是否与清单一致 —— 打包前与 CI 里的**门禁**。
 *
 * 为什么需要：Unity 产物是**人手动搬进来的大文件**，最容易出的问题是
 * "少了一个 wasm"或"Brotli 被截断"，而这类问题在浏览器里的表现是**白屏 + 控制台一句模糊报错**。
 * 所以在这里**逐文件重算 sha256**，把问题挡在打包前。
 *
 * 用法：
 *   node tools/pipeline/unity-verify.mjs           # 人类可读输出
 *   node tools/pipeline/unity-verify.mjs --json    # 机器可读（CI 用）
 *
 * 退出码：0 = 一致（或**本机没有暂存任何 Unity 产物**，那是允许的状态）；1 = 有缺失/不一致。
 * 注意：**"没有 Unity 产物"不等于失败**（DEC-44 之后才有正式构建），
 *      但必须**明确报告**，不能静默当成"通过且包含" —— 这正是本次要修的"壳里没有 Unity"问题。
 */
import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const STAGE_ROOT = join(repoRoot, 'unity', 'builds')
const MANIFEST = join(STAGE_ROOT, 'manifest.json')

const JSON_OUT = process.argv.includes('--json')

async function sha256(file) {
  const hash = createHash('sha256')
  hash.update(await readFile(file))
  return hash.digest('hex')
}

async function main() {
  if (!existsSync(MANIFEST)) {
    const result = {
      ok: true,
      included: false,
      reason: '本机没有 Unity 暂存产物（unity/builds/manifest.json 不存在）',
      builds: [],
      problems: [],
    }
    report(result)
    return
  }

  const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'))
  const problems = []
  const builds = []

  for (const build of manifest.builds || []) {
    const dir = join(STAGE_ROOT, build.key)
    let bytes = 0
    let checked = 0
    for (const file of build.files || []) {
      const full = join(dir, file.path)
      if (!existsSync(full)) {
        problems.push(`${build.key}: 缺少文件 ${file.path}`)
        continue
      }
      const size = (await stat(full)).size
      if (size !== file.bytes) {
        problems.push(`${build.key}: ${file.path} 大小不符（清单 ${file.bytes}，实际 ${size}）`)
        continue
      }
      if ((await sha256(full)) !== file.sha256) {
        problems.push(`${build.key}: ${file.path} 内容哈希不符（文件被改动或传输损坏）`)
        continue
      }
      bytes += size
      checked += 1
    }
    // 关键文件必须在（清单自己可能被手改过）
    const names = (build.files || []).map((f) => basename(f.path))
    for (const rule of [/\.loader\.js$/, /\.wasm(\.br|\.gz)?$/, /\.data(\.br|\.gz)?$/]) {
      if (!names.some((name) => rule.test(name))) problems.push(`${build.key}: 缺少关键文件（${rule}）`)
    }
    // 兼容两代清单：新清单写 taskTypes[]，旧清单写单值 taskType（DEC-81 之后不再生成旧形状）
    const taskTypes = Array.isArray(build.taskTypes) ? build.taskTypes : build.taskType != null ? [build.taskType] : []
    if (taskTypes.length === 0) {
      problems.push(`${build.key}: 清单没有声明 taskTypes[] —— 该构建永远不会被选中（DEC-81）`)
    }
    builds.push({ key: build.key, taskTypes, files: checked, bytes })
  }

  const result = {
    ok: problems.length === 0,
    included: (manifest.builds || []).length > 0,
    reason: (manifest.builds || []).length > 0 ? `已包含 ${manifest.builds.length} 个 Unity 构建` : '清单为空',
    builds,
    problems,
  }
  report(result)
  if (!result.ok) process.exitCode = 1
}

function report(result) {
  if (JSON_OUT) {
    console.log(JSON.stringify(result, null, 2))
    return
  }
  if (!result.included) {
    console.log(`[unity] ${result.reason}`)
    console.log('[unity] 这不影响 Web 侧打包，但**发布包不会带 Unity**。')
    console.log('[unity] 接入方式见 docs/design/05；临时验证流水线可用 make-stub-unity.mjs。')
    return
  }
  for (const build of result.builds) {
    const mb = (build.bytes / 1024 / 1024).toFixed(1)
    console.log(`[unity] ✓ ${build.key}（承载 taskTypes=${build.taskTypes.join(',')}）${build.files} 个文件 / ${mb} MB`)
  }
  for (const problem of result.problems) console.error(`[unity] ✗ ${problem}`)
  console.log(result.ok ? '[unity] 校验通过：暂存区与清单一致。' : '[unity] 校验失败。')
}

await main()
