#!/usr/bin/env node
/**
 * 双端契约一致性门禁（docs/DECISIONS.md DEC-10 的缓解 + DEC-67 / DEC-68）。
 *
 * 比对三方：
 *   content/contracts/snapshot.json   ← 校验基准（不是真源）
 *   web/src/contracts/*.ts            ← TS 侧（手写）
 *   Assets/Scripts/Contracts/EnumAll.cs ← C# 侧（手写，固定路径 DEC-68）
 *
 * 三方必须逐值一致：名字、序号、中文标签。
 * 用法：node tools/check-contracts.mjs      （退出码 0 通过 / 1 失败）
 * 不依赖 Unity，也不依赖 node_modules。
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const problems = []

function fail(message) {
  problems.push(message)
}

function read(relative) {
  try {
    return readFileSync(resolve(root, relative), 'utf8')
  } catch (error) {
    fail(`读不到文件：${relative}（${error.message}）`)
    return ''
  }
}

/** 从 `export enum X { A = 0, ... }` 里抽 { name, ordinal }。 */
function parseTsEnum(source, enumName) {
  const body = new RegExp(`export\\s+enum\\s+${enumName}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(source)
  if (!body) {
    fail(`TS 侧找不到 export enum ${enumName}`)
    return []
  }
  const values = []
  const pattern = /(\w+)\s*=\s*(\d+)/g
  let match
  while ((match = pattern.exec(body[1])) !== null) {
    values.push({ name: match[1], ordinal: Number(match[2]) })
  }
  values.sort((a, b) => a.ordinal - b.ordinal)
  return values
}

/** 从 `[X.Name]: '中文'` 里抽标签表。 */
function parseTsLabels(source, enumName) {
  const labels = new Map()
  const pattern = new RegExp(`\\[${enumName}\\.(\\w+)\\]:\\s*'([^']*)'`, 'g')
  let match
  while ((match = pattern.exec(source)) !== null) {
    labels.set(match[1], match[2])
  }
  return labels
}

/** 从 C# 的 `[InspectorName("中文")] Name = 0,` 里抽 { name, ordinal, label }。 */
function parseCSharpEnum(source, enumName) {
  const body = new RegExp(`public\\s+enum\\s+${enumName}\\s*\\{([\\s\\S]*?)\\n\\s*\\}`).exec(source)
  if (!body) {
    fail(`C# 侧找不到 public enum ${enumName}`)
    return []
  }
  const values = []
  const pattern = /\[InspectorName\("([^"]*)"\)\]\s*(\w+)\s*=\s*(\d+)/g
  let match
  while ((match = pattern.exec(body[1])) !== null) {
    values.push({ name: match[2], ordinal: Number(match[3]), label: match[1] })
  }
  values.sort((a, b) => a.ordinal - b.ordinal)
  return values
}

// ---------- 读取三方 ----------
const snapshot = JSON.parse(read('content/contracts/snapshot.json'))
const tsSceneState = read('web/src/contracts/scene-state.ts')
const tsTaskType = read('web/src/contracts/task-type.ts')
const csharp = read('NewStructureUnity/Assets/Scripts/Contracts/EnumAll.cs')

const TS_SOURCES = { SceneState: tsSceneState, TaskType: tsTaskType }

for (const { name, values: expected } of snapshot.enums) {
  const tsSource = TS_SOURCES[name]
  if (!tsSource) {
    fail(`快照里的 ${name} 没有对应的 TS 源（请在 check-contracts.mjs 的 TS_SOURCES 里登记）`)
    continue
  }

  const tsValues = parseTsEnum(tsSource, name)
  const tsLabels = parseTsLabels(tsSource, name)
  const csValues = parseCSharpEnum(csharp, name)

  if (tsValues.length !== expected.length) {
    fail(`${name}: TS 侧有 ${tsValues.length} 个值，快照有 ${expected.length} 个`)
  }
  if (csValues.length !== expected.length) {
    fail(`${name}: C# 侧有 ${csValues.length} 个值，快照有 ${expected.length} 个`)
  }

  for (const item of expected) {
    const ts = tsValues.find((v) => v.ordinal === item.ordinal)
    const cs = csValues.find((v) => v.ordinal === item.ordinal)

    if (!ts || ts.name !== item.name) {
      fail(`${name}[${item.ordinal}]: TS 侧是 ${ts ? ts.name : '(缺失)'}，快照要求 ${item.name}`)
    }
    if (tsLabels.get(item.name) !== item.label) {
      fail(`${name}.${item.name}: TS 标签是 '${tsLabels.get(item.name) ?? '(缺失)'}'，快照要求 '${item.label}'`)
    }
    if (!cs || cs.name !== item.name) {
      fail(`${name}[${item.ordinal}]: C# 侧是 ${cs ? cs.name : '(缺失)'}，快照要求 ${item.name}`)
    }
    if (cs && cs.label !== item.label) {
      fail(`${name}.${item.name}: C# [InspectorName] 是 '${cs.label}'，快照要求 '${item.label}'`)
    }
  }

  // 追加只能往后：两侧的最大序号不得小于快照的个数-1（防止有人插值）
  const maxOrdinal = (list) => (list.length ? Math.max(...list.map((v) => v.ordinal)) : -1)
  if (maxOrdinal(tsValues) !== expected.length - 1) {
    fail(`${name}: TS 侧存在插值或跳号（最大序号 ${maxOrdinal(tsValues)}，期望 ${expected.length - 1}）`)
  }
  if (maxOrdinal(csValues) !== expected.length - 1) {
    fail(`${name}: C# 侧存在插值或跳号（最大序号 ${maxOrdinal(csValues)}，期望 ${expected.length - 1}）`)
  }
}

if (problems.length > 0) {
  console.error(`契约一致性检查失败（${problems.length} 项）：`)
  for (const problem of problems) console.error(`  - ${problem}`)
  console.error('\n提示：改任一侧都必须同批改 content/contracts/snapshot.json（DEC-67）。')
  process.exit(1)
}

console.log('契约一致性检查通过：TS ↔ 快照 ↔ C# 三方逐值一致。')
