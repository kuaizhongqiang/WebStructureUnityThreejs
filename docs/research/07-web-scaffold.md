# 调研 07：Web 工程落地记录（依赖拉取结果）

> 读者：AI 与人｜状态：2026-10-12 v0（**已执行**）｜用途：DEC-30 的执行证据，以及一个必须记住的工具链坑。

## 1 落地内容（`web/`）

```text
web/
  package.json          # 脚本：dev / build / preview / typecheck / test（DEC-15）
  package-lock.json     # 已生成并入库 → 版本可复现
  tsconfig.json         # strict + moduleResolution: Bundler（为 three/addons 解析）
  vite.config.ts        # base 可配（VITE_BASE，适配子路径部署，DEC-22）；含 vitest 配置
  index.html
  src/
    main.ts             # createApp + pinia + router
    App.vue             # 外壳：状态条（SceneState / TaskType / 技术栈）+ 路由出口
    contracts/          # ★ 双端共享契约（DEC-09 / DEC-10）
      scene-state.ts    # SceneState 6 值 + 中文标签（原样继承）
      task-type.ts      # TaskType 11 值 + 中文标签 + ★ DEC-06 分流映射
      index.ts          # 唯一出口 + BRIDGE_PROTOCOL_VERSION
      contracts.spec.ts # 契约快照测试（6 条，全部通过）
    viewer/Viewer.ts    # ★ 裸 three 封装（独占渲染循环，必须 dispose）
    unity/UnityBridge.ts# ★ Unity↔Web 桥协议骨架（版本握手 / JSON / 显式销毁）
    stores/session.ts   # ★ 会话真源（Web 侧持有，事件驱动，DEC-08）
    router/index.ts     # hash 模式路由（静态托管 + 子路径都免 rewrite）
    pages/              # HomeView（状态机演示 + 任务清单）/ TaskView（分流落点）
    styles/main.css
  tools/
    render-smoke.mjs    # ★ 三维渲染冒烟：真实 Chromium 打开页面并做 12 项断言（DEC-27）
    smoke/artifacts/     # 截图产物（已 gitignore，可随时重生成）
```

**目录结构仍待评审**（DEC-26）：本骨架按 `research/02-web-threejs-line.md` §7 的草案落地，评审后可调整。

## 2 实测环境与版本（2026-10-12）

| 项 | 值 |
|---|---|
| Node / npm | v24.19.0 / 11.17.0 |
| 代理 | `http://127.0.0.1:10808`（npm 已配），拉取全程可用 |
| 运行依赖 | `vue` 3.5.43、`three` 0.186.1、`pinia` 4.0.3、`vue-router` **5.4.0** |
| 开发依赖 | `vite` 8.3.4、`@vitejs/plugin-vue` 6.0.10、`typescript` **5.9.3**、`vue-tsc` 3.3.13、`@types/three` 0.186.0、`vitest` 5.0.3、`@types/node` |

## 3 ⚠️ 工具链坑（必须记住）：TypeScript 7 与 vue-tsc 不兼容

- 现象：按"最新版"装 `typescript@7.0.2`（原生重写线）后，`npm run typecheck` 直接崩溃：

  ```text
  Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './lib/tsc' is not defined by "exports"
  in ...\node_modules\typescript\package.json
      at resolveTscPath (...\node_modules\vue-tsc\index.js:73:43)
  ```

- 原因：`vue-tsc` 依赖 `typescript/lib/tsc` 这个内部路径，而 TS 7 的 `exports` 不再暴露它。`vue-tsc` 的 peer 声明只写 `typescript >=5.0.0`，**声明与事实不符**（这就是"只看 peer 字段会踩坑"的实例）。
- 处置：**TypeScript 锁定 5.9.3**（5.x 线最新），见 DEC-33。等 `vue-tsc` 明确支持 TS 7 再升。
- 另一处：`vite.config.ts` 需要 `@types/node`（用了 `node:url` 与 `process`），已在 tsconfig 的 `types` 里加入 `"node"`。

## 4 验收结果（DEC-30 的"依赖拉取好"判定）

| 检查 | 命令 | 结果 |
|---|---|---|
| 类型检查 | `npm run typecheck` | **通过**（0 错误） |
| 单元测试 | `npm test` | **通过**（1 文件 / 6 用例） |
| 生产构建 | `npm run build` | **通过**（vite 8.3.4，47 modules，350ms） |

构建产物（**已确认按需分包**）：

| 产物 | 大小 | gzip |
|---|---|---|
| `index-*.js`（外壳 + Vue） | 97.35 kB | 38.40 kB |
| `TaskView-*.js`（**three.js 随页面懒加载**） | 635.19 kB | 159.80 kB |
| CSS 合计 | 约 2.65 kB | 约 1.3 kB |

> 说明：`three` 落在 `TaskView` 的分包里 —— 这正是"只有进入三维页面才加载三维库"的效果，与 DEC-12 的"Unity 件按需加载"是同一套思路。
> `chunkSizeWarningLimit` 已在 `vite.config.ts` 放宽到 4MB，避免三维包体触发无意义的告警噪音。

### 4.1 三维渲染冒烟（`npm run smoke`，True Browser）

`tools/render-smoke.mjs` 自己起 vite dev server（随机端口），用 Playwright + Chromium 打开页面，**12 项断言全部通过**：

| 断言 | 实测值 |
|---|---|
| Three 页：画布尺寸 > 0 | 1202×420 |
| Three 页：`Viewer` 已挂载 | ✓（`window.__WSU3_VIEWER__`，仅 DEV 暴露） |
| Three 页：**渲染循环在跑** | `frame=93` |
| Three 页：有 draw call | `calls=1` |
| Three 页：WebGL 上下文正常 | `WebGL 2.0 (OpenGL ES 3.0 Chromium)`，`glError=0` |
| Three 页：无渲染器初始化失败提示 | ✓ |
| Three 页：**画布像素非纯色（不是白屏）** | 独色数 14，亮度区间 32→68（对应深色背景 + 网格线） |
| Unity 页：未创建 three 画布（不越权渲染） | ✓ |
| Unity 页：显示 Unity 占位提示 | ✓（"该 TaskType 归 Unity WebGL 承载"） |
| **Unity → Three 切回**：画布重建且渲染恢复 | `frame=75 calls=1` |
| 首页：任务清单与技术栈标注齐全 | ✓ |
| 全程无 JS 异常 / `console.error` | ✓ |

- "不是白屏"是**确定性判定**：脚本用 `node:zlib` 手工解 PNG、反过滤后统计画布区域的色彩分布（独色数 ≥5 且亮度区间 ≥10），**不依赖人眼看图**。
- 截图产物在 `web/tools/smoke/artifacts/`（`task-three.png`、`task-three-canvas.png`、`task-unity-placeholder.png`、`home.png`，已 gitignore），可随时重跑重生成。
- 这一步同时把 **Q-R2-D3（冒烟用什么做）** 的建议方案（Playwright）先落地了；若你不选 A，改回其它方式即可。
- 依赖增量：`playwright` + Chromium headless shell（约 118MB，经代理下载成功）。

## 5 未完成项（别当成已做）

| 项 | 状态 | 阻塞 |
|---|---|---|
| "三维能渲染出画面"的冒烟测试（DEC-27 第 3 条） | ✅ **已做**（结果见 §4，缺陷与修法见 §6） | — |
| Unity WebGL 产物挂载 | **未做** | DEC-13 基线实测尚未执行；Unity 侧业务代码为零 |
| 真实 GLB 加载 | **未做** | DEC-11 决定"两份资产各自做"，Three.js 侧资源尚未制作 |
| CSS 预处理 / ESLint | **未引入** | 待目录草案评审后按需加（避免过早引入可选项） |
| `web/README.md` 以外的开发者文档 | 未写 | 待目录草案定案 |

## 6 ⚠️ 冒烟测试当场抓到的一个真实缺陷（已修）

这是"自动化冒烟"第一次出场就产出的价值，值得单独记：

- **现象**：`/#/task/1`（Three 栈）切到 `/#/task/5`（Unity 栈）后，**页面仍停留在上一个任务的三维件上**，页头也仍显示"任务：任务目的 / 技术栈：three"，Unity 占位提示不出现。
- **根因**：`/task/1` → `/task/5` 是**同一个组件实例被复用**（路由参数变化不会重新 `onMounted`）。而 `TaskView.vue` 只在 `onMounted` 里向 store 广播 `switchTaskType`，因此 **store 里的当前 `TaskType` 从不更新** ⇒ 依赖它的 `viewerStack` 不变 ⇒ 画布既不销毁也不切换。
- **修法**（`web/src/pages/TaskView.vue`）：
  1. `watch(taskType, ...)` 监听路由参数变化并广播给 store（跨任务导航必须走事件，而不是只在挂载时广播一次）；
  2. 技术栈切换的 watcher 加 **`flush: 'post'`** —— 否则 Unity → Three 切换时 `v-if` 还没渲染出容器，`canvasHost` 为 `null`，画布**永远不会被创建**（这是第二个隐藏缺陷，同一个修复一起解决）。
- **教训（可推广）**：`DEC-06` 把技术栈挂在 `TaskType` 上，代价就是**所有"当前 TaskType"的更新路径都必须走事件**；任何一条路径漏了广播，就会出现"技术栈与页面不一致"。这条已经用冒烟的"Unity → Three 切回"用例钉住。

## 7 附：本机运行方式

```powershell
cd f:\Project\WebStructureUnityThreejs\web
npm run dev        # 开发服务器（127.0.0.1:5273）
npm run build      # 类型检查 + 生产构建 → web/dist
npm run preview    # 预览生产产物
npm test           # 契约测试
```
