<script setup lang="ts">
/**
 * 三维视口面板（Unity 承载）：标题 + 阶段徽标 + 画布区 + **三种缺席态**。
 *
 * 为什么抽成组件：`practice`（电路连接 / 仿真实验 / 检测）与 `structure`（结构，DEC-131）
 * 两种骨架都要这一块，而"产物未就位 / 加载失败 / 正在加载"这三态是**硬要求**
 * （DEC-79：Unity 缺席时不许假装能进，必须显示"未包含 + 接入命令"）。
 *
 * 挂载点与叠层由调用方通过默认插槽给：`UnityLoader` 要往 `.app-viewport` **里面**创建 canvas，
 * 而"部件名称悬浮提示"（DEC-130）也要浮在同一层 —— 让调用方持有 `<div ref>` 与叠层，
 * 组件只负责框与三态。
 */
import { LoaderCircle, TriangleAlert } from 'lucide-vue-next'
import type { UnityFailure } from '@/unity/UnityLoader'

defineProps<{
  phase: 'idle' | 'loading' | 'ready' | 'failed' | 'absent'
  progress: number
  buildKey: string | null
  failure: UnityFailure | null
  /** 面板标题（结构页与其余 Unity 页都用默认值即可） */
  title?: string
  /** 发布清单读不出来的那种"未就位"（dev 直跑属正常）—— 只在 `absent` 态多显示一行说明 */
  manifestUnknown?: boolean
}>()

const emit = defineEmits<{ retry: []; back: [] }>()
</script>

<template>
  <div class="ui-panel" style="display: flex; flex-direction: column; min-width: 0">
    <div class="ui-panel__head">
      {{ title ?? '三维视口（Unity）' }}
      <span class="ui-panel__right">
        <span v-if="phase === 'ready'" class="ui-badge ui-badge--ok">已挂载 · {{ buildKey }}</span>
        <span v-else-if="phase === 'loading'" class="ui-badge ui-badge--info">
          <LoaderCircle :size="12" /> 加载中 {{ Math.round(progress * 100) }}%
        </span>
        <span v-else-if="phase === 'absent'" class="ui-badge ui-badge--warn">产物未就位</span>
        <span v-else-if="phase === 'failed'" class="ui-badge ui-badge--err">加载失败</span>
        <span v-else class="ui-badge">待进入</span>
      </span>
    </div>
    <div class="ui-panel__body" style="flex: 1; min-height: 0; padding: 0">
      <div class="app-viewport">
        <!-- 画布挂载点与页面自己的叠层（部件提示等） -->
        <slot />

        <div v-if="phase === 'absent'" class="ui-viewport__center">
          <TriangleAlert :size="18" style="color: var(--warn-text)" />
          <div style="color: var(--text-1); font-weight: 600">Unity 产物未包含在本次发布里</div>
          <div style="max-width: 520px; line-height: 1.8">
            这是一个<b>明确状态</b>，不是"加载中卡住"：发布清单（release-manifest.json）里没有该任务的构建。
            接入方式见 <code>docs/design/05-unity-packaging-pipeline.md</code>：<br />
            <code
              >node tools/pipeline/unity-stage.mjs --from &lt;Unity 构建目录&gt; --key main --task-types
              4,5,8,9</code
            >
          </div>
          <div v-if="manifestUnknown" class="ui-muted" style="font-size: var(--fs-11)">
            （当前没读到发布清单 —— dev 直跑属正常；走
            <code>tools/pipeline/pack.mjs</code> 打包才会有清单）
          </div>
        </div>

        <div v-else-if="phase === 'failed'" class="ui-viewport__center">
          <TriangleAlert :size="18" style="color: var(--err-text)" />
          <div style="color: var(--text-1); font-weight: 600">Unity 加载失败</div>
          <div style="max-width: 520px; line-height: 1.8">
            {{ failure?.message ?? '未知原因' }}
            <br />（超时 25s、已重试 1 次 —— DEC-71 的落地参数）
          </div>
          <div class="ui-row" style="justify-content: center">
            <button class="ui-btn ui-btn--sm" @click="emit('retry')">重试</button>
            <button class="ui-btn ui-btn--sm" @click="emit('back')">返回目录</button>
          </div>
        </div>

        <div v-else-if="phase === 'loading'" class="ui-viewport__center">
          <LoaderCircle :size="18" />
          <div>正在加载 Unity WebGL…{{ Math.round(progress * 100) }}%</div>
          <div class="ui-muted" style="font-size: var(--fs-11)">
            超过 25s 会判定失败并给出出口（DEC-53/DEC-71）
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
