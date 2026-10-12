<script setup lang="ts">
/**
 * 外壳浮卡（左上角）：LOGO + 平台名 + 面包屑 + 状态徽章。
 *
 * 样式来自设计系统的 `.ui-titlebar.ui-titlebar--float`（DEC-74 单一来源）；
 * **定位**由产品侧负责（`.app-card`，见 styles/product.css）——
 * 因为排版稿里的定位规则挂在评审外壳的 `.board` 上，产品不引用那一份。
 */
defineProps<{
  crumb?: string
  badges?: readonly string[]
}>()
</script>

<template>
  <header class="ui-titlebar ui-titlebar--float">
    <div class="ui-titlebar__logo">仿</div>
    <div class="ui-titlebar__names">
      <div class="ui-titlebar__cn">虚拟仿真教学平台</div>
      <div class="ui-titlebar__en">Virtual Simulation Teaching Platform</div>
    </div>
    <div class="ui-titlebar__right">
      <span v-if="crumb" class="ui-titlebar__crumb">{{ crumb }}</span>
      <span v-for="badge in badges ?? []" :key="badge" class="ui-badge">{{ badge }}</span>
    </div>
  </header>
</template>
