/**
 * 内容层（项目 / 任务 / 题目）。
 *
 * **数据源**：`content/data/*.json` —— 由既有实训软件导出的数据**原样采纳**（见 `docs/research/09`）：
 *   · `MenuData.json`    菜单（9 项：8 个器件 + 小测验），每项指向一个 `ProjectData` 里的 clip；
 *   · `ProjectData.json` 9 个 clip，每个 clip 有 10 个 `taskXxxData` 槽位（未启用为 `null`）；
 *   · `QuestionData.json` 题库（考核题 + 步骤内题，靠 `usage` 区分，DEC-83）。
 * 形状与坑都在**适配层** `domain/adopted-content.ts` 里（纯函数、有单测）；本文件只管"取哪份、缓存、兜底"。
 *
 * **兜底**：内容数据缺失时用 `content/projects/demo-temperature.json`（同形状的迷你内容包，
 * 走**同一条**适配路径）—— 保证"数据没到位"时页面仍然可跑通而不是白屏（DEC-21 本期无后端）。
 *
 * **为什么一次读全**：`ProjectData.json` 30 KB，9 个项目的任务清单是菜单页要显示的（"这个器件有几站"），
 * 与其为每个项目发一次请求，不如一次读完缓存住 —— 内容整体重发、不做增量（DEC-23）。
 *
 * **不做的事**：不加载三维资源（只透传 `prefabKey` / `imageKey`，由各自的加载器按需取）。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { QuestionUsage, TaskType } from '@/contracts'
import { labelOf, metaOf } from '@/domain/registry'
import {
  toContentMenu,
  toContentProject,
  toQuestionBank,
  type ContentMenuItem,
  type ContentProject,
  type ContentQuestion,
  type ContentSection,
  type ContentTask,
} from '@/domain/adopted-content'
import { EMPTY_STEP_CONTENT, toStepContentIndex, type StepContentIndex } from '@/domain/step-content'

export type { ContentMenuItem, ContentProject, ContentQuestion, ContentSection, ContentTask }
export type { StepContentIndex }

/** 兜底演示内容的 id（同时也是 `content/projects/` 下的文件名）。 */
export const DEMO_PROJECT_ID = 'demo-temperature'

const DATA_DIR = 'content/data/'
const FALLBACK_PATH = `content/projects/${DEMO_PROJECT_ID}.json`

type Source = 'builtin' | 'data' | 'fallback'

async function fetchJson(path: string): Promise<unknown> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}${path}`)
    if (!response.ok) return null
    return (await response.json()) as unknown
  } catch {
    // 网络 / 解析失败都按"这份数据没有"处理：内容层不该让页面白屏
    return null
  }
}

function clipsOf(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object' && 'clips' in raw) {
    const clips = (raw as { clips: unknown }).clips
    return Array.isArray(clips) ? clips : []
  }
  return []
}

export const useContentStore = defineStore('content', () => {
  const menu = ref<ContentMenuItem[]>([])
  /** 全部项目（与菜单同源，供菜单页显示"每个项目有哪几站"） */
  const projects = ref<ContentProject[]>([])
  /** 当前项目（任务页在用的那个） */
  const project = ref<ContentProject | null>(null)
  const bank = ref<ContentQuestion[]>([])
  /**
   * 步骤内容（`StepContentData.json`）的两份索引：`ui:request` 要显示的提示条与信息面板。
   *
   * 为什么也放内容层：它和题库一样是"被采纳的内容数据"，只是**由步骤系统按 id 点名取用**
   * （`tipsKey` / `uiId`），而不是由任务页整体渲染。
   */
  const stepContent = ref<StepContentIndex>(EMPTY_STEP_CONTENT)
  let stepContentLoaded = false
  const source = ref<Source>('builtin')
  const loading = ref(false)
  /** 目录级错误（内容数据本身读不到）—— 菜单页显示 */
  const error = ref<string | null>(null)
  /** 项目级错误（链接里的项目 id 在数据里不存在）—— 任务页显示，目录不受影响 */
  const projectError = ref<string | null>(null)

  function projectOf(id: string): ContentProject | null {
    return projects.value.find((item) => item.id === id) ?? null
  }

  /** 项目里启用的任务（按站点线呈现顺序，DEC-148）—— 站点线、上一/下一站、进度都按它走。 */
  function enabledTypesOf(id?: string): TaskType[] {
    const target = id ? projectOf(id) : project.value
    return target ? target.tasks.map((task) => task.taskType) : []
  }

  function taskOf(taskType: TaskType): ContentTask | undefined {
    return project.value?.tasks.find((task) => task.taskType === taskType)
  }

  /** 任务页标题：优先内容里的显示名，其次契约标签（契约是权威，内容只负责呈现）。 */
  function titleOf(taskType: TaskType): string {
    return taskOf(taskType)?.title ?? labelOf(taskType)
  }

  function hintOf(taskType: TaskType): string {
    return metaOf(taskType).hint
  }

  /**
   * 该任务要显示的题目：
   *   · 项目自己的题组（`taskExamData.questionClips`）优先；
   *   · 考核（`TaskType.Exam`）没有自备题组时，用题库里 `usage = Exam` 的题；
   *   · 其余任务没有题就是没有 —— 不拿题库硬凑。
   */
  function questionsOf(taskType: TaskType): ContentQuestion[] {
    const own = taskOf(taskType)?.questions ?? []
    if (own.length > 0) return own
    if (taskType === TaskType.Exam) return bank.value.filter((item) => item.usage === QuestionUsage.Exam)
    return []
  }

  /** 读兜底演示项目（同形状、走同一条适配路径）；读不到返回 null。 */
  async function readDemoProject(): Promise<ContentProject | null> {
    return toContentProject(clipsOf(await fetchJson(FALLBACK_PATH))[0])
  }

  /**
   * 目录整体兜底：内容数据没有/读不到时，用兜底项目当**目录**。
   * ⚠️ 只有在"目录本身不可用"时才允许动 `menu` / `projects` ——
   * 仅仅某个项目找不到时不能走这里，否则会把整个目录换成兜底（页面是 SPA，状态会一直留着）。
   */
  async function useFallbackCatalog(): Promise<void> {
    const demo = await readDemoProject()
    projects.value = demo ? [demo] : []
    menu.value = demo ? [{ id: demo.id, title: demo.title, projectId: demo.id }] : []
    project.value = demo
    source.value = 'fallback'
    error.value = demo ? null : '内容数据与兜底内容都读不到'
  }

  /** 读菜单 + 全部项目（幂等）。数据缺失时降级到兜底，**不报错**（内容可能尚未随包发布）。 */
  async function ensureCatalog(): Promise<void> {
    if (source.value !== 'builtin' || loading.value) return
    loading.value = true
    try {
      const items = toContentMenu(await fetchJson(`${DATA_DIR}MenuData.json`))
      const mapped = clipsOf(await fetchJson(`${DATA_DIR}ProjectData.json`)).flatMap((clip) => {
        const item = toContentProject(clip)
        return item ? [item] : []
      })
      if (items.length === 0 || mapped.length === 0) {
        await useFallbackCatalog()
        return
      }
      menu.value = items
      projects.value = mapped
      source.value = 'data'
    } finally {
      loading.value = false
    }
  }

  /**
   * 选中项目（幂等，可反复调用）。`id` 缺省时用菜单第一项 ——
   * 这样"直接打开 `#/task/2`"（URL 里没有项目）也能落到一个**真实**项目上。
   */
  async function ensureProject(id?: string): Promise<ContentProject | null> {
    await ensureCatalog()
    const wanted = id ?? menu.value[0]?.projectId ?? ''
    if (project.value && (wanted === '' || project.value.id === wanted)) return project.value

    const found = wanted === '' ? null : projectOf(wanted)
    if (found) {
      project.value = found
      projectError.value = null
      return found
    }
    if (wanted !== '') {
      // 坏链接 / 内容重发改了 id：**只**把当前项目换成兜底，目录照旧（页面是 SPA，别留脏状态）
      projectError.value = `找不到项目 ${wanted} —— 当前显示的是兜底演示内容`
      project.value = await readDemoProject()
    } else if (!project.value) {
      await useFallbackCatalog()
    }
    return project.value
  }

  /** 读题库（幂等）。 */
  async function loadBank(): Promise<ContentQuestion[]> {
    if (bank.value.length > 0) return bank.value
    bank.value = toQuestionBank(await fetchJson(`${DATA_DIR}QuestionData.json`))
    return bank.value
  }

  /** 按 id 取一道题（步骤里的答题面板用；查不到返回 `undefined`，不拿别的题凑）。 */
  function questionOf(id: string): ContentQuestion | undefined {
    return id === '' ? undefined : bank.value.find((item) => item.id === id)
  }

  /**
   * 读步骤内容（幂等）。
   *
   * 用**独立的加载标志**而不是"索引非空"判断：数据缺失时索引本来就是空的，
   * 靠非空判断会每次调用都重新 fetch 一遍（而且看起来像"数据一直没到"）。
   */
  async function loadStepContent(): Promise<StepContentIndex> {
    if (stepContentLoaded) return stepContent.value
    stepContent.value = toStepContentIndex(await fetchJson(`${DATA_DIR}StepContentData.json`))
    stepContentLoaded = true
    return stepContent.value
  }

  return {
    menu,
    projects,
    project,
    bank,
    stepContent,
    source,
    loading,
    error,
    projectError,
    projectOf,
    enabledTypesOf,
    taskOf,
    titleOf,
    hintOf,
    questionsOf,
    ensureCatalog,
    ensureProject,
    loadBank,
    questionOf,
    loadStepContent,
  }
})
