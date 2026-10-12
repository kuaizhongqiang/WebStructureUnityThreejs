<script setup lang="ts">
/**
 * 任务页 —— Phase 1 的"端到端一页"（DEC-75）。
 *
 * 关键设计：**不是每个 TaskType 写一个页面**，而是"登记表驱动 + 少数几种骨架"
 * （见 `domain/registry.ts` 的 TaskPageKind 与 `docs/design/01-tasktype-registry.md`）：
 *   article  —— 一段正文（目的 / 原理 / 简介）
 *   list     —— 条目 + 三维展示（仪器 / 结构）
 *   video    —— 视频 + 播放列表（原理）
 *   quiz/exam—— 题目控件（小测验 / 考核）
 *   practice —— 仿真操作（Unity 承载）
 * 本期把 `article` 与 `list` 做实（含 Three 视口按容器比例自适应），其余给一致的占位骨架，
 * 这样站点线、进度、栈切换这些**框架能力**现在就能被真实走一遍。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Check, ChevronRight, Move3d, Play, TriangleAlert, LoaderCircle } from 'lucide-vue-next'
import AppShell from '@/components/AppShell.vue'
import { TaskType, TASK_TYPES, BRIDGE_PROTOCOL_VERSION, ViewerStack } from '@/contracts'
import { labelOf, metaOf, stackOf, isUnityTask } from '@/domain/registry'
import { useSessionStore } from '@/stores/session'
import { useProgressStore } from '@/stores/progress'
import { useContentStore } from '@/stores/content'
import { useRuntimeStore } from '@/stores/runtime'
import { Viewer } from '@/viewer/Viewer'
import { UnityBridge } from '@/unity/UnityBridge'
import { mountUnity, type UnityFailure, type UnityHandle } from '@/unity/UnityLoader'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const progress = useProgressStore()
const content = useContentStore()
const runtime = useRuntimeStore()

const taskType = computed<TaskType>(() => {
  const raw = Number(route.params.taskType)
  return TASK_TYPES.includes(raw as TaskType) ? (raw as TaskType) : TaskType.Purpose
})
const meta = computed(() => metaOf(taskType.value))
const task = computed(() => content.taskOf(taskType.value))
const unity = computed(() => isUnityTask(taskType.value))

// —— 三维视口：按容器比例自适应（页面不写死宽高，DEC-73）——
const viewport = ref<HTMLElement | null>(null)
/** 视口是否已挂载（响应式：模板里要显示按钮文案，不能只靠非响应式的 `viewer` 变量） */
const mounted = ref(false)
let viewer: Viewer | null = null

/** 冒烟探针：`tools/render-smoke.mjs` 靠它读渲染统计（与旧骨架保持同一约定）。 */
type ViewerProbe = Window & { __WSU3_VIEWER__?: Viewer | null }

function mountViewer(): void {
  if (viewer || !viewport.value) return
  viewer = new Viewer({ container: viewport.value, pixelRatioCap: 1.5, background: 0x0e141d })
  viewer.start()
  mounted.value = true
  ;(window as ViewerProbe).__WSU3_VIEWER__ = viewer
}
function unmountViewer(): void {
  viewer?.dispose()
  viewer = null
  mounted.value = false
  ;(window as ViewerProbe).__WSU3_VIEWER__ = null
}

/** 三维类骨架（list）进来即渲染：教学页不该要求用户先点一下才看到模型。 */
function syncViewer(): void {
  if (meta.value.kind === 'list') void nextTick(mountViewer)
  else unmountViewer()
}

onMounted(() => {
  session.switchTaskType(taskType.value)
  void content.load().then(syncViewer)
  syncViewer()
})
watch(taskType, (next) => {
  session.switchTaskType(next)
  void nextTick(syncViewer)
})
onBeforeUnmount(unmountViewer)

function back(): void {
  unmountViewer()
  void router.push({ name: 'menu' })
}

function goTo(next: TaskType): void {
  unmountViewer()
  void router.push({ name: 'task', params: { taskType: String(next) } })
}

// —— Unity 承载的任务（DEC-12：按需挂载 + 退出必须销毁）
//
// 这里的**关键取舍**：清单里没有该 TaskType 的构建时，**不去加载、也不假装在加载** ——
// 直接显示"产物未就位"并给出接入命令（docs/design/05）。
// 原因是 Unity 产物是人手动搬进来的，缺席是常态；旧做法"假设有"会表现为卡住/白屏，无从判断。
const unityContainer = ref<HTMLElement | null>(null)
const unityPhase = ref<'idle' | 'loading' | 'ready' | 'failed' | 'absent'>('idle')
const unityProgress = ref(0)
const unityFailure = ref<UnityFailure | null>(null)
/** Unity 侧是否已完成协议握手（DEC-07）；显示在状态条上，冒烟也断言它 */
const bridgeReady = ref(false)
let unityHandle: UnityHandle | null = null
/** 已挂载的构建键（响应式：模板要显示它，**不能**直接引用非响应式的 `unityHandle`） */
const unityKey = ref<string | null>(null)
const bridge = new UnityBridge()

const unityBuild = computed(() => runtime.unityBuildFor(taskType.value))

async function mountUnityView(): Promise<void> {
  if (unityHandle) return
  const build = unityBuild.value
  if (!build || !unityContainer.value) {
    unityPhase.value = 'absent'
    return
  }
  unityPhase.value = 'loading'
  unityProgress.value = 0
  unityFailure.value = null
  try {
    unityHandle = await mountUnity({
      container: unityContainer.value,
      build,
      bridge,
      onProgress: (value) => {
        unityProgress.value = value
      },
    })
    unityKey.value = unityHandle.key
    unityPhase.value = 'ready'
    // 握手是 Unity 侧主动调 `__WSU3_BRIDGE__.onReady` 完成的（DEC-07）——
    // 这里轮询几秒把它读出来显示在状态条上，**让"握没握手"变成看得见的事实**
    // （冒烟也断言这一条，否则"加载完成但协议没通"会被当成成功）。
    const started = Date.now()
    const poll = window.setInterval(() => {
      if (bridge.isReady() === true) {
        bridgeReady.value = true
        window.clearInterval(poll)
      } else if (Date.now() - started > 3000) {
        window.clearInterval(poll)
      }
    }, 200)
  } catch (cause) {
    unityHandle = null
    unityFailure.value = cause as UnityFailure
    unityPhase.value = 'failed'
  }
}

async function unmountUnityView(): Promise<void> {
  const handle = unityHandle
  unityHandle = null
  unityKey.value = null
  if (handle) await handle.unmount()
  if (unityPhase.value !== 'absent') unityPhase.value = 'idle'
}

/** Unity 类任务进页面就尝试挂载（DEC-53：先尝试，失败再给出口，不提前阻拦）。 */
function syncUnity(): void {
  if (unity.value) void nextTick(mountUnityView)
  else void unmountUnityView()
}

onMounted(() => {
  void runtime.load().then(syncUnity)
  syncUnity()
})
watch([taskType, () => runtime.unityState], () => void nextTick(syncUnity))
onBeforeUnmount(() => void unmountUnityView())

const nextTask = computed<TaskType | null>(() => {
  const index = TASK_TYPES.indexOf(taskType.value)
  return index >= 0 && index < TASK_TYPES.length - 1 ? TASK_TYPES[index + 1] : null
})

function finish(): void {
  progress.complete(taskType.value)
  const next = nextTask.value
  if (next !== null) goTo(next)
}
</script>

<template>
  <AppShell
    :crumb="`目录 / ${content.project.title}`"
    :badges="[
      `已完成 ${progress.completedCount} / ${progress.total}`,
      stackOf(taskType) === ViewerStack.Unity ? 'Unity' : 'Three',
      '游客',
    ]"
    route
    :active-task="taskType"
    actions
    :status-left="`[ ${labelOf(taskType)} ] ${meta.hint}`"
    :status-right="
      unity
        ? `桥协议 v${BRIDGE_PROTOCOL_VERSION} · ` +
          (bridgeReady ? '已握手' : unityBuild?.bridge ? '待握手' : '该构建未声明桥支持')
        : `桥协议 v${BRIDGE_PROTOCOL_VERSION} · 进度已存本机`
    "
    @select-task="goTo"
    @back="back"
  >
    <div class="app-task">
      <!-- article：正文 + 步骤侧栏 -->
      <div v-if="meta.kind === 'article'" class="app-split">
        <div class="ui-panel">
          <div class="ui-panel__head">
            {{ content.titleOf(taskType) }}
            <span class="ui-panel__right">
              <span class="ui-badge ui-badge--info">{{ labelOf(taskType) }}</span>
            </span>
          </div>
          <div class="ui-panel__body ui-col" style="overflow: auto">
            <div class="ui-article">
              <p v-for="(paragraph, index) in task?.paragraphs ?? []" :key="index">{{ paragraph }}</p>
              <p v-if="!task">本任务的内容尚未交付（`content/projects/*.json`）。</p>
            </div>
            <div class="app-grow" />
            <button class="ui-btn ui-btn--primary ui-btn--block" @click="finish">
              <Check :size="14" />
              {{ nextTask !== null ? `完成并前往：${labelOf(nextTask)}` : '完成全部任务' }}
            </button>
          </div>
        </div>

        <div class="ui-panel">
          <div class="ui-panel__head">当前步骤</div>
          <div class="ui-panel__body ui-col">
            <div v-for="(step, index) in task?.steps ?? []" :key="step.id" class="ui-row">
              <span class="ui-badge">{{ index + 1 }}</span>
              <span>{{ step.text }}</span>
            </div>
            <div v-if="!task?.steps?.length" class="ui-muted">暂无步骤内容。</div>
          </div>
        </div>
      </div>

      <!-- list：条目 + 三维展示（Three 承载） -->
      <div v-else-if="meta.kind === 'list'" class="app-split">
        <div class="ui-panel">
          <div class="ui-panel__head">
            {{ content.titleOf(taskType) }}
            <span class="ui-panel__right">
              <span class="ui-badge ui-badge--info">Three.js · 可旋转</span>
            </span>
          </div>
          <div class="ui-panel__body ui-col" style="overflow: auto">
            <div class="ui-article" style="font-size: var(--fs-14)">
              <p v-for="(paragraph, index) in task?.paragraphs ?? []" :key="index">{{ paragraph }}</p>
            </div>
            <div class="ui-row" style="gap: var(--sp-3)">
              <div class="ui-iconitem ui-iconitem--active">
                <span class="ui-iconitem__icon">⚙</span>
                <span class="ui-iconitem__name">数字万用表</span>
                <span class="ui-iconitem__sub">已就位</span>
              </div>
              <div class="ui-iconitem">
                <span class="ui-iconitem__icon">⌁</span>
                <span class="ui-iconitem__name">直流稳压电源</span>
                <span class="ui-iconitem__sub">待接线</span>
              </div>
            </div>
            <button class="ui-btn ui-btn--primary ui-btn--block" @click="finish">
              <Check :size="14" /> 完成并继续
            </button>
          </div>
        </div>

        <div class="ui-panel" style="display: flex; flex-direction: column">
          <div class="ui-panel__head">
            三维模型
            <span class="ui-panel__right">
              <button class="ui-btn ui-btn--sm" @click="mounted ? unmountViewer() : mountViewer()">
                <Move3d :size="14" /> {{ mounted ? '卸载' : '重新加载' }}
              </button>
            </span>
          </div>
          <div class="ui-panel__body" style="flex: 1; min-height: 0; padding: 0">
            <div ref="viewport" class="app-viewport">
              <span class="ui-viewport__hint">Three.js · 视口按容器比例自适应</span>
            </div>
          </div>
        </div>
      </div>

      <!-- practice：Unity 承载（Phase 4 接 WebGL；现在给一致的骨架 + 明确的下一步） -->
      <div v-else-if="meta.kind === 'practice'" class="app-split">
        <div class="ui-panel">
          <div class="ui-panel__head">
            {{ content.titleOf(taskType) }}
            <span class="ui-panel__right">
              <span class="ui-badge">Unity 承载</span>
            </span>
          </div>
          <div class="ui-panel__body ui-col">
            <div class="ui-article" style="font-size: var(--fs-14)">
              <p v-for="(paragraph, index) in task?.paragraphs ?? []" :key="index">{{ paragraph }}</p>
              <p>
                该任务由 Unity WebGL 承载（DEC-12/DEC-06）。当前 Unity 产物尚未接入（Phase 4），
                因此这里先占用同一块视口位置，接口与桥协议已就位（v{{ BRIDGE_PROTOCOL_VERSION }}）。
              </p>
            </div>
            <div class="ui-alert ui-alert--info">
              <span class="ui-alert__icon">i</span>
              <span>移动端说明：进入 Unity 类任务会先尝试加载，失败再提示（DEC-53），不提前阻拦。</span>
            </div>
          </div>
        </div>

        <div class="ui-panel" style="display: flex; flex-direction: column">
          <div class="ui-panel__head">
            三维视口（Unity）
            <span class="ui-panel__right">
              <span v-if="unityPhase === 'ready'" class="ui-badge ui-badge--ok">已挂载 · {{ unityKey }}</span>
              <span v-else-if="unityPhase === 'loading'" class="ui-badge ui-badge--info">
                <LoaderCircle :size="12" /> 加载中 {{ Math.round(unityProgress * 100) }}%
              </span>
              <span v-else-if="unityPhase === 'absent'" class="ui-badge ui-badge--warn">产物未就位</span>
              <span v-else-if="unityPhase === 'failed'" class="ui-badge ui-badge--err">加载失败</span>
              <span v-else class="ui-badge">待进入</span>
            </span>
          </div>
          <div class="ui-panel__body" style="flex: 1; min-height: 0; padding: 0">
            <div class="app-viewport">
              <!-- 真 Unity 挂载点：由 UnityLoader 在这里创建 canvas -->
              <div ref="unityContainer" style="position: absolute; inset: 0"></div>

              <div v-if="unityPhase === 'absent'" class="ui-viewport__center">
                <TriangleAlert :size="18" style="color: var(--warn-text)" />
                <div style="color: var(--text-1); font-weight: 600">Unity 产物未包含在本次发布里</div>
                <div style="max-width: 520px; line-height: 1.8">
                  这是一个<b>明确状态</b>，不是"加载中卡住"：发布清单（release-manifest.json）里没有该任务的构建。
                  接入方式见 <code>docs/design/05-unity-packaging-pipeline.md</code>：<br />
                  <code
                    >node tools/pipeline/unity-stage.mjs --from &lt;Unity 构建目录&gt; --key
                    {{ unityBuild?.key ?? 'training' }} --task-type {{ taskType }}</code
                  >
                </div>
                <div v-if="runtime.unityState === 'unknown'" class="ui-muted" style="font-size: var(--fs-11)">
                  （当前没读到发布清单 —— dev 直跑属正常；走
                  <code>tools/pipeline/pack.mjs</code> 打包才会有清单）
                </div>
              </div>

              <div v-else-if="unityPhase === 'failed'" class="ui-viewport__center">
                <TriangleAlert :size="18" style="color: var(--err-text)" />
                <div style="color: var(--text-1); font-weight: 600">Unity 加载失败</div>
                <div style="max-width: 520px; line-height: 1.8">
                  {{ unityFailure?.message ?? '未知原因' }}
                  <br />（超时 25s、已重试 1 次 —— DEC-71 的落地参数）
                </div>
                <div class="ui-row" style="justify-content: center">
                  <button class="ui-btn ui-btn--sm" @click="unmountUnityView().then(mountUnityView)">
                    重试
                  </button>
                  <button class="ui-btn ui-btn--sm" @click="back()">返回目录</button>
                </div>
              </div>

              <div v-else-if="unityPhase === 'loading'" class="ui-viewport__center">
                <LoaderCircle :size="18" />
                <div>正在加载 Unity WebGL…{{ Math.round(unityProgress * 100) }}%</div>
                <div class="ui-muted" style="font-size: var(--fs-11)">
                  超过 25s 会判定失败并给出出口（DEC-53/DEC-71）
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 其余骨架（video / quiz / exam）：Phase 3 交付，但外壳与站点线已经是真实导航 -->
      <div v-else class="app-split">
        <div class="ui-panel">
          <div class="ui-panel__head">{{ content.titleOf(taskType) }}</div>
          <div class="ui-panel__body ui-col">
            <div class="ui-article" style="font-size: var(--fs-14)">
              <p>{{ meta.hint }} —— 该骨架（{{ meta.kind }}）在 Phase 3 交付。</p>
              <p>
                现在这一页的意义是：站点线、进度记录、技术栈分流已经能真实走通；
                换掉中间的主体容器即可，外壳与导航不需要动。
              </p>
            </div>
            <div class="ui-row">
              <span class="ui-badge ui-badge--info"> <Play :size="12" /> {{ meta.kind }} </span>
              <span class="ui-badge">{{ unity ? 'Unity' : 'Three' }}</span>
            </div>
            <button class="ui-btn ui-btn--primary ui-btn--block" @click="finish">
              <Check :size="14" /> 标记完成并继续
            </button>
          </div>
        </div>
        <div class="ui-panel">
          <div class="ui-panel__head">下一步</div>
          <div class="ui-panel__body ui-col">
            <div
              v-for="type in TASK_TYPES.slice(TASK_TYPES.indexOf(taskType) + 1)"
              :key="type"
              class="ui-row"
            >
              <ChevronRight :size="14" />
              <span class="ui-muted">{{ labelOf(type) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppShell>
</template>
