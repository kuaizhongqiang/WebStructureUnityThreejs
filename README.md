# WebStructureUnityThreejs

教育类虚拟仿真软件 —— **Web 为主、Unity 承担复杂三维交互** 的双线工程，另有 Electron 应用壳分支。
本仓库同时承载：产品文档（需求 / 调研 / 决策 / 设计）、Web 前端工程、Unity 工程、静态排版稿与提交门禁。

> **接手请先读 [`AGENT.md`](./AGENT.md)** —— 它是 AI 与人的共用入口与工作约定，也是本仓库纪律的权威。
> 冲突时的权威层级：`docs/requirement/raw/raw-requirement.md` > `AGENT.md` > `docs/DECISIONS.md` > 其他文档。

## 1 仓库结构

| 路径 | 内容 |
|---|---|
| `docs/requirement/raw/raw-requirement.md` | **原始需求，唯一权威来源**（只读，不得改写） |
| `docs/DECISIONS.md` | **决策记录（已定事项的唯一权威）**：现 79 条（DEC-01 ~ DEC-79，五轮问答的结论），**只增不改** |
| `docs/OPEN-QUESTIONS*.md` | 问答清单原文保留：第一轮 32 题 / 第二轮 28 题 / 第三轮 10 题（答案已固化进 `DECISIONS.md`），**第六轮 26 题待回答**（Unity 脚手架的 UI 形态与启动阶段事件）；第四、五轮以追加条目形式直接落在 `DECISIONS.md` |
| `docs/requirement/requirement-analysis.md` | 需求分析：原始需求条目化（R-1~R-8）、红线、需求→交付物映射、缺口闭合表 |
| `docs/research/01~09` | 技术调研：Unity 线、Web/Three.js 线、集成交付、既有同类工程调研、依赖方案、**规模基线（×3 预算）**、Web 工程落地、**WebGL 基线实测**、**被采纳内容数据与三维资产测绘** |
| `docs/design/01~09` | 设计文档：TaskType 登记表、Unity↔Web 桥协议、目录与程序集分层、数据模型、**Unity 产物与打包流水线**、**Unity 手动构建检查清单**、**框体样式规则**、**内容数据的采用与双份口径**、**启动编排与桥消息落地** |
| `docs/PAGE-WORKLIST.md` | 页面工作清单（6 组 / 11 个任务页 + 通用组件）+ 里程碑 + 照什么不照什么 |
| `docs/PLAN.md` | **执行计划（活文档）**：接下来要做什么、落点与验收、"待办"的唯一维护点 |
| `docs/ui-mockups/` | **静态排版稿与样式唯一来源**：29 页排版稿 + `index.html`（样式与元件成果页）+ `tokens.css` / `components.css`（**产品只用这两份**）/ `mockup-shell.css`（仅评审用），`style.css` 是聚合入口 |
| `docs/README.md` | 文档总索引与写作约定 |
| `web/` | **Web 前端工程**：Vite 8 + TypeScript 5.9.3 + Vue 3 + 裸 three + ESLint/Prettier |
| `electron/` | **应用壳**：Electron + 只绑 127.0.0.1 的本机静态服务器（含 `/unity/**` 路由），加载 `web/dist`；**打包产出单文件 exe**（DEC-20 / DEC-32 / DEC-77） |
| `NewStructureUnity/` | **Unity 工程**：Unity 2022.3.53f1c1 + URP 14.0.11 |
| `unity/builds/` | **Unity 产物暂存区**（不进 git，DEC-57/79）；只保留说明文件 |
| `content/` | 内容与契约：`contracts/snapshot.json`（契约校验的**基准快照**）、`assets/`（大资产落点，**不进 git**）；**内容数据有两份**：`web/public/content/data/`（Web）+ `NewStructureUnity/Assets/StreamingAssets/Data/`（Unity），由门禁比对 |
| `tools/` | 门禁与流水线：契约一致性 / **内容数据双份一致性** / 大文件 / 壳耦合 / pre-commit hook + `pipeline/`（Unity 暂存、校验、打包） |
| `.github/workflows/gate.yml` | 合并门禁（CI） |

## 2 架构红线（不可违背）

1. **三维交互按复杂度分流**：复杂三维交互 → **Unity**；简单三维交互 → **Three.js**。两条线是**分工关系**，不是二选一。
2. **沿用 `SceneState` / `TaskType` 概念**：11 个 TaskType，序号与中文标签是**跨端契约**，只许往后追加。
3. **Web 优先，Electron 为壳**：平台相关逻辑不得渗入核心业务代码。
4. **全新架构、从零开始**：从旧工程提取的是概念与经验，不是目录布局。

更细的边界判定与分流映射以 `docs/DECISIONS.md`（尤其 DEC-06 / DEC-09）为准。

## 3 当前状态

> **本节是"仓库状态"的唯一维护点**（`AGENT.md` 只放纪律，不再重复维护状态）。
> 未闭合项见 `docs/DECISIONS.md` 末尾的「未闭合」表；已定事项见该文件正文。

| 部分 | 状态 |
|---|---|
| 文档与决策 | 六轮问答**全部关闭**，**88 条决策生效**（DEC-01 ~ DEC-88）；需求分析 v1 定稿；设计文档 9 篇 |
| Web 骨架 | ✅ 已落地并验证：双端契约、会话单一真源、裸 three 封装、Unity 桥协议骨架、移动端/微信策略 |
| Web 产品脚手架 | ✅ **Phase 1 已落地**（DEC-73/75）：外壳组件（浮卡 / 站点线 / 状态条）、`StartView` / `MenuView` / `TaskView`（登记表驱动，article 与 list 端到端）/ 骨架自检页；样式只走设计系统令牌；**ESLint + Prettier** 已进 hook 与 CI |
| Web 验收 | ✅ `typecheck` / `lint` / `format:check` / 单测 / 构建全过；**渲染冒烟 20 项**（真 Chromium：三维渲染非白屏、设计系统令牌真的加载、站点线 11 站、骨架自检页可达、无 console 错误） |
| Unity 工程 | 程序集分层 `WSU3.Contracts` / `WSU3.Core` / `WSU3.Runtime` / `WSU3.Editor` / `WSU3.Tests.EditMode` + 契约（`EnumAll.cs` 的 `SceneState` / `TaskType` / `QuestionType` / `QuestionUsage` + `BridgeMessageType.cs`）+ **WebGL 基线构建工具**（菜单 `WSU3/Build/WebGL Baseline`）+ 契约冻结单测 `ContractIntegrityTests`；**业务逻辑尚未开始**（场景骨架 `0_Setup` / `1_Content` 正在编辑器里搭，见 DEC-81） |
| 内容数据 | ✅ **已全量采用既有实训软件的数据**（DEC-88）：7 份 JSON / 9 个项目 / 73 KB，Web 与 Unity **各一份**（DEC-82），`tools/check-content-data.mjs` 在 hook 与 CI 里比对结构 |
| WebGL 基线 | ✅ 已实测：空场景 WebGL 构建 **8.40 MiB / 18 文件 / 188.9 秒**（Brotli）—— 见 `docs/research/08-webgl-baseline.md` |
| Unity 产物接入 | ✅ 流水线已落地（DEC-79）：暂存 + 逐文件 sha256 校验 + **发布清单** + 打包内 `/unity` 路由 + 加载器（超时/重试/退出销毁）。**Unity 侧协议桥尚未实现**，真实构建首次接入表现为"画面挂上、待握手" |
| 排版稿 | 29 页静态排版稿 + 样式与元件成果页，深/浅两套主题；框体规则见 `docs/design/07-frame-style-rules.md` |
| 门禁 | pre-commit hook + CI（**双端契约**、**内容数据双份**、大文件、壳耦合、Unity 清单、类型检查、Lint、格式、单测、构建、渲染冒烟） |
| Electron 壳 | ✅ 骨架 + 窗口外观（Windows 隐藏原生标题栏、系统浮层按钮、主题同步）+ **打包分发**（electron-builder portable → 单文件 exe）；冒烟两段（挂载 + Unity 页取证），报告落 JSON。细节见 [`electron/README.md`](./electron/README.md) |
| **尚未开始** | Unity 侧协议桥（`.jslib` + 消息接收 + 启动编排，DEC-85 已定清单）、流水线的"单构建多任务"语义（DEC-81）、Web 内容层改用 `content/data/*.json`、三维资产的搬运与格式转换（DEC-88，进行中） |

## 4 怎么跑

### Web 侧

```bash
cd web
npm install
npm run dev           # 开发服务器
npm run typecheck     # vue-tsc --noEmit
npm run lint          # ESLint（DEC-52）
npm run format        # Prettier 写入（format:check 用于门禁）
npm test              # vitest（契约快照测试）
npm run smoke         # 真浏览器冒烟：20 项断言（三维渲染 / 设计系统加载 / 站点线 / 骨架自检）
npm run build         # 类型检查 + 生产构建 → dist/
```

**产品源码结构**（Phase 1 脚手架，DEC-75）：

```
web/src/
  components/   AppShell（外壳骨架）· ShellCard（左上浮卡）· RouteBar（站点线）
  views/        StartView（A1）· MenuView · TaskView（登记表驱动的任务页）· DebugView(/#/debug) · PlaceholderView
  domain/       registry.ts —— TaskType 表现层登记表（标签/栈仍来自 @/contracts）
  shell/        bridge.ts（唯一的壳接触面）· theme.ts
  stores/       session（真源，DEC-08）· progress（本机单 JSON，DEC-54）· content（内容层）
  styles/       index.css（只 import @ds 的 tokens+components）· product.css（流式布局与断点）
  contracts/ viewer/ unity/ platform/   —— 沿用骨架阶段（契约 / 裸 three / 桥 / 设备策略）
```

样式**单一来源**：`@ds` 别名指向 `docs/ui-mockups/`，产品 import `tokens.css` + `components.css`；
**不得** import `mockup-shell.css`（那是排版稿的评审外壳，见 DEC-74）。

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
npm run dist                  # 打包 → release/WSU3-Shell-<version>-portable.exe（双击即用）
```

打包版没有控制台，因此 `--smoke` 会把结果写成 JSON（默认与 exe 同目录，或 `WSU3_SMOKE_REPORT=<path>`），
"能打开"这件事有可读证据。窗口外观（Windows 隐藏原生标题栏 + 系统浮层按钮 + 主题同步）见
[`electron/README.md`](./electron/README.md)。

### Unity 产物与打包流水线

**Unity 由人手动构建，但"进不进包"由流水线决定、校验、并写进清单**（DEC-79，细则见
[`docs/design/05-unity-packaging-pipeline.md`](./docs/design/05-unity-packaging-pipeline.md)）。

```bash
# ① Unity 编辑器里构建（菜单 WSU3/Build/WebGL Baseline，构建前必须关编辑器）
# ② 暂存 + 校验（产物进 unity/builds/，不进 git；逐文件 sha256 写进清单）
node tools/pipeline/unity-stage.mjs --from NewStructureUnity/Builds/webgl-baseline --key training --task-type 5
# ③ 一键打包（校验 → web build → 发布清单 release-manifest.json → exe）
node tools/pipeline/pack.mjs
```

- 没有真 Unity 时也能验流水线：`node tools/pipeline/make-stub-unity.mjs --key training --task-type 5 --stage`。
- 发布清单 `web/dist/release-manifest.json` 会随包发布，写明本次包含的 Web / 内容 / Unity（含 `treeSha256`）与服务端约定。
- **Unity 缺席不影响 Web 侧打包，但界面上会明确写"Unity 产物未包含"**（Unity 类任务不再假装能进）。
- `pack.mjs --out <目录>` 可换输出目录（上一次的 exe 还在运行时会锁住 `release/`）。

细节与取舍见 [`electron/README.md`](./electron/README.md)（为什么用本机服务器而不是 `file://`、安全边界、对接预留点）。

### 提交门禁

```bash
node tools/check-contracts.mjs        # 双端契约：TS ↔ 基准快照 ↔ C#（枚举 + 桥消息类型）
node tools/check-content-data.mjs     # 内容数据双份：Web 与 Unity 两份同名文件的结构签名
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
- **样式必须看得见**：任何 Web 样式都要在 `docs/ui-mockups/index.html` 成果页里有对应展示；框体规则（0.5px 发丝描边 + α 阶梯、圆角 6 级按角色、浮层 elevation、交互叠加层、键盘焦点环、中文排版）的权威描述见 [`docs/design/07-frame-style-rules.md`](./docs/design/07-frame-style-rules.md)，落地在 `tokens.css` + `components.css` §20。
- **样式只有一份**（DEC-74）：`tokens.css`（令牌）+ `components.css`（组件）= **产品要用的**；`mockup-shell.css` 是评审外壳，产品不得 import；`style.css` 只是排版稿的聚合入口。
- **壳与业务的边界**：业务代码（`web/src`）**零 `import electron`**（DEC-20）。壳能力只通过 `window.wsu3Shell` 只读快照暴露，实现在 `electron/preload.js`；这条由 `tools/check-shell-coupling.mjs` 机械保证（已进 hook 与 CI）。
- **文档里不写外部引用**：`docs/`、`README.md`、`AGENT.md` 与代码注释**不得**出现外部仓库名或本机绝对路径；需要遵循的规则要**摘录进 `docs/`**（如框体规则 → `docs/design/07`、Unity 构建注意 → `docs/design/06`），再引用我们自己的文档。理由见 `AGENT.md` §4。

## 6 许可

见 [`LICENSE`](./LICENSE)。`NewStructureUnity/` 内引用的第三方包各自遵循其许可。
