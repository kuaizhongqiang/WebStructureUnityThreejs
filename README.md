# WebStructureUnityThreejs

教育类虚拟仿真软件 —— **Web 为主、Unity 承担复杂三维交互** 的双线工程，另有 Electron 应用壳分支。
本仓库同时承载：产品文档（需求 / 调研 / 决策 / 设计）、Web 前端工程、Unity 工程、静态排版稿与提交门禁。

> **接手请先读 [`AGENT.md`](./AGENT.md)** —— 它是 AI 与人的共用入口与工作约定，也是本仓库纪律的权威。
> 冲突时的权威层级：`docs/requirement/raw/raw-requirement.md` > `AGENT.md` > `docs/DECISIONS.md` > 其他文档。

## 1 仓库结构

| 路径 | 内容 |
|---|---|
| `docs/requirement/raw/raw-requirement.md` | **原始需求，唯一权威来源**（只读，不得改写） |
| `docs/DECISIONS.md` | **决策记录（已定事项的唯一权威）**：现 72 条（DEC-01 ~ DEC-72，三轮问答的结论），**只增不改** |
| `docs/OPEN-QUESTIONS*.md` | 三轮问答清单（第一轮 32 题 / 第二轮 28 题 / 第三轮 10 题）原文保留，答案已固化进 `DECISIONS.md` |
| `docs/requirement/requirement-analysis.md` | 需求分析：原始需求条目化（R-1~R-8）、红线、需求→交付物映射、缺口闭合表 |
| `docs/research/01~08` | 技术调研：Unity 线、Web/Three.js 线、集成交付、参考工程、依赖方案、**规模基线（×3 预算）**、Web 工程落地、**WebGL 基线实测** |
| `docs/design/01~04` | 设计草案：TaskType 登记表、Unity↔Web 桥协议、目录与程序集分层、数据模型 |
| `docs/PAGE-WORKLIST.md` | 页面工作清单（6 组 / 11 个任务页 + 通用组件）+ 里程碑 + 照什么不照什么 |
| `docs/ui-mockups/` | **静态排版稿与样式清单**：29 页排版稿 + `index.html`（元件规范成果页）+ `style.css`（唯一样式依赖） |
| `docs/README.md` | 文档总索引与写作约定 |
| `web/` | **Web 前端工程**：Vite + TypeScript 5.9.3 + Vue 3 + 裸 three |
| `electron/` | **应用壳**：Electron + 只绑 127.0.0.1 的本机静态服务器，加载 `web/dist`（DEC-20 / DEC-32） |
| `NewStructureUnity/` | **Unity 工程**：Unity 2022.3.53f1c1 + URP 14.0.11 |
| `content/` | 内容与契约：`contracts/snapshot.json` 为契约校验的**基准快照** |
| `tools/` | 提交门禁：契约一致性、大文件阈值、pre-commit hook |
| `.github/workflows/gate.yml` | 合并门禁（CI） |

## 2 架构红线（不可违背）

1. **三维交互按复杂度分流**：复杂三维交互 → **Unity**；简单三维交互 → **Three.js**。两条线是**分工关系**，不是二选一。
2. **沿用 `SceneState` / `TaskType` 概念**：11 个 TaskType，序号与中文标签是**跨端契约**，只许往后追加。
3. **Web 优先，Electron 为壳**：平台相关逻辑不得渗入核心业务代码。
4. **全新架构、从零开始**：从旧工程提取的是概念与经验，不是目录布局。

更细的边界判定与分流映射以 `docs/DECISIONS.md`（尤其 DEC-06 / DEC-09）为准。

## 3 当前状态

| 部分 | 状态 |
|---|---|
| 文档与决策 | 三轮问答**全部关闭**，**72 条决策生效**；需求分析 v1 定稿 |
| Web 骨架 | ✅ 已落地并验证：双端契约、会话单一真源、裸 three 封装、Unity 桥协议骨架、移动端/微信策略、路由与两页 |
| Web 验收 | ✅ `typecheck` / 单测 / 构建通过；**三维渲染冒烟**用真实 Chromium 做 12 项断言（含"画布非纯色"的像素判定） |
| Unity 工程 | 程序集分层（Contracts / Core / Runtime / Editor / Tests.EditMode）+ 契约枚举 + **WebGL 基线构建工具** + 契约冻结单测；业务逻辑尚未开始 |
| WebGL 基线 | ✅ 已实测：空场景 WebGL 构建 **8.40 MiB / 18 文件 / 188.9 秒**（Brotli）—— 见 `docs/research/08-webgl-baseline.md` |
| 排版稿 | 29 页静态排版稿 + 元件规范成果页，深/浅两套主题 |
| 门禁 | pre-commit hook + CI（契约、大文件、类型检查、单测、构建、渲染冒烟） |
| Electron 壳 | ✅ 骨架已落地并**冒烟通过**（本机服务加载 `web/dist`、预加载桥 `window.wsu3Shell` 生效、0 控制台错误）；打包分发未做 |

## 4 怎么跑

### Web 侧

```bash
cd web
npm install
npm run dev        # 开发服务器
npm run typecheck  # vue-tsc --noEmit
npm test           # vitest（契约快照测试）
npm run smoke      # 三维渲染冒烟：真实 Chromium 12 项断言
npm run build      # 类型检查 + 生产构建 → dist/
```

> ⚠️ **TypeScript 固定 5.9.3，不要升到 7.x**：`vue-tsc` 与 TS 7 不兼容（实测直接崩溃），见 DEC-33。

### 静态排版稿（审核用）

```bash
cd docs/ui-mockups
python -m http.server 5280        # 打开 http://127.0.0.1:5280/index.html
node src/render.mjs               # 改过样式或页面生成器后重新生成（29 页 + 成果页）
```

右上角可切「深色 / 亮色」，单页也可用 `?theme=light`。

### 应用壳（Electron）

```bash
cd web && npm run build       # 壳加载的是构建产物，不是源码
cd ../electron && npm install
npm start                     # 开窗口
npm run smoke                 # 冒烟：不显示窗口，断言 DOM 与预加载桥后退出（可进 CI）
```

细节与取舍见 [`electron/README.md`](./electron/README.md)（为什么用本机服务器而不是 `file://`、安全边界、对接预留点）。

### 提交门禁

```bash
node tools/check-contracts.mjs        # 双端契约：TS ↔ 基准快照 ↔ C#
node tools/check-large-files.mjs      # 大文件阈值 10 MB
node tools/check-shell-coupling.mjs   # 业务代码零 import electron（DEC-20）
powershell -File tools/install-hooks.ps1   # 安装 pre-commit hook（一次性）
```

### 提交方式：**必须走 PR**

`main` 不接受直接提交（**含文档改动**）——见 `docs/DECISIONS.md` DEC-78。固定流程：

```bash
git checkout -b feat/xxx      # 1 开分支
# …改动… git add <路径> 并提交   # 2 本地 hook 先跑一遍门禁
git push -u origin feat/xxx    # 3 推分支
# 4 开 PR（base=main），等 CI（比本地多跑类型检查/单测/构建/渲染冒烟）
# 5 squash merge，然后 git checkout main && git pull
```

> Unity 侧改动**另外**要在 Plastic 提交（双渠道，DEC-60）；Plastic 没有 PR 概念，git 侧从"直接推 `main`"改为"经 PR 合入 `main`"。

### Unity 侧

- 用 Unity **2022.3.53f1c1** 打开 `NewStructureUnity/`；
- WebGL 基线构建：菜单 `WSU3/Build/WebGL Baseline`（等价批处理：`-executeMethod WSU3.Editor.BuildTools.WebGLBaselineBuild.RunBaseline`）；
- 契约冻结单测：EditMode 测试 `ContractIntegrityTests`（校验 TaskType / SceneState 的**名字、顺序、中文标签**）。

## 5 两条最容易踩的纪律

- **双版本控制**：外层 git 仓库 + `NewStructureUnity/` 内嵌的 Plastic 工作区。**涉及 Unity 侧的改动，两个渠道都必须提交**（git 按路径显式 `add`，永不 `-A`；Plastic 用 `cm add --recursive` + `cm ci --all` 并复核）。只提交一侧会造成两边历史分叉。细节见 `AGENT.md` §4。
- **样式必须看得见**：任何 Web 样式都要在 `docs/ui-mockups/index.html` 成果页里有对应展示；框体规则（0.5px 发丝描边 + α 阶梯、圆角 6 级、浮层 elevation、交互叠加层、键盘焦点环）见 `docs/ui-mockups/style.css` §20。
- **壳与业务的边界**：业务代码（`web/src`）**零 `import electron`**（DEC-20）。壳能力只通过 `window.wsu3Shell` 只读快照暴露，实现在 `electron/preload.js`；这条由 `tools/check-shell-coupling.mjs` 机械保证（已进 hook 与 CI）。

## 6 许可

见 [`LICENSE`](./LICENSE)。`NewStructureUnity/` 内引用的第三方包各自遵循其许可。
