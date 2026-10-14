/**
 * 步骤面板的回执纪律单测（`docs/design/02` §3.2 / `docs/design/10` §5）。
 *
 * 为什么值得单独锁：这两条纪律错了都**不会报错**，只会表现为
 * "某一步永远卡住"或"回执打到下一个请求上（答非所问）" —— 都属于最难查的沉默故障。
 *   ① 一个请求只回一条回执；
 *   ② 面板弹不出来也要回 `unavailable`（回执由调用方发，这里锁"什么时候允许发"）。
 */
import { describe, expect, it } from 'vitest'
import { UiPanelKind, UiResultKind } from '@/contracts'
import { StepPanelQueue } from './step-panels'

describe('步骤面板队列：回执纪律', () => {
  it('tips 只占提示条，不产生回执义务（Unity 侧 ShowTip 发出去就不管）', () => {
    const queue = new StepPanelQueue()
    const outcome = queue.push(UiPanelKind.Tips, 'contactor_measure_step1_tips')

    expect(outcome.request.kind).toBe(UiPanelKind.Tips)
    expect(queue.tip?.refId).toBe('contactor_measure_step1_tips')
    expect(queue.hasPending).toBe(false)
    // 给 tips 回执：队列没有 pending，一律拒绝（不要发那条无意义的 ui:result）
    expect(queue.answer(UiPanelKind.Tips, UiResultKind.Success)).toBeNull()
  })

  it('ui / question 进入 pending，回执只允许回一条', () => {
    const queue = new StepPanelQueue()
    queue.push(UiPanelKind.Ui, 'contactor_ui_measure')
    expect(queue.hasPending).toBe(true)

    const first = queue.answer(UiPanelKind.Ui, UiResultKind.Success, '已确认')
    expect(first).toEqual({ kind: UiPanelKind.Ui, result: UiResultKind.Success, detail: '已确认' })
    // 第二次必须被拒绝 —— "一个请求只回一条"
    expect(queue.answer(UiPanelKind.Ui, UiResultKind.Success)).toBeNull()
    expect(queue.hasPending).toBe(false)
  })

  it('kind 不匹配的回执被拒绝（不会打到另一个面板上）', () => {
    const queue = new StepPanelQueue()
    queue.push(UiPanelKind.Question, 'contactor_q_mainContact')

    expect(queue.answer(UiPanelKind.Ui, UiResultKind.Success)).toBeNull()
    // 拒绝之后 pending 仍在 —— 该等的还要等
    expect(queue.hasPending).toBe(true)
    expect(queue.answer(UiPanelKind.Question, UiResultKind.Failed)).toEqual({
      kind: UiPanelKind.Question,
      result: UiResultKind.Failed,
    })
  })

  it('没有 pending 时回执是 no-op（迟到回执的落点）', () => {
    const queue = new StepPanelQueue()
    expect(queue.answer(UiPanelKind.Ui, UiResultKind.Unavailable)).toBeNull()
  })

  it('新面板顶掉还没回执的旧面板：如实报告 replacedPending（不悄悄排队）', () => {
    const queue = new StepPanelQueue()
    const first = queue.push(UiPanelKind.Ui, 'ui_a')
    const second = queue.push(UiPanelKind.Ui, 'ui_b')

    expect(second.replacedPending).toBe(true)
    expect(queue.pending?.refId).toBe('ui_b')
    // 拿旧请求回执：seq 对不上 ⇒ 拒绝（这正是"迟到的回执不打到新请求上"）
    expect(queue.answerRequest(first.request, UiResultKind.Success)).toBeNull()
    expect(queue.answerRequest(second.request, UiResultKind.Success)).not.toBeNull()
  })

  it('answerRequest 认的是 seq，不是 refId 相同就算（同一 id 连问两次也不会串）', () => {
    const queue = new StepPanelQueue()
    const first = queue.push(UiPanelKind.Question, 'q_same')
    const second = queue.push(UiPanelKind.Question, 'q_same')

    expect(second.request.seq).not.toBe(first.request.seq)
    expect(queue.answerRequest(first.request, UiResultKind.Success)).toBeNull()
    expect(queue.answerRequest(second.request, UiResultKind.Success)).not.toBeNull()
  })

  it('返回的回执不带 detail 字段时就是干净的 {kind,result}（不塞 undefined）', () => {
    const queue = new StepPanelQueue()
    queue.push(UiPanelKind.Ui, 'ui_a')
    const reply = queue.answer(UiPanelKind.Ui, UiResultKind.Unavailable)
    expect(reply).toEqual({ kind: UiPanelKind.Ui, result: UiResultKind.Unavailable })
    expect(Object.keys(reply ?? {})).toEqual(['kind', 'result'])
  })

  it('reset 收掉全部面板（切任务 / 卸载 Unity 时用）；reset 之后不回执', () => {
    const queue = new StepPanelQueue()
    queue.push(UiPanelKind.Ui, 'ui_a')
    queue.push(UiPanelKind.Tips, 'tips_a')

    queue.reset()
    expect(queue.pending).toBeNull()
    expect(queue.tip).toBeNull()
    // 已经收掉了：此时回执不该发出去（流程已经跳走，回执会打到下一步）
    expect(queue.answer(UiPanelKind.Ui, UiResultKind.Success)).toBeNull()
  })

  it('dismissTip 只关提示条，不影响正在等回执的面板', () => {
    const queue = new StepPanelQueue()
    queue.push(UiPanelKind.Tips, 'tips_a')
    queue.push(UiPanelKind.Ui, 'ui_a')

    queue.dismissTip()
    expect(queue.tip).toBeNull()
    expect(queue.hasPending).toBe(true)
  })
})
