#!/usr/bin/env node
/**
 * 从既有实训软件搬运**结构任务（`Structure` = TaskType 8，Unity 线）**所需的资产。
 *
 * 为什么单独一条链（不和 `import-adopted-assets.mjs` 合并）：那条链服务的是**两条线共用的几何**
 * （FBX + PBR 贴图，进 Blender 转 GLB 给 Three.js），它当时**明确剔除**了 `.mat` / 自制 ShaderGraph / `.anim`。
 * 结构任务是**只在 Unity 里表现**的，它要的恰好就是被剔除的那几样：结构件预制体、拆装动画、自制材质与它的 Shader。
 * 混在一条链里会让"进 Three 的资产"和"只进 Unity 的资产"分不开，判据（要不要过一次 Blender、要不要带 .meta）也不一样。
 *
 * 用法：
 *   node tools/pipeline/import-structure-assets.mjs --from <来源工程根目录> --dry-run   # 只报告，不写盘
 *   node tools/pipeline/import-structure-assets.mjs --from <来源工程根目录>              # 真搬
 *   node tools/pipeline/import-structure-assets.mjs --from <…> --only contactor,fuse    # 只搬某几个器件
 *   node tools/pipeline/import-structure-assets.mjs --from <…> --with-plugins-demo       # 连插件 Demo/Documentation 一起搬
 *
 * **搬什么**（数据驱动 + 依赖闭包，不是手写文件清单）：
 *   ① 8 个结构件预制体：`ProjectData.json` 的 `taskStructureData.prefabKey` → 该包配置的 `assetPath`
 *      （`Assets/Prefabs/Models/StructureObjs/<key>.prefab`）；
 *   ② 每个器件的**全部材质**：`Assets/Model/Element/Show/<器件>/Materials/*.mat`
 *      —— 不能只靠 ① 的闭包：`timeRelay_structure_model` 的零件是**嵌套 FBX 预制体实例**，
 *      它身上的材质根本不在闭包链上（与 `import-adopted-assets.mjs` 头部记的"闭包收不全贴图"是同一类坑）；
 *   ③ ② 与 ① 顺着 GUID 走出来的**整个依赖闭包**：材质 → 自制 ShaderGraph（含 SubGraph）→ 贴图；
 *      预制体 → 46 段结构拆装动画（`Assets/Animation/Model/Structure/*.anim`）；
 *   ④ HighlightPlus 插件（结构件的悬停高亮靠它）——**整目录**搬，不走闭包（插件内部靠约定，不靠引用）。
 *
 * **不搬**（清单里会明确记为待办，不是漏掉）：
 *   · `.cs` —— 源工程的 `StructureTaskObj` / `InstControlledManager` 依赖旧工程基类（`MCV_Module`、`HighlightPlus` 门面），
 *     搬进来只会让整个工程编译不过。它们承载的**业务数据**（零件名、步骤表）留在预制体/清单里，
 *     由本工程自己的组件与 `StepManager` 重新承载（口径见本轮对话，实现待"实例化"环节）。
 *
 * **落点**（`docs/design/03-layout-and-assets.md` §5 / §7）：
 *   · 器件材质 → `NewStructureUnity/Assets/Models/<器件>/Materials/<名>.mat`
 *     **接管（D-26 嫁接口径）**：目标已存在（Unity 从 FBX 自动抽出的同名材质）时**不覆盖 `.meta`**（GUID 保留，
 *     FBX 内部绑定不断），只把源材质 `m_Shader:` 之后的 shader / 关键字 / 属性**移植**进目标文件；
 *     目标不存在（新材质）时才整份拷贝（连 `.meta`）。
 *     自动抽出的那份 GUID 不同，只有按下述规则放到同名位才会被 FBX 重导时复用。
 *   · 其余全部**保持来源工程的 `Assets/` 相对路径**（如 `Assets/Prefabs/Models/StructureObjs/`、
 *     `Assets/Animation/Model/Structure/`、`Assets/Plugins/HighlightPlus/`）——路径可预测、重跑幂等，
 *     也方便与来源工程的包配置（`bundleName` / `assetPath`）逐字对上，给后面打 AB 包用。
 *
 * 两条硬规矩：
 *   1. **资产连同 `.meta` 一起拷**：GUID 必须保持与来源一致，否则源预制体里的引用全部变成 Missing；
 *   2. **GUID 已在目标工程里的资产不重复搬**（FBX 与 PBR 贴图 P1-4 已就位），跳过并在清单里记 `already-in-project`。
 *
 * 纪律：只读来源工程（**绝不写入**）；不打开 Unity；不碰 git / Plastic（提交由人按批次做）。
 */
import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { basename, dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const DATA_FILE = join(repoRoot, 'web/public/content/data/ProjectData.json')
const SPEC_FILE = join(repoRoot, 'content/asset-material-spec.json')
const REPORT = join(repoRoot, 'content/asset-structure-report.json')

const UNITY = join(repoRoot, 'NewStructureUnity')
const UNITY_ASSETS = join(UNITY, 'Assets')

/** 来源工程里 HighlightPlus 插件的位置（相对 `Assets/`）。 */
const PLUGIN_REL = 'Plugins/HighlightPlus'
/** 插件里这两个子目录是演示与文档，不进产品（`--with-plugins-demo` 可带上）。 */
const PLUGIN_OPTIONAL = new Set(['Demo', 'Documentation'])

/**
 * 单张**位图**超过这个体积就不搬（来源工程里的大图都是 20~47 MB，判据与 P1-4 一致）。
 *
 * ⚠️ 只对**位图**生效，不要推广到所有资产类型：这个阈值在 P1-4 的语境里是"未压缩背景照片"，
 * 而 `Model/Cubicmap/Chrome05.cubemap`（12 MB）是四个 `*_Metal` 材质的**反射环境依赖**，
 * 按"≥10 MB 一律剔除"会静默把材质弄坏（第一次跑就踩到了）。
 */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.tga', '.tif', '.tiff', '.psd'])

function parseArgs(argv) {
  const args = { from: '', dryRun: false, only: [], force: false, withPluginsDemo: false, report: '' }
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (token === '--from') args.from = argv[++i]
    else if (token === '--only') args.only = String(argv[++i] ?? '').split(',').map((s) => s.trim()).filter(Boolean)
    else if (token === '--dry-run') args.dryRun = true
    else if (token === '--force') args.force = true
    else if (token === '--report') args.report = String(argv[++i] ?? '')
    else if (token === '--with-plugins-demo') args.withPluginsDemo = true
    else if (token === '--help' || token === '-h') args.help = true
  }
  return args
}

const HELP = `用法：node tools/pipeline/import-structure-assets.mjs --from <来源工程根目录> [--dry-run] [--only a,b] [--force] [--report <path>] [--with-plugins-demo]

  --from               既有实训软件的**工程根目录**（含 Assets/），只读，不会被写入
  --dry-run            只打印将要搬什么，不写盘
  --only               只搬指定器件（用我们这边的英文目录名，例：contactor,fuse）
  --force              连"目标已存在同名文件"的部分也覆盖（默认只覆盖**器件材质**这一类，其余跳过并报告）
  --report             清单落点（默认 content/asset-structure-report.json）；**dry-run 时想留证据也用它**
  --with-plugins-demo  连 HighlightPlus 的 Demo / Documentation 一起搬（默认不搬，约 9.4 MB）
`

/** YAML 标量：可能是带引号的字符串，含 \\uXXXX 转义（来源工程的 assetPath 就是这样）。 */
function yamlString(raw) {
  if (raw === undefined) return ''
  let value = raw.trim()
  if (value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1).replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    )
  }
  return value
}

/** 读包配置：`Resources/Config/ContentPackages/AB_<key>.asset`（同时是打 AB 包的依据，记进清单）。 */
async function readPackage(assetsRoot, key) {
  const file = join(assetsRoot, 'Resources/Config/ContentPackages', `AB_${key}.asset`)
  if (!existsSync(file)) return null
  const text = await readFile(file, 'utf8')
  return {
    id: yamlString(/(?:^|\n)\s*id:\s*(.*)/.exec(text)?.[1]),
    clipId: yamlString(/clipId:\s*(.*)/.exec(text)?.[1]),
    bundleName: yamlString(/bundleName:\s*(.*)/.exec(text)?.[1]),
    assetPath: yamlString(/assetPath:\s*(.*)/.exec(text)?.[1]),
  }
}

/** 建立 guid → 资产路径 的索引（来源工程只读）。 */
async function indexGuids(dir, map) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      await indexGuids(full, map)
      continue
    }
    if (!entry.name.endsWith('.meta')) continue
    const match = /guid:\s*([0-9a-f]{32})/.exec(await readFile(full, 'utf8'))
    if (match) map.set(match[1], full.slice(0, -'.meta'.length))
  }
}

/** 目标工程已有的 GUID（用来跳过 P1-4 已搬过的 FBX / 贴图）。 */
async function indexTargetGuids() {
  const map = new Map()
  if (existsSync(UNITY_ASSETS)) await indexGuids(UNITY_ASSETS, map)
  return map
}

/** 顺着 guid 引用做广度优先，取回整个依赖闭包（入口文件自身也在内）。 */
async function closure(entry, guidIndex) {
  const seen = new Set()
  const found = []
  const queue = [entry]
  while (queue.length > 0) {
    const file = queue.shift()
    if (seen.has(file) || !existsSync(file)) continue
    seen.add(file)
    found.push(file)
    let text
    try {
      text = await readFile(file, 'utf8')
    } catch {
      continue
    }
    // ShaderGraph 的子图引用**不是** YAML 字段，而是塞在字符串里的一段 JSON：
    //   m_SerializedSubGraph: '{\"subGraph\":{\"fileID\":-…,\"guid\":\"<32hex>\",\"type\":3}}'
    // 只按 `guid: <hex>` 扫会**漏掉整棵 SubGraph**（第一版就漏了 `DirtMaskShaderFunction`）。
    // 所以先把转义反斜杠去掉，再按 `guid:"<hex>"` / `guid: <hex>` 两种形式一起扫。
    for (const match of text.replace(/\\/g, '').matchAll(/"?guid"?\s*:\s*"?([0-9a-f]{32})/g)) {
      const target = guidIndex.get(match[1])
      if (target && !seen.has(target) && extname(target) !== '') queue.push(target)
    }
  }
  return found
}

async function sha256(file) {
  return createHash('sha256').update(await readFile(file)).digest('hex')
}

/**
 * 登记一条"剔除 / 待办"。**按来源路径去重**：同一份脚本会被 8 个器件的闭包各收一次，
 * 不去重的话清单里会出现 8 条一模一样的 `StructureTaskObj.cs`（第一次跑就是这样）。
 */
function addExcluded(report, entry) {
  if (report.excluded.some((item) => item.from === entry.from)) return
  report.excluded.push(entry)
}

/** 扩展名 → 清单里的类别（只影响报告可读性，不影响搬运）。 */
function kindOf(file) {
  const ext = extname(file).toLowerCase()
  if (ext === '.prefab') return 'prefab'
  if (ext === '.anim') return 'animation'
  if (ext === '.mat') return 'material'
  if (ext === '.shadergraph') return 'shader'
  if (ext === '.shadersubgraph') return 'subgraph'
  if (['.png', '.jpg', '.jpeg', '.tga', '.tif', '.tiff', '.exr', '.hdr'].includes(ext)) return 'texture'
  if (ext === '.cubemap') return 'cubemap'
  if (['.fbx', '.obj', '.blend'].includes(ext)) return 'model'
  if (ext === '.cs') return 'script'
  if (ext === '.asset') return 'asset'
  return 'other'
}

/** 来源器件中文目录名 → 本工程英文目录名（真源是 `content/asset-material-spec.json`，不在这里写第二份）。 */
async function deviceFolders() {
  const spec = JSON.parse(await readFile(SPEC_FILE, 'utf8'))
  const map = new Map()
  for (const [en, device] of Object.entries(spec.devices ?? {})) {
    if (device?.sourceFolder) map.set(device.sourceFolder, en)
  }
  return map
}

/**
 * 目标路径。**器件目录下**的资产改道到 P1-4 已经使用的 `Assets/Models/<器件>/`：
 *   · `<器件>/Materials/x.mat` → `Assets/Models/<器件>/Materials/x.mat`（**接管** Unity 自动抽出的同名材质）；
 *   · `<器件>/x.png` 等 → `Assets/Models/<器件>/x.png`（与 P1-4 搬进来的贴图同处一室）。
 * 其余一律保持来源工程 `Assets/` 下的相对路径（Shaders / Plugins / Prefabs / Animation）。
 */
function targetOf(absFile, assetsRoot, folders) {
  const rel = relative(assetsRoot, absFile).split('\\').join('/')
  const scoped = /^Model\/Element\/Show\/([^/]+)\/(.+)$/.exec(rel)
  if (scoped) {
    const en = folders.get(scoped[1])
    if (en) {
      const isMaterial = scoped[2].startsWith('Materials/')
      return {
        path: join(UNITY_ASSETS, 'Models', en, scoped[2]),
        kind: kindOf(absFile),
        replace: isMaterial,
      }
    }
  }
  // 其余 `Model/**`（多器件共用 / 房间 / 立方体贴图）→ `Assets/Models/_shared/Model/…`，
  // 与 P1-4 的 `_shared/` 约定一致 —— 否则工程里会多出一个 `Assets/Model/`（与 `Assets/Models/` 只差一个字母，
  // 而且它不在 `.gitignore` 的忽略范围内，一个 12 MB 的 cubemap 会直接撞上 git 的大文件门禁）。
  const underModel = /^Model\/(.+)$/.exec(rel)
  if (underModel) {
    return {
      path: join(UNITY_ASSETS, 'Models', '_shared', 'Model', underModel[1]),
      kind: kindOf(absFile),
      replace: false,
    }
  }
  return { path: join(UNITY_ASSETS, rel), kind: kindOf(absFile), replace: false }
}

/**
 * 材质"嫁接"（D-26 / 根治 DEC-115 的后续）：**保留目标 .mat 的 GUID（不动 `.meta`）**，
 * 只把源材质 `m_Shader:` 之后的整段（shader 引用 / 关键字 / `m_SavedProperties`）移植进目标文件。
 * 这样 Unity 自动抽出的材质还是那一份（FBX 内部绑定不断），但 shader 与属性变成源工程的对的值。
 * 结构不合（任一侧没有 `m_Shader:`）返回 null，调用方退回整体覆盖。
 */
function graftMaterial(targetText, sourceText) {
  const tailOf = (text) => {
    const i = text.indexOf('m_Shader:')
    return i < 0 ? null : text.slice(i)
  }
  const tail = tailOf(sourceText)
  const head = targetText.indexOf('m_Shader:')
  if (tail === null || head < 0) return null
  return targetText.slice(0, head) + tail
}

/** 复制一个资产**连同它的 `.meta`**（GUID 必须跟着走，否则引用全断）。
 *  ⚠️ 例外：器件材质"接管"目标已存在的同名材质时走**嫁接**（见 {@link graftMaterial}）——
 *  `.meta` 不覆盖、GUID 保留，根治"FBX 内部绑定悬空"（D-26）。 */
async function copyWithMeta(sourceFile, targetFile, options) {
  const { dryRun, force, replace, kind, report, sourceRoot, planned, alreadyInProject, plugin } = options
  const meta = `${sourceFile}.meta`
  // 嫁接条件：接管型材质 + 目标已存在（= 抽出的材质在位）+ 目标自己的 .meta 在位（GUID 有得保）
  const grafting = kind === 'material' && replace && existsSync(targetFile) && existsSync(`${targetFile}.meta`)
  for (const [from, to] of [
    [sourceFile, targetFile],
    ...(existsSync(meta) && !grafting ? [[meta, `${targetFile}.meta`]] : []),
  ]) {
    const entry = {
      from: relative(sourceRoot, from).split('\\').join('/'),
      path: relative(repoRoot, to).split('\\').join('/'),
      kind,
      ...(plugin ? { plugin } : {}),
      bytes: (await stat(from)).size,
      sha256: await sha256(from),
    }
    if (planned.has(to)) {
      report.files.push({ ...entry, status: 'duplicate' })
      continue
    }
    planned.add(to)
    const overwrite = force || replace
    // ⚠️ "目标原来存不存在" 必须在**写之前**取：写在后面取，刚拷完的文件永远返回 true，
    // 于是每一份都被记成 `replaced`（第一次跑就是这么错的 —— 摘要里 268 个全成了"覆盖"）。
    const existedBefore = existsSync(to)
    if (existedBefore && !overwrite) {
      report.files.push({ ...entry, status: alreadyInProject ? 'already-in-project' : 'exists' })
      continue
    }
    if (!dryRun) {
      await mkdir(dirname(to), { recursive: true })
      if (grafting && to === targetFile) {
        const grafted = graftMaterial(await readFile(to, 'utf8'), await readFile(from, 'utf8'))
        if (grafted === null) await cp(from, to) // 结构不合：退回整体覆盖（旧行为）
        else await writeFile(to, grafted)
      } else {
        await cp(from, to)
      }
    }
    const status = grafting && to === targetFile
      ? dryRun ? (existedBefore ? 'would-graft' : 'planned') : 'grafted'
      : dryRun ? (existedBefore ? 'would-replace' : 'planned') : existedBefore ? 'replaced' : 'copied'
    report.files.push({ ...entry, status })
  }
}

/** 整目录搬（插件用：内部靠约定不靠引用，闭包扫不全）。 */
async function copyTree(sourceDir, targetDir, options) {
  const entries = await readdir(sourceDir, { withFileTypes: true })
  for (const entry of entries) {
    const from = join(sourceDir, entry.name)
    const to = join(targetDir, entry.name)
    if (entry.isDirectory()) {
      if (PLUGIN_OPTIONAL.has(entry.name) && !options.withPluginsDemo) {
        addExcluded(options.report, {
          from: relative(options.sourceRoot, from).split('\\').join('/'),
          reason: '插件自带的 Demo / Documentation，不进产品（--with-plugins-demo 可带上）',
        })
        continue
      }
      await copyTree(from, to, options)
      continue
    }
    if (entry.name.endsWith('.meta')) continue // 资产自身那一轮已经连 .meta 一起拷过
    await copyWithMeta(from, to, { ...options, kind: kindOf(from), replace: false })
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help || !args.from) {
    process.stdout.write(HELP)
    process.exitCode = args.help ? 0 : 1
    return
  }

  const sourceRoot = resolve(args.from)
  const assetsRoot = join(sourceRoot, 'Assets')
  if (!existsSync(assetsRoot)) {
    console.error(`来源工程里没有 Assets/：${assetsRoot}`)
    process.exitCode = 1
    return
  }
  if (!existsSync(DATA_FILE)) {
    console.error(`找不到内容数据：${DATA_FILE}（本脚本按内容数据决定搬什么）`)
    process.exitCode = 1
    return
  }

  console.log('[structure] 建立来源工程 guid 索引（只读）…')
  const sourceGuids = new Map()
  await indexGuids(assetsRoot, sourceGuids)
  console.log(`[structure] 来源 guid ${sourceGuids.size} 条`)

  console.log('[structure] 建立目标工程 guid 索引（用于跳过已搬过的资产）…')
  const targetGuids = new Map()
  if (existsSync(UNITY_ASSETS)) await indexGuids(UNITY_ASSETS, targetGuids)
  console.log(`[structure] 目标 guid ${targetGuids.size} 条`)

  const folders = await deviceFolders()
  const clips = JSON.parse(await readFile(DATA_FILE, 'utf8')).clips ?? []

  const report = {
    generatedAt: new Date().toISOString(),
    dryRun: args.dryRun,
    from: sourceRoot,
    /** 数据驱动的入口：每个结构件 = 一条包配置（`bundleName` 就是将来 AB 的包名） */
    entries: [],
    /** 目标文件**全量清单** + 本次状态 */
    files: [],
    /** 明确不搬的（脚本：依赖旧工程基类；插件 Demo 等） */
    excluded: [],
    /** 内容数据要求、来源工程里找不到的 */
    missing: [],
    /** 搬了但要留意的（如 ≥10 MB 的非位图资产：是真实依赖，不是背景大图） */
    notes: [],
  }
  const planned = new Set()

  for (const clip of clips) {
    const key = clip.taskStructureData?.prefabKey
    if (!key) continue
    const device = key.split('_')[0]
    if (args.only.length > 0 && !args.only.includes(device)) continue

    const pkg = await readPackage(assetsRoot, key)
    report.entries.push({
      prefabKey: key,
      device,
      bundleName: pkg?.bundleName ?? '',
      assetPath: pkg?.assetPath ?? '',
      taskActive: clip.taskStructureData?.taskActive !== false,
    })
    if (!pkg || !pkg.assetPath) {
      report.missing.push({ key, reason: '没有对应包配置' })
      continue
    }

    // 入口 ①：结构件预制体
    const entries = [join(sourceRoot, pkg.assetPath)]
    if (!existsSync(entries[0])) {
      report.missing.push({ key, reason: `包配置指向的文件不存在：${pkg.assetPath}` })
      continue
    }
    // 入口 ②：该器件的**全部材质**（闭包扫不到嵌套 FBX 实例身上的材质，见脚本头部说明）
    const sourceFolder = [...folders.entries()].find(([, en]) => en === device)?.[0]
    const materialDir = sourceFolder ? join(assetsRoot, 'Model/Element/Show', sourceFolder, 'Materials') : ''
    if (materialDir && existsSync(materialDir)) {
      for (const name of await readdir(materialDir)) {
        if (name.endsWith('.mat')) entries.push(join(materialDir, name))
      }
    }

    const seen = new Set()
    let copied = 0
    let copiedBytes = 0
    for (const entry of entries) {
      for (const file of await closure(entry, sourceGuids)) {
        if (seen.has(file)) continue
        seen.add(file)
        const kind = kindOf(file)
        if (kind === 'script') {
          addExcluded(report, {
            from: relative(sourceRoot, file).split('\\').join('/'),
            reason: '脚本：依赖旧工程基类（MCV_Module / HighlightPlus 门面），搬进来会导致本工程编译不过；业务数据由我们自己的组件与 StepManager 重新承载',
            pending: true,
          })
          continue
        }
        const size = (await stat(file)).size
        if (size >= MAX_IMAGE_BYTES && IMAGE_EXTENSIONS.has(extname(file).toLowerCase())) {
          addExcluded(report, {
            from: relative(sourceRoot, file).split('\\').join('/'),
            bytes: size,
            reason: '单张**位图** ≥10 MB（未压缩背景大图一类），与 P1-4 同口径剔除',
          })
          continue
        }
        if (size >= MAX_IMAGE_BYTES) {
          // 非位图的大文件（如 12 MB 的反射 cubemap）**照搬**，但记一条"体积留意"（同样按来源去重）
          if (!report.notes.some((item) => item.from === relative(sourceRoot, file).split('\\').join('/'))) {
            report.notes.push({
              from: relative(sourceRoot, file).split('\\').join('/'),
              bytes: size,
              reason: '非位图的 ≥10 MB 资产：是真实材质依赖（如金属件的反射 cubemap），照搬；若要压包体需另行替换',
            })
          }
        }
        const { path: target, kind: targetKind, replace } = targetOf(file, assetsRoot, folders)
        // GUID 已在目标工程里 = 这个资产（连同它的 .meta）上次已经搬过。
        // **必须整份跳过**，不能只在"目标路径已存在"时跳过：P1-4 把 FBX / 贴图落在了
        // `Assets/Models/<器件>/`（不是来源的相对路径），只按路径判断会在 `Assets/Model/…` 下再写一份重复资产。
        const guid = await guidOf(file)
        if (guid && targetGuids.has(guid)) {
          report.files.push({
            from: relative(sourceRoot, file).split('\\').join('/'),
            path: relative(repoRoot, target).split('\\').join('/'),
            kind: targetKind,
            bytes: size,
            sha256: await sha256(file),
            status: 'already-in-project',
          })
          continue
        }
        const before = report.files.length
        await copyWithMeta(file, target, {
          ...args,
          kind: targetKind,
          replace,
          report,
          sourceRoot,
          planned,
          alreadyInProject: false,
        })
        for (const item of report.files.slice(before)) {
          if (item.status === 'copied' || item.status === 'planned' || item.status === 'replaced') {
            copied += 1
            copiedBytes += item.bytes
          }
        }
      }
    }
    console.log(
      `  · ${key.padEnd(34)} → ${pkg.bundleName.padEnd(22)} ${copied} 个文件 ${(copiedBytes / 1024 / 1024).toFixed(2)} MB`,
    )
  }

  // 入口 ③：HighlightPlus 插件（整目录）
  const pluginSource = join(assetsRoot, PLUGIN_REL)
  if (existsSync(pluginSource)) {
    console.log(`\n[structure] HighlightPlus 插件 → ${join('Assets', PLUGIN_REL).split('\\').join('/')}`)
    await copyTree(pluginSource, join(UNITY_ASSETS, PLUGIN_REL), {
      ...args,
      report,
      sourceRoot,
      planned,
      alreadyInProject: false,
      plugin: PLUGIN_REL,
    })
  } else {
    report.missing.push({ key: PLUGIN_REL, reason: '来源工程里找不到 HighlightPlus 插件' })
  }

  const reportPath = args.report ? resolve(args.report) : REPORT
  if (!args.dryRun || args.report) {
    await mkdir(dirname(reportPath), { recursive: true })
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  }

  const countOf = (status) => report.files.filter((item) => item.status === status).length
  // 按**唯一目标**统计（同一份资产会被 8 个器件的闭包各收一次，按条目统计会把体积算成 4~8 倍）
  const byKind = new Map()
  const seenPath = new Set()
  for (const item of report.files) {
    if (seenPath.has(item.path)) continue
    seenPath.add(item.path)
    const bucket = byKind.get(item.kind) ?? { n: 0, bytes: 0 }
    bucket.n += 1
    bucket.bytes += item.bytes
    byKind.set(item.kind, bucket)
  }
  const written = report.files.filter((item) =>
    ['copied', 'planned', 'replaced', 'would-replace'].includes(item.status),
  )
  console.log('\n================ 搬运摘要 ================')
  console.log(`结构件入口：${report.entries.length} 个（${report.entries.map((e) => e.prefabKey).join(', ')}）`)
  console.log(
    `${args.dryRun ? '将复制' : '本次复制/覆盖'}：${written.length} 个文件 / ` +
      `${(written.reduce((sum, item) => sum + item.bytes, 0) / 1024 / 1024).toFixed(1)} MB`,
  )
  for (const [kind, bucket] of [...byKind].sort()) {
    console.log(`  · ${kind.padEnd(10)} 清单 ${String(bucket.n).padStart(3)} 条 / ${(bucket.bytes / 1024 / 1024).toFixed(2)} MB`)
  }
  console.log(`已在目标工程（GUID 相同，跳过）：${countOf('already-in-project')} 个`)
  console.log(`已存在（文件已在位，未覆盖）：${countOf('exists')} 个`)
  console.log(
    `嫁接（GUID 保留，shader/属性移植）：${countOf('grafted') + countOf('would-graft')} 个`,
  )
  console.log(
    `覆盖：${countOf('replaced') + countOf('would-replace')} 个（含嫁接失败退回整体覆盖的情况）`,
  )
  console.log(`剔除/待办：${report.excluded.length} 条 · 缺失：${report.missing.length} 条 · 留意：${report.notes.length} 条`)
  for (const item of report.notes) {
    console.log(`  ! ${item.from}（${(item.bytes / 1024 / 1024).toFixed(1)} MB）—— ${item.reason}`)
  }
  for (const item of report.missing) console.error(`  ✗ ${item.key}：${item.reason}`)
  console.log(args.dryRun ? '（--dry-run：没有写盘）' : `报告：${relative(repoRoot, reportPath)}`)
  if (args.dryRun && args.report) console.log(`（--dry-run 的报告：${relative(repoRoot, reportPath)}）`)
  console.log('提醒：Unity 侧资产由 Plastic 管、git 侧忽略（DEC-57/60）；提交按批次做。')
}

/** 读一个资产的 GUID（没有 .meta 就返回空，交给调用方按"未在目标工程"处理）。 */
async function guidOf(file) {
  const meta = `${file}.meta`
  if (!existsSync(meta)) return ''
  const match = /guid:\s*([0-9a-f]{32})/.exec(await readFile(meta, 'utf8'))
  return match ? match[1] : ''
}

await main()
