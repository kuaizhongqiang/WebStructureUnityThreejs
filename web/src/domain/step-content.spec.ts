/**
 * 步骤内容适配层单测（`StepContentData.json` → 提示条 / 信息面板）。
 *
 * 为什么值得锁：这份数据是"多态条目按 id 取用"，读错一个字段不会有任何报错，
 * 只会表现为"提示条空白"或"面板弹不出来" —— 而面板弹不出来在 Unity 侧就等于把这一步卡住。
 */
import { describe, expect, it } from 'vitest'
import { toStepContentIndex, toStepTips, toStepUi, tipsOf, uiOf } from './step-content'

const raw = (contents: unknown[]): unknown => ({ id: 'stepContentData', contents })

describe('步骤内容：Tips 条目', () => {
  it('读两行字与两张图', () => {
    expect(
      toStepTips({
        contentType: 'Tips',
        id: 't1',
        stepTips: '把红表笔接到 V+ 端子',
        opTips: '先确认电源已断电',
        stepImageKey: 'img_a',
        opImageKey: '',
      }),
    ).toEqual({
      id: 't1',
      stepTips: '把红表笔接到 V+ 端子',
      opTips: '先确认电源已断电',
      stepImageKey: 'img_a',
      // 数据里大量 `""` 表示"没填" —— 必须读成 undefined，不能当成一个空 key 去取图
      opImageKey: undefined,
    })
  })

  it('两行字都空 ⇒ 不入表（宁可不弹，也不弹一个空提示条）', () => {
    expect(toStepTips({ contentType: 'Tips', id: 't1', stepTips: '', opTips: '   ' })).toBeNull()
  })

  it('没有 id ⇒ 不入表（查不到的东西不该占一个键）', () => {
    expect(toStepTips({ contentType: 'Tips', stepTips: 'x' })).toBeNull()
  })

  it('只有一行也算数（另一行不渲染，不是"整条无效"）', () => {
    expect(toStepTips({ contentType: 'Tips', id: 't1', opTips: '只有操作提示' })).toEqual({
      id: 't1',
      stepTips: '',
      opTips: '只有操作提示',
      stepImageKey: undefined,
      opImageKey: undefined,
    })
  })
})

describe('步骤内容：UI 条目', () => {
  it('读标题与分页正文', () => {
    expect(
      toStepUi({ contentType: 'UI', id: 'u1', title: '接触器检测', pages: ['第一页', '第二页'] }),
    ).toEqual({
      id: 'u1',
      title: '接触器检测',
      pages: ['第一页', '第二页'],
    })
  })

  it('丢掉空白页（空页会让"下一页"点出一片空白）', () => {
    const ui = toStepUi({ contentType: 'UI', id: 'u1', title: 't', pages: ['a', '   ', '', 'b'] })
    expect(ui?.pages).toEqual(['a', 'b'])
  })

  it('标题与正文都空 ⇒ 不入表（调用方据此回 unavailable，而不是弹空框）', () => {
    expect(toStepUi({ contentType: 'UI', id: 'u1', title: '  ', pages: [] })).toBeNull()
  })

  it('没有 pages 字段时按空数组处理，不炸', () => {
    expect(toStepUi({ contentType: 'UI', id: 'u1', title: 't' })).toEqual({ id: 'u1', title: 't', pages: [] })
  })
})

describe('步骤内容：整份索引', () => {
  it('按 contentType 分流到两份索引', () => {
    const index = toStepContentIndex(
      raw([
        { contentType: 'UI', id: 'u1', title: 't', pages: ['p'] },
        { contentType: 'Tips', id: 't1', stepTips: 's', opTips: 'o' },
      ]),
    )
    expect(uiOf(index, 'u1')?.title).toBe('t')
    expect(tipsOf(index, 't1')?.stepTips).toBe('s')
    // 交叉查：两个索引不互通
    expect(tipsOf(index, 'u1')).toBeUndefined()
    expect(uiOf(index, 't1')).toBeUndefined()
  })

  it('contentType 大小写与空白容错（`ui` / `TIPS` / ` Tips `）', () => {
    const index = toStepContentIndex(
      raw([
        { contentType: 'ui', id: 'u1', title: 't', pages: ['p'] },
        { contentType: ' TIPS ', id: 't1', stepTips: 's' },
      ]),
    )
    expect(uiOf(index, 'u1')).toBeDefined()
    expect(tipsOf(index, 't1')).toBeDefined()
  })

  it('认不出的 contentType 直接忽略（今天没有第三种，将来有了也不该让页面炸）', () => {
    const index = toStepContentIndex(
      raw([
        { contentType: 'Video', id: 'v1', url: 'x' },
        { contentType: 'UI', id: 'u1', title: 't', pages: ['p'] },
      ]),
    )
    expect(index.ui.size).toBe(1)
    expect(index.tips.size).toBe(0)
  })

  it('同 id 重复时先到先得（数据重发不该悄悄改掉前面的文案）', () => {
    const index = toStepContentIndex(
      raw([
        { contentType: 'Tips', id: 't1', stepTips: '先到的' },
        { contentType: 'Tips', id: 't1', stepTips: '后到的' },
      ]),
    )
    expect(tipsOf(index, 't1')?.stepTips).toBe('先到的')
  })

  it('输入不是对象 / 是空数组 / 是 null 都安全（内容缺失是常态，不该白屏）', () => {
    for (const bad of [null, undefined, 'nope', 42, [], { contents: null }]) {
      const index = toStepContentIndex(bad)
      expect(index.ui.size).toBe(0)
      expect(index.tips.size).toBe(0)
    }
  })

  it('contents 里混入非对象条目时跳过，不整体失败', () => {
    const index = toStepContentIndex(raw([null, 'x', 7, { contentType: 'Tips', id: 't1', stepTips: 's' }]))
    expect(index.tips.size).toBe(1)
  })

  it('空 id 查表返回 undefined（不去 map 里瞎撞）', () => {
    const index = toStepContentIndex(raw([{ contentType: 'Tips', id: 't1', stepTips: 's' }]))
    expect(tipsOf(index, '')).toBeUndefined()
    expect(uiOf(index, '')).toBeUndefined()
  })

  it('裸数组（没有外层 contents 字段）也认', () => {
    const index = toStepContentIndex([{ contentType: 'UI', id: 'u1', title: 't', pages: ['p'] }])
    expect(uiOf(index, 'u1')?.pages).toEqual(['p'])
  })
})
