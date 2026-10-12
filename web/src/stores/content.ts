/**
 * 内容层（项目 / 任务 / 步骤 / 题目）。
 *
 * 依据：
 *   · `docs/design/04-data-model.md` —— 七块数据模型（项目/任务/步骤/题目/进度/成绩/设置）；
 *   · DEC-23（内容**整体重发**，不做热更新）与 DEC-57（大资产不进 git）⇒ 内容与资源**物理分开**：
 *     内容 JSON 从 `content/` 读，三维资源由各自的加载器按需取（不在本文件里管）。
 *   · DEC-21（本期无后端）⇒ 只有静态 JSON；读不到就用内置演示数据兜底，**不报错、不白屏**。
 *
 * ⚠️ 阶段说明：本期 `content/` 里只有契约快照，没有项目内容，所以**实际走的是内置演示数据**。
 *    内容侧交付后，把 JSON 放进 `content/projects/`，本文件的加载路径即为最终形态。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { TaskType } from '@/contracts'
import { metaOf, labelOf } from '@/domain/registry'

export interface ContentStep {
  id: string
  text: string
  hint?: string
}

export interface ContentTask {
  taskType: TaskType
  title: string
  /** 正文段落（中文排版由设计系统的 .ui-article 负责缩进与段距） */
  paragraphs: string[]
  steps: ContentStep[]
}

export interface ContentProject {
  id: string
  title: string
  summary: string
  /** 预计用时（分钟） */
  minutes: number
  tasks: ContentTask[]
}

/** 内置演示项目：结构完整（可跑通站点线 + 任务页），内容待内容侧替换。 */
export const DEMO_PROJECT: ContentProject = {
  id: 'demo-temperature',
  title: '温度传感器特性测量',
  summary: '以温度传感器为对象，覆盖「认识仪器 → 理解原理 → 接线 → 仿真操作 → 测验考核」的完整链路。',
  minutes: 45,
  tasks: [
    {
      taskType: TaskType.Purpose,
      title: '任务目的',
      paragraphs: [
        '本实验以温度传感器为对象，通过测量其在不同温度下的输出，理解测温原理与温度—电压的对应关系，并掌握万用表的正确使用方法与数据记录规范。',
        '实验前请先确认仪器完好、连线无破损；测量时注意量程档位与被测物理量一致。若读数长时间不稳定，请检查接线是否松动，并确认加热台温度已稳定后再记录数据。',
      ],
      steps: [
        { id: 'p1', text: '确认实验台通电、仪器归位' },
        { id: 'p2', text: '记录当前室温作为基准点' },
      ],
    },
    {
      taskType: TaskType.Equipment,
      title: '实验仪器',
      paragraphs: [
        '本任务需要以下仪器：数字万用表、直流稳压电源、温度传感器、加热台与连接线。',
        '所有仪器均以三维模型展示，可旋转查看接口位置；点击条目可高亮对应模型。',
      ],
      steps: [
        { id: 'e1', text: '认识万用表的档位与插孔' },
        { id: 'e2', text: '确认电源输出电压范围' },
      ],
    },
  ],
}

export const useContentStore = defineStore('content', () => {
  const project = ref<ContentProject>(DEMO_PROJECT)
  const source = ref<'builtin' | 'json'>('builtin')
  const loading = ref(false)
  const error = ref<string | null>(null)

  /** 任务标题：优先用内容里的标题，其次用契约标签（契约是权威，内容只是呈现）。 */
  function taskOf(taskType: TaskType): ContentTask | undefined {
    return project.value.tasks.find((task) => task.taskType === taskType)
  }

  function titleOf(taskType: TaskType): string {
    return taskOf(taskType)?.title ?? labelOf(taskType)
  }

  function hintOf(taskType: TaskType): string {
    return metaOf(taskType).hint
  }

  /**
   * 尝试从 `content/projects/<id>.json` 载入；不存在则保持内置演示数据。
   * 部署形态（DEC-22：先本地静态服务器验证）下，`content/` 会随产物一起发布。
   */
  async function load(id = DEMO_PROJECT.id): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}content/projects/${id}.json`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = (await response.json()) as ContentProject
      if (!data?.tasks?.length) throw new Error('内容为空')
      project.value = data
      source.value = 'json'
    } catch (cause) {
      // 内容未交付是**正常状态**（本阶段），只降级不报错
      source.value = 'builtin'
      error.value = cause instanceof Error ? cause.message : String(cause)
    } finally {
      loading.value = false
    }
  }

  return { project, source, loading, error, taskOf, titleOf, hintOf, load }
})
