import { describe, expect, it } from 'vitest'
import {
  SceneState,
  SCENE_STATE_LABELS,
  TASK_TYPE_LABELS,
  TASK_TYPE_STACK,
  TASK_TYPES,
  TaskType,
  ViewerStack,
  resolveViewerStack,
} from './index'

/**
 * 双端契约守卫（DEC-09 / DEC-10）。
 *
 * 这里写死的是**契约快照**：一旦有人改了名字、序号或中文标签，本测试必须失败。
 * C# 侧就位后，需要一条等价的比对（读取 C# 枚举并逐值核对）。
 */

const SCENE_STATE_SNAPSHOT: ReadonlyArray<[number, string, string]> = [
  [0, 'Setup', '初始化'],
  [1, 'Start', '开始'],
  [2, 'Login', '登录'],
  [3, 'Menu', '菜单'],
  [4, 'UI', 'UI'],
  [5, 'Roaming', '漫游'],
]

const TASK_TYPE_SNAPSHOT: ReadonlyArray<[number, string, string]> = [
  [0, 'None', '空类型'],
  [1, 'Purpose', '任务目的'],
  [2, 'Equipment', '实验仪器'],
  [3, 'Principle', '实验原理'],
  [4, 'LineConnection', '电路连接'],
  [5, 'Training', '仿真实验'],
  [6, 'Test', '小测验'],
  [7, 'Info', '简介'],
  [8, 'Structure', '结构'],
  [9, 'Inspection', '检测'],
  [10, 'Exam', '考核'],
]

describe('SceneState 契约（MCV EnumAll.cs:137-152）', () => {
  it('序号、名字、中文标签逐值一致', () => {
    for (const [ordinal, name, label] of SCENE_STATE_SNAPSHOT) {
      expect(SceneState[ordinal]).toBe(name)
      expect(SCENE_STATE_LABELS[ordinal as SceneState]).toBe(label)
    }
    expect(Object.keys(SCENE_STATE_LABELS)).toHaveLength(SCENE_STATE_SNAPSHOT.length)
  })
})

describe('TaskType 契约（MCV EnumAll.cs:389-415）', () => {
  it('序号、名字、中文标签逐值一致', () => {
    for (const [ordinal, name, label] of TASK_TYPE_SNAPSHOT) {
      expect(TaskType[ordinal]).toBe(name)
      expect(TASK_TYPE_LABELS[ordinal as TaskType]).toBe(label)
    }
    expect(TASK_TYPES).toHaveLength(TASK_TYPE_SNAPSHOT.length)
  })

  it('只许往后追加：保持 List<TaskType> 的顺序即为序号顺序', () => {
    TASK_TYPES.forEach((value, index) => {
      expect(value).toBe(index)
    })
  })
})

describe('三维分流映射（DEC-06）', () => {
  it('每个 TaskType 都有归属，且只有 three / unity 两类三维栈', () => {
    for (const taskType of TASK_TYPES) {
      const stack = resolveViewerStack(taskType)
      expect([ViewerStack.Three, ViewerStack.Unity]).toContain(stack)
    }
    expect(Object.keys(TASK_TYPE_STACK)).toHaveLength(TASK_TYPES.length)
  })

  it('按 DEC-06 口径划分：three = None/Purpose/Equipment/Principle/Test/Info/Exam', () => {
    const three = TASK_TYPES.filter((t) => resolveViewerStack(t) === ViewerStack.Three)
    expect(three).toEqual([
      TaskType.None,
      TaskType.Purpose,
      TaskType.Equipment,
      TaskType.Principle,
      TaskType.Test,
      TaskType.Info,
      TaskType.Exam,
    ])
  })

  it('按 DEC-06 口径划分：unity = LineConnection/Training/Structure/Inspection', () => {
    const unity = TASK_TYPES.filter((t) => resolveViewerStack(t) === ViewerStack.Unity)
    expect(unity).toEqual([
      TaskType.LineConnection,
      TaskType.Training,
      TaskType.Structure,
      TaskType.Inspection,
    ])
  })
})
