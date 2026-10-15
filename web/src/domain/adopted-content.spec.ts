/**
 * 被采纳内容数据的适配层单测。
 *
 * 分两层：
 *   ① **形状与坑**（前半）：用精简夹具把"数据长什么样、哪里会踩雷"钉死；
 *   ② **真实数据的结构不变量**（后半）：直接读 `public/content/data/*.json`，断言
 *      "菜单指向的项目真的存在""题目题型都认得出"这类**结构性**事实。
 *      **故意不断言数量与文案** —— 内容会整体重发（DEC-23），数字变了不该让门禁红。
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { QuestionType, QuestionUsage, TASK_TYPES, TaskType } from '@/contracts'
import {
  enabledTaskTypesOf,
  questionTypeOf,
  questionUsageOf,
  TASK_PRESENTATION_ORDER,
  toContentMenu,
  toContentMenuItem,
  toContentProject,
  toContentTask,
  toQuestionBank,
  findProject,
} from './adopted-content'

const readData = (name: string): unknown =>
  JSON.parse(
    readFileSync(fileURLToPath(new URL(`../../public/content/data/${name}.json`, import.meta.url)), 'utf8'),
  )

/** 精简夹具：与真实 clip 同形（含 `null` 槽位、`taskActive:false`、内联题目组）。 */
const CLIP = {
  id: 'clip_demo',
  displayName: '接触器',
  description: '利用电磁吸力实现远距离、频繁接通与断开主电路的自动控制电器。',
  taskPurposeData: null,
  taskEquipmentData: null,
  taskPrincipleData: {
    id: 'p',
    displayName: '原理',
    taskActive: true,
    principleStructs: [{ title: '电磁吸力', contentText: '线圈通电产生吸力。', videoName: 'principle.mp4' }],
  },
  taskInfoData: {
    id: 'i',
    displayName: '简介',
    taskActive: true,
    contentText: '接触器是自动控制电器。',
    prefabKey: 'contactor_info_model',
    imageKey: 'contactor_info_image',
    images: ['contactor_info_01', 'contactor_info_02'],
  },
  taskStructureData: {
    id: 's',
    displayName: '结构',
    taskActive: false,
    prefabKey: 'contactor_structure_model',
  },
  taskExamData: {
    id: 'e',
    displayName: '小测验',
    taskActive: true,
    questionClips: [
      {
        id: 'g',
        displayName: '小测验',
        questions: [
          {
            id: 'q1',
            questionText: '用于远距离、频繁接通和断开主电路的电器是？',
            questionType: 'SingleChoice',
            options: [
              { itemText: '接触器', isCorrect: true },
              { itemText: '熔断器', isCorrect: false },
            ],
          },
        ],
      },
    ],
  },
}

describe('TaskType ↔ 槽位', () => {
  it('未启用（null）与 taskActive:false 的槽位不产生任务', () => {
    const project = toContentProject(CLIP)
    const types = project?.tasks.map((task) => task.taskType)
    // 呈现顺序（DEC-148），且 Purpose/Equipment（null）与 Structure（taskActive:false）都不在
    expect(types).toEqual([TaskType.Info, TaskType.Principle, TaskType.Exam])
  })

  it('任务顺序按**呈现顺序**（来源工程装配顺序，DEC-148）而不是数据里的字段顺序（站点线靠它）', () => {
    // 夹具里 JSON 字段顺序会把 Principle 排在 Info 前（字段声明序），
    // 但来源工程装配顺序是简介(Info)在前、原理(Principle)在后
    const project = toContentProject({ ...CLIP, taskStructureData: null })
    const types = project?.tasks.map((task) => task.taskType) ?? []
    expect(types.indexOf(TaskType.Info)).toBeLessThan(types.indexOf(TaskType.Principle))
  })

  it('呈现顺序是契约槽位的**排列**（不多不少，None 不在其中）—— 防"加了新任务忘了排进站点线"', () => {
    const slots = TASK_TYPES.filter((type) => type !== TaskType.None)
    expect([...TASK_PRESENTATION_ORDER].sort((a, b) => a - b)).toEqual([...slots].sort((a, b) => a - b))
    // 且开头就是来源工程装配顺序的四步：简介 → 结构 → 原理 → 检测
    expect(TASK_PRESENTATION_ORDER.slice(0, 4)).toEqual([
      TaskType.Info,
      TaskType.Structure,
      TaskType.Principle,
      TaskType.Inspection,
    ])
  })

  it('站点线的两个前置条件：项目为空 ⇒ 无站可画（整条不渲染），有项目 ⇒ 只给启用的站（DEC-100）', () => {
    // 内容没到位 / 兜底项目也读不到时 `project` 为 null ⇒ 空数组 ⇒ 站点线不渲染
    expect(enabledTaskTypesOf(null)).toEqual([])
    // 有项目时给的就是"启用的任务"（未启用与 taskActive:false 的都不在），顺序按呈现顺序
    expect(enabledTaskTypesOf(toContentProject(CLIP))).toEqual([
      TaskType.Info,
      TaskType.Principle,
      TaskType.Exam,
    ])
  })

  it('正文、资源引用、图片按槽位取到（Inspection 这类纯三维槽位没有正文也不报错）', () => {
    const project = toContentProject(CLIP)
    const info = project?.tasks.find((task) => task.taskType === TaskType.Info)
    expect(info?.paragraphs).toEqual(['接触器是自动控制电器。'])
    expect(info?.prefabKey).toBe('contactor_info_model')
    expect(info?.images).toEqual(['contactor_info_01', 'contactor_info_02'])

    const principle = project?.tasks.find((task) => task.taskType === TaskType.Principle)
    expect(principle?.sections).toHaveLength(1)
    expect(principle?.sections[0]?.title).toBe('电磁吸力')
    expect(principle?.videoName).toBe('principle.mp4')
    expect(principle?.paragraphs).toEqual([])

    const bare = toContentTask(TaskType.Inspection, { id: 'x', displayName: '测量', taskActive: true })
    expect(bare).toMatchObject({ taskType: TaskType.Inspection, paragraphs: [], sections: [], questions: [] })
  })
})

describe('题目的两个静默陷阱', () => {
  it('缺 usage 字段 ⇒ 考核题（C# 序列化省略默认值 0），否则会静默丢掉大半题库', () => {
    expect(questionUsageOf(undefined)).toBe(QuestionUsage.Exam)
    expect(questionUsageOf(null)).toBe(QuestionUsage.Exam)
    expect(questionUsageOf('Exam')).toBe(QuestionUsage.Exam)
    expect(questionUsageOf(QuestionUsage.Exam)).toBe(QuestionUsage.Exam)
  })

  it('usage 是名字或序号都能认（"Step" 与 1 等价）', () => {
    expect(questionUsageOf('Step')).toBe(QuestionUsage.Step)
    expect(questionUsageOf(QuestionUsage.Step)).toBe(QuestionUsage.Step)
  })

  it('questionType 是名字，不是序号；认不出就叫 None（页面显示"题型不支持"，不猜）', () => {
    expect(questionTypeOf('SingleChoice')).toBe(QuestionType.SingleChoice)
    expect(questionTypeOf('TrueFalse')).toBe(QuestionType.TrueFalse)
    expect(questionTypeOf('Sorting')).toBe(QuestionType.None)
    expect(questionTypeOf(2)).toBe(QuestionType.None)
  })

  it('题干为空、选项为空、输入不是对象：一律当作"没有这道题"，不抛异常', () => {
    expect(toContentTask(TaskType.Exam, { taskActive: true })).toMatchObject({ questions: [] })
    expect(toContentProject(null)).toBeNull()
    expect(toContentProject('nope')).toBeNull()
    expect(toContentProject({ displayName: '没有 id' })).toBeNull()
    expect(toContentMenu(undefined)).toEqual([])
    expect(toQuestionBank({ questions: null })).toEqual([])
  })

  it('项目自带的题组被收集（含选项与正确答案）', () => {
    const project = toContentProject(CLIP)
    const exam = project?.tasks.find((task) => task.taskType === TaskType.Exam)
    expect(exam?.questions).toHaveLength(1)
    expect(exam?.questions[0]?.type).toBe(QuestionType.SingleChoice)
    expect(exam?.questions[0]?.options.map((option) => option.correct)).toEqual([true, false])
  })
})

describe('菜单', () => {
  it('projectId 缺失时用 id 兜底（菜单项不该因为少一个字段就消失）', () => {
    expect(toContentMenuItem({ id: 'menu_a', displayName: 'A' })).toEqual({
      id: 'menu_a',
      title: 'A',
      projectId: 'menu_a',
    })
    expect(toContentMenuItem({ id: 'menu_a', displayName: 'A', projectId: 'clip_a' })?.projectId).toBe(
      'clip_a',
    )
    expect(toContentMenuItem({})).toBeNull()
  })
})

describe('真实数据的结构不变量（不是数量）', () => {
  const menu = toContentMenu(readData('MenuData'))
  const projects = readData('ProjectData') as { clips: unknown[] }
  const bank = toQuestionBank(readData('QuestionData'))

  it('菜单非空，且每项都指向一个真的存在的项目（死链是内容侧最容易犯的错）', () => {
    expect(menu.length).toBeGreaterThan(0)
    for (const item of menu) {
      expect(findProject(projects.clips, item.projectId), `菜单 ${item.id} 指向的项目不存在`).not.toBeNull()
    }
  })

  it('每个项目至少启用一个任务，且任务都属于契约里的 TaskType', () => {
    for (const clip of projects.clips) {
      const project = toContentProject(clip)
      expect(project, '每个 clip 都应能读出项目').not.toBeNull()
      expect(project?.tasks.length ?? 0).toBeGreaterThan(0)
      for (const task of project?.tasks ?? []) {
        expect(TaskType[task.taskType]).toBeTruthy()
      }
    }
  })

  it('题库里每道题的题型都认得（认不出说明契约少了一个值，要往契约里追加）', () => {
    expect(bank.length).toBeGreaterThan(0)
    for (const question of bank) {
      expect(question.type, `题目 ${question.id} 的题型认不出`).not.toBe(QuestionType.None)
      expect(question.options.length).toBeGreaterThan(0)
    }
  })

  it('题库里两种用途都存在（考核池与步骤内题靠 usage 区分，DEC-83）', () => {
    const usages = new Set(bank.map((question) => question.usage))
    expect(usages.has(QuestionUsage.Exam)).toBe(true)
    expect(usages.has(QuestionUsage.Step)).toBe(true)
  })
})
