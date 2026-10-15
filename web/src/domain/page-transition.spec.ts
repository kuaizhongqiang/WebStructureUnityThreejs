/**
 * 过渡口径的单测（Issue #57）。
 *
 * 两类断言：
 *   ① **纯函数**：站间 key 的不变量 —— 尤其是"Unity 站共用一个 key"这条**画布红线**，
 *      它是"切站时不许把常驻画布淡出再淡入"（DEC-145）在代码里的唯一落点，被"优化"掉就会回归；
 *   ② **样式真实存在**：过渡类名是代码与 `components.css` 之间的字符串契约，
 *      改名 / 写死时长 / 令牌没定义都该在这里红，而不是等到页面上看不到过渡才发现。
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { PAGE_TRANSITION, STATION_TRANSITION, stationKeyOf } from './page-transition'
import { TaskType, TASK_TYPES } from '@/contracts'
import { isUnityTask } from './registry'

const UNITY_TASKS = TASK_TYPES.filter((type) => isUnityTask(type))
const THREE_TASKS = TASK_TYPES.filter((type) => !isUnityTask(type))

/** 仓库内的相对路径 → 磁盘绝对路径（与 `scene-assets.spec.ts` 同一写法）。 */
function repoFile(relative: string): string {
  return fileURLToPath(new URL(`../../../${relative}`, import.meta.url))
}

const componentsCss = readFileSync(repoFile('docs/ui-mockups/components.css'), 'utf8')
const tokensCss = readFileSync(repoFile('docs/ui-mockups/tokens.css'), 'utf8')

describe('stationKeyOf：站间过渡 key（Issue #57 的 Unity 画布红线）', () => {
  it('全部 Unity 站共用同一个 key ⇒ 站间切换不触发过渡，常驻画布原地不动', () => {
    expect(UNITY_TASKS.length).toBeGreaterThan(1) // 少于两个就测不出"共用"
    expect(new Set(UNITY_TASKS.map((type) => stationKeyOf(type))).size).toBe(1)
  })

  it('非 Unity 站逐站一个 key ⇒ 换站即有过渡', () => {
    const keys = THREE_TASKS.map((type) => stationKeyOf(type))
    expect(new Set(keys).size).toBe(THREE_TASKS.length)
  })

  it('跨栈翻站的 key 必然不同（Unity ↔ Three 一定走过渡）', () => {
    const unityKey = stationKeyOf(TaskType.Structure)
    for (const type of THREE_TASKS) expect(stationKeyOf(type)).not.toBe(unityKey)
  })

  it('key 不随 Unity 站的具体类型变化（防"优化"成 station:<taskType>）', () => {
    expect(stationKeyOf(TaskType.Structure)).toBe(stationKeyOf(TaskType.Inspection))
    expect(stationKeyOf(TaskType.LineConnection)).toBe(stationKeyOf(TaskType.Training))
  })
})

describe('过渡名与样式：代码里的名字必须在设计系统里有对应类', () => {
  it('两个过渡名互不相同，且都非空', () => {
    expect(PAGE_TRANSITION).not.toBe(STATION_TRANSITION)
    expect(PAGE_TRANSITION.length).toBeGreaterThan(0)
    expect(STATION_TRANSITION.length).toBeGreaterThan(0)
  })

  it('components.css 里确实有这两套 Vue 过渡类（改名即失败）', () => {
    for (const name of [PAGE_TRANSITION, STATION_TRANSITION]) {
      for (const phase of ['enter-active', 'leave-active', 'enter-from', 'leave-to']) {
        expect(componentsCss, `${name}-${phase}`).toContain(`.${name}-${phase}`)
      }
    }
  })

  it('时长与缓动走令牌，过渡类里不写零散时长字面值', () => {
    const start = componentsCss.indexOf(`.${PAGE_TRANSITION}-enter-active`)
    const end = componentsCss.indexOf(`.${STATION_TRANSITION}-leave-to`)
    expect(start).toBeGreaterThan(0)
    expect(end).toBeGreaterThan(start)
    const rules = componentsCss.slice(start, end)
    expect(rules).toContain('var(--dur-page)')
    expect(rules).toContain('var(--ease-page)')
    expect(rules).not.toMatch(/transition:[^;]*\d+m?s/)
  })

  it('三个动效令牌都定义在 tokens.css', () => {
    for (const token of ['--dur-page', '--ease-page', '--page-shift']) {
      expect(tokensCss, token).toContain(`${token}:`)
    }
  })

  it('「减少动态效果」由全局媒体查询兜底（令牌不必再给一份）', () => {
    expect(componentsCss).toMatch(/@media \(prefers-reduced-motion: reduce\)/)
  })
})
