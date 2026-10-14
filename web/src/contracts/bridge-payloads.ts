/**
 * 桥消息的**载荷形状**（Web 侧）。
 *
 * 与 `contracts/bridge.ts` 的分工：
 *   · `bridge.ts` 管**消息名清单**（双端逐字一致，由 `tools/check-contracts.mjs` 机械守住）；
 *   · 本文件管**每个 type 带什么字段**，口径逐条照 `docs/design/02-bridge-protocol.md` §3。
 *
 * 为什么载荷不放进那份清单里：清单是**机器比对的契约**（改动要同批改 C# 与快照），
 * 而载荷形状没有 C# 侧的对应声明（Unity 侧是 `JsonUtility` 按字段名直读），
 * 混在一起会让"想加个备注注释"也像在动契约。分成两份，各自的责任就清楚了。
 *
 * ⚠️ 字段名**必须与 C# 侧的 `*Payload` / `JsonUtility` 字段逐字一致** ——
 * 写错只会表现为"收到消息但字段全是 undefined"，不会有任何编译期报错。
 * C# 侧对应位置：`NewStructureUnity/Assets/Scripts/Web/WebBridgeBehaviour.cs` 与 `WebBridge.cs`。
 */
import type { TaskType } from '@/contracts'

// ---------------------------------------------------------------------------
// 枚举：面板种类与回执结果（契约字符串，不是序号）
// ---------------------------------------------------------------------------

/** `ui:request` / `ui:result` 的面板种类。 */
export const UiPanelKind = {
  Tips: 'tips',
  Ui: 'ui',
  Question: 'question',
} as const
export type UiPanelKind = (typeof UiPanelKind)[keyof typeof UiPanelKind]

/**
 * `ui:result` 的结果。
 *
 * Unity 侧只认这三个（`WebStepPanelPort.ToResult`）：`success` / `failed` / `unavailable`。
 * 信息面板是"关闭即完成"、答题是"答对即完成、答错重问" —— **判定在 Web 侧**（同一份题库在这边）。
 */
export const UiResultKind = {
  Success: 'success',
  Failed: 'failed',
  Unavailable: 'unavailable',
} as const
export type UiResultKind = (typeof UiResultKind)[keyof typeof UiResultKind]

/** `ui:request` 里 `body` 的展示用字段（**不含答案** —— 判定留在界面层）。 */
export interface UiRequestBody {
  title?: string
  content?: string
  questionType?: string
  options?: string[]
  tips?: string
}

// ---------------------------------------------------------------------------
// Web → Unity
// ---------------------------------------------------------------------------

export interface AppInitPayload {
  locale: string
  qualityProfile: string
  protocolVersion: number
}

export interface SceneEnterPayload {
  taskType: number
  /** 内容数据里的 clip id（例 `clip_contactor`）—— Unity 侧据此取内容包 */
  projectId: string
  contentVersion: string
}

export interface InputEnablePayload {
  enabled: boolean
}

export interface UiResultPayload {
  kind: UiPanelKind
  result: UiResultKind
  detail?: string
}

export interface DebugPingPayload {
  at: number
}

// ---------------------------------------------------------------------------
// Unity → Web
// ---------------------------------------------------------------------------

export interface UnityReadyPayload {
  version: number
}

export interface UnityProgressPayload {
  progress: number
}

export interface TaskRefPayload {
  taskType: number
}

/**
 * `step:changed`：**扁平**序号（跨进程连续、从 0 起）。
 *
 * 直接用这两个数就能画进度条，不需要知道"进程"这层概念（`docs/design/10` §5）。
 */
export interface StepChangedPayload {
  stepIndex: number
  stepTotal: number
  stepName?: string
}

export interface TaskCompletedPayload {
  taskType: number
  /** 成绩体系未建，**现在恒为 0** —— 页面不许把它当"0 分"展示（`docs/PLAN.md` P2-7e） */
  score?: number
  elapsedMs: number
}

export interface ObjectPickedPayload {
  objectKey: string
}

export interface UiRequestPayload {
  kind: UiPanelKind
  /** 内容数据的键（`tipsKey` / `uiId` / `questionId`） */
  refId: string
  body?: UiRequestBody
}

export interface UnityErrorPayload {
  code: number
  message: string
  fatal?: boolean
}

export interface DebugPongPayload {
  at: number
}

// ---------------------------------------------------------------------------
// 页面用的状态模型（视图不直接吃原始载荷）
// ---------------------------------------------------------------------------

/** 一条跨进程连续的步骤进度。 */
export interface StepProgress {
  index: number
  total: number
  name?: string
}

/** 一次任务完成。`score` 为 `undefined` 表示 Unity 没给分（当前恒如此）。 */
export interface TaskCompletion {
  taskType: TaskType
  score?: number
  elapsedMs: number
}

/** 一条 Unity 侧错误（非致命的也要显示 —— 9001"登记表里没有这个 clip"就是这么用的）。 */
export interface UnityErrorInfo {
  code: number
  message: string
  fatal: boolean
  /** 收到的时间（`Date.now()`），页面按它排序与去重 */
  at: number
}

/** 一个待答的步骤面板（`ui:request` 的页面侧形状）。 */
export interface StepPanelRequest {
  kind: UiPanelKind
  refId: string
  body?: UiRequestBody
  /** 本地自增序号：用来区分"同一个 refId 的两次请求"（迟到回执不该打到新请求上） */
  seq: number
}

/** 一条面板回执。 */
export interface StepPanelReply {
  kind: UiPanelKind
  result: UiResultKind
  detail?: string
}

/** `Tips` 条目：提示条的两行字与两张图（`content/data/StepContentData.json`）。 */
export interface StepTipsContent {
  id: string
  /** 步骤提示（排版稿 B5 里的蓝色标签那一行） */
  stepTips: string
  /** 操作提示（青色标签那一行） */
  opTips: string
  stepImageKey?: string
  opImageKey?: string
}

/** `UI` 条目：信息面板的标题与分页正文。 */
export interface StepUiContent {
  id: string
  title: string
  pages: string[]
}
