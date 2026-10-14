<script setup lang="ts">
/**
 * 任务页 —— Phase 1 的"端到端一页"（DEC-75）。
 *
 * 关键设计：**不是每个 TaskType 写一个页面**，而是"登记表驱动 + 少数几种骨架"
 * （见 `domain/registry.ts` 的 TaskPageKind 与 `docs/design/01-tasktype-registry.md`）：
 *   article  —— 一段正文（目的 / 简介）
 *   list     —— 条目 + 三维展示（仪器 / 结构）
 *   video    —— 视频 + 说明（原理；DEC-99：单段视频时不出现列表）
 *   model    —— 左三维 + 右图文（简介；DEC-98）
 *   quiz/exam—— 题目控件（小测验 / 考核）
 *   practice —— 仿真操作（Unity 承载）
 * 每做实一种骨架，站点线、进度、栈切换这些**框架能力**就被真实走一遍。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Check, ChevronRight, Move3d, Play, TriangleAlert, LoaderCircle } from 'lucide-vue-next'
import AppShell from '@/components/AppShell.vue'
import { TaskType, TASK_TYPES, BRIDGE_PROTOCOL_VERSION, ViewerStack } from '@/contracts'
import { labelOf, metaOf, stackOf, isUnityTask } from '@/domain/registry'
import { showsPlaylist, videoNameAt, videoSectionsOf } from '@/domain/principle'
import { useSessionStore } from '@/stores/session'
import { useProgressStore } from '@/stores/progress'
import { useContentStore } from '@/stores/content'
import { useRuntimeStore } from '@/stores/runtime'
import { Viewer } from '@/viewer/Viewer'
import { ModelStage } from '@/viewer/ModelStage'
import { deviceOfProject, loadSceneTables, modelOfDevice } from '@/viewer/scene-assets'
import { loadVideoIndex, videoFileOf, videoUrlOf } from '@/viewer/video-assets'
import { UnityBridge } from '@/unity/UnityBridge'
import { mountUnity, type UnityFailure, type UnityHandle } from '@/unity/UnityLoader'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const progress = useProgressStore()
const content = useContentStore()
const runtime = useRuntimeStore()

/** URL 里的项目（`?project=clip_contactor`）；缺省时用菜单第一项 —— 这样 `#/task/8` 也能落到真实项目上 */
const projectId = computed(() => (typeof route.query.project === 'string' ? route.query.project : undefined))
const taskType = computed<TaskType>(() => {
  const raw = Number(route.params.taskType)
  return TASK_TYPES.includes(raw as TaskType) ? (raw as TaskType) : TaskType.Purpose
})
const meta = computed(() => metaOf(taskType.value))
/**
 * 当前任务在**本项目**里的内容。`undefined` = 这个项目没启用这个任务
 * （采纳数据里每个 clip 只有一部分槽位非空，见 `domain/adopted-content.ts`）。
 */
const task = computed(() => content.taskOf(taskType.value))
const unity = computed(() => isUnityTask(taskType.value))
/** 本项目启用的任务（契约顺序）—— 上一/下一站、可达性都按它走，不按全局契约顺序 */
const enabledTypes = computed(() => content.enabledTypesOf())
const questions = computed(() => content.questionsOf(taskType.value))

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
  // 「左三维 + 右图文」（Info，DEC-98）用的是另一个舞台：要环境、要渲染期后加载贴图
  if (meta.value.kind === 'model') void nextTick(mountModelStage)
  else unmountModelStage()
  // 原理页（video，DEC-99）：要先去清单里确认"这段视频在不在这次产物里"
  if (meta.value.kind === 'video') void nextTick(mountVideo)
  else unmountVideo()
}

// —— Info 页的三维区（DEC-98）：影棚 HDRI 当 IBL + 画布透明 + 贴图后加载 ——
// 取件口径：项目 id → 器件段 → 转换报告里的 GLB；材质按 `asset-material-spec.json` 解算。
// **不硬编**器件、模型与贴图路径 —— 三张表都是流水线产物，随包发布（见 viewer/scene-assets.ts）。
const modelViewport = ref<HTMLElement | null>(null)
const modelPhase = ref<'idle' | 'loading' | 'ready' | 'failed' | 'absent'>('idle')
const modelError = ref<string | null>(null)
let modelStage: ModelStage | null = null
let modelUrl: string | null = null

/** 冒烟探针：与 `__WSU3_VIEWER__` 同一约定（读 `renderStats` / `solveRecords`）。 */
type ModelProbe = Window & { __WSU3_MODEL__?: ModelStage | null }

async function mountModelStage(): Promise<void> {
  const container = modelViewport.value
  if (!container) return
  const device = deviceOfProject(content.project?.id)
  if (!device) {
    modelPhase.value = 'absent'
    modelError.value = `项目「${content.project?.title ?? '—'}」不是器件项目，没有对应的三维模型。`
    return
  }
  modelStage ??= new ModelStage({ container })
  modelStage.start()
  let tables: Awaited<ReturnType<typeof loadSceneTables>>
  try {
    tables = await loadSceneTables()
  } catch (cause) {
    // 三张元数据表读不到 = **资产没随这次发布走**（大资产按 DEC-57 不进 git，干净 checkout 上就是没有）。
    // 这是"明确状态"，不是"加载失败" —— 两者在页面上的文案不同，冒烟也按它判：
    // 卡在加载中才算失败，明确报告未包含是合格结果（与 Unity 产物缺席同一口径）。
    modelPhase.value = 'absent'
    modelError.value = cause instanceof Error ? cause.message : String(cause)
    return
  }
  try {
    const model = modelOfDevice(tables, device)
    if (!model) {
      modelPhase.value = 'absent'
      modelError.value = `本次产物里没有器件「${device}」的模型（转换报告里查不到）。`
      return
    }
    // 已经挂着同一个模型就不重载（项目没变时会被同步函数反复调到）
    if (modelUrl === model.url && modelPhase.value === 'ready') return
    modelPhase.value = 'loading'
    modelError.value = null
    const loaded = await modelStage.loadModel(model.url, { device, tables })
    // `null` = 这次加载已被更新的请求取代（例如刚切了项目）——**不要把过期结果写进页面**
    if (!loaded) return
    modelUrl = model.url
    modelPhase.value = 'ready'
    ;(window as ModelProbe).__WSU3_MODEL__ = modelStage
  } catch (cause) {
    modelPhase.value = 'failed'
    modelError.value = cause instanceof Error ? cause.message : String(cause)
  }
}

function unmountModelStage(): void {
  ;(window as ModelProbe).__WSU3_MODEL__ = null
  modelStage?.dispose()
  modelStage = null
  modelUrl = null
  modelPhase.value = 'idle'
  modelError.value = null
}

// —— 原理页（video，DEC-99）：左视频 + 右说明；**单段视频时不出现列表** ——
// 取件口径与三维资产同源：数据里的 `videoName`（`01jcq_yl`）→ 产物里的 `/assets/video/01jcq_yl.mp4`。
// **判据是产物里的清单**（`_meta/index.json`），不是"试着去播"：缺了就显示明确状态，
// 不让 `<video>` 去打一个必然 404 的请求（冒烟要求 console 零错误）。
const videoSections = computed(() => videoSectionsOf(task.value))
const playlistVisible = computed(() => showsPlaylist(videoSections.value))
/** 当前段（多段视频时列表可切；单段时恒为 0）。 */
const currentSection = ref(0)
const videoPhase = ref<'idle' | 'loading' | 'ready' | 'absent' | 'failed'>('idle')
const videoError = ref<string | null>(null)
const videoSrc = ref<string | null>(null)
const videoEl = ref<HTMLVideoElement | null>(null)
/** 已经挂上的那段（同名不重挂，避免同步函数反复触发时把正在播的视频重置回 0 秒）。 */
let mountedVideoName: string | null = null

/** 当前要播的那一段的 `videoName`（单段时恒为第 0 段）。 */
const currentVideoName = computed(() => videoNameAt(task.value, currentSection.value))
/** 右栏"原理说明"显示的就是**当前段**的标题与正文（换段要跟着换）。 */
const currentSectionTitle = computed(() => videoSections.value[currentSection.value]?.title ?? '')
const currentSectionText = computed(() => videoSections.value[currentSection.value]?.text ?? '')

/** 冒烟探针：与 `__WSU3_VIEWER__` / `__WSU3_MODEL__` 同一约定。 */
type VideoProbe = Window & {
  __WSU3_VIDEO__?: {
    phase: typeof videoPhase.value
    src: string | null
    sections: number
    playlist: boolean
    name: string | null
  } | null
}

function publishVideoProbe(): void {
  ;(window as VideoProbe).__WSU3_VIDEO__ =
    meta.value.kind === 'video'
      ? {
          phase: videoPhase.value,
          src: videoSrc.value,
          sections: videoSections.value.length,
          playlist: playlistVisible.value,
          name: currentVideoName.value,
        }
      : null
}

async function mountVideo(): Promise<void> {
  if (meta.value.kind !== 'video') return
  const name = currentVideoName.value
  if (!name) {
    videoPhase.value = 'absent'
    videoError.value = '本项目的「原理」里没有讲解视频（数据里没有 videoName）。'
    publishVideoProbe()
    return
  }
  if (mountedVideoName === name && videoPhase.value === 'ready') {
    publishVideoProbe()
    return
  }
  videoPhase.value = 'loading'
  videoError.value = null
  videoSrc.value = null
  mountedVideoName = null
  publishVideoProbe()
  let index: Awaited<ReturnType<typeof loadVideoIndex>>
  try {
    index = await loadVideoIndex()
  } catch (cause) {
    // 清单读不到 = **视频没随这次发布走**（不进 git 的大资产，干净 checkout 上就是没有）。
    // 这是"明确状态"，不是"播放失败" —— 两者文案不同，冒烟也按它判。
    videoPhase.value = 'absent'
    videoError.value = cause instanceof Error ? cause.message : String(cause)
    publishVideoProbe()
    return
  }
  const url = videoUrlOf(name, index)
  if (!url) {
    videoPhase.value = 'absent'
    videoError.value = `本次产物里没有讲解视频「${videoFileOf(name)}」。`
    publishVideoProbe()
    return
  }
  // 过期保护：await 期间可能又切了任务 / 切了项目（与 ModelStage 的同类保护一个道理）
  if (meta.value.kind !== 'video' || currentVideoName.value !== name) return
  mountedVideoName = name
  videoSrc.value = url
  videoPhase.value = 'ready'
  publishVideoProbe()
}

function unmountVideo(): void {
  ;(window as VideoProbe).__WSU3_VIDEO__ = null
  videoEl.value?.pause()
  videoSrc.value = null
  mountedVideoName = null
  currentSection.value = 0
  videoPhase.value = 'idle'
  videoError.value = null
}

/** 列表里换一段：换的是**播放对象**，所以要把视频重新挂上（不保留旧的播放位置）。 */
function selectSection(index: number): void {
  if (index === currentSection.value) return
  currentSection.value = index
  void mountVideo()
}

/** `<video>` 自己报错（例如文件在清单里但读盘失败）—— 这是"播放失败"，不是"未包含"。 */
function onVideoError(): void {
  if (meta.value.kind !== 'video') return
  videoPhase.value = 'failed'
  videoError.value = `视频文件读不出来：${videoSrc.value ?? '—'}`
  publishVideoProbe()
}

/**
 * 内容可能**晚于**导航到位：SPA 里换 `?project=` 只更新 URL，项目数据是异步取的。
 * 在它到达之前，页面会先落到"本项目未启用"分支（没有视口容器），
 * 所以内容到位时**必须再同步一次**，否则视口永远挂不上（`mountViewer` 拿不到容器就静默返回）。
 * 信号里带**项目 id**：Info 页的三维模型是跟着项目走的，换项目必须换模型。
 */
const viewerSignal = computed(
  () => `${meta.value.kind}:${task.value ? 'on' : 'off'}:${content.project?.id ?? ''}`,
)
watch(viewerSignal, () => void nextTick(syncViewer))

onMounted(async () => {
  session.switchTaskType(taskType.value)
  // 内容先到位再挂视口：菜单 → 项目 → 题库，全部幂等（内容层自己缓存）
  await content.ensureCatalog()
  await content.ensureProject(projectId.value)
  await content.loadBank()
  syncViewer()
  void runtime.load().then(syncUnity)
  syncUnity()
})
watch([taskType, projectId], ([next, nextProject], [previous, previousProject]) => {
  session.switchTaskType(next)
  // 换项目 = 换内容：原理页的"当前段"要回到第一段（否则会拿着上一个项目的段号）
  if (nextProject !== previousProject) currentSection.value = 0
  if (next !== previous) void nextTick(syncViewer)
  // URL 里的项目变了要**重新取项目**：hash 跳转不会重载页面，不重取就会一直用上一个项目
  // （`ensureProject` 幂等：目标项目已在手上时直接返回）
  void content.ensureProject(projectId.value)
})
onBeforeUnmount(unmountViewer)
onBeforeUnmount(unmountModelStage)
onBeforeUnmount(unmountVideo)

function back(): void {
  unmountViewer()
  void router.push({ name: 'menu' })
}

/** 切任务时**带上当前项目**，否则会悄悄回到菜单第一个项目。 */
function goTo(next: TaskType): void {
  unmountViewer()
  void router.push({
    name: 'task',
    params: { taskType: String(next) },
    query: content.project ? { project: content.project.id } : {},
  })
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

// 挂载/卸载 Unity 的时机：任务变化、或发布清单读完（清单决定"有没有构建"）——
// 首次进入的调用在主 `onMounted` 里（那时才保证内容已到位）。
watch([taskType, () => runtime.unityState], () => void nextTick(syncUnity))
onBeforeUnmount(() => void unmountUnityView())

/**
 * 下一站 = **本项目启用的任务**里的下一个（契约顺序），不是全局 `TASK_TYPES`。
 * 采纳数据里每个器件只启用一部分槽位（例：接触器只有 原理/简介/结构/测量），
 * 按全局顺序走会一路撞上"本项目未启用"。
 */
const nextTask = computed<TaskType | null>(() => {
  const types = enabledTypes.value
  if (types.length === 0) return null
  const index = types.indexOf(taskType.value)
  return index < 0 ? (types[0] ?? null) : (types[index + 1] ?? null)
})

function finish(): void {
  progress.complete(taskType.value)
  const next = nextTask.value
  if (next !== null) goTo(next)
}
</script>

<template>
  <AppShell
    :crumb="`目录 / ${content.project?.title ?? '未选择项目'}`"
    :badges="[
      `已完成 ${progress.completedCount} / ${progress.total}`,
      stackOf(taskType) === ViewerStack.Unity ? 'Unity' : 'Three',
      '游客',
    ]"
    route
    :active-task="taskType"
    actions
    :status-left="content.projectError ?? `[ ${labelOf(taskType)} ] ${meta.hint}`"
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
      <!--
        本项目未启用该任务（采纳数据里该槽位是 `null`）—— 这是个**明确状态**，
        不是"加载失败"：直接说清并给出本项目真正可去的任务。
        Unity 类任务不走这里：它的内容由 Unity 侧自己带（见下面的 practice 分支）。
      -->
      <div v-if="!task && !unity" class="app-split">
        <div class="ui-panel">
          <div class="ui-panel__head">
            {{ labelOf(taskType) }}
            <span class="ui-panel__right">
              <span class="ui-badge ui-badge--warn">本项目未启用</span>
            </span>
          </div>
          <div class="ui-panel__body ui-col">
            <div class="ui-article">
              <p>
                内容数据里，项目「{{ content.project?.title ?? '—' }}」没有为
                <b>{{ labelOf(taskType) }}</b> 提供内容（槽位为 <code>null</code>）。 这不是加载失败 ——
                采纳数据的每个器件只启用一部分任务。
              </p>
            </div>
            <div class="ui-row" style="flex-wrap: wrap">
              <button v-for="type in enabledTypes" :key="type" class="ui-btn ui-btn--sm" @click="goTo(type)">
                {{ labelOf(type) }}
              </button>
            </div>
            <div class="app-grow" />
            <button class="ui-btn ui-btn--block" @click="back()">返回项目目录</button>
          </div>
        </div>
      </div>

      <!-- model：左三维 + 右图文（Info，DEC-98 —— 形态与排版稿 C6 同构） -->
      <div v-else-if="meta.kind === 'model'" class="app-split">
        <!-- 左：三维区。画布透明 ⇒ 底色就是这个毛玻璃框（与排版稿一致） -->
        <div class="ui-panel app-model">
          <div class="ui-panel__body ui-panel__body--flush app-model__body">
            <div ref="modelViewport" class="app-model__stage" />
            <div v-if="modelPhase === 'loading'" class="ui-viewport__center">
              <LoaderCircle :size="18" />
              <div>正在加载三维模型…</div>
            </div>
            <!-- 缺资产/缺模型是**明确状态**，不是"一直在转圈"（同 Unity 产物的纪律） -->
            <div v-else-if="modelPhase === 'absent' || modelPhase === 'failed'" class="ui-viewport__center">
              <div>
                <div style="color: var(--text-1); font-weight: 600">
                  {{ modelPhase === 'absent' ? '本项目没有三维模型' : '三维模型没能加载' }}
                </div>
                <div style="max-width: 460px; line-height: 1.8">{{ modelError }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右：简介。列宽 380px 由 .app-split 给；**不放"完成并前往"** —— 排版稿 C6 没有这个控件，
             导航由站点线承担（DEC-98；DEC-40 也明确 Info 这类无交互的可以只有进入） -->
        <div class="ui-panel">
          <div class="ui-panel__head">简介</div>
          <div class="ui-panel__body ui-col" style="overflow: auto">
            <div class="ui-article">
              <p v-for="(paragraph, index) in task?.paragraphs ?? []" :key="`p${index}`">
                {{ paragraph }}
              </p>
              <template v-for="(section, index) in task?.sections ?? []" :key="`s${index}`">
                <p v-if="section.title">
                  <b>{{ section.title }}</b>
                </p>
                <p>{{ section.text }}</p>
              </template>
              <p v-if="!(task?.paragraphs.length || task?.sections.length)">
                该任务在内容数据里没有文字（由三维承担）。
              </p>
            </div>
            <!-- 徽标只写数据里真有的（不编造"预计 45 分钟""中职/高职"这类排版稿上的示意值） -->
            <div class="ui-row" style="flex-wrap: wrap">
              <span class="ui-badge">{{ enabledTypes.length }} 个任务</span>
              <span class="ui-badge ui-badge--info">Three.js · 可旋转</span>
            </div>
          </div>
        </div>
      </div>

      <!-- article：正文 + 本项目任务 -->
      <div v-else-if="meta.kind === 'article'" class="app-split">
        <div class="ui-panel">
          <div class="ui-panel__head">
            {{ content.titleOf(taskType) }}
            <span class="ui-panel__right">
              <span class="ui-badge ui-badge--info">{{ labelOf(taskType) }}</span>
            </span>
          </div>
          <div class="ui-panel__body ui-col" style="overflow: auto">
            <div class="ui-article">
              <p v-for="(paragraph, index) in task?.paragraphs ?? []" :key="`p${index}`">{{ paragraph }}</p>
              <template v-for="(section, index) in task?.sections ?? []" :key="`s${index}`">
                <p v-if="section.title">
                  <b>{{ section.title }}</b>
                </p>
                <p>{{ section.text }}</p>
              </template>
              <p v-if="!(task?.paragraphs.length || task?.sections.length)">
                该任务在内容数据里没有文字（由三维或 Unity 侧承担）。
              </p>
            </div>
            <div class="app-grow" />
            <button class="ui-btn ui-btn--primary ui-btn--block" @click="finish">
              <Check :size="14" />
              {{ nextTask !== null ? `完成并前往：${labelOf(nextTask)}` : '完成全部任务' }}
            </button>
          </div>
        </div>

        <div class="ui-panel">
          <div class="ui-panel__head">
            本项目任务
            <span class="ui-panel__right">
              <span class="ui-badge">{{ enabledTypes.length }} 站</span>
            </span>
          </div>
          <div class="ui-panel__body ui-col">
            <button
              v-for="type in enabledTypes"
              :key="type"
              class="ui-btn ui-btn--sm"
              :class="{ 'ui-btn--primary': type === taskType }"
              @click="goTo(type)"
            >
              {{ content.titleOf(type) }}
              <span class="ui-muted">{{ labelOf(type) }}</span>
            </button>
            <div class="ui-muted" style="font-size: var(--fs-11)">
              步骤内容由 Unity 侧提供，本页不假装有步骤（见 `docs/design/09`）。
            </div>
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
              <p v-for="(paragraph, index) in task?.paragraphs ?? []" :key="`p${index}`">{{ paragraph }}</p>
              <template v-for="(section, index) in task?.sections ?? []" :key="`s${index}`">
                <p v-if="section.title">
                  <b>{{ section.title }}</b>
                </p>
                <p>{{ section.text }}</p>
              </template>
              <p>
                该任务由 <b>Unity WebGL</b> 承载（DEC-06/DEC-12）：画面在右侧视口，桥协议 v{{
                  BRIDGE_PROTOCOL_VERSION
                }}。
              </p>
              <p v-if="!task" class="ui-muted">
                内容数据里没有该任务的槽位 —— Unity 类任务的**操作内容由 Unity 侧自带**
                （它读自己那份数据），所以这里没有文字是正常的。
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
                    >node tools/pipeline/unity-stage.mjs --from &lt;Unity 构建目录&gt; --key main --task-types
                    4,5,8,9</code
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

      <!-- quiz / exam：题目（项目自备题组优先，考核回落到题库的 Exam 池）—— 真实数据 -->
      <div v-else-if="meta.kind === 'quiz' || meta.kind === 'exam'" class="app-split">
        <div class="ui-panel">
          <div class="ui-panel__head">
            {{ content.titleOf(taskType) }}
            <span class="ui-panel__right">
              <span class="ui-badge ui-badge--info">共 {{ questions.length }} 题</span>
            </span>
          </div>
          <div class="ui-panel__body ui-col" style="overflow: auto">
            <div
              v-for="(question, index) in questions"
              :key="question.id"
              class="ui-col"
              style="gap: var(--sp-2); border-bottom: 1px solid var(--border-2); padding-bottom: var(--sp-3)"
            >
              <div class="ui-row">
                <span class="ui-badge">{{ index + 1 }}</span>
                <span>{{ question.text }}</span>
              </div>
              <div
                v-for="option in question.options"
                :key="option.text"
                class="ui-row"
                style="padding-left: var(--sp-7)"
              >
                <span class="ui-muted">{{ option.text }}</span>
              </div>
            </div>
            <div v-if="questions.length === 0" class="ui-muted">
              这道任务既没有项目题组，题库里也没有可用题目。
            </div>
            <div class="ui-alert ui-alert--info">
              <span class="ui-alert__icon">i</span>
              <span>作答、判分与成绩单在后续交付（DEC-40）；本页先确认**题库与题组被真实读到**。</span>
            </div>
            <button class="ui-btn ui-btn--primary ui-btn--block" @click="finish">
              <Check :size="14" />
              {{ nextTask !== null ? `完成并前往：${labelOf(nextTask)}` : '完成全部任务' }}
            </button>
          </div>
        </div>
        <div class="ui-panel">
          <div class="ui-panel__head">本项目任务</div>
          <div class="ui-panel__body ui-col">
            <button
              v-for="type in enabledTypes"
              :key="type"
              class="ui-btn ui-btn--sm"
              :class="{ 'ui-btn--primary': type === taskType }"
              @click="goTo(type)"
            >
              {{ content.titleOf(type) }}
            </button>
          </div>
        </div>
      </div>

      <!-- video：原理页（DEC-99）—— 左视频 + 右说明；**单段视频时不出现列表**
           （采纳数据里 8 个项目各只有 1 段，所以"没有列表"这一档才是常态）
           形态对着排版稿 C4 与样式成果页第八节的两档对照。 -->
      <div v-else-if="meta.kind === 'video'" class="app-split">
        <div class="ui-panel app-video">
          <div class="ui-panel__head">
            {{ content.titleOf(taskType) }}
            <span class="ui-panel__right">
              <span class="ui-badge ui-badge--info">Three.js</span>
              <span v-if="currentVideoName" class="ui-badge">{{ currentVideoName }}</span>
            </span>
          </div>
          <div class="ui-panel__body ui-panel__body--flush app-video__body">
            <video
              v-if="videoPhase === 'ready' && videoSrc"
              ref="videoEl"
              class="app-video__el"
              :src="videoSrc"
              controls
              playsinline
              preload="metadata"
              @error="onVideoError"
            />
            <div v-if="videoPhase === 'idle' || videoPhase === 'loading'" class="ui-viewport__center">
              <LoaderCircle :size="18" />
              <div>正在载入讲解视频…</div>
            </div>
            <!-- 缺视频是**明确状态**，不是"一直在转圈"（同三维资产与 Unity 产物的纪律） -->
            <div v-else-if="videoPhase === 'absent' || videoPhase === 'failed'" class="ui-viewport__center">
              <div>
                <div style="color: var(--text-1); font-weight: 600">
                  {{ videoPhase === 'absent' ? '讲解视频未包含在本次发布里' : '讲解视频没能播放' }}
                </div>
                <div style="max-width: 460px; line-height: 1.8">{{ videoError }}</div>
                <div v-if="videoPhase === 'absent'" class="ui-small ui-muted" style="line-height: 1.8">
                  接入方式：
                  <code>node tools/pipeline/import-principle-videos.mjs --from &lt;来源工程根目录&gt;</code>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="app-video__side">
          <!-- 视频列表：**只有多段视频才出现** —— 单段时整块不渲染（见 domain/principle.ts 的规则） -->
          <div v-if="playlistVisible" class="ui-panel">
            <div class="ui-panel__head">
              视频列表
              <span class="ui-panel__right">
                <span class="ui-badge">{{ videoSections.length }} 段</span>
              </span>
            </div>
            <div class="ui-panel__body ui-playlist">
              <div
                v-for="(section, index) in videoSections"
                :key="`p${index}`"
                class="ui-playlist__item"
                :class="{ 'ui-playlist__item--active': index === currentSection }"
                @click="selectSection(index)"
              >
                <span class="ui-playlist__thumb"><Play :size="16" /></span>
                <span>
                  <span class="ui-playlist__name"
                    >{{ index + 1 }} · {{ section.title || `第 ${index + 1} 段` }}</span
                  >
                </span>
              </div>
            </div>
          </div>
          <div class="ui-panel">
            <div class="ui-panel__head">原理说明</div>
            <div class="ui-panel__body">
              <div v-if="currentSectionText" class="ui-article">
                <h3 v-if="currentSectionTitle">{{ currentSectionTitle }}</h3>
                <p>{{ currentSectionText }}</p>
              </div>
              <p v-else class="ui-small ui-muted">本段没有文字说明。</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 其余骨架：Phase 3 交付，但外壳与站点线已经是真实导航 -->
      <div v-else class="app-split">
        <div class="ui-panel">
          <div class="ui-panel__head">{{ content.titleOf(taskType) }}</div>
          <div class="ui-panel__body ui-col">
            <div class="ui-article" style="font-size: var(--fs-14)">
              <template v-for="(section, index) in task?.sections ?? []" :key="`s${index}`">
                <p v-if="section.title">
                  <b>{{ section.title }}</b>
                </p>
                <p>{{ section.text }}</p>
              </template>
              <p v-if="!task?.sections.length">
                {{ meta.hint }} —— 该骨架（{{ meta.kind }}）在 Phase 3 交付。
              </p>
            </div>
            <div class="ui-row" style="flex-wrap: wrap">
              <span v-for="section in task?.sections ?? []" :key="`v${section.title}`">
                <span v-if="section.videoName" class="ui-badge ui-badge--info">
                  <Play :size="12" /> {{ section.videoName }}
                </span>
              </span>
              <span class="ui-badge">{{ unity ? 'Unity' : 'Three' }}</span>
            </div>
            <button class="ui-btn ui-btn--primary ui-btn--block" @click="finish">
              <Check :size="14" /> 标记完成并继续
            </button>
          </div>
        </div>
        <div class="ui-panel">
          <div class="ui-panel__head">本项目后续任务</div>
          <div class="ui-panel__body ui-col">
            <div
              v-for="type in enabledTypes.slice(Math.max(enabledTypes.indexOf(taskType), -1) + 1)"
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
