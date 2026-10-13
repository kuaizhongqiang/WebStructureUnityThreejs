#!/usr/bin/env node
/**
 * 把 Unity WebGL 构建输出搬进仓库内的**暂存区**，并生成清单（见 docs/design/05）。
 *
 * 用法（DEC-81：**一个构建承载多个 TaskType**）：
 *   node tools/pipeline/unity-stage.mjs --from <Unity 构建输出目录> --key <构建名> --task-types <n,n,...>
 *   node tools/pipeline/unity-stage.mjs --from NewStructureUnity/Builds/webgl --key main --task-types 4,5,8,9
 *
 * 可选：
 *   --extra <目录>   一并搬走构建目录之外的产物（Addressed 内容常在 ServerData/WebGL），复制到暂存产物**根**下
 *   --bridge         声明该构建**实现了协议桥**（会调 __WSU3_BRIDGE__.onReady）。壳冒烟据此决定"是否要求握手成功"
 *   --force          形状校验失败也照搬（仅排查用）
 *
 * 已废弃（仍接受，会告警）：`--task-type <n>` —— 旧口径"一个构建一个任务"；新清单只写 `taskTypes[]`。
 *
 * 行为：
 *   ① 校验源目录**形状正确**（缺 wasm/data 之类直接失败，不搬半份进去）；
 *   ② 复制到 `unity/builds/<key>/`（同名先清空，避免上一版残留文件骗过校验）；
 *   ③ 逐文件算 sha256 + 字节数，写入 `unity/builds/manifest.json`。
 *
 * 纪律：`unity/builds/` **不进 git**（DEC-57）；本脚本不碰 Unity 工程、不调编辑器。
 */
import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { basename, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const STAGE_ROOT = join(repoRoot, 'unity', 'builds')
const MANIFEST = join(STAGE_ROOT, 'manifest.json')

/** 构建输出里必须出现的四种文件（允许 .br / .gz 后缀的预压缩形态）。 */
const REQUIRED = [
  { label: 'loader.js', test: (name) => /\.loader\.js$/.test(name) },
  { label: 'framework.js', test: (name) => /\.framework\.js(\.br|\.gz)?$/.test(name) },
  { label: 'wasm', test: (name) => /\.wasm(\.br|\.gz)?$/.test(name) },
  { label: 'data', test: (name) => /\.data(\.br|\.gz)?$/.test(name) },
]

function parseArgs(argv) {
  const args = { key: '', from: '', taskTypes: [], force: false, bridge: false, extra: [] }
  let legacyTaskType = null
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (token === '--from') args.from = argv[++i]
    else if (token === '--key') args.key = argv[++i]
    else if (token === '--task-types') {
      args.taskTypes.push(
        ...String(argv[++i] ?? '')
          .split(',')
          .map((piece) => piece.trim())
          .filter((piece) => piece !== '')
          .map(Number),
      )
    } else if (token === '--task-type') legacyTaskType = Number(argv[++i])
    else if (token === '--extra') args.extra.push(argv[++i])
    else if (token === '--bridge') args.bridge = true
    else if (token === '--force') args.force = true
    else if (token === '--help' || token === '-h') args.help = true
  }
  if (legacyTaskType !== null && args.taskTypes.length === 0) {
    console.warn(
      '[unity-stage] ⚠️ --task-type 已废弃（DEC-81：一个构建可承载多个 TaskType），本次按单值处理；\n' +
        '             请改用 --task-types 4,5,8,9，清单从此只写 taskTypes[]。\n',
    )
    args.taskTypes.push(legacyTaskType)
  }
  // 去重 + 升序：同一份声明写成什么顺序都得到同一个清单，减少无意义的清单 diff
  args.taskTypes = [...new Set(args.taskTypes)].sort((a, b) => a - b)
  return args
}

const HELP = `用法：node tools/pipeline/unity-stage.mjs --from <目录> --key <构建名> --task-types <n,n,...>

  --from        Unity 构建输出目录（含 index.html 与 Build/）
  --key         构建名，例如 main（默认取目录名）。**不再是任务名** —— 一个构建可承载多个 TaskType（DEC-81）
  --task-types  该构建能承载的 TaskType 数值，逗号分隔（例：4,5,8,9）
                Unity 类任务通常是 4 电路连接 / 5 仿真实验 / 8 结构 / 9 检测（见 docs/design/05 §3.2）
  --extra <目录> 构建目录之外的产物（Addressables 内容常在 ServerData/WebGL），复制到暂存产物根下
  --bridge      声明该构建实现了协议桥（会调 __WSU3_BRIDGE__.onReady）；壳冒烟据此决定是否要求握手
  --force       源目录形状校验失败也照搬（慎用，仅用于排查）
`

/** 从契约快照读 TaskType 的合法序号（没有快照时返回 null = 跳过校验）。 */
async function loadTaskTypeNames() {
  try {
    const snapshot = JSON.parse(await readFile(join(repoRoot, 'content', 'contracts', 'snapshot.json'), 'utf8'))
    const taskType = (snapshot.enums || []).find((entry) => entry.name === 'TaskType')
    if (!taskType) return null
    return new Map((taskType.values || []).map((value) => [value.ordinal, value.name]))
  } catch {
    return null
  }
}

async function walk(dir, base = dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(full, base)))
    else if (entry.isFile()) out.push(relative(base, full).split('\\').join('/'))
  }
  return out
}

async function sha256(file) {
  const hash = createHash('sha256')
  hash.update(await readFile(file))
  return hash.digest('hex')
}

async function readManifest() {
  if (!existsSync(MANIFEST)) return { version: 1, builds: [] }
  try {
    const parsed = JSON.parse(await readFile(MANIFEST, 'utf8'))
    return { version: 1, builds: Array.isArray(parsed.builds) ? parsed.builds : [] }
  } catch {
    return { version: 1, builds: [] }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help || !args.from) {
    process.stdout.write(HELP)
    process.exitCode = args.help ? 0 : 1
    return
  }

  // —— ⓪ 声明校验：一个构建必须声明"能承载哪些 TaskType"，否则它永远选不中（DEC-81）
  if (args.taskTypes.length === 0) {
    console.error('缺少 --task-types：必须声明该构建能承载哪些 TaskType（例如 --key main --task-types 4,5,8,9）。')
    console.error('  DEC-81：一个 Unity 构建承载全部 Unity 类任务；加载器按"第一个声明包含该 taskType 的构建"选件。')
    process.exitCode = 1
    return
  }
  if (args.taskTypes.some((value) => !Number.isInteger(value) || value <= 0)) {
    console.error(`--task-types 里有非法值：${args.taskTypes.join(',')}（应为正整数，且是 TaskType 的序号）`)
    process.exitCode = 1
    return
  }
  const taskTypeNames = await loadTaskTypeNames()
  if (taskTypeNames) {
    const unknown = args.taskTypes.filter((value) => !taskTypeNames.has(value))
    if (unknown.length > 0) {
      console.error(`--task-types 里有契约里不存在的 TaskType：${unknown.join(',')}`)
      console.error(`  合法值：${[...taskTypeNames.entries()].map(([ord, name]) => `${ord}=${name}`).join(' / ')}`)
      process.exitCode = 1
      return
    }
  } else {
    console.warn('[unity-stage] 未读到 content/contracts/snapshot.json，跳过 TaskType 合法性校验。')
  }

  const source = resolve(repoRoot, args.from)
  if (!existsSync(source)) {
    console.error(`源目录不存在：${source}\n（Unity 侧先构建：菜单 WSU3/Build/WebGL Baseline，构建前须关闭编辑器，DEC-59）`)
    process.exitCode = 1
    return
  }

  const key = args.key || basename(source)
  const files = await walk(source)

  // —— ① 形状校验：先看再搬，避免把"半份产物"当成可用
  const missing = REQUIRED.filter((rule) => !files.some((file) => rule.test(basename(file))))
  if (missing.length > 0 && !args.force) {
    console.error(`源目录形状不对，缺少：${missing.map((m) => m.label).join('、')}`)
    console.error(`  ${source}`)
    console.error('  期望结构：index.html + Build/<name>.loader.js + *.framework.js + *.wasm + *.data（可带 .br/.gz）')
    console.error('  确实要照搬请加 --force。')
    process.exitCode = 1
    return
  }

  // —— ② 复制：同名先清空，防止上一版的残留文件混进清单
  const target = join(STAGE_ROOT, key)
  await rm(target, { recursive: true, force: true })
  await mkdir(target, { recursive: true })
  await cp(source, target, { recursive: true })

  // Addressables 的内容默认落在工程根的 ServerData/<目标平台>/，**不在构建目录里** ——
  // 不显式带上，运行时就是"模型加载不出来"，而且构建日志一切正常，很难查。
  for (const extra of args.extra) {
    const extraDir = resolve(repoRoot, extra)
    if (!existsSync(extraDir)) {
      console.error(`--extra 目录不存在：${extraDir}`)
      process.exitCode = 1
      return
    }
    await cp(extraDir, target, { recursive: true })
  }
  const serverData = join(repoRoot, 'NewStructureUnity', 'ServerData')
  if (existsSync(serverData) && args.extra.length === 0) {
    console.warn(
      `\n⚠️ 发现 ${relative(repoRoot, serverData)} —— Addressables 的远端内容默认就放这里，**不在构建目录内**。\n` +
        '   若该构建用到了 Addressables，请加 --extra 一并搬走（或用 --extra NewStructureUnity/ServerData/WebGL），\n' +
        '   否则运行时表现为"资源加载失败"，而构建日志完全正常。详见 docs/design/06 §3③。\n',
    )
  }

  // —— ③ 逐文件算指纹
  const staged = []
  let totalBytes = 0
  for (const file of await walk(target)) {
    const full = join(target, file)
    const size = (await stat(full)).size
    totalBytes += size
    staged.push({ path: file, bytes: size, sha256: await sha256(full) })
  }

  const manifest = await readManifest()
  const entry = {
    key,
    /**
     * 这个构建声明的 TaskType 列表（升序、去重）。
     * DEC-81：一个构建承载多个任务；加载器（web/src/stores/runtime.ts 与 electron/main.js）
     * 按"**第一个声明包含该 taskType 的构建**"选件，不再要求 key 等于任务名。
     */
    taskTypes: args.taskTypes,
    source: relative(repoRoot, source).split('\\').join('/'),
    entry: 'index.html',
    loader: staged.map((f) => f.path).find((p) => /\.loader\.js$/.test(basename(p))) ?? null,
    /** 是否声明实现了协议桥（DEC-07）。壳冒烟据此决定"是否要求握手成功" */
    bridge: Boolean(args.bridge),
    /** 构建目录之外一并搬走的目录（相对仓库根），便于复查 */
    extras: args.extra,
    files: staged,
    fileCount: staged.length,
    totalBytes,
    stagedAt: new Date().toISOString(),
  }
  manifest.builds = [...manifest.builds.filter((build) => build.key !== key), entry].sort((a, b) =>
    a.key.localeCompare(b.key),
  )

  await mkdir(STAGE_ROOT, { recursive: true })
  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

  const mb = (totalBytes / 1024 / 1024).toFixed(1)
  console.log(`已暂存 Unity 构建：${key}`)
  console.log(`  源：    ${relative(repoRoot, source)}`)
  console.log(
    `  承载：  ${args.taskTypes.map((ord) => `${ord}=${taskTypeNames?.get(ord) ?? '?'}`).join(', ')}`,
  )
  console.log(`  暂存：  unity/builds/${key}（${staged.length} 个文件，${mb} MB）`)
  console.log(`  loader：${entry.loader ?? '（未识别，需人工确认）'}`)
  console.log(`  协议桥：${entry.bridge ? '已声明实现（壳冒烟将要求握手成功）' : '未声明（壳冒烟只验"画面挂上"，日志会写明未握手）'}`)
  console.log(`  清单：  unity/builds/manifest.json（共 ${manifest.builds.length} 个构建）`)
  console.log('\n提醒：unity/builds/ 不进 git（DEC-57）；打包用 node tools/pipeline/pack.mjs。')
}

await main()
