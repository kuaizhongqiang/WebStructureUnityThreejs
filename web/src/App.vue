<script setup lang="ts">
/**
 * 应用根组件：路由出口 + 首启画质设置（A4）。
 *
 * 外壳（浮卡 / 站点线 / 状态条）由**每个视图自己**用 `components/AppShell.vue` 组合，
 * 因为不同页面对外壳的需求不同：项目外页面没有站点线，任务页有站点线 + 按钮组。
 * 把外壳固定在根上会逼着所有页面接受同一套 chrome。
 *
 * 画质弹窗在根上挂是出于同一理由的例外：它是**跨页面的首启一次性输入**（A4：
 * 首次进入必须选一次），不属于任何单一页面；选过之后（`qualityChosen`）不再出现，
 * 右上「画质」按钮（AppShell）可随时重开。
 */
import { computed } from 'vue'
import QualityDialog from '@/components/QualityDialog.vue'
import { PAGE_TRANSITION } from '@/domain/page-transition'
import { useProgressStore } from '@/stores/progress'

const progress = useProgressStore()
const needsQualityChoice = computed(() => !progress.settings.qualityChosen)
</script>

<template>
  <QualityDialog v-if="needsQualityChoice" />
  <!--
    路由级过渡（Issue #57）：启动 / 登录 / 目录 / 任务页之间**淡入淡出**。

    `mode="out-in"`：离场走完再入场，两屏不共存 —— 否则两套外壳会叠在一起（浮卡、站点线各画一份），
    而常驻的 Unity 画布也可能被"一边淡出一边淡入"（画布红线见 `domain/page-transition.ts`）。

    节奏与站间过渡**同源**（同一对令牌，见 `docs/ui-mockups/components.css` §22）；
    差别是这里**不带位移** —— 换的是整屏（含整页底图），位移会把底图一起挪、边沿露出底色缝。

    站间切换（`/task/:taskType` 换站）走的是**同一个组件实例**，这里不会触发；
    那一路由 `TaskView` 的站间过渡负责。
  -->
  <router-view v-slot="{ Component }">
    <Transition :name="PAGE_TRANSITION" mode="out-in">
      <component :is="Component" />
    </Transition>
  </router-view>
</template>
