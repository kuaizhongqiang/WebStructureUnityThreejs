#!/usr/bin/env node
/**
 * 门禁：业务代码零 `import electron`（docs/DECISIONS.md **DEC-20**）。
 *
 * 为什么用脚本而不是 lint 规则：DEC-52 的 ESLint 还在"待执行"，
 * 而这条是**架构边界**，不能等 lint 排期 —— 先机械守住，将来 ESLint 落地后可加一条同义规则。
 *
 * 判定：`web/src/**` 里出现下列任一形式即失败（这是业务代码，不许知道壳的存在）：
 *   from 'electron' / require('electron') / import('electron')
 *   window.electron / window.require / window.wsu3Shell 的**写入**（读只读快照是允许的）
 * 允许：`web/src/**` 里**只读**访问 `window.wsu3Shell`（preload 暴露的只读快照，DEC-24 的预留接口）。
 *
 * 用法：node tools/check-shell-coupling.mjs
 */
import { readdir, readFile } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const WEB_SRC = join(repoRoot, 'web', 'src')

/** 违规模式：(正则, 说明) */
const FORBIDDEN = [
  [/from\s+['"]electron['"]/, "import ... from 'electron'"],
  [/require\(\s*['"]electron['"]\s*\)/, "require('electron')"],
  [/import\(\s*['"]electron['"]\s*\)/, "import('electron')"],
  [/window\.electron\b/, 'window.electron'],
  [/window\.require\b/, 'window.require'],
  [/window\.wsu3Shell\s*=[^=]/, '写入 window.wsu3Shell（只读快照不允许被改写）'],
]

const SKIP_DIRS = new Set(['node_modules', 'dist', '.vite'])
const EXTS = new Set(['.ts', '.tsx', '.js', '.mjs', '.vue', '.css'])

async function walk(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      out.push(...(await walk(join(dir, entry.name))))
    } else if (EXTS.has(entry.name.slice(entry.name.lastIndexOf('.')))) {
      out.push(join(dir, entry.name))
    }
  }
  return out
}

const files = await walk(WEB_SRC).catch(() => [])
if (files.length === 0) {
  console.log('[gate] 未找到 web/src（跳过）；若 web/ 已建，请确认路径。')
  process.exit(0)
}

const violations = []
for (const file of files) {
  const text = await readFile(file, 'utf8')
  text.split('\n').forEach((line, i) => {
    for (const [pattern, label] of FORBIDDEN) {
      if (pattern.test(line)) {
        violations.push(`${relative(repoRoot, file).split(sep).join('/')}:${i + 1}  ${label}\n    ${line.trim()}`)
      }
    }
  })
}

if (violations.length) {
  console.error('业务代码耦合了 Electron —— 违反 DEC-20（业务代码零 import electron）：\n')
  for (const item of violations) console.error('  ' + item)
  console.error('\n修法：壳能力只应通过 `window.wsu3Shell`（只读快照，实现在 electron/preload.js）暴露；')
  console.error('      需要新能力时，加在 preload.js + 主进程 ipcMain，业务侧仍只认 window.wsu3Shell。')
  process.exit(1)
}

console.log(`[gate] 壳耦合检查通过：web/src 下 ${files.length} 个文件均未耦合 Electron（DEC-20）。`)
