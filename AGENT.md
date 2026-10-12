# AGENT.md

本文件是本仓库的 **AI 协作入口说明**，供在本项目中工作的 AI Agent（以及人）快速对齐上下文。

- `README.md` 是**给人看的总览**（仓库结构 / 怎么跑 / 当前状态）；
- 本文件是**约定与纪律的权威**，两者分工不重叠；
- 第 1、2 节来自 `docs/requirement/raw/raw-requirement.md`（原始需求，唯一权威来源），未做需求外的推断；
- 第 3 节只写**已核实的仓库事实**，第 4 节是**必须遵守的工作约定**，第 5 节是**仍未闭合的项**。

---

## 1. 项目是什么

- 一个**教育类虚拟仿真软件**项目。
- **全新架构，从零开始**：不要复用旧工程的结构，只把旧工程当作参考。
- 可参考的既有工程（只读参考，不是本项目代码基线）：
  - `F:\Project\MCV_Module_0928`
  - `F:\Project\MCV_Module`
- 交付形态：**默认 Web 端**，另有 **Electron 应用壳（app 壳）**（与 Web 工程同仓，`electron/` 子目录，见 DEC-20 / DEC-32）。

## 2. 不可动摇的架构约束

以下几条是需求中明确写死的，任何实现方案都不得违背：

1. **三维交互按复杂度分流**
   - **复杂三维交互 → Unity**
   - **简单三维交互 → Three.js**
   - 因此本项目同时存在 Web（Three.js）与 Unity 两条技术线，两者是分工关系，不是二选一。
2. **保留 SceneState 与 TaskType 概念**
   - 这两个概念沿用既有工程（MCV_Module 系列）的语义，不要改名、不要重新发明；
   - 新架构中仍需以它们组织场景状态与任务类型。
3. **Web 优先，Electron 为壳**
   - 主目标是浏览器端可运行；
   - Electron 分支只承担“壳”的职责，不应把平台相关逻辑渗入核心业务代码。
4. **从零开始的新架构**
   - 新增代码不得照搬旧工程的目录结构；参考的是概念与经验，不是文件布局。

## 3. 当前仓库状态（事实）

- 仓库：`F:\Project\WebStructureUnityThreejs`（**双版本控制**：外层 git 仓库 + `NewStructureUnity/` 内嵌 Plastic 工作区，见 DEC-60）。
- `docs/requirement/raw/raw-requirement.md`：原始需求，唯一权威来源。
- `docs/`：需求分析 + 8 篇调研（`research/01~08`）+ 三轮问答 + **决策记录 `DECISIONS.md`（已定事项的唯一权威，现 72 条：DEC-01 ~ DEC-72）** + 4 篇设计草案（`design/01~04`）；页面清单见 `docs/PAGE-WORKLIST.md`，索引见 `docs/README.md`。
- `docs/ui-mockups/`：29 页静态排版稿 + `index.html`（**元件规范成果页**）+ 样式三份（**DEC-74**）：`tokens.css`（令牌，381 行）/ `components.css`（`.ui-*` 组件，产品用这两份）/ `mockup-shell.css`（**仅评审用**的外壳：`.board` / `.spec-*` / `.note`），`style.css` 只剩 14 行聚合入口（排版稿的 `<link>` 指向它）。
- `web/`：Web 侧工程（Vite 8 + TypeScript **5.9.3** + Vue 3 + 裸 three 0.186 + lucide-vue-next）+ **ESLint 10 / Prettier**（DEC-52）。**Phase 1 脚手架已落地**（DEC-75）：`components/`（AppShell / ShellCard / RouteBar）、`views/`（Start / Menu / Task / Debug / Placeholder）、`domain/registry.ts`（TaskType 表现层登记表）、`shell/`（bridge 与 theme）、`stores/`（session 真源 / progress 本机单 JSON / content）、`styles/`（只 import @ds）。`npm run typecheck / lint / format:check / test / build / smoke` 全部通过（冒烟 **20 项**，含"设计系统令牌真的加载"与"站点线 11 站"）。
- `NewStructureUnity/`：Unity 工程（**2022.3.53f1c1** + URP 14.0.11）。已有程序集分层（`WSU3.Contracts` / `WSU3.Core` / `WSU3.Runtime` / `WSU3.Editor` / `WSU3.Tests.EditMode`）、契约枚举 `Assets/Scripts/Contracts/EnumAll.cs`、**WebGL 基线构建工具**（菜单 `WSU3/Build/WebGL Baseline`）、契约冻结单测 `ContractIntegrityTests`；**业务逻辑尚未开始**。分层草案见 `docs/design/03-layout-and-assets.md`。
- `content/contracts/snapshot.json`：契约校验的**基准快照**（不是真源）。
- `electron/`：**应用壳**（DEC-20 / DEC-32 / DEC-12）。已落地：只绑 `127.0.0.1` 的本机静态服务器（`server.js`，MIME 表已为 Unity WebGL 的 `.wasm`/`.data` 预留、支持预压缩产物）、窗口加载**本地 Web 产物** `web/dist`（`main.js`）、只读预加载桥 `preload.js`（DEC-24 的预留接口）。`npm run smoke` 已通过（不显示窗口，断言 DOM 与桥后退出）。**打包分发未做**。取舍见 `electron/README.md`。
- `tools/` + `.github/workflows/gate.yml`：**提交门禁与合并门禁**（契约一致性、大文件阈值、**壳耦合**、类型检查、单测、构建、渲染冒烟）。
- WebGL 基线已实测（空场景：**8.40 MiB / 18 文件 / 188.9 秒**，Brotli），见 `docs/research/08-webgl-baseline.md`。
- 参考工程（只读）：`F:\Project\MCV_Module_0928`、`F:\Project\MCV_Module`、`F:\Project\SensorSimulationTrainingSoftware_v1.0_2026`；样式参考（只读）：`D:\dsh\deepseek-harness`。
- **尚未开始**：Electron 壳（`electron/` 目录未建）、Unity 业务逻辑、内容资源与真实场景。

> 注：需求要点已全部提炼至本文第 1、2 节；原始文件保持原样，不要改写它。

## 4. 工作约定

- **需求优先级**：`docs/requirement/raw/raw-requirement.md` > 本文件 > 其他文档。发生冲突时以原始需求为准。
- **歧义处理**：需求极简，凡本文件未覆盖的设计决策（目录结构、通信方式、SceneState/TaskType 的具体字段、Unity 与 Three.js 的边界判定标准等），先向用户确认，不要自行拍板并当作既定事实写进代码或文档。
- **参考工程**：查阅 `F:\Project\MCV_Module_0928`、`F:\Project\MCV_Module` 时视为只读；只提取 SceneState / TaskType 等既有约定，不在其中做修改。
- **改动范围**：只做被要求的事，不顺手重构无关文件；Unity 侧的 `Library/`、`Temp/`、`Logs/`、`UserSettings/`、`obj/` 等生成目录不纳入改动与评审。
- **⚠️ 提交必须走 PR + merge（硬纪律，DEC-78，2026-10-12 起）**：`main` **不再接受直接提交**，包括纯文档改动。
  - 固定流程：
    1. `git checkout -b <type>/<slug>`（如 `feat/product-scaffold`、`docs/pr-flow`）；
    2. 在分支上提交（本地 pre-commit hook 会先跑一遍门禁）；
    3. `git push -u origin <branch>`；
    4. 开 PR（`base = main`），**等 CI 门禁**（`.github/workflows/gate.yml`）通过 —— 它比本地 hook 多跑类型检查、单测、构建与真浏览器渲染冒烟；
    5. merge（推荐 **squash**，一个 PR 一个可验收改动，与 DEC-28 一致），然后 `git checkout main && git pull` 并删掉分支。
  - **不允许**为了省事把文档改动直接推到 `main`；CI 未通过不得 merge。
  - **Plastic 侧没有 PR 概念**：Unity 侧改动**仍然要**在 Plastic 提交（见下一条），git 侧走 PR —— 双渠道纪律不变，只是 git 侧的落点在 PR 里。
- **提交（双渠道，缺一不可）**：本仓库是**双版本控制**——外层 git 仓库 + `NewStructureUnity/` 内嵌的 Plastic 工作区（`docs/DECISIONS.md` DEC-60）。**涉及 Unity 侧的改动，两个渠道都必须提交**：
  1. **git**：按路径**显式** `git add <路径>`，**永不**用 `git add -A` / `git add .`（生成目录虽已在 `.gitignore` 排除，但显式添加是纪律）；
  2. **Plastic**：在 `NewStructureUnity/` 工作区里，按下面两步走（工作区：`NewStructureUnity@tj_kuaiprojcet@cloud.cn`，分支 `/main`）：
     - `cm add --recursive Assets Packages ProjectSettings ignore.conf` —— 新文件必须**显式递归添加**（实测：不加 `--recursive` 只加了目录本身，子目录仍是"私有"）；
     - `cm ci --all -c="..."` —— **必须用 `--all`**。实测 `cm ci .` 只提交了部分改动（新增项进了变更集，但已修改的设置文件仍留在"已更改"里），会造成两渠道不一致。
     - 提交后用 `cm status --all` 复核：**输出只剩工作区标题行**才算干净。
  只提交一侧会造成两边历史分叉，后续无法合并。允许**部分资产在两个渠道各保留一份**。
  - 提交信息说明“改了什么、为什么”，不要把需求原文以外的猜测当结论。
  - **大尺寸资产**（模型、贴图、视频）本阶段**不进 git**，另做处理；提交时若发现大文件，**先问用户**（DEC-57）。
  - `.plastic/` 是工作区本地元数据，**永不入库**（DEC-34）。
  - 每次改动应可独立验收：一个可验收的改动一次提交（DEC-28）。
- **文档**：新增设计文档放在 `docs/` 下，与 `docs/requirement/raw/` 的原始需求分开放置；文档索引见 `docs/README.md`。
- **README 与仓库现状同步**：`README.md` 是给人看的总览（仓库结构 / 怎么跑 / 当前状态）。**改动目录结构、命令、脚本或"当前状态"时，同一批改动里必须更新它**，不要让它落后于实际。
- **⚠️ 提交门禁必须通过（硬纪律）**：本仓库有自动化门禁，**门禁不过不得提交**。
  - 本地 pre-commit hook：由 `tools/install-hooks.ps1` 一次性安装到 `.git/hooks/`（hook 本体不入库）；它会跑契约一致性与大文件检查。
  - 手动复核：`node tools/check-contracts.mjs`（**TS ↔ 快照 ↔ C# 三方逐值比对**）、`node tools/check-large-files.mjs`（10 MB 阈值，见 DEC-65）、`node tools/check-shell-coupling.mjs`（业务代码零 `import electron`，见 DEC-20）。
  - 合并门禁：`.github/workflows/gate.yml`（CI）额外跑类型检查、单测、构建与三维渲染冒烟。
  - 契约三处必须同批修改：`web/src/contracts/*`（TS）、`content/contracts/snapshot.json`（基准快照）、`NewStructureUnity/Assets/Scripts/Contracts/EnumAll.cs`（C#）—— 只改一侧门禁会直接拦下（DEC-10 / DEC-67 / DEC-68）。
- **⚠️ 壳与业务的边界（硬纪律，DEC-20）**：业务代码（`web/src`、以及将来的业务逻辑）**不许 `import electron` / `window.electron` / `window.require`**，也不许改写 `window.wsu3Shell` —— 由 `tools/check-shell-coupling.mjs` 机械拦截（已进 hook 与 CI）。
  - 需要壳能力（截图、文件、单点登录…）时：**加在 `electron/preload.js` + 主进程 `ipcMain`**，业务侧仍只认 `window.wsu3Shell.*`（DEC-24：只预留接口点，当期不实现）。
  - 反过来：`electron/` 里不许写业务逻辑，壳只负责"起本机服务 + 开窗口 + 守安全边界"，且必须加载 `web/dist` 这一份**同一产物**（不是另做壳内页面、不是 Unity 单机版）。
- **框体样式受令牌约束**：Web 端的描边 / 圆角 / 浮起 / 交互态**不得写零散字面值**，一律走 `docs/ui-mockups/tokens.css` + `components.css` 的令牌：中性描边 `0.5px solid var(--border-1|2|3|4)`（α 值随主题反转）、圆角只用 `--radius-xs|sm|md|lg|xl|panel`（6 级、按角色选档）、浮层用 `border: 0` + `var(--elev-*)`、交互态用 `var(--inter-*)`。规则出处：只读参考 `D:\dsh\deepseek-harness` 的 `docs/web-styling.md` 与 `docs/ui-radius.md`，我们的取舍写在 `components.css` §20.7。
  - **产品只许 import `tokens.css` + `components.css`**，**禁止** import `mockup-shell.css`（DEC-74 约束 1：评审外壳不得进产品）；`tokens.css` 必须在前（令牌先于组件）。落地方式：`vite.config.ts` 里的 `@ds` 别名，产品样式入口 `src/styles/index.css` 只有三行 `@import`。
  - 产品**不许再出现第二套色板**：早期骨架的 `src/styles/main.css` 已删除（它自带 `--bg/--panel/--accent`，会覆盖设计系统令牌）。
- **桌面壳的标题栏留位（DEC-77 连带约定）**：Windows 壳隐藏了原生标题栏，系统浮层按钮占顶部 40px，由页面通过 `--shell-caption-h` 留出（壳经 `window.wsu3Shell.captionHeight` 告知；浏览器里为 0）。**改布局时不要假设顶部有 40px**，也不要硬编码 40。
- **⚠️ Web 样式必须集中在样式成果页里体现（硬纪律）**：任何 Web 端样式（设计令牌、组件类名、状态变体）**都必须在 `docs/ui-mockups/index.html`（样式清单成果页）里有对应展示**。
  - 新增或修改样式时，**同一批改动里必须**在 `docs/ui-mockups/src/style-spec.mjs` 补上示例条目，然后重新生成成果页；**只写在 CSS 里、成果页看不到的样式，视为未完成**。
  - 两套主题（深色 / 亮色）都算"必须展现"的范围：改令牌后要确认成果页与页面在**两种主题**下都正常。
  - 理由：样式成果页是唯一"看得见全部样式"的地方，也是负责人审板的入口；看不到的样式等于没评审过，会在实现阶段变成口头约定的漂移。

## 5. 待澄清项（不要默认已解决）

> 下列各项已编号化并**已回答**：答案固化在 `docs/DECISIONS.md`（**已定事项的唯一权威记录**，只增不改，现含**三轮共 72 条**决策：DEC-01 ~ DEC-72（第一轮 §1~§9、第二轮 §10~§13、第三轮 §14~§15）；三轮的原始问答分别见 `docs/OPEN-QUESTIONS.md`、`docs/OPEN-QUESTIONS-R2.md`、`docs/OPEN-QUESTIONS-R3.md`，**均已关闭**。本节只保留原始提法，不重复维护答案。
> **未列入 `docs/DECISIONS.md` 的事项仍属未决**，按 §4 的"歧义处理"执行。当前明确未决：**运行环境最终形态**（DEC-05 / DEC-35，先按"服务器可控"实现）。

- 复杂 / 简单三维交互的**判定标准**是什么？
- Unity 与 Web 之间的**运行时职责划分与数据/资源通道**（构建产物、通信协议、状态同步方式）？
- SceneState、TaskType 在既有工程中的**确切定义**，以及新架构是否原样继承？
- Electron 壳分支的**目录与构建方式**（同仓分支还是同仓子目录）？
- Web 侧技术栈（框架、渲染层组织、构建工具）与目标浏览器范围。
- 目标用户（学生 / 教师 / 管理端）与运行时环境（在线、离线、局域网部署）。
