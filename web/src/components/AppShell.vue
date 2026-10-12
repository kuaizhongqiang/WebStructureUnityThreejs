<script setup lang="ts">
/**
 * 应用外壳：浮卡 + 站点线 +（可选）右上按钮组 + 主内容 + 状态条。
 *
 * 布局体制（DEC-73）在这里落地：
 *   · 外壳是**流式**的 —— 浮卡绝对定位在左上，站点线在左侧给浮卡让位（与排版稿一致），
 *     窄屏时浮卡回到文档流、站点线切成滚动变体；
 *   · 主内容是 `flex: 1 + min-height: 0`，把"剩余空间"交给页面，
 *     三维页再把这份空间交给视口（页面自己不写死宽高）。
 *
 * 桌面壳的标题栏高度由 `--shell-caption-h` 预留（见 shell/bridge.ts），浏览器里为 0。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowLeft, Maximize, SlidersHorizontal, CircleHelp } from 'lucide-vue-next'
import RouteBar from './RouteBar.vue'
import ShellCard from './ShellCard.vue'
import { TaskType } from '@/contracts'

const props = withDefaults(
  defineProps<{
    crumb?: string
    badges?: readonly string[]
    /** 显示站点线（首页/登录/加载这类"项目外"页面不显示） */
    route?: boolean
    activeTask?: TaskType | null
    /** 显示"返回目录"等按钮组 */
    actions?: boolean
    statusLeft?: string
    statusRight?: string
  }>(),
  {
    crumb: '',
    badges: () => [],
    route: false,
    activeTask: null,
    actions: false,
    statusLeft: '[ 就绪 ]',
    statusRight: 'v0.2 · 脚手架',
  },
)

const emit = defineEmits<{ selectTask: [TaskType]; back: [] }>()

/** 窄屏：站点线切成横向滚动（1440 以下浮卡与 11 站无法并排放下） */
const narrow = ref(false)
let media: MediaQueryList | null = null
const syncNarrow = (): void => {
  narrow.value = media?.matches ?? false
}

onMounted(() => {
  media = window.matchMedia('(max-width: 1439px)')
  syncNarrow()
  media.addEventListener('change', syncNarrow)
})
onBeforeUnmount(() => media?.removeEventListener('change', syncNarrow))

const showRoute = computed(() => props.route)
</script>

<template>
  <div class="app-root">
    <div class="app-chrome">
      <ShellCard class="app-card" :crumb="crumb" :badges="badges" />

      <RouteBar
        v-if="showRoute"
        :active="activeTask"
        :narrow="narrow"
        @select="(type: TaskType) => emit('selectTask', type)"
      />

      <div v-if="actions" class="app-topright">
        <button class="ui-iconbtn ui-iconbtn--back" @click="emit('back')">
          <ArrowLeft :size="14" /> 返回目录
        </button>
        <button class="ui-iconbtn ui-iconbtn--icon" title="全屏">
          <Maximize :size="14" />
        </button>
        <button class="ui-iconbtn ui-iconbtn--icon" title="画质">
          <SlidersHorizontal :size="14" />
        </button>
        <button class="ui-iconbtn ui-iconbtn--icon" title="帮助">
          <CircleHelp :size="14" />
        </button>
      </div>
    </div>

    <main class="app-main">
      <slot />
    </main>

    <footer class="app-statusbar">
      <div class="ui-statusbar">
        <span>{{ statusLeft }}</span>
        <span class="ui-statusbar__right">{{ statusRight }}</span>
      </div>
    </footer>
  </div>
</template>
