/**
 * 发布清单合成 + 目录指纹兜底的单测（GitHub Issue #60）。
 *
 * 为什么值得单独锁：这条链错了**不会报错**，只会表现为"重新构建 + 重新暂存之后，
 * 浏览器还是跑上一版场景"（Unity 的 `webGLDataCaching` 按 `.data` 的 URL 存 IndexedDB）。
 * 所以这里把三件事钉死：① 清单字段如实透传（不编造、不猜）；② 新鲜就**零重算**（省掉 86 MB 的整树哈希）；
 * ③ 内容一变指纹必变，且**与流水线算法逐位同值**（否则 dev 与打出来的包会算出两个指纹）。
 *
 * ⚠️ 假 fs 的路径形状必须与现实一致：产物挂在 `<暂存根>/<key>/**`，
 * 所以内容表按 `<key>/<相对路径>` 存 —— 少了 `<key>` 这一段，假 fs 会静默查不到内容（都哈希成空串）。
 */
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, relative, sep } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
// 跨模块一致性用例要真的去问流水线那份实现（仓库内相对路径）。
// `.mjs` 没有类型声明，用下面这行显式断言收窄形状 —— 不要 any，也不要 ts-ignore。
// @ts-expect-error 该文件是 JS（无类型声明），形状由下一行的断言约定
import { treeSha256 as canonicalTreeSha256 } from '../../../tools/pipeline/lib/tree-hash.mjs'
import {
  isTreeFingerprintFresh,
  normalizeBuilds,
  resolveTreeFingerprints,
  type FingerprintFs,
  type HashFactory,
  type StagedBuild,
  type StagedBuildFile,
} from './release-manifest'

/** 注入给被测模块的哈希原语（与生产同一份 `node:crypto` 实现）。 */
const sha256Factory = createHash as unknown as HashFactory

/** 流水线那份实现的形状（上面用 ts-expect-error 放行 import，这里把类型补回来）。 */
const pipelineTreeSha256 = canonicalTreeSha256 as (dir: string, files: readonly string[]) => Promise<string>

const DIR = '/staged'
const KEY = 'main'

/**
 * 内存假 fs。入参是**几个构建目录**：`'<key>' → { 相对路径 → 内容 }`，
 * 与真实暂存根的形状一致（产物挂在 `<暂存根>/<key>/**`）——
 * 少了 `<key>` 这一段，假 fs 会静默查不到内容（一切哈希成空串），测出来的结论全是假的。
 */
function fakeFs(trees: Record<string, Record<string, string>>, withBytes = true) {
  const calls = { listFiles: 0, sha256: 0, bytes: 0 }
  const content: Record<string, string> = {}
  for (const [key, files] of Object.entries(trees)) {
    for (const [path, text] of Object.entries(files)) content[`${DIR}/${key}/${path}`] = text
  }
  const sha256Of = (text: string): string => createHash('sha256').update(text).digest('hex')
  const fs: FingerprintFs = {
    async listFiles(dir) {
      calls.listFiles += 1
      const prefix = `${dir}/`
      return Object.keys(content)
        .filter((path) => path.startsWith(prefix))
        .map((path) => path.slice(prefix.length))
        .sort()
    },
    async sha256(file) {
      calls.sha256 += 1
      return sha256Of(content[file] ?? '')
    },
    ...(withBytes
      ? {
          async bytes(file: string) {
            calls.bytes += 1
            return Buffer.byteLength(content[file] ?? '', 'utf8')
          },
        }
      : {}),
  }
  return { fs, calls }
}

/** 只有一个构建目录时的简写。 */
const oneTree = (content: Record<string, string>): Record<string, Record<string, string>> => ({
  [KEY]: content,
})

/** 按内容造清单里的逐文件表（真实前提：暂存脚本记的就是这些值）。 */
function filesOf(content: Record<string, string>): StagedBuildFile[] {
  return Object.entries(content).map(([path, text]) => ({
    path,
    bytes: Buffer.byteLength(text, 'utf8'),
    sha256: createHash('sha256').update(text).digest('hex'),
  }))
}

const totalBytesOf = (content: Record<string, string>): number =>
  Object.values(content).reduce((sum, text) => sum + Buffer.byteLength(text, 'utf8'), 0)

/**
 * 独立复刻流水线的算法（`tools/pipeline/lib/tree-hash.mjs` 的 `treeSha256`）。
 * 故意**不** import 它：拷贝一份到测试里，才能在它被改动时红 —— 那正是"两边悄悄漂开"的信号。
 */
function canonicalTreeHash(content: Record<string, string>): string {
  const hash = createHash('sha256')
  for (const file of Object.keys(content).sort()) {
    hash.update(file)
    hash.update(createHash('sha256').update(content[file]!).digest('hex'))
  }
  return hash.digest('hex')
}

/** 造一份"新鲜"的暂存清单项（文件表与内容表完全对得上）。 */
function stagedBuild(content: Record<string, string>, overrides: Partial<StagedBuild> = {}): StagedBuild {
  return {
    key: KEY,
    taskTypes: [4, 5, 8, 9],
    loader: 'Build/main.loader.js',
    bridge: true,
    files: filesOf(content),
    fileCount: Object.keys(content).length,
    totalBytes: totalBytesOf(content),
    treeSha256: canonicalTreeHash(content),
    ...overrides,
  }
}

/** 统计整树哈希（`digest`）被调用了几次 —— "零重算"这条性能口径就锁它。 */
function countingHash(calls: { digest: number }): HashFactory {
  return () => ({
    update: () => undefined,
    digest: () => {
      calls.digest += 1
      return createHash('sha256').update('').digest('hex')
    },
  })
}

const SAMPLE = {
  'index.html': '<html></html>',
  'Build/main.data': 'DATA-1',
  'Build/main.wasm': 'WASM-1',
}

describe('normalizeBuilds：清单里说什么就是什么（不编造字段）', () => {
  it('新清单：taskTypes 数组原样采用', () => {
    const [build] = normalizeBuilds({ builds: [{ key: 'main', taskTypes: [4, 5, 8, 9] }] })
    expect(build).toMatchObject({ key: 'main', taskTypes: [4, 5, 8, 9] })
  })

  it('旧清单：单值 taskType 回退成 [5]（DEC-81 两代兼容）', () => {
    const [build] = normalizeBuilds({ builds: [{ key: 'training', taskType: 5 }] })
    expect(build?.taskTypes).toEqual([5])
  })

  it('数组里混了非 number：只收 number，不能整数组丢掉', () => {
    const [build] = normalizeBuilds({ builds: [{ key: 'main', taskTypes: [4, '5', null, 8] }] })
    expect(build?.taskTypes).toEqual([4, 8])
  })

  it('两代都空 ⇒ []（不猜：声明为空的构建不会被选中）', () => {
    expect(normalizeBuilds({ builds: [{ key: 'empty' }] })[0]?.taskTypes).toEqual([])
    expect(normalizeBuilds({ builds: [{ key: 'empty', taskTypes: [] }] })[0]?.taskTypes).toEqual([])
  })

  it('bridge 缺失 ⇒ false；显式 true ⇒ true（不是"真值透传"）', () => {
    const [missing] = normalizeBuilds({ builds: [{ key: 'a' }] })
    const [declared] = normalizeBuilds({ builds: [{ key: 'b', bridge: true }] })
    expect(missing?.bridge).toBe(false)
    expect(declared?.bridge).toBe(true)
  })

  it('数字字段类型不对 ⇒ undefined（不 String() 硬转，也不当成 0）', () => {
    const [build] = normalizeBuilds({
      builds: [{ key: 'main', fileCount: '37', totalBytes: null, stagedAt: 123 }],
    })
    expect(build?.fileCount).toBeUndefined()
    expect(build?.totalBytes).toBeUndefined()
    expect(build?.stagedAt).toBeUndefined()
  })

  it('entry/loader 类型不对 ⇒ entry undefined、loader null（与清单显式 null 同形）', () => {
    const [build] = normalizeBuilds({ builds: [{ key: 'main', entry: 7, loader: {} }] })
    expect(build?.entry).toBeUndefined()
    expect(build?.loader).toBeNull()
  })

  it('没有 key 的项直接跳过（产物挂在 /unity/<key>/，编不出名字就不该出现）', () => {
    expect(normalizeBuilds({ builds: [{ taskTypes: [4] }, { key: '' }, { key: 'main' }] })).toHaveLength(1)
  })

  it('空 builds / 缺 builds 都不抛，返回 []', () => {
    expect(normalizeBuilds({ builds: [] })).toEqual([])
    expect(normalizeBuilds({})).toEqual([])
    expect(normalizeBuilds({ builds: undefined })).toEqual([])
  })
})

describe('normalizeBuilds：dev 侧指纹兜底的覆盖口径', () => {
  const staged = { builds: [{ key: 'main', treeSha256: 'old-from-manifest' }] }

  it('指纹命中 ⇒ 覆盖清单里的旧值（清单可能是旧脚本写的 / 事后被手工改过）', () => {
    const fresh = { main: { treeSha256: 'computed-now', fileCount: 3, totalBytes: 30 } }
    expect(normalizeBuilds(staged, fresh)[0]?.treeSha256).toBe('computed-now')
  })

  it('指纹未命中 ⇒ 保留清单里的值（不覆盖成 undefined）', () => {
    const other = { other: { treeSha256: 'x', fileCount: 1, totalBytes: 1 } }
    expect(normalizeBuilds(staged, other)[0]?.treeSha256).toBe('old-from-manifest')
  })

  it('两者都没有 ⇒ undefined（宁可缺，也不编一个假指纹）', () => {
    expect(normalizeBuilds({ builds: [{ key: 'main' }] })[0]?.treeSha256).toBeUndefined()
    expect(normalizeBuilds({ builds: [{ key: 'main' }] }, null)[0]?.treeSha256).toBeUndefined()
  })

  it('清单里的 treeSha256 类型不对 ⇒ undefined（不把数字当指纹）', () => {
    expect(normalizeBuilds({ builds: [{ key: 'main', treeSha256: 42 }] })[0]?.treeSha256).toBeUndefined()
  })
})

describe('isTreeFingerprintFresh：廉价比对（不重算整棵树）', () => {
  it('文件表与目录全一致 ⇒ true', async () => {
    const { fs } = fakeFs(oneTree(SAMPLE))
    expect(await isTreeFingerprintFresh(`${DIR}/${KEY}`, stagedBuild(SAMPLE), fs)).toBe(true)
  })

  it('改一个字节 ⇒ false（只改内容、大小不变也算变）', async () => {
    const { fs } = fakeFs(oneTree({ ...SAMPLE, 'Build/main.data': 'DATA-2' }))
    expect(await isTreeFingerprintFresh(`${DIR}/${KEY}`, stagedBuild(SAMPLE), fs)).toBe(false)
  })

  it('fileCount 与实际不符 ⇒ false（多一个文件也逃不掉）', async () => {
    const { fs } = fakeFs(oneTree({ ...SAMPLE, 'Build/extra.txt': 'X' }))
    expect(await isTreeFingerprintFresh(`${DIR}/${KEY}`, stagedBuild(SAMPLE), fs)).toBe(false)
  })

  it('totalBytes 与实际不符 ⇒ false（大小也算内容的一部分）', async () => {
    const { fs } = fakeFs(oneTree(SAMPLE))
    const build = stagedBuild(SAMPLE, { totalBytes: totalBytesOf(SAMPLE) + 1 })
    expect(await isTreeFingerprintFresh(`${DIR}/${KEY}`, build, fs)).toBe(false)
  })

  it('treeSha256 缺失 ⇒ false（这就是 Issue #60 的原始状态）', async () => {
    const { fs } = fakeFs(oneTree(SAMPLE))
    const build = stagedBuild(SAMPLE, { treeSha256: undefined })
    expect(await isTreeFingerprintFresh(`${DIR}/${KEY}`, build, fs)).toBe(false)
  })

  it('files 为空 / 缺失 ⇒ false（没有任何可比对的依据）', async () => {
    const { fs } = fakeFs(oneTree(SAMPLE))
    const dir = `${DIR}/${KEY}`
    expect(await isTreeFingerprintFresh(dir, stagedBuild(SAMPLE, { files: [] }), fs)).toBe(false)
    expect(await isTreeFingerprintFresh(dir, stagedBuild(SAMPLE, { files: undefined }), fs)).toBe(false)
  })

  it('清单没记某个文件的哈希 ⇒ false（不靠"看起来一样"下结论）', async () => {
    const { fs } = fakeFs(oneTree(SAMPLE))
    const files = filesOf(SAMPLE).map((file, index) => (index === 0 ? { ...file, sha256: undefined } : file))
    expect(await isTreeFingerprintFresh(`${DIR}/${KEY}`, stagedBuild(SAMPLE, { files }), fs)).toBe(false)
  })

  it('清单说文件更大，实际更小 ⇒ false（大小被改过）', async () => {
    const { fs } = fakeFs(oneTree(SAMPLE))
    const files = filesOf(SAMPLE).map((file) => ({ ...file, bytes: (file.bytes as number) + 1 }))
    expect(await isTreeFingerprintFresh(`${DIR}/${KEY}`, stagedBuild(SAMPLE, { files }), fs)).toBe(false)
  })

  it('注入的 fs 没有 bytes：仍能判新鲜（退回清单里记的字节数，不因此误判"不新鲜"）', async () => {
    const { fs } = fakeFs(oneTree(SAMPLE), false)
    expect(await isTreeFingerprintFresh(`${DIR}/${KEY}`, stagedBuild(SAMPLE), fs)).toBe(true)
    const changed = fakeFs(oneTree({ ...SAMPLE, 'Build/main.wasm': 'WASM-2' }), false)
    expect(await isTreeFingerprintFresh(`${DIR}/${KEY}`, stagedBuild(SAMPLE), changed.fs)).toBe(false)
  })
})

describe('resolveTreeFingerprints：新鲜零重算，不新鲜才现算', () => {
  it('新鲜 ⇒ 复用清单里的指纹，整树哈希一次都不算（86 MB 的性能口径）', async () => {
    const { fs, calls } = fakeFs(oneTree(SAMPLE))
    const digestCalls = { digest: 0 }
    const build = stagedBuild(SAMPLE)
    const out = await resolveTreeFingerprints(DIR, [build], fs, countingHash(digestCalls))
    expect(digestCalls.digest).toBe(0)
    expect(out.main?.treeSha256).toBe(build.treeSha256)
    expect(out.main?.fileCount).toBe(3)
    expect(out.main?.totalBytes).toBe(totalBytesOf(SAMPLE))
    // 新鲜度校验本身是廉价的（逐个文件比对），但**没有**重算整棵树的指纹
    expect(calls.sha256).toBeGreaterThan(0)
  })

  it('缺 treeSha256（Issue #60 的原始状态）⇒ 现算，且与流水线算法同值', async () => {
    const { fs } = fakeFs(oneTree(SAMPLE))
    const out = await resolveTreeFingerprints(
      DIR,
      [stagedBuild(SAMPLE, { treeSha256: undefined })],
      fs,
      sha256Factory,
    )
    expect(out.main?.treeSha256).toBe(canonicalTreeHash(SAMPLE))
    expect(out.main?.treeSha256).toMatch(/^[0-9a-f]{64}$/)
  })

  it('清单被手工改过（文件表过期）⇒ 现算的结果反映**磁盘现在的**内容', async () => {
    const stale = stagedBuild(SAMPLE, { treeSha256: undefined })
    const edited = { ...SAMPLE, 'Build/main.data': 'DATA-2' }
    const { fs } = fakeFs(oneTree(edited))
    const out = await resolveTreeFingerprints(DIR, [stale], fs, sha256Factory)
    expect(out.main?.treeSha256).toBe(canonicalTreeHash(edited))
    // 关键：指纹不是拿清单里那串旧哈希顶替的
    expect(out.main?.treeSha256).not.toBe(canonicalTreeHash(SAMPLE))
  })

  it('改一个字节 ⇒ 指纹变；再改回 ⇒ 指纹回原值（确定性，URL 只随内容变）', async () => {
    const build = stagedBuild(SAMPLE, { treeSha256: undefined })
    const before = await resolveTreeFingerprints(DIR, [build], fakeFs(oneTree(SAMPLE)).fs, sha256Factory)
    const edited = { ...SAMPLE, 'Build/main.wasm': 'WASM-2' }
    const after = await resolveTreeFingerprints(DIR, [build], fakeFs(oneTree(edited)).fs, sha256Factory)
    const again = await resolveTreeFingerprints(DIR, [build], fakeFs(oneTree(SAMPLE)).fs, sha256Factory)
    expect(after.main?.treeSha256).not.toBe(before.main?.treeSha256)
    expect(again.main?.treeSha256).toBe(before.main?.treeSha256)
  })

  it('注入的 fs 没有 bytes ⇒ totalBytes 仍给实测值（清单记的字节），不是 undefined', async () => {
    const { fs } = fakeFs(oneTree(SAMPLE), false)
    const out = await resolveTreeFingerprints(
      DIR,
      [stagedBuild(SAMPLE, { treeSha256: undefined })],
      fs,
      sha256Factory,
    )
    expect(out.main?.totalBytes).toBe(totalBytesOf(SAMPLE))
    expect(Number.isFinite(out.main?.totalBytes)).toBe(true)
  })

  it('大小彻底拿不到（fs 没 bytes、清单也没记）⇒ totalBytes 置 0，但**不编造**成看似正常的数', async () => {
    const { fs } = fakeFs(oneTree(SAMPLE), false)
    const files = filesOf(SAMPLE).map((file) => ({ path: file.path, sha256: file.sha256 }))
    const out = await resolveTreeFingerprints(
      DIR,
      [stagedBuild(SAMPLE, { treeSha256: undefined, files })],
      fs,
      sha256Factory,
    )
    expect(out.main?.totalBytes).toBe(0)
    // 指纹本身仍然是对的（大小不影响指纹，指纹只吃路径与内容哈希）
    expect(out.main?.treeSha256).toBe(canonicalTreeHash(SAMPLE))
  })

  it('多个构建各算各的；没有 key 的项跳过', async () => {
    const second = { ...SAMPLE, 'Build/main.wasm': 'WASM-2' }
    const { fs } = fakeFs({ main: SAMPLE, training: second })
    const out = await resolveTreeFingerprints(
      DIR,
      [
        { taskTypes: [4] },
        stagedBuild(SAMPLE, { key: 'main', treeSha256: undefined }),
        stagedBuild(second, { key: 'training', treeSha256: undefined }),
      ],
      fs,
      sha256Factory,
    )
    expect(Object.keys(out).sort()).toEqual(['main', 'training'])
    expect(out.main?.treeSha256).toBe(canonicalTreeHash(SAMPLE))
    expect(out.training?.treeSha256).toBe(canonicalTreeHash(second))
    expect(out.main?.treeSha256).not.toBe(out.training?.treeSha256)
  })

  it('暂存目录读不动（产物不在）⇒ 不抛出、不编指纹，调用方继续用清单原值', async () => {
    const { fs } = fakeFs(oneTree(SAMPLE))
    const broken: FingerprintFs = { ...fs, listFiles: async () => Promise.reject(new Error('ENOENT')) }
    const out = await resolveTreeFingerprints(
      DIR,
      [stagedBuild(SAMPLE, { treeSha256: undefined })],
      broken,
      sha256Factory,
    )
    expect(out).toEqual({})
  })

  it('空 builds ⇒ 空结果，不抛', async () => {
    const { fs } = fakeFs(oneTree(SAMPLE))
    expect(await resolveTreeFingerprints(DIR, [], fs, sha256Factory)).toEqual({})
  })
})

describe('跨实现一致性：与流水线的 treeSha256 逐位相等（Issue #60 的修复价值全押在这上面）', () => {
  let root = ''
  afterAll(async () => {
    if (root) await rm(root, { recursive: true, force: true })
  })

  /**
   * 真磁盘上的一棵小树，**返回到 `<key>` 那一层的暂存根**。
   * 形状必须与生产一致：`resolveTreeFingerprints` 拿的是暂存根，产物在 `<暂存根>/<key>/**`。
   */
  async function realTree(content: Record<string, string>, key = 'main'): Promise<string> {
    root = await mkdtemp(join(tmpdir(), 'wsu3-release-manifest-'))
    for (const [path, text] of Object.entries(content)) {
      const full = join(root, key, path)
      await mkdir(dirname(full), { recursive: true })
      await writeFile(full, text)
    }
    return root
  }

  /** 真 `node:fs` 版的文件系统实现（生产里由 vite.config.ts 给的就是这一套动作）。 */
  const realFs: FingerprintFs = {
    async listFiles(dir) {
      const out: string[] = []
      const walk = async (current: string): Promise<void> => {
        for (const entry of await readdir(current, { withFileTypes: true })) {
          const full = join(current, entry.name)
          if (entry.isDirectory()) await walk(full)
          else if (entry.isFile()) out.push(relative(dir, full).split(sep).join('/'))
        }
      }
      await walk(dir)
      return out
    },
    async sha256(file) {
      return createHash('sha256')
        .update(await readFile(file))
        .digest('hex')
    },
    async bytes(file) {
      return (await stat(file)).size
    },
  }

  it('同一棵真目录：本模块现算的指纹 === tree-hash.mjs 的 treeSha256', async () => {
    // 路径写死（含子目录、不同扩展名、以及一条含空格的路径）：覆盖路径拼接与排序口径
    const content = {
      'index.html': '<html></html>',
      'Build/main.data': 'DATA-1',
      'Build/main.wasm': 'WASM-1',
      'Build/sub dir/extra file.txt': 'SPACED',
      'StreamingAssets/aa/catalog.json': '{"a":1}',
    }
    const stagingRoot = await realTree(content)

    // 本模块：走"清单没写指纹 ⇒ 现算"那条路，直接读真磁盘（dir = 暂存根）
    const staged: StagedBuild = { key: 'main', treeSha256: undefined }
    const mine = await resolveTreeFingerprints(stagingRoot, [staged], realFs, sha256Factory)
    // 流水线：`treeSha256(产物目录, files)`，files 用写死的相对路径集合
    const theirs = await pipelineTreeSha256(join(stagingRoot, 'main'), Object.keys(content))

    expect(mine.main?.treeSha256).toBe(theirs)
    expect(mine.main?.fileCount).toBe(Object.keys(content).length)
    expect(mine.main?.totalBytes).toBe(
      Object.values(content).reduce((sum, text) => sum + Buffer.byteLength(text, 'utf8'), 0),
    )
  })

  it('再复算 pack.mjs 的口径（同算法、同值）—— 三方一致才算"同一份产物"', async () => {
    const content = { 'Build/a.data': 'AAAA', 'Build/b.wasm': 'BBBB' }
    const stagingRoot = await realTree(content)
    const buildDir = join(stagingRoot, 'main')
    // 与 `tools/pipeline/pack.mjs` 的 `treeHash` 逐行等价的写法
    const packStyle = async (root: string, list: readonly string[]): Promise<string> => {
      const hash = createHash('sha256')
      for (const file of [...list].sort()) {
        hash.update(file)
        hash.update(
          createHash('sha256')
            .update(await readFile(join(root, file)))
            .digest('hex'),
        )
      }
      return hash.digest('hex')
    }
    const mine = await resolveTreeFingerprints(
      stagingRoot,
      [{ key: 'main', treeSha256: undefined }],
      realFs,
      sha256Factory,
    )
    expect(mine.main?.treeSha256).toBe(await pipelineTreeSha256(buildDir, Object.keys(content)))
    expect(mine.main?.treeSha256).toBe(await packStyle(buildDir, Object.keys(content)))
  })
})
