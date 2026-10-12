<script setup lang="ts">
/**
 * 任务页：按 DEC-06 的归属，决定挂 Three.js 还是 Unity。
 *
 * 本页是"分流"的落点，也是 DEC-08 的验证点：Unity/Three 都只是被指令的渲染层，
 * 真源在 store；离开页面必须释放（`dispose()` / `detach()`），否则反复进出会泄漏。
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { SceneState, TASK_TYPE_LABELS, TaskType, ViewerStack, isTaskType } from '@/contracts'
import { detectDevice } from '@/platform/device'
import { useSessionStore } from '@/stores/session'
import { Viewer } from '@/viewer/Viewer'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
// 设备提示（DEC-70）：只提示不阻拦；画质档随之取 low/high。
const device = detectDevice()

const canvasHost = ref<HTMLElement | null>(null)
const viewerError = ref<string>('')

let viewer: Viewer | null = null

const taskType = computed<TaskType>(() => {
  const raw = Number(route.params.taskType)
  return isTaskType(raw) ? raw : TaskType.None
})

const title = computed(() => TASK_TYPE_LABELS[taskType.value])
const stack = computed(() => session.viewerStack)

function mountViewer(): void {
  if (stack.value !== ViewerStack.Three) return
  const host = canvasHost.value
  if (!host) return
  try {
    viewer = new Viewer({ container: host })
    viewer.start()
    // 一个可替换的占位内容：等真实 GLB 就位后改成 viewer.loadModel(url)。
    viewerError.value = ''
    if (import.meta.env.DEV) {
      // 调试/冒烟测试钩子：仅在开发模式暴露，用于断言"真的渲染了"（DEC-27）。
      ;(window as unknown as Record<string, unknown>).__WSU3_VIEWER__ = viewer
    }
  } catch (error) {
    viewerError.value = error instanceof Error ? error.message : String(error)
  }
}

function unmountViewer(): void {
  viewer?.dispose()
  viewer = null
  if (import.meta.env.DEV) {
    delete (window as unknown as Record<string, unknown>).__WSU3_VIEWER__
  }
}

onMounted(() => {
  // 进入任务页 = 进入 UI 状态；离开回菜单（全部走事件，DEC-08）。
  session.switchSceneState(SceneState.UI)
  session.switchTaskType(taskType.value)
  mountViewer()
})

/**
 * 路由参数变化必须广播给 store。
 * 注意：`/task/1` → `/task/5` 是**同一个组件实例复用**，`onMounted` 不会再跑；
 * 只在 mounted 里广播会导致"切到 Unity 类任务，页面还停在上一个任务的三维件上"
 * （这个缺陷正是被 tools/render-smoke.mjs 抓出来的）。
 */
watch(taskType, (next) => {
  session.switchTaskType(next)
})

/**
 * 技术栈切换 = 换渲染器，必须重建。
 * `flush: 'post'`：等 `v-if` 把画布容器渲染出来之后再挂载，否则 Unity → Three 切换时
 * `canvasHost` 还是 null，画布永远不会被创建。
 */
watch(
  stack,
  () => {
    unmountViewer()
    mountViewer()
  },
  { flush: 'post' },
)

onBeforeUnmount(() => {
  unmountViewer()
  session.switchSceneState(SceneState.Menu)
})

function goHome(): void {
  void router.push({ name: 'home' })
}
</script>

<template>
  <section class="panel">
    <div class="row">
      <button type="button" class="chip" @click="goHome">← 返回</button>
      <h2>{{ title }}</h2>
      <span :class="['badge', stack === ViewerStack.Unity ? 'badge-unity' : 'badge-three']">
        {{ stack === ViewerStack.Unity ? 'Unity' : 'Three.js' }}
      </span>
    </div>

    <p v-if="device.notice" class="notice">{{ device.notice }}</p>

    <div v-if="stack === ViewerStack.Three" class="stage">
      <div ref="canvasHost" class="canvas-host"></div>
      <p v-if="viewerError" class="error">渲染器初始化失败：{{ viewerError }}</p>
      <p class="hint">
        裸 three 渲染（DEC-15）。移动端像素比已封顶 1.5、关闭阴影（DEC-18）。
      </p>
    </div>

    <div v-else class="stage placeholder">
      <p>
        该 TaskType 归 <strong>Unity WebGL</strong> 承载（DEC-06 / DEC-12）。
      </p>
      <p class="hint">
        待 Unity 侧构建产物就位后，此处由 <code>UnityBridge</code> 同页挂载并做协议握手（DEC-07）。
        Unity 侧构建尚未开始（DEC-13 基线实测待执行）。
      </p>
    </div>
  </section>
</template>

<style scoped>
.stage {
  margin-top: 12px;
}

.canvas-host {
  height: 420px;
  border-radius: 10px;
  overflow: hidden;
  background: #1b1f27;
}

.placeholder {
  border: 1px dashed #3a4152;
  border-radius: 10px;
  padding: 28px;
  background: #171b23;
}

.error {
  color: #ff8f8f;
}

.notice {
  margin: 8px 0 0;
  padding: 8px 10px;
  border: 1px solid #6b5a20;
  border-radius: 8px;
  background: #2a2415;
  color: #ffd98a;
  font-size: 13px;
}
</style>
