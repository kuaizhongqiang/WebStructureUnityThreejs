#!/usr/bin/env node
/**
 * 把源工程（Low-voltageElectricalSimulationSoftware）预制体上的
 * `structureName` / `structureNameEn` 搬进本工程的 `objName` / `objName_en`
 * （D-15 收尾，DEC-146：零件命名来源 = 低压电器项目）。
 *
 * 匹配口径：**按 GameObject 名**（两侧预制体同源自同一批 FBX，层级与命名一致）。
 * 只填空值，已有值不覆盖；源里没有的部件保持空并在摘要里列出。
 * ⚠ Unity YAML 的字段带两空格缩进，所有行正则都要容 `\s*`。
 *
 * 用法：node tools/pipeline/fill-part-names.mjs [--dry]
 */
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const SOURCE_DIR = resolve('F:/Project/Low-voltageElectricalSimulationSoftware/Assets/Prefabs/Models/StructureObjs')
const OUR_DIR = join(repoRoot, 'NewStructureUnity', 'Assets', 'Prefabs', 'Models', 'StructureObjs')
const dry = process.argv.includes('--dry')

function splitBlocks(text) {
  const blocks = []
  const re = /^--- !u!(\d+) &(\d+)\s*$/gm
  let match
  while ((match = re.exec(text)) !== null) {
    const start = match.index + match[0].length
    const end = re.lastIndex < text.length ? text.indexOf('--- !u!', re.lastIndex) : text.length
    blocks.push({ classId: Number(match[1]), fileId: match[2], body: text.slice(start, end < 0 ? undefined : end) })
  }
  return blocks
}

function gameObjectName(blocks, fileId) {
  const go = blocks.find((b) => b.classId === 1 && b.fileId === fileId)
  const m = go?.body.match(/^\s*m_Name: (.+)$/m)
  return m ? m[1].trim() : null
}

async function readSource(file) {
  const text = await readFile(file, 'utf8')
  const blocks = splitBlocks(text)
  const map = new Map()
  for (const b of blocks) {
    if (b.classId !== 114 || !/^\s*structureName:/m.test(b.body)) continue
    const goRef = b.body.match(/^\s*m_GameObject: \{fileID: (\d+)\}/m)
    const cn = b.body.match(/^\s*structureName: "?([^"\r\n]*?)"?\s*$/m)
    const en = b.body.match(/^\s*structureNameEn: (.+)$/m)
    if (!goRef || !cn?.[1]) continue
    const name = gameObjectName(blocks, goRef[1])
    if (name && !map.has(name)) map.set(name, { cn: unescapeUnity(cn[1]), en: en?.[1]?.trim() ?? '' })
  }
  return map
}

function unescapeUnity(value) {
  return value.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
}

function escapeUnity(value) {
  return value.replace(/[\u0100-\uFFFF]/g, (ch) => '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0'))
}

function fillOurs(text, sourceMap) {
  const blocks = splitBlocks(text)
  let filled = 0
  const unmatched = new Set()
  let result = text
  for (const b of blocks) {
    if (b.classId !== 114 || !/^[ \t]*objName:/m.test(b.body)) continue
    if (!/^[ \t]*objName:[ \t]*$/m.test(b.body)) continue // 已有值不覆盖
    const goRef = b.body.match(/^[ \t]*m_GameObject: \{fileID: (\d+)\}/m)
    if (!goRef) continue
    const name = gameObjectName(blocks, goRef[1])
    const value = name ? sourceMap.get(name) : undefined
    if (!value) {
      unmatched.add(name ?? '(无名)')
      continue
    }
    // ⚠ 行尾锚用 [ \t]*$ 不用 \s*$：块体以 \n 结尾时 \s* 会把换行一起吃掉，
    //   替换后下一块头 `--- !u!` 会粘到值上，YAML 直接坏。
    let replacement = b.body
      .replace(/^([ \t]*)objName:[ \t]*$/m, `$1objName: "${escapeUnity(value.cn)}"`)
      .replace(/^([ \t]*)objName_en:[ \t]*$/m, `$1objName_en: ${value.en || ''}`)
    if (!/\n$/.test(replacement)) replacement += '\n'
    if (!result.includes(b.body)) continue
    result = result.replace(b.body, replacement)
    filled += 1
  }
  return { result, filled, unmatched }
}

/** 修复上一版把块头粘到值上的损坏：`objName_en: 值--- !u!…` → 补回换行。 */
function repairGlued(text) {
  return text.replace(/^([ \t]*objName_en: [^\r\n]*?)(--- !u!\d+ &\d+)/gm, '$1\n$2')
}

const dryNote = dry ? '（dry：不写盘）' : ''
let totalFilled = 0
const allUnmatched = new Map()

for (const file of (await readdir(OUR_DIR)).filter((f) => f.endsWith('.prefab'))) {
  let sourceMap = new Map()
  try {
    sourceMap = await readSource(join(SOURCE_DIR, file))
  } catch {
    console.log(`[skip] ${file}：源工程没有同名预制体`)
  }

  const path = join(OUR_DIR, file)
  const original = await readFile(path, 'utf8')
  const text = repairGlued(original)
  const { result, filled, unmatched } = fillOurs(text, sourceMap)
  totalFilled += filled
  if (unmatched.size > 0) allUnmatched.set(file, [...unmatched])
  console.log(`${file}：填了 ${filled} 处${unmatched.size > 0 ? `，未匹配 ${unmatched.size}（${[...unmatched].join('、')}）` : ''}`)
  if (!dry && (filled > 0 || result !== original)) await writeFile(path, result, 'utf8')
}

console.log(`\n合计填入 ${totalFilled} 处 ${dryNote}`)
for (const [file, names] of allUnmatched) console.log(`未匹配：${file} → ${names.join('、')}`)
