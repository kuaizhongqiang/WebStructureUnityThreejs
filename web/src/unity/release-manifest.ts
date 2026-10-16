/**
 * 暂存清单 → 发布清单的合成（dev 侧），以及**产物目录指纹**的兜底复算。
 *
 * 要解决的问题（GitHub Issue #60）：页面给 Unity 资源拼 `?v=<指纹前 12 位>`，
 * 而 Unity 的 `webGLDataCaching` 是**按 `.data` 的 URL** 往 IndexedDB 里存的。
 * 暂存清单里**没有** `treeSha256` 时 URL 永远不变 —— 于是"重新构建 + 重新暂存"之后
 * 浏览器仍然命中旧缓存，表现为"明明换了包，画面还是上一版"，只能靠清站点数据救。
 *
 * 两个层次别搞混（这是本文件最容易写错的地方）：
 *   · `isTreeFingerprintFresh` —— 判"清单里那个指纹**还算不算数**"，只做廉价比对
 *     （文件数 / 总字节 / 逐个文件的字节与哈希），**绝不去重算整棵目录的指纹**；
 *   · `resolveTreeFingerprints` —— 新鲜就**零重算**直接复用；不新鲜才现算一次。
 *     86 MB 的产物每次刷页面都重算一遍是不可接受的，所以"常规路径不重算"是硬口径。
 *
 * 指纹算法必须与打包流水线（`tools/pipeline/lib/tree-hash.mjs` 的 `treeSha256`，
 * 以及 `tools/pipeline/pack.mjs` 里同名口径的 `treeHash`）**逐位一致**：
 * 相对路径排序后，逐个 `update(相对路径)` + `update(单文件 sha256 hex)`，最后取 `digest('hex')`。
 * 差一点，"同一份产物"就会算出两个指纹，同一个构建的 URL 跟着变，缓存又会失效一次。
 * 哈希原语由调用方注入（`vite.config.ts` 传 `node:crypto` 的 `createHash`）——
 * 本模块不直接依赖任何 `node:*`，以便产品侧目录保持浏览器可解析。
 *
 * 依赖注入说明：文件系统与哈希原语都由调用方传进来（真实现是 `vite.config.ts` 里的 `node:fs`
 * 与 `node:crypto`），单测用内存假 fs —— 本模块因此不直接碰磁盘，纯逻辑、可单测。
 * 它**只在构建/开发服务器侧被引用**（`vite.config.ts`），不进浏览器产物。
 */

/** 发布清单里的一个 Unity 构建项（键集合与 `tools/pipeline/pack.mjs` 写的一致）。 */
export interface ReleaseManifestBuild {
  /** 构建名（一个构建可承载多个 TaskType，DEC-81；`key` 不再是任务名） */
  key: string
  /** 该构建声明能承载哪些 TaskType */
  taskTypes: number[]
  entry?: string
  loader?: string | null
  /** 是否声明实现了协议桥（DEC-07） */
  bridge: boolean
  fileCount?: number
  totalBytes?: number
  stagedAt?: string
  /**
   * 产物目录指纹。**必须反映暂存目录的当前内容** ——
   * 它变了 URL 才变，Unity 才会去取新的 `.data`，而不是命中 IndexedDB 里的旧缓存。
   */
  treeSha256?: string
}

/**
 * 暂存清单（`<暂存根>/manifest.json`）里一个构建项的**原始**形状。
 * 字段一律 `unknown`：这是从磁盘读进来的 JSON，历史上有过两代写法，**不许假设**它一定是什么。
 */
export interface StagedBuild {
  key?: unknown
  taskTypes?: unknown
  /** 旧清单的单值字段（DEC-81 之前的形状），仅为兼容已经暂存 / 打出去的包 */
  taskType?: unknown
  entry?: unknown
  loader?: unknown
  bridge?: unknown
  fileCount?: unknown
  totalBytes?: unknown
  stagedAt?: unknown
  treeSha256?: unknown
  /** 暂存脚本记的逐文件清单（`{ path, bytes, sha256 }`），新鲜度校验就靠它 */
  files?: unknown
}

export interface StagedManifest {
  builds?: StagedBuild[]
}

/** 暂存清单里的单个文件条目（形如 `{ path, bytes, sha256 }`）。 */
export interface StagedBuildFile {
  path?: unknown
  bytes?: unknown
  sha256?: unknown
}

/** dev 侧可注入的文件系统（真实实现由 `vite.config.ts` 传 `node:fs`）。 */
export interface FingerprintFs {
  /** 递归列出目录下所有文件，返回相对路径（`/` 分隔） */
  listFiles(dir: string): Promise<string[]>
  /** 单文件内容哈希（hex） */
  sha256(file: string): Promise<string>
  /** 单文件字节数：省掉"为拿大小再读一遍文件"。拿不到时退回用清单里记的字节数 */
  bytes?(file: string): Promise<number>
}

/** 哈希原语工厂（与 `node:crypto` 的 `createHash` 同形，方便注入与单测）。 */
export type HashFactory = (algorithm: 'sha256') => {
  update(data: string): unknown
  digest(enc: 'hex'): string
}

/** 一次现算得到的产物指纹。 */
export interface BuildFingerprint {
  treeSha256: string
  fileCount: number
  totalBytes: number
}

/** 内部：逐文件比对用的形状（把 `unknown` 收窄之后） */
interface KnownFile {
  path: string
  bytes: number | null
  sha256: string | null
}

/** 内部：新鲜度判定结果，顺带带回"为什么不新鲜"（要写进重算日志，方便定位） */
interface FreshnessVerdict {
  fresh: boolean
  /** 不新鲜的具体原因；新鲜时为空串 */
  reason: string
}

/** 把 `unknown` 收窄成非空字符串；不是字符串一律 `undefined`（不猜、不 `String()` 硬转）。 */
function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

/** 把 `unknown` 收窄成有限数字；不是数字一律 `undefined`。 */
function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/** 目录下的相对路径 → 注入 fs 认得的文件路径（统一用 `/`，Windows 上也一样）。 */
function fileUnder(dir: string, relative: string): string {
  return `${dir}/${relative}`
}

/** 清单里的逐文件条目：只保留形如 `{ path: 非空字符串 }` 的项。 */
function knownFiles(build: StagedBuild): KnownFile[] {
  if (!Array.isArray(build.files)) return []
  const out: KnownFile[] = []
  for (const entry of build.files) {
    if (!entry || typeof entry !== 'object') continue
    const item = entry as StagedBuildFile
    const path = asString(item.path)
    if (path === undefined) continue
    out.push({ path, bytes: asNumber(item.bytes) ?? null, sha256: asString(item.sha256) ?? null })
  }
  return out
}

/**
 * 逐字段透传并归一化类型，**唯一行为 = "清单里说什么就是什么"**，不编造字段。
 *
 * `taskTypes` 口径（DEC-81 两代兼容，与 `web/src/stores/runtime.ts` 的 `declaresTaskType` 同源）：
 * 新清单写数组就收数组（只留 number 元素）；数组缺失或里面没有 number 元素时，回退旧清单的单值
 * `taskType`（是 number 就包成单元素数组）；两代都空 ⇒ `[]` —— **不猜**，声明为空的构建不会被选中。
 *
 * `fingerprints` 是 dev 侧的兜底：暂存清单里的 `treeSha256` 可能是旧脚本写的、或者暂存之后
 * 有人手工动过目录 —— 只要现算出了指纹就以现算的为准（它才代表"磁盘上现在是什么"）。
 *
 * @param staged 暂存清单（原样读进来的 JSON）
 * @param fingerprints 构建名 → 现算指纹；命中则**覆盖**该构建清单里的旧值
 */
export function normalizeBuilds(
  staged: StagedManifest,
  fingerprints?: Record<string, BuildFingerprint> | null,
): ReleaseManifestBuild[] {
  const raw = Array.isArray(staged?.builds) ? staged.builds : []
  const out: ReleaseManifestBuild[] = []
  for (const build of raw) {
    if (!build || typeof build !== 'object') continue
    const item = build as StagedBuild
    // 构建名是清单的键（产物挂在 `/unity/<key>/`）：没有它这一项根本没法用，跳过而不是编个假名字
    const key = asString(item.key)
    if (key === undefined) continue

    const inArray = Array.isArray(item.taskTypes) ? item.taskTypes.filter((n) => typeof n === 'number') : []
    const legacy = asNumber(item.taskType)
    const taskTypes = inArray.length > 0 ? inArray : legacy === undefined ? [] : [legacy]

    const loader = asString(item.loader)
    const computed = fingerprints?.[key]?.treeSha256

    out.push({
      key,
      taskTypes,
      entry: asString(item.entry),
      // `loader` 的"没有"是 `null`（与清单里显式写的 `null` 同形），不是 `undefined`
      loader: loader === undefined ? null : loader,
      bridge: Boolean(item.bridge),
      fileCount: asNumber(item.fileCount),
      totalBytes: asNumber(item.totalBytes),
      stagedAt: asString(item.stagedAt),
      treeSha256: computed ?? asString(item.treeSha256),
    })
  }
  return out
}

/**
 * 清单里那个指纹还算不算数？
 *
 * 判据（任一条不满足即**不新鲜**）：
 *   ① 清单给了 `treeSha256`；
 *   ② 清单给了逐文件表（`files` 非空）；
 *   ③ 清单声明的 `fileCount` 与实际文件数一致；
 *   ④ 清单声明的 `totalBytes` 与实际总字节一致 —— **仅在确能验算时**才算判据
 *      （拿不到实际大小就跳过这一项，不因此判"不新鲜"）；
 *   ⑤ 每个文件都在，且字节与哈希都与清单相符（字节拿不到时只比哈希）。
 *
 * ⚠️ 本函数**只做廉价比对**，且是"有一次早退就更便宜"的顺序：任何一处不符立刻返回。
 * 它**不负责**算出目录指纹 —— 那是 `resolveTreeFingerprints` 的事，别为了判"新鲜"去重算整棵树，
 * 那是 86 MB 的活儿，而 dev 每次刷新页面都要问一次。
 */
export async function isTreeFingerprintFresh(
  dir: string,
  build: StagedBuild,
  fs: FingerprintFs,
): Promise<boolean> {
  return (await judgeFreshness(dir, build, fs)).fresh
}

/** `isTreeFingerprintFresh` 的实现体：多带回一个"为什么"，供重算日志使用。 */
async function judgeFreshness(dir: string, build: StagedBuild, fs: FingerprintFs): Promise<FreshnessVerdict> {
  const declared = asString(build.treeSha256)
  if (declared === undefined) return { fresh: false, reason: '清单里没有 treeSha256' }

  const files = knownFiles(build)
  if (files.length === 0) return { fresh: false, reason: '清单里没有逐文件表，无法确认目录内容' }

  const actual = await fs.listFiles(dir)
  const declaredCount = asNumber(build.fileCount)
  if (declaredCount !== undefined && declaredCount !== actual.length) {
    return { fresh: false, reason: `文件数不符（清单 ${declaredCount}，实际 ${actual.length}）` }
  }

  const onDisk = new Set(actual)
  let actualBytes: number | null = null
  for (const file of files) {
    if (!onDisk.has(file.path)) return { fresh: false, reason: `文件不在暂存目录里：${file.path}` }
    const goal = fileUnder(dir, file.path)
    const hash = await fs.sha256(goal)
    if (file.sha256 === null) return { fresh: false, reason: `清单没记这个文件的哈希：${file.path}` }
    if (hash !== file.sha256) return { fresh: false, reason: `文件内容变了：${file.path}` }
    // 注入的 fs 能直接给大小就省一次读；给不了就退回清单里记的字节数（那本来就是暂存时量出来的）
    const size = fs.bytes ? await fs.bytes(goal) : file.bytes
    if (size === null) return { fresh: false, reason: `拿不到文件大小，且清单没记：${file.path}` }
    if (file.bytes !== null && size !== file.bytes) {
      return { fresh: false, reason: `文件大小变了：${file.path}（清单 ${file.bytes}，实际 ${size}）` }
    }
    actualBytes = (actualBytes ?? 0) + size
  }

  // 总字节只在"确能验算"时参与判定：拿不到实际大小时跳过，不据此判不新鲜
  const declaredBytes = asNumber(build.totalBytes)
  if (declaredBytes !== undefined && actualBytes !== null && declaredBytes !== actualBytes) {
    return { fresh: false, reason: `总字节不符（清单 ${declaredBytes}，实际 ${actualBytes}）` }
  }
  return { fresh: true, reason: '' }
}

/** 现算一棵树的指纹（与流水线 `treeSha256` 同算法的"路径 + 单文件哈希再哈希"）。 */
async function computeFingerprint(
  dir: string,
  files: readonly string[],
  fs: FingerprintFs,
  declared: KnownFile[],
  createHashImpl: HashFactory,
): Promise<BuildFingerprint> {
  const declaredBytes = new Map(declared.map((file) => [file.path, file.bytes]))
  const hash = createHashImpl('sha256')
  let totalBytes = 0
  let bytesKnown = false
  for (const file of files) {
    const goal = fileUnder(dir, file)
    hash.update(file)
    hash.update(await fs.sha256(goal))
    // 大小：优先问 fs（一次 stat）；问不到就取清单里暂存时量好的字节数。
    // **拿不到就跳过**（不算 0）—— 编造一个 0 会让 totalBytes 偏小，而那是"编出来的事实"
    const size = fs.bytes ? await fs.bytes(goal) : (declaredBytes.get(file) ?? null)
    if (size !== null) {
      totalBytes += size
      bytesKnown = true
    }
  }
  if (!bytesKnown && files.length > 0) {
    // dev 侧诊断信息，不影响 URL 口径（指纹本身仍然是对的）
    console.warn(`[unity] 构建目录的 totalBytes 不可得（${files.length} 个文件都没量到大小），已置 0。`)
  }
  return { treeSha256: hash.digest('hex'), fileCount: files.length, totalBytes }
}

/**
 * 给一批构建算出**可信的**目录指纹。
 *
 * 常规路径（清单是暂存脚本刚写的、目录没被动过）：`isTreeFingerprintFresh` 判新鲜 ⇒
 * **直接复用清单里的 `treeSha256`，一次文件都不重算**。
 * 兜底路径（字段缺失 / 目录被手工改过 / 暂存后又被重新构建）：现算一次，并留一条 warn 说明原因 ——
 * 静默重算会让人以为"指纹本来就是好的"，而这个坑（Issue #60）恰恰就是"指纹缺失但不报错"造成的。
 *
 * @param dir 暂存根（产物目录都挂在它下面：`<dir>/<key>/**`）
 * @param builds 暂存清单里的构建项
 * @param fs 文件系统实现
 * @param createHashImpl 哈希原语（**必传**：本模块不依赖 `node:*`，由调用方注入）
 * @returns 构建名 → 指纹；读不到东西的构建**不出现在结果里**（调用方据此继续用清单原值）
 */
export async function resolveTreeFingerprints(
  dir: string,
  builds: StagedBuild[],
  fs: FingerprintFs,
  createHashImpl: HashFactory,
): Promise<Record<string, BuildFingerprint>> {
  const out: Record<string, BuildFingerprint> = {}
  for (const build of builds) {
    if (!build || typeof build !== 'object') continue
    const key = asString((build as StagedBuild).key)
    if (key === undefined) continue
    const item = build as StagedBuild
    const buildDir = fileUnder(dir, key)
    const declaredTreeSha256 = asString(item.treeSha256)
    const declaredFiles = knownFiles(item)

    const verdict = await judgeFreshness(buildDir, item, fs)
    if (verdict.fresh && declaredTreeSha256 !== undefined) {
      // 常规路径：清单里的指纹仍然代表磁盘上的内容，零重算
      out[key] = {
        treeSha256: declaredTreeSha256,
        fileCount: asNumber(item.fileCount) ?? declaredFiles.length,
        totalBytes: asNumber(item.totalBytes) ?? 0,
      }
      continue
    }

    let files: string[]
    try {
      files = await fs.listFiles(buildDir)
    } catch (cause) {
      // 目录不在 / 读不动：这一项给不出可信指纹，交给调用方用清单原值（并已在上层兜底成"未包含"）
      console.warn(
        `[unity] 构建 ${key} 的暂存目录读不动，跳过指纹复算：${cause instanceof Error ? cause.message : String(cause)}`,
      )
      continue
    }
    files = [...files].sort()
    const fingerprint = await computeFingerprint(buildDir, files, fs, declaredFiles, createHashImpl)
    out[key] = fingerprint
    console.warn(
      `[unity] 构建 ${key} 的 treeSha256 重算：${verdict.reason}；` +
        `实算 ${files.length} 个文件 / ${fingerprint.totalBytes} 字节，指纹 ${fingerprint.treeSha256.slice(0, 12)}…`,
    )
  }
  return out
}
