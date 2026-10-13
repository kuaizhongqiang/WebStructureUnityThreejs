#!/usr/bin/env node
/**
 * 内容数据双份一致性门禁。
 *
 * 依据：`docs/DECISIONS.md` DEC-82（Web 与 Unity 各存一份内容数据，由门禁保证一致）。
 *
 * 两处落点（**同名文件、同结构**）：
 *   web/public/content/data/*.json                        ← Web 侧（随 web/dist 发布）
 *   NewStructureUnity/Assets/StreamingAssets/Data/*.json   ← Unity 侧（随 Unity 构建发布，运行时经 UnityWebRequest 读）
 *
 * 比对的是**结构签名**（字段路径 + 值类型），不是逐值内容 —— 两侧的值本来就允许不同语言/不同样例，
 * 但不许出现"一边有字段、另一边没有"或"同名路径类型不同"。
 * 类型规则：`null` 是一种真实类型（数据里 null 表示"该槽位未启用"），因此"一边 null、一边对象"会被判不一致。
 *
 * 用法：node tools/check-content-data.mjs      （退出码 0 通过 / 1 失败）
 * 不依赖 Unity，也不依赖 node_modules。
 */

import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const problems = []
const notes = []

/** 两侧必须同时存在的文件（新增数据文件时在此登记，否则门禁看不见它）。 */
const FILES = [
  'ProjectData.json',
  'QuestionData.json',
  'MenuData.json',
  'StepContentData.json',
  'SystemData.json',
  'UserData.json',
  'LanguageData.json',
]

const WEB_DIR = 'web/public/content/data'
const UNITY_DIR = 'NewStructureUnity/Assets/StreamingAssets/Data'

/** 递归收集 `路径 -> 类型集合`。 */
function collect(value, path, out) {
  if (value === null) {
    add(out, path, 'null')
    return
  }
  if (value === undefined) return
  if (Array.isArray(value)) {
    if (value.length === 0) {
      add(out, `${path}[]`, 'empty-array')
      return
    }
    for (const item of value) collect(item, `${path}[]`, out)
    return
  }
  if (typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      collect(child, path ? `${path}.${key}` : key, out)
    }
    return
  }
  add(out, path, typeof value)
}

function add(map, path, type) {
  const set = map.get(path) ?? new Set()
  set.add(type)
  map.set(path, set)
}

function signature(file) {
  const map = new Map()
  collect(JSON.parse(readFileSync(file, 'utf8')), '', map)
  return map
}

const fmt = (set) => [...set].sort().join('|')

function compare(name, web, unity) {
  const paths = new Set([...web.keys(), ...unity.keys()])
  for (const path of [...paths].sort()) {
    const w = web.get(path)
    const u = unity.get(path)
    if (!w) {
      problems.push(`${name}: 字段 '${path}' 只存在于 Unity 侧（${fmt(u)}），Web 侧缺失`)
    } else if (!u) {
      problems.push(`${name}: 字段 '${path}' 只存在于 Web 侧（${fmt(w)}），Unity 侧缺失`)
    } else if (fmt(w) !== fmt(u)) {
      problems.push(`${name}: 字段 '${path}' 类型不一致 —— Web=${fmt(w)}，Unity=${fmt(u)}`)
    }
  }
}

if (!existsSync(resolve(root, WEB_DIR))) {
  problems.push(`找不到 Web 侧数据目录：${WEB_DIR}`)
}
if (!existsSync(resolve(root, UNITY_DIR))) {
  problems.push(`找不到 Unity 侧数据目录：${UNITY_DIR}`)
}

if (problems.length === 0) {
  for (const name of FILES) {
    const webFile = resolve(root, WEB_DIR, name)
    const unityFile = resolve(root, UNITY_DIR, name)

    if (!existsSync(webFile)) problems.push(`Web 侧缺文件：${WEB_DIR}/${name}`)
    if (!existsSync(unityFile)) problems.push(`Unity 侧缺文件：${UNITY_DIR}/${name}`)
    if (!existsSync(webFile) || !existsSync(unityFile)) continue

    try {
      const web = signature(webFile)
      const unity = signature(unityFile)
      compare(name, web, unity)
      notes.push(`${name}：字段路径 ${web.size} 条`)
    } catch (error) {
      problems.push(`${name}: 解析失败（${error.message}）`)
    }
  }
}

if (problems.length > 0) {
  console.error(`内容数据双份一致性检查失败（${problems.length} 项）：`)
  for (const problem of problems) console.error(`  - ${problem}`)
  console.error(
    '\n提示：两侧数据是**两份手写文件**，改任一侧都必须同批改另一侧；' +
      '口径见 docs/DECISIONS.md DEC-82 与 docs/design/08-content-data-adoption.md。',
  )
  process.exit(1)
}

console.log(`内容数据双份一致性检查通过（${FILES.length} 份，结构与类型一致）：`)
for (const note of notes) console.log(`  - ${note}`)
