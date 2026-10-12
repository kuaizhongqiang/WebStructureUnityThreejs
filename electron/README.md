# electron/ · 应用壳

> 依据：`docs/DECISIONS.md` **DEC-20**（同仓 `electron/` 子目录 + 装本地 Web 产物 + 业务代码零 `import electron`）、
> **DEC-32**（内容形态 = 本地 Web 产物）、**DEC-12**（Unity 走 WebGL 嵌主站，壳加载的是**同一份 Web 产物**）、
> **DEC-21 / DEC-24**（本期无后端；对接能力只预留位置、不实现）。

## 它做什么（只有三件）

1. 起一个**只绑 `127.0.0.1` 的本机静态服务器**（`server.js`）；
2. 开一个窗口加载**本地已构建的 Web 产物**（默认 `../web/dist`，可用 `WSU3_WEB_ROOT` 覆盖）；
3. 守住安全边界：`contextIsolation` + `sandbox`、禁 `nodeIntegration`、外链交系统浏览器、禁止壳内导航到外部。

**不做**：不复制一份页面、不改业务代码、不碰 Unity 单机版。

## 跑起来

```bash
# 1) 先构建 Web 产物（壳加载的是构建结果，不是源码）
cd ../web && npm install && npm run build

# 2) 装壳依赖并启动
cd ../electron && npm install
npm start            # 开窗口
npm run smoke        # 冒烟：不显示窗口，断言 DOM 与预加载桥后退出（可进 CI）
```

`npm run smoke` 会打印并在失败时返回非 0：

```
[shell] 冒烟结果：
[shell]   页面标题： 虚拟仿真教学平台
[shell]   Vue 已挂载： 是
[shell]   预加载桥 window.wsu3Shell： isDesktop=true electron=40.x.x
[shell] 冒烟通过。
```

## 三个设计取舍（改之前先读）

### 1 为什么用本机服务器，而不是 `loadFile`（file://）

- **Unity WebGL 将来要加载 `.wasm` / `.data`**：`file://` 下 MIME 全错，`WebAssembly.instantiateStreaming` 会直接失败；
- 将来若要 `SharedArrayBuffer`（多线程），`file://` 拿不到 COOP/COEP 头；
- DEC-22 / DEC-55 要求"先本地静态服务器验证"——本机服务器与目标部署形态**一致**，在壳里验过的行为到静态站点上不会变（file:// 会让你验了个假的东西）。

`server.js` 的 MIME 表已为 Unity 预留 `.wasm` / `.data` / `.unityweb`，并支持直接命中预压缩产物（`.br` / `.gz`）。

### 2 为什么业务代码零 `import electron`

壳是**可替换的交付形态**，不是业务的一部分。业务一旦 `import electron`，就再也不能纯浏览器运行了（而 DEC-18 明确要求支持移动端浏览器）。

这条由 `tools/check-shell-coupling.mjs` 机械保证，已接入 pre-commit hook 与 CI。业务侧唯一允许的入口是**只读快照** `window.wsu3Shell`。

### 3 对接能力只"预留位置"

`preload.js` 里只暴露常量与版本号，**没有任何功能**（DEC-24：预留接口点，当期不实现）。将来接既有系统（单点登录、成绩上传、本机授权）时：方法加在 `preload.js` + 主进程 `ipcMain`，业务侧仍只认 `window.wsu3Shell.*`。

## 窗口外观：按 dsh 的桌面壳做法（2026-10-12 追加）

参考只读仓库 `D:\dsh\deepseek-harness` 的 `apps/desktop`（Electron）。它的做法里，**我们只取了最省、最稳的一条**：

> **Windows 上 `titleBarStyle: 'hidden'` + `titleBarOverlay`** —— 隐藏原生标题栏，只保留系统画的浮层按钮。
> **拖动窗口、双击最大化、贴边**这些由**系统**负责（`electron#32341` 那类 app-region 坑都不必碰），
> 页面**只需要把这条带子留空**。

- 高度写死在两处，必须一致：`main.js` 的 `CAPTION_HEIGHT` 与 `preload.js` 的同名常量（Windows 40px，其它平台 0）。
- 页面怎么知道要留位：壳把高度放进只读快照 `window.wsu3Shell.captionHeight`，
  页面启动时写到根元素的 `--shell-caption-h`（见 `web/src/shell/bridge.ts`）。
  **浏览器里这个值是 0**，所以同一份页面在浏览器与壳里都成立 —— 这是"壳不污染业务"的关键。
- 主题同步：页面切亮/暗时调 `window.wsu3Shell.setTheme()`，主进程据此设 `nativeTheme.themeSource`、
  窗口底色和浮层按钮的 `symbolColor`。**不同步就会出现"亮色页面 + 深色原生按钮"**（dsh 也专门处理了这件事）。
- 我们**没有**照搬的：macOS 的 `hiddenInset` + vibrancy（侧栏毛玻璃）、Windows 的 `backgroundMaterial: 'acrylic'`、
  自绘窗口控制按钮。理由：本阶段只交付 Windows 单平台，且这三项都要求"整窗透明或自绘"，会与页面布局耦合。

## 打包（DEC-77）

```bash
cd web && npm run build          # 产物先就绪
cd ../electron && npm run dist   # → release/WSU3-Shell-<version>-portable.exe（单文件，双击即用）
```

- 用的是 **electron-builder 的 `portable` 目标**：单个自解压 exe，不需要安装、不写注册表。
- Web 产物通过 `build.extraResources` 打进 `resources/web`；
  主进程按 `app.isPackaged` 决定读 `resources/web` 还是开发态的 `../web/dist`。
- **打包版没有控制台**，stdout 会被丢掉 —— 所以 `--smoke` 会同时把结果写一份 JSON
  （默认与 exe 同目录，可用 `WSU3_SMOKE_REPORT=<path>` 指定）。"能打开"这件事因此**有可读证据**，
  而不是"看起来没报错"。
- 图标还没做（用的是 Electron 默认图标），签名用的是 electron-builder 的测试证书 —— 都不是发布态。

## 还没做（别当成已完成）

- **打包分发**（electron-builder / 安装包 / 图标 / 签名）—— 现在只跑开发态；
- 自动更新；
- Windows/macOS 平台差异处理（`sandbox` 下部分能力受限，届时按需开 `ipcMain` 通道）。

这三项都属于"交付形态"的后续工作，做之前请先确认部署目标（DEC-55 仍把部署目标列为不确定）。
