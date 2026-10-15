/**
 * Unity 实例的**常驻宿主**（DEC-145，吸收原 TODO D-30；D-25 的落地件）。
 *
 * 负责人口径：**无论多少个 task，只有一个 Unity 实例** ——
 * 最早时机（菜单页，`start → login → menu` 的最后一段）创建并常驻，
 * 之后由 JS 把同一块画布**搬挂到当前页面容器**、离开时**搬回停泊区隐藏**：
 * 进 task 直接可交互，不再出现加载进度条与 Unity 启动画面。
 *
 * 与既有件的分工：
 *   · `UnityLoader.mountUnity` —— 旧的"每任务挂一次、退出即销毁"路径（DebugView 仍用）；
 *   · 本文件 —— 常驻路径：`ensureUnityInstance` 幂等创建（并发调用复用同一个 Promise），
 *     `attachTo` / `detach` 只做 DOM 搬挂，**绝不 Quit**（真销毁只走 `quitUnityHost`）。
 *
 * 隐藏态说明：画布在停泊区（`display:none` 之外的视觉外区域）时 Unity 仍在跑
 * （rAF 只随标签页暂停，不随元素隐藏暂停），所以回到任务页不需要"冷启动"；
 * 挂回容器后发一条 `runtime:resume`（Unity 侧 TaskFlowManager 有订阅者）做状态对齐。
 */
import {
  injectScript,
  resolveUrls,
  withTimeout,
  UNITY_TIMEOUT_MS,
  unityBaseUrl,
  type UnityBuildInfo,
} from './UnityLoader'
import { unityBridge } from './unity-bridge-instance'

/** Unity 官方 `createUnityInstance()` 返回对象的最小形状（与 UnityBridge 的定义同形）。 */
type UnityInstanceLike = {
  SendMessage(gameObject: string, methodName: string, payload?: string): void
  Quit(): Promise<void>
}

export type UnityHostPhase = 'idle' | 'loading' | 'ready' | 'failed'

let hostEl: HTMLDivElement | null = null
let parkingEl: HTMLDivElement | null = null
let instance: UnityInstanceLike | null = null
let loadedKey: string | null = null
let loadPromise: Promise<UnityInstanceLike> | null = null
let lastFailure: unknown = null

/** 停泊区：视觉外的一块定位容器，画布"藏"在这里（不 display:none，避免部分浏览器停掉画布尺寸）。 */
function ensureParking(): HTMLDivElement {
  if (parkingEl === null) {
    parkingEl = document.createElement('div')
    parkingEl.id = 'wsu3-unity-parking'
    parkingEl.style.cssText =
      'position:absolute;left:-99999px;top:0;width:1280px;height:720px;overflow:hidden;pointer-events:none;'
    document.body.appendChild(parkingEl)
  }
  return parkingEl
}

/**
 * 幂等创建常驻实例：已就绪直接返回；在加载中复用同一个 Promise；
 * 失败后清状态，允许下次调用重试。同一工程实际上只有一个构建（`main`），
 * 换 key 的调用会等到当前加载完成后按新 key 重建（当前清单不会出现）。
 */
export async function ensureUnityInstance(
  build: UnityBuildInfo,
  onProgress?: (progress: number) => void,
): Promise<UnityInstanceLike> {
  if (instance !== null && loadedKey === build.key) return instance
  if (loadPromise !== null) return loadPromise

  const parking = ensureParking()
  hostEl = document.createElement('div')
  hostEl.id = 'wsu3-unity-host'
  hostEl.style.cssText = 'position:absolute;inset:0;'
  parking.appendChild(hostEl)

  lastFailure = null
  loadPromise = (async () => {
    if (!build.loader) {
      throw { kind: 'no-build', message: '该任务没有可用的 Unity 构建（清单里缺少 loader）' }
    }
    const base = unityBaseUrl(build.key)
    const urls = resolveUrls(base, build.loader, build.treeSha256)

    await injectScript(`${base}${build.loader}`)
    const factory = window.createUnityInstance
    if (typeof factory !== 'function') {
      throw { kind: 'loader', message: 'loader 已加载但没有暴露 createUnityInstance' }
    }

    // 画布 id 必须非空（真框架的 jsCanvasSelector 按 `#id` 解析，空 id 会让 main() 中断）
    const canvas = document.createElement('canvas')
    canvas.id = 'unity-canvas'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    hostEl!.appendChild(canvas)

    const created = await withTimeout(
      factory(
        canvas,
        {
          ...urls,
          companyName: '虚拟仿真教学平台',
          productName: '虚拟仿真教学平台',
          productVersion: '0.0.0',
          protocolVersion: String(1),
        },
        (progress) => onProgress?.(progress),
      ),
      UNITY_TIMEOUT_MS,
    )
    instance = created
    loadedKey = build.key
    // 创建成功**立刻**把常驻桥接上：Unity 紧接着就会调 `__WSU3_BRIDGE__.onReady` 完成握手 ——
    // 若此刻全局对象还不在，握手会永远丢失（会话后来者拿到的只是 isReady=false）。
    unityBridge.attach(created)
    onProgress?.(1)
    return created
  })()

  try {
    return await loadPromise
  } catch (cause) {
    lastFailure = cause
    loadPromise = null
    hostEl?.remove()
    hostEl = null
    throw cause
  }
}

/** 常驻实例是否已就绪。 */
export function isUnityInstanceReady(): boolean {
  return instance !== null
}

/** 最近的失败（预载失败时任务页可据此提前给出原因；没有则为 null）。 */
export function lastUnityHostFailure(): unknown {
  return lastFailure
}

/** 把常驻画布搬挂到目标容器（通常是任务页视口里的挂载点）。 */
export function attachHost(container: HTMLElement): void {
  if (hostEl === null) return
  container.appendChild(hostEl)
}

/** 摘靠：搬回停泊区隐藏。实例与运行状态都保留。 */
export function detachHost(): void {
  if (hostEl === null) return
  ensureParking().appendChild(hostEl)
}

/** 彻底销毁常驻实例（调试/换构建用；正常任务切换绝不调用）。 */
export async function quitUnityHost(quit: (instance: UnityInstanceLike) => Promise<void>): Promise<void> {
  const inst = instance
  instance = null
  loadedKey = null
  loadPromise = null
  hostEl?.remove()
  hostEl = null
  if (inst) await quit(inst)
}
