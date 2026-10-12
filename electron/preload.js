'use strict'
/**
 * 预加载脚本：**只暴露只读信息**，不实现任何功能。
 *
 * DEC-24（保留对接弹性、当期不实现）的落点就在这个文件：
 * 将来要接既有系统（单点登录、成绩上传、本机授权…）时，方法加在这里 + 主进程 ipcMain 里，
 * **业务代码仍然只认 `window.wsu3Shell.*`，永远不 `import electron`**（DEC-20）。
 * 现在暴露的信息全是常量与版本号，没有任何副作用，删掉也不影响业务。
 *
 * 注意：`contextIsolation: true` + `sandbox: true`，这里只能用 require('electron') 的能力子集，
 * 不能 require('node:fs') 之类 —— 这是刻意的安全边界，不要为了方便打开它。
 */
const { contextBridge, ipcRenderer } = require('electron')

/** 与 electron/package.json 的 version 保持一致（沙箱预加载里读不到 fs，所以写成字面量）。 */
const SHELL_VERSION = '0.0.0'

/**
 * Windows 上隐藏了原生标题栏，只保留系统浮层按钮；页面要把这条带子**留空**。
 * 高度与 main.js 的 CAPTION_HEIGHT 必须一致（Windows 40 / 其它平台 0）。
 */
const CAPTION_HEIGHT = process.platform === 'win32' ? 40 : 0

contextBridge.exposeInMainWorld(
  'wsu3Shell',
  Object.freeze({
    isDesktop: true,
    shellVersion: SHELL_VERSION,
    platform: process.platform,
    arch: process.arch,
    captionHeight: CAPTION_HEIGHT,
    versions: Object.freeze({
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node,
    }),
    /**
     * 把产品主题同步给原生（标题栏按钮颜色 / 系统配色）。
     * 只发两个字面值之一；主进程还会再校验一遍发送方与取值。失败不影响页面（浏览器里没有这个方法）。
     */
    setTheme(theme) {
      if (theme === 'dark' || theme === 'light') ipcRenderer.send('shell:theme', theme)
    },
  }),
)
