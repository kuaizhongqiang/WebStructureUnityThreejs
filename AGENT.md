# AGENT.md

本文件是本仓库的 AI 协作入口说明，供在本项目中工作的 AI Agent（以及人）快速对齐上下文。
内容全部来自 `docs/requirement/raw/raw-requirement.md`（原始需求，唯一权威来源），未做需求外的推断。

---

## 1. 项目是什么

- 一个**教育类虚拟仿真软件**项目。
- **全新架构，从零开始**：不要复用旧工程的结构，只把旧工程当作参考。
- 可参考的既有工程（只读参考，不是本项目代码基线）：
  - `F:\Project\MCV_Module_0928`
  - `F:\Project\MCV_Module`
- 交付形态：**默认 Web 端**，另有 **Electron 应用壳（app 壳）分支**。

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
- `docs/`：需求分析、调研、两轮问答、**决策记录 `DECISIONS.md`（已定事项的唯一权威）**。索引见 `docs/README.md`。
- `NewStructureUnity/`：Unity 工程（Unity 2022.3.53f1c1 + URP 14.0.11，含 Assets / Packages / ProjectSettings），业务代码尚为零（`Assets/Scripts` 未建）；目录与程序集分层草案见 `docs/design/03-layout-and-assets.md`。
- `web/`：Web 侧工程（Vite + TypeScript 5.9.3 + Vue 3 + 裸 three），骨架已落地并验证（typecheck / 单测 / 构建 / 三维渲染冒烟均通过）。
- 参考工程（只读）：`F:\Project\MCV_Module_0928`、`F:\Project\MCV_Module`、`F:\Project\SensorSimulationTrainingSoftware_v1.0_2026`。

> 注：需求要点已全部提炼至本文第 1、2 节；原始文件保持原样，不要改写它。

## 4. 工作约定

- **需求优先级**：`docs/requirement/raw/raw-requirement.md` > 本文件 > 其他文档。发生冲突时以原始需求为准。
- **歧义处理**：需求极简，凡本文件未覆盖的设计决策（目录结构、通信方式、SceneState/TaskType 的具体字段、Unity 与 Three.js 的边界判定标准等），先向用户确认，不要自行拍板并当作既定事实写进代码或文档。
- **参考工程**：查阅 `F:\Project\MCV_Module_0928`、`F:\Project\MCV_Module` 时视为只读；只提取 SceneState / TaskType 等既有约定，不在其中做修改。
- **改动范围**：只做被要求的事，不顺手重构无关文件；Unity 侧的 `Library/`、`Temp/`、`Logs/`、`UserSettings/`、`obj/` 等生成目录不纳入改动与评审。
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

## 5. 待澄清项（不要默认已解决）

> 下列各项已编号化并**已回答**：答案固化在 `docs/DECISIONS.md`（**已定事项的唯一权威记录**，只增不改，现含两轮共 62 条决策）；两轮的原始问答见 `docs/OPEN-QUESTIONS.md`（第一轮）与 `docs/OPEN-QUESTIONS-R2.md`（第二轮），第三轮待答见 `docs/OPEN-QUESTIONS-R3.md`。本节只保留原始提法，不重复维护答案。
> **未列入 `docs/DECISIONS.md` 的事项仍属未决**，按 §4 的"歧义处理"执行。当前明确未决：**运行环境最终形态**（DEC-05 / DEC-35，先按"服务器可控"实现）。

- 复杂 / 简单三维交互的**判定标准**是什么？
- Unity 与 Web 之间的**运行时职责划分与数据/资源通道**（构建产物、通信协议、状态同步方式）？
- SceneState、TaskType 在既有工程中的**确切定义**，以及新架构是否原样继承？
- Electron 壳分支的**目录与构建方式**（同仓分支还是同仓子目录）？
- Web 侧技术栈（框架、渲染层组织、构建工具）与目标浏览器范围。
- 目标用户（学生 / 教师 / 管理端）与运行时环境（在线、离线、局域网部署）。
