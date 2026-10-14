<script setup lang="ts">
/**
 * 步骤落地面板（`ui:request` 的 DOM 落地）—— 教学界面在 DOM 层（DEC-16）。
 *
 * 支撑三档（`docs/design/02` §3.2 的 `kind`）：
 *   · `tips`     —— 右下角浮窗（排版稿 B5）。**不需要回执**：Unity 侧 `ShowTip` 发出去就不管。
 *   · `ui`       —— 信息面板，**关闭即完成**（`ConditionUI`：`success` / `failed` / `unavailable` 都算过）。
 *   · `question` —— 答题面板，**判定在这边**（题库也在这边）。答对回 `success`；答错回 `failed`，
 *                  由 Unity 侧 `ConditionQuestion` 决定"再问一次"还是"到上限放行"（默认上限 3 次）。
 *
 * 两条纪律（`docs/design/10` §5）由本组件 + `domain/step-panels.ts` 共同保证：
 *   ① **弹不出来也要回 `unavailable`**（否则这一步会一直等 —— 面板条件的 `timeoutSeconds` 默认 0 = 不限时）；
 *   ② **一个请求只回一条**（`repliedSeq` 钉住；重复回执会被 Unity 端口打到下一个请求上）。
 *
 * 形态对着排版稿 B5（提示浮窗）/ D2（题目控件），类名全部取自设计系统 `components.css`，
 * 不在产品里另造一套视觉。
 */
import { computed, ref, watch } from 'vue'
import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, TriangleAlert, X } from 'lucide-vue-next'
import {
  UiPanelKind,
  UiResultKind,
  type StepPanelRequest,
  type StepTipsContent,
  type StepUiContent,
} from '@/contracts'
import type { ContentQuestion } from '@/domain/adopted-content'

const props = defineProps<{
  /** 正在等回执的面板（`ui` / `question`）；没有则为 null */
  request: StepPanelRequest | null
  /** 当前提示条（`tips`）；没有则为 null */
  tip: StepPanelRequest | null
  /** 提示条内容（按 `tip.refId` 查 `StepContentData.json` 得到） */
  tipsContent?: StepTipsContent
  /** 信息面板内容（按 `request.refId` 查同一份数据得到） */
  uiContent?: StepUiContent
  /** 题库里那道题（答题面板的判定依据） */
  question?: ContentQuestion
}>()

const emit = defineEmits<{
  /** 回执（父组件负责"只发一条"，见 `domain/step-panels.ts` 的 `StepPanelQueue.answer`） */
  (event: 'resolve', result: UiResultKind, detail?: string): void
  /** 用户关掉提示条（本地动作，不发消息） */
  (event: 'dismiss-tip'): void
}>()

// —— 提示条（B5）——
/** 收起态（一行）。点右上角箭头切换，与排版稿一致。 */
const tipMini = ref(false)

/**
 * 提示条的两行：步骤提示（蓝）在上、操作提示（青）在下（排版稿 B5 的"顺序"规范）。
 * 数据里这两行都可能为空（`""` = 没填），空的那行不渲染。
 */
const tipRows = computed(() => {
  const content = props.tipsContent
  if (!content) return []
  const rows: Array<{ kind: 'step' | 'op'; label: string; text: string }> = []
  if (content.stepTips !== '') rows.push({ kind: 'step', label: '步骤提示', text: content.stepTips })
  if (content.opTips !== '') rows.push({ kind: 'op', label: '操作提示', text: content.opTips })
  return rows
})

/** 提示条的两行都空、或数据里根本没这条 id ⇒ 显示"没有提示文案"，而不是弹一个空框。 */
const tipMissing = computed(() => tipRows.value.length === 0)

// —— 信息面板（`ui`）——
/** 当前页（`pages[]` 多段时用；`contactor_ui_measure` 就是 3 段） */
const page = ref(0)
const pageCount = computed(() => props.uiContent?.pages.length ?? 0)
const pageText = computed(() => props.uiContent?.pages[page.value] ?? '')

/** 已经回过执的请求序号 —— "一个请求只回一条"就靠它钉住。 */
const repliedSeq = ref<number | null>(null)

function reply(result: UiResultKind, detail?: string): void {
  const request = props.request
  if (request === null) return
  if (repliedSeq.value === request.seq) return
  repliedSeq.value = request.seq
  emit('resolve', result, detail)
}

// —— 答题面板（`question`）——
/** 选中的选项下标（单选/判断；多选要按 `questionType` 分，见下面的 `multiSelect`） */
const picked = ref<number[]>([])
/** 判卷结果：`idle` 未提交 / `right` / `wrong` */
const verdict = ref<'idle' | 'right' | 'wrong'>('idle')

/**
 * 多选题：契约里 `QuestionType.MultipleChoice`。
 * 这里用**契约序号**比对（`question.type === 2`），不硬编码字符串 —— 名字来自 C# 的 `questionType` 字段。
 */
const MULTIPLE_CHOICE = 2
const multiSelect = computed(() => props.question?.type === MULTIPLE_CHOICE)

function toggleOption(index: number): void {
  if (verdict.value !== 'idle') return // 已判卷：锁定，等用户点"重试"
  if (multiSelect.value) {
    picked.value = picked.value.includes(index)
      ? picked.value.filter((item) => item !== index)
      : [...picked.value, index]
    return
  }
  picked.value = [index]
}

/** 选项的呈现状态（排版稿 D2 的 `--picked` / `--right` / `--wrong`）。 */
function optionClass(index: number): Record<string, boolean> {
  const selected = picked.value.includes(index)
  if (verdict.value === 'idle') return { 'ui-option--picked': selected }
  const correct = props.question?.options[index]?.correct === true
  if (correct) return { 'ui-option--right': true }
  return { 'ui-option--wrong': selected }
}

function submitAnswer(): void {
  const question = props.question
  if (!question || picked.value.length === 0 || verdict.value !== 'idle') return
  const correct = question.options.every((option, index) => option.correct === picked.value.includes(index))
  verdict.value = correct ? 'right' : 'wrong'
  if (correct) reply(UiResultKind.Success, '答对')
}

/** 答错后点"重试"：回 `failed`，由 Unity 侧重新弹一次（`ConditionQuestion` 的"再问一次"）。 */
function retryAnswer(): void {
  reply(UiResultKind.Failed, '答错重问')
}

// —— 请求切换时的重置与"弹不出来也要回执" ——
watch(
  () => props.request?.seq,
  () => {
    page.value = 0
    picked.value = []
    verdict.value = 'idle'

    const request = props.request
    if (request === null) return

    // 弹不出来必须回执，否则这一步一直等（纪律①）。两种情况都算"弹不出来"：
    //   · `ui` 档：内容数据里没有这条 id（或条目里全是空）
    //   · `question` 档：题库里没有这道题 —— **不拿别的题凑**，也不拿 Unity 的展示字段硬判（判定要靠 correct 标志）
    if (request.kind === UiPanelKind.Ui && !props.uiContent) {
      reply(UiResultKind.Unavailable, `内容数据里没有信息面板「${request.refId}」`)
      return
    }
    if (request.kind === UiPanelKind.Question && !props.question) {
      reply(UiResultKind.Unavailable, `题库里没有题目「${request.refId}」`)
    }
  },
  { immediate: true },
)

/** 切到另一条提示时把收起态复位（新提示应当展开给人看）。 */
watch(
  () => props.tip?.seq,
  () => {
    tipMini.value = false
  },
)
</script>

<template>
  <!-- 提示条（B5）：绝对定位在页面主体右下角；`.ui-tips-float` 自带 position:absolute -->
  <div v-if="tip" class="ui-tips-float" :class="{ 'ui-tips-float--mini': tipMini }" data-wsu3-tips="true">
    <template v-if="tipMini">
      <span class="ui-tips__tag ui-tips__tag--step">步骤</span>
      <span class="ui-tips__text">{{ tipsContent?.stepTips || '（没有提示文案）' }}</span>
      <span class="ui-tips-float__icon" title="展开" @click="tipMini = false">
        <ChevronUp :size="14" />
      </span>
    </template>
    <template v-else>
      <div class="ui-tips-float__head">
        <span>当前步骤提示</span>
        <span class="ui-tips-float__actions">
          <span class="ui-tips-float__icon" title="收起" @click="tipMini = true">
            <ChevronDown :size="14" />
          </span>
          <span class="ui-tips-float__icon" title="关闭" @click="emit('dismiss-tip')">
            <X :size="14" />
          </span>
        </span>
      </div>
      <div v-for="row in tipRows" :key="row.kind" class="ui-tips__row">
        <span class="ui-tips__tag" :class="`ui-tips__tag--${row.kind}`">{{ row.label }}</span>
        <span class="ui-tips__text">{{ row.text }}</span>
      </div>
      <!-- 内容数据里没有这条提示：如实说清，不假装有，也不弹空框 -->
      <div v-if="tipMissing" class="ui-small ui-muted">
        内容数据里没有提示「{{ tip.refId }}」—— 检查 <code>StepContentData.json</code> 的 Tips 条目。
      </div>
    </template>
  </div>

  <!-- 模态面板（`ui` / `question`）：`.ui-mask` 盖住页面主体，同时把三维输入关掉（父组件发 input:enable） -->
  <div v-if="request" class="ui-mask" data-wsu3-panel="true">
    <!-- 信息面板：关闭即完成（排版稿 D1 的"确认"口径） -->
    <div v-if="request.kind === UiPanelKind.Ui" class="ui-dialog">
      <div class="ui-dialog__title">
        <span>{{ uiContent?.title || request.body?.title || '说明' }}</span>
        <span v-if="pageCount > 1" class="ui-small ui-muted" style="margin-left: auto">
          第 {{ page + 1 }} / {{ pageCount }} 页
        </span>
      </div>
      <div class="ui-dialog__body" style="white-space: pre-line; max-height: 52vh; overflow: auto">
        {{ pageText }}
      </div>
      <div class="ui-dialog__foot">
        <button class="ui-btn ui-btn--sm" :disabled="page === 0" @click="page -= 1">
          <ChevronLeft :size="14" /> 上一页
        </button>
        <button v-if="page < pageCount - 1" class="ui-btn ui-btn--sm ui-btn--primary" @click="page += 1">
          下一页 <ChevronRight :size="14" />
        </button>
        <button v-else class="ui-btn ui-btn--primary" @click="reply(UiResultKind.Success, '已确认')">
          <Check :size="14" /> 确认
        </button>
      </div>
    </div>

    <!-- 答题面板：判定在这边（题库也在这边），答对回 success、答错回 failed -->
    <div v-else-if="request.kind === UiPanelKind.Question" class="ui-dialog">
      <div class="ui-dialog__title">
        <span>{{ request.body?.title || '答题' }}</span>
        <span class="ui-badge" style="margin-left: auto">
          {{ multiSelect ? '多选' : '单选' }}
        </span>
      </div>
      <div class="ui-dialog__body" style="max-height: 56vh; overflow: auto">
        <div class="ui-question">
          <div class="ui-question__stem">
            {{ question?.text || request.body?.content || '（题目正文缺失）' }}
          </div>
          <div class="ui-options">
            <div
              v-for="(option, index) in question?.options ?? []"
              :key="`${index}-${option.text}`"
              class="ui-option"
              :class="optionClass(index)"
              @click="toggleOption(index)"
            >
              <span class="ui-option__key">{{ String.fromCharCode(65 + index) }}</span>
              <span>{{ option.text }}</span>
              <span class="ui-grow" />
              <Check v-if="verdict !== 'idle' && option.correct" :size="14" />
              <X v-else-if="verdict === 'wrong' && picked.includes(index)" :size="14" />
            </div>
          </div>
          <!-- 错答提示：不自己重问，回 failed 让 Unity 侧按它的重试上限再弹一次 -->
          <div v-if="verdict === 'wrong'" class="ui-alert ui-alert--warn">
            <TriangleAlert :size="14" />
            <span>答错了 —— 点「重试」会重新弹出这道题（重试次数由步骤条件决定）。</span>
          </div>
          <div v-else-if="verdict === 'right'" class="ui-alert ui-alert--ok">
            <Check :size="14" />
            <span>答对了，继续下一步。</span>
          </div>
        </div>
      </div>
      <div class="ui-dialog__foot">
        <button v-if="verdict === 'wrong'" class="ui-btn ui-btn--primary" @click="retryAnswer">重试</button>
        <button
          v-else
          class="ui-btn ui-btn--primary"
          :disabled="picked.length === 0 || verdict !== 'idle'"
          @click="submitAnswer"
        >
          <Check :size="14" /> 提交
        </button>
      </div>
    </div>

    <!-- 兜底：不认识的 kind。按"弹不出来"回执，绝不静默把它挂在那里 -->
    <div v-else class="ui-dialog">
      <div class="ui-dialog__title">不支持的步骤面板</div>
      <div class="ui-dialog__body">
        收到 <code>{{ request.kind }}</code
        >（refId={{ request.refId }}）—— 页面不认识这一档。
      </div>
      <div class="ui-dialog__foot">
        <button
          class="ui-btn ui-btn--primary"
          @click="reply(UiResultKind.Unavailable, `不支持的 kind: ${request.kind}`)"
        >
          跳过这一步
        </button>
      </div>
    </div>
  </div>
</template>
