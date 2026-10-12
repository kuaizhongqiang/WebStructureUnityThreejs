#!/usr/bin/env node
/**
 * 提交门禁：大文件与忽略规则检查（docs/DECISIONS.md DEC-41 / DEC-57 / DEC-65）。
 *
 * 检查暂存区内（git diff --cached）即将提交的文件：
 *   1. 单文件 > 10MB ⇒ 失败（DEC-65 的阈值；大资产另做处理）；
 *   2. 单文件 > 50MB ⇒ 额外提示这是 GitHub 无法接受的量级，必须联系用户；
 *   3. 被 .gitignore / .gitattributes 规则覆盖却仍被暂存的文件 ⇒ 失败（防止用 -f 强加）；
 *   4. 路径里出现生成目录（Library/Temp/Obj/Logs/UserSettings/node_modules/dist）⇒ 失败。
 *
 * 用法：
 *   node tools/check-large-files.mjs            # 检查暂存区（提交前 hook 用）
 *   node tools/check-large-files.mjs --tracked  # 检查全部已跟踪文件（CI 合并门禁用）
 */

import { execFileSync } from 'node:child_process'
import { statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const TRACKED_MODE = process.argv.includes('--tracked')
const LIMIT = 10 * 1024 * 1024 // 10MB（DEC-65）
const HARD_LIMIT = 50 * 1024 * 1024 // 50MB：GitHub 完全不可接受，必须问用户
const GENERATED_DIRS = [
  'Library/',
  'Temp/',
  'Obj/',
  'obj/',
  'Logs/',
  'UserSettings/',
  'node_modules/',
  'dist/',
  'Builds/',
  'Builds\\',
  '.plastic/',
]

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' })
}

let staged = ''
try {
  staged = TRACKED_MODE
    ? git(['ls-files'])
    : git(['diff', '--cached', '--name-only', '--diff-filter=ACM'])
} catch (error) {
  console.error(`无法读取文件清单（是否在 git 仓库里？）：${error.message}`)
  process.exit(1)
}

const files = staged
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)

const problems = []
const warnings = []
let biggest = { path: null, bytes: 0 }

for (const file of files) {
  if (GENERATED_DIRS.some((dir) => file.includes(dir))) {
    problems.push(`生成目录里的文件被暂存：${file}`)
  }
  try {
    if (git(['check-ignore', file]).trim() === file) {
      problems.push(`被忽略规则覆盖却仍被暂存：${file}（不要用 -f 强加）`)
    }
  } catch {
    // check-ignore 非 0 退出＝未被忽略，正常
  }

  let size = 0
  try {
    size = statSync(resolve(root, file)).size
  } catch {
    continue // 已删除或子模块等，跳过
  }
  if (size > biggest.bytes) biggest = { path: file, bytes: size }

  if (size > LIMIT) {
    problems.push(`超过 10MB 门禁（${(size / 1024 / 1024).toFixed(1)}MB）：${file}`)
  }
  if (size > HARD_LIMIT) {
    warnings.push(`${file} 达到 ${(size / 1024 / 1024).toFixed(1)}MB —— 这是 git 托管平台无法接受的量级，务必先问用户（DEC-57）`)
  }
}

console.log(
  `大文件门禁（${TRACKED_MODE ? '已跟踪文件' : '暂存区'}）：检查了 ${files.length} 个文件，最大 ${
    biggest.path ? `${biggest.path}（${(biggest.bytes / 1024).toFixed(0)}KB）` : '无'
  }`,
)

if (warnings.length > 0) {
  console.warn('⚠️ 严重提示：')
  for (const warning of warnings) console.warn(`  - ${warning}`)
}

if (problems.length > 0) {
  console.error(`大文件门禁失败（${problems.length} 项）：`)
  for (const problem of problems) console.error(`  - ${problem}`)
  console.error('\n若确有需要提交的大资产，先与用户确认（DEC-57），再按结论调整本脚本或忽略规则。')
  process.exit(1)
}

console.log('大文件门禁通过。')
