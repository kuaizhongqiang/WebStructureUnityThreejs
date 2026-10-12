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
  taskType: number | null
  entry?: string
  loader?: string | null
  fileCount?: number
  totalBytes?: number
  stagedAt?: string
  treeSha256?: string
}

export interface ReleaseManifest {
  version: number
  generatedAt: string
  web?: { files: number; bytes: number }
  content?: { projects: string[] }
  unity?: { included: boolean; builds: UnityBuildEntry[]; reason?: string }
  serving?: Record<string, unknown>
  shell?: Record<string, unknown>
}

/** 本机静态服务器与壳都从根路径给清单；加时间戳避免缓存。 */
const MANIFEST_URL = `${import.meta.env.BASE_URL}release-manifest.json`

export const useRuntimeStore = defineStore('runtime', () => {
  const manifest = ref<ReleaseManifest | null>(null)
  const loading = ref(false)
  /** 'unknown' = 没读到清单（本地 dev 直接跑）；'included' / 'absent' = 清单明确说了 */
  const unityState = ref<'unknown' | 'included' | 'absent'>('unknown')
  const error = ref<string | null>(null)

  const unityBuilds = computed<UnityBuildEntry[]>(() => manifest.value?.unity?.builds ?? [])

  /** 该 TaskType 是否有可挂载的 Unity 构建。 */
  function unityBuildFor(taskType: TaskType): UnityBuildEntry | null {
    return unityBuilds.value.find((build) => build.taskType === taskType) ?? null
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
