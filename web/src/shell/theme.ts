/**
 * 主题（深色 / 亮色）。
 *
 * 设计系统的两套主题靠根元素上的 `[data-theme="dark" | "light"]` 切换
 * （见 `@ds/tokens.css`；排版稿的页面也是同一套机制）。
 *
 * 除了切页面，还要**同时通知桌面壳**：原生标题栏按钮与系统配色由 `nativeTheme` 决定，
 * 不同步就会出现"亮色页面 + 深色原生按钮"的割裂（做法参考只读仓库 dsh 的 desktop 壳）。
 */
import { ref } from 'vue'
import { applyShellChrome, type ShellTheme } from './bridge'

const STORAGE_KEY = 'wsu3.theme' // 与排版稿用的键一致，便于对照
const theme = ref<ShellTheme>('dark')

export function applyTheme(next: ShellTheme): void {
  theme.value = next
  document.documentElement.setAttribute('data-theme', next)
  document.documentElement.style.colorScheme = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    /* 隐私模式：不落盘也不影响使用 */
  }
  // 壳侧：布局变量（标题栏高度）+ 原生主题
  applyShellChrome(next)
}

/** 启动时调用：URL 参数 > 本机记忆 > 默认深色。 */
export function initTheme(): ShellTheme {
  let next: ShellTheme = 'dark'
  try {
    const fromUrl = new URLSearchParams(location.search).get('theme')
    const saved = localStorage.getItem(STORAGE_KEY)
    if (fromUrl === 'light' || fromUrl === 'dark') next = fromUrl
    else if (saved === 'light' || saved === 'dark') next = saved
  } catch {
    /* 取不到就用默认值 */
  }
  applyTheme(next)
  return next
}

export function toggleTheme(): ShellTheme {
  applyTheme(theme.value === 'dark' ? 'light' : 'dark')
  return theme.value
}

export { theme }
