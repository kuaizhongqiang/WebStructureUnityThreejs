/**
 * 运行时清单（release manifest）—— 回答一个问题：**这个包里到底有什么**。
 *
 * 依据：`docs/design/05-unity-packaging-pipeline.md` §5。文件由 `tools/pipeline/pack.mjs` 在打包时写进
 * Web 产物根目录（`/release-manifest.json`），壳内置服务器与本机静态服务器都能直接给到。
 *
 * 为什么必须有它：Unity 产物是**人手动搬进来的**，随时可能缺席。
 * 以前页面"假设有 Unity"，于是 Unity 缺席时表现为"进不去 / 卡住"这种无从判断的中间态。
 * 现在改成：**清单里有才挂载，没有就明确说"产物未就位"并给出接入命令**。
 *
 * 读不到清单（例如直接用 vite dev 跑、没走流水线）时不报错：`unknown` 状态，
 * 由页面按"本地开发未打包"处理 —— 不阻塞开发。
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { TaskType } from '@/contracts'

export interface UnityBuildEntry {
  key: string
  /**
   * 这个构建**声明能承载哪些 TaskType**（DEC-81：一个 Unity 构建承载全部 Unity 类任务）。
   * 选件口径见 `declaresTaskType` —— 不再要求 `key` 等于任务名。
   */
  taskTypes?: number[]
  /**
   * 旧清单的单值字段（DEC-81 之前的形状）。
   * @deprecated 新清单只写 `taskTypes`；这里只为兼容已经打出去的包。
   */
  taskType?: number | null
  entry?: string
  loader?: string | null
  /** 是否声明实现了协议桥（DEC-07）；false/缺失时页面会说明"该构建未声明桥支持" */
  bridge?: boolean
  fileCount?: number
  totalBytes?: number
  stagedAt?: string
  /** 产物目录指纹：用于给资源 URL 加 `?v=`，避免重建后命中旧的数据缓存（docs/design/06 §3②） */
  treeSha256?: string
}

export interface ReleaseManifest {
  version: number
  generatedAt: string
  web?: { files: number; bytes: number }
  content?: { projects: string[]; data?: string[] }
  unity?: { included: boolean; builds: UnityBuildEntry[]; reason?: string }
  serving?: Record<string, unknown>
  shell?: Record<string, unknown>
}

/** 本机静态服务器与壳都从根路径给清单；加时间戳避免缓存。 */
const MANIFEST_URL = `${import.meta.env.BASE_URL}release-manifest.json`

/**
 * 一个构建是否声明承载这个 TaskType（DEC-81 的选件判据）。
 *
 * 口径：新清单写 `taskTypes[]`，命中即算；为兼容已经打出去的旧包，旧清单的单值 `taskType` 仍然认。
 * **两代都为空则不认** —— 没声明承载范围的构建永远不会被选中。这是故意的：
 * 宁可明确显示"产物未就位"，也不要挂上一个不知道能不能干活的东西。
 *
 * 同一判据在壳（`electron/main.js` 读清单时）有一份等价实现 —— 那边是独立进程，不共享本模块。
 */
export function declaresTaskType(build: UnityBuildEntry, taskType: TaskType): boolean {
  if (Array.isArray(build.taskTypes) && build.taskTypes.length > 0) {
    return build.taskTypes.includes(taskType)
  }
  return build.taskType === taskType
}

/**
 * 选件：**清单里第一个声明包含该 taskType 的构建**（顺序即清单顺序 = `unity-stage` 按 `key` 排序的结果）。
 *
 * 为什么"第一个"就够：DEC-81 之后正常情况下只有一个构建（`main`）承载全部 Unity 类任务；
 * 保留"多个候选取第一个"是为了将来真需要第二个构建（例如漫游单独一份）时不改调用方。
 */
export function pickUnityBuild(
  builds: readonly UnityBuildEntry[],
  taskType: TaskType,
): UnityBuildEntry | null {
  return builds.find((build) => declaresTaskType(build, taskType)) ?? null
}

export const useRuntimeStore = defineStore('runtime', () => {
  const manifest = ref<ReleaseManifest | null>(null)
  const loading = ref(false)
  /** 'unknown' = 没读到清单（本地 dev 直接跑）；'included' / 'absent' = 清单明确说了 */
  const unityState = ref<'unknown' | 'included' | 'absent'>('unknown')
  const error = ref<string | null>(null)

  const unityBuilds = computed<UnityBuildEntry[]>(() => manifest.value?.unity?.builds ?? [])

  /**
   * 该 TaskType 该挂哪个构建：**清单里第一个声明包含它的构建**（DEC-81）。
   * 找不到就是 `null` —— 页面据此显示"产物未就位"，而不是假装在加载（DEC-53 §11.6）。
   */
  function unityBuildFor(taskType: TaskType): UnityBuildEntry | null {
    return pickUnityBuild(unityBuilds.value, taskType)
  }

  async function load(): Promise<void> {
    if (loading.value) return
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${MANIFEST_URL}?t=${Date.now()}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = (await response.json()) as ReleaseManifest
      manifest.value = data
      unityState.value = data.unity?.included ? 'included' : 'absent'
      if (!data.unity?.included) {
        console.warn(
          `[runtime] 本次发布不含 Unity 构建（${data.unity?.reason ?? '清单未说明'}）；` +
            'Unity 类任务会显示"产物未就位"。接入方式见 docs/design/05。',
        )
      }
    } catch (cause) {
      // 本地 dev（vite serve）不走流水线，拿不到清单是**正常**的
      unityState.value = 'unknown'
      error.value = cause instanceof Error ? cause.message : String(cause)
    } finally {
      loading.value = false
    }
  }

  return { manifest, loading, error, unityState, unityBuilds, unityBuildFor, load }
})
