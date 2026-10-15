/**
 * Unity WebGL 加载器（DEC-12：同页挂载、按需挂载、退出必须销毁）。
 *
 * 与 `UnityBridge` 的分工：
 *   · 本文件负责**把 instance 弄出来**（注入官方 loader → 调 `createUnityInstance` → 超时/重试）；
 *   · `UnityBridge` 负责**协议**（版本握手、JSON 消息、事件订阅）。
 *   加载成功后把 instance 交给桥 `attach()`，退出时先 `detach()`（内部会 `Quit()`）再清理 DOM。
 *
 * 三条来自决策的硬约束：
 *   ① **资源路径**：Unity 产物挂在 `/unity/<key>/` 下（见 electron/server.js 的路由与 docs/design/05）；
 *   ② **超时与重试**：`enterTimeoutMs = 25_000`、`retryCount = 1`（DEC-71 的落地参数）；
 *   ③ **失败要说清**：失败必须给出可判定的原因与出口，不允许"卡在加载中"（DEC-53 §11.6）。
 */
import { UnityBridge } from './UnityBridge'
import { BRIDGE_PROTOCOL_VERSION } from '@/contracts'

export interface UnityBuildInfo {
  /** 构建名（一个构建可承载多个 TaskType，DEC-81；`key` 不再是任务名） */
  readonly key: string
  /**
   * 该构建声明能承载哪些 TaskType。
   * 加载器**不用它选件**（选件在 `stores/runtime.ts` 的 `unityBuildFor`），只用于日志与排查。
   */
  readonly taskTypes?: readonly number[]
  readonly entry?: string
  readonly loader?: string | null
  /** 产物指纹：拼成 `?v=` 防"重建后仍跑旧场景"（Unity 的 dataCaching 按 URL 缓存，docs/design/06 §3②） */
  readonly treeSha256?: string
  /** 该构建是否声明实现了协议桥（DEC-07） */
  readonly bridge?: boolean
}

export interface UnityMountOptions {
  readonly container: HTMLElement
  readonly build: UnityBuildInfo
  readonly bridge: UnityBridge
  /** 进度回调（0~1）；DEC-12 要求加载有进度 */
  readonly onProgress?: (progress: number) => void
}

export type UnityPhase = 'idle' | 'loading' | 'ready' | 'failed' | 'disposed'

export interface UnityHandle {
  readonly key: string
  readonly phase: UnityPhase
  unmount(): Promise<void>
}

/** 加载失败的可判定原因（用于给用户明确的出口，而不是一句"加载失败"）。 */
export type UnityFailure =
  | { kind: 'no-build'; message: string }
  | { kind: 'loader'; message: string }
  | { kind: 'timeout'; message: string }
  | { kind: 'init'; message: string }
  | { kind: 'bridge'; message: string }

export const UNITY_TIMEOUT_MS = 25_000
export const UNITY_RETRY = 1

/** Unity 官方 loader 注入后挂到 window 上的工厂函数。 */
type UnityInstanceLike = {
  SendMessage(gameObject: string, methodName: string, payload?: string): void
  Quit(): Promise<void>
}
type UnityFactory = (
  canvas: HTMLCanvasElement,
  config: Record<string, string>,
  onProgress?: (progress: number) => void,
) => Promise<UnityInstanceLike>

declare global {
  interface Window {
    createUnityInstance?: UnityFactory
  }
}

/** `/unity/<key>/<loader>` —— 与 electron/server.js 的 UNITY_PREFIX 一致。 */
export function unityBaseUrl(key: string): string {
  return `/unity/${encodeURIComponent(key)}/`
}

/**
 * 从 loader 文件名推出三个资源 URL。
 * 例：`Build/training.loader.js` → 前缀 `Build/training` →
 *     dataUrl `Build/training.data`、frameworkUrl `Build/training.framework.js`、codeUrl `Build/training.wasm`。
 * **预压缩版本（.br/.gz）不在这里拼** —— 交给服务器按 `Accept-Encoding` 命中并附 `Content-Encoding`，
 * 这正是 electron/server.js 已经实现的行为，也是 Unity 推荐的服务端配置方式。
 */
export function resolveUrls(base: string, loaderPath: string, version?: string) {
  const normalized = loaderPath.replace(/\\/g, '/')
  const prefix = normalized.replace(/\.loader\.js$/, '')
  // ★ 版本指纹必须带上：Unity 的 dataCaching 会按 **URL** 把 `.data` 存进 IndexedDB，
  //   同名重建时浏览器会直接命中旧缓存 —— 表现为"重新构建了，但画面还是上一版"。
  //   服务器会忽略查询串（只按 pathname 找文件），所以 `?v=` 是安全的。
  const v = version ? `?v=${version.slice(0, 12)}` : ''
  return {
    dataUrl: `${base}${prefix}.data${v}`,
    frameworkUrl: `${base}${prefix}.framework.js${v}`,
    codeUrl: `${base}${prefix}.wasm${v}`,
    streamingAssetsUrl: `${base}StreamingAssets`,
  }
}

export function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-wsu3-unity="${src}"]`)
    if (existing) {
      // 同一份 loader 可能被复用（重试）：等它完成即可
      if (existing.dataset.loaded === 'true') resolve()
      else {
        existing.addEventListener('load', () => resolve(), { once: true })
        existing.addEventListener('error', () => reject(new Error(`loader 加载失败：${src}`)), { once: true })
      }
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.dataset.wsu3Unity = src
    script.addEventListener(
      'load',
      () => {
        script.dataset.loaded = 'true'
        resolve()
      },
      { once: true },
    )
    script.addEventListener('error', () => reject(new Error(`loader 加载失败：${src}`)), { once: true })
    document.head.appendChild(script)
  })
}

/** 超时包装：Unity 卡在 wasm 编译时不会自己 reject，必须由我们判超时。 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`加载超时（${timeoutMs / 1000}s）`)), timeoutMs)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

/**
 * 挂载一个 Unity 构建。返回句柄；**失败会抛 `UnityFailure`**（不是返回 null），
 * 调用方（任务页）据此显示原因与出口。
 */
export async function mountUnity(options: UnityMountOptions): Promise<UnityHandle> {
  const { container, build, bridge, onProgress } = options
  if (!build.loader) {
    throw {
      kind: 'no-build',
      message: '该任务没有可用的 Unity 构建（清单里缺少 loader）',
    } satisfies UnityFailure
  }

  const base = unityBaseUrl(build.key)
  const urls = resolveUrls(base, build.loader, build.treeSha256)
  let attempt = 0
  let lastError: UnityFailure = { kind: 'init', message: '未知原因' }

  while (attempt <= UNITY_RETRY) {
    attempt += 1
    try {
      // ① 注入官方 loader（重复挂载时浏览器会复用同一份）
      await injectScript(`${base}${build.loader}`)
      const factory = window.createUnityInstance
      if (typeof factory !== 'function') {
        throw {
          kind: 'loader',
          message: 'loader 已加载但没有暴露 createUnityInstance',
        } satisfies UnityFailure
      }

      // ② 容器里准备画布（Unity 自己不会创建 canvas，必须由宿主给）。
      //    ⚠ id 必须非空：真框架的 jsCanvasSelector() 用 `'#' + canvas.id` 解析画布
      //    （run dependency 回调里就会调），空 id → 选择器 '#' → querySelector 抛
      //    SyntaxError → main() 中断 → "Unity 加载失败"。官方模板默认 id 是 unity-canvas。
      container.innerHTML = ''
      const canvas = document.createElement('canvas')
      canvas.id = 'unity-canvas'
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      canvas.style.display = 'block'
      container.appendChild(canvas)

      // ③ 实例化（带超时）
      const instance = await withTimeout(
        factory(
          canvas,
          {
            ...urls,
            companyName: '虚拟仿真教学平台',
            productName: '虚拟仿真教学平台',
            productVersion: '0.0.0',
            // 协议版本随 config 传入：桥与 Unity 侧握手的依据（DEC-07），不匹配要明确报错
            protocolVersion: String(BRIDGE_PROTOCOL_VERSION),
          },
          (progress) => onProgress?.(progress),
        ),
        UNITY_TIMEOUT_MS,
      )

      // ④ 交给协议桥（版本握手由 Unity 侧调 __WSU3_BRIDGE__.onReady 触发）
      bridge.attach(instance)
      onProgress?.(1)

      let phase: UnityPhase = 'ready'
      return {
        key: build.key,
        get phase() {
          return phase
        },
        async unmount() {
          phase = 'disposed'
          // DEC-12：退出必须显式销毁，否则反复进出会泄漏上下文
          await bridge.detach()
          container.innerHTML = ''
        },
      }
    } catch (cause) {
      lastError =
        cause && typeof cause === 'object' && 'kind' in cause
          ? (cause as UnityFailure)
          : { kind: 'init', message: cause instanceof Error ? cause.message : String(cause) }
      if (attempt > UNITY_RETRY) break
      onProgress?.(0)
    }
  }

  throw lastError
}
