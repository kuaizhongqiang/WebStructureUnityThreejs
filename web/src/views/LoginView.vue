<script setup lang="ts">
/**
 * 登录页（对应排版稿 A2）。
 *
 * 本期口径（DEC-101）：**只提供「以游客身份进入」一种方式**。
 * 没有后端、也没有登录校验（DEC-21 / DEC-04），所以账号 / 密码 / 身份下拉**不进产品** ——
 * 摆一套点不动的表单只会让人以为能登录。排版稿 A2 同步收敛成同一形态。
 *
 * 左栏是**品牌展示区**（网格底 + 欢迎语 + 落款）：排版稿 A2 原来写的是"三维展示区"，
 * 但产品本期没有可展示的模型，**就不承诺三维**（同 DEC-79 对付缺席 Unity 产物的做法），
 * 因此这里不写视口提示；等真有展示模型再补。
 *
 * 身份字段不在这里写：游客 = `userType: 'unknown'`，它就是 `progress` 的默认值
 * （DEC-04「不拦游客」），多写一次只会制造第二个真源。
 */
import { useRouter } from 'vue-router'
import AppShell from '@/components/AppShell.vue'

const router = useRouter()

/** 游客进入：只做页面流转，不落身份字段（见上方注释）。 */
function enterAsGuest(): void {
  void router.push({ name: 'menu' })
}
</script>

<template>
  <AppShell
    crumb="登录"
    :badges="['游客']"
    status-left="[ 就绪 ] 无后端模式（DEC-21）"
    status-right="游客进入 · 进度保存在本机（DEC-54）"
  >
    <div class="app-login">
      <div class="app-login__brand">
        <div class="app-login__brand-text">
          <div class="ui-h2">欢迎使用虚拟仿真教学平台</div>
          <div class="ui-muted ui-small" style="margin-top: var(--sp-2); line-height: 1.8">
            本期以游客方式使用：不需要账号，进度与考核成绩保存在本机，不上传任何数据。
          </div>
        </div>
        <div class="app-login__company"><span class="ui-company__logo">示</span>示范教育科技有限公司</div>
      </div>

      <div class="app-login__panel">
        <div class="ui-h2">登录</div>
        <div class="ui-muted ui-small">本期无后端，只提供游客入口（DEC-04）。</div>
        <button class="ui-btn ui-btn--primary ui-btn--block" @click="enterAsGuest">以游客身份进入</button>
        <div class="ui-alert ui-alert--info">
          <span class="ui-alert__icon">i</span>
          <span>进度与成绩保存在本机一个 JSON 里（DEC-54）；接入后端时界面不变。</span>
        </div>
      </div>
    </div>
  </AppShell>
</template>
