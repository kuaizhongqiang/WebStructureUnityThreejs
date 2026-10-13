# AGENT.md

本文件是本仓库的 **AI 协作入口说明**，供在本项目中工作的 AI Agent（以及人）快速对齐上下文。

- **本文件只放纪律与约定**（第 2、4 节）。事实与状态**不在这里维护** —— 各只有一个维护点，避免"同一件事两处写、两处漂"：
  - 项目是什么、仓库结构、怎么跑、当前状态 → **`README.md`**（`§1` 结构、`§3` 状态、`§4` 怎么跑）；
  - 已定事项 → **`docs/DECISIONS.md`**（唯一权威，**只增不改**）；
  - **计划 → `docs/PLAN.md`；待办（未闭合）→ `docs/TODO.md`；记录 → `docs/RECORD.md`**（三者分家，纪律见 §4「文档三分」）；
  - 需求 → **`docs/requirement/raw/raw-requirement.md`**（唯一权威来源，只读）。
- 权威层级：原始需求 > 本文件 > `docs/DECISIONS.md` > 其他文档。
- 第 1、2 节来自原始需求，未做需求外的推断；第 3、5 节是**指针**；第 4 节是**必须遵守的工作约定**。

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

## 3. 当前仓库状态

**不在本文件维护。** 需要状态事实时读这两处，不要在这里补写：

- **仓库结构 / 怎么跑 / 当前状态 / 尚未开始的事项** → `README.md`（`§1` / `§3` / `§4`）。
- **已定事项** → `docs/DECISIONS.md`；**接下来做什么** → `docs/PLAN.md`；
  **还剩什么** → `docs/TODO.md`；**做完了什么 + 证据** → `docs/RECORD.md`。

## 4. 工作约定

> 本节按主题排列：**提交与同步**（PR、双渠道、门禁）→ **文档**（读写与引用纪律）→ **边界**（壳与业务、样式、三维产物）→ **验收可见性**。

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
- **⚠️ 提交门禁必须通过（硬纪律）**：本仓库有自动化门禁，**门禁不过不得提交**。
  - 本地 pre-commit hook：由 `tools/install-hooks.ps1` 一次性安装到 `.git/hooks/`（hook 本体不入库）；跑契约一致性、大文件、壳耦合、类型检查、ESLint、Prettier、单测。
  - 手动复核：`node tools/check-contracts.mjs`（**TS ↔ 快照 ↔ C# 三方逐值比对**）、`node tools/check-large-files.mjs`（10 MB 阈值，DEC-65）、`node tools/check-shell-coupling.mjs`（业务代码零 `import electron`，DEC-20）、`node tools/pipeline/unity-verify.mjs`（Unity 暂存区与清单一致）。
  - 合并门禁：`.github/workflows/gate.yml`（CI）额外跑类型检查、规范、单测、构建与真浏览器渲染冒烟。
  - 契约三处必须同批修改：`web/src/contracts/*`（TS）、`content/contracts/snapshot.json`（基准快照）、`NewStructureUnity/Assets/Scripts/Contracts/EnumAll.cs`（C#）—— 只改一侧门禁会直接拦下（DEC-10 / DEC-67 / DEC-68）。
- **⚠️ 文档里禁止出现外部引用（硬纪律）**：分两层执行，别搞混。
  - **第一层（必须干净）**：`README.md`、`AGENT.md`、`docs/README.md`、`docs/design/**`、`docs/PAGE-WORKLIST.md` 的**规范段**、
    以及**全部代码注释**（`web/src` / `electron` / `docs/ui-mockups` 的 CSS 与生成器 / Unity 的 `.cs`）：
    **不得**出现外部仓库名、外部工程名、本机绝对路径、第三方文件路径。
  - **第二层（摘录与档案，允许存在但需自成一文）**：`docs/requirement/**`（原始需求）、`docs/research/**`（调研）、
    `docs/PAGE-WORKLIST.md` 的对照表、`docs/DECISIONS.md`（只增不改的历史记录）。
    这些文档的**内容本身就是"我们对既有同类软件的调研与摘录"**，允许保留被调研对象的名称与结论；
    但**本机绝对路径应替换为仓库内相对路径或占位符**（别人的机器上打不开，也没有信息量）。
  - **要遵循外部规则时**：把**规则本身**用自己的话写进 `docs/design/NN-*.md`，然后**引用我们自己的文档**（不要写"参考 XXX 的 yy 文件"）。
    已有摘录位置：框体样式规则 → `docs/design/07-frame-style-rules.md`；Unity 构建注意事项 → `docs/design/06-unity-manual-build-checklist.md`。
- **⚠️ 文档三分：计划 / 待办 / 记录，各只有一个维护点（硬纪律）**：这三件事此前混在 `PLAN.md` 里 —— 那个文件开头写"只写接下来做什么"，正文却塞了 21 行"已完成 + 证据"，结果谁也读不干净。2026-10-13 拆开，此后按下面执行：
  - **`docs/PLAN.md`** —— 只回答"**接下来做什么**"：分批（P0 → P1 → P2）、落点、**验收标准**、依赖顺序。**不写"已完成"，不写"待拍板"**。
  - **`docs/TODO.md`** —— 只回答"**现在还剩什么**"：§1 待拍板（要负责人一句话的）、§2 待做（方向已定缺实施的）、§3 未提交。**所有新增待办只加到这里**（历史遗留的 `DECISIONS.md` 未闭合表、`OPEN-QUESTIONS*`、`PAGE-WORKLIST.md`、`ui-mockups/TODO.md` 不再各自新增，遇旧条目搬一条过来）。每条要能回答"**下一步动作 + 谁拍板 + 来源链接**"；细节只写在来源文件里，这里**不复制**。
  - **`docs/RECORD.md`** —— 只回答"**做完了什么 + 证据**"：日期 / 结果 / 证据（提交号、PR、报告文件、命令输出摘要）。**只增不改**，不写"打算"。
  - **联动节奏（同一批改动里做完，不许分两次）**：① 要动手的 → 在 `TODO.md` 加一条；② 要人拍板的 → 同批在 `DECISIONS.md` 立条目，`TODO.md` 只留一句索引指回去；③ 做完了 → 从 `TODO.md` **删掉**该条 → 在 `RECORD.md` **加一行**（带证据）→ 若它还是 `PLAN.md` 里的计划项，改状态或删除；④ 拍了板 → `DECISIONS.md` 加条目（**只增不改**，推翻旧决策要写明取代关系）。
  - **禁止**：同一件事在两处写（必漂）；在 `PLAN.md` 里写"已完成"；在 `RECORD.md` 里写"打算"；在 `TODO.md` 里复制别处的细节。
  - **权威层级不变**：已定事项以 `DECISIONS.md` 为准；**未列入 `TODO.md` 的事项一律按"未决"处理**（按 §4「歧义处理」先问用户，不要自行拍板）。
- **文档的唯一维护点（其余各一份）**：
  - **仓库状态 / 结构 / 怎么跑** → 只在 `README.md`；**已定事项** → 只在 `docs/DECISIONS.md`；**计划 / 待办 / 记录** → 见上一条；
  - 新增设计文档放 `docs/design/`（命名 `NN-主题.md`），调研放 `docs/research/`，与 `docs/requirement/raw/` 的原始需求分开放置；索引与写作约定见 `docs/README.md`。
  - **改动目录结构、命令、脚本或"当前状态"时，同一批改动里必须更新 `README.md`**，不要让它落后于实际。
- **⚠️ 壳与业务的边界（硬纪律，DEC-20）**：业务代码（`web/src`、以及将来的业务逻辑）**不许 `import electron` / `window.electron` / `window.require`**，也不许改写 `window.wsu3Shell` —— 由 `tools/check-shell-coupling.mjs` 机械拦截（已进 hook 与 CI）。
  - 需要壳能力（截图、文件、单点登录…）时：**加在 `electron/preload.js` + 主进程 `ipcMain`**，业务侧仍只认 `window.wsu3Shell.*`（DEC-24：只预留接口点，当期不实现）。
  - 反过来：`electron/` 里不许写业务逻辑，壳只负责"起本机服务 + 开窗口 + 守安全边界"，且必须加载 `web/dist` 这一份**同一产物**（不是另做壳内页面、不是 Unity 单机版）。
- **框体样式受令牌约束**：Web 端的描边 / 圆角 / 浮起 / 交互态 / 焦点环 / 中文排版规则，**权威描述见 `docs/design/07-frame-style-rules.md`**，落地在 `docs/ui-mockups/tokens.css` + `components.css`（§20）。**不得写零散字面值**。
  - **产品只许 import `tokens.css` + `components.css`**，**禁止** import `mockup-shell.css`（DEC-74：评审外壳不得进产品）；`tokens.css` 必须在前。落地方式：`vite.config.ts` 的 `@ds` 别名，产品样式入口 `src/styles/index.css` 只有三行 `@import`。
  - 产品**不许再出现第二套色板**：早期骨架的 `src/styles/main.css` 已删除（它自带 `--bg/--panel/--accent`，会覆盖设计系统令牌）。
- **⚠️ Web 样式必须集中在样式成果页里体现（硬纪律）**：任何 Web 端样式（设计令牌、组件类名、状态变体）**都必须在 `docs/ui-mockups/index.html`（样式清单成果页）里有对应展示**。
  - 新增或修改样式时，**同一批改动里必须**在 `docs/ui-mockups/src/style-spec.mjs` 补上示例条目，然后重新生成成果页；**只写在 CSS 里、成果页看不到的样式，视为未完成**。
  - 两套主题（深色 / 亮色）都算"必须展现"的范围：改令牌后要确认成果页与页面在**两种主题**下都正常。
  - 理由：样式成果页是唯一"看得见全部样式"的地方，也是负责人审板的入口；看不到的样式等于没评审过，会在实现阶段变成口头约定的漂移。
- **桌面壳的标题栏留位（DEC-77 连带约定）**：Windows 壳隐藏了原生标题栏，系统浮层按钮占顶部 40px，由页面通过 `--shell-caption-h` 留出（壳经 `window.wsu3Shell.captionHeight` 告知；浏览器里为 0）。**改布局时不要假设顶部有 40px**，也不要硬编码 40。
- **Unity 产物走流水线，不许"假设有"（DEC-79，细则 `docs/design/05`）**：
  - 产物**只**放 `unity/builds/<key>/`（不进 git，DEC-57）；搬运用 `tools/pipeline/unity-stage.mjs`，**不要**手工拷进 `web/public/`。
  - 打包**只**用 `node tools/pipeline/pack.mjs`（先校验 Unity 暂存区、再构建、再写 `release-manifest.json`，最后 electron-builder）。手工跑 `electron-builder` 会绕过校验与清单。
  - 页面判断"能不能挂 Unity"**只认发布清单**（`stores/runtime.ts`）。**禁止**写"假设有 Unity、先显示加载中"的代码 —— 缺席时必须显示"产物未包含 + 接入命令"。
  - 新增 Unity 承载的 TaskType 时：先按 `docs/design/05` §3.2 定 key，再暂存构建；**不需要**改加载器代码。
  - **手动构建前先读 `docs/design/06-unity-manual-build-checklist.md`**（压缩/MIME、数据缓存、Addressables 内容位置、中文 TMP 字形等）。

## 5. 未闭合项（不要默认已解决）

**不在本文件维护。** 唯一维护点是 **`docs/TODO.md`**（待拍板 / 待做 / 未提交，含每项的现状、要你定什么与来源链接）。

- **未列入 `docs/TODO.md` 的事项一律按"未决"处理**，按 §4 的"歧义处理"执行 —— 先向用户确认，不要自行拍板。
- `DECISIONS.md` 各章末尾的历史「未闭合」表**保留作每条决策自己的出处**，但**状态以 `TODO.md` 为准**（做完的条目会从 TODO 删掉并在 `RECORD.md` 记一行）。
