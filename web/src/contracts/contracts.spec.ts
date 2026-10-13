import { describe, expect, it } from 'vitest'
import {
  BRIDGE_MESSAGE_TYPES,
  BRIDGE_MESSAGES_FROM_UNITY,
  BRIDGE_MESSAGES_FROM_WEB,
  QuestionType,
  QuestionUsage,
  QUESTION_TYPE_LABELS,
  QUESTION_USAGE_LABELS,
  QUESTION_TYPES,
  QUESTION_USAGES,
  SceneState,
  SCENE_STATE_LABELS,
  TASK_TYPE_LABELS,
  TASK_TYPE_STACK,
  TASK_TYPES,
  TaskType,
  ViewerStack,
  isBridgeMessageType,
  isMessageFromWeb,
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

describe('QuestionType / QuestionUsage 契约（DEC-83）', () => {
  const QUESTION_TYPE_SNAPSHOT: ReadonlyArray<[number, string, string]> = [
    [0, 'None', '空类型'],
    [1, 'SingleChoice', '单选'],
    [2, 'MultipleChoice', '多选'],
    [3, 'TrueFalse', '判断'],
    [4, 'FillInBlank', '填空'],
  ]

  it('序号、名字、中文标签逐值一致', () => {
    for (const [ordinal, name, label] of QUESTION_TYPE_SNAPSHOT) {
      expect(QuestionType[ordinal]).toBe(name)
      expect(QUESTION_TYPE_LABELS[ordinal as QuestionType]).toBe(label)
    }
    expect(QUESTION_TYPES).toHaveLength(QUESTION_TYPE_SNAPSHOT.length)
  })

  it('名字就是内容数据的取值：JSON 里写名字而不是序号（docs/design/08）', () => {
    // 采用既有内容数据的前提条件：这两组名字必须与数据里的字符串逐字一致
    expect(QuestionType[QuestionType.SingleChoice]).toBe('SingleChoice')
    expect(QuestionType[QuestionType.TrueFalse]).toBe('TrueFalse')
    expect(QuestionUsage[QuestionUsage.Exam]).toBe('Exam')
    expect(QuestionUsage[QuestionUsage.Step]).toBe('Step')
  })

  it('QuestionUsage 只有考核 / 步骤两类，中文标签逐值一致', () => {
    expect(QUESTION_USAGES).toEqual([QuestionUsage.Exam, QuestionUsage.Step])
    expect(QUESTION_USAGE_LABELS[QuestionUsage.Exam]).toBe('考核')
    expect(QUESTION_USAGE_LABELS[QuestionUsage.Step]).toBe('步骤')
  })
})

describe('桥消息类型契约（DEC-85）', () => {
  it('两个方向都非空，且并集无重复（新增只能往后追加）', () => {
    expect(BRIDGE_MESSAGES_FROM_WEB.length).toBeGreaterThan(0)
    expect(BRIDGE_MESSAGES_FROM_UNITY.length).toBeGreaterThan(0)
    expect(new Set(BRIDGE_MESSAGE_TYPES).size).toBe(BRIDGE_MESSAGE_TYPES.length)
    expect(BRIDGE_MESSAGE_TYPES).toHaveLength(
      BRIDGE_MESSAGES_FROM_WEB.length + BRIDGE_MESSAGES_FROM_UNITY.length,
    )
  })

  it('启动链上的关键消息都在（少一条就会静默不工作）', () => {
    for (const type of [
      'app:init',
      'preload:task',
      'preload:cancel',
      'scene:enter',
      'scene:exit',
      'input:enable',
      'runtime:resume',
      'unity:ready',
      'unity:progress',
      'assets:ready',
      'scene:ready',
      'scene:exited',
    ]) {
      expect(isBridgeMessageType(type)).toBe(true)
    }
  })

  it('方向判定与分组一致', () => {
    expect(isMessageFromWeb('app:init')).toBe(true)
    expect(isMessageFromWeb('scene:ready')).toBe(false)
    expect(isBridgeMessageType('scene:unknown')).toBe(false)
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
