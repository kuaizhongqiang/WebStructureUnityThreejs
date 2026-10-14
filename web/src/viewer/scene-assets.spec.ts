/**
 * 三维资产取数层的单测（DEC-98）。
 *
 * 两层（与 `adopted-content.spec.ts` 同一路数）：
 *   ① **纯函数**：项目 id → 器件段、模型查找、贴图 URL（先器件、后 `_shared`）；
 *   ② **真实表的结构不变量**：直接读 `content/asset-*.json`，断言"表里写的路径真的在磁盘上" ——
 *      三张表是流水线生成的产物，漂了（换名 / 少搬一张图）就该在这里红，而不是等页面缺图。
 */
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { deviceOfProject, modelOfDevice, textureUrl, type SceneAssetTables } from './scene-assets'

function readJson(relative: string): unknown {
  return JSON.parse(readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8'))
}

/** 仓库内的相对路径（`content/assets/three/...`）→ 绝对路径。 */
function repoFile(relative: string): string {
  return fileURLToPath(new URL(`../../../${relative}`, import.meta.url))
}

const emptyTables = (patch: Partial<SceneAssetTables> = {}): SceneAssetTables => ({
  materials: {},
  textures: {},
  models: [],
  ...patch,
})

describe('deviceOfProject：项目 id → 器件段', () => {
  it('去掉 clip_ 前缀，驼峰保持原样', () => {
    expect(deviceOfProject('clip_contactor')).toBe('contactor')
    expect(deviceOfProject('clip_combinationSwitch')).toBe('combinationSwitch')
    expect(deviceOfProject('clip_speedRelay')).toBe('speedRelay')
  })

  it('不是器件项目就返回 null（页面据此显示"本项目没有三维模型"，不拿别的器件顶上）', () => {
    expect(deviceOfProject('clip_quiz')).toBe('quiz')
    expect(deviceOfProject('demo-temperature')).toBeNull()
    expect(deviceOfProject('clip_')).toBeNull()
    expect(deviceOfProject('clip_2x')).toBeNull()
    expect(deviceOfProject(undefined)).toBeNull()
  })
})

describe('modelOfDevice / textureUrl：只认表', () => {
  const tables = emptyTables({
    models: [
      {
        device: 'contactor',
        stem: 'NewACContactor',
        glb: 'content/assets/three/contactor/NewACContactor.glb',
      },
    ],
    textures: {
      'contactor/NewACContactor_NewACContactor_Base Color.png':
        'content/assets/three/contactor/NewACContactor_NewACContactor_Base Color.png',
      '_shared/White.png': 'content/assets/three/_shared/White.png',
    },
  })

  it('模型走转换报告，URL 指向产物（不硬编路径）', () => {
    const found = modelOfDevice(tables, 'contactor')
    expect(found?.stem).toBe('NewACContactor')
    expect(found?.url.endsWith('/assets/three/contactor/NewACContactor.glb')).toBe(true)
  })

  it('表里没有的器件返回 null（而不是猜一个路径去 404）', () => {
    expect(modelOfDevice(tables, 'breaker')).toBeNull()
  })

  it('贴图先查器件、再查 _shared；文件名里的空格要编码', () => {
    const own = textureUrl(tables, 'contactor', 'NewACContactor_NewACContactor_Base Color.png')
    expect(own).toContain('contactor/NewACContactor_NewACContactor_Base%20Color.png')
    const shared = textureUrl(tables, 'contactor', 'White.png')
    expect(shared?.endsWith('assets/three/_shared/White.png')).toBe(true)
    expect(textureUrl(tables, 'breaker', 'White.png')?.endsWith('assets/three/_shared/White.png')).toBe(true)
    expect(textureUrl(tables, 'contactor', 'Nope.png')).toBeNull()
  })
})

describe('真实的产物表（content/asset-*.json）结构与磁盘一致', () => {
  const report = readJson('../../../content/asset-convert-report.json') as {
    models: Array<{ device: string; stem: string; glb: string }>
  }
  const lookup = readJson('../../../content/asset-material-textures.json') as {
    textures: Record<string, string>
  }
  /**
   * ⚠️ 下面两条比的是**磁盘**，而 `content/assets/three/**` 按 DEC-57 **不进 git** ——
   * CI 的干净 checkout 上没有它。所以：有资产时逐条真比（本机常态），没有时**明确跳过**
   * （与冒烟里"要么挂上模型、要么明确报告未包含"同一口径：不许静默通过，也不许无故变红）。
   */
  const assetsRoot = repoFile('content/assets/three')
  const hasAssets = existsSync(assetsRoot)
  if (!hasAssets) {
    console.warn(
      `[scene-assets.spec] 跳过"磁盘存在性"断言：本 checkout 没有 ${assetsRoot}（大资产不进 git，DEC-57）`,
    )
  }

  it.skipIf(!hasAssets)('每个器件的 GLB 都真的在磁盘上（表漂了就会红，而不是页面缺模型）', () => {
    expect(report.models.length).toBeGreaterThan(0)
    const missing = report.models.filter((model) => !existsSync(repoFile(model.glb)))
    expect(missing.map((model) => model.glb)).toEqual([])
  })

  it.skipIf(!hasAssets)('查找表里的每张贴图都真的在磁盘上（DEC-97：三张图全靠它）', () => {
    const entries = Object.entries(lookup.textures)
    expect(entries.length).toBeGreaterThan(0)
    const missing = entries.filter(([, path]) => !existsSync(repoFile(path)))
    expect(missing.map(([key]) => key)).toEqual([])
  })

  it('每个器件都有 base / normal / mask 三张（缺一张就是"有的材质是常数灰"）', () => {
    for (const model of report.models) {
      const keys = Object.keys(lookup.textures).filter((key) => key.startsWith(`${model.device}/`))
      expect(keys.length, `${model.device} 的贴图条目`).toBeGreaterThanOrEqual(3)
    }
  })
})

describe('缺元数据表时给出人话错误（不假装加载）', () => {
  it('三张表读不到 → 抛"三维资产未包含在本次发布里"', async () => {
    vi.resetModules()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 404 })),
    )
    try {
      const fresh = await import('./scene-assets')
      await expect(fresh.loadSceneTables()).rejects.toThrow(/三维资产未包含在本次发布里/)
    } finally {
      vi.unstubAllGlobals()
      vi.resetModules()
    }
  })
})
