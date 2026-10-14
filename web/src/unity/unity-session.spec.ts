/**
 * 桥会话层单测（`docs/design/09` 的启动链与两条就绪）。
 *
 * 为什么值得锁：这一层的错全是**沉默故障** ——
 *   · `app:init` 漏发 ⇒ Unity 拿不到语言 / 画质 / 协议版本，但画面看起来正常；
 *   · `scene:enter` 在握手前发出 / 握手后没补发 ⇒ 点了任务"画面没反应"；
 *   · 重复补发 ⇒ Unity 侧反复"先退旧的再进新的"，画面反复重装；
 *   · `input:enable{false}` 没补发 ⇒ 模态面板关闭后三维输入仍是关的（"点不动"）。
 * 用一个假桥把 `post` 出来的东西逐条钉住，就不必靠人肉联调去发现它们。
 */
import { describe, expect, it, vi } from 'vitest'
import { BRIDGE_PROTOCOL_VERSION, TaskType, UiPanelKind, UiResultKind } from '@/contracts'
import type { UnityErrorInfo } from '@/contracts'
import type { BridgeHandler, UnityBridge } from './UnityBridge'
import { UnitySession, type UnitySessionHandlers } from './UnitySession'

interface SentMessage {
  type: string
  payload: unknown
}

/** 假桥：只实现会话真正用到的 `on` / `post` 两面，并记下所有出站消息。 */
class FakeBridge {
  readonly sent: SentMessage[] = []
  /** false 模拟"Unity 实例还没挂上"（真桥此时会抛 `BridgeProtocolError`） */
  attached = true
  private readonly handlers = new Map<string, Set<BridgeHandler>>()

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

  post(type: string, payload?: unknown): void {
    if (!this.attached) throw new Error('Unity 实例尚未挂载')
    this.sent.push({ type, payload })
  }

  /** 模拟 Unity 侧发出的一条消息。 */
  emit(type: string, payload?: unknown): void {
    for (const handler of [...(this.handlers.get(type) ?? [])]) {
      handler(payload, { type, version: BRIDGE_PROTOCOL_VERSION, seq: 0 })
    }
  }

  types(type: string): number {
    return this.sent.filter((message) => message.type === type).length
  }

  last(type: string): SentMessage | undefined {
    return [...this.sent].reverse().find((message) => message.type === type)
  }

  payload(type: string): Record<string, unknown> {
    return (this.last(type)?.payload ?? {}) as Record<string, unknown>
  }
}

function setup(handlers: UnitySessionHandlers = {}) {
  const bridge = new FakeBridge()
  const session = new UnitySession(bridge as unknown as UnityBridge, {
    locale: 'zh-CN',
    qualityProfile: 'high',
    handlers,
  })
  return { bridge, session }
}

describe('UnitySession：握手与启动配置', () => {
  it('握手后先发 app:init（带语言 / 画质 / 协议版本）', () => {
    const { bridge, session } = setup()
    expect(bridge.sent).toHaveLength(0)

    bridge.emit('unity:ready', { version: BRIDGE_PROTOCOL_VERSION })

    const appInit = bridge.payload('app:init')
    expect(appInit).toEqual({
      locale: 'zh-CN',
      qualityProfile: 'high',
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
    })
    expect(session.isHandshakeDone).toBe(true)
  })

  it('握手事件回调拿到版本号', () => {
    const onHandshake = vi.fn()
    const { bridge } = setup({ onHandshake })
    bridge.emit('unity:ready', { version: BRIDGE_PROTOCOL_VERSION })
    expect(onHandshake).toHaveBeenCalledWith(BRIDGE_PROTOCOL_VERSION)
  })
})

describe('UnitySession：scene:enter 的时序与幂等', () => {
  it('握手**之前**要求进任务：不发，但记住意图', () => {
    const { bridge, session } = setup()
    session.enterTask(TaskType.Structure, 'clip_contactor')

    expect(bridge.types('scene:enter')).toBe(0)
    expect(session.requestedTask).toEqual({ taskType: TaskType.Structure, projectId: 'clip_contactor' })
  })

  it('握手**之后**补发 scene:enter（"页面先导航、Unity 后挂载"的常见顺序）', () => {
    const { bridge, session } = setup()
    session.enterTask(TaskType.Structure, 'clip_contactor')
    bridge.emit('unity:ready', { version: BRIDGE_PROTOCOL_VERSION })

    // 顺序也要对：先 app:init，再 scene:enter（Unity 侧按这个顺序初始化）
    const types = bridge.sent.map((message) => message.type)
    expect(types.indexOf('app:init')).toBeLessThan(types.indexOf('scene:enter'))
    expect(bridge.payload('scene:enter')).toMatchObject({
      taskType: TaskType.Structure,
      projectId: 'clip_contactor',
    })
    expect(bridge.types('scene:enter')).toBe(1)
  })

  it('重复要求同一个任务：只发一次（视图的同步函数会被反复触发）', () => {
    const { bridge, session } = setup()
    bridge.emit('unity:ready', { version: BRIDGE_PROTOCOL_VERSION })
    for (let i = 0; i < 5; i += 1) session.enterTask(TaskType.Structure, 'clip_contactor')
    expect(bridge.types('scene:enter')).toBe(1)
  })

  it('换任务 / 换项目：再发一次，并把上一任务的进度与完成清空', () => {
    const { bridge, session } = setup()
    bridge.emit('unity:ready', { version: BRIDGE_PROTOCOL_VERSION })
    session.enterTask(TaskType.Structure, 'clip_contactor')
    bridge.emit('step:changed', { stepIndex: 3, stepTotal: 7, stepName: 'Step_4' })
    bridge.emit('task:completed', { taskType: TaskType.Structure, elapsedMs: 1000 })
    expect(session.snapshot.step).not.toBeNull()

    session.enterTask(TaskType.Inspection, 'clip_contactor')

    expect(bridge.types('scene:enter')).toBe(2)
    // 步骤序号是**扁平**的：换任务后留着旧的会串味
    expect(session.snapshot.step).toBeNull()
    expect(session.snapshot.completion).toBeNull()
  })

  it('TaskType.None 不产生任何意图（不能进"空类型"任务）', () => {
    const { bridge, session } = setup()
    bridge.emit('unity:ready', { version: BRIDGE_PROTOCOL_VERSION })
    session.enterTask(TaskType.None, 'clip_contactor')
    expect(bridge.types('scene:enter')).toBe(0)
  })

  it('force 可以强制重发（恢复/重试用）', () => {
    const { bridge, session } = setup()
    bridge.emit('unity:ready', { version: BRIDGE_PROTOCOL_VERSION })
    session.enterTask(TaskType.Structure, 'clip_contactor')
    session.enterTask(TaskType.Structure, 'clip_contactor', { force: true })
    expect(bridge.types('scene:enter')).toBe(2)
  })

  it('exitTask 发 scene:exit，且之后再要求同一任务会重新发（意图已清）', () => {
    const { bridge, session } = setup()
    bridge.emit('unity:ready', { version: BRIDGE_PROTOCOL_VERSION })
    session.enterTask(TaskType.Structure, 'clip_contactor')
    session.exitTask()
    expect(bridge.types('scene:exit')).toBe(1)

    session.enterTask(TaskType.Structure, 'clip_contactor')
    expect(bridge.types('scene:enter')).toBe(2)
  })

  it('没有意图时 exitTask 什么都不发', () => {
    const { bridge, session } = setup()
    bridge.emit('unity:ready', { version: BRIDGE_PROTOCOL_VERSION })
    session.exitTask()
    expect(bridge.types('scene:exit')).toBe(0)
  })
})

describe('UnitySession：input:enable', () => {
  it('握手前关输入：不发，握手后补发（否则重挂一次 Unity 输入会被默默解封）', () => {
    const { bridge, session } = setup()
    session.setInputEnabled(false)
    expect(bridge.types('input:enable')).toBe(0)

    bridge.emit('unity:ready', { version: BRIDGE_PROTOCOL_VERSION })
    expect(bridge.payload('input:enable')).toEqual({ enabled: false })
  })

  it('同值不重发，变化才发', () => {
    const { bridge, session } = setup()
    bridge.emit('unity:ready', { version: BRIDGE_PROTOCOL_VERSION })

    session.setInputEnabled(false)
    session.setInputEnabled(false)
    expect(bridge.types('input:enable')).toBe(1)

    session.setInputEnabled(true)
    expect(bridge.types('input:enable')).toBe(2)
    expect(bridge.payload('input:enable')).toEqual({ enabled: true })
  })
})

describe('UnitySession：入站载荷解析', () => {
  it('step:changed 用扁平序号，直接可用', () => {
    const onStep = vi.fn()
    const { bridge, session } = setup({ onStep })
    bridge.emit('step:changed', { stepIndex: 2, stepTotal: 7, stepName: 'Step_3' })

    expect(onStep).toHaveBeenCalledWith({ index: 2, total: 7, name: 'Step_3' })
    expect(session.snapshot.step).toEqual({ index: 2, total: 7, name: 'Step_3' })
  })

  it('step:changed 缺字段时忽略（不把 undefined 塞进进度条）', () => {
    const onStep = vi.fn()
    const { bridge, session } = setup({ onStep })
    bridge.emit('step:changed', { stepIndex: 'x' })
    expect(onStep).not.toHaveBeenCalled()
    expect(session.snapshot.step).toBeNull()
  })

  it('task:completed 缺 score 时**不编造 0**（成绩体系未建）', () => {
    const onCompleted = vi.fn()
    const { bridge } = setup({ onCompleted })
    bridge.emit('task:completed', { taskType: TaskType.Structure, elapsedMs: 12345 })

    expect(onCompleted).toHaveBeenCalledWith({ taskType: TaskType.Structure, elapsedMs: 12345 })
    expect(onCompleted.mock.calls[0][0]).not.toHaveProperty('score')
  })

  it('task:completed 带 score 时原样透传', () => {
    const { bridge, session } = setup()
    bridge.emit('task:completed', { taskType: TaskType.Structure, score: 80, elapsedMs: 1 })
    expect(session.snapshot.completion).toEqual({ taskType: TaskType.Structure, score: 80, elapsedMs: 1 })
  })

  it('越界的 taskType 一律忽略（与 C# 侧 TryConvertTaskType 同口径）', () => {
    const onAssetsReady = vi.fn()
    const { bridge } = setup({ onAssetsReady })
    bridge.emit('assets:ready', { taskType: 99 })
    expect(onAssetsReady).not.toHaveBeenCalled()
  })

  it('assets:ready / scene:ready 分别落到两个状态位（DEC-84 的两条就绪）', () => {
    const { bridge, session } = setup()
    bridge.emit('assets:ready', { taskType: TaskType.Structure })
    expect(session.snapshot.assetsReady).toBe(true)
    expect(session.snapshot.sceneReady).toBe(false)

    bridge.emit('scene:ready', { taskType: TaskType.Structure })
    expect(session.snapshot.sceneReady).toBe(true)
  })

  it('scene:exited 把两条就绪复位（回目录后不该还显示"可交互"）', () => {
    const { bridge, session } = setup()
    bridge.emit('assets:ready', { taskType: TaskType.Structure })
    bridge.emit('scene:ready', { taskType: TaskType.Structure })
    bridge.emit('scene:exited', { taskType: TaskType.Structure })
    expect(session.snapshot.assetsReady).toBe(false)
    expect(session.snapshot.sceneReady).toBe(false)
  })

  it('object:picked 只认非空 key', () => {
    const onPicked = vi.fn()
    const { bridge, session } = setup({ onPicked })
    bridge.emit('object:picked', { objectKey: '' })
    expect(onPicked).not.toHaveBeenCalled()

    bridge.emit('object:picked', { objectKey: 'KM1' })
    expect(onPicked).toHaveBeenCalledWith('KM1')
    expect(session.snapshot.picked).toBe('KM1')
  })

  it('ui:request 认三档 kind，认不出的按 ui（能弹就弹，弹不了回 unavailable）', () => {
    const onPanelRequest = vi.fn()
    const { bridge } = setup({ onPanelRequest })

    bridge.emit('ui:request', { kind: 'question', refId: 'contactor_q_mainContact' })
    bridge.emit('ui:request', { kind: 'made-up', refId: 'x' })

    expect(onPanelRequest.mock.calls[0][0]).toMatchObject({
      kind: UiPanelKind.Question,
      refId: 'contactor_q_mainContact',
    })
    expect(onPanelRequest.mock.calls[1][0]).toMatchObject({ kind: UiPanelKind.Ui, refId: 'x' })
  })

  it('ui:request 的 body 只带展示字段（options 过滤掉空串；**没有答案**）', () => {
    const onPanelRequest = vi.fn()
    const { bridge } = setup({ onPanelRequest })
    bridge.emit('ui:request', {
      kind: 'question',
      refId: 'q1',
      body: { title: 't', content: 'c', options: ['A', '', 'B'], answer: 'A' },
    })

    const request = onPanelRequest.mock.calls[0][0]
    expect(request.body).toEqual({
      title: 't',
      content: 'c',
      questionType: undefined,
      tips: undefined,
      options: ['A', 'B'],
    })
    expect(request.body).not.toHaveProperty('answer')
  })

  it('tips 连 refId 都没有时也上报（丢掉它只会表现为"这一步一直等"，最难查）', () => {
    const onPanelRequest = vi.fn()
    const { bridge } = setup({ onPanelRequest })
    bridge.emit('ui:request', { kind: 'tips' })
    expect(onPanelRequest).toHaveBeenCalledTimes(1)
    expect(onPanelRequest.mock.calls[0][0]).toMatchObject({ kind: UiPanelKind.Tips, refId: '' })
  })

  it('每次 ui:request 拿到递增的 seq（迟到回执靠它区分）', () => {
    const onPanelRequest = vi.fn()
    const { bridge } = setup({ onPanelRequest })
    bridge.emit('ui:request', { kind: 'ui', refId: 'a' })
    bridge.emit('ui:request', { kind: 'ui', refId: 'b' })
    expect(onPanelRequest.mock.calls[1][0].seq).toBeGreaterThan(onPanelRequest.mock.calls[0][0].seq)
  })

  it('unity:error 收到即记录并按时间累积（非致命的也要显示）', () => {
    const onError = vi.fn()
    const { bridge, session } = setup({ onError })
    bridge.emit('unity:error', { code: 9001, message: '没有内容包', fatal: false })

    expect(onError).toHaveBeenCalledTimes(1)
    expect(session.snapshot.errors).toHaveLength(1)
    expect(session.snapshot.errors[0]).toMatchObject({ code: 9001, fatal: false })
  })

  it('debug:ping / pong 成对：pong 读出往返毫秒', () => {
    const { bridge, session } = setup()
    bridge.emit('unity:ready', { version: BRIDGE_PROTOCOL_VERSION })

    session.ping()
    const at = bridge.payload('debug:ping').at
    expect(typeof at).toBe('number')

    bridge.emit('debug:pong', { at })
    expect(session.snapshot.latencyMs).not.toBeNull()
    expect(session.snapshot.latencyMs).toBeGreaterThanOrEqual(0)
  })
})

describe('UnitySession：出站与容错', () => {
  it('answerPanel 发 ui:result；没有 detail 时就是干净的 {kind,result}', () => {
    const { bridge, session } = setup()
    bridge.emit('unity:ready', { version: BRIDGE_PROTOCOL_VERSION })

    session.answerPanel(UiPanelKind.Ui, UiResultKind.Success)
    expect(bridge.payload('ui:result')).toEqual({ kind: 'ui', result: 'success' })

    session.answerPanel(UiPanelKind.Question, UiResultKind.Failed, '答错重问')
    expect(bridge.payload('ui:result')).toEqual({ kind: 'question', result: 'failed', detail: '答错重问' })
  })

  it('桥还没挂上时发消息**不抛异常**，而是记成一条错误（白屏比丢消息更难查）', () => {
    const bridge = new FakeBridge()
    bridge.attached = false
    const session = new UnitySession(bridge as unknown as UnityBridge)

    // 面板回执是唯一"握手前也可能发出"的路径（能收到 ui:request 就说明已握手；
    // 这里刻意制造"桥没了"的极端情形），它必须被接住而不是把 Vue 的渲染打断。
    expect(() => session.answerPanel(UiPanelKind.Ui, UiResultKind.Success)).not.toThrow()
    expect(session.snapshot.errors.some((error) => error.message.includes('ui:result'))).toBe(true)
  })

  it('握手之前 setInputEnabled 一条都不发（Unity 侧还没订阅，发了也是丢）', () => {
    const bridge = new FakeBridge()
    const session = new UnitySession(bridge as unknown as UnityBridge)
    session.setInputEnabled(false)
    session.setInputEnabled(true)
    expect(bridge.sent).toHaveLength(0)
  })

  it('dispose 之后不再收消息（订阅要成对退掉）', () => {
    const onStep = vi.fn()
    const { bridge, session } = setup({ onStep })
    session.dispose()
    bridge.emit('step:changed', { stepIndex: 0, stepTotal: 1 })
    expect(onStep).not.toHaveBeenCalled()
  })

  it('snapshot 是快照：外部改不动会话内部状态', () => {
    const { bridge, session } = setup()
    bridge.emit('unity:error', { code: 1, message: 'x' })
    const snapshot = session.snapshot
    // `errors` 在类型上就是 `readonly`（外部想 push 得先强转）；这里强转一次，
    // 证明**运行期**也真的隔离：改快照不会污染会话里的那一份。
    ;(snapshot.errors as UnityErrorInfo[]).push({ code: 2, message: 'y', fatal: false, at: 0 })
    expect(session.snapshot.errors).toHaveLength(1)
  })
})
