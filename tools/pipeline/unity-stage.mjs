#!/usr/bin/env node
/**
 * 把 Unity WebGL 构建输出搬进仓库内的**暂存区**，并生成清单（见 docs/design/05）。
 *
 * 用法：
 *   node tools/pipeline/unity-stage.mjs --from <Unity 构建输出目录> --key <任务键> --task-type <n>
 *   node tools/pipeline/unity-stage.mjs --from NewStructureUnity/Builds/webgl-baseline --key training --task-type 5
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
  const args = { key: '', from: '', taskType: null, force: false }
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (token === '--from') args.from = argv[++i]
    else if (token === '--key') args.key = argv[++i]
    else if (token === '--task-type') args.taskType = Number(argv[++i])
    else if (token === '--force') args.force = true
    else if (token === '--help' || token === '-h') args.help = true
  }
  return args
}

const HELP = `用法：node tools/pipeline/unity-stage.mjs --from <目录> --key <任务键> --task-type <n>

  --from        Unity 构建输出目录（含 index.html 与 Build/）
  --key         任务键，例如 training / line-connection（默认取目录名）
  --task-type   TaskType 数值（见 docs/design/05 §3.2；清单里的权威字段）
  --force       源目录形状校验失败也照搬（慎用，仅用于排查）
`

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
    taskType: Number.isFinite(args.taskType) ? args.taskType : null,
    source: relative(repoRoot, source).split('\\').join('/'),
    entry: 'index.html',
    loader: staged.map((f) => f.path).find((p) => /\.loader\.js$/.test(basename(p))) ?? null,
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
  console.log(`  暂存：  unity/builds/${key}（${staged.length} 个文件，${mb} MB）`)
  console.log(`  loader：${entry.loader ?? '（未识别，需人工确认）'}`)
  console.log(`  清单：  unity/builds/manifest.json（共 ${manifest.builds.length} 个构建）`)
  console.log('\n提醒：unity/builds/ 不进 git（DEC-57）；打包用 node tools/pipeline/pack.mjs。')
}

await main()
