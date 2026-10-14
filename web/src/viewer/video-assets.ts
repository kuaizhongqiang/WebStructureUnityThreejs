/**
 * 原理视频的取数层（DEC-99）：与三维资产（`scene-assets.ts`）同一套纪律 ——
 * **产品只认产物里的清单**，不硬编文件名、不发一个必然 404 的请求。
 *
 * 三条纪律：
 *   1. **一套 URL**：dev（vite 中间件直读 `content/assets/video`）与 build（拷进 `dist/assets/video`）
 *      给的是同一个前缀 `/assets/video/`（见 `vite.config.ts` 的 `assetsServe/assetsBuild`），本文件不分支；
 *   2. **判据是清单**：`/assets/video/_meta/index.json` 是**构建时按目录实际内容现算**的，
 *      所以"这段视频在不在产物里"有一个**不看网络结果**的答案 —— 缺了就显示明确状态，
 *      而不是让 `<video>` 去打一个 404（冒烟要求 console 零错误）；
 *   3. **文件名与数据键同名**：内容里的 `videoName`（`01jcq_yl`）就是文件名去掉扩展名，
 *      所以这里只有一条 `+ '.mp4'` 的规则，没有第二张对照表。
 */

/** 产物里视频与清单的 URL 前缀（dev / build 一致）。 */
const VIDEOS_DIR = 'assets/video/'

export interface VideoIndexEntry {
  /** 产物里的相对文件名（`01jcq_yl.mp4`） */
  name: string
  bytes: number
}

/** 产物 URL（`import.meta.env.BASE_URL` 让子路径部署也对）。 */
function videoUrlInBundle(relative: string): string {
  return encodeURI(`${import.meta.env.BASE_URL}${VIDEOS_DIR}${relative}`)
}

/**
 * 数据里的 `videoName` → 产物里的文件名。
 * 数据里写的是不带扩展名的键；已经是 `.mp4` 的就原样用（内容侧两种写法都认）。
 */
export function videoFileOf(videoName: string): string {
  const name = videoName.trim()
  return /\.(mp4|webm|ogg)$/i.test(name) ? name : `${name}.mp4`
}

let indexPromise: Promise<Map<string, VideoIndexEntry>> | null = null

/**
 * 读视频清单（幂等缓存）。读不到就抛 —— **这是"视频没随包发布"的唯一判据**。
 */
export function loadVideoIndex(): Promise<Map<string, VideoIndexEntry>> {
  if (indexPromise) return indexPromise
  indexPromise = (async () => {
    let listing: unknown = null
    try {
      const response = await fetch(videoUrlInBundle('_meta/index.json'))
      if (response.ok) listing = await response.json()
    } catch {
      listing = null
    }
    const files =
      typeof listing === 'object' && listing !== null && Array.isArray((listing as { files?: unknown }).files)
        ? ((listing as { files: unknown[] }).files ?? [])
        : null
    if (!files) {
      throw new Error(
        '讲解视频未包含在本次发布里（读不到 /assets/video/_meta/index.json）。' +
          '构建时会自动随产物发出（web/vite.config.ts 的 assets 插件）；' +
          '本机若没有 content/assets/video，见 README §4「大资产」。',
      )
    }
    const index = new Map<string, VideoIndexEntry>()
    for (const item of files) {
      if (typeof item !== 'object' || item === null) continue
      const name = (item as { name?: unknown }).name
      const bytes = (item as { bytes?: unknown }).bytes
      if (typeof name !== 'string' || name === '') continue
      index.set(name, { name, bytes: typeof bytes === 'number' ? bytes : 0 })
    }
    return index
  })()
  return indexPromise
}

/** 该 `videoName` 在本次产物里的 URL；**清单里没有就是 `null`**（页面据此显示"未包含"）。 */
export function videoUrlOf(videoName: string, index: Map<string, VideoIndexEntry>): string | null {
  const file = videoFileOf(videoName)
  return index.has(file) ? videoUrlInBundle(file) : null
}
