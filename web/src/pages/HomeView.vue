<script setup lang="ts">
/**
 * 首页：SceneState 与 TaskType 的演示入口。
 * 它只做两件事：切换状态（发事件）与列出任务（按 DEC-06 标注技术栈归属）。
 */
import { computed } from 'vue'
import {
  SCENE_STATE_LABELS,
  SCENE_STATES,
  SceneState,
  TASK_TYPE_LABELS,
  TASK_TYPES,
  TaskType,
  ViewerStack,
  resolveViewerStack,
} from '@/contracts'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()

const currentSceneLabel = computed(() => SCENE_STATE_LABELS[session.sceneState])

function stackLabel(taskType: TaskType): string {
  const stack = resolveViewerStack(taskType)
  if (stack === ViewerStack.Unity) return 'Unity'
  return 'Three.js'
}

function selectScene(state: SceneState): void {
  session.switchSceneState(state)
}
</script>

<template>
  <section class="panel">
    <h2>状态机演示（SceneState）</h2>
    <p class="hint">
      当前状态：<strong>{{ currentSceneLabel }}</strong>
      —— 状态由 Web 侧持有（DEC-08），变更走事件，不提供查询接口。
    </p>
    <div class="row">
      <button
        v-for="state in SCENE_STATES"
        :key="state"
        type="button"
        :class="['chip', { active: state === session.sceneState }]"
        @click="selectScene(state)"
      >
        {{ SCENE_STATE_LABELS[state] }}
      </button>
    </div>
  </section>

  <section class="panel">
    <h2>任务清单（TaskType）</h2>
    <p class="hint">
      技术栈按 TaskType 一刀切分流（DEC-06）：<em>Three.js</em> 承载
      None/Purpose/Equipment/Principle/Test/Info/Exam，<em>Unity</em> 承载
      LineConnection/Training/Structure/Inspection。
    </p>
    <ul class="task-list">
      <li v-for="taskType in TASK_TYPES" :key="taskType">
        <router-link :to="{ name: 'task', params: { taskType: String(taskType) } }">
          <span class="task-name">{{ TASK_TYPE_LABELS[taskType] }}</span>
          <span :class="['badge', stackLabel(taskType) === 'Unity' ? 'badge-unity' : 'badge-three']">
            {{ stackLabel(taskType) }}
          </span>
        </router-link>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.task-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 8px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.task-list a {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid #2f3646;
  border-radius: 8px;
  color: #dfe5f0;
  text-decoration: none;
}

.task-list a:hover {
  border-color: #4c7dff;
  background: #1e2430;
}

.task-name {
  font-size: 14px;
}

.badge {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
}

.badge-three {
  background: #123524;
  color: #7ee2a8;
}

.badge-unity {
  background: #2c2440;
  color: #b79bff;
}
</style>
