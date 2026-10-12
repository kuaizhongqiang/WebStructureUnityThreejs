<script setup lang="ts">
/**
 * 骨架自检页（`/#/debug`）—— 原 `pages/HomeView.vue` + `pages/TaskView.vue` 的功能合并版。
 *
 * 为什么保留：它是"双线分流 + 通信 + 单一真源"三条骨架能力（DEC-03）的可运行证据，
 * 也是 `npm run smoke` 之外最好用的手检入口。**用设计系统重写**，不再使用早期那套
 * 自带色板的 `styles/main.css`（那会违反 DEC-74 的"产品只消费令牌"）。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
import {
  SCENE_STATES,
  SCENE_STATE_LABELS,
  TASK_TYPES,
  TASK_TYPE_LABELS,
  BRIDGE_PROTOCOL_VERSION,
} from '@/contracts'
import { stackOf, metaOf } from '@/domain/registry'
import { useSessionStore } from '@/stores/session'
import { useProgressStore } from '@/stores/progress'
import { Viewer } from '@/viewer/Viewer'

const router = useRouter()
const session = useSessionStore()
const progress = useProgressStore()

const log = ref<string[]>([])
const stats = ref<string>('未启动')
const viewport = ref<HTMLElement | null>(null)
let viewer: Viewer | null = null
let timer = 0

onMounted(() => {
  session.subscribe((event) => {
    log.value = [`${new Date().toLocaleTimeString()} ${JSON.stringify(event)}`, ...log.value].slice(0, 8)
  })
})
onBeforeUnmount(() => {
  window.clearInterval(timer)
  viewer?.dispose()
  viewer = null
})

/** 冒烟探针：与任务页同一约定，`tools/render-smoke.mjs` 靠它读渲染统计。 */
type ViewerProbe = Window & { __WSU3_VIEWER__?: Viewer | null }

function toggleViewer(): void {
  if (viewer) {
    window.clearInterval(timer)
    viewer.dispose()
    viewer = null
    ;(window as ViewerProbe).__WSU3_VIEWER__ = null
    stats.value = '已卸载（dispose 已调用）'
    return
  }
  if (!viewport.value) return
  viewer = new Viewer({ container: viewport.value, pixelRatioCap: 1.5 })
  viewer.start()
  ;(window as ViewerProbe).__WSU3_VIEWER__ = viewer
  timer = window.setInterval(() => {
    const s = viewer?.renderStats
    if (s) stats.value = `frame=${s.frame} calls=${s.calls} triangles=${s.triangles}`
  }, 500)
}

const sceneLabel = computed(() => SCENE_STATE_LABELS[session.sceneState])
const taskLabel = computed(() => TASK_TYPE_LABELS[session.currentTaskType])
</script>

<template>
  <AppShell
    crumb="骨架自检"
    :badges="['DEC-03 骨架', '游客']"
    status-left="[ 自检 ] 双线分流 / 通信 / 单一真源"
    status-right="本条状态由 session store 直接驱动"
  >
    <div class="app-task" style="overflow: auto">
      <div class="ui-panel">
        <div class="ui-panel__head">
          真源读数（session store）
          <span class="ui-panel__right">
            <button class="ui-btn ui-btn--sm" @click="router.push({ name: 'start' })">回到首页</button>
          </span>
        </div>
        <div class="ui-panel__body ui-col">
          <div class="app-row">
            <span class="ui-badge ui-badge--info">SceneState：{{ sceneLabel }}</span>
            <span class="ui-badge ui-badge--ok">TaskType：{{ taskLabel }}</span>
            <span class="ui-badge">栈：{{ session.viewerStack }}</span>
            <span class="ui-badge">桥协议：v{{ BRIDGE_PROTOCOL_VERSION }}</span>
          </div>
          <div class="ui-muted">
            状态变更只走 <code>switchSceneState()</code> / <code>switchTaskType()</code>，
            并一定发事件（DEC-08：不提供同步查询接口）。
          </div>
        </div>
      </div>

      <div class="app-split">
        <div class="ui-panel">
          <div class="ui-panel__head">SceneState（契约枚举，只许追加）</div>
          <div class="ui-panel__body ui-col">
            <div class="app-row">
              <button
                v-for="state in SCENE_STATES"
                :key="state"
                class="ui-btn ui-btn--sm"
                :class="{ 'ui-btn--primary': session.sceneState === state }"
                @click="session.switchSceneState(state)"
              >
                {{ SCENE_STATE_LABELS[state] }}
              </button>
            </div>
            <div class="ui-panel__head" style="padding-left: 0">TaskType（11 个，标签逐字来自契约）</div>
            <div class="app-row">
              <button
                v-for="type in TASK_TYPES"
                :key="type"
                class="ui-btn ui-btn--sm"
                :class="{ 'ui-btn--primary': session.currentTaskType === type }"
                :title="metaOf(type).hint"
                @click="session.switchTaskType(type)"
              >
                {{ TASK_TYPE_LABELS[type] }}
              </button>
            </div>
            <div class="ui-muted">
              当前类型的承载栈：<b>{{ stackOf(session.currentTaskType) }}</b>
              （DEC-06 的落点：复杂三维交 Unity、简单三维交 Three）
            </div>
            <div class="ui-row">
              <button class="ui-btn ui-btn--sm" @click="progress.complete(session.currentTaskType)">
                标记完成并落盘
              </button>
              <button class="ui-btn ui-btn--sm" @click="progress.reset()">清空本机进度</button>
              <span class="ui-badge">已完成 {{ progress.completedCount }} / {{ progress.total }}</span>
            </div>
          </div>
        </div>

        <div class="ui-panel" style="display: flex; flex-direction: column">
          <div class="ui-panel__head">
            三维视口（Three.js）
            <span class="ui-panel__right">
              <button class="ui-btn ui-btn--sm" @click="toggleViewer">
                {{ stats.startsWith('已卸载') ? '重新挂载' : '挂载 / 卸载' }}
              </button>
            </span>
          </div>
          <div class="ui-panel__body" style="flex: 1; min-height: 0; padding: 0">
            <div ref="viewport" class="app-viewport">
              <span class="ui-viewport__hint">Three.js · 渲染统计可见</span>
            </div>
          </div>
          <div class="ui-panel__body" style="flex: none">
            <span class="ui-muted">渲染统计：{{ stats }}</span>
          </div>
        </div>
      </div>

      <div class="ui-panel">
        <div class="ui-panel__head">事件流（最近 8 条）</div>
        <div class="ui-panel__body ui-col">
          <div v-for="(line, index) in log" :key="index" class="ui-muted" style="font-size: var(--fs-12)">
            {{ line }}
          </div>
          <div v-if="!log.length" class="ui-muted">点上面的按钮产生状态变更，这里会实时显示事件。</div>
        </div>
      </div>
    </div>
  </AppShell>
</template>
