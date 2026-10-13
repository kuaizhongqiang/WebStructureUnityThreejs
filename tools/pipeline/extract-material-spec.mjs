#!/usr/bin/env node
/**
 * 从**只读**来源工程抽出"材质规格"，落 `content/asset-material-spec.json`。
 *
 * 为什么需要它：Three 侧现在只接了 BaseColor + Normal，金属度 / 粗糙度是常数兜底
 * （转换脚本有意没塞 —— HDRP 的 mask 图通道语义与 glTF 不符）。要**解对**，光有那张图
 * 不够，还必须知道三件事，而它们都只写在源工程的材质里：
 *   1. `_MaskMap` 的通道语义（HDRP Lit 排布：R=Metallic、G=AO、A=Smoothness）；
 *   2. 三个**区间重映射**（`_MetallicMin/Max`、`_OAMin/Max`、`_SmoothnessMin/Max`）——
 *      实测 AO 的下界是 **0.5** 而不是 0，漏了这个画面会整体偏暗；
 *   3. **表面模式**（`_Surface` / `_AlphaClip` / `_Cutoff` / `_ZWrite`）与 `_Cull`。
 *
 * 还抽出**预制体覆写**：材质挂在 `MeshRenderer` 上，所以"哪个节点用哪个材质"只在预制体里；
 * 按 FBX 转会把这一层丢掉（实测 `speedRelay_*` / `combinationSwitch_*` / `fuse_structure`
 * 覆写了 `*_Metal` / `*_Coat` 子材质）。
 *
 * 用法：node tools/pipeline/extract-material-spec.mjs [--from <来源工程根目录>]
 * 来源工程**只读**，本脚本不写它任何文件。
 */

import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const args = process.argv.slice(2)
const fromIndex = args.indexOf('--from')
/** 默认来源工程：与本仓同级的目录名（本机绝对路径不写进文档，只作默认值）。 */
const SOURCE = resolve(fromIndex >= 0 ? args[fromIndex + 1] : join(root, '..', 'Low-voltageElectricalSimulationSoftware'))
const ASSETS = join(SOURCE, 'Assets')

/** 我们要的器件（= 内容数据里的 9 个项目里带三维的 8 个）。 */
const DEVICES = [
  'breaker',
  'combinationSwitch',
  'contactor',
  'fuse',
  'masterAppliance',
  'speedRelay',
  'thermalRelay',
  'timeRelay',
]

// ── 通用：guid ↔ 相对路径 ──────────────────────────────────────────────

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

const PACKAGES = join(SOURCE, 'Packages')
const files = [...walk(ASSETS), ...walk(PACKAGES)]
const pathByGuid = new Map()
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex')

for (const file of files) {
  if (!file.endsWith('.meta')) continue
  const guid = readFileSync(file, 'utf8').match(/guid:\s*([0-9a-f]{32})/)?.[1]
  if (guid) pathByGuid.set(guid, file.slice(0, -'.meta'.length))
}
const pathOf = (guid) => (guid ? (pathByGuid.get(guid) ?? null) : null)
const baseOf = (guid) => {
  const path = pathOf(guid)
  return path ? path.split(/[\\/]/).pop() : null
}

// ── Unity YAML 小工具（只按块切，不做完整 YAML） ────────────────────────

/**
 * 取 `key:` 之后的那个块。
 *
 * ⚠️ 实测的坑：Unity 写列表时**列表项与键同级缩进**（`    m_Floats:` 下一行就是
 * `    - _AlphaClip: 0`），所以"取更深缩进"会把块取成空 —— 必须按
 * "同级且不是列表项 ⇒ 块结束"来判。
 */
function block(text, key) {
  const match = new RegExp(`^(\\s*)${key}:[ \\t]*\\n`, 'm').exec(text)
  if (!match) return ''
  const indent = match[1].length
  const kept = []
  for (const line of text.slice(match.index + match[0].length).split(/\r?\n/)) {
    if (line.trim() === '') {
      kept.push(line)
      continue
    }
    const lead = line.length - line.trimStart().length
    if (lead < indent) break
    if (lead === indent && !/^\s*-/.test(line)) break
    kept.push(line)
  }
  return kept.join('\n')
}

// ── 材质 ───────────────────────────────────────────────────────────────

function readMaterial(file) {
  const text = readFileSync(file, 'utf8')
  // `…/Show/<中文器件>/Materials/<名字>.mat` → 器件目录名（英文 key 由 folderByDevice 反查）
  const folderMatch = /[\\/]Show[\\/]([^\\/]+)[\\/]Materials[\\/]/.exec(file)
  const floats = new Map()
  for (const m of block(text, 'm_Floats').matchAll(/^\s*- (_\w+): (-?[\d.]+)\s*$/gm)) {
    floats.set(m[1], Number(m[2]))
  }
  const colors = new Map()
  for (const m of block(text, 'm_Colors').matchAll(
    /^\s*- (_\w+): \{r: ([\d.-]+), g: ([\d.-]+), b: ([\d.-]+), a: ([\d.-]+)\}/gm,
  )) {
    colors.set(m[1], [m[2], m[3], m[4], m[5]].map(Number))
  }
  const textures = new Map()
  for (const m of block(text, 'm_TexEnvs').matchAll(
    /^\s*- (_\w+):\s*\n\s*m_Texture: \{fileID: -?\d+, guid: ([0-9a-f]{32})/gm,
  )) {
    textures.set(m[1], m[2])
  }
  const f = (key, fallback) => (floats.has(key) ? floats.get(key) : fallback)
  const range = (minKey, maxKey) => [f(minKey, 0), f(maxKey, 1)]

  const surface = f('_Surface', 0)
  const alphaClip = f('_AlphaClip', 0)
  const queue = f('m_CustomRenderQueue', -1)
  const shaderPath = pathOf(text.match(/m_Shader: \{fileID: -?\d+, guid: ([0-9a-f]{32})/)?.[1])

  return {
    name: text.match(/m_Name: (.+)/)?.[1]?.trim() ?? '',
    sourceFolder: folderMatch ? folderMatch[1] : null,
    shader: shaderPath ? shaderPath.split(/[\\/]/).pop() : 'builtin',
    /** 表面模式：glTF 只认这三种；判据同 `docs/design/03` §5.1 与技能文档的实测表。 */
    surfaceMode: alphaClip >= 1 ? 'MASK' : surface >= 1 ? 'BLEND' : 'OPAQUE',
    alphaCutoff: f('_Cutoff', 0.5),
    doubleSided: f('_Cull', 2) === 2,
    zWrite: f('_ZWrite', 1),
    renderQueue: queue,
    /** mask 图 → glTF ORM 的三个区间（顺序即 glTF 的 R/G/B 来源）。 */
    remap: {
      occlusion: range('_OAMin', '_OAMax'),
      smoothness: range('_SmoothnessMin', '_SmoothnessMax'),
      metallic: range('_MetallicMin', '_MetallicMax'),
    },
    baseColor: colors.get('_BaseColor') ?? [1, 1, 1, 1],
    baseColorMultiple: colors.get('_BaseColorMultiple') ?? [1, 1, 1, 1],
    cubeColor: colors.get('_CubeColor') ?? null,
    normalStrength: f('_NormalStrength', 1),
    /** **没有 mask 图**时（Glass / CombinationSwitch2 / 贴花）金属度与粗糙度走这两个标量。 */
    scalars: {
      metallic: f('_Metallic', 0),
      smoothness: f('_Smoothness', f('_Glossiness', 0.5)),
    },
    /**
     * 清漆层强度（`HDRPtoURPLitClearCoatedShader` 的 `_CoatedMask`）。
     * 实测 `SpeedRelay_Coat.mat` 是 **0.2** —— glTF 用 `KHR_materials_clearcoat` 表达得了，所以要带过去。
     */
    clearcoat: f('_CoatedMask', f('_ClearCoatMask', 0)),
    textures: {
      baseColor: baseOf(textures.get('_BaseMap') ?? textures.get('_BaseColorMap')),
      normal: baseOf(textures.get('_NormalMap')),
      mask: baseOf(textures.get('_MaskMap')),
      cube: baseOf(textures.get('_MetalCubeMap')),
    },
    /** glTF 表达不了的东西要**显式记账**，别静默丢。 */
    lostInGltf: [
      textures.has('_MetalCubeMap') ? `立方体反射贴图 ${baseOf(textures.get('_MetalCubeMap'))} + 染色 ${JSON.stringify(colors.get('_CubeColor'))}` : null,
      shaderPath && /ClearCoat/.test(shaderPath) ? '清漆层（可用 KHR_materials_clearcoat 表达，本期不接）' : null,
      shaderPath && /Dirt/.test(shaderPath) ? '程序化污渍（子图，glTF 无对应能力）' : null,
    ].filter(Boolean),
  }
}

const materialByGuid = new Map()
for (const file of files) {
  if (!file.endsWith('.mat')) continue
  const guid = readFileSync(file + '.meta', 'utf8').match(/guid:\s*([0-9a-f]{32})/)?.[1]
  if (guid) materialByGuid.set(guid, readMaterial(file))
}

// ── 预制体：节点路径 → 材质列表 ────────────────────────────────────────

function parsePrefab(file) {
  const text = readFileSync(file, 'utf8')
  const docs = text.split(/^--- /m).slice(1)
  const gameObjects = new Map()
  const transforms = new Map()
  const renderers = []

  for (const doc of docs) {
    const head = /^!u!(\d+) &(-?\d+)/.exec(doc)
    if (!head) continue
    const [, cls, id] = head
    if (cls === '1') {
      gameObjects.set(id, {
        name: (doc.match(/^\s*m_Name: (.*)$/m)?.[1] ?? '').trim(),
        components: [...doc.matchAll(/- component: \{fileID: (-?\d+)\}/g)].map((m) => m[1]),
      })
    } else if (cls === '4' || cls === '224') {
      const children = []
      for (const line of block(doc, 'm_Children').split(/\r?\n/)) {
        const m = /- \{fileID: (-?\d+)\}/.exec(line)
        if (m) children.push(m[1])
      }
      transforms.set(id, {
        gameObject: doc.match(/m_GameObject: \{fileID: (-?\d+)\}/)?.[1] ?? null,
        father: doc.match(/m_Father: \{fileID: (-?\d+)\}/)?.[1] ?? null,
        children,
      })
    } else if (cls === '23' || cls === '137') {
      const materials = []
      for (const line of block(doc, 'm_Materials').split(/\r?\n/)) {
        const m = /- \{fileID: -?\d+, guid: ([0-9a-f]{32})/.exec(line)
        if (m) materials.push(m[1])
      }
      renderers.push({
        gameObject: doc.match(/m_GameObject: \{fileID: (-?\d+)\}/)?.[1] ?? null,
        materials,
      })
    }
  }

  const transformOfObject = new Map()
  for (const [id, transform] of transforms) {
    if (transform.gameObject) transformOfObject.set(transform.gameObject, id)
  }

  const pathOfObject = (gameObjectId) => {
    const names = []
    let currentTransform = transformOfObject.get(gameObjectId)
    let guard = 0
    while (currentTransform && guard < 64) {
      const transform = transforms.get(currentTransform)
      if (!transform) break
      const name = gameObjects.get(transform.gameObject)?.name
      if (name) names.unshift(name)
      currentTransform = transform.father
      guard += 1
    }
    return names.join('/')
  }

  const nodes = {}
  for (const renderer of renderers) {
    if (!renderer.gameObject) continue
    const path = pathOfObject(renderer.gameObject)
    if (!path) continue
    nodes[path] = renderer.materials.map((guid) => materialByGuid.get(guid)?.name ?? `未知材质(${guid})`)
  }

  /**
   * 嵌套实例上的**材质覆写**（`*_info_model` 就是这么写的）：
   * `target.fileID` 指向 **FBX 内部 MeshRenderer**，`objectReference.guid` 是材质。
   * ⚠️ `*.fbx.meta` 的 `internalIDToNameTable` 是空的（fileID 是按路径算的哈希），
   * 所以**光靠这一条推不出节点名** —— 靠结构件 prefab 的节点名映射来对齐（见 devices 组装处）。
   */
  const overrides = []
  for (const doc of docs) {
    const head = /^!u!(\d+) &(-?\d+)/.exec(doc)
    if (!head || head[1] !== '1001') continue
    for (const m of doc.matchAll(
      /target: \{fileID: (-?\d+), guid: [0-9a-f]{32}[^}]*\}\s*\n\s*propertyPath: (m_Materials\.Array\.data\[\d+\])\s*\n\s*value: ?[^\n]*\n\s*objectReference: \{fileID: -?\d+, guid: ([0-9a-f]{32})/g,
    )) {
      overrides.push({
        fileId: m[1],
        slot: m[2],
        material: materialByGuid.get(m[3])?.name ?? `未知材质(${m[3]})`,
      })
    }
  }

  const sourceGuid = /m_SourcePrefab: \{fileID: -?\d+, guid: ([0-9a-f]{32})/.exec(text)?.[1]
  const sourcePath = sourceGuid ? pathOf(sourceGuid) : null

  return {
    root: pathOfObject(renderers[0]?.gameObject)?.split('/')[0] ?? '',
    nodes,
    overrides,
    source: sourcePath ? relative(SOURCE, sourcePath).split('\\').join('/') : null,
  }
}

// ── 组装 ───────────────────────────────────────────────────────────────

/**
 * FBX 内部 **fileID → 节点名**（`content/asset-fbx-node-ids.json`）。
 *
 * 为什么必须由 Unity 导出：预制体的 `m_Modifications` 是按 FBX 内部 MeshRenderer 的 fileID 打的，
 * 而 `*.fbx.meta` 的 `internalIDToNameTable` 是**空的** —— fileID 是按节点路径算的哈希（7 种常见哈希 ×
 * 6 种输入形态我试过，0 命中），所以只能让编辑器把 `TryGetGUIDAndLocalFileIdentifier` 的结果吐出来。
 */
let nodeIdTables = {}
try {
  nodeIdTables = JSON.parse(readFileSync(join(root, 'content', 'asset-fbx-node-ids.json'), 'utf8')).files ?? {}
} catch {
  console.warn('⚠️ 缺 content/asset-fbx-node-ids.json —— 预制体覆写解不出节点名（该文件由 Unity 编辑器导出）')
}

const models = join(ASSETS, 'Model', 'Element', 'Show')
const spec = {
  generatedAt: new Date().toISOString(),
  note: '从只读来源工程抽出：shader 的贴图通路（mask 通道语义与区间重映射）+ 表面模式 + 预制体的材质覆写。',
  source: {
    assets: 'Assets/Model/Element/Show/**',
    prefabs: 'Assets/Prefabs/Models/**',
    sha256OfScript: sha256(readFileSync(fileURLToPath(import.meta.url))),
  },
  /**
   * 渲染期从哪儿取贴图（**相对仓库根**）—— 给按需解算用（GLB 里带不动的部分）。
   *   · mask 图（`*_M_AO_G.png`）**原地读 Unity 侧**：它已在库内（Plastic 管），再拷一份就是 24MB 重复；
   *   · 子材质的贴图（铭牌 / 贴花 / 面板图 / White）原本**没搬进来**，补到 Three 侧落点（见 import-material-textures.mjs）。
   */
  runtime: {
    threeTextures: 'content/assets/three/<device>/',
    unityMasks: 'NewStructureUnity/Assets/Models/<device>/',
    sharedTextures: 'content/assets/three/_shared/',
  },
  devices: {},
  materials: {},
}

/**
 * 器件（英文 key）→ 源工程里的**中文目录名**：源目录是中文，不能按名字对。
 * 用已采纳的转换清单（GLB 的 stem → device）反查：目录里只要有某个 `.mat` 名
 * 正好等于该器件的某个 GLB stem，就认这个目录。
 */
const convertReport = JSON.parse(readFileSync(join(root, 'content', 'asset-convert-report.json'), 'utf8'))
const deviceByStem = new Map(convertReport.models.map((model) => [model.stem, model.device]))
const folderByDevice = new Map()
const showFolders = readdirSync(models, { withFileTypes: true }).filter((entry) => entry.isDirectory())
for (const folder of showFolders) {
  const materialsDir = join(models, folder.name, 'Materials')
  for (const file of walk(materialsDir)) {
    if (!file.endsWith('.mat')) continue
    const stem = file.split(/[\\/]/).pop().replace(/\.mat$/, '')
    const device = deviceByStem.get(stem)
    if (device) folderByDevice.set(device, folder.name)
  }
}

const usedMaterialNames = new Set()
for (const device of DEVICES) {
  const folder = folderByDevice.get(device)
  const entry = { sourceFolder: folder ?? null, models: {}, prefabs: {}, prefabSources: {}, overrides: {} }
  if (folder) {
    for (const file of walk(join(models, folder))) {
      if (!file.endsWith('.fbx')) continue
      const stem = file.split(/[\\/]/).pop().replace(/\.fbx$/, '')
      entry.models[stem] = true
      const materialFile = join(dirname(file), 'Materials', `${stem}.mat`)
      try {
        usedMaterialNames.add(readMaterial(materialFile).name)
      } catch {
        /* 有些模型没有同名材质，忽略 */
      }
    }
    // 该器件目录下的全部材质都要带上（覆写用的 *_Metal / *_Coat 就在这里）
    for (const file of walk(join(models, folder, 'Materials'))) {
      if (file.endsWith('.mat')) usedMaterialNames.add(file.split(/[\\/]/).pop().replace(/\.mat$/, ''))
    }
  }

  const prefabDir = join(ASSETS, 'Prefabs', 'Models')
  for (const file of walk(prefabDir)) {
    const name = file.split(/[\\/]/).pop()
    if (!file.endsWith('.prefab')) continue
    if (!new RegExp(`^${device}_(info|structure|inspection)_model\\.prefab$`, 'i').test(name)) continue
    const parsed = parsePrefab(file)
    const key = name.replace(/\.prefab$/, '')
    entry.prefabs[key] = parsed.nodes
    entry.prefabSources[key] = parsed.source // 该预制体实例的源资产（info 模型这里就是那个 FBX）
    if (parsed.overrides.length > 0) entry.overrides[key] = parsed.overrides
    for (const list of Object.values(parsed.nodes)) for (const material of list) usedMaterialNames.add(material)
    for (const item of parsed.overrides) usedMaterialNames.add(item.material)
  }

  /**
   * **材质归属**（哪个 mesh 用什么材质）——**这是"必须走预制体"的那一层**。
   *
   * ⚠️ 真源是 **`<器件>_info_model.prefab` 的覆写**，不是结构件预制体（这是我上次踩的坑）：
   * **Three 渲染的就是 info 模型**。结构件是另一套装配（多 `Rotate` 枢轴、多内置 `Cube` 触点），
   * 它的分配对 info 模型**不一定成立** —— 实测 `combinationSwitch`：结构件把 `CombinationSwitch08`
   * 写成 `CombinationSwitch2`，而 info 预制体明确覆写回主干 `CombinationSwitch`
   * （负责人的逐 mesh 对照也给出同一结论）。speedRelay 两边恰好一致，所以上次没暴露。
   *
   * 覆写是按 **FBX 内部 MeshRenderer 的 fileID** 打的，而 `*.fbx.meta` 的 `internalIDToNameTable` 为空
   * （fileID 是按路径算的哈希），故 fileID → 节点名由 **Unity 编辑器导出**：
   * `content/asset-fbx-node-ids.json`（生成方式见该文件 `note`）。
   */
  const nodes = {}
  entry.prefabOverrides = nodes
  entry.overrideChecks = []
  const infoEntry = Object.entries(entry.overrides).find(([key]) => key.endsWith('_info_model'))
  if (infoEntry) {
    const [infoKey, list] = infoEntry
    const sourceFbx = entry.prefabSources?.[infoKey] ?? null
    const fbxName = sourceFbx ? sourceFbx.split('/').pop() : null
    const table = fbxName ? nodeIdTables[`NewStructureUnity/Assets/Models/${device.replace(/^[\\/]+/, '')}/${fbxName}`] ?? null : null
    if (!table) {
      console.warn(`⚠️ ${device}：info 预制体的 FBX 是 ${sourceFbx ?? '未知'}，但 asset-fbx-node-ids.json 里没有它的节点表 —— 覆写解不出节点名`)
    }
    for (const item of list) {
      const nodeName = table?.[item.fileId] ?? null
      if (!nodeName) {
        entry.overrideChecks.push({ prefab: infoKey, fileId: item.fileId, material: item.material, resolved: null })
        continue
      }
      const slot = Number(/data\[(\d+)\]/.exec(item.slot)?.[1] ?? 0)
      if (!nodes[nodeName]) nodes[nodeName] = []
      nodes[nodeName][slot] = item.material
      entry.overrideChecks.push({ prefab: infoKey, fileId: item.fileId, node: nodeName, slot, material: item.material, resolved: 'ok' })
    }
    // 结构件映射留作交叉校验（结构件节点名与 FBX 节点名逐字对应，可当"这份解出来的名字像不像"的旁证）
    entry.structureMappingForCrossCheck = entry.prefabs[Object.keys(entry.prefabs).find((k) => k.endsWith('_structure_model')) ?? ''] ?? null
  }
  for (const [key, mapping] of Object.entries(entry.prefabs)) {
    if (!key.endsWith('_structure_model')) continue
    entry.structureNodeCount = Object.keys(mapping).length
  }

  spec.devices[device] = entry
}



/**
 * **Three 侧只做 8 个模型**（2026-10-13 负责人口径）：Three 是"简单三维"，每个器件一个模型。
 * 判据不是"文件名新代/旧代"，而是**预制体数据**：`Assets/Prefabs/Models/InfoObjs/<器件>_info_model.prefab`
 * 各自实例的那个 FBX。实测得到 8 个（`NewCircuitBreaker` / `CombinationSwitch` / `NewACContactor` /
 * `Fuse` / `MasterControlAppliances` / `SpeedRelay` / `NewThermalRelay` / `NewTimeRelay`）；
 * 另外 5 个（`CircuitBreaker` / `ACContactor` / `CeramicPlugInFse` / `ThermalOerloadRelay` / `TimeRelay`）
 * 属于 Unity 侧（结构 / 检测），**不在 Three 侧产出**。
 */
const threeSide = {}
for (const file of walk(join(ASSETS, 'Prefabs', 'Models', 'InfoObjs'))) {
  if (!file.endsWith('_info_model.prefab')) continue
  const text = readFileSync(file, 'utf8')
  const fbx = [...new Set([...text.matchAll(/guid: ([0-9a-f]{32})/g)].map((m) => m[1]))]
    .map((guid) => pathOf(guid))
    .find((path) => path && /\.fbx$/i.test(path))
  if (!fbx) continue
  const device = file.split(/[\\/]/).pop().replace('_info_model.prefab', '')
  const stem = fbx.split(/[\\/]/).pop().replace(/\.fbx$/i, '')
  threeSide[`${device}/${stem}`] = {
    infoPrefab: file.split(/[\\/]/).pop(),
    fbx: relative(SOURCE, fbx).split('\\').join('/'),
  }
}
spec.threeSide = {
  note: 'Three 侧只产出这些模型（判据＝ InfoObjs/<器件>_info_model.prefab 实例的 FBX，非按文件名猜）',
  count: Object.keys(threeSide).length,
  models: threeSide,
}

// 只输出用得上的材质：省得把 demo / UI 的 100 多个一起塞进证据文件
for (const name of [...usedMaterialNames].sort()) {
  const material = materialByGuid.get(
    [...materialByGuid.keys()].find((guid) => materialByGuid.get(guid).name === name),
  )
  if (material) spec.materials[name] = material
}

mkdirSync(join(root, 'content'), { recursive: true })
const outPath = join(root, 'content', 'asset-material-spec.json')
/**
 * **负责人定的修正**（`content/material-overrides.json`）在这里合并 —— 必须**晚于自动抽取、
 * 早于写出**。第一次我把它放在器件循环后面，那时 `spec.materials` 还是空的，覆盖静默失效
 * （`applied=0` 是唯一线索）。这份覆盖要晚于自动抽取，否则下次重抽就把人的判断冲掉了。
 */
try {
  const overrides = JSON.parse(readFileSync(join(root, 'content', 'material-overrides.json'), 'utf8'))
  let applied = 0
  for (const [name, patch] of Object.entries(overrides.materials ?? {})) {
    const material = spec.materials[name]
    if (!material) {
      console.warn(`⚠️ 覆盖项 ${name} 在规格里不存在（材质名写错了？）`)
      continue
    }
    for (const [key, value] of Object.entries(patch)) {
      if (key === 'reason' || key === 'note') continue
      material[key] = value
    }
    material.overriddenByHuman = true
    applied += 1
    console.log(`  · 人工修正：${name} → surfaceMode=${material.surfaceMode}`)
  }
  spec.humanOverrides = { file: 'content/material-overrides.json', applied }
} catch (error) {
  if (error.code !== 'ENOENT') console.warn(`⚠️ 读不了 content/material-overrides.json：${error.message}`)
}

writeFileSync(outPath, `${JSON.stringify(spec, null, 2)}\n`, 'utf8')

const materialCount = Object.keys(spec.materials).length
const prefabCount = Object.values(spec.devices).reduce((sum, d) => sum + Object.keys(d.prefabs).length, 0)
console.log(`已写出 ${relative(root, outPath)}`)
console.log(`  材质 ${materialCount} 个 · 器件 ${DEVICES.length} 个 · 预制体 ${prefabCount} 个`)
for (const [device, entry] of Object.entries(spec.devices)) {
  const prefabs = Object.keys(entry.prefabs)
  console.log(`  ${device}: 模型 ${Object.keys(entry.models).join(',') || '—'} · 预制体 ${prefabs.join(',') || '—'}`)
}
