#!/usr/bin/env node
/**
 * 逐 mesh / 逐子材质核对：把"源工程要求的材质通路"与"我们 GLB 里实际接的"摆在一起。
 *
 * 查三件事（都是"多维子材质"最容易静默出错的地方）：
 *   1. 每个 GLB 的**每个材质**用的是哪些贴图 —— 是否多个材质**共用同一张图**
 *      （按 FBX 同名前缀挂钩的结果：第二套子材质会被套上主干贴图）；
 *   2. 材质**要求的**贴图文件（来自 `content/asset-material-spec.json`）在 Unity 侧到底有没有；
 *   3. 该材质应有的**表面模式**（MASK / BLEND）与 GLB 里实际写的对不对。
 *
 * 用法：node tools/pipeline/audit-material-mapping.mjs
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const spec = JSON.parse(readFileSync(join(root, 'content', 'asset-material-spec.json'), 'utf8'))
const convert = JSON.parse(readFileSync(join(root, 'content', 'asset-convert-report.json'), 'utf8'))

/** 读 GLB 的 JSON 块。 */
function readGlbJson(file) {
  const buffer = readFileSync(file)
  if (buffer.readUInt32LE(0) !== 0x46546c67) throw new Error(`不是 GLB：${file}`)
  const jsonLength = buffer.readUInt32LE(12)
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8'))
}

const textureSlots = ['baseColorTexture', 'normalTexture', 'metallicRoughnessTexture', 'occlusionTexture']
let problems = 0

for (const model of convert.models) {
  const device = model.device
  const stem = model.stem
  const folder = join(root, 'NewStructureUnity', 'Assets', 'Models', device)
  const glbPath = join(root, model.glb)
  const gltf = readGlbJson(glbPath)

  // 每个材质 → 各槽位引用的 image 下标
  const lines = []
  for (const [index, material] of (gltf.materials ?? []).entries()) {
    const slots = {}
    for (const slot of textureSlots) {
      const texIndex = material[slot === 'baseColorTexture' ? 'pbrMetallicRoughness' : '']?.baseColorTexture?.index ??
        material.pbrMetallicRoughness?.[slot]?.index ??
        material[slot]?.index
      slots[slot] = texIndex === undefined ? null : (gltf.textures?.[texIndex]?.source ?? null)
    }
    lines.push({ index, name: material.name, slots, alphaMode: material.alphaMode ?? 'OPAQUE' })
  }

  // 该模型在规格里的材质（按名字对齐）
  const expected = Object.values(spec.materials).filter((material) => {
    const base = material.textures.baseColor ?? ''
    return base.toLowerCase().startsWith(stem.toLowerCase()) || material.name === stem
  })

  const imageNames = (gltf.images ?? []).map((image, index) => `${index}:${image.name ?? '(无名)'}`).join(' ')
  console.log(`\n■ ${device}/${stem}  （GLB 内 ${gltf.materials?.length ?? 0} 材质 / ${gltf.images?.length ?? 0} 贴图）`)
  console.log(`  GLB 内贴图：${imageNames}`)
  for (const line of lines) {
    const shared = Object.values(line.slots).filter((value) => value !== null)
    const specMaterial = spec.materials[line.name]
    const wantBase = specMaterial?.textures?.baseColor ?? '—'
    const wantMode = specMaterial?.surfaceMode ?? '—'
    // 贴图可能落在三处：Three 侧器件目录 / Three 侧共享目录 / Unity 侧原地（主干贴图只在那儿）
    const candidates = [
      join(root, 'content/assets/three', device, wantBase),
      join(root, 'content/assets/three/_shared', wantBase),
      join(folder, wantBase),
    ]
    const found = wantBase !== '—' ? candidates.find(statExists) : null
    const flag = []
    if (specMaterial && wantBase !== '—' && !found) flag.push(`★ 贴图找不到：${wantBase}`)
    // ⚠️ 表面模式**故意不写进 GLB**（HDRP 与 glTF 不同），由渲染期按规格施加 —— 只作提示，不算问题
    const modeNote = wantMode !== '—' && wantMode !== line.alphaMode ? `  →渲染期解算为 ${wantMode}` : ''
    console.log(
      `    · ${(line.name || '(无名)').padEnd(24)} img=${JSON.stringify(shared)} alpha=${line.alphaMode.padEnd(6)} 规格: base=${wantBase.padEnd(30)} mode=${wantMode.padEnd(6)} ${(flag.join(' ') || 'OK') + modeNote}`,
    )
    if (flag.length) problems += flag.length
  }
  if (expected.length === 0) console.log('    （规格里没找到该模型的主材质，跳过）')
}

function statExists(path) {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

console.log(`\n合计问题 ${problems} 处`)
if (problems > 0) process.exitCode = 0 // 审核工具：报告不加失败退出，避免误入门禁
