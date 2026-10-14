/**
 * 原理页（`TaskType.Principle`）的纯逻辑（DEC-99）。
 *
 * 为什么单独抽一层：**"视频列表要不要出现"是数据决定的规则**（只有一段视频时不出现），
 * 而采纳数据里 8 个项目**全是单段** —— 页面上"多段"那个分支没有任何真实数据会走到，
 * 只有单测能保证它没被写反、也没被顺手删掉。
 *
 * 与排版稿的关系：形态对着 `docs/ui-mockups/pages/c4-principle.html`（单段）与
 * 样式成果页第八节的两档对照（单段 = 列表隐藏 / 多段 = 列表出现）。
 */
import type { ContentSection, ContentTask } from './adopted-content'

/**
 * 有视频的段落（`videoName` 非空）。**播放对象、列表、段号都只看这些** ——
 * 数据里允许出现"只有文字没有视频"的 struct，那种段落不该出现在列表里，
 * 也不该让"第 N 段"的序号与列表行错位。
 */
export function videoSectionsOf(task: ContentTask | null | undefined): ContentSection[] {
  return (task?.sections ?? []).filter((section) => Boolean(section.videoName))
}

/**
 * "视频列表"是否出现：**只有多段视频才出现**。
 *
 * 单段（采纳数据的常态）时列表整块隐藏，腾出来的宽度给播放器 ——
 * 画一个只有一项的"列表"既浪费一整栏，又暗示还有别的内容可切。
 */
export function showsPlaylist(sections: readonly ContentSection[]): boolean {
  return sections.length > 1
}

/** 当前该播哪一段：段内 `videoName` 优先，回落到任务级 `videoName`（数据里两者同源）。 */
export function videoNameAt(task: ContentTask | null | undefined, index: number): string | null {
  const sections = videoSectionsOf(task)
  const own = sections[index]?.videoName
  return own ?? task?.videoName ?? null
}
