<script setup lang="ts">
/**
 * 站点线导航（对应排版稿 A7/B2 的 `.ui-route`）。
 *
 * 顺序与标签全部来自**契约**（`TASK_TYPES` / `TASK_TYPE_LABELS`），
 * 完成态来自进度档案（`stores/progress`），技术栈徽章来自 `TASK_TYPE_STACK`。
 * 组件只负责呈现与点击，不决定"能不能进"（那属于任务页/权限，见 design/01）。
 */
import { computed } from 'vue'
import { Check } from 'lucide-vue-next'
import { TASK_TYPES, TaskType, ViewerStack } from '@/contracts'
import { labelOf, stackOf } from '@/domain/registry'
import { useProgressStore } from '@/stores/progress'

const props = defineProps<{
  /** 当前站（无则为 null） */
  active?: TaskType | null
  /** 窄屏变体：横向滚动而不是换行（对应 .ui-route--narrow） */
  narrow?: boolean
  /** 未开放的任务（半透明不可点） */
  locked?: readonly TaskType[]
}>()

const emit = defineEmits<{ select: [TaskType] }>()

const progress = useProgressStore()

const items = computed(() =>
  TASK_TYPES.map((type, index) => ({
    type,
    index,
    label: labelOf(type),
    unity: stackOf(type) === ViewerStack.Unity,
    done: progress.statusOf(type) === 'completed' && type !== props.active,
    current: type === props.active,
    locked: (props.locked ?? []).includes(type),
  })),
)

function segmentDone(index: number): boolean {
  const prev = items.value[index - 1]
  const self = items.value[index]
  return !!prev?.done && (self.done || self.current)
}

function choose(item: { type: TaskType; locked: boolean }): void {
  if (item.locked) return
  emit('select', item.type)
}
</script>

<template>
  <nav class="ui-route" :class="{ 'ui-route--narrow': narrow }" aria-label="任务站点线">
    <template v-for="item in items" :key="item.type">
      <span
        v-if="item.index > 0"
        class="ui-route__seg"
        :class="{ 'ui-route__seg--done': segmentDone(item.index) }"
      />
      <div
        class="ui-route__stop"
        :class="{
          'ui-route__stop--current': item.current,
          'ui-route__stop--done': item.done,
          'ui-route__stop--locked': item.locked,
        }"
        :title="item.label"
        role="button"
        tabindex="0"
        @click="choose(item)"
        @keydown.enter.prevent="choose(item)"
        @keydown.space.prevent="choose(item)"
      >
        <span class="ui-route__dot">
          <Check v-if="item.done" :size="15" />
          <template v-else>{{ item.index + 1 }}</template>
        </span>
        <span class="ui-route__label">{{ item.label }}</span>
        <span class="ui-route__stack" :style="{ color: item.unity ? 'var(--unity)' : 'var(--three)' }">
          {{ item.unity ? 'Unity' : 'Three' }}
        </span>
      </div>
    </template>
  </nav>
</template>
