#!/usr/bin/env node
/**
 * 从既有实训软件搬运**被采纳**的三维资产（P1-4，清单见 `docs/research/09` §5）。
 *
 * 为什么要有脚本而不是手工拷：这批资产是"从别人工程里挑一部分"，
 * 手工拷的结果是**没人能复现、也没人知道漏了哪个**。脚本让"搬了哪些、来自哪、多大、指纹是什么"
 * 变成一份可评审的产物（`content/asset-import-report.json`）。
 *
 * 用法：
 *   node tools/pipeline/import-adopted-assets.mjs --from <来源工程根目录> --dry-run   # 只报告，不写盘
 *   node tools/pipeline/import-adopted-assets.mjs --from <来源工程根目录>              # 真搬
 *   node tools/pipeline/import-adopted-assets.mjs --from <…> --only contactor,breaker  # 只搬某几个器件
 *
 * **搬什么**（由**内容数据**驱动，不是手写清单）：
 *   · `ProjectData.json` 里每个 clip 用到的 `prefabKey` → 该包配置指向的**模型 prefab** →
 *     顺着 GUID 依赖取出 **FBX + PBR 贴图**（BaseColor / AO-GLoss / Normal）；
 *   · `images[]` → 该包的 assetPath 指向的**原理图 PNG**（8 器件 × 6 张）。
 *
 * **明确不搬**（`research/09` §5 的剔除项 + 本工程的取舍）：
 *   · `.mat` 与自制 ShaderGraph —— 依赖来源工程的自制 Shader，本工程改用重做的 URP 材质；
 *   · `.anim`（结构拆装动画，12 个/器件 ≈ 3 MB）—— 是否重建见 `docs/PLAN.md` P2-6d，先不搬；
 *   · `.cs` / TMP 字体 / PSD / 演示帧 / 未压缩背景大图。
 *
 * **落点**（`docs/design/03-layout-and-assets.md` §5，`.gitignore` 已就位）：
 *   · FBX + 贴图 → `NewStructureUnity/Assets/Models/<器件>/`（Unity 必须放进自己的 Assets/；Plastic 管）
 *   · 原理图 PNG → `NewStructureUnity/Assets/Sprites/Content/<器件>/`（供 Unity）
 *              ＋ `web/public/content/sprites/<器件>/`（供 Web，体积小，进 git）
 *   · 每个资产**连同 `.meta` 一起拷**：保留来源工程的导入设置（法线贴图的 NormalMap 标记、
 *     FBX 的缩放/轴转换）—— 不带 .meta 的话贴图会被当普通颜色图，法线贴图直接是错的。
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
const REPORT = join(repoRoot, 'content/asset-import-report.json')

/** 搬进来的模型与贴图放这里（Unity 只能从自己的 Assets/ 导入）。 */
const UNITY_MODELS = join(repoRoot, 'NewStructureUnity/Assets/Models')
const UNITY_SPRITES = join(repoRoot, 'NewStructureUnity/Assets/Sprites/Content')
const WEB_SPRITES = join(repoRoot, 'web/public/content/sprites')

/** 模型闭包里只取这些扩展名（其余是被剔除的材质/动画/脚本/自制 shader）。 */
const KEEP_EXTENSIONS = new Set(['.fbx', '.png', '.jpg', '.jpeg', '.tga', '.tif', '.tiff'])

/**
 * 单个图片超过这个体积就**不搬**：来源工程里 20~47 MB 的图都是未压缩背景大图
 * （`research/09` §5 明确剔除）。用体积而不是路径去判，是因为背景图散落在几处，
 * 而"几十 MB 的单张图"这条特征很稳。
 */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024

/** 器件自己的模型目录（`…/Element/Show/<器件>/`）里的文件**按器件分目录**，其余进 `_shared/`。 */
function isDeviceScoped(sourceFile) {
  return /[\\/]Element[\\/]Show[\\/]/.test(sourceFile)
}

function parseArgs(argv) {
  const args = { from: '', dryRun: false, only: [], force: false }
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (token === '--from') args.from = argv[++i]
    else if (token === '--only') args.only = String(argv[++i] ?? '').split(',').map((s) => s.trim()).filter(Boolean)
    else if (token === '--dry-run') args.dryRun = true
    else if (token === '--force') args.force = true
    else if (token === '--help' || token === '-h') args.help = true
  }
  return args
}

const HELP = `用法：node tools/pipeline/import-adopted-assets.mjs --from <来源工程根目录> [--dry-run] [--only a,b] [--force]

  --from     既有实训软件的**工程根目录**（含 Assets/），只读，不会被写入
  --dry-run  只打印将要搬什么，不写盘
  --only     只搬指定器件的目录名（例：contactor,breaker）
  --force    目标文件已存在也覆盖（默认跳过并报告，避免悄悄改写已经改过的资产）
`

/** YAML 标量：可能是带引号的字符串，含 \uXXXX 转义（来源工程的 assetPath 就是这样）。 */
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

/** 读包配置：`Resources/Config/ContentPackages/AB_<key>.asset`。 */
async function readPackage(assetsRoot, key) {
  const file = join(assetsRoot, 'Resources/Config/ContentPackages', `AB_${key}.asset`)
  if (!existsSync(file)) return null
  const text = await readFile(file, 'utf8')
  return {
    id: yamlString(/(?:^|\n)\s*id:\s*(.*)/.exec(text)?.[1]),
    clipId: yamlString(/clipId:\s*(.*)/.exec(text)?.[1]),
    assetKind: Number(/assetKind:\s*(\d+)/.exec(text)?.[1] ?? -1),
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
    for (const match of text.matchAll(/guid:\s*([0-9a-f]{32})/g)) {
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
 * 复制一个资产**连同它的 `.meta`**（保留导入设置：法线贴图的 NormalMap 标记、FBX 的缩放/轴转换）。
 *
 * `withMeta: false` 用于 **Web 侧**：那边是 `web/public/`，Unity 的 `.meta` 在那儿纯属垃圾文件。
 */
async function copyWithMeta(sourceFile, targetFile, options) {
  const { dryRun, force, report, sourceRoot, planned, withMeta = true } = options
  const meta = `${sourceFile}.meta`
  for (const [from, to] of [
    [sourceFile, targetFile],
    ...(withMeta && existsSync(meta) ? [[meta, `${targetFile}.meta`]] : []),
  ]) {
    const entry = {
      from: relative(sourceRoot, from).split('\\').join('/'),
      path: relative(repoRoot, to).split('\\').join('/'),
      bytes: (await stat(from)).size,
      sha256: await sha256(from),
    }
    // 同一目标在**本次批次**里可能被多个槽位用到（例如一张贴图同属 info 与 structure 模型）。
    // dry-run 不落盘，用 `existsSync` 判断会把同一个文件重复计入，所以先按"本次已计划"去重。
    if (planned.has(to)) {
      report.files.push({ ...entry, status: 'duplicate' })
      continue
    }
    // 先登记再判"是否已存在"：否则第二个用到同一目标的槽位会被记成"已存在"，
    // 清单里就会出现同一个路径两条"已存在"，数字对不上（踩过）
    planned.add(to)
    if (existsSync(to) && !force) {
      // 已存在 = 上次搬过了（重跑必须幂等，且**不能**悄悄覆盖别人改过的资产）
      report.files.push({ ...entry, status: 'exists' })
      continue
    }
    if (!dryRun) {
      await mkdir(dirname(to), { recursive: true })
      await cp(from, to)
    }
    report.files.push({ ...entry, status: dryRun ? 'planned' : 'copied' })
  }
}

/** 一个 clip 的资产键：模型 3 个（info/Structure/Inspection）+ 原理图若干。 */
function keysOfClip(clip) {
  const modelKeys = [
    clip.taskInfoData?.prefabKey,
    clip.taskStructureData?.prefabKey,
    clip.taskInspectionData?.prefabKey,
  ].filter(Boolean)
  const spriteKeys = (clip.taskInfoData?.images ?? []).filter(Boolean)
  return { modelKeys: [...new Set(modelKeys)], spriteKeys: [...new Set(spriteKeys)] }
}

/** 器件目录名 = 数据里的键前缀（`contactor_structure_model` → `contactor`）。 */
function deviceOf(key) {
  return key.split('_')[0]
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

  console.log('[assets] 建立 guid 索引（只读来源工程）…')
  const guidIndex = new Map()
  await indexGuids(assetsRoot, guidIndex)
  console.log(`[assets] guid 索引 ${guidIndex.size} 条`)

  const clips = JSON.parse(await readFile(DATA_FILE, 'utf8')).clips ?? []
  const report = {
    generatedAt: new Date().toISOString(),
    dryRun: args.dryRun,
    from: sourceRoot,
    /** 目标文件的**全量清单**（重跑也产出完整清单，而不是只记本次动作）+ 本次状态 */
    files: [],
    /** 按剔除项跳过的来源文件（如未压缩背景大图） */
    excluded: [],
    /** 内容数据要求、但来源工程里找不到的资产 */
    missing: [],
  }
  /** 已计划写入的目标路径（本次批次内去重，见 `copyWithMeta`） */
  const planned = new Set()

  for (const clip of clips) {
    const { modelKeys, spriteKeys } = keysOfClip(clip)
    const devices = [...new Set([...modelKeys, ...spriteKeys].map(deviceOf))]
    if (args.only.length > 0 && !devices.some((device) => args.only.includes(device))) continue
    console.log(`\n[assets] ${clip.id}：模型 ${modelKeys.length} 个 / 原理图 ${spriteKeys.length} 张`)

    for (const key of modelKeys) {
      const device = deviceOf(key)
      const pkg = await readPackage(assetsRoot, key)
      if (!pkg || !pkg.assetPath) {
        report.missing.push({ key, reason: '没有对应包配置' })
        continue
      }
      const entry = join(sourceRoot, pkg.assetPath)
      if (!existsSync(entry)) {
        report.missing.push({ key, reason: `包配置指向的文件不存在：${pkg.assetPath}` })
        continue
      }
      // 模型闭包：只留 FBX 与贴图，其余（.mat / .shadergraph / .anim / .cs）按剔除项跳过
      const closureFiles = (await closure(entry, guidIndex)).filter((file) =>
        KEEP_EXTENSIONS.has(extname(file).toLowerCase()),
      )
      // 闭包**收不全贴图**：prefab 里会覆盖材质（指向别的 `.mat`），于是 FBX 自己的三张 PBR 贴图
      // 根本不在依赖链上（实测 `contactor_inspection_model` 就是这样，`NewACContactor` 的贴图全漏）。
      // 我们要的是计划里那句"FBX **+ 配套贴图**"，所以按**同名前缀**把兄弟贴图补进来。
      const files = [...closureFiles]
      const seen = new Set(closureFiles.map((file) => file.toLowerCase()))
      for (const fbx of closureFiles.filter((file) => extname(file).toLowerCase() === '.fbx')) {
        const stem = basename(fbx, extname(fbx))
        const dir = dirname(fbx)
        for (const sibling of await readdir(dir)) {
          const full = join(dir, sibling)
          if (!KEEP_EXTENSIONS.has(extname(sibling).toLowerCase())) continue
          if (extname(sibling).toLowerCase() === '.fbx') continue
          if (!sibling.toLowerCase().startsWith(`${stem.toLowerCase()}_`)) continue
          if (seen.has(full.toLowerCase())) continue
          seen.add(full.toLowerCase())
          files.push(full)
        }
      }
      let bytes = 0
      let count = 0
      for (const file of files) {
        const size = (await stat(file)).size
        if (size >= MAX_IMAGE_BYTES) {
          report.excluded.push({
            from: relative(sourceRoot, file).split('\\').join('/'),
            bytes: size,
            reason: '单张图 ≥10 MB：未压缩背景大图（P1-4 剔除项）',
          })
          continue
        }
        const target = isDeviceScoped(file)
          ? join(UNITY_MODELS, device, basename(file))
          : join(UNITY_MODELS, '_shared', relative(assetsRoot, file))
        await copyWithMeta(file, target, { ...args, report, sourceRoot, planned })
        bytes += size
        count += 1
      }
      console.log(`  · ${key.padEnd(34)} → Assets/Models/${device}/  ${count} 个文件 ${(bytes / 1024 / 1024).toFixed(2)} MB`)
    }

    for (const key of spriteKeys) {
      const device = deviceOf(key)
      const pkg = await readPackage(assetsRoot, key)
      if (!pkg || !pkg.assetPath) {
        report.missing.push({ key, reason: '没有对应包配置' })
        continue
      }
      const source = join(sourceRoot, pkg.assetPath)
      if (!existsSync(source)) {
        report.missing.push({ key, reason: `包配置指向的文件不存在：${pkg.assetPath}` })
        continue
      }
      const name = basename(source)
      await copyWithMeta(source, join(UNITY_SPRITES, device, name), { ...args, report, sourceRoot, planned })
      await copyWithMeta(source, join(WEB_SPRITES, device, name), {
        ...args,
        report,
        sourceRoot,
        planned,
        withMeta: false,
      })
    }
  }

  if (!args.dryRun) {
    await mkdir(dirname(REPORT), { recursive: true })
    await writeFile(REPORT, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  }

  const countOf = (status) => report.files.filter((item) => item.status === status).length
  const written = report.files.filter((item) => item.status === 'copied' || item.status === 'planned')
  const totalBytes = written.reduce((sum, item) => sum + item.bytes, 0)
  console.log('\n================ 搬运摘要 ================')
  console.log(
    `${args.dryRun ? '将复制' : '本次复制'}：${written.length} 个文件 / ${(totalBytes / 1024 / 1024).toFixed(1)} MB` +
      `（其中资产 ${written.filter((item) => !item.path.endsWith('.meta')).length} 个 + .meta）`,
  )
  console.log(`已存在：${countOf('exists')} 个（上次搬过；不改写。要覆盖加 --force）`)
  console.log(`重复：  ${countOf('duplicate')} 个（多个槽位共用同一资产，本次只落一份）`)
  console.log(`清单：  共 ${report.files.length} 条 / 唯一目标 ${new Set(report.files.map((item) => item.path)).size} 个`)
  console.log(`剔除：  ${report.excluded.length} 个（按剔除项，如未压缩大图）`)
  console.log(`缺失：  ${report.missing.length}`)
  for (const item of report.excluded) console.log(`  – ${item.from}（${(item.bytes / 1024 / 1024).toFixed(1)} MB）`)
  for (const item of report.missing) console.error(`  ✗ ${item.key}：${item.reason}`)
  console.log(args.dryRun ? '（--dry-run：没有写盘）' : `报告：${relative(repoRoot, REPORT)}`)
  console.log('提醒：Assets/Models 与 content/assets 不进 git（DEC-57）；Unity 侧资产由 Plastic 管。')
}

await main()
