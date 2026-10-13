/**
 * Unity 构建的**选件规则**单测（DEC-81）。
 *
 * 为什么值得单独锁：这条规则错了不会报错，只会表现为
 * "某个任务页永远显示产物未就位"或"挂上了不该挂的构建" —— 都属于沉默故障。
 * 覆盖三种形状：新清单（`taskTypes[]`）、旧清单（单值 `taskType`）、声明为空。
 */
import { describe, expect, it } from 'vitest'
import { TaskType } from '@/contracts'
import { declaresTaskType, pickUnityBuild, type UnityBuildEntry } from './runtime'

const build = (entry: Partial<UnityBuildEntry> & { key: string }): UnityBuildEntry => ({
  loader: 'Build/main.loader.js',
  ...entry,
})

describe('Unity 构建选件（DEC-81：一个构建承载多个任务）', () => {
  it('新清单：声明了该 taskType 就算命中', () => {
    const main = build({ key: 'main', taskTypes: [4, 5, 8, 9] })
    expect(declaresTaskType(main, TaskType.Training)).toBe(true)
    expect(declaresTaskType(main, TaskType.Structure)).toBe(true)
  })

  it('新清单：没声明的不算命中（不靠"猜"）', () => {
    const main = build({ key: 'main', taskTypes: [4, 5] })
    expect(declaresTaskType(main, TaskType.Structure)).toBe(false)
  })

  it('旧清单：单值 taskType 仍然认（兼容已经打出去的包）', () => {
    const legacy = build({ key: 'training', taskType: TaskType.Training })
    expect(declaresTaskType(legacy, TaskType.Training)).toBe(true)
    expect(declaresTaskType(legacy, TaskType.Structure)).toBe(false)
  })

  it('两代都为空：一律不认定（宁可说"未就位"，也不挂上不知道能不能干活的构建）', () => {
    expect(declaresTaskType(build({ key: 'empty' }), TaskType.Training)).toBe(false)
    expect(declaresTaskType(build({ key: 'empty', taskTypes: [] }), TaskType.Training)).toBe(false)
  })

  it('多个候选：取清单里第一个声明命中的（顺序即清单顺序）', () => {
    const builds = [
      build({ key: 'main', taskTypes: [4, 5, 8, 9] }),
      build({ key: 'training', taskType: TaskType.Training }),
    ]
    expect(pickUnityBuild(builds, TaskType.Training)?.key).toBe('main')
    expect(pickUnityBuild(builds, TaskType.Structure)?.key).toBe('main')
  })

  it('没有候选：返回 null（页面据此显示"产物未就位"，不是"卡在加载中"）', () => {
    expect(pickUnityBuild([], TaskType.Training)).toBeNull()
    expect(pickUnityBuild([build({ key: 'main', taskTypes: [8] })], TaskType.Training)).toBeNull()
  })

  it('只承载 Three 类 / 非三维任务的构建不会被 Unity 任务选中', () => {
    const onlyThree = build({ key: 'main', taskTypes: [1, 2, 3] })
    expect(pickUnityBuild([onlyThree], TaskType.Training)).toBeNull()
  })
})
