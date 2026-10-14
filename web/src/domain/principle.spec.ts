/**
 * 原理页纯逻辑单测（DEC-99）。
 *
 * 重点不是"函数能跑"，而是**把"列表什么时候出现"这条规则钉住**：
 * 采纳数据里 8 个项目全是单段视频，"多段"那条分支在页面上永远走不到，
 * 没有单测就等于没有实现。
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { TaskType } from '@/contracts'
import { toContentProject } from './adopted-content'
import type { ContentSection, ContentTask } from './adopted-content'
import { showsPlaylist, videoNameAt, videoSectionsOf } from './principle'

function section(title: string, videoName?: string): ContentSection {
  return { title, text: `${title} 的说明`, videoName }
}

function principleTask(sections: ContentSection[], videoName?: string): ContentTask {
  return {
    taskType: TaskType.Principle,
    paragraphs: [],
    sections,
    images: [],
    videoName,
    questions: [],
  }
}

describe('原理页：视频列表的出现条件（DEC-99）', () => {
  it('单段视频 → 列表隐藏（采纳数据的常态，8 个项目全是单段）', () => {
    const task = principleTask([section('电磁吸合与触头动作', '01jcq_yl')])
    expect(showsPlaylist(videoSectionsOf(task))).toBe(false)
  })

  it('两段及以上 → 列表出现', () => {
    const task = principleTask([section('第一段', 'a'), section('第二段', 'b')])
    expect(showsPlaylist(videoSectionsOf(task))).toBe(true)
  })

  it('没有任何段 → 列表不出现（页面走"没有视频"的明确状态）', () => {
    expect(showsPlaylist(videoSectionsOf(principleTask([])))).toBe(false)
    expect(showsPlaylist(videoSectionsOf(null))).toBe(false)
  })

  it('只有文字、没有 videoName 的段不进列表，也不占段号', () => {
    const task = principleTask([section('只有文字'), section('有视频', '01jcq_yl')])
    const sections = videoSectionsOf(task)
    expect(sections).toHaveLength(1)
    // 列表只有一项 ⇒ 仍然按"单段"处理（不该因为数据里多了一段纯文字就冒出列表）
    expect(showsPlaylist(sections)).toBe(false)
    expect(videoNameAt(task, 0)).toBe('01jcq_yl')
  })

  it('段号是"可播段"的序号；越界时回落到任务级 videoName', () => {
    const task = principleTask([section('有段无视频'), section('有视频', 'b')], 'task_level')
    // 段号只在**有视频的段**上数，所以 0 号是 `b` —— 不能出现"点了第 0 行却对不上"的错位
    expect(videoNameAt(task, 0)).toBe('b')
    expect(videoNameAt(task, 1)).toBe('task_level')
    expect(videoNameAt(task, 9)).toBe('task_level')
    expect(videoNameAt(principleTask([]), 0)).toBeNull()
  })
})

describe('原理页：真实数据的结构不变量', () => {
  const projectData = JSON.parse(
    readFileSync(
      fileURLToPath(new URL('../../public/content/data/ProjectData.json', import.meta.url)),
      'utf8',
    ),
  ) as { clips?: unknown[] }

  it('启用了原理槽位的项目，至少有一段带 videoName（否则原理页没有东西可播）', () => {
    const projects = (projectData.clips ?? [])
      .map((clip) => toContentProject(clip))
      .filter((project) => project !== null)
    const enabled = projects.filter((project) =>
      project.tasks.some((task) => task.taskType === TaskType.Principle),
    )
    // 不写死"必须是 8 个"：内容会整体重发（DEC-23），这里只钉"有原理槽位就有视频"
    expect(enabled.length).toBeGreaterThan(0)
    for (const project of enabled) {
      const task = project.tasks.find((item) => item.taskType === TaskType.Principle)
      expect(videoSectionsOf(task).length, `${project.id} 没有可播的讲解视频`).toBeGreaterThan(0)
    }
  })
})
