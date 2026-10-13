/**
 * Unity WebGL ↔ Web 外壳的通信桥（DEC-07 / DEC-12）。
 *
 * 协议纪律：
 *   - 同页挂载（不是 iframe），`.jslib` 暴露 JS 对象，Unity 通过它回调；
 *   - 消息**一律 JSON**，必带 `type` / `version` / `seq`；
 *   - 启动握手比对版本，**不匹配就明确报错**，不静默降级；
 *   - **只发事件、不做状态查询**（DEC-08）；
 *   - 退出必须显式销毁 Unity 实例（`Quit()`），否则反复切换会泄漏上下文。
 *
 * 注意：当前只实现协议骨架 —— Unity 侧 WebGL 产物尚未构建（DEC-13），
 * 桥的 C# 端与 `.jslib` 端在 Unity 件就位后再接。
 */

import { BRIDGE_PROTOCOL_VERSION } from '@/contracts'
import type { BridgeMessageType } from '@/contracts'

/**
 * 消息名必须在契约里（`web/src/contracts/bridge.ts` 的清单）——
 * 用 `satisfies` 让 TS 在**编译期**拦住写错的名字，不靠人肉比对字符串。
 */
const MSG_UNITY_READY = 'unity:ready' satisfies BridgeMessageType
const MSG_UNITY_PROGRESS = 'unity:progress' satisfies BridgeMessageType

/** Unity 官方 `createUnityInstance()` 返回对象的最小形状。 */
export interface UnityInstanceLike {
  SendMessage(gameObject: string, methodName: string, payload?: string): void
  Quit(): Promise<void>
}

/** Unity 侧固定挂在这个 GameObject 上接收消息。 */
export const BRIDGE_GAME_OBJECT = 'WebBridge'
export const BRIDGE_RECEIVE_METHOD = 'OnWebMessage'

/** Unity → Web 的回调对象挂在 window 上，名字固定。 */
export const BRIDGE_GLOBAL_KEY = '__WSU3_BRIDGE__'

export interface BridgeMessage {
  readonly type: string
  readonly version: number
  readonly seq: number
  readonly payload?: unknown
}

export type BridgeHandler = (payload: unknown, message: BridgeMessage) => void

export class BridgeProtocolError extends Error {}

export class UnityBridge {
  private instance: UnityInstanceLike | null = null
  private seq = 0
  private readonly handlers = new Map<string, Set<BridgeHandler>>()
  private ready: boolean | null = null

  /** 挂载 Unity 实例，并把全局回调对象准备好。 */
  attach(instance: UnityInstanceLike): void {
    this.instance = instance
    const target = globalThis as unknown as Record<string, unknown>
    target[BRIDGE_GLOBAL_KEY] = {
      /** Unity 调用：握手。 */
      onReady: (version: string): void => {
        const incoming = Number(version)
        if (incoming !== BRIDGE_PROTOCOL_VERSION) {
          throw new BridgeProtocolError(`协议版本不匹配：Unity=${version}，Web=${BRIDGE_PROTOCOL_VERSION}`)
        }
        this.ready = true
        this.dispatch({ type: MSG_UNITY_READY, version: incoming, seq: 0, payload: { version: incoming } })
      },
      /** Unity 调用：任意业务事件。payload 是 JSON 字符串。 */
      post: (json: string): void => {
        this.dispatch(JSON.parse(json) as BridgeMessage)
      },
      /** Unity 调用：加载进度（0~1）。 */
      onProgress: (progress: string): void => {
        this.dispatch({
          type: MSG_UNITY_PROGRESS,
          version: BRIDGE_PROTOCOL_VERSION,
          seq: 0,
          payload: { progress: Number(progress) },
        })
      },
    }
  }

  isReady(): boolean | null {
    return this.ready
  }

  /** 订阅某个 type 的事件；返回退订函数。 */
  on(type: string, handler: BridgeHandler): () => void {
    let set = this.handlers.get(type)
    if (!set) {
      set = new Set()
      this.handlers.set(type, set)
    }
    set.add(handler)
    return () => {
      set?.delete(handler)
    }
  }

  /** Web → Unity 发消息。 */
  post(type: string, payload?: unknown): void {
    if (!this.instance) throw new BridgeProtocolError('Unity 实例尚未挂载')
    this.seq += 1
    const message: BridgeMessage = { type, version: BRIDGE_PROTOCOL_VERSION, seq: this.seq, payload }
    this.instance.SendMessage(BRIDGE_GAME_OBJECT, BRIDGE_RECEIVE_METHOD, JSON.stringify(message))
  }

  /** 显式销毁 Unity 实例（退出该 TaskType 时必须调用）。 */
  async detach(): Promise<void> {
    if (this.instance) await this.instance.Quit()
    this.instance = null
    this.ready = null
    this.handlers.clear()
  }

  private dispatch(message: BridgeMessage): void {
    const set = this.handlers.get(message.type)
    if (!set) return
    for (const handler of [...set]) handler(message.payload, message)
  }
}
