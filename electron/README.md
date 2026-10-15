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
[shell] 原理页：phase=ready 段数=1 列表=无（行数 0） 播放器=1920x1080 81s readyState=4 右栏=原理说明
[shell] 冒烟通过。
```

取证分**四段**（都在**打包产物**上跑，不是 dev server）：① 挂载与预加载桥 → ② Unity 类任务页（挂了 / 还是"产物未包含"）→
③ Info 页的三维区（模型真的画出三角面、材质解算零错误）→ ④ **原理页的讲解视频**（`readyState ≥ 1` 且尺寸非 0，
即浏览器真的认这段 mp4 —— 这一段专验静态服务器的 `.mp4` MIME 与 `Range`）。

## 三个设计取舍（改之前先读）

### 1 为什么用本机服务器，而不是 `loadFile`（file://）

- **Unity WebGL 将来要加载 `.wasm` / `.data`**：`file://` 下 MIME 全错，`WebAssembly.instantiateStreaming` 会直接失败；
- 将来若要 `SharedArrayBuffer`（多线程），`file://` 拿不到 COOP/COEP 头；
- DEC-22 / DEC-55 要求"先本地静态服务器验证"——本机服务器与目标部署形态**一致**，在壳里验过的行为到静态站点上不会变（file:// 会让你验了个假的东西）。

`server.js` 的 MIME 表覆盖 Unity 所需的 `.wasm`（必须是 `application/wasm`）与 `.data` / `.unityweb` / `.mem`，
并支持直接命中预压缩产物（`.br` / `.gz`，附 `Content-Encoding`）。

**视频（2026-10-14 追加，DEC-99）**：加了 `.mp4`（`video/mp4`）与 **`Range` 支持（206）** ——
MIME 写错 `<video>` 直接拒播，没有 `Range` 则拖不动进度条（Safari 完全不响应，Chrome 退化成整段重下，30 MB 那一段尤其明显）。
缓存口径也分开了：**带指纹**的资源（vite 的 `/assets/<名>-<hash>.js`、Unity 的 `/Build/**`）仍是 `immutable`；
**不带指纹**的资产树（`/assets/three/**`、`/assets/video/**` 名字固定）改成 **`no-cache` + `ETag`/`Last-Modified`** ——
标 `immutable` 会让"换了资产的机器"一直吃旧文件，而 `no-cache` 配校验器既不读旧文件、也不会把视频每次重下一遍。

**Unity 产物是第二个根目录**（URL 前缀 `/unity/**`，打包后在 `resources/unity`），与 Web 产物物理分开 ——
将来改成按需下载或换 CDN 只换这一个根目录（DEC-23 / DEC-79，细则见
[`../docs/design/05-unity-packaging-pipeline.md`](../docs/design/05-unity-packaging-pipeline.md)）。
`/unity/` 下缺文件**一律 404，不回退成 index.html** —— 否则 Unity 的 loader 会把一段 HTML 当 wasm 去实例化，
报出来的错完全看不出根因。多线程构建需要的 COOP/COEP **默认关闭**，用 `WSU3_COOP_COEP=1` 打开（DEC-13）。

### 2 为什么业务代码零 `import electron`

壳是**可替换的交付形态**，不是业务的一部分。业务一旦 `import electron`，就再也不能纯浏览器运行了（而 DEC-18 明确要求支持移动端浏览器）。

这条由 `tools/check-shell-coupling.mjs` 机械保证，已接入 pre-commit hook 与 CI。业务侧唯一允许的入口是**只读快照** `window.wsu3Shell`。

### 3 对接能力只"预留位置"

`preload.js` 只暴露常量、版本号、`captionHeight` 与 `setTheme`（后者用于把主题同步给原生窗口，2026-10-12 加入），
**没有业务能力**（DEC-24：预留接口点，当期不实现）。将来接既有系统（单点登录、成绩上传、本机授权）时：方法加在 `preload.js` + 主进程 `ipcMain`，业务侧仍只认 `window.wsu3Shell.*`。

## 窗口外观（2026-10-12 追加）

窗口外观只做了**最省、最稳的一条**，其余一律不碰：

> **Windows 上 `titleBarStyle: 'hidden'` + `titleBarOverlay`** —— 隐藏原生标题栏，只保留系统画的浮层按钮。
> **拖动窗口、双击最大化、贴边**这些由**系统**负责（`electron#32341` 那类 app-region 坑都不必碰），
> 页面**只需要把这条带子留空**。

- 高度写死在两处，必须一致：`main.js` 的 `CAPTION_HEIGHT` 与 `preload.js` 的同名常量（Windows 40px，其它平台 0）。
- 页面怎么知道要留位：壳把高度放进只读快照 `window.wsu3Shell.captionHeight`，
  页面启动时写到根元素的 `--shell-caption-h`（见 `web/src/shell/bridge.ts`）。
  **浏览器里这个值是 0**，所以同一份页面在浏览器与壳里都成立 —— 这是"壳不污染业务"的关键。
- 主题同步：页面切亮/暗时调 `window.wsu3Shell.setTheme()`，主进程据此设 `nativeTheme.themeSource`、
  窗口底色和浮层按钮的 `symbolColor`。**不同步就会出现"亮色页面 + 深色原生按钮"**。
- **没有做**的：macOS 的 `hiddenInset` + vibrancy（侧栏毛玻璃）、Windows 的 `backgroundMaterial: 'acrylic'`、
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

- **安装包 / 图标 / 正式签名** —— portable exe（DEC-77）已能出，但非 portable 的安装包形态、应用图标与正式签名还没做；
- 自动更新；
- Windows/macOS 平台差异处理（`sandbox` 下部分能力受限，届时按需开 `ipcMain` 通道）。

这三项都属于"交付形态"的后续工作，做之前请先确认部署目标（DEC-55 仍把部署目标列为不确定）。
