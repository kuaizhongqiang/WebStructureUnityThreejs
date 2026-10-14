#!/usr/bin/env node
/**
 * 搬运**实验原理页的讲解视频**（每个项目 1 段，落 `content/assets/video/`，不进 git）。
 *
 * 为什么单独一个脚本、而不是并进 `import-adopted-assets.mjs`：
 *   那条链服务的是**两条线共用**的资产（FBX / 贴图走 Unity、原理图两处各一份，都要带 `.meta`、要过 Blender）；
 *   视频**只服务 Web 的 Three 侧**（原理页），不带 `.meta`、不过 Blender、体积单独核算。
 *   两件事的取舍不同（那边有 10 MB 单图剔除规则，这边单段视频就 30 MB，**不能**套用），
 *   混在一个脚本里会让"剔除规则"变成按文件类型分支的一团。所以：链路分开，**证据各自成文**。
 *
 * 用法：
 *   node tools/pipeline/import-principle-videos.mjs --from <来源工程根目录> --dry-run
 *   node tools/pipeline/import-principle-videos.mjs --from <来源工程根目录>
 *
 * **搬什么**（由**内容数据**驱动，不是手写清单）：
 *   `ProjectData.json` 里每个 clip 的 `taskPrincipleData.principleStructs[].videoName`
 *   → 来源 `<来源>/Assets/StreamingAssets/Video/<videoName>.mp4`。
 *   `videoName` 就是数据里的键（如 `01jcq_yl`），**文件名与数据键同名**，
 *   所以产品侧只需要"数据里的键 + 前缀"，不需要第二张对照表。
 *
 * **落点**：`content/assets/video/<videoName>.mp4` —— 与 `three/` 同级，理由同 `content/assets/README.md`：
 *   `web/public/` 是 git 管的目录，视频**不能进 git**（单段最大 30 MB，远超 10 MB 门禁，且无版本管理价值）。
 *
 * 纪律：只读来源工程（**绝不写入**）；不碰 git / Plastic（提交由人按批次做）。
 */
import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const DATA_FILE = join(repoRoot, 'web/public/content/data/ProjectData.json')
const REPORT = join(repoRoot, 'content/asset-video-report.json')

/** 视频落点（**不进 git**，`.gitignore` 的 `content/assets/**` 已覆盖）。 */
const WEB_VIDEOS = join(repoRoot, 'content/assets/video')

/** 来源工程里视频所在的固定子目录。 */
const VIDEO_DIR = 'Assets/StreamingAssets/Video'

/** 采纳的视频容器：来源就是 `.mp4`，改成别的格式要先转码（本期不转）。 */
const EXTENSION = '.mp4'

function parseArgs(argv) {
  const args = { from: '', dryRun: false, force: false, only: [], help: false }
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (token === '--from') args.from = argv[++i]
    else if (token === '--only') {
      args.only = String(argv[++i] ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    } else if (token === '--dry-run') args.dryRun = true
    else if (token === '--force') args.force = true
    else if (token === '--help' || token === '-h') args.help = true
  }
  return args
}

const HELP = `用法：node tools/pipeline/import-principle-videos.mjs --from <来源工程根目录> [--dry-run] [--only a,b] [--force]

  --from     既有实训软件的**工程根目录**（含 Assets/），只读，不会被写入
  --dry-run  只打印将要搬什么，不写盘
  --only     只搬指定器件段（例：contactor,breaker；器件段 = clip id 去掉 clip_）
  --force    目标文件已存在也覆盖（默认跳过并报告，避免悄悄改写已搬过的视频）
`

async function sha256(file) {
  return createHash('sha256').update(await readFile(file)).digest('hex')
}

/** 器件段 = `clip_contactor` → `contactor`（与 `web/src/viewer/scene-assets.ts` 同一口径）。 */
function deviceOf(clipId) {
  const matched = /^clip_([A-Za-z][A-Za-z0-9]*)$/.exec(clipId ?? '')
  return matched?.[1] ?? ''
}

/** 一个 clip 要搬的视频名（`principleStructs[].videoName`，去重去空）。 */
function videoNamesOf(clip) {
  const structs = Array.isArray(clip?.taskPrincipleData?.principleStructs)
    ? clip.taskPrincipleData.principleStructs
    : []
  return [...new Set(structs.map((item) => String(item?.videoName ?? '').trim()).filter(Boolean))]
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help || !args.from) {
    process.stdout.write(HELP)
    process.exitCode = args.help ? 0 : 1
    return
  }

  const sourceRoot = resolve(args.from)
  const videoRoot = join(sourceRoot, VIDEO_DIR)
  if (!existsSync(videoRoot)) {
    console.error(`来源工程里没有视频目录：${videoRoot}`)
    process.exitCode = 1
    return
  }
  if (!existsSync(DATA_FILE)) {
    console.error(`找不到内容数据：${DATA_FILE}（本脚本按内容数据决定搬什么）`)
    process.exitCode = 1
    return
  }

  const clips = JSON.parse(await readFile(DATA_FILE, 'utf8')).clips ?? []
  const report = {
    generatedAt: new Date().toISOString(),
    dryRun: args.dryRun,
    from: sourceRoot,
    /** 目标文件的**全量清单**（重跑也产出完整清单，而不是只记本次动作）+ 本次状态 */
    videos: [],
    /** 内容数据要求、但来源工程里找不到的视频 */
    missing: [],
  }

  for (const clip of clips) {
    const clipId = String(clip?.id ?? '')
    const device = deviceOf(clipId)
    if (args.only.length > 0 && !args.only.includes(device)) continue
    const videoNames = videoNamesOf(clip)
    if (videoNames.length === 0) continue

    for (const videoName of videoNames) {
      const from = join(videoRoot, `${videoName}${EXTENSION}`)
      if (!existsSync(from)) {
        report.missing.push({ clip: clipId, videoName, reason: `来源里没有 ${VIDEO_DIR}/${videoName}${EXTENSION}` })
        continue
      }
      const to = join(WEB_VIDEOS, `${videoName}${EXTENSION}`)
      const entry = {
        clip: clipId,
        device,
        videoName,
        from: relative(sourceRoot, from).split('\\').join('/'),
        path: relative(repoRoot, to).split('\\').join('/'),
        bytes: (await stat(from)).size,
        sha256: await sha256(from),
      }
      if (existsSync(to) && !args.force) {
        // 已存在 = 上次搬过了（重跑幂等，且不悄悄覆盖）
        report.videos.push({ ...entry, status: 'exists' })
        continue
      }
      if (!args.dryRun) {
        await mkdir(dirname(to), { recursive: true })
        await cp(from, to)
      }
      report.videos.push({ ...entry, status: args.dryRun ? 'planned' : 'copied' })
    }
    const own = report.videos.filter((item) => item.clip === clipId)
    const ownBytes = own.reduce((sum, item) => sum + item.bytes, 0)
    console.log(
      `[video] ${clipId.padEnd(24)} ${own.length} 段 ${(ownBytes / 1024 / 1024).toFixed(2)} MB` +
        (own.every((item) => item.status === 'exists') ? '（已存在）' : ''),
    )
  }

  if (!args.dryRun) {
    await mkdir(dirname(REPORT), { recursive: true })
    await writeFile(REPORT, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  }

  const written = report.videos.filter((item) => item.status === 'copied' || item.status === 'planned')
  const totalBytes = report.videos.reduce((sum, item) => sum + item.bytes, 0)
  const largest = report.videos.reduce((max, item) => (item.bytes > (max?.bytes ?? 0) ? item : max), null)
  console.log('\n================ 搬运摘要 ================')
  console.log(
    `${args.dryRun ? '将复制' : '本次复制'}：${written.length} 段 / ${(totalBytes / 1024 / 1024).toFixed(1)} MB` +
      `（全量 ${report.videos.length} 段）`,
  )
  console.log(
    `最大一段：${largest ? `${basename(largest.path)}（${(largest.bytes / 1024 / 1024).toFixed(2)} MB）` : '—'}`,
  )
  console.log(`已存在：  ${report.videos.filter((item) => item.status === 'exists').length} 段（要覆盖加 --force）`)
  console.log(`缺失：    ${report.missing.length}`)
  for (const item of report.missing) console.error(`  ✗ ${item.clip} / ${item.videoName}：${item.reason}`)
  console.log(args.dryRun ? '（--dry-run：没有写盘）' : `报告：${relative(repoRoot, REPORT)}`)
  console.log('提醒：content/assets 不进 git（DEC-57）；发布链见 web/vite.config.ts（dev 中间件 / build 拷贝）。')
}

await main()
