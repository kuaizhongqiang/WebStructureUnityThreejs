'use strict'
/**
 * 应用壳主进程（DEC-20 / DEC-32 / DEC-12）。
 *
 * 三件事，别多做：
 *   ① 起本机静态服务器（见 server.js 里的"为什么不用 file://"）；
 *   ② 开一个窗口加载**同一份本地 Web 产物**（不是另做一套壳内页面，也不是 Unity Windows 单机）；
 *   ③ 守住安全边界：contextIsolation + sandbox、禁 nodeIntegration、外链交系统浏览器、禁止壳内导航到外部。
 *
 * 业务代码（web/）**零 `import electron`**（DEC-20）—— 由 `tools/check-shell-coupling.mjs` 机械保证。
 * 需要壳能力的唯一入口是 `window.wsu3Shell`，其实现点在 preload.js（DEC-24 的"预留接口"）。
 *
 * 用法：
 *   npm start                       # 正常启动
 *   npm run smoke                   # 冒烟：不显示窗口，加载后断言 DOM 与预加载桥，打印结果并退出
 *   WSU3_WEB_ROOT=<dir> npm start    # 指向别的 Web 产物目录
 */
const { app, BrowserWindow, dialog, shell } = require('electron')
const { join, resolve } = require('node:path')
const { startStaticServer } = require('./server')

const SMOKE = process.argv.includes('--smoke') || process.env.WSU3_SMOKE === '1'
const WEB_ROOT = resolve(process.env.WSU3_WEB_ROOT || join(__dirname, '..', 'web', 'dist'))
const SMOKE_TIMEOUT_MS = 25_000

/** @type {{ url: string, root: string, close: () => Promise<void> } | null} */
let serverInfo = null
/** @type {BrowserWindow | null} */
let win = null
const consoleErrors = []

const log = (...args) => console.log('[shell]', ...args)

function createWindow() {
  win = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    show: false, // 等 ready-to-show，避免白屏闪现
    backgroundColor: '#05070a', // 与 Web 侧深色底一致
    autoHideMenuBar: true,
    title: '虚拟仿真教学平台',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      devTools: !SMOKE, // 冒烟时不挂 devtools 钩子，减少噪声
    },
  })

  win.once('ready-to-show', () => {
    if (!SMOKE) win.show()
  })

  // 外链一律交给系统浏览器；壳内不开新窗口
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  // 只允许在本机服务内导航（防"点着点着跑进外部页面"）
  win.webContents.on('will-navigate', (event, url) => {
    if (!serverInfo || !url.startsWith(serverInfo.url)) {
      event.preventDefault()
      log('已拦截外部导航：', url)
    }
  })

  // console-message 的签名在 Electron 37+ 改成了 details 对象；这里兼容两种形态，别只按旧签名写
  win.webContents.on('console-message', (...args) => {
    const details = args[1]
    const isError =
      typeof details === 'object' && details !== null
        ? details.level === 'error'
        : Number(args[1]) >= 3 // 旧签名：level 数字，3 = error
    const message = typeof details === 'object' && details !== null ? details.message : args[2]
    if (isError) consoleErrors.push(String(message))
  })

  win.webContents.once('did-finish-load', () => {
    void afterLoad()
  })

  win.webContents.on('did-fail-load', (_event, code, description) => {
    log(`页面加载失败：${code} ${description}`)
    if (SMOKE) app.exit(1)
  })

  log(`加载 ${serverInfo.url}`)
  void win.loadURL(serverInfo.url)
}

async function afterLoad() {
  if (!SMOKE) {
    log('页面已加载')
    return
  }
  try {
    const report = await win.webContents.executeJavaScript(`(() => {
      const root = document.querySelector('#app')
      return {
        title: document.title,
        mounted: !!root && root.childElementCount > 0,
        shell: {
          isDesktop: window.wsu3Shell ? window.wsu3Shell.isDesktop === true : false,
          electron: window.wsu3Shell ? window.wsu3Shell.versions.electron : null,
        },
        canvases: document.querySelectorAll('canvas').length,
        text: (document.body.innerText || '').replace(/\\s+/g, ' ').slice(0, 70),
      }
    })()`)

    const ok = report.mounted && report.shell.isDesktop && consoleErrors.length === 0
    log('冒烟结果：')
    log('  页面标题：', report.title)
    log('  Vue 已挂载：', report.mounted ? '是' : '否')
    log('  预加载桥 window.wsu3Shell：', `isDesktop=${report.shell.isDesktop} electron=${report.shell.electron}`)
    log('  画布数：', report.canvases)
    log('  正文片段：', report.text)
    if (consoleErrors.length) log('  控制台错误：', consoleErrors.slice(0, 3))
    log(ok ? '冒烟通过。' : '冒烟失败。')
    app.exit(ok ? 0 : 1)
  } catch (error) {
    log('冒烟异常：', error && error.message)
    app.exit(1)
  }
}

// 单实例：重复启动时聚焦已有窗口，避免开出多个壳
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  app.whenReady().then(async () => {
    try {
      serverInfo = await startStaticServer({ root: WEB_ROOT })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (SMOKE) {
        log('启动失败：', message)
        app.exit(1)
        return
      }
      dialog.showErrorBox('无法启动应用壳', `${message}\n\n提示：先执行\n  cd web && npm run build`)
      app.quit()
      return
    }
    log(`Web 产物目录：${serverInfo.root}`)
    log(`本机静态服务：${serverInfo.url}`)
    createWindow()

    if (SMOKE) {
      setTimeout(() => {
        log(`冒烟超时（${SMOKE_TIMEOUT_MS}ms）`)
        app.exit(1)
      }, SMOKE_TIMEOUT_MS).unref?.()
    }
  })

  // 关窗即退出，并把本机服务一起收掉。
  // 刻意**不用** will-quit + preventDefault 的异步收尾：那会在冒烟里形成"等自己关自己"的循环。
  // 进程退出本身会释放监听端口，所以这里的 close() 只是让退出更干净。
  app.on('window-all-closed', () => {
    const closing = serverInfo ? serverInfo.close() : Promise.resolve()
    serverInfo = null
    void Promise.resolve(closing).finally(() => app.quit())
  })
}
