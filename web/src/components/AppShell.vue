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
import { ArrowLeft, LogOut, Maximize, SlidersHorizontal, CircleHelp } from 'lucide-vue-next'
import RouteBar from './RouteBar.vue'
import ShellCard from './ShellCard.vue'
import QualityDialog from './QualityDialog.vue'
import { TaskType } from '@/contracts'
import { PAGE_TRANSITION } from '@/domain/page-transition'

const props = withDefaults(
  defineProps<{
    crumb?: string
    badges?: readonly string[]
    /** 显示站点线（首页/登录/加载这类"项目外"页面不显示）。
     *  这里只表达"这一页要不要站点线"；当前项目一个启用任务都没有时，站点线自己也不渲染（DEC-100）。 */
    route?: boolean
    activeTask?: TaskType | null
    /** 显示"返回目录"等按钮组 */
    actions?: boolean
    /** 显示"退出"（回到登录页）—— 只有项目目录页用；与 `actions` 各自独立，不共存于同一页 */
    exit?: boolean
    statusLeft?: string
    statusRight?: string
    /**
     * 主内容区的过渡名（Issue #57，如 `ui-station`）。
     *
     * 为什么过渡落在外壳上：被过渡的是 `.app-main` 里的内容区，而这个盒子归外壳所有；
     * 页面只提供"什么时候算换了一次内容"的 `transitionKey`。这样页面样式里就不必套一层
     * 纯为动画存在的包裹元素（多一层包裹会把每个页面的模板整体缩进、diff 变成整文件重排）。
     *
     * 缺省 = 路由级的淡入淡出；页面给别的名字就换那一套（如任务页的站间过渡多一个极短位移）。
     * 名字必须是 `components.css` §22 里真实存在的一套，否则 Vue 挂上的类名没有样式、
     * 表现为"没有过渡"（不会报错，所以别写错）。
     */
    transition?: string
    /** 过渡的 key：**变了才播过渡**（同一 key 只就地更新，不重建 DOM）。 */
    transitionKey?: string | number
  }>(),
  {
    crumb: '',
    badges: () => [],
    route: false,
    activeTask: null,
    actions: false,
    exit: false,
    statusLeft: '[ 就绪 ]',
    statusRight: 'v0.2 · 脚手架',
    transition: PAGE_TRANSITION,
    transitionKey: '',
  },
)

const emit = defineEmits<{ selectTask: [TaskType]; back: []; exit: [] }>()

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
const showTopright = computed(() => props.actions || props.exit)

/** A4：右上「画质」按钮重开画质设置弹窗（首启的那次由 App.vue 挂出）。 */
const qualityOpen = ref(false)
</script>

<template>
  <div class="app-root">
    <!-- 只有右上按钮组、没有站点线时（项目目录页）chrome 里没有东西撑高，
         绝对定位的按钮组会压到下方面板的标题上 —— 由 CSS 按浮卡高度补一段（见 product.css）。 -->
    <div class="app-chrome" :class="{ 'app-chrome--topright-only': showTopright && !showRoute }">
      <ShellCard class="app-card" :crumb="crumb" :badges="badges" />

      <RouteBar
        v-if="showRoute"
        :active="activeTask"
        :narrow="narrow"
        @select="(type: TaskType) => emit('selectTask', type)"
      />

      <div v-if="showTopright" class="app-topright">
        <template v-if="actions">
          <button class="ui-iconbtn ui-iconbtn--back" @click="emit('back')">
            <ArrowLeft :size="14" /> 返回目录
          </button>
          <button class="ui-iconbtn ui-iconbtn--icon" title="全屏">
            <Maximize :size="14" />
          </button>
          <button class="ui-iconbtn ui-iconbtn--icon" title="画质" @click="qualityOpen = true">
            <SlidersHorizontal :size="14" />
          </button>
          <button class="ui-iconbtn ui-iconbtn--icon" title="帮助">
            <CircleHelp :size="14" />
          </button>
        </template>
        <button v-if="exit" class="ui-iconbtn ui-iconbtn--back" @click="emit('exit')">
          <LogOut :size="14" /> 退出
        </button>
      </div>
    </div>

    <!--
      主内容区过渡（Issue #57）：换内容时淡入淡出。

      **不用 `mode="out-in"`**：out-in 会把新内容推迟到离场结束（160ms）之后才创建，而页面里的挂载
      逻辑（watch → nextTick → 往 ref 容器挂 Three 视口 / Unity 搬挂点 / `<video>`）都假设"换完之后
      新 DOM 已经就位"。改成两份短暂共存 + 离场层脱流（`components.css` §22 的 `.ui-station-leave-active`），
      交叉淡入淡出，新 DOM 在同一个 patch 里就位。

      包裹层 `.app-main__body` **故意不定位**：`.ui-tips-float` / `.ui-mask` 这些绝对定位叠层的
      定位祖先是 `.app-main`（见 product.css），这里一旦写上 position 就会把叠层挪到另一套坐标系里。
      它只负责把高度铺满，让页面里的 `height: 100%` 照旧生效。
    -->
    <main class="app-main">
      <Transition :name="transition">
        <div :key="transitionKey" class="app-main__body">
          <slot />
        </div>
      </Transition>
    </main>

    <QualityDialog v-if="qualityOpen" @close="qualityOpen = false" />

    <footer class="app-statusbar">
      <div class="ui-statusbar">
        <span>{{ statusLeft }}</span>
        <span class="ui-statusbar__right">{{ statusRight }}</span>
      </div>
    </footer>
  </div>
</template>
