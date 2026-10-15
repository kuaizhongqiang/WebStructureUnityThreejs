<script setup lang="ts">
/**
 * 站点线导航（对应排版稿 A7/B2 的 `.ui-route`）。
 *
 * **画哪几站由内容数据决定**（DEC-100）：只画**当前项目真正启用**的任务
 * （`stores/content` 的 `enabledTypesOf()`，顺序按站点线呈现顺序 DEC-148）——
 * 数据里那个槽位是 `null` / `taskActive:false` 的任务**不出现**；
 * 一个启用的任务都没有（数据没到位、项目为空）时，**整条站点线不渲染**，不画一条空壳。
 * 理由：站点线是导航，"点得进去的站"才算一站，把没有内容的任务画上去等于把用户送进空页面；
 * 这与菜单页的"站数"、任务页的"上一 / 下一站"用的是**同一个口径**。
 *
 * 标签仍逐字来自**契约**（`TASK_TYPE_LABELS`），完成态来自进度档案（`stores/progress`），
 * 技术栈徽章来自 `TASK_TYPE_STACK`。
 * 组件只负责呈现与点击，不决定"能不能进"（那属于任务页/权限，见 design/01）。
 */
import { computed } from 'vue'
import { Check } from 'lucide-vue-next'
import { TaskType, ViewerStack } from '@/contracts'
import { labelOf, stackOf } from '@/domain/registry'
import { useContentStore } from '@/stores/content'
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

const content = useContentStore()
const progress = useProgressStore()

/** 本项目启用的任务（站点线呈现顺序，DEC-148）。空数组 = 这一页没有任务可导航 ⇒ 站点线整条不画。 */
const types = computed(() => content.enabledTypesOf())

const items = computed(() =>
  types.value.map((type, index) => ({
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
  <!-- 一个启用的任务都没有时不渲染整条（不是渲染成空条）—— 见脚本头的 DEC-100 说明 -->
  <nav
    v-if="items.length > 0"
    class="ui-route"
    :class="{ 'ui-route--narrow': narrow }"
    aria-label="任务站点线"
  >
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
        <!-- 站号是**本站点线内**的顺序（1..n），不是契约序号 ——
             数据只启用一部分槽位，用契约序号会跳号（如 3 / 7 / 8 / 9） -->
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
