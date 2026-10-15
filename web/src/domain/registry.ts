/**
 * TaskType 表现层登记表。
 *
 * 契约纪律（DEC-09 / DEC-10）：
 *   · **名字、序号、中文标签、技术栈**都在 `@/contracts`（手写双份 + 门禁比对），
 *     本文件**只补表现层**（图标、页面骨架类型、一句话说明），**不得**复制标签或改顺序；
 *   · 新增 TaskType 时先改契约（TS + C# + 基准快照同批），再在这里补表现层。
 *
 * 依据：`docs/design/01-tasktype-registry.md`（11 个 TaskType 的技术栈 / 页面骨架 / 移动端策略）。
 */
import { TaskType, TASK_TYPE_LABELS, TASK_TYPE_STACK, ViewerStack } from '@/contracts'

/** 页面骨架类型：决定任务页用哪种主体容器（不是"每个 TaskType 各写一页"）。 */
export type TaskPageKind =
  | 'article' // 一段正文（目的 / 原理 / 简介）
  | 'model' // 左三维 + 右图文（简介；DEC-98，与排版稿 C6 同构）
  | 'list' // 条目列表 + 三维展示（仪器 / 结构）
  | 'video' // 视频 + 播放列表（原理）
  | 'quiz' // 题目控件（小测验）
  | 'exam' // 考核（题目 + 计时 + 结算）
  | 'practice' // 仿真操作（Unity 承载）
  | 'structure' // 结构认知（Unity 承载）：左画布 + 右部件树（与排版稿 C10 同构，DEC-131）

export interface TaskTypeMeta {
  readonly type: TaskType
  /** lucide 图标名（产品侧用 lucide-vue-next；排版稿用同一套图标，见 icons.mjs） */
  readonly icon: string
  readonly kind: TaskPageKind
  /** 一句话说明，用于站点线 tooltip 与占位页 */
  readonly hint: string
}

const META: Readonly<Record<TaskType, Omit<TaskTypeMeta, 'type'>>> = {
  [TaskType.None]: { icon: 'circle-dashed', kind: 'article', hint: '未指定任务类型' },
  [TaskType.Purpose]: { icon: 'target', kind: 'article', hint: '任务目的与达成标准' },
  [TaskType.Equipment]: { icon: 'gauge', kind: 'list', hint: '仪器清单与三维展示' },
  [TaskType.Principle]: { icon: 'play', kind: 'video', hint: '原理讲解视频' },
  [TaskType.LineConnection]: { icon: 'cable', kind: 'practice', hint: '电路连接（Unity 承载）' },
  [TaskType.Training]: { icon: 'flask-conical', kind: 'practice', hint: '仿真实验（Unity 承载）' },
  [TaskType.Test]: { icon: 'list-checks', kind: 'quiz', hint: '小测验' },
  // DEC-98：简介页 = 左三维 + 右图文（排版稿 C6 的形态；三维由 ModelStage 承载）
  [TaskType.Info]: { icon: 'book-open', kind: 'model', hint: '实验简介与背景' },
  // DEC-131：结构页 = 左画布 + 右部件树（排版稿 C10 的形态；部件清单由 Unity 的 `scene:parts` 上报）
  [TaskType.Structure]: { icon: 'boxes', kind: 'structure', hint: '结构认知（Unity 承载）' },
  [TaskType.Inspection]: { icon: 'search-check', kind: 'practice', hint: '故障检测（Unity 承载）' },
  [TaskType.Exam]: { icon: 'clipboard-check', kind: 'exam', hint: '考核与结算' },
}

/** 按契约顺序导出（顺序即站点线顺序，不得自行排序）。 */
export const TASK_REGISTRY: readonly TaskTypeMeta[] = Object.values(TaskType)
  .filter((value): value is TaskType => typeof value === 'number')
  .map((type) => ({ type, ...META[type] }))

export function metaOf(type: TaskType): TaskTypeMeta {
  return { type, ...META[type] }
}

export function labelOf(type: TaskType): string {
  return TASK_TYPE_LABELS[type]
}

export function stackOf(type: TaskType): ViewerStack {
  return TASK_TYPE_STACK[type]
}

/** 该类型是否由 Unity 承载（决定任务页挂 Three 还是 Unity 视口）。 */
export function isUnityTask(type: TaskType): boolean {
  return TASK_TYPE_STACK[type] === ViewerStack.Unity
}
