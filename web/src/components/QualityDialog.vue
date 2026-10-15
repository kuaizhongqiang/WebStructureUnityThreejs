<script setup lang="ts">
/**
 * A4 画质 / 首次设置（排版稿 A4；PAGE-WORKLIST A4）。
 *
 * 三档卡片（标清 / 高清 / 超清，图标 + 标题 + 描述 + 推荐）+ 移动端硬件提示（DEC-70，只提示不阻拦）
 * +「使用推荐值」。两个挂出来源：
 *   · **首启**：`App.vue` 在 `settings.qualityChosen === false` 时挂出（首次进入必须选一次）；
 *   · **右上「画质」按钮**：`AppShell` 随时可重开。
 * 确定后：写本机存档（`chooseQuality`）；Unity 实例在线时同步发 `ui:set-quality`（运行时降质/升质，
 * Unity 侧 TaskFlowManager → QualityChangeRequestEvent）—— 实例未挂载时桥会抛，吞掉即可：
 * 下次进任务时 `app:init` 会带上最新画质（TaskView 从存档读）。
 */
import { computed, ref } from 'vue'
import { Monitor, MonitorDown, MonitorUp } from 'lucide-vue-next'
import { useProgressStore } from '@/stores/progress'
import { detectDevice } from '@/platform/device'
import { unityBridge } from '@/unity/unity-bridge-instance'

type Quality = 'low' | 'high' | 'ultra'

const progress = useProgressStore()
const device = detectDevice()
const selected = ref<Quality>(progress.settings.quality)

const OPTIONS: ReadonlyArray<{
  value: Quality
  icon: typeof Monitor
  title: string
  desc: string
  badge?: string
}> = [
  { value: 'low', icon: MonitorDown, title: '标清', desc: '低端集显 / 移动端推荐 · 关闭阴影与后处理' },
  {
    value: 'high',
    icon: Monitor,
    title: '高清',
    desc: '独立显卡 / 桌面浏览器 · 开启基础阴影',
    badge: '推荐',
  },
  { value: 'ultra', icon: MonitorUp, title: '超清', desc: '高性能显卡 · 全特效，首次加载更慢' },
]

/** 推荐档：移动端（微信内置）标清，桌面高清（与 device.qualityProfile 同口径）。 */
const recommended = computed<Quality>(() => (device.isMobile ? 'low' : 'high'))

const emit = defineEmits<{ close: [] }>()

function confirm(): void {
  progress.chooseQuality(selected.value)
  try {
    // 超清对 Unity 侧就是 high（Unity 只认 low/high，见 platform/device 的 QualityProfile）
    unityBridge.post('ui:set-quality', { qualityProfile: selected.value === 'low' ? 'low' : 'high' })
  } catch {
    /* 实例未挂载：首启场景本来就没有实例，下次进任务时 app:init 会带上最新画质 */
  }
  emit('close')
}

function useRecommended(): void {
  selected.value = recommended.value
  confirm()
}
</script>

<template>
  <div class="ui-mask">
    <div class="ui-dialog" style="width: 560px">
      <div class="ui-dialog__title">设置 / 画面质量</div>
      <div class="ui-dialog__body" style="display: grid; gap: var(--sp-3)">
        <div class="ui-row" style="justify-content: space-between; align-items: center">
          <b>选择画面质量</b>
          <span class="ui-small ui-muted">首次进入需要选择一次；之后可在右上「画质」按钮修改</span>
        </div>

        <button
          v-for="opt in OPTIONS"
          :key="opt.value"
          class="ui-list__item"
          :class="{ 'ui-list__item--active': selected === opt.value }"
          style="display: flex; align-items: center; gap: var(--sp-3); text-align: left"
          @click="selected = opt.value"
        >
          <opt.icon :size="18" />
          <span style="display: grid; min-width: 0">
            <span class="ui-row" style="gap: var(--sp-2)">
              {{ opt.title }}
              <span v-if="opt.badge" class="ui-badge ui-badge--ok">{{ opt.badge }}</span>
            </span>
            <span class="ui-small ui-muted">{{ opt.desc }}</span>
          </span>
        </button>

        <div v-if="device.isMobile || device.isWeChat" class="ui-alert ui-alert--warn">
          <span class="ui-alert__icon">!</span>
          <span>
            检测到当前设备为 <b>移动端浏览器</b>（微信内置）：建议选择「标清」，
            并优先使用电脑浏览器体验三维实验（DEC-70）。
          </span>
        </div>
      </div>
      <div class="ui-dialog__foot">
        <button class="ui-btn" @click="useRecommended">使用推荐值</button>
        <button class="ui-btn ui-btn--primary" @click="confirm">确定并进入</button>
      </div>
    </div>
  </div>
</template>
