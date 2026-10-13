/**
 * 被采纳内容数据（`content/data/*.json`）→ 页面用的内容模型。
 *
 * 数据来自既有实训软件的导出（8 个器件 + 1 个小测验，见 `docs/research/09`），我们**原样采纳**，
 * 所以本文件是"适配层"而不是"模型定义"：数据什么形状，这里就按什么形状读，踩到的坑都写在注释里。
 *
 * 三条纪律：
 *   1. **纯函数**：不碰网络、不碰 Vue —— 形状与坑都能用单测锁住（`adopted-content.spec.ts`）；
 *   2. **防御式读取**：输入是外部 JSON，一律按 `unknown` 处理；**读不懂的字段就当没有**，
 *      不抛异常、不整体失败 —— 内容侧改一个字段不该让页面白屏；
 *   3. **契约优先**：`TaskType` 的顺序与标签以契约为准（本站点线、分流都靠它），
 *      内容里的 `displayName` 只作为"该任务页的标题"。
 *
 * ⚠️ 已知的形状陷阱（都有单测）：
 *   · 每个 clip 的 10 个 `taskXxxData` 槽位**未启用时是 `null`**（不是空对象），必须当"未启用"处理；
 *   · 题库里 8 道考核题**没有 `usage` 字段** —— C# 序列化省略默认值（`0 = Exam`），
 *     "缺字段"必须解释成 `Exam`，否则一多半题会被静默丢掉；
 *   · `questionType` / `usage` 在 JSON 里是**名字**（`"SingleChoice"` / `"Step"`），不是序号。
 */
import { QuestionType, QuestionUsage, TASK_TYPES, TaskType } from '@/contracts'

// ---------------------------------------------------------------------------
// 页面用的内容模型（视图只认这个，不直接读原始 JSON）
// ---------------------------------------------------------------------------

/** 结构化正文（原理槽位是一条条 `principleStructs`）。 */
export interface ContentSection {
  title: string
  text: string
  videoName?: string
}

export interface ContentQuestionOption {
  text: string
  correct: boolean
}

export interface ContentQuestion {
  id: string
  /** 题干 */
  text: string
  /** 题型（契约枚举；读不懂时为 `None`，页面据此显示"题型不支持"） */
  type: QuestionType
  /** 用途：考核池 / 步骤内（契约 DEC-83） */
  usage: QuestionUsage
  options: ContentQuestionOption[]
}

/** 一个任务在**某个项目**里的内容。 */
export interface ContentTask {
  taskType: TaskType
  /** 内容里的显示名（例：Inspection 槽位在数据里叫"测量"，契约标签是"故障检测"—— 两者都保留） */
  title?: string
  paragraphs: string[]
  sections: ContentSection[]
  /** 三维资源引用（本层只透传，不做任何加载） */
  prefabKey?: string
  imageKey?: string
  images: string[]
  videoName?: string
  questions: ContentQuestion[]
}

export interface ContentProject {
  id: string
  title: string
  summary: string
  /**
   * 预计用时（分钟）。**采纳数据里没有这个字段** —— 有就显示，没有页面就不显示，
   * 不编造（编一个假的时间比不显示更糟）。
   */
  minutes?: number
  tasks: ContentTask[]
}

/** 菜单项（`MenuData.clips[]`）：点它进哪个项目。 */
export interface ContentMenuItem {
  id: string
  title: string
  /** 指向 `ProjectData.clips[].id`（例 `menu_contactor` → `clip_contactor`） */
  projectId: string
}

// ---------------------------------------------------------------------------
// 字段映射
// ---------------------------------------------------------------------------

/** `TaskType` → 被采纳数据里的槽位字段名。一一对应，**顺序按契约**。 */
export const TASK_SLOT_FIELD: Readonly<Record<TaskType, string>> = {
  [TaskType.None]: '',
  [TaskType.Purpose]: 'taskPurposeData',
  [TaskType.Equipment]: 'taskEquipmentData',
  [TaskType.Principle]: 'taskPrincipleData',
  [TaskType.LineConnection]: 'taskLineConnectionData',
  [TaskType.Training]: 'taskTrainingData',
  [TaskType.Test]: 'taskTestData',
  [TaskType.Info]: 'taskInfoData',
  [TaskType.Structure]: 'taskStructureData',
  [TaskType.Inspection]: 'taskInspectionData',
  [TaskType.Exam]: 'taskExamData',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

/** 非空字符串才算数（数据里大量 `""` 表示"没填"，和 `null` 一样当没有）。 */
function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function optionalText(value: unknown): string | undefined {
  const value2 = text(value)
  return value2 === '' ? undefined : value2
}

// ---------------------------------------------------------------------------
// 枚举：JSON 里是**名字**，要按名字反查序号
// ---------------------------------------------------------------------------

/**
 * `"SingleChoice"` → `QuestionType.SingleChoice`。
 * 读不懂（新题型 / 拼错 / 是数字）时返回 `None`，由页面显示"题型不支持"，**不猜**。
 */
export function questionTypeOf(value: unknown): QuestionType {
  if (typeof value !== 'string') return QuestionType.None
  const ordinal = (QuestionType as unknown as Record<string, unknown>)[value]
  return typeof ordinal === 'number' ? (ordinal as QuestionType) : QuestionType.None
}

/**
 * 题目的用途。**缺字段 = Exam**（C# 序列化省略默认值 0），这条丢了会静默丢题。
 */
export function questionUsageOf(value: unknown): QuestionUsage {
  if (typeof value === 'number') {
    return value === QuestionUsage.Step ? QuestionUsage.Step : QuestionUsage.Exam
  }
  if (typeof value !== 'string') return QuestionUsage.Exam
  const ordinal = (QuestionUsage as unknown as Record<string, unknown>)[value]
  return ordinal === QuestionUsage.Step ? QuestionUsage.Step : QuestionUsage.Exam
}

// ---------------------------------------------------------------------------
// 映射：原始 JSON → 内容模型
// ---------------------------------------------------------------------------

export function toContentQuestion(raw: unknown, fallbackId = ''): ContentQuestion | null {
  if (!isRecord(raw)) return null
  const text2 = text(raw.questionText)
  if (text2 === '') return null
  return {
    id: text(raw.id) || fallbackId,
    text: text2,
    type: questionTypeOf(raw.questionType),
    usage: questionUsageOf(raw.usage),
    options: asArray(raw.options).flatMap((option) => {
      if (!isRecord(option)) return []
      const optionText = text(option.itemText)
      return optionText === '' ? [] : [{ text: optionText, correct: option.isCorrect === true }]
    }),
  }
}

/** 收集题目：`taskExamData.questionClips[].questions[]`（当前数据只有一组，多组时按数据顺序合并）。 */
function collectQuestions(slot: Record<string, unknown>): ContentQuestion[] {
  const groups = asArray(slot.questionClips)
  const sources =
    groups.length > 0
      ? groups.flatMap((group) => asArray(isRecord(group) ? group.questions : []))
      : asArray(slot.questions)
  return sources.flatMap((raw, index) => {
    const question = toContentQuestion(raw, `q${index + 1}`)
    return question ? [question] : []
  })
}

/** 单个槽位 → 任务；槽位为 `null` / `taskActive=false` / 读不懂 ⇒ `null`（= 该项目未启用该任务）。 */
export function toContentTask(taskType: TaskType, slot: unknown): ContentTask | null {
  if (!isRecord(slot)) return null
  if (slot.taskActive === false) return null

  const paragraphs = [text(slot.contentText)].filter((line) => line !== '')
  const sections: ContentSection[] = asArray(slot.principleStructs).flatMap((item) => {
    if (!isRecord(item)) return []
    const body = text(item.contentText)
    const title = text(item.title)
    if (body === '' && title === '') return []
    return [{ title, text: body, videoName: optionalText(item.videoName) }]
  })
  const sectionVideos = sections
    .map((section) => section.videoName)
    .filter((name): name is string => Boolean(name))

  return {
    taskType,
    title: optionalText(slot.displayName),
    paragraphs,
    sections,
    prefabKey: optionalText(slot.prefabKey),
    imageKey: optionalText(slot.imageKey),
    images: asArray(slot.images)
      .map(text)
      .filter((key) => key !== ''),
    videoName: optionalText(slot.videoName) ?? sectionVideos[0],
    questions: collectQuestions(slot),
  }
}

/** 单个 clip → 项目。任务按**契约顺序**排列，只含启用的槽位。 */
export function toContentProject(clip: unknown): ContentProject | null {
  if (!isRecord(clip)) return null
  const id = text(clip.id)
  if (id === '') return null

  const tasks = TASK_TYPES.flatMap((taskType) => {
    // TaskType.None 没有对应槽位（空串键），读出来必然是 undefined ⇒ 天然被跳过
    const slot = clip[TASK_SLOT_FIELD[taskType]]
    const task = toContentTask(taskType, slot)
    return task ? [task] : []
  })

  return {
    id,
    title: text(clip.displayName) || id,
    summary: text(clip.description),
    tasks,
  }
}

/** 从一份 `ProjectData.json` 里按 id 取项目。 */
export function findProject(clips: unknown, projectId: string): ContentProject | null {
  for (const clip of asArray(clips)) {
    if (isRecord(clip) && text(clip.id) === projectId) return toContentProject(clip)
  }
  return null
}

/** 菜单项。`projectId` 缺失时用 `id` 兜底（数据不全是常态，页面不该因此消失）。 */
export function toContentMenuItem(raw: unknown): ContentMenuItem | null {
  if (!isRecord(raw)) return null
  const id = text(raw.id)
  const title = text(raw.displayName)
  if (id === '' && title === '') return null
  return { id: id || title, title: title || id, projectId: text(raw.projectId) || id }
}

export function toContentMenu(raw: unknown): ContentMenuItem[] {
  const clips = isRecord(raw) ? asArray(raw.clips) : asArray(raw)
  return clips.flatMap((item) => {
    const menuItem = toContentMenuItem(item)
    return menuItem ? [menuItem] : []
  })
}

/** 题库（`QuestionData.questions[]`）。 */
export function toQuestionBank(raw: unknown): ContentQuestion[] {
  const questions = isRecord(raw) ? asArray(raw.questions) : asArray(raw)
  return questions.flatMap((item, index) => {
    const question = toContentQuestion(item, `bank_${index + 1}`)
    return question ? [question] : []
  })
}

/** 项目里启用的任务类型（按契约顺序）—— 站点线、上下页、进度都按它走。 */
export function enabledTaskTypesOf(project: ContentProject | null): TaskType[] {
  return project ? project.tasks.map((task) => task.taskType) : []
}
