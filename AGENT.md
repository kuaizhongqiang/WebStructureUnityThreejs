# AGENT.md

本文件是本仓库的 **AI 协作入口说明**，供在本项目中工作的 AI Agent（以及人）快速对齐上下文。

- `README.md` 是**给人看的总览**（仓库结构 / 怎么跑 / 当前状态）；
- 本文件是**约定与纪律的权威**，两者分工不重叠；
- 第 1、2 节来自 `docs/requirement/raw/raw-requirement.md`（原始需求，唯一权威来源），未做需求外的推断；
- 第 3 节只写**已核实的仓库事实**，第 4 节是**必须遵守的工作约定**，第 5 节是**仍未闭合的项**。

---

## 1. 项目是什么

- 一个**教育类虚拟仿真软件**项目。
- **全新架构，从零开始**：具备同类经验可供借鉴，但**不复用既有工程的结构与代码**，只提取概念与经验。
- 交付形态：**默认 Web 端**，另有 **Electron 应用壳（app 壳）**（与 Web 工程同仓，`electron/` 子目录，见 DEC-20 / DEC-32）。

## 2. 不可动摇的架构约束

以下几条是需求中明确写死的，任何实现方案都不得违背：

1. **三维交互按复杂度分流**
   - **复杂三维交互 → Unity**
   - **简单三维交互 → Three.js**
   - 因此本项目同时存在 Web（Three.js）与 Unity 两条技术线，两者是分工关系，不是二选一。
2. **保留 SceneState 与 TaskType 概念**
   - 这两个概念沿用既有约定，不要改名、不要重新发明；
   - 新架构中仍需以它们组织场景状态与任务类型。
3. **Web 优先，Electron 为壳**
   - 主目标是浏览器端可运行；
   - Electron 分支只承担“壳”的职责，不应把平台相关逻辑渗入核心业务代码。
4. **从零开始的新架构**
   - 新增代码不得照搬既有工程的目录结构；参考的是概念与经验，不是文件布局。

## 3. 当前仓库状态（事实）

- 仓库：**外层 git 仓库 + `NewStructureUnity/` 内嵌 Plastic 工作区**（双版本控制，见 DEC-60 / DEC-34）。
- `docs/requirement/raw/raw-requirement.md`：原始需求，唯一权威来源。
- `docs/`：需求分析 + 8 篇调研（`research/01~08`）+ **五轮问答**（均已关闭）+ **决策记录 `DECISIONS.md`（已定事项的唯一权威，现 79 条：DEC-01 ~ DEC-79）** + **7 篇设计文档（`design/01~07`）**；页面清单见 `docs/PAGE-WORKLIST.md`，索引见 `docs/README.md`。
- `docs/ui-mockups/`：29 页静态排版稿 + `index.html`（**样式与元件成果页**，也是唯一"看得见全部样式"的地方）+ 样式**三份**（DEC-74）：`tokens.css`（令牌）/ `components.css`（`.ui-*` 组件，**产品用这两份**）/ `mockup-shell.css`（**仅评审用**的外壳：`.board` / `.spec-*` / `.note`）；`style.css` 只是排版稿的聚合入口。**框体规则见 `docs/design/07-frame-style-rules.md`**。
- `web/`：Web 侧工程（Vite 8 + TypeScript **5.9.3** + Vue 3 + 裸 three 0.186 + lucide-vue-next）+ **ESLint 10 / Prettier**（DEC-52）。**Phase 1 脚手架已落地**（DEC-75 / DEC-73）：`components/`（AppShell / ShellCard / RouteBar）、`views/`（Start / Menu / Task / Debug / Placeholder）、`domain/registry.ts`（TaskType 表现层登记表）、`shell/`（bridge 与 theme）、`stores/`（session 真源 / progress 本机单 JSON / content / runtime 发布清单）、`styles/`（`@ds` 别名只 import tokens + components）、`unity/`（`UnityLoader` + 协议桥骨架）。`npm run typecheck / lint / format:check / test / build / smoke` 全部通过（渲染冒烟 **20 项**，含"设计系统令牌真的加载"、"站点线 11 站"、"骨架自检页可达"）。
- `electron/`：**应用壳**（DEC-20 / DEC-32 / DEC-12 / DEC-77）。已落地：只绑 `127.0.0.1` 的本机静态服务器（`server.js`：MIME 覆盖 Unity 的 `.wasm`/`.data`/`.unityweb`/`.mem`、命中预压缩产物附 `Content-Encoding`、`/unity/**` 独立根目录、COOP/COEP 由 `WSU3_COOP_COEP` 开关）；窗口加载**本地 Web 产物** `web/dist`（`main.js`）；Windows 下隐藏原生标题栏 + 系统浮层按钮（页面用 `--shell-caption-h` 留位）；只读预加载桥 `preload.js`（`captionHeight` / `setTheme`）；**打包分发已做**（electron-builder portable → 单文件 exe）；冒烟两段（挂载 + Unity 页取证，报告落 JSON）。取舍见 `electron/README.md`。
- `NewStructureUnity/`：Unity 工程（**2022.3.53f1c1** + URP 14.0.11）。已有程序集分层（`WSU3.Contracts` / `WSU3.Core` / `WSU3.Runtime` / `WSU3.Editor` / `WSU3.Tests.EditMode`）、契约枚举 `Assets/Scripts/Contracts/EnumAll.cs`、**WebGL 基线构建工具**（菜单 `WSU3/Build/WebGL Baseline`）、契约冻结单测 `ContractIntegrityTests`；**业务逻辑尚未开始**。分层草案见 `docs/design/03-layout-and-assets.md`。
- `content/contracts/snapshot.json`：契约校验的**基准快照**（不是真源；真源是两侧各自手写的契约代码）。
- `unity/builds/` + `tools/pipeline/`：**Unity 产物暂存与打包流水线**（DEC-79）。产物不进 git（DEC-57）；`unity-stage.mjs` 暂存并逐文件记 sha256，`unity-verify.mjs` 打包前重算比对，`pack.mjs` 一键打包并产出 `release-manifest.json`（发布清单：Web / 内容 / Unity 指纹 / 服务端约定）。**Unity 侧还没有协议桥（无 `.jslib`）**，因此真实构建首次接入的表现是"画面挂上、待握手"。
- `tools/` + `.github/workflows/gate.yml`：**提交门禁与合并门禁** —— 契约一致性（TS ↔ 快照 ↔ C#）、大文件阈值（10 MB）、**壳耦合**、**Unity 清单校验**；CI 另跑类型检查、ESLint、Prettier、单测、构建与真浏览器渲染冒烟。
- WebGL 基线已实测（空场景：**8.40 MiB / 18 文件 / 188.9 秒**，Brotli），见 `docs/research/08-webgl-baseline.md`。
- **尚未开始**：Unity 业务逻辑与真实场景、内容资源交付、协议桥的 Unity 侧实现（DEC-07 未落地）。

> 注：需求要点已全部提炼至本文第 1、2 节；原始文件保持原样，不要改写它。

## 4. 工作约定

- **需求优先级**：`docs/requirement/raw/raw-requirement.md` > 本文件 > 其他文档。发生冲突时以原始需求为准。
- **歧义处理**：需求极简，凡本文件未覆盖的设计决策（目录结构、通信方式、SceneState/TaskType 的具体字段、Unity 与 Three.js 的边界判定标准等），先向用户确认，不要自行拍板并当作既定事实写进代码或文档。
- **改动范围**：只做被要求的事，不顺手重构无关文件；Unity 侧的 `Library/`、`Temp/`、`Logs/`、`UserSettings/`、`obj/` 等生成目录不纳入改动与评审。
- **⚠️ 提交必须走 PR + merge（硬纪律，DEC-78）**：`main` **不接受直接提交**，包括纯文档改动。
  - 固定流程：
    1. `git checkout -b <type>/<slug>`（如 `feat/product-scaffold`、`docs/pr-flow`）；
    2. 在分支上提交（本地 pre-commit hook 会先跑一遍门禁）；
    3. `git push -u origin <branch>`；
    4. 开 PR（`base = main`），**等 CI 门禁**（`.github/workflows/gate.yml`）通过；
    5. merge（推荐 **squash**），然后 `git checkout main && git pull` 并删掉分支。
  - **不允许**为了省事把改动直接推到 `main`；CI 未通过不得 merge。
  - **Plastic 侧没有 PR 概念**：Unity 侧改动**仍然要**在 Plastic 提交（见下一条），git 侧走 PR —— 双渠道纪律不变，只是 git 侧的落点在 PR 里。
- **提交（双渠道，缺一不可）**：本仓库是**双版本控制**——外层 git 仓库 + `NewStructureUnity/` 内嵌的 Plastic 工作区（DEC-60）。**涉及 Unity 侧的改动，两个渠道都必须提交**：
  1. **git**：按路径**显式** `git add <路径>`，**永不**用 `git add -A` / `git add .`；
  2. **Plastic**：在 `NewStructureUnity/` 工作区里，按下面两步走（工作区：`NewStructureUnity@tj_kuaiprojcet@cloud.cn`，分支 `/main`）：
     - `cm add --recursive Assets Packages ProjectSettings ignore.conf` —— 新文件必须**显式递归添加**；
     - `cm ci --all -c="..."` —— **必须用 `--all`**，否则已修改的设置文件会留在"已更改"里，造成两渠道不一致；
     - 提交后用 `cm status --all` 复核：**输出只剩工作区标题行**才算干净。
  只提交一侧会造成两边历史分叉，后续无法合并。允许**部分资产在两个渠道各保留一份**。
  - 提交信息说明"改了什么、为什么"，不要把需求原文以外的猜测当结论。
  - **大尺寸资产**（模型、贴图、视频、Unity 构建产物）本阶段**不进 git**，另做处理；提交时若发现大文件，**先问用户**（DEC-57）。
  - `.plastic/` 是工作区本地元数据，**永不入库**（DEC-34）。
  - 每次改动应可独立验收：一个可验收的改动一次提交（DEC-28）。
- **⚠️ 文档里禁止出现外部引用（硬纪律）**：分两层执行，别搞混。
  - **第一层（必须干净）**：`README.md`、`AGENT.md`、`docs/README.md`、`docs/design/**`、`docs/PAGE-WORKLIST.md` 的**规范段**、
    以及**全部代码注释**（`web/src` / `electron` / `docs/ui-mockups` 的 CSS 与生成器 / Unity 的 `.cs`）：
    **不得**出现外部仓库名、外部工程名、本机绝对路径、第三方文件路径。
  - **第二层（摘录与档案，允许存在但需自成一文）**：`docs/requirement/**`（原始需求）、`docs/research/**`（调研）、
    `docs/PAGE-WORKLIST.md` 的对照表、`docs/DECISIONS.md`（只增不改的历史记录）。
    这些文档的**内容本身就是"我们对既有同类软件的调研与摘录"**，允许保留被调研对象的名称、面板名与结论；
    但**本机绝对路径应逐步替换为仓库内相对路径或去掉**（别人的机器上打不开，也没有信息量）。
  - **要遵循外部规则时**：把**规则本身**用自己的话写进 `docs/design/NN-*.md`，然后**引用我们自己的文档**（不要写"参考 XXX 的 yy 文件"）。
    已有摘录位置：框体样式规则 → `docs/design/07-frame-style-rules.md`；Unity 构建注意事项 → `docs/design/06-unity-manual-build-checklist.md`。
  - 理由：文档要能独立读懂、可对外交付；指向外部的引用会把"依据"变成不可核查的口头约定。
- **文档**：新增设计文档放在 `docs/design/` 下（命名 `NN-主题.md`），调研放 `docs/research/`，与 `docs/requirement/raw/` 的原始需求分开放置；文档索引见 `docs/README.md`。
- **README 与仓库现状同步**：`README.md` 是给人看的总览（仓库结构 / 怎么跑 / 当前状态）。**改动目录结构、命令、脚本或"当前状态"时，同一批改动里必须更新它**，不要让它落后于实际。
- **⚠️ 提交门禁必须通过（硬纪律）**：本仓库有自动化门禁，**门禁不过不得提交**。
  - 本地 pre-commit hook：由 `tools/install-hooks.ps1` 一次性安装到 `.git/hooks/`（hook 本体不入库）；跑契约一致性、大文件、壳耦合、类型检查、ESLint、Prettier、单测。
  - 手动复核：`node tools/check-contracts.mjs`（**TS ↔ 快照 ↔ C# 三方逐值比对**）、`node tools/check-large-files.mjs`（10 MB 阈值，DEC-65）、`node tools/check-shell-coupling.mjs`（业务代码零 `import electron`，DEC-20）、`node tools/pipeline/unity-verify.mjs`（Unity 暂存区与清单一致）。
  - 合并门禁：`.github/workflows/gate.yml`（CI）额外跑类型检查、规范、单测、构建与真浏览器渲染冒烟。
  - 契约三处必须同批修改：`web/src/contracts/*`（TS）、`content/contracts/snapshot.json`（基准快照）、`NewStructureUnity/Assets/Scripts/Contracts/EnumAll.cs`（C#）—— 只改一侧门禁会直接拦下（DEC-10 / DEC-67 / DEC-68）。
- **⚠️ 壳与业务的边界（硬纪律，DEC-20）**：业务代码（`web/src`、以及将来的业务逻辑）**不许 `import electron` / `window.electron` / `window.require`**，也不许改写 `window.wsu3Shell` —— 由 `tools/check-shell-coupling.mjs` 机械拦截（已进 hook 与 CI）。
  - 需要壳能力（截图、文件、单点登录…）时：**加在 `electron/preload.js` + 主进程 `ipcMain`**，业务侧仍只认 `window.wsu3Shell.*`（DEC-24：只预留接口点，当期不实现）。
  - 反过来：`electron/` 里不许写业务逻辑，壳只负责"起本机服务 + 开窗口 + 守安全边界"，且必须加载 `web/dist` 这一份**同一产物**（不是另做壳内页面、不是 Unity 单机版）。
- **框体样式受令牌约束**：Web 端的描边 / 圆角 / 浮起 / 交互态 / 焦点环 / 中文排版规则，**权威描述见 `docs/design/07-frame-style-rules.md`**，落地在 `docs/ui-mockups/tokens.css` + `components.css`（§20）。**不得写零散字面值**。
  - **产品只许 import `tokens.css` + `components.css`**，**禁止** import `mockup-shell.css`（DEC-74：评审外壳不得进产品）；`tokens.css` 必须在前。落地方式：`vite.config.ts` 的 `@ds` 别名，产品样式入口 `src/styles/index.css` 只有三行 `@import`。
  - 产品**不许再出现第二套色板**：早期骨架的 `src/styles/main.css` 已删除（它自带 `--bg/--panel/--accent`，会覆盖设计系统令牌）。
- **桌面壳的标题栏留位（DEC-77 连带约定）**：Windows 壳隐藏了原生标题栏，系统浮层按钮占顶部 40px，由页面通过 `--shell-caption-h` 留出（壳经 `window.wsu3Shell.captionHeight` 告知；浏览器里为 0）。**改布局时不要假设顶部有 40px**，也不要硬编码 40。
- **Unity 产物走流水线，不许"假设有"（DEC-79，细则 `docs/design/05`）**：
  - 产物**只**放 `unity/builds/<key>/`（不进 git，DEC-57）；搬运用 `tools/pipeline/unity-stage.mjs`，**不要**手工拷进 `web/public/`。
  - 打包**只**用 `node tools/pipeline/pack.mjs`（先校验 Unity 暂存区、再构建、再写 `release-manifest.json`，最后 electron-builder）。手工跑 `electron-builder` 会绕过校验与清单。
  - 页面判断"能不能挂 Unity"**只认发布清单**（`stores/runtime.ts`）。**禁止**写"假设有 Unity、先显示加载中"的代码 —— 缺席时必须显示"产物未包含 + 接入命令"。
  - 新增 Unity 承载的 TaskType 时：先按 `docs/design/05` §3.2 定 key，再暂存构建；**不需要**改加载器代码。
  - **手动构建前先读 `docs/design/06-unity-manual-build-checklist.md`**（压缩/MIME、数据缓存、Addressables 内容位置、中文 TMP 字形等）。
- **⚠️ Web 样式必须集中在样式成果页里体现（硬纪律）**：任何 Web 端样式（设计令牌、组件类名、状态变体）**都必须在 `docs/ui-mockups/index.html`（样式清单成果页）里有对应展示**。
  - 新增或修改样式时，**同一批改动里必须**在 `docs/ui-mockups/src/style-spec.mjs` 补上示例条目，然后重新生成成果页；**只写在 CSS 里、成果页看不到的样式，视为未完成**。
  - 两套主题（深色 / 亮色）都算"必须展现"的范围：改令牌后要确认成果页与页面在**两种主题**下都正常。
  - 理由：样式成果页是唯一"看得见全部样式"的地方，也是负责人审板的入口；看不到的样式等于没评审过，会在实现阶段变成口头约定的漂移。

## 5. 待澄清项（不要默认已解决）

> 五轮问答**均已关闭**，答案固化在 `docs/DECISIONS.md`（**已定事项的唯一权威记录，只增不改**，现 79 条：DEC-01 ~ DEC-79）。五轮的原始问答分别见 `docs/OPEN-QUESTIONS.md`、`OPEN-QUESTIONS-R2.md`、`OPEN-QUESTIONS-R3.md`（第四、五轮以追加条目形式直接落在 `DECISIONS.md`）。本节只保留**当前仍未闭合**的项。

- **运行环境的最终形态**（在线 / 离线 / 局域网、目标静态托管）——DEC-05 / DEC-35 先不定，实现按"服务器可控"。
- **协议桥的 Unity 侧实现**（`.jslib` + 接收脚本）：DEC-07 已定协议，**尚未落地**；在它完成前，Unity 类任务只能验"画面挂上"。
- **亮色是否作为默认主题**：两套主题都已支持，默认仍是深色。
- **内容侧的交付形态**：`content/projects/*.json` 的真实内容尚未交付，当前为内置演示数据。
- **包体预算门禁**：DEC-02 的 250~360 MB 预算目前只有文字，尚无脚本门禁（现有门禁只管单文件 10 MB）。
