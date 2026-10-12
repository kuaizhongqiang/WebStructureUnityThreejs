<script setup lang="ts">
/** 外壳：只有导航与状态条，教学界面由各页面用 DOM 承载（DEC-16）。 */
import { computed } from 'vue'
import { SCENE_STATE_LABELS, TASK_TYPE_LABELS } from '@/contracts'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()

const sceneLabel = computed(() => SCENE_STATE_LABELS[session.sceneState])
const taskLabel = computed(() => TASK_TYPE_LABELS[session.currentTaskType])
</script>

<template>
  <header class="app-header">
    <div class="brand">虚拟仿真教学平台 · 框架骨架</div>
    <nav class="status">
      <span class="status-item">状态：{{ sceneLabel }}</span>
      <span class="status-item">任务：{{ taskLabel }}</span>
      <span class="status-item">技术栈：{{ session.viewerStack }}</span>
    </nav>
  </header>

  <main class="app-main">
    <router-view />
  </main>

  <footer class="app-footer">
    骨架阶段（DEC-03）：仅打通"双线分流 + 通信 + 单一真源"，内容待填充。
  </footer>
</template>
