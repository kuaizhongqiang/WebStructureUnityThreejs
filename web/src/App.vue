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
import { useProgressStore } from '@/stores/progress'

const progress = useProgressStore()
const needsQualityChoice = computed(() => !progress.settings.qualityChosen)
</script>

<template>
  <QualityDialog v-if="needsQualityChoice" />
  <router-view />
</template>
