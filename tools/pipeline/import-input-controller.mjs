#!/usr/bin/env node
/**
 * 从既有实训软件搬运**底层操控层**（输入控制器 + 相机背景 + 它的两个预制体）。
 *
 * 为什么单独一条链：这条链搬的是 **`.cs` 与预制体**，而前两条链搬的是"只能进 Unity 的资产"与"两条线共用的几何"，
 * 判据完全不同（这条要连 `.meta` 一起走才能保证预制体里的脚本引用不断）。
 *
 * 用法：
 *   node tools/pipeline/import-input-controller.mjs --from <来源工程根目录> --dry-run   # 只报告，不写盘
 *   node tools/pipeline/import-input-controller.mjs --from <来源工程根目录>              # 真搬
 *
 * **搬什么**：
 *   ① **代码与输入资产**（显式清单，见 `CODE_ENTRIES`）：操控层 7 个 `.cs` + 1 个 `.inputactions`
 *      → `NewStructureUnity/Assets/Scripts/Core/Controllers/`（**本工程的目录与命名**，不是来源的目录布局）；
 *   ② **两个预制体 + 它们的 GUID 依赖闭包**：
 *      · `Assets/Resources/MainCamera.prefab` → **目标同名位**（本工程 `CameraManager.CreateMainCamera()`
 *        就是按 `Resources/MainCamera` 找相机的，这个位置不能改）；
 *      · `FirstPersonController/First Person Controller.prefab` → `Assets/Prefabs/Characters/FirstPersonController.prefab`
 *        （来源把它放在代码目录里，本工程按"预制体进 `Assets/Prefabs/`"落位）；
 *      闭包里的资产（材质 / Shader / 贴图）**保持来源工程的 `Assets/` 相对路径** —— 与结构件那条链同口径。
 *   ③ **行为规格文档**（原文照录，不改写）：操控层下全部 `.md` → `docs/research/10-input-controller-specs/`。
 *
 * **不搬**（清单里明确记为待办，不是漏掉）：
 *   · 来源工程那套管理器/工具/事件骨架（`GlobalInputMgr` / `GlobalCameraMgr` / `GlobalAssetsMgr` / `Log` / 事件总线）——
 *     按既有边界只搬**单个交互脚本的算法**，落位到本工程自己的目录与命名；管理器职责由本工程的
 *     `GlobalManager.MainCamera`（相机）与 `InputControllerBase` 自带的静态注册表（控制器登记）重新承载。
 *   · 搬进来的 `.cs` 是**未改写的原文**：命名空间与依赖的移植由人做（口径见 `docs/design/11`）。
 *     重跑本脚本时按 **GUID 已在目标工程** 跳过，**不会覆盖移植后的代码**。
 *
 * 两条硬规矩（与结构件那条链一致）：
 *   1. **资产连同 `.meta` 一起拷**：GUID 必须保持与来源一致，否则源预制体里的脚本/材质引用全部变成 Missing；
 *   2. **GUID 已在目标工程里的资产不重复搬**，跳过并在清单里记 `already-in-project`。
 *
 * 纪律：只读来源工程（**绝不写入**）；不打开 Unity；不碰 git / Plastic（提交由人按批次做）。
 */
import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const UNITY_ASSETS = join(repoRoot, 'NewStructureUnity/Assets')
const REPORT = join(repoRoot, 'content/asset-input-controller-report.json')
const DOCS_TARGET = join(repoRoot, 'docs/research/10-input-controller-specs')

/** 来源工程里操控层的相对 `Assets/` 路径。 */
const SRC = 'Scripts/InputController'

/**
 * 显式清单：代码与输入资产。
 * 目标一律在 `NewStructureUnity/Assets/Scripts/Core/Controllers/` —— 本工程的目录与命名（不是来源的目录布局）。
 */
const CODE_ENTRIES = [
  [`${SRC}/InputControllerBase.cs`, 'Scripts/Core/Controllers/InputControllerBase.cs'],
  [`${SRC}/CameraControl/CameraBg.cs`, 'Scripts/Core/Controllers/CameraBg.cs'],
  [`${SRC}/FirstPersonController/FirstPersonController.cs`, 'Scripts/Core/Controllers/FirstPersonController.cs'],
  [`${SRC}/ThirdPersonController/ThirdPersonController.cs`, 'Scripts/Core/Controllers/ThirdPersonController.cs'],
  [`${SRC}/FocusRotationController/FocusRotationControl.cs`, 'Scripts/Core/Controllers/FocusRotationControl.cs'],
  [`${SRC}/Common/InputSystem/StarterAssetsInputs.cs`, 'Scripts/Core/Controllers/StarterAssetsInputs.cs'],
  [`${SRC}/Common/BasicRigidBodyPush.cs`, 'Scripts/Core/Controllers/BasicRigidBodyPush.cs'],
  [`${SRC}/Common/InputSystem/StarterAssets.inputactions`, 'Scripts/Core/Controllers/StarterAssets.inputactions'],
].map(([from, to]) => ({ from, to, source: 'code' }))

/** 预制体：闭包入口（来源相对 `Assets/` → 目标相对 `Assets/`）。 */
const PREFAB_ENTRIES = [
  // ⚠️ 目标**不是** `Resources/MainCamera.prefab`：本工程首批脚手架已有同名精简相机（Camera + AudioListener +
  //    URP 相机数据，随 96a03e8 入库），而来源这台是**带 CinemachineBrain 与背景板的 rig**。
  //    不覆盖已有资产（本脚本的规矩），因此落成独立资产；要不要把它换成本工程的主相机见 `TODO.md`。
  { from: 'Resources/MainCamera.prefab', to: 'Prefabs/Camera/MainCameraRig.prefab', source: 'prefab' },
  {
    from: `${SRC}/FirstPersonController/First Person Controller.prefab`,
    to: 'Prefabs/Characters/FirstPersonController.prefab',
    source: 'prefab',
  },
]

const sha256 = async (file) => createHash('sha256').update(await readFile(file)).digest('hex')

/** 建立 guid → 资产路径 的索引（只读）。.meta 里 `guid: <32hex>`。 */
async function indexGuids(dir, map) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      await indexGuids(full, map)
      continue
    }
    if (!entry.name.endsWith('.meta')) continue
    const match = /guid:\s*([0-9a-f]{32})/.exec(await readFile(full, 'utf8'))
    if (match && !map.has(match[1])) map.set(match[1], full.slice(0, -'.meta'.length))
  }
}

/** 顺着 guid 引用做广度优先（入口文件自身也在内），返回 [文件, 未解析的 guid 集]。 */
async function closure(entry, guidIndex) {
  const seen = new Set()
  const found = []
  const unresolved = new Set()
  const queue = [entry]
  while (queue.length > 0) {
    const file = queue.shift()
    if (seen.has(file)) continue
    seen.add(file)
    found.push(file)
    let text
    try {
      text = await readFile(file, 'utf8')
    } catch {
      continue
    }
    // ShaderGraph 的子图引用**不是** YAML 字段，而是塞在字符串里的一段 JSON（`m_SerializedSubGraph: '{\"subGraph\":{\"guid\":\"…\"}}'）：
    // 只按 `guid: <hex>` 扫会漏掉整棵 SubGraph，所以先去转义反斜杠，再按两种写法一起扫。
    for (const match of text.replace(/\\/g, '').matchAll(/"?guid"?\s*:\s*"?([0-9a-f]{32})/g)) {
      const target = guidIndex.get(match[1])
      if (target) {
        if (!seen.has(target)) queue.push(target)
      } else if (!/^0{16}e0{15}$/.test(match[1])) {
        // 内置资源（`0000000000000000e000000000000000`）不算未解析；其余多半是包里的脚本（Cinemachine / InputSystem）
        unresolved.add(match[1])
      }
    }
  }
  return { found, unresolved }
}

function parseArgs(argv) {
  const args = { from: '', dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--from') args.from = argv[++i] ?? ''
    else if (argv[i] === '--dry-run') args.dryRun = true
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const sourceRoot = args.from ? resolve(args.from) : ''
  const assetsRoot = sourceRoot ? join(sourceRoot, 'Assets') : ''
  if (!sourceRoot || !existsSync(assetsRoot)) {
    console.error('[input] 请用 --from <来源工程根目录> 指定来源工程（只读）')
    process.exitCode = 1
    return
  }
  const dryRun = args.dryRun
  const report = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: '既有实训软件（只读）',
    dryRun,
    files: [],
    unresolved: [],
    excluded: [],
    notes: [],
  }

  console.log('[input] 建立来源工程 guid 索引（只读）…')
  const sourceGuids = new Map()
  await indexGuids(assetsRoot, sourceGuids)
  console.log('[input] 建立目标工程 guid 索引（用于跳过已搬过的资产）…')
  const targetGuids = new Map()
  if (existsSync(UNITY_ASSETS)) await indexGuids(UNITY_ASSETS, targetGuids)
  console.log(`[input] 来源 guid ${sourceGuids.size} 条 / 目标 guid ${targetGuids.size} 条`)

  // 每条待搬记录：sourceAbs → targetAbs（+ 是否带 .meta）
  const plan = []
  const codeBySourcePath = new Map()
  for (const entry of CODE_ENTRIES) {
    const sourceAbs = join(assetsRoot, entry.from)
    const targetAbs = join(UNITY_ASSETS, entry.to)
    codeBySourcePath.set(sourceAbs, targetAbs)
    plan.push({ ...entry, sourceAbs, targetAbs, withMeta: true })
  }
  for (const entry of PREFAB_ENTRIES) {
    const sourceAbs = join(assetsRoot, entry.from)
    if (!existsSync(sourceAbs)) {
      report.unresolved.push({ guid: '', reason: `预制体不存在：${entry.from}` })
      continue
    }
    plan.push({ ...entry, sourceAbs, targetAbs: join(UNITY_ASSETS, entry.to), withMeta: true })
    const { found, unresolved } = await closure(sourceAbs, sourceGuids)
    for (const file of found) {
      if (file === sourceAbs) continue
      if (codeBySourcePath.has(file)) continue // 代码按显式清单走，不按来源相对路径落位
      const rel = relative(assetsRoot, file).split('\\').join('/')
      plan.push({
        from: rel,
        to: rel, // 闭包资产保持来源 `Assets/` 相对路径（与结构件那条链同口径）
        source: 'closure',
        sourceAbs: file,
        targetAbs: join(UNITY_ASSETS, rel),
        withMeta: true,
      })
    }
    for (const guid of unresolved) report.unresolved.push({ guid, usedBy: entry.from })
  }

  // 去重（同一份材质会被两个预制体的闭包各收一次）
  const unique = new Map()
  for (const item of plan) if (!unique.has(item.targetAbs)) unique.set(item.targetAbs, item)

  let copied = 0
  let copiedBytes = 0
  for (const item of unique.values()) {
    const { sourceAbs, targetAbs, withMeta } = item
    const guid = await (async () => {
      const meta = `${sourceAbs}.meta`
      if (!existsSync(meta)) return ''
      return /guid:\s*([0-9a-f]{32})/.exec(await readFile(meta, 'utf8'))?.[1] ?? ''
    })()
    const size = existsSync(sourceAbs) ? (await stat(sourceAbs)).size : 0
    const record = {
      from: relative(sourceRoot, sourceAbs).split('\\').join('/'),
      path: relative(repoRoot, targetAbs).split('\\').join('/'),
      source: item.source,
      bytes: size,
      sha256: existsSync(sourceAbs) ? await sha256(sourceAbs) : '',
      status: 'copied',
    }

    if (!existsSync(sourceAbs)) record.status = 'missing'
    else if (guid && targetGuids.has(guid)) record.status = 'already-in-project'
    else if (existsSync(targetAbs)) record.status = 'exists'

    if (record.status === 'copied' && !dryRun) {
      await mkdir(dirname(targetAbs), { recursive: true })
      await copyFile(sourceAbs, targetAbs)
      if (withMeta && existsSync(`${sourceAbs}.meta`)) await copyFile(`${sourceAbs}.meta`, `${targetAbs}.meta`)
      if (guid) targetGuids.set(guid, targetAbs)
    }
    if (record.status === 'copied') {
      copied++
      copiedBytes += size
    }
    report.files.push(record)
  }

  // 行为规格文档：原文照录（不带 .meta —— 它只供人/Agent 对照，不进构建）
  const docs = []
  async function walkDocs(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        await walkDocs(full)
        continue
      }
      if (!entry.name.endsWith('.md')) continue
      const rel = relative(join(assetsRoot, SRC), full)
      const target = join(DOCS_TARGET, rel)
      docs.push({ from: relative(sourceRoot, full).split('\\').join('/'), to: relative(repoRoot, target).split('\\').join('/') })
      if (!dryRun) {
        await mkdir(dirname(target), { recursive: true })
        await copyFile(full, target)
      }
    }
  }
  const docsSource = join(assetsRoot, SRC)
  if (existsSync(docsSource)) await walkDocs(docsSource)
  report.docs = docs

  report.excluded = [
    { item: '来源工程的管理器/工具/事件骨架（GlobalInputMgr / GlobalCameraMgr / GlobalAssetsMgr / Log / 事件总线）', reason: '按既有边界只搬单个交互脚本的算法；管理器职责由本工程组件重新承载（docs/design/11）' },
    { item: '搬入的 .cs 的命名空间与依赖改写', reason: '由人手工移植（docs/design/11）；重跑本脚本按 GUID 跳过，不覆盖' },
  ]

  await mkdir(dirname(REPORT), { recursive: true })
  if (!dryRun) await writeFile(REPORT, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  const countOf = (status) => report.files.filter((item) => item.status === status).length
  console.log(`[input] ${dryRun ? '（--dry-run，未写盘）' : ''}待搬 ${report.files.length} 个文件`)
  console.log(`  将写入：${countOf('copied')} 个 / ${(copiedBytes / 1024).toFixed(1)} KB`)
  console.log(`  已有（GUID 相同，跳过）：${countOf('already-in-project')} 个`)
  console.log(`  已存在（文件已在位，未覆盖）：${countOf('exists')} 个`)
  console.log(`  缺失：${countOf('missing')} 个`)
  console.log(`  行为规格文档：${docs.length} 份 → ${relative(repoRoot, DOCS_TARGET).split('\\').join('/')}`)
  if (report.unresolved.length > 0) {
    console.log(`  未解析的引用 ${report.unresolved.length} 条（多半是包里的脚本；见清单 unresolved）`)
  }
  console.log(`  清单：${relative(repoRoot, REPORT).split('\\').join('/')}`)
}

await main()
