/**
 * 步骤内容数据（`content/data/StepContentData.json`）→ `ui:request` 要显示的文字。
 *
 * **为什么 Web 侧需要它**：Unity 只发 `ui:request { kind, refId, body? }`，
 * 而 `tips` 那一档**连 body 都不带**（见 `WebStepPanelPort.ShowTip`：只发 `tipsKey`）——
 * 提示条的两行字（步骤提示 / 操作提示）必须由页面自己按 `refId` 查。
 * 信息面板虽然带了展示字段，但同一份数据在页面手里，**以数据为准**才不会出现两套文案。
 *
 * 数据是"多态条目按 id 取用"（文件自己在 `description` 里这么写的）：
 *   · `contentType: "UI"`   → `title` / `pages[]`（信息面板的分页正文）
 *   · `contentType: "Tips"` → `stepTips` / `opTips` / `stepImageKey` / `opImageKey`
 * 别的 `contentType` 一律**忽略**（今天没有第三种，将来有了也不该让页面炸）。
 *
 * 三条纪律（与 `adopted-content.ts` 同款，理由也一样）：
 *   1. **纯函数**：不碰网络、不碰 Vue —— 形状与坑用单测锁住（`step-content.spec.ts`）；
 *   2. **防御式读取**：输入是外部 JSON，读不懂的字段就当没有，不抛异常、不整体失败；
 *   3. **不改写契约**：`refId` 是 Unity 与内容数据之间的键，这里只做查表，不做任何推断。
 */
import type { StepTipsContent, StepUiContent } from '@/contracts'

export type { StepTipsContent, StepUiContent }

/** 按 id 查表的两份索引。 */
export interface StepContentIndex {
  readonly tips: ReadonlyMap<string, StepTipsContent>
  readonly ui: ReadonlyMap<string, StepUiContent>
}

export const EMPTY_STEP_CONTENT: StepContentIndex = {
  tips: new Map(),
  ui: new Map(),
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

/** 非空字符串才算数（数据里大量 `""` 表示"没填"）。 */
function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function optionalText(value: unknown): string | undefined {
  const trimmed = text(value)
  return trimmed === '' ? undefined : trimmed
}

/** `contentType` 的比较：数据里写的是 `"UI"` / `"Tips"`，容错到大小写与空白。 */
function kindOf(value: unknown): 'ui' | 'tips' | null {
  const raw = text(value).toLowerCase()
  if (raw === 'ui') return 'ui'
  if (raw === 'tips') return 'tips'
  return null
}

/**
 * 一条 `Tips` 条目。**两行字都空**时返回 `null`（这条等于没内容，页面别弹空提示条）。
 */
export function toStepTips(raw: unknown): StepTipsContent | null {
  if (!isRecord(raw)) return null
  const id = text(raw.id)
  if (id === '') return null
  const stepTips = text(raw.stepTips)
  const opTips = text(raw.opTips)
  if (stepTips === '' && opTips === '') return null
  return {
    id,
    stepTips,
    opTips,
    stepImageKey: optionalText(raw.stepImageKey),
    opImageKey: optionalText(raw.opImageKey),
  }
}

/**
 * 一条 `UI` 信息面板条目。
 *
 * `pages[]` 里保留空行 —— 正文的分段是数据给的，页面只负责换行显示，不做二次清洗。
 * `title` 与 `pages` 都空时返回 `null`（弹一个空框不如按"弹不出来"回 `unavailable`）。
 */
export function toStepUi(raw: unknown): StepUiContent | null {
  if (!isRecord(raw)) return null
  const id = text(raw.id)
  if (id === '') return null
  const title = text(raw.title)
  const pages = asArray(raw.pages)
    .map((page) => (typeof page === 'string' ? page : ''))
    .filter((page) => page.trim() !== '')
  if (title === '' && pages.length === 0) return null
  return { id, title, pages }
}

/** 整份 `StepContentData.json` → 两份索引（`contents[]` 里按 `contentType` 分流）。 */
export function toStepContentIndex(raw: unknown): StepContentIndex {
  const contents = isRecord(raw) ? asArray(raw.contents) : asArray(raw)
  const tips = new Map<string, StepTipsContent>()
  const ui = new Map<string, StepUiContent>()

  for (const entry of contents) {
    if (!isRecord(entry)) continue
    const kind = kindOf(entry.contentType)
    if (kind === 'tips') {
      const item = toStepTips(entry)
      // 同 id 重复时**先到先得**：数据重发不该让后面的条目悄悄改掉前面的文案
      if (item && !tips.has(item.id)) tips.set(item.id, item)
    } else if (kind === 'ui') {
      const item = toStepUi(entry)
      if (item && !ui.has(item.id)) ui.set(item.id, item)
    }
  }

  return { tips, ui }
}

/** 查提示条内容；查不到返回 `undefined`（调用方据此显示"内容数据里没有这条提示"）。 */
export function tipsOf(index: StepContentIndex, id: string): StepTipsContent | undefined {
  return id === '' ? undefined : index.tips.get(id)
}

/** 查信息面板内容；查不到返回 `undefined`。 */
export function uiOf(index: StepContentIndex, id: string): StepUiContent | undefined {
  return id === '' ? undefined : index.ui.get(id)
}
