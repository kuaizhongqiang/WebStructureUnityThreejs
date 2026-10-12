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
const { contextBridge } = require('electron')

/** 与 electron/package.json 的 version 保持一致（沙箱预加载里读不到 fs，所以写成字面量）。 */
const SHELL_VERSION = '0.0.0'

contextBridge.exposeInMainWorld(
  'wsu3Shell',
  Object.freeze({
    isDesktop: true,
    shellVersion: SHELL_VERSION,
    platform: process.platform,
    arch: process.arch,
    versions: Object.freeze({
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node,
    }),
  }),
)
