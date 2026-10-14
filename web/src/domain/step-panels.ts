/**
 * 步骤面板的**回执纪律**（纯逻辑，不碰 DOM、不碰 Vue）。
 *
 * 为什么单独抽一个状态机：`docs/design/02` §3.2 与 `docs/design/10` §5 给了两条硬纪律，
 * 而它们都很容易在视图里写漏 ——
 *   ① **一个请求只回一条回执**（多回一条会让 Unity 的端口把迟到的回执打到下一个请求上）；
 *   ② **弹不出来也要回 `unavailable`**，否则这一步会一直等（`timeoutSeconds` 默认为 0 = 不限时）。
 * 把纪律放在这里，视图只负责"画出来"，回执由这一处统一发 —— 于是它能被试出来。
 *
 * ## 为什么 `tips` 不占"等回执"的位置
 *
 * Unity 侧的 `WebStepPanelPort.ShowTip` 是**发出去就不管**（不调 `BeginPending`，也不订阅 `UiResultEvent`）：
 * 提示条关不关都能继续走。所以提示条不进 `pending`，也**不需要**回执 ——
 * 给它回一条只是让 C# 侧那条 `return` 白跑一次，还容易让人误以为它需要应答。
 * （对照：`ui` / `question` 两档进 `pending`，必须回，且只回一条。）
 *
 * ## 一个请求 = 一次进入 `pending`
 *
 * `ui:request` 一次只该有一个"等结果"的面板（Unity 侧自己也这么假设，来新的会把旧的丢掉并告警）。
 * 所以这里遇到"上一个还没回又来新的"时**不排队**，而是把旧的替换掉并如实报告 ——
 * 悄悄排队会让页面显示 A、Unity 等 B，是最难查的一类错位。
 */
import {
  UiPanelKind,
  UiResultKind,
  type StepPanelReply,
  type StepPanelRequest,
  type UiRequestBody,
} from '@/contracts'

/** `push` 的结果：告诉调用方发生了什么（视图据此决定要不要弹、要不要清掉旧面板）。 */
export interface PanelPushOutcome {
  request: StepPanelRequest
  /** 这次请求是否**作废了**上一个还在等回执的面板（true 时视图应当把旧面板换掉） */
  replacedPending: boolean
}

export class StepPanelQueue {
  private seq = 0
  private pendingRequest: StepPanelRequest | null = null
  private tipRequest: StepPanelRequest | null = null

  /** 当前正在等回执的面板（`ui` / `question`）；没有则为 `null`。 */
  get pending(): StepPanelRequest | null {
    return this.pendingRequest
  }

  /** 当前要显示的提示条（`tips`）；关掉后为 `null`。 */
  get tip(): StepPanelRequest | null {
    return this.tipRequest
  }

  /** 是否有面板正等回执（视图据此决定要不要 `input:enable{false}`）。 */
  get hasPending(): boolean {
    return this.pendingRequest !== null
  }

  /**
   * 收下一条 `ui:request`。
   *
   * `tips` 只记下"当前该显示哪条"，**不产生回执义务**；`ui` / `question` 进入 `pending`。
   */
  push(kind: UiPanelKind, refId: string, body?: UiRequestBody): PanelPushOutcome {
    this.seq += 1
    const request: StepPanelRequest = { kind, refId, body, seq: this.seq }

    if (kind === UiPanelKind.Tips) {
      this.tipRequest = request
      return { request, replacedPending: false }
    }

    const replacedPending = this.pendingRequest !== null
    this.pendingRequest = request
    return { request, replacedPending }
  }

  /**
   * 回执。**只有"当前正在等的那个"才允许回，且只回一次**。
   *
   * 返回要发出去的载荷；不该回（没有 pending / kind 不匹配 / 已经回过了）时返回 `null`。
   * 调用方拿到 `null` 就**什么都不要发** —— 这正是"迟到的回执不打到下一个请求上"的落点。
   */
  answer(kind: UiPanelKind, result: UiResultKind, detail?: string): StepPanelReply | null {
    const pending = this.pendingRequest
    if (pending === null) return null
    if (pending.kind !== kind) return null

    // 先清空再返回：同一条请求的第二次 `answer` 必然拿到 null（"只回一条"）
    this.pendingRequest = null
    return detail === undefined ? { kind, result } : { kind, result, detail }
  }

  /** 用面板自身的 `seq` 回执：视图手里只留了那条请求时用它，语义与 `answer` 完全一致。 */
  answerRequest(request: StepPanelRequest, result: UiResultKind, detail?: string): StepPanelReply | null {
    if (this.pendingRequest === null || this.pendingRequest.seq !== request.seq) return null
    return this.answer(request.kind, result, detail)
  }

  /** 关掉提示条（用户点 × 或流程走到下一步）。 */
  dismissTip(): void {
    this.tipRequest = null
  }

  /**
   * 收掉所有面板。
   *
   * 用在两处：切任务 / 卸载 Unity（面板在 DOM 层，**清推进栈带不走它**，见 `docs/design/10` §5）、
   * 以及跳转步骤时 Unity 会主动 `CloseTopPanel()` —— 那一次我们只是本地收干净，**不回执**。
   */
  reset(): void {
    this.pendingRequest = null
    this.tipRequest = null
  }
}
