<script setup lang="ts">
/**
 * 通用占位页：登录 / 画质 / 漫游（Phase 3 交付）。
 *
 * 存在的意义不是"占个位"，而是让**路由与外壳先真实**：
 * 这几页的外壳、面包屑、状态条、返回路径都已经按最终形态接好，
 * Phase 3 只需要替换中间的主体容器。
 */
import AppShell from '@/components/AppShell.vue'

defineProps<{
  title: string
  desc: string
  crumb?: string
}>()
</script>

<template>
  <AppShell :crumb="crumb ?? title" :badges="['待交付 · Phase 3']" status-left="[ 占位 ] 外壳已就绪">
    <div class="app-hero">
      <div class="ui-h2">{{ title }}</div>
      <div class="ui-muted" style="max-width: 620px; text-align: center; line-height: 1.9">
        {{ desc }}
      </div>
      <div class="app-row" style="justify-content: center; margin-top: var(--sp-4)">
        <router-link class="ui-btn" :to="{ name: 'start' }">返回首页</router-link>
        <router-link class="ui-btn ui-btn--primary" :to="{ name: 'menu' }">进入项目目录</router-link>
      </div>
    </div>
  </AppShell>
</template>
