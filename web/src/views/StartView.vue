<script setup lang="ts">
/**
 * 欢迎 / 开始页（对应排版稿 A1）。
 *
 * 排版稿要素：居中主视觉（大标题 84px + 英文副题 + 一句话）+ 状态徽章 + **右下角主按钮**。
 * 这里只把"右下角"落成流式：桌面贴右下（与左上浮卡形成对角），窄屏回到文档流居中。
 */
import { useRouter } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
import { useProgressStore } from '@/stores/progress'

const router = useRouter()
const progress = useProgressStore()

function enter(): void {
  void router.push({ name: 'menu' })
}
</script>

<template>
  <AppShell
    crumb="—"
    :badges="['v0.2']"
    status-left="[ 就绪 ] 无后端模式（DEC-21）"
    status-right="本地进度已保存 · DEC-54"
  >
    <div class="app-hero">
      <div class="app-hero__logo">仿</div>
      <div class="ui-h1">虚拟仿真教学平台</div>
      <div class="ui-muted" style="letter-spacing: 3px; font-size: var(--fs-12)">
        VIRTUAL SIMULATION TEACHING PLATFORM
      </div>
      <div style="font-size: var(--fs-14); color: var(--text-2)">教学实验 · 虚拟仿真 · 分步操作训练</div>
      <div class="app-row" style="justify-content: center; margin-top: var(--sp-5)">
        <span class="ui-badge ui-badge--info">游客可直接进入（DEC-04）</span>
        <span class="ui-badge">纯静态 · 无后端（DEC-21）</span>
        <span v-if="progress.completedCount > 0" class="ui-badge ui-badge--ok">
          本机已完成 {{ progress.completedCount }} / {{ progress.total }}
        </span>
      </div>

      <!-- 主操作在右下角：与左上浮卡共用同一个边距令牌，形成对角 -->
      <div class="app-hero__actions">
        <button class="ui-btn ui-btn--primary ui-btn--lg ui-btn--pill" @click="enter">开始实验</button>
      </div>

      <div
        class="ui-muted"
        style="
          position: absolute;
          left: 0;
          right: 0;
          bottom: 28px;
          text-align: center;
          font-size: var(--fs-11);
        "
      >
        © 2026 虚拟仿真教学平台 · 首次进入会弹画质设置
      </div>
    </div>
  </AppShell>
</template>
