<script setup lang="ts">
/**
 * 菜单 / 项目列表页（对应排版稿 A5 的最小可用版本）。
 *
 * 本页在 Phase 1 只做**入口**：展示项目卡片 → 进入任务流。
 * 排版稿里 A5 标记为"待重做"（TODO T1），所以这里不提前做视觉细节，
 * 只用设计系统的既有组件（.ui-tile--icon）承载，等 A5 定稿后再对齐。
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
import { useContentStore } from '@/stores/content'
import { useProgressStore } from '@/stores/progress'
import { TASK_TYPES } from '@/contracts'
import { labelOf } from '@/domain/registry'

const router = useRouter()
const content = useContentStore()
const progress = useProgressStore()

const project = computed(() => content.project)
const nextTask = computed(
  () => TASK_TYPES.find((type) => progress.statusOf(type) === 'unfinished') ?? TASK_TYPES[0],
)

function enter(): void {
  void router.push({ name: 'task', params: { taskType: String(nextTask.value) } })
}
</script>

<template>
  <AppShell
    crumb="项目目录"
    :badges="[`已完成 ${progress.completedCount} / ${progress.total}`, '游客']"
    status-left="[ 就绪 ] 选择项目后进入任务流"
    status-right="内容为内置演示数据 · 待内容侧交付"
  >
    <div class="app-task">
      <div class="ui-panel" style="flex: 1; min-height: 0">
        <div class="ui-panel__head">
          项目目录
          <span class="ui-panel__right">
            <span class="ui-badge ui-badge--info">共 1 个演示项目</span>
          </span>
        </div>
        <div class="ui-panel__body" style="overflow: auto">
          <div
            class="ui-tile-grid ui-tile-grid--boxed"
            style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))"
          >
            <div class="ui-tile ui-tile--icon ui-tile--active" @click="enter">
              <span class="ui-tile__icon">🌡</span>
              <div class="ui-tile__body">
                <div class="ui-tile__name">
                  {{ project.title }}
                  <span v-if="progress.completedCount > 0" class="ui-badge ui-badge--ok">
                    进度 {{ progress.percent }}%
                  </span>
                </div>
                <div class="ui-tile__desc">{{ project.summary }}</div>
                <div class="ui-tile__desc">
                  预计 {{ project.minutes }} 分钟 · 下一站：{{ labelOf(nextTask) }}
                </div>
              </div>
            </div>
          </div>

          <div class="ui-alert ui-alert--info" style="margin-top: var(--sp-4)">
            <span class="ui-alert__icon">i</span>
            <span>
              本期内容层为内置演示数据：`content/projects/*.json` 交付后自动切到真实内容（见
              `stores/content.ts`）。
            </span>
          </div>
        </div>
      </div>
    </div>
  </AppShell>
</template>
