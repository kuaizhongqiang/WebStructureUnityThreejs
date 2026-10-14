#!/usr/bin/env node
/**
 * 一键打包流水线（见 docs/design/05 §4）。
 *
 * 步骤与**为什么是这个顺序**：
 *   ① 校验 Unity 暂存区 —— 先失败比打完 80MB 包再发现少文件便宜；
 *   ② 构建 Web 产物 —— 清单要写进产物里，所以必须先有产物；
 *   ③ 写 `web/dist/release-manifest.json` —— **这次包里到底有什么**，可查询、可留档；
 *   ④ electron-builder 打包；
 *   ⑤ 打印清单摘要，**缺 Unity 时明确告警**（不再出现"以为有其实没有"）。
 *
 * 用法：node tools/pipeline/pack.mjs [--skip-web] [--dir]
 *   --skip-web  复用现有 web/dist（改壳或只换 Unity 时省时间）
 *   --dir       只产出免安装目录（release/win-unpacked），不生成便携 exe
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, rmSync } from 'node:fs'
import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { basename, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const webRoot = join(repoRoot, 'web')
const electronRoot = join(repoRoot, 'electron')
const unityStage = join(repoRoot, 'unity', 'builds')
const distRoot = join(webRoot, 'dist')

const argv = process.argv.slice(2)
const skipWeb = argv.includes('--skip-web')
const dirOnly = argv.includes('--dir')
/**
 * 输出目录。默认 `release`；**上一次的产物若被占用/删不掉**（Windows 上很常见：
 * 你刚双击运行过那个 exe，或者环境不允许删目录），用 `--out release-xxx` 换个目录即可，
 * 不必去跟文件锁纠缠。
 */
const outIndex = argv.indexOf('--out')
const outDir = outIndex >= 0 ? argv[outIndex + 1] : 'release'

/**
 * 两种启动方式分开用，别混：
 *   · `runShell` —— npm / npx 这类命令（Windows 上是 .cmd 垫片，需要一个 shell 去解析）；
 *   · `runNode`  —— 直接跑本仓的 node 脚本（绝对路径，**不能**走 shell，否则路径里的空格会被切断）。
 */
function runShell(label, commandLine, cwd) {
  console.log(`\n[pack] ▶ ${label}`)
  const result = spawnSync(commandLine, { cwd, stdio: 'inherit', shell: true })
  if (result.error) console.error(`[pack] 启动失败：${result.error.message}`)
  if (result.status !== 0) {
    console.error(`[pack] ✗ ${label} 失败（退出码 ${result.status}）`)
    process.exit(1)
  }
}

function runNode(label, scriptPath, cwd) {
  console.log(`\n[pack] ▶ ${label}`)
  const result = spawnSync(process.execPath, [scriptPath], { cwd, stdio: 'inherit' })
  if (result.error) console.error(`[pack] 启动失败：${result.error.message}`)
  if (result.status !== 0) {
    console.error(`[pack] ✗ ${label} 失败（退出码 ${result.status}）`)
    process.exit(1)
  }
}

async function walk(dir, base = dir) {
  const out = []
  if (!existsSync(dir)) return out
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(full, base)))
    else if (entry.isFile()) out.push(relative(base, full).split('\\').join('/'))
  }
  return out
}

/** 目录级指纹：按路径排序后把"路径 + 哈希"再哈希一次，用于"这份产物是不是同一份"的比对。 */
async function treeHash(dir, files) {
  const hash = createHash('sha256')
  for (const file of [...files].sort()) {
    const content = await readFile(join(dir, file))
    hash.update(file)
    hash.update(createHash('sha256').update(content).digest('hex'))
  }
  return hash.digest('hex')
}

async function dirBytes(dir, files) {
  let bytes = 0
  for (const file of files) bytes += (await stat(join(dir, file))).size
  return bytes
}

async function buildReleaseManifest() {
  const webFiles = await walk(distRoot)
  // 注意：不要写 `.map(basename)` —— map 会把索引当 basename 的第二个参数（suffix）传进去，直接抛 TypeError
  const contentProjects = webFiles
    .filter((file) => /^content\/projects\/.+\.json$/.test(file))
    .map((file) => basename(file))
  // 内容数据（DEC-82）：与 web/dist 一起发布的那一份，Unity 侧另有一份同名文件（随 Unity 构建发布）
  const contentData = webFiles
    .filter((file) => /^content\/data\/.+\.json$/.test(file))
    .map((file) => basename(file))
  // 三维资产（DEC-98 / 原 P1-5）：随包发布的 `assets/three/**`。
  // 这一行能直接回答"这个包里到底有没有模型"——没有它的包，Info 页只会显示"本项目没有三维模型"。
  const assetFiles = webFiles.filter((file) => file.startsWith('assets/three/'))
  // 原理视频（DEC-99）：`assets/video/**`（含 `_meta/index.json` 清单）。
  // 同理：没有它，原理页只会显示"讲解视频未包含在本次发布里"。
  const videoFiles = webFiles.filter((file) => file.startsWith('assets/video/'))

  let unity = { included: false, builds: [], reason: '本机没有 Unity 暂存产物' }
  if (existsSync(join(unityStage, 'manifest.json'))) {
    const manifest = JSON.parse(await readFile(join(unityStage, 'manifest.json'), 'utf8'))
    const builds = []
    for (const build of manifest.builds || []) {
      const files = (build.files || []).map((f) => f.path)
      builds.push({
        key: build.key,
        // DEC-81：一个构建承载多个 TaskType；旧清单的单值 taskType 仍兼容
        taskTypes: Array.isArray(build.taskTypes)
          ? build.taskTypes
          : build.taskType != null
            ? [build.taskType]
            : [],
        entry: build.entry,
        loader: build.loader,
        // 是否声明实现了协议桥：壳冒烟据此决定"要不要握手成功才算通过"（docs/design/06 §5）
        bridge: Boolean(build.bridge),
        fileCount: build.fileCount,
        totalBytes: build.totalBytes,
        stagedAt: build.stagedAt,
        // 目录指纹：部署方用它比对"拿到的 Unity 目录"与清单是否同一份
        treeSha256: await treeHash(join(unityStage, build.key), files),
      })
    }
    unity = {
      included: builds.length > 0,
      builds,
      reason: builds.length > 0 ? `已包含 ${builds.length} 个 Unity 构建` : '清单为空',
    }
  }

  const electronPkg = JSON.parse(await readFile(join(electronRoot, 'package.json'), 'utf8'))
  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    web: { files: webFiles.length, bytes: await dirBytes(distRoot, webFiles) },
    content: {
      projects: contentProjects,
      data: contentData,
      // DEC-98：三维资产与元数据表（数量 + 字节）
      assets: { files: assetFiles.length, bytes: await dirBytes(distRoot, assetFiles) },
      // DEC-99：原理视频（数量 + 字节）。单独一项，好让"包体里视频占多少"一眼可见（包体核算见 TODO D-10）
      video: { files: videoFiles.length, bytes: await dirBytes(distRoot, videoFiles) },
    },
    unity,
    // 服务端约定：把 DEC-22 的"MIME/压缩/缓存清单"写进产物，部署方照抄
    serving: {
      mime: {
        '.wasm': 'application/wasm',
        '.data': 'application/octet-stream',
        '.unityweb': 'application/octet-stream',
        '.mem': 'application/octet-stream',
        '.js': 'text/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        // Three 侧资产（DEC-98）
        '.glb': 'model/gltf-binary',
        '.exr': 'image/x-exr',
        // 原理视频（DEC-99）：MIME 必须写对，且服务端要支持 Range（拖进度条）
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
      },
      precompressed: ['br', 'gzip'],
      cache: { fingerprinted: 'public, max-age=31536000, immutable', htmlAndManifest: 'no-cache' },
      coopCoep: false,
      note: '多线程 Unity（SharedArrayBuffer）才需要 COOP/COEP；壳里用 WSU3_COOP_COEP=1 打开（DEC-13）',
    },
    shell: { electron: electronPkg.devDependencies?.electron ?? null, target: 'win-x64 portable' },
  }

  await writeFile(join(distRoot, 'release-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  return manifest
}

function summary(manifest, exePath) {
  const mb = (n) => (n / 1024 / 1024).toFixed(1)
  console.log('\n================ 打包摘要 ================')
  console.log(`Web 产物：   ${manifest.web.files} 个文件 / ${mb(manifest.web.bytes)} MB`)
  console.log(`内容项目：   ${manifest.content.projects.length ? manifest.content.projects.join('、') : '（无）'}`)
  const assets = manifest.content.assets
  console.log(
    `三维资产：   ${assets && assets.files > 0 ? `${assets.files} 个文件 / ${mb(assets.bytes)} MB` : '**未包含** —— 相关页面只会显示"本项目没有三维模型"'}`,
  )
  const video = manifest.content.video
  console.log(
    `原理视频：   ${video && video.files > 0 ? `${video.files} 个文件 / ${mb(video.bytes)} MB` : '**未包含** —— 原理页只会显示"讲解视频未包含在本次发布里"'}`,
  )
  if (manifest.unity.included) {
    for (const build of manifest.unity.builds) {
      console.log(
        `Unity 构建： ${build.key}（承载 taskTypes=${build.taskTypes.join(',') || '未声明'}）` +
          `${mb(build.totalBytes)} MB，指纹 ${build.treeSha256.slice(0, 12)}…`,
      )
    }
  } else {
    console.log('Unity 构建： **未包含** —— ' + manifest.unity.reason)
    console.log('            壳与网页现在都能跑，但进入 Unity 类任务（电路连接/仿真/结构/检测）只会看到"产物未就位"。')
    console.log('            接入方式见 docs/design/05；没有真 Unity 时可用 make-stub-unity.mjs 先验流水线。')
  }
  console.log(`产物路径：   ${exePath ? relative(repoRoot, exePath) : '（仅校验与清单）'}`)
  console.log('==========================================')
}

async function main() {
  runNode('校验 Unity 暂存区', join(repoRoot, 'tools', 'pipeline', 'unity-verify.mjs'), repoRoot)

  if (!skipWeb) {
    runShell('构建 Web 产物', 'npm run build', webRoot)
  } else if (!existsSync(join(distRoot, 'index.html'))) {
    console.error('[pack] --skip-web 但 web/dist 不存在，先跑一次完整打包。')
    process.exit(1)
  }

  console.log('\n[pack] ▶ 写发布清单 release-manifest.json')
  const manifest = await buildReleaseManifest()
  console.log(`[pack]   → web/dist/release-manifest.json（Unity ${manifest.unity.included ? '已包含' : '未包含'}）`)

  // 预检输出目录：Windows 上上一次的产物常被占用（你刚双击运行过那个 exe），
  // electron-builder 撞上去只会丢一句 EBUSY 堆栈，很难看出该怎么办 —— 这里提前说清楚。
  const stage = join(electronRoot, outDir, 'win-unpacked')
  if (existsSync(stage)) {
    try {
      rmSync(stage, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 })
    } catch {
      console.error(`[pack] ✗ 上一次的产物删不掉：${stage}`)
      console.error('[pack]   常见原因：那个 exe 还在运行（先关掉窗口/结束进程），或目录被系统索引占用。')
      console.error(`[pack]   也可以换一个输出目录：node tools/pipeline/pack.mjs --out ${outDir}-${Date.now().toString().slice(-4)}`)
      process.exit(1)
    }
  }

  runShell(
    'electron-builder 打包',
    `${dirOnly ? 'npm run dist:dir' : 'npm run dist'} -- -c.directories.output=${outDir}`,
    electronRoot,
  )

  const shellVersion = JSON.parse(
    await readFile(join(electronRoot, 'package.json'), 'utf8'),
  ).version
  const exe = dirOnly
    ? join(electronRoot, outDir, 'win-unpacked')
    : join(electronRoot, outDir, `WSU3-Shell-${shellVersion}-portable.exe`)
  summary(manifest, existsSync(exe) ? exe : null)
}

await main()
