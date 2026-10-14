/**
 * 三维资产的取数层（DEC-98 / 原 P1-5）：**产品只认产物里的表，不硬编材质名与文件路径**。
 *
 * 三条纪律：
 *   1. **一套 URL**：dev（vite 中间件直读 `content/assets/three`）与 build（拷进 `dist/assets/three`）
 *      给的是同一个前缀 `/assets/three/`（见 `vite.config.ts` 的 `threeAssets()`），本文件不分支；
 *   2. **缺资产是明确状态**：大资产按 DEC-57 不进 git，新克隆的机器上就是没有 ——
 *      这里**抛带人话的错误**，由页面显示"资产未包含在本次发布里"，不假装加载（同 Unity 产物的纪律）；
 *   3. **元数据也只认产物**：材质规格 / 贴图查找表 / 转换报告都从 `/assets/three/_meta/` 读，
 *      它们是**流水线生成的产物**，不是产品里再抄一份的常量。
 *
 * 与 `docs/model-preview/` 的关系：**不 import 任何东西**（那是审核用工具，DEC-96）。
 * 两边读的是同一批表，所以"审核页看到什么"与"产品里是什么"不会各说各话。
 */

/** 产物里资产与元数据的 URL 前缀（dev/build 一致）。 */
const ASSETS_DIR = 'assets/three/'

/** 资产表里记录的仓库内路径（`content/assets/three/…`），产品侧要换成产物 URL。 */
const SOURCE_PREFIX = 'content/assets/three/'

export interface MaterialSpecEntry {
  name?: string
  /** 表面模式：`OPAQUE` / `MASK`（贴图 alpha 裁切）/ `BLEND` */
  surfaceMode?: string
  alphaCutoff?: number
  doubleSided?: boolean
  normalStrength?: number
  baseColor?: number[]
  remap?: {
    occlusion?: number[]
    smoothness?: number[]
    metallic?: number[]
  }
  scalars?: { metallic?: number; smoothness?: number }
  textures?: { baseColor?: string | null; normal?: string | null; mask?: string | null }
}

/** 转换报告里的一个模型：`device` 是器件段，`glb` 是产物路径。 */
export interface ConvertedModel {
  device: string
  stem: string
  glb: string
}

export interface SceneAssetTables {
  /** 材质名 → 规格（贴图文件名 / 通道重映射 / 表面模式） */
  materials: Record<string, MaterialSpecEntry>
  /** `<device>/<贴图文件名>` 或 `_shared/<文件名>` → 仓库内路径 */
  textures: Record<string, string>
  models: ConvertedModel[]
}

/** 产物 URL（`import.meta.env.BASE_URL` 让子路径部署也对）。 */
export function assetUrl(relative: string): string {
  return encodeURI(`${import.meta.env.BASE_URL}${ASSETS_DIR}${relative}`)
}

/** 仓库内路径（表里的写法）→ 产物 URL；不是本产物管的东西则返回 `null`。 */
function fromSourcePath(sourcePath: string | null | undefined): string | null {
  if (!sourcePath) return null
  const normalized = sourcePath.split('\\').join('/')
  if (!normalized.startsWith(SOURCE_PREFIX)) return null
  return assetUrl(normalized.slice(SOURCE_PREFIX.length))
}

async function fetchJson(relative: string): Promise<unknown | null> {
  try {
    const response = await fetch(assetUrl(`_meta/${relative}`))
    if (!response.ok) return null
    return (await response.json()) as unknown
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

let tablesPromise: Promise<SceneAssetTables> | null = null

/**
 * 读三张元数据表（幂等缓存）。读不到就抛 —— **这是"资产没随包发布"的唯一判据**。
 */
export function loadSceneTables(): Promise<SceneAssetTables> {
  if (tablesPromise) return tablesPromise
  tablesPromise = (async () => {
    const [spec, lookup, report] = await Promise.all([
      fetchJson('material-spec.json'),
      fetchJson('material-textures.json'),
      fetchJson('convert-report.json'),
    ])
    if (!isRecord(spec) || !isRecord(lookup) || !isRecord(report)) {
      throw new Error(
        '三维资产未包含在本次发布里（读不到 /assets/three/_meta/*.json）。' +
          '构建时会自动随产物发出（web/vite.config.ts 的 threeAssets 插件）；' +
          '若本机没有 content/assets/three，见 README §4「三维资产」。',
      )
    }
    const materials = isRecord(spec.materials) ? (spec.materials as Record<string, MaterialSpecEntry>) : {}
    const textures = isRecord(lookup.textures) ? (lookup.textures as Record<string, string>) : {}
    const models: ConvertedModel[] = Array.isArray(report.models)
      ? report.models.flatMap((item) => {
          if (!isRecord(item)) return []
          const device = typeof item.device === 'string' ? item.device : ''
          const glb = typeof item.glb === 'string' ? item.glb : ''
          if (device === '' || glb === '') return []
          return [{ device, stem: typeof item.stem === 'string' ? item.stem : '', glb }]
        })
      : []
    return { materials, textures, models }
  })()
  return tablesPromise
}

/**
 * 项目 id → 器件段（`clip_contactor` → `contactor`；驼峰保持原样）。
 *
 * 采纳数据里项目 id 的规则见 `docs/research/09`：`clip_` 之后就是器件段。
 * **不认识的 id 一律返回 `null`**（例如兜底演示项目、将来的非器件项目）——
 * 页面据此显示"本项目没有三维模型"，而不是拿别的器件的模型顶上。
 */
export function deviceOfProject(projectId: string | undefined): string | null {
  if (!projectId) return null
  const matched = /^clip_([A-Za-z][A-Za-z0-9]*)$/.exec(projectId)
  return matched?.[1] ?? null
}

/** 该器件在本产物里的 GLB（没有就是 `null`）——查的是转换报告，不是硬编表。 */
export function modelOfDevice(
  tables: SceneAssetTables,
  device: string,
): { url: string; stem: string; glb: string } | null {
  const found = tables.models.find((item) => item.device === device)
  if (!found) return null
  const url = fromSourcePath(found.glb)
  return url ? { url, stem: found.stem, glb: found.glb } : null
}

/**
 * 贴图 URL：**只查查找表**（先器件、后 `_shared`）。
 *
 * 为什么不做"逐个目录试探"：浏览器里每个 404 都会进 console，而冒烟要求零 console 错误；
 * 试探顺序错了还会静默挂错图（同一张 `White.png` 每个器件下都有一份）。
 */
export function textureUrl(tables: SceneAssetTables, device: string, baseFileName: string): string | null {
  const relative = tables.textures[`${device}/${baseFileName}`] ?? tables.textures[`_shared/${baseFileName}`]
  return fromSourcePath(relative)
}
