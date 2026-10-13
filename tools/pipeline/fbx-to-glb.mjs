#!/usr/bin/env node
/**
 * 批量把搬进来的 FBX 转成 GLB（P1-4 步骤 3）——给 **Three.js 侧**用（Unity 侧直接用 FBX）。
 *
 * 为什么走 Blender 而不是 Unity：Unity 的 FBX 导不出 glTF；Blender 是唯一能"读 FBX + 重接材质 + 出 GLB"的
 * 本机工具（`docs/research/09` §4 的可搬运性结论：模型可直转，**材质必须降级**）。
 *
 * 用法：
 *   node tools/pipeline/fbx-to-glb.mjs --blender "D:\Blender\blender.exe"          # 全转
 *   node tools/pipeline/fbx-to-glb.mjs --blender … --only contactor,breaker        # 只转某几个器件
 *   node tools/pipeline/fbx-to-glb.mjs --blender … --force                         # 覆盖已有 GLB
 *
 * 行为：
 *   · 输入 `NewStructureUnity/Assets/Models/<器件>/*.fbx`，输出 `content/assets/three/<器件>/<名>.glb`；
 *   · 贴图搜索目录 = 该器件目录 + `Models/_shared`（共用贴图在共享目录里）；
 *   · 每个模型起一个**独立 Blender 进程**（`--background`）：一个模型把 Blender 搞崩不影响整批；
 *   · 结果写 `content/asset-convert-report.json`（含每个 GLB 的 sha256、三角面数、接了几张图、未映射的图）。
 *
 * **已知限制（写进报告，不掩盖）**：`*M_AO_G*` 是 HDRP 的 mask map（R=金属度/G=AO/A=光泽度），
 * 通道语义与 glTF 不符，本脚本不硬塞 —— 金属度/粗糙度用常数兜底。要做对需要离屏重排通道。
 *
 * 纪律：`content/assets/` 不进 git（DEC-57）；Blender 只被本脚本启动，不改 Unity 工程。
 */
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const PY_SCRIPT = join(repoRoot, 'tools/pipeline/blender-fbx-to-glb.py')
const MODELS_ROOT = join(repoRoot, 'NewStructureUnity/Assets/Models')
const SHARED_DIR = join(MODELS_ROOT, '_shared')
const OUT_ROOT = join(repoRoot, 'content/assets/three')
const REPORT = join(repoRoot, 'content/asset-convert-report.json')
/** 材质规格（`tools/pipeline/extract-material-spec.mjs` 生成）：预制体覆写层的唯一依据 */
const SPEC = join(repoRoot, 'content/asset-material-spec.json')
const PER_MODEL_TIMEOUT_MS = 180_000

function parseArgs(argv) {
  const args = { blender: process.env.BLENDER_PATH ?? '', only: [], force: false, help: false }
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (token === '--blender') args.blender = argv[++i]
    else if (token === '--only') args.only = String(argv[++i] ?? '').split(',').map((s) => s.trim()).filter(Boolean)
    else if (token === '--force') args.force = true
    else if (token === '--help' || token === '-h') args.help = true
  }
  return args
}

const HELP = `用法：node tools/pipeline/fbx-to-glb.mjs --blender <blender.exe 路径> [--only a,b] [--force]

  --blender  Blender 可执行文件（也可用环境变量 BLENDER_PATH）
  --only     只转指定器件目录（例：contactor,breaker）
  --force    已有 GLB 也重转（默认跳过，避免重复劳动）
`

async function walkFbx(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === '_shared') continue
      out.push(...(await walkFbx(full)))
    } else if (extname(entry.name).toLowerCase() === '.fbx') {
      out.push(full)
    }
  }
  return out
}

async function sha256(file) {
  return createHash('sha256').update(await readFile(file)).digest('hex')
}

const args = parseArgs(process.argv.slice(2))
if (args.help || !args.blender) {
  process.stdout.write(HELP)
  process.exitCode = args.help ? 0 : 1
} else if (!existsSync(args.blender)) {
  console.error(`找不到 Blender：${args.blender}（用 --blender 或 BLENDER_PATH 指定）`)
  process.exitCode = 1
} else if (!existsSync(MODELS_ROOT)) {
  console.error(`没有找到模型目录：${MODELS_ROOT}（先跑 import-adopted-assets.mjs）`)
  process.exitCode = 1
} else {
  await main()
}

async function main() {
  const fbxFiles = (await walkFbx(MODELS_ROOT)).filter((file) => {
    if (args.only.length === 0) return true
    return args.only.includes(basename(dirname(file)))
  })

  console.log(`[glb] Blender：${args.blender}`)
  console.log(`[glb] 待转换 ${fbxFiles.length} 个模型`)

  // 报告是**累积**的：一次只转几个器件时，别把上次的记录抹掉（否则证据只剩最后一次运行）
  let previous = { models: [] }
  if (existsSync(REPORT)) {
    try {
      previous = JSON.parse(await readFile(REPORT, 'utf8'))
    } catch {
      previous = { models: [] }
    }
  }
  const report = { generatedAt: new Date().toISOString(), blender: args.blender, models: [] }
  const byKey = new Map((previous.models ?? []).map((item) => [`${item.device}/${item.stem}`, item]))
  let failed = 0
  /** 本次真正转换的个数（报告的"累计"里也含之前几轮的记录） */
  let convertedNow = 0

  /**
   * Three 侧只做规格里列的 8 个（`content/asset-material-spec.json` 的 `threeSide.models`，
   * 由 `InfoObjs/<器件>_info_model.prefab` 实例的 FBX 判出来）。
   * 规格不存在／读不出时退回"全都转"，不把管线卡住。
   */
  let threeSideKeys = null
  if (existsSync(SPEC)) {
    try {
      const spec = JSON.parse(await readFile(SPEC, 'utf8'))
      const models = spec.threeSide?.models ?? {}
      if (Object.keys(models).length > 0) threeSideKeys = new Set(Object.keys(models))
    } catch {
      threeSideKeys = null
    }
  }
  if (threeSideKeys) console.log(`[glb] Three 侧清单：${threeSideKeys.size} 个模型（其余不产出）`)

  for (const fbx of fbxFiles) {
    const device = basename(dirname(fbx))
    const stem = basename(fbx, extname(fbx))
    const out = join(OUT_ROOT, device, `${stem}.glb`)
    const label = `${device}/${stem}`

    if (threeSideKeys && !threeSideKeys.has(label)) {
      console.log(`  · ${label.padEnd(42)} 跳过（不在 Three 侧清单里）`)
      continue
    }

    if (existsSync(out) && !args.force) {
      const size = (await stat(out)).size
      console.log(`  · ${label.padEnd(42)} 跳过（已有 ${(size / 1024 / 1024).toFixed(2)} MB）`)
      byKey.set(`${device}/${stem}`, {
        device,
        stem,
        glb: relative(repoRoot, out).split('\\').join('/'),
        bytes: size,
        status: 'exists',
      })
      continue
    }

    const result = spawnSync(
      args.blender,
      [
        '--background',
        '--factory-startup',
        '--python',
        PY_SCRIPT,
        '--',
        fbx,
        out,
        dirname(fbx),
        ...(existsSync(SHARED_DIR) ? [SHARED_DIR] : []),
        // 材质规格 + 模型键 ⇒ 让 Blender 应用**预制体覆写层**（哪个 mesh 用哪个材质）。
        // 规格不存在时照旧转换（不带覆写），不会把管线卡住。
        ...(existsSync(SPEC) ? ['--spec', SPEC, '--model-key', `${device}/${stem}`] : []),
      ],
      { encoding: 'utf8', timeout: PER_MODEL_TIMEOUT_MS, maxBuffer: 32 * 1024 * 1024 },
    )

    const marker = /WSU3_GLB_SUMMARY (\{.*\})/.exec(result.stdout ?? '')
    const summary = marker ? JSON.parse(marker[1]) : null
    if (!summary || summary.bytes === 0) {
      failed += 1
      console.error(`  ✗ ${label} 转换失败（exit=${result.status}）`)
      const tail = `${result.stderr ?? ''}`.split('\n').filter(Boolean).slice(-3).join(' | ')
      if (tail) console.error(`      ${tail}`)
      byKey.set(`${device}/${stem}`, { device, stem, status: 'failed', reason: tail })
      continue
    }

    await mkdir(dirname(out), { recursive: true })
    byKey.set(`${device}/${stem}`, {
      device,
      stem,
      glb: relative(repoRoot, out).split('\\').join('/'),
      bytes: summary.bytes,
      sha256: await sha256(out),
      triangles: summary.triangles,
      meshes: summary.meshes,
      materials: summary.materials,
      images: summary.images,
      hooked: summary.hooked,
      unmapped: summary.unmapped,
      warnings: summary.warnings,
      status: 'converted',
    })
    convertedNow += 1
    console.log(
      `  · ${label.padEnd(42)} ${(summary.bytes / 1024 / 1024).toFixed(2)} MB · ` +
        `${summary.meshes} 网格 · ${summary.triangles} 三角面 · 贴图 ${summary.images.length} 张`,
    )
    for (const item of summary.unmapped ?? []) console.log(`      ⚠ 未映射：${item.file}（${item.reason}）`)
    for (const item of summary.warnings ?? []) console.log(`      ⚠ ${item}`)
  }

  // 报告只描述**还在的产物**：已移除的模型（如 Three 侧不再产出的旧代）必须从累计里剔掉，
  // 否则清单会永远留着一堆磁盘上不存在的 GLB，`audit-material-mapping.mjs` 这类工具会去读不存在的文件。
  for (const item of [...byKey.values()]) {
    if (!item.glb || !existsSync(join(repoRoot, item.glb))) byKey.delete(`${item.device}/${item.stem}`)
  }

  report.models = [...byKey.values()].sort((a, b) =>
    `${a.device}/${a.stem}`.localeCompare(`${b.device}/${b.stem}`),
  )
  await writeFile(REPORT, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  const done = report.models.filter((item) => item.status === 'converted')
  const bytes = done.reduce((sum, item) => sum + item.bytes, 0)
  console.log('\n================ 转换摘要 ================')
  console.log(`报告累计：${done.length} 个 / ${(bytes / 1024 / 1024).toFixed(1)} MB（本次新转 ${convertedNow} 个）`)
  console.log(`跳过：  ${report.models.filter((item) => item.status === 'exists').length} 个（已有；要重转加 --force）`)
  console.log(`失败：  ${failed} 个`)
  console.log(`落点：  content/assets/three/**（不进 git，DEC-57）`)
  console.log(`报告：  ${relative(repoRoot, REPORT)}`)
  if (failed > 0) process.exitCode = 1
}
