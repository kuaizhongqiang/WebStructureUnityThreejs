/**
 * 壳桥（唯一的"业务 ⇄ 桌面壳"接触面）。
 *
 * 纪律（DEC-20）：**业务代码不许 `import electron`** —— 由 `tools/check-shell-coupling.mjs` 机械拦截。
 * 需要壳能力时走这里：读 `window.wsu3Shell`（由 `electron/preload.js` 暴露的只读快照，
 * DEC-24 的"预留接口点"）。浏览器里 `window.wsu3Shell` 不存在，所有调用必须安全降级。
 *
 * 目前壳提供两件事：
 *   · `captionHeight` —— 桌面壳标题栏占的高度，产品要把它留出来（否则内容会被原生窗口按钮压住）；
 *   · `setTheme(theme)` —— 把产品主题同步给**原生**窗口（标题栏按钮与系统配色）：
 *     这是 dsh（只读参考 D:\dsh\deepseek-harness）的做法：渲染器把主题交给主进程去设 nativeTheme，
 *     原生部分才和页面同色；否则亮色页面配深色标题栏会很割裂。
 */

export type ShellTheme = 'dark' | 'light'

interface Wsu3ShellBridge {
  readonly isDesktop?: boolean
  readonly shellVersion?: string
  readonly platform?: string
  readonly arch?: string
  readonly captionHeight?: number
  readonly versions?: { electron?: string; chrome?: string; node?: string }
  setTheme?: (theme: ShellTheme) => void
}

function readBridge(): Wsu3ShellBridge | undefined {
  return (globalThis as unknown as { wsu3Shell?: Wsu3ShellBridge }).wsu3Shell
}

/** 当前是否跑在桌面壳里（浏览器里为 false）。 */
export const isDesktopShell = (): boolean => readBridge()?.isDesktop === true

/** 壳提供的标题栏高度（浏览器里为 0）。 */
export function shellCaptionHeight(): number {
  const value = readBridge()?.captionHeight
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 0
}

/**
 * 把壳需要的布局变量写到根元素上，并同步主题。
 * 在应用启动时调用一次；主题切换时再调用一次同步主题即可。
 */
export function applyShellChrome(theme: ShellTheme): void {
  const root = document.documentElement
  root.style.setProperty('--shell-caption-h', `${shellCaptionHeight()}px`)
  if (isDesktopShell()) root.dataset.desktopShell = 'true'
  readBridge()?.setTheme?.(theme)
}
