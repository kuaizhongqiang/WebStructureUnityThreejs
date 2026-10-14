#!/usr/bin/env node
/**
 * 把 `import-input-controller.mjs` 搬进来的**原文**改成**本工程口径**（机械改写，可重跑、幂等）。
 *
 * 只做三件机械的事（真正的适配是手写的，见 `docs/design/11-input-and-camera.md`）：
 *   ① **命名空间**：来源的 `MCV_Module.InputController.*` → 本工程的 `WSU3.Core.Input`；
 *   ② **去掉来源的 using**：`MCV_Module.Utils` / `MCV_Module.InputController.Common.InputSystem`
 *      —— 它们指向来源工程的管理器/工具骨架，按既有边界不搬；
 *   ③ **日志**：`Log.Info / Warning / Error` → `Debug.Log / LogWarning / LogError`
 *      （本工程没有来源那套日志门面，直接用 Unity 的 Debug）。
 *
 * **不在本脚本里**（改了算法或依赖语义，必须人手写、并写进文档）：
 *   · 控制器登记：来源的全局输入管理器 → 基类自带的静态注册表；
 *   · 相机取用：来源的相机管理器 → 本工程 `GlobalManager.MainCamera`；
 *   · 逐帧闸门：接本工程 `InputGate`（模态 / 不可见时不操控）；
 *   · 相机背景板的取图入口：本工程资源包链路未落地 ⇒ 留待办。
 *
 * 用法：
 *   node tools/pipeline/port-input-controller.mjs --check    # 只报告哪些文件还没改（不写盘）
 *   node tools/pipeline/port-input-controller.mjs            # 改写
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const TARGET = join(repoRoot, 'NewStructureUnity/Assets/Scripts/Core/Controllers')

/**
 * 机械改写规则（顺序无关，每条都对整份文本生效）。
 *
 * ⚠️ 命名空间**不能**叫 `WSU3.Core.Input`：那样 `WSU3.Core.*` 里所有裸 `Input.GetMouseButton*` 都会被解析成
 * 这个命名空间（命名空间优先于 using 导入的类型）—— 本工程旧版 Input 的拾取代码会被整片打红。
 * 所以用 `WSU3.Core.Controllers`（与类名 `*Controller` 对齐，且不与任何 UnityEngine 类型同名）。
 */
const RULES = [
  [/namespace MCV_Module\.InputController\.[A-Za-z]+/g, 'namespace WSU3.Core.Controllers'],
  [/namespace MCV_Module\.InputController\b/g, 'namespace WSU3.Core.Controllers'],
  // 一次性迁移：首版曾用 `WSU3.Core.Input`，撞名后改掉（规则留着，重跑幂等）
  [/namespace WSU3\.Core\.Input\b/g, 'namespace WSU3.Core.Controllers'],
  [/^using MCV_Module\.Utils;\r?\n/gm, ''],
  [/^using MCV_Module\.InputController\.Common\.InputSystem;\r?\n/gm, ''],
  [/\bLog\.Info\(/g, 'Debug.Log('],
  [/\bLog\.Warning\(/g, 'Debug.LogWarning('],
  [/\bLog\.Error\(/g, 'Debug.LogError('],
]

const checkOnly = process.argv.includes('--check')

async function main() {
  if (!existsSync(TARGET)) {
    console.error(`[port] 找不到目标目录：${relative(repoRoot, TARGET)}（先跑 import-input-controller.mjs）`)
    process.exitCode = 1
    return
  }

  let scanned = 0
  let changed = 0
  let pending = 0
  for (const entry of await readdir(TARGET, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.cs')) continue
    scanned++
    const file = join(TARGET, entry.name)
    const before = await readFile(file, 'utf8')
    let after = before
    for (const [pattern, replacement] of RULES) after = after.replace(pattern, replacement)
    if (after === before) continue
    changed++
    const rel = relative(repoRoot, file).split('\\').join('/')
    if (checkOnly) {
      pending++
      console.log(`  待改写：${rel}`)
      continue
    }
    await writeFile(file, after, 'utf8')
    console.log(`  已改写：${rel}`)
  }

  console.log(
    `[port] ${checkOnly ? '（--check，未写盘）' : ''}扫描 ${scanned} 个 .cs，${
      checkOnly ? `待改写 ${pending}` : `改写 ${changed}`
    } 个`,
  )
}

await main()
