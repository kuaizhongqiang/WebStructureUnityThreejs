/**
 * TaskType —— 双端共享契约（Web 侧），并且是**技术栈分流开关**。
 *
 * 契约来源（只读参考，勿改）：
 *   F:\Project\MCV_Module\packages\com.mcv.core\Runtime\Models\EnumAll.cs:389-415
 *
 * 纪律（docs/DECISIONS.md DEC-09 / DEC-06）：
 *   - 只许**往后追加**，不得插值、改序、改名；中文标签逐字保持；
 *   - 分流按 TaskType 一刀切（DEC-06），不允许"看着办"；
 *   - 破例必须走新决策。
 */

export const TASK_TYPE_CONTRACT_VERSION = 1

export enum TaskType {
  None = 0,
  Purpose = 1,
  Equipment = 2,
  Principle = 3,
  LineConnection = 4,
  Training = 5,
  Test = 6,
  Info = 7,
  Structure = 8,
  Inspection = 9,
  Exam = 10,
}

/** 中文标签，与 C# 侧 `[InspectorName]` 逐字一致。 */
export const TASK_TYPE_LABELS: Readonly<Record<TaskType, string>> = {
  [TaskType.None]: '空类型',
  [TaskType.Purpose]: '任务目的',
  [TaskType.Equipment]: '实验仪器',
  [TaskType.Principle]: '实验原理',
  [TaskType.LineConnection]: '电路连接',
  [TaskType.Training]: '仿真实验',
  [TaskType.Test]: '小测验',
  [TaskType.Info]: '简介',
  [TaskType.Structure]: '结构',
  [TaskType.Inspection]: '检测',
  [TaskType.Exam]: '考核',
}

export const TASK_TYPES: readonly TaskType[] = [
  TaskType.None,
  TaskType.Purpose,
  TaskType.Equipment,
  TaskType.Principle,
  TaskType.LineConnection,
  TaskType.Training,
  TaskType.Test,
  TaskType.Info,
  TaskType.Structure,
  TaskType.Inspection,
  TaskType.Exam,
]

/** 三维交互的技术栈归属（DEC-06）。 */
export enum ViewerStack {
  /** 简单三维：裸 three，同页 DOM 内渲染。 */
  Three = 'three',
  /** 复杂三维：Unity WebGL 同页挂载，经 .jslib 桥通信（DEC-07/DEC-12）。 */
  Unity = 'unity',
  /** 无三维：纯页面（文本 / 表单 / 题目）。 */
  None = 'none',
}

/** `TaskType` → 技术栈。这是 DEC-06 的唯一落点，别处不得再判断。 */
export const TASK_TYPE_STACK: Readonly<Record<TaskType, ViewerStack>> = {
  [TaskType.None]: ViewerStack.Three,
  [TaskType.Purpose]: ViewerStack.Three,
  [TaskType.Equipment]: ViewerStack.Three,
  [TaskType.Principle]: ViewerStack.Three,
  [TaskType.Test]: ViewerStack.Three,
  [TaskType.Info]: ViewerStack.Three,
  [TaskType.Exam]: ViewerStack.Three,
  [TaskType.LineConnection]: ViewerStack.Unity,
  [TaskType.Training]: ViewerStack.Unity,
  [TaskType.Structure]: ViewerStack.Unity,
  [TaskType.Inspection]: ViewerStack.Unity,
}

export function resolveViewerStack(taskType: TaskType): ViewerStack {
  return TASK_TYPE_STACK[taskType]
}

export function isTaskType(value: unknown): value is TaskType {
  return typeof value === 'number' && value in TASK_TYPE_LABELS
}
