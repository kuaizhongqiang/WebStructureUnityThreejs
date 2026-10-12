<script setup lang="ts">
/**
 * 应用根组件：只做路由出口。
 *
 * 外壳（浮卡 / 站点线 / 状态条）由**每个视图自己**用 `components/AppShell.vue` 组合，
 * 因为不同页面对外壳的需求不同：项目外页面没有站点线，任务页有站点线 + 按钮组。
 * 把外壳固定在根上会逼着所有页面接受同一套 chrome。
 */
</script>

<template>
  <router-view />
</template>
