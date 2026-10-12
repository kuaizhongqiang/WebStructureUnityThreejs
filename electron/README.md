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

## 还没做（别当成已完成）

- **打包分发**（electron-builder / 安装包 / 图标 / 签名）—— 现在只跑开发态；
- 自动更新；
- Windows/macOS 平台差异处理（`sandbox` 下部分能力受限，届时按需开 `ipcMain` 通道）。

这三项都属于"交付形态"的后续工作，做之前请先确认部署目标（DEC-55 仍把部署目标列为不确定）。
