/**
 * Unity 会话：把"页面的意图"翻译成桥消息，把"Unity 的事件"翻译成页面能吃的形状。
 *
 * 与三个邻居的分工（不要互相抢）：
 *   · `UnityLoader`  负责把 instance 弄出来（注入 loader / 超时 / 重试）；
 *   · `UnityBridge`  负责最底层的信封（版本握手、JSON、`on()` 订阅、`post()`）；
 *   · **本文件**负责**时序与状态**：什么时候发 `app:init`、什么时候发 `scene:enter`、
 *     谁先谁后、重启一次要不要补发。
 *
 * 依据：`docs/design/09-startup-orchestration.md`（启动链与两条就绪）、
 * `docs/design/02-bridge-protocol.md` §3（载荷口径）。
 *
 * ## 为什么要有它（而不是在视图里直接 `bridge.on(...)`）
 *
 * 三条纪律用"视图里散着写"必然会漏：
 *   1. **`app:init` 必须在握手之后发一次**（Unity 靠它拿语言 / 画质 / 协议版本）；
 *   2. **`scene:enter` 可能在握手之前就被要求**（页面先导航、Unity 懒挂载）——
 *      必须有地方记住这个意图并在握手后补发，否则表现是"点了任务，画面没反应"；
 *   3. **`input:enable` 的期望状态要能补发**（模态面板开着时重挂 Unity，不能被默默解封）。
 *
 * ## 纯逻辑、可单测
 *
 * 它只依赖 `UnityBridge` 的 `on()` / `post()` 两个方法，不碰 DOM、不碰 Vue ——
 * 所以 `unity-session.spec.ts` 用一个假桥就能把上面三条钉住。
 */
import { BRIDGE_PROTOCOL_VERSION, TASK_TYPES, type BridgeMessageFromUnity, TaskType } from '@/contracts'
import {
  UiPanelKind,
  UiResultKind,
  type PartEntry,
  type PartHover,
  type StepPanelRequest,
  type StepProgress,
  type TaskCompletion,
  type UiRequestBody,
  type UnityErrorInfo,
} from '@/contracts'
import type { UnityBridge } from './UnityBridge'

// 消息名一律走契约（`satisfies` 让 TS 在编译期拦住写错的名字）
const MSG_UNITY_READY = 'unity:ready' satisfies BridgeMessageFromUnity
const MSG_UNITY_PROGRESS = 'unity:progress' satisfies BridgeMessageFromUnity
const MSG_ASSETS_READY = 'assets:ready' satisfies BridgeMessageFromUnity
const MSG_SCENE_READY = 'scene:ready' satisfies BridgeMessageFromUnity
const MSG_SCENE_EXITED = 'scene:exited' satisfies BridgeMessageFromUnity
const MSG_STEP_CHANGED = 'step:changed' satisfies BridgeMessageFromUnity
const MSG_TASK_COMPLETED = 'task:completed' satisfies BridgeMessageFromUnity
const MSG_OBJECT_PICKED = 'object:picked' satisfies BridgeMessageFromUnity
const MSG_UI_REQUEST = 'ui:request' satisfies BridgeMessageFromUnity
const MSG_UNITY_ERROR = 'unity:error' satisfies BridgeMessageFromUnity
const MSG_DEBUG_PONG = 'debug:pong' satisfies BridgeMessageFromUnity
const MSG_SCENE_PARTS = 'scene:parts' satisfies BridgeMessageFromUnity
const MSG_OBJECT_HOVER = 'object:hover' satisfies BridgeMessageFromUnity

/** Unity 侧只认这三个面板种类（见 `WebBridge.UiRequest`）；不认识的按 `ui` 处理（能弹就弹，弹不了回 unavailable）。 */
const PANEL_KINDS: readonly string[] = [UiPanelKind.Tips, UiPanelKind.Ui, UiPanelKind.Question]

/** 页面要的**状态快照**（视图只读这个，不自己去拼载荷）。 */
export interface UnitySessionState {
  /** 握手是否完成（Unity 侧调过 `__WSU3_BRIDGE__.onReady`） */
  handshake: boolean
  /** 引擎加载进度（`createUnityInstance` 的 onProgress，0~1） */
  engineProgress: number
  /** 当前任务是否"资产装完"（DEC-84：可以开始渲染该任务的界面了） */
  assetsReady: boolean
  /** 当前任务是否"可交互"（DEC-84：结束 loading） */
  sceneReady: boolean
  /** 步骤进度（扁平序号）；没进任务时为 null */
  step: StepProgress | null
  /** 完成事件；切任务时清空 */
  completion: TaskCompletion | null
  /** 最近一次 `object:picked` 的部件 key */
  picked: string | null
  /** 本任务的部件清单（`scene:parts`，**扁平**；成树见 `domain/part-tree.ts`） */
  parts: readonly PartEntry[]
  /** 指针当前停在哪（`object:hover`）；null = 没停在任何部件上 */
  hover: PartHover | null
  /** 收到的错误（按时间升序，页面显示最近几条） */
  errors: readonly UnityErrorInfo[]
  /** 最近一次 `debug:pong` 的往返毫秒数（null = 没测过） */
  latencyMs: number | null
}

export interface UnitySessionHandlers {
  onHandshake?(version: number): void
  onEngineProgress?(progress: number): void
  onAssetsReady?(taskType: TaskType): void
  onSceneReady?(taskType: TaskType): void
  onSceneExited?(taskType: TaskType): void
  onStep?(step: StepProgress): void
  onCompleted?(completion: TaskCompletion): void
  onPicked?(objectKey: string): void
  /** `scene:parts` —— 本任务的部件清单（装配完成后一次） */
  onParts?(parts: readonly PartEntry[]): void
  /** `object:hover` —— 指针移入某个部件（`null` = 移出）；页面据此画名字浮标 */
  onHover?(hover: PartHover | null): void
  /** `ui:request` —— 视图据此弹面板，然后用 `answer()` 回执（纪律见 `domain/step-panels.ts`） */
  onPanelRequest?(request: StepPanelRequest): void
  onError?(error: UnityErrorInfo): void
  onPong?(latencyMs: number): void
}

export interface UnitySessionOptions {
  /** 启动配置（`app:init`）；页面语言与画质，默认 `zh-CN` / `high` */
  locale?: string
  qualityProfile?: string
  /**
   * 内容版本（`scene:enter` 的 `contentVersion`）。
   *
   * ⚠️ Unity 侧目前**只把它记进日志**（`TaskFlowManager` 没有版本比对），
   * 所以这里给一个固定值就够了，不假装它是缓存键。
   */
  contentVersion?: string
  handlers?: UnitySessionHandlers
}

/** 记住"页面要求进哪个任务"，以便握手后补发。 */
interface EnterIntent {
  taskType: TaskType
  projectId: string
}

export class UnitySession {
  private readonly bridge: UnityBridge
  private readonly handlers: UnitySessionHandlers
  private readonly locale: string
  private readonly qualityProfile: string
  private readonly contentVersion: string

  private readonly unsubscribes: Array<() => void> = []
  private panelSeq = 0
  private disposed = false

  private state: UnitySessionState = {
    handshake: false,
    engineProgress: 0,
    assetsReady: false,
    sceneReady: false,
    step: null,
    completion: null,
    picked: null,
    parts: [],
    hover: null,
    errors: [],
    latencyMs: null,
  }

  /** 页面**要求**进入的任务（不是 Unity 已确认的）—— 握手后按它补发 `scene:enter`。 */
  private intent: EnterIntent | null = null
  /**
   * 当前 `intent` 是否**已经发过** `scene:enter`。
   *
   * 为什么必须单独记一位：视图的同步函数会被各种响应式信号反复触发，
   * 光看"意图没变"就重发会让 Unity 侧不断"先退旧的、再进新的" —— 表现是画面反复重装。
   */
  private enterDispatched = false
  /** 页面期望的输入开关（模态面板开着时为 false）—— 握手后按它补发 `input:enable`。 */
  private inputEnabled = true
  private pingSentAt: number | null = null

  constructor(bridge: UnityBridge, options: UnitySessionOptions = {}) {
    this.bridge = bridge
    this.handlers = options.handlers ?? {}
    this.locale = options.locale ?? 'zh-CN'
    this.qualityProfile = options.qualityProfile ?? 'high'
    this.contentVersion = options.contentVersion ?? '1'
    this.subscribe()

    // 单实例常驻（DEC-145 / D-25）：桥是模块级单例、实例常驻 —— 本会话作为"后来者"挂上来时
    // 握手可能早就发生过了（unity:ready 只在 onReady 那一刻分发一次）。
    // 立刻补发 onHandshake，否则 app:init 不会发、任务页的状态条会永远停在"未握手"。
    if (bridge.isReady() === true) this.onHandshake(BRIDGE_PROTOCOL_VERSION)
  }

  /** 只读状态快照（每次读到的都是新对象，视图可以安全地塞进响应式容器）。 */
  get snapshot(): UnitySessionState {
    return { ...this.state, errors: [...this.state.errors] }
  }

  get isHandshakeDone(): boolean {
    return this.state.handshake
  }

  /** 页面要求进入的任务（Unity 侧可能还没到 `scene:ready`）。 */
  get requestedTask(): EnterIntent | null {
    return this.intent
  }

  // ── 页面 → Unity ──────────────────────────────────────────────────────

  /**
   * 要求进入某任务。
   *
   * **幂等**：同一个 `(taskType, projectId)` 重复调用不会重复发 `scene:enter` ——
   * 视图的同步函数会被各种响应式信号反复触发，重发会让 Unity 侧一直"先退旧的再进新的"。
   * 进来之前就调用是**允许的**（页面先导航、Unity 懒挂载是常态）：意图会记住，握手后自动补发。
   * 强制重进用 `enterTask(..., { force: true })`。
   */
  enterTask(taskType: TaskType, projectId: string, options: { force?: boolean } = {}): void {
    if (taskType === TaskType.None) return

    const same = this.intent?.taskType === taskType && this.intent?.projectId === projectId
    if (same && !options.force) {
      // 已经发过就不动；只在"记下了意图但还没发出去"时补一次
      if (this.state.handshake && !this.enterDispatched) this.sendSceneEnter()
      return
    }

    this.intent = { taskType, projectId }
    this.enterDispatched = false
    // 换任务 = 上一任务的进度/完成/状态全部作废（步骤序号是**扁平**的，留着会串味）
    this.state = {
      ...this.state,
      assetsReady: false,
      sceneReady: false,
      step: null,
      completion: null,
      picked: null,
      // 换任务 = 上一任务的部件清单与悬停全部作废（部件键是**按器件**的，留着会串味）
      parts: [],
      hover: null,
    }
    if (this.state.handshake) this.sendSceneEnter()
  }

  /** 退出当前任务（Unity 卸包清理后回 `scene:exited`；**实例不销毁**，DEC-81）。 */
  exitTask(): void {
    if (this.intent === null) return
    this.intent = null
    this.enterDispatched = false
    this.state = {
      ...this.state,
      assetsReady: false,
      sceneReady: false,
      step: null,
      picked: null,
      parts: [],
      hover: null,
    }
    this.post('scene:exit', null)
  }

  /**
   * 输入开关（模态面板打开时关掉三维输入，见 `docs/design/09` §6）。
   *
   * **握手之前只记状态、不发消息**：Unity 侧的任务流程管理器是在管理器自检里才订阅这些事件的，
   * 早于握手发出去的消息会**静默丢失**（桥收得到，但没有订阅者）—— 表现是"面板关了，三维还是点不动"。
   * 期望状态会在握手后补发。
   */
  setInputEnabled(enabled: boolean): void {
    if (this.inputEnabled === enabled) return
    this.inputEnabled = enabled
    if (this.state.handshake) this.post('input:enable', { enabled })
  }

  /**
   * 回执一条面板（`ui:result`）。
   *
   * ⚠️ **调用方负责"只回一条"**（用 `domain/step-panels.ts` 的 `StepPanelQueue.answer`）：
   * 本方法只负责把它发出去，不做去重 —— 重复发会让 Unity 端口把迟到的回执打到下一个请求上。
   */
  answerPanel(kind: UiPanelKind, result: UiResultKind, detail?: string): void {
    this.post('ui:result', detail === undefined ? { kind, result } : { kind, result, detail })
  }

  /**
   * 聚焦某个部件（`view:focus`）—— 右侧部件树点一行就调它，Unity 侧把它高亮
   * （`InteractiveManager.OnViewFocus`：按 key 找物体、每次只亮一个、`scene:exit` 清掉）。
   *
   * 载荷是 `{ objectKey, animate }`；`animate` 目前**只影响 Unity 侧的日志**（镜头推进在 P2-6 接），
   * 所以这里默认 false，不假装它已经会运镜。
   */
  focusPart(objectKey: string, options: { animate?: boolean } = {}): void {
    const key = objectKey.trim()
    if (key === '') return
    this.post('view:focus', { objectKey: key, animate: options.animate === true })
  }

  /** 连通性自检（回包为 `debug:pong`，页面据此显示往返毫秒）。 */
  ping(): void {
    this.pingSentAt = Date.now()
    this.post('debug:ping', { at: this.pingSentAt })
  }

  /**
   * 恢复运行（`runtime:resume`）：常驻画布从停泊区搬回任务页容器后调一次。
   * 隐藏期间 Unity 的 rAF 不暂停，但宿主可见性 / 输入闸门需要对齐（Unity 侧 TaskFlowManager 订阅）。
   */
  resume(): void {
    this.post('runtime:resume', {})
  }

  /** 取消订阅。**卸载 Unity 前必须调**（否则订阅会留在被清空的桥里，语义含混）。 */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    for (const off of this.unsubscribes) off()
    this.unsubscribes.length = 0
  }

  // ── 内部：订阅与分发 ──────────────────────────────────────────────────

  private subscribe(): void {
    const on = (type: BridgeMessageFromUnity, handler: (payload: unknown) => void): void => {
      this.unsubscribes.push(this.bridge.on(type, handler))
    }

    on(MSG_UNITY_READY, (payload) => this.onHandshake(readNumber(payload, 'version')))
    on(MSG_UNITY_PROGRESS, (payload) => this.onEngineProgress(readNumber(payload, 'progress')))
    on(MSG_ASSETS_READY, (payload) => this.onTaskRef(payload, this.onAssetsReady))
    on(MSG_SCENE_READY, (payload) => this.onTaskRef(payload, this.onSceneReady))
    on(MSG_SCENE_EXITED, (payload) => this.onTaskRef(payload, this.onSceneExited))
    on(MSG_STEP_CHANGED, (payload) => this.onStepChanged(payload))
    on(MSG_TASK_COMPLETED, (payload) => this.onCompleted(payload))
    on(MSG_OBJECT_PICKED, (payload) => this.onPicked(payload))
    on(MSG_UI_REQUEST, (payload) => this.onPanelRequest(payload))
    on(MSG_UNITY_ERROR, (payload) => this.onError(payload))
    on(MSG_DEBUG_PONG, (payload) => this.onPong(payload))
    on(MSG_SCENE_PARTS, (payload) => this.onParts(payload))
    on(MSG_OBJECT_HOVER, (payload) => this.onHover(payload))
  }

  private onHandshake(version: number): void {
    // 版本不符的报错由 `UnityBridge.onReady` 负责抛（它拿得到原始字符串）；
    // 能走到这里就说明版本已经对上了。
    this.state = { ...this.state, handshake: true }
    this.handlers.onHandshake?.(version)

    // ① 启动配置：握手后**马上**发一次（Unity 的 TaskFlowManager 已订阅）
    this.post('app:init', {
      locale: this.locale,
      qualityProfile: this.qualityProfile,
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
    })

    // ② 补发页面在握手之前就提出的意图（页面先导航、Unity 后挂载的常见顺序）
    if (this.intent !== null) this.sendSceneEnter()

    // ③ 补发输入开关（只在"期望关着"时才需要 —— 默认就是开着的）
    if (!this.inputEnabled) this.post('input:enable', { enabled: false })
  }

  private sendSceneEnter(): void {
    const intent = this.intent
    if (intent === null || this.enterDispatched) return
    this.enterDispatched = true
    this.post('scene:enter', {
      taskType: intent.taskType,
      projectId: intent.projectId,
      contentVersion: this.contentVersion,
    })
  }

  private onEngineProgress(progress: number): void {
    this.state = { ...this.state, engineProgress: progress }
    this.handlers.onEngineProgress?.(progress)
  }

  private onTaskRef(payload: unknown, handler: (taskType: TaskType) => void): void {
    const taskType = readTaskType(payload)
    if (taskType === null) return
    handler(taskType)
  }

  private onAssetsReady = (taskType: TaskType): void => {
    this.state = { ...this.state, assetsReady: true }
    this.handlers.onAssetsReady?.(taskType)
  }

  private onSceneReady = (taskType: TaskType): void => {
    this.state = { ...this.state, sceneReady: true }
    this.handlers.onSceneReady?.(taskType)
  }

  private onSceneExited = (taskType: TaskType): void => {
    this.state = { ...this.state, assetsReady: false, sceneReady: false, parts: [], hover: null }
    this.handlers.onSceneExited?.(taskType)
  }

  private onStepChanged(payload: unknown): void {
    const index = readNumber(payload, 'stepIndex')
    const total = readNumber(payload, 'stepTotal')
    const name = readString(payload, 'stepName')
    if (!Number.isFinite(index) || !Number.isFinite(total)) return
    const step: StepProgress = name === undefined ? { index, total } : { index, total, name }
    this.state = { ...this.state, step }
    this.handlers.onStep?.(step)
  }

  private onCompleted(payload: unknown): void {
    const taskType = readTaskType(payload) ?? TaskType.None
    const elapsedMs = readNumber(payload, 'elapsedMs')
    const score = readOptionalNumber(payload, 'score')
    const completion: TaskCompletion =
      score === undefined ? { taskType, elapsedMs } : { taskType, score, elapsedMs }
    this.state = { ...this.state, completion }
    this.handlers.onCompleted?.(completion)
  }

  private onPicked(payload: unknown): void {
    const objectKey = readString(payload, 'objectKey') ?? ''
    if (objectKey === '') return
    this.state = { ...this.state, picked: objectKey }
    this.handlers.onPicked?.(objectKey)
  }

  private onParts(payload: unknown): void {
    const parts = readParts(payload)
    this.state = { ...this.state, parts }
    this.handlers.onParts?.(parts)
  }

  private onHover(payload: unknown): void {
    // 键为空串 = 移出（Unity 侧把 null 串写成 ""），这里统一成 null
    const hover = readHover(payload)
    this.state = { ...this.state, hover }
    this.handlers.onHover?.(hover)
  }

  private onPanelRequest(payload: unknown): void {
    const refId = readString(payload, 'refId') ?? ''
    const rawKind = readString(payload, 'kind') ?? ''
    const kind = (PANEL_KINDS.includes(rawKind) ? rawKind : UiPanelKind.Ui) as UiPanelKind
    // `tips` 连 body 都没有（Unity 只发 tipsKey），所以这里**不要求** refId 非空：
    // 空 refId 的面板由 `domain/step-panels.ts` 的调用方按"弹不出来"回 unavailable，
    // 而不是在这一层悄悄丢掉（丢掉的表现就是"这一步一直等"，最难查）。
    const body = readBody(payload)
    this.panelSeq += 1
    const request: StepPanelRequest =
      body === undefined ? { kind, refId, seq: this.panelSeq } : { kind, refId, body, seq: this.panelSeq }
    this.handlers.onPanelRequest?.(request)
  }

  private onError(payload: unknown): void {
    const info: UnityErrorInfo = {
      code: readNumber(payload, 'code'),
      message: readString(payload, 'message') ?? '（Unity 未给出说明）',
      fatal: readBoolean(payload, 'fatal') === true,
      at: Date.now(),
    }
    this.state = { ...this.state, errors: [...this.state.errors, info] }
    this.handlers.onError?.(info)
  }

  private onPong(payload: unknown): void {
    const at = readNumber(payload, 'at')
    const sentAt = this.pingSentAt ?? at
    const latencyMs = Number.isFinite(sentAt) && sentAt > 0 ? Math.max(0, Date.now() - sentAt) : null
    this.pingSentAt = null
    this.state = { ...this.state, latencyMs }
    if (latencyMs !== null) this.handlers.onPong?.(latencyMs)
  }

  /**
   * 发消息。桥没挂上时**不抛异常**：这是一次"意图丢失"，页面要能显示出来，
   * 而不是让一个未捕获异常把 Vue 的渲染打断（那种表现是白屏，比丢了消息难查得多）。
   */
  private post(type: string, payload: unknown): void {
    if (this.disposed) return
    try {
      this.bridge.post(type, payload)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause)
      this.state = {
        ...this.state,
        errors: [
          ...this.state.errors,
          { code: -1, message: `发不出 ${type}：${message}`, fatal: false, at: Date.now() },
        ],
      }
      console.warn(`[UnitySession] ${type} 发不出去（Unity 实例还没挂上）：${message}`)
    }
  }
}

// ---------------------------------------------------------------------------
// 载荷读取：外部输入一律防御式读（读不懂就当没有，不抛异常）
// ---------------------------------------------------------------------------

function asRecord(payload: unknown): Record<string, unknown> | null {
  return typeof payload === 'object' && payload !== null && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : null
}

function readNumber(payload: unknown, key: string): number {
  const record = asRecord(payload)
  const value = record?.[key]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return Number.NaN
}

function readOptionalNumber(payload: unknown, key: string): number | undefined {
  const value = readNumber(payload, key)
  return Number.isFinite(value) ? value : undefined
}

function readString(payload: unknown, key: string): string | undefined {
  const record = asRecord(payload)
  const value = record?.[key]
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function readBoolean(payload: unknown, key: string): boolean | undefined {
  const record = asRecord(payload)
  const value = record?.[key]
  return typeof value === 'boolean' ? value : undefined
}

/** `taskType` 必须是契约里已定义的值；越界一律当"读不懂"（与 C# 侧 `TryConvertTaskType` 同口径）。 */
function readTaskType(payload: unknown): TaskType | null {
  const raw = readNumber(payload, 'taskType')
  if (!Number.isFinite(raw)) return null
  return TASK_TYPES.includes(raw as TaskType) ? (raw as TaskType) : null
}

/** `scene:parts.parts`：逐条防御式读（读不懂的条目**丢掉**，不抛异常、不阻断其余条目）。 */
function readParts(payload: unknown): PartEntry[] {
  const record = asRecord(payload)
  const raw = record?.parts
  if (!Array.isArray(raw)) return []
  const parts: PartEntry[] = []
  for (const item of raw) {
    const key = readString(item, 'key')
    const name = readString(item, 'name')
    if (key === undefined || name === undefined) continue
    const part: PartEntry = { key, name }
    const nameEn = readString(item, 'nameEn')
    const parentKey = readString(item, 'parentKey')
    if (nameEn !== undefined) part.nameEn = nameEn
    if (parentKey !== undefined) part.parentKey = parentKey
    parts.push(part)
  }
  return parts
}

/** `object:hover`：键读不出（含空串）就是"移出"；坐标夹到 0~1，别让浮标跑到画布外。 */
function readHover(payload: unknown): PartHover | null {
  const key = readString(payload, 'key')
  if (key === undefined) return null
  const x = readNumber(payload, 'x')
  const y = readNumber(payload, 'y')
  return {
    key,
    x: Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0,
    y: Number.isFinite(y) ? Math.min(1, Math.max(0, y)) : 0,
  }
}

function readBody(payload: unknown): UiRequestBody | undefined {
  const record = asRecord(payload)
  const raw = asRecord(record?.body)
  if (raw === null) return undefined

  const options = Array.isArray(raw.options)
    ? raw.options.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    : undefined
  const body: UiRequestBody = {
    title: typeof raw.title === 'string' ? raw.title : undefined,
    content: typeof raw.content === 'string' ? raw.content : undefined,
    questionType: typeof raw.questionType === 'string' ? raw.questionType : undefined,
    tips: typeof raw.tips === 'string' ? raw.tips : undefined,
  }
  if (options !== undefined && options.length > 0) body.options = options
  return body
}
