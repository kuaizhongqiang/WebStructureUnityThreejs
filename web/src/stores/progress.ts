/**
 * 进度与成绩（DEC-54：游客模式只在本机存**一个 JSON**）。
 *
 * 结构纪律（DEC-04 / §11.1）：**结构一次做全，功能先只实现"游客"这一种**——
 * 字段可以在界面上不出现，但结构里必须有位置，将来接后端（DEC-24）不用改结构。
 * 因此这里保留 `userType`、`attempts` 等当期用不到的字段，**不要**因为"现在没登录"就删。
 *
 * 存储：`localStorage` 单键 `wsu3.progress`。不做网络层（DEC-21：本期无后端）。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { TaskType, TASK_TYPES } from '@/contracts'

export type CompletionStatus = 'unfinished' | 'completed'
export type UserType = 'unknown' | 'student' | 'teacher' | 'admin'

export interface TaskProgress {
  status: CompletionStatus
  /** 该任务得分（0~100），未评分时为 null —— 结构预留 */
  score: number | null
  updatedAt: string
}

export interface ProgressFile {
  version: 1
  /** 角色：当期只有 guest（DEC-04）；结构上预留四类 */
  user: { type: UserType; name: string }
  tasks: Record<string, TaskProgress>
  /** 成绩记录（结构预留：多次作答/多次考核都要能存） */
  attempts: Array<{ taskType: number; score: number; at: string }>
  settings: {
    quality: 'low' | 'high' | 'ultra'
    theme: 'dark' | 'light'
    /** A4：用户是否已主动选过画质（false = 首启，根组件挂出画质设置弹窗） */
    qualityChosen: boolean
  }
}

const STORAGE_KEY = 'wsu3.progress'

function emptyFile(): ProgressFile {
  const tasks: Record<string, TaskProgress> = {}
  for (const type of TASK_TYPES) {
    tasks[String(type)] = { status: 'unfinished', score: null, updatedAt: '' }
  }
  return {
    version: 1,
    user: { type: 'unknown', name: '' }, // 当期以游客进入，进入后再置 student（DEC-04 不拦游客）
    tasks,
    attempts: [],
    settings: { quality: 'high', theme: 'dark', qualityChosen: false },
  }
}

/** 读盘并做最小结构校验：坏数据一律回退到空档案（宁可丢进度也不能白屏）。 */
function load(): ProgressFile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyFile()
    const parsed = JSON.parse(raw) as Partial<ProgressFile>
    if (parsed.version !== 1 || typeof parsed.tasks !== 'object') return emptyFile()
    return { ...emptyFile(), ...parsed, settings: { ...emptyFile().settings, ...parsed.settings } }
  } catch {
    return emptyFile()
  }
}

export const useProgressStore = defineStore('progress', () => {
  const file = ref<ProgressFile>(load())

  function persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(file.value))
    } catch {
      /* 隐私模式 / 配额满：进度不落盘不影响使用（DEC-54 允许） */
    }
  }

  const completedCount = computed(
    () => TASK_TYPES.filter((type) => file.value.tasks[String(type)]?.status === 'completed').length,
  )
  const total = computed(() => TASK_TYPES.length)
  const percent = computed(() => Math.round((completedCount.value / total.value) * 100))

  const statusOf = (type: TaskType): CompletionStatus =>
    file.value.tasks[String(type)]?.status ?? 'unfinished'

  /** 本机设置（画质 / 主题 / 是否已选过画质）—— 视图只读这里，不挖 `file`。 */
  const settings = computed(() => file.value.settings)

  const scoreOf = (type: TaskType): number | null => file.value.tasks[String(type)]?.score ?? null

  function complete(type: TaskType, score: number | null = null): void {
    file.value.tasks[String(type)] = { status: 'completed', score, updatedAt: new Date().toISOString() }
    if (score !== null) file.value.attempts.push({ taskType: type, score, at: new Date().toISOString() })
    persist()
  }

  function reset(): void {
    file.value = emptyFile()
    persist()
  }

  function setQuality(quality: ProgressFile['settings']['quality']): void {
    file.value.settings.quality = quality
    persist()
  }

  /** A4：用户在画质设置弹窗里主动选档（写档位 + 记"已选过"，首启弹窗不再出现）。 */
  function chooseQuality(quality: ProgressFile['settings']['quality']): void {
    file.value.settings.quality = quality
    file.value.settings.qualityChosen = true
    persist()
  }

  function setTheme(theme: ProgressFile['settings']['theme']): void {
    file.value.settings.theme = theme
    persist()
  }

  return {
    file,
    settings,
    completedCount,
    total,
    percent,
    statusOf,
    scoreOf,
    complete,
    reset,
    setQuality,
    chooseQuality,
    setTheme,
    persist,
  }
})
