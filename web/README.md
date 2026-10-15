# web/ — Web 侧工程（Three.js 简单三维交互 + 教学外壳）

> 决策依据：`../docs/DECISIONS.md`（技术栈 DEC-15~19 / DEC-33；脚手架 DEC-73 / DEC-75；样式单一来源 DEC-74；资产发布链与 Info 页 DEC-98；原理页与视频 DEC-99；站点线按数据画站 DEC-100；**启动流程与游客入口 DEC-101**）。
> 纪律与落点以 `../AGENT.md` 与根 `../README.md` 为准；本文件只写 **web/ 这一层**的结构、命令与边界。

## 技术栈

| 层 | 选型 | 决策 |
|---|---|---|
| 构建 | Vite 8.3.4 | DEC-15 |
| 语言 | TypeScript **5.9.3**（**不要升到 7.x**，`vue-tsc` 不兼容） | DEC-33 |
| UI 外壳 | Vue 3.5 + Vue Router（hash 模式）+ Pinia | DEC-15 / DEC-16 |
| 三维 | **裸 `three` 0.186**（自己封装 `Viewer` / `ModelStage`，不用 R3F / TresJS） | DEC-15 / DEC-98 |
| 图标 | `lucide-vue-next`（与排版稿同一套图标） | — |
| 测试 | Vitest（契约快照 + 内容适配 + 选件 + 原理页规则 + Unity 会话 / 部件树） | DEC-27 |
| 规范 | ESLint + Prettier，**已进 pre-commit hook 与 CI** | DEC-52 |

## 命令

```powershell
npm install
npm run dev           # 开发服务器 http://127.0.0.1:5273
npm run typecheck     # vue-tsc --noEmit
npm run lint          # eslint .
npm run format        # prettier --write（门禁用 format:check）
npm test              # vitest run
npm run smoke         # 真 Chromium 渲染冒烟：三维 / 设计系统 / 站点线按数据画站 / 内容层 / Info 三维区 / 原理页视频（64 项断言）
npm run build         # 类型检查 + 生产构建 → dist/
npm run preview       # 预览生产产物
```

子路径部署：设 `VITE_BASE=/sim/` 后构建（默认 `./` 相对路径）。

## 目录职责

| 路径 | 职责 | 纪律 |
|---|---|---|
| `src/contracts/` | **双端共享契约**（`SceneState` / `TaskType` / 中文标签 / 分流映射 / 协议版本 / 题目枚举） | 只许往后追加；改值必须同批改 C# 与基准快照，且 `contracts.spec.ts` 通过（DEC-09 / DEC-10） |
| `src/domain/` | **表现层登记表与内容适配**：`registry.ts`（TaskType → 页面骨架）、`adopted-content.ts`（采纳 JSON → 页面模型）、`principle.ts`（原理页规则） | 不复制契约里的标签与顺序；适配层是**纯函数**，坑要用单测锁住 |
| `src/views/` | 页面：`StartView` / `LoginView`（**只提供游客入口**，DEC-101） / `MenuView` / **`TaskView`（登记表驱动，一种骨架一个分支）** / `DebugView`（骨架自检） / `PlaceholderView` | 新增 TaskType 先改契约与登记表，**不要**新写一页；启动流程是 `start → login → menu`，改它要同批改 `router/index.ts` 与冒烟（DEC-101） |
| `src/components/` | 外壳组件：`AppShell` / `ShellCard`（左上浮卡）/ `RouteBar`（站点线） | 样式只走 `@ds`（`tokens.css` + `components.css`），**禁止** import `mockup-shell.css`（DEC-74） |
| `src/viewer/` | 三维与**大资产取数**：`Viewer`（裸 three 封装）、`ModelStage`（Info 页舞台，DEC-98）、`scene-assets.ts` / `video-assets.ts`（只认产物里的元数据表与清单） | 谁创建谁 `dispose()`；渲染循环由 `Viewer` 独占；**不硬编**资产路径（DEC-57 / DEC-98 / DEC-99） |
| `src/unity/` | Unity WebGL 桥 | 消息全 JSON、带版本号、不提供状态查询、退出显式 `detach()`（DEC-07 / DEC-08 / DEC-12） |
| `src/stores/` | 状态：`session`（会话**真源**，DEC-08）、`content`（内容层，幂等缓存）、`progress`（本机单 JSON，DEC-54）、`runtime`（**发布清单**驱动的 Unity 选件） | 状态变更必须发事件；不暴露"查询当前状态"给跨模块调用方 |
| `src/shell/` | 桌面壳接触面：`bridge.ts`（`window.wsu3Shell` 只读快照）、`theme.ts` | 业务**零 `import electron`**（DEC-20，由 `tools/check-shell-coupling.mjs` 机械拦截） |
| `src/platform/` | 设备策略（移动端 / 微信内置浏览器，DEC-49 / DEC-70） | 策略只读环境，不改协议 |
| `src/styles/` | `index.css`（只 3 行 `@import`：`@ds` 的 tokens + components）＋ `product.css`（流式布局与断点） | **不得**出现第二套色板；框体样式受令牌约束（`../docs/design/07-frame-style-rules.md`） |

## 大资产怎么进产物（不进 git）

`vite.config.ts` 里一个插件服务**多棵树**（DEC-98 / DEC-99），dev 与 build 给**同一个 URL 前缀**：

| 树 | 源（**不进 git**） | 产物 | 元数据 |
|---|---|---|---|
| Three 模型 | `../content/assets/three/**` | `/assets/three/**`（dev 中间件直读 / build 拷进 `dist`） | `_meta/` 下三张表：材质规格 / 贴图查找表 / 转换报告 |
| 原理视频 | `../content/assets/video/**` | `/assets/video/**` | `_meta/index.json`（**构建时按目录内容现算**）——"这段视频在不在产物里"的唯一判据 |

所以页面代码在 dev / smoke / build / 打包里只有一套 URL；**缺席时显示明确状态**（"未包含在本次发布里"），不打必然 404 的请求。

## 边界（不要越界）

- **样式**：产品只 import `@ds` 的 `tokens.css` + `components.css`；任何新样式都要在 `../docs/ui-mockups/index.html` 成果页里有展示。
- **壳**：需要壳能力时加在 `../electron/preload.js` + 主进程 `ipcMain`，业务侧只认 `window.wsu3Shell.*`（DEC-24 只预留接口点）。
- **产物**：Unity 侧产物只经 `../tools/pipeline/unity-stage.mjs` 进 `unity/builds/`，页面"能不能挂 Unity"**只认发布清单**（`stores/runtime.ts`）。

## 未完成（别当成已做）

- ~~步骤系统的落地面板~~ **已落地**（2026-10-14，DEC-112：步骤进度 / 提示条 / 信息面板 / 答题面板，`object:picked` / `unity:error` 页面可见；结构任务的部件树 + `.ui-parttip` 见 DEC-130 与桥消息 `scene:parts` / `object:hover`）。**仍未做**的是 Unity 侧初始化（相机 / 交互闸门 / 高亮，`../docs/TODO.md` D-13 / D-21）。
- 其余 C 组页面骨架（C2 任务目的 / C3 实验仪器 / C7 考核）仍与排版稿不同构（DEC-98 未闭合 c、DEC-99 已补 C4）。
- 包体预算门禁（DEC-02）未落地 —— 明细见 `../docs/TODO.md` D-10（GLB / 贴图 / HDR / 讲解视频 65.9 MB / AA 内容组按需下载，口径以那里为准）。
