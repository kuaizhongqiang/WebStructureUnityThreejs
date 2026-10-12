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
const { app, BrowserWindow, dialog, ipcMain, nativeTheme, shell } = require('electron')
const { join, resolve } = require('node:path')
const { startStaticServer } = require('./server')

const SMOKE = process.argv.includes('--smoke') || process.env.WSU3_SMOKE === '1'
const SMOKE_TIMEOUT_MS = 25_000
const IS_WINDOWS = process.platform === 'win32'

/**
 * Windows 上隐藏原生标题栏后，系统仍会画一条"标题栏浮层"（最小化/最大化/关闭）。
 * 这条浮层**由系统托管**：拖动、双击最大化、贴边都由它处理 —— 页面**不需要**写 `app-region`，
 * 只要把这条带子**留空**即可（做法参考只读仓库 dsh 的 desktop 壳：
 * `titleBarStyle: 'hidden'` + `titleBarOverlay`）。
 *
 * 留位方式：壳把高度通过 `window.wsu3Shell.captionHeight` 告诉页面，页面写到
 * `--shell-caption-h` 上（见 web/src/shell/bridge.ts），布局自动让出这条带子。
 * 浏览器里这个值是 0，所以同一份页面在浏览器与壳里都成立。
 */
const CAPTION_HEIGHT = IS_WINDOWS ? 40 : 0

/** 打包后 Web 产物被放进 resources/web（见 package.json 的 build.extraResources）。 */
const WEB_ROOT = resolve(
  process.env.WSU3_WEB_ROOT ||
    (app.isPackaged ? join(process.resourcesPath, 'web') : join(__dirname, '..', 'web', 'dist')),
)

/** 窗口底色与标题栏符号色随主题走，避免"亮色页面 + 深色原生按钮"。 */
const THEME_CHROME = {
  dark: { background: '#05070a', symbol: '#f9fafb' },
  light: { background: '#eef2f7', symbol: '#16212e' },
}
let currentTheme = 'dark'

/** @type {{ url: string, root: string, close: () => Promise<void> } | null} */
let serverInfo = null
/** @type {BrowserWindow | null} */
let win = null
const consoleErrors = []

const log = (...args) => console.log('[shell]', ...args)

/**
 * 唯一的壳 → 原生动通道：**主题同步**。
 *
 * 为什么需要：页面切亮/暗只是换 CSS，原生那部分（标题栏按钮、系统配色）由 `nativeTheme` 决定，
 * 不同步就会出现"亮色页面 + 深色按钮"。页面通过 `window.wsu3Shell.setTheme()` 通知（DEC-24 的预留接口点）。
 * 安全：只接受本窗口发来的消息、只认两个字面值、绝不执行传来的字符串。
 */
function registerShellIpc() {
  ipcMain.on('shell:theme', (event, theme) => {
    if (!win || event.sender !== win.webContents) return // 拒绝其它窗口 / 子 frame
    if (theme !== 'dark' && theme !== 'light') return // 只认白名单值
    currentTheme = theme
    nativeTheme.themeSource = theme
    if (!win.isDestroyed()) {
      win.setBackgroundColor(THEME_CHROME[theme].background)
      if (IS_WINDOWS) {
        win.setTitleBarOverlay({ color: '#00000000', symbolColor: THEME_CHROME[theme].symbol })
      }
    }
  })
}

function createWindow() {
  win = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    show: false, // 等 ready-to-show，避免白屏闪现
    backgroundColor: THEME_CHROME[currentTheme].background,
    autoHideMenuBar: true,
    title: '虚拟仿真教学平台',
    // Windows：隐藏原生标题栏，只留系统浮层按钮（拖动/双击最大化仍由系统负责）
    ...(IS_WINDOWS
      ? {
          titleBarStyle: 'hidden',
          titleBarOverlay: {
            height: CAPTION_HEIGHT,
            color: '#00000000', // 透明 ⇒ 页面自己画底色，浮层只出按钮
            symbolColor: THEME_CHROME[currentTheme].symbol,
          },
        }
      : {}),
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

/**
 * 等应用真正挂载完成。
 *
 * 为什么要等：Vue 应用是"先挂载空容器、再按路由拉懒加载 chunk"，
 * 而 `did-finish-load` 只代表 HTML 到了 —— 那一刻 `#app` 里可能还是空的。
 * 早期骨架的 App.vue 里有静态头部，所以"看起来是挂上了"；新外壳只有 `<router-view/>`，
 * 于是这个时序问题才暴露出来。**不要在验收里赌时序**，轮询到挂载为止。
 */
async function waitForMount(budgetMs = 8000) {
  const started = Date.now()
  for (;;) {
    try {
      const ready = await win.webContents.executeJavaScript(
        `Boolean(document.querySelector('#app') && document.querySelector('#app').childElementCount > 0)`,
      )
      if (ready) return true
    } catch {
      /* 页面可能正在导航，继续等 */
    }
    if (Date.now() - started > budgetMs) return false
    await new Promise((done) => setTimeout(done, 200))
  }
}

async function afterLoad() {
  if (!SMOKE) {
    log('页面已加载')
    return
  }
  try {
    const mounted = await waitForMount()
    if (!mounted) log('等待挂载超时（8s）：继续取证后判失败')
    const report = await win.webContents.executeJavaScript(`(() => {
      const root = document.querySelector('#app')
      return {
        title: document.title,
        mounted: !!root && root.childElementCount > 0,
        shell: {
          isDesktop: window.wsu3Shell ? window.wsu3Shell.isDesktop === true : false,
          electron: window.wsu3Shell ? window.wsu3Shell.versions.electron : null,
          captionHeight: window.wsu3Shell ? window.wsu3Shell.captionHeight : null,
        },
        captionVar: getComputedStyle(document.documentElement).getPropertyValue('--shell-caption-h').trim(),
        canvases: document.querySelectorAll('canvas').length,
        text: (document.body.innerText || '').replace(/\\s+/g, ' ').slice(0, 70),
      }
    })()`)

    const ok = report.mounted && report.shell.isDesktop && consoleErrors.length === 0

    // 打包后的 Windows GUI 程序**不带控制台**，stdout 会被丢掉 —— 所以同时落一份报告文件，
    // 让"能打开"这件事有可读、可留档的证据。
    // 位置：显式环境变量 > portable 启动器给的 exe 所在目录 > 当前工作目录。
    // （不能用 app.getPath('temp')：便携版会把临时目录重定向到自己的解包目录，退出即被清掉。）
    const reportPath =
      process.env.WSU3_SMOKE_REPORT ||
      join(process.env.PORTABLE_EXECUTABLE_DIR || process.cwd(), 'wsu3-shell-smoke.json')
    const payload = {
      ok,
      packaged: app.isPackaged,
      webRoot: serverInfo ? serverInfo.root : null,
      captionHeight: CAPTION_HEIGHT,
      consoleErrors,
      ...report,
      at: new Date().toISOString(),
    }
    try {
      require('node:fs').writeFileSync(reportPath, JSON.stringify(payload, null, 2), 'utf8')
    } catch {
      /* 写不了报告不影响判定 */
    }
    log('冒烟结果：')
    log('  页面标题：', report.title)
    log('  Vue 已挂载：', report.mounted ? '是' : '否')
    log(
      '  预加载桥 window.wsu3Shell：',
      `isDesktop=${report.shell.isDesktop} electron=${report.shell.electron} captionHeight=${report.shell.captionHeight}`,
    )
    log('  页面实际预留的标题栏高度：', report.captionVar || '(未设置)')
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
    log(`标题栏浮层高度：${CAPTION_HEIGHT}px（页面会用 --shell-caption-h 让位）`)
    registerShellIpc()
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
