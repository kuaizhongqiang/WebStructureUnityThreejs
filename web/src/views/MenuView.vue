<script setup lang="ts">
/**
 * 菜单 / 项目目录页（对应排版稿 A5 的最小可用版本）。
 *
 * 数据来自**被采纳的内容数据**：`content/data/MenuData.json` 给出 9 个项目
 * （8 个器件 + 小测验），每项指向 `ProjectData.json` 里的一个 clip。
 * 卡片上的"站数"是该项目**真正启用的任务数**（采纳数据里每个 clip 只有一部分槽位非空）——
 * 点进去只会走到有内容的站，不把用户送进空页面。
 *
 * 排版稿里 A5 标记为"待重做"（TODO T1），所以这里仍只用设计系统的既有组件。
 */
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
import { useContentStore } from '@/stores/content'
import { useProgressStore } from '@/stores/progress'
import { useRuntimeStore } from '@/stores/runtime'
import { labelOf } from '@/domain/registry'
import { ensureUnityInstance } from '@/unity/UnityHost'
import { TaskType } from '@/contracts'

const router = useRouter()
const content = useContentStore()
const progress = useProgressStore()

interface MenuCard {
  id: string
  title: string
  projectId: string
  /** 该项目启用的任务（站点线呈现顺序，DEC-148）；空 = 项目数据没到位 */
  types: TaskType[]
  summary: string
  /** 下一站：本项目里第一个未完成的任务 */
  next: TaskType | null
}

const cards = computed<MenuCard[]>(() =>
  content.menu.map((item) => {
    const project = content.projectOf(item.projectId)
    const types = content.enabledTypesOf(item.projectId)
    return {
      id: item.id,
      title: item.title,
      projectId: item.projectId,
      types,
      summary: project?.summary ?? '',
      next: types.find((type) => progress.statusOf(type) === 'unfinished') ?? types[0] ?? null,
    }
  }),
)

/** 已完成 / 总站数：按**全部项目的启用任务**算，而不是全局 11 个契约任务。 */
const totals = computed(() => {
  const all = cards.value.flatMap((card) => card.types)
  return { done: all.filter((type) => progress.statusOf(type) === 'completed').length, total: all.length }
})

function enter(card: MenuCard): void {
  if (card.next === null) return
  void router.push({
    name: 'task',
    params: { taskType: String(card.next) },
    query: { project: card.projectId },
  })
}

/**
 * 退出：回登录页（DEC-101 的流程 = `start → login → menu`）。
 *
 * 游客模式**没有会话要清**，所以这里只做页面流转 —— 本机进度存档（DEC-54）**保留**，
 * 再次以游客进入时进度还在。真正的"清档"是 `progress.reset()`，不该藏在退出按钮里。
 */
function exitToLogin(): void {
  void router.push({ name: 'login' })
}

onMounted(() => {
  void content.ensureCatalog()
  void preloadUnity()
})

/**
 * Unity 常驻实例的**预载**（D-25 / DEC-145：负责人口径"进 task 直接可交互"）。
 * 菜单页是 `start → login → menu` 的最后一段：在这里就把常驻实例建起来（幂等），
 * 之后进任何 Unity 任务都只是"搬画布"，没有加载进度条与 Unity 启动画面。
 *
 * 失败静默 —— 任务页挂靠时会重试并把失败原因摆出来（UnityHost 的失败状态会被清掉允许重试）；
 * 清单缺失（dev 直跑）时 `unityBuildFor` 返回 null，这里什么都不做。
 */
async function preloadUnity(): Promise<void> {
  const runtime = useRuntimeStore()
  await runtime.load()
  const build = runtime.unityBuildFor(TaskType.Structure) ?? runtime.unityBuilds[0] ?? null
  if (!build) return
  try {
    await ensureUnityInstance(build)
  } catch (cause) {
    console.warn('[menu] Unity 预载失败（进任务页会重试）：', cause)
  }
}
</script>

<template>
  <AppShell
    crumb="项目目录"
    :badges="[`已完成 ${totals.done} / ${totals.total}`, '游客']"
    status-left="[ 就绪 ] 选择项目后进入任务流"
    exit
    :status-right="
      content.source === 'data'
        ? `内容数据已加载 · ${cards.length} 个项目`
        : content.source === 'fallback'
          ? '内容数据未就位 · 正在用兜底演示内容'
          : '正在读取内容数据…'
    "
    @exit="exitToLogin"
  >
    <div class="app-task">
      <div class="ui-panel" style="flex: 1; min-height: 0">
        <div class="ui-panel__head">
          项目目录
          <span class="ui-panel__right">
            <span class="ui-badge ui-badge--info">共 {{ cards.length }} 个项目</span>
          </span>
        </div>
        <div class="ui-panel__body" style="overflow: auto">
          <div
            class="ui-tile-grid ui-tile-grid--boxed"
            style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))"
          >
            <div
              v-for="card in cards"
              :key="card.id"
              class="ui-tile ui-tile--icon"
              :class="{ 'ui-tile--active': card.next !== null }"
              @click="enter(card)"
            >
              <span class="ui-tile__icon">{{ card.types.length > 1 ? '⚙' : '✎' }}</span>
              <div class="ui-tile__body">
                <div class="ui-tile__name">
                  {{ card.title }}
                  <span v-if="card.next === null" class="ui-badge ui-badge--warn">无可用任务</span>
                </div>
                <div class="ui-tile__desc">{{ card.summary || '（内容数据里该项目没有简介）' }}</div>
                <div class="ui-tile__desc">
                  {{ card.types.length }} 站
                  <template v-if="card.next !== null"> · 下一站：{{ labelOf(card.next) }}</template>
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="content.source === 'fallback'"
            class="ui-alert ui-alert--info"
            style="margin-top: var(--sp-4)"
          >
            <span class="ui-alert__icon">i</span>
            <span>
              内容数据（<code>content/data/MenuData.json</code>）没读到，当前用的是兜底演示内容 ——
              页面仍可跑通，但不代表真实项目。数据随包发布后会自动切过去。
            </span>
          </div>
          <div v-if="content.error" class="ui-alert ui-alert--warn" style="margin-top: var(--sp-4)">
            <span class="ui-alert__icon">!</span>
            <span>{{ content.error }}</span>
          </div>
        </div>
      </div>
    </div>
  </AppShell>
</template>
