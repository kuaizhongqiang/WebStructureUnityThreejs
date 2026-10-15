<script setup lang="ts">
/**
 * 步骤与桥状态：`step:changed` / `object:picked` / `task:completed` / `unity:error` 四条
 * **真实读数**的唯一落点 —— 以前 Web 侧这四条一条都没处理，于是"Unity 那边在跑、页面这边
 * 什么都不显示"，只能靠猜；现在把它们变成看得见的事实（DEC-112 立的规矩）。
 *
 * 为什么抽成组件：`Structure` 页（DEC-131）与其余 Unity 任务页都需要这一块，
 * 复制两份之后"改一处忘一处"就会让两个页面显示两套口径 —— 这类漂移正是本仓一直在消的。
 */
import { computed } from 'vue'
import { Check, TriangleAlert } from 'lucide-vue-next'
import type { UnitySessionState } from '@/unity/UnitySession'

const props = defineProps<{ state: UnitySessionState | null }>()

/** 步骤进度（扁平序号）：直接来自 `step:changed`，不需要知道"进程"这层概念。 */
const step = computed(() => props.state?.step ?? null)
/** 完成事件；`score` 缺席表示 Unity 没给分（成绩体系未建，**不编造分数**）。 */
const completion = computed(() => props.state?.completion ?? null)
/** 点中的部件（`object:picked`）。 */
const picked = computed(() => props.state?.picked ?? null)
/** 最近一条 Unity 错误（`unity:error`；9001 那种非致命的也要显示出来）。 */
const lastError = computed(() => {
  const errors = props.state?.errors ?? []
  return errors.length > 0 ? errors[errors.length - 1] : null
})
</script>

<template>
  <div v-if="props.state" class="ui-col" style="gap: var(--sp-2)">
    <div class="ui-small" style="font-weight: 600; color: var(--text-1)">步骤与桥状态</div>
    <div class="ui-row" style="flex-wrap: wrap">
      <span class="ui-badge" :class="props.state.handshake ? 'ui-badge--ok' : 'ui-badge--warn'">
        {{ props.state.handshake ? '已握手' : '待握手' }}
      </span>
      <span class="ui-badge" :class="props.state.assetsReady ? 'ui-badge--ok' : ''">
        {{ props.state.assetsReady ? '资产就绪' : '资产未就绪' }}
      </span>
      <span class="ui-badge" :class="props.state.sceneReady ? 'ui-badge--ok' : ''">
        {{ props.state.sceneReady ? '可交互' : '装配中' }}
      </span>
      <span v-if="picked" class="ui-badge ui-badge--info">点中：{{ picked }}</span>
    </div>

    <div v-if="step">
      <div class="ui-row">
        <span class="ui-small">步骤 {{ step.index + 1 }} / {{ step.total }}</span>
        <span v-if="step.name" class="ui-small ui-muted">{{ step.name }}</span>
      </div>
      <div class="ui-progress">
        <div
          class="ui-progress__bar"
          :style="{ width: `${((step.index + 1) / Math.max(1, step.total)) * 100}%` }"
        />
      </div>
    </div>
    <div v-else class="ui-small ui-muted">
      还没有步骤推进 —— 进站后由 Unity 侧发 <code>step:changed</code>。
    </div>

    <div v-if="completion" class="ui-alert ui-alert--ok">
      <Check :size="14" />
      <span>
        任务完成（用时 {{ (completion.elapsedMs / 1000).toFixed(1) }}s）<template
          v-if="completion.score !== undefined"
          >，得分 {{ completion.score }}</template
        >。
      </span>
    </div>

    <div v-if="lastError" class="ui-alert" :class="lastError.fatal ? 'ui-alert--err' : 'ui-alert--warn'">
      <TriangleAlert :size="14" />
      <span>[{{ lastError.code }}] {{ lastError.message }}</span>
    </div>
  </div>
</template>
