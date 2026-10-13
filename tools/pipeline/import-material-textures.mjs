#!/usr/bin/env node
/**
 * 搬运**渲染期要用的全部材质贴图**（base / alpha、normal、mask 三张）。
 *
 * 口径（负责人 2026-10-13 定）：**GLB 只出 mesh + mat，贴图全部后加载**。
 * 所以这里不再是"补搬 GLB 带不动的那几张"，而是按**材质引用**把三张图都搬齐：
 * 改一张贴图只需换文件，不必重导 8 个模型 —— 这正是反复调贴图时最省事的那条路。
 *
 * 落点：`content/assets/three/<device>/`（共享图落 `_shared/`；Three 侧大资产，DEC-57 不进 git）。
 * 渲染期按 `content/material-textures.json` 查找表取图（`<器件>/<文件名>` → 仓库相对路径），
 * 不做"逐个目录试探"——试探会产生 404（审核页要求零 console 错误），且顺序错了会静默挂错图。
 *
 * 用法：node tools/pipeline/import-material-textures.mjs [--from <来源工程根目录>] [--dry-run]
 */

import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const fromIndex = args.indexOf('--from')
const SOURCE = resolve(fromIndex >= 0 ? args[fromIndex + 1] : join(root, '..', 'Low-voltageElectricalSimulationSoftware'))

const spec = JSON.parse(readFileSync(join(root, 'content', 'asset-material-spec.json'), 'utf8'))
const convert = JSON.parse(readFileSync(join(root, 'content', 'asset-convert-report.json'), 'utf8'))

function walk(dir, out = []) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

/** 读 GLB 里已有的材质名与贴图名（已有的不用再搬）。 */
function readGlb(file) {
  const buffer = readFileSync(file)
  const jsonLength = buffer.readUInt32LE(12)
  const gltf = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8'))
  return {
    materials: (gltf.materials ?? []).map((material) => material.name).filter(Boolean),
    images: new Set((gltf.images ?? []).map((image) => image.name).filter(Boolean)),
  }
}

const sourceFiles = walk(join(SOURCE, 'Assets'))
const sourceByBase = new Map()
for (const file of sourceFiles) {
  const base = file.split(/[\\/]/).pop()
  if (!sourceByBase.has(base)) sourceByBase.set(base, file)
}

const report = { generatedAt: new Date().toISOString(), dryRun, note: '补搬渲染期贴图（按材质引用，而不是按文件名前缀）', entries: [] }
let copied = 0
let skipped = 0
let missing = 0

for (const model of convert.models) {
  const device = model.device
  const targetDir = join(root, 'content', 'assets', 'three', device)
  const glb = readGlb(join(root, model.glb))

  // ★ 以 **GLB 实际用到的材质**为准（不是整个源目录），否则会把同目录里别的模型的主干贴图也搬一遍
  for (const name of glb.materials) {
    const material = spec.materials[name]
    if (!material) continue
    for (const [slot, base] of Object.entries(material.textures)) {
      if (!base) continue
      // 立方体贴图（`CubeSpecular` 反射）glTF 与 Three 都没有对应能力，不搬 —— 它在规格里记着
      if (slot === 'cube') continue
      // ⚠️ 以前这里跳过 mask（"Unity 侧原地读"）和"GLB 里已经带的"；
      // 现在 GLB 不再带任何贴图，三张图全部由查找表提供，所以这两个跳过都取消了。

      const source = sourceByBase.get(base)
      // 共享贴图（`Model/Public` 下的，以及多器件共用的纯白图）统一落 `_shared/`，
      // 免得同一张 612KB 的贴花图在 5 个器件目录里各存一份 —— 加载器按"器件目录 → _shared"两级找。
      const shared = /[\\/]Public[\\/]/.test(source ?? '') || /^White\./i.test(base)
      const target = join(shared ? join(root, 'content', 'assets', 'three', '_shared') : targetDir, base)
      const key = relative(root, target)
      if (report.entries.some((item) => item.target === key)) continue

      const entry = { device, material: name, slot, base, source: source ? relative(SOURCE, source) : null, target: key, status: 'copied', bytes: 0, sha256: null }
      if (!source) {
        entry.status = 'source-missing'
        missing += 1
      } else {
        const bytes = readFileSync(source)
        entry.bytes = bytes.length
        entry.sha256 = createHash('sha256').update(bytes).digest('hex')
        if (existsSync(target) && statSync(target).size === bytes.length) {
          entry.status = 'exists'
          skipped += 1
        } else {
          if (!dryRun) {
            mkdirSync(dirname(target), { recursive: true })
            copyFileSync(source, target)
          }
          copied += 1
        }
      }
      report.entries.push(entry)
    }
  }
}

if (!dryRun) {
  writeFileSync(join(root, 'content', 'asset-material-texture-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  /**
   * 再写一份**给渲染期用的精确查找表**：`<器件>/<文件名>`（共享图用 `_shared/<文件名>`）→ 仓库相对路径。
   *
   * 为什么不能"逐个目录试探"：浏览器里的 404 会进 console（审核页要求零错误），
   * 而且试探顺序错了会静默挂错图。有了这张表，找不到就是**明确报错**，不是打空。
   */
  const textures = {}
  for (const entry of report.entries) {
    if (entry.status === 'source-missing') continue
    // ⚠️ Windows 的路径分隔符是反斜杠：判断与前缀都要先归一成 `/`（否则 `_shared` 判不出来，
    // 而且写进 JSON 里给浏览器拼 URL 也不干净）
    const target = entry.target.replace(/\\/g, '/')
    const shared = target.includes('/three/_shared/')
    textures[`${shared ? '_shared' : entry.device}/${entry.base}`] = target
  }
  writeFileSync(
    join(root, 'content', 'asset-material-textures.json'),
    `${JSON.stringify(
      {
        generatedAt: report.generatedAt,
        note: '渲染期贴图查找表（由 import-material-textures.mjs 生成）：GLB 里没带的那几张在哪。',
        textures,
      },
      null,
      2,
    )}\n`,
    'utf8',
  )
}

console.log(`${dryRun ? '[dry-run] ' : ''}补搬 ${copied} 个 · 已就绪 ${skipped} 个 · 源工程缺 ${missing} 个`)
for (const entry of report.entries.filter((item) => item.status === 'copied' || item.status === 'source-missing')) {
  console.log(`  ${entry.status === 'copied' ? '→' : '✗'} ${entry.device}/${entry.base}  ←  ${entry.source ?? '（源工程找不到）'}  ${entry.bytes ? `${(entry.bytes / 1024).toFixed(0)}KB` : ''}`)
}
if (!dryRun) console.log(`报告：content/asset-material-texture-report.json`)
