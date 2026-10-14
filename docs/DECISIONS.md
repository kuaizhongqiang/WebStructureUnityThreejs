# 决策记录（Decisions）

> 读者：AI 与人｜状态：2026-10-12 v1（**第一轮 32 题全部已答并固化**）｜性质：**已决定的权威记录**。
> 权威层级：`requirement/raw/raw-requirement.md` > `AGENT.md` > **本文** > `requirement/` 与 `research/`。
> 纪律：**本文只增不改**。要推翻某条，追加一条 `DEC-xx'` 说明取代关系，不要改写历史条目。

## 0 这份文件的作用

- 第一轮问答（`OPEN-QUESTIONS.md`）已全部回答。本文件把答案**固化为可执行的决策**，并明确写出：
  1. **决定是什么**（可直接照着做）；
  2. **是否偏离了我原先的 ★建议**，以及**偏离的后果与缓解**；
  3. **待办与依赖**（哪些决策还没执行完）。
- **凡是本文未列的内容，都还是未决定**，仍受 `AGENT.md` §4「歧义先确认」约束。
- 第二轮问答见 `OPEN-QUESTIONS-R2.md`。

## 1 决策总表

| ID | 决策 | 来源 | 偏离★ | 状态 |
|---|---|---|---|---|
| DEC-01 | 产品定位：**做框架**，学科无关；阶段目标 = 基础功能 + 基础交互 | Q-A1 | 否 | 生效 |
| DEC-02 | 规模预算：按 `SensorSimulationTrainingSoftware_v1.0_2026` 的**3 倍**定容量 | Q-A2 | 否 | 生效 |
| DEC-03 | 本期范围：**架构骨架 + 1 个端到端示例**（Unity 件 + Three.js 件 + Web 外壳打通） | Q-A3 | 否 | 生效 |
| DEC-04 | 数据模型**全量**（含角色/进度/成绩等），功能先按**游客**实现 | Q-A4 | 部分偏离 | 生效 |
| DEC-05 | 运行环境（在线/局域网/离线）：**未决**，需专项讨论 | Q-A5 | — | **未决** |
| DEC-06 | 三维分流**按 `TaskType` 判定**：Three.js = `None/Purpose/Equipment/Principle/Test/Info/Exam`；Unity = `LineConnection/Training/Structure/Inspection` | Q-B1 | 是（换标准） | 生效 |
| DEC-07 | Unity 与 Web 通信：**同页挂载 Unity WebGL + `.jslib` 桥 + 全 JSON 消息（带协议版本号）** | Q-B2 | 否 | 生效 |
| DEC-08 | 单一真源：**Web 侧**；Unity 只被指令并回报事件，**禁止拉取查询** | Q-B3 | 否 | 生效 |
| DEC-09 | 枚举**原样继承**：`SceneState` 6 值、`TaskType` 11 值（含 `[InspectorName]` 中文），只许往后追加 | Q-B4 | 否 | 生效 |
| DEC-10 | 双端契约维护：**手写两份（C# / TS）+ 校验测试比对**（不做代码生成） | Q-B5 | **是** | 生效（附缓解） |
| DEC-11 | 三维资产：**两份各自做**（Unity 一份、Three.js 一份），不走共享 GLB 管线 | Q-C1 | **是** | 生效（附缓解） |
| DEC-12 | Unity 交付形态：**Unity WebGL 嵌入 Web 主站**；Electron 壳加载同一份 Web 产物 | Q-C2 | 否 | 生效 |
| DEC-13 | **做一次空场景 WebGL 构建基线实测**（体积/加载时间） | Q-C3 | 否 | **待执行** |
| DEC-14 | Unity 技术栈：**uGUI + TMP**；分层心智借鉴 MCV，目录重新设计 | Q-C4 | 否 | 生效 |
| DEC-15 | Web 技术栈：**Vite + TypeScript + Vue 3 + 裸 three** | Q-D1 | 否 | 生效 |
| DEC-16 | 教学界面做在 **DOM 覆盖层**，画布只负责三维 | Q-D6 | 否 | 生效 |
| DEC-17 | 浏览器基线：**现代浏览器**（近两年 Chrome/Edge/Firefox/Safari），暂不考虑老旧内核 | Q-D3 | 否 | 生效 |
| DEC-18 | **必须支持移动端浏览器**；**iOS Safari 明确不支持**（排除） | Q-D4 | **是** | 生效（附缓解） |
| DEC-19 | Web 工程位置：**仓库根 `web/`**，与 `NewStructureUnity/` 平级 | Q-D5 | 否 | 生效 |
| DEC-20 | Electron 壳：**同仓子目录 `electron/`** + 装**本地 Web 产物**；业务代码零 `import electron` | Q-E1 | 否 | 生效 |
| DEC-21 | 本期**无后端**，纯静态；但数据模型全量预留（配合 DEC-04） | Q-E2 | 否 | 生效 |
| DEC-22 | 部署：先本地静态服务器验证，目标环境后续再定 | Q-E3 | 否 | 生效 |
| DEC-23 | 内容更新：**每次整体重发**（不做内容热更新） | Q-E4 | **是** | 生效（附缓解） |
| DEC-24 | 未来可能对接既有系统 ⇒ 代码**保留对接弹性**（预留接口点），当期无需求 | Q-E5 | 否 | 生效 |
| DEC-25 | **补 `.gitignore`**（Unity 生成目录 + Web 产物） | Q-F1 | 否 | **已执行** |
| DEC-26 | 目录结构：由我提**完整草案**供审 | Q-F2 | 否 | **待执行** |
| DEC-27 | **文档与代码同交付**，并**保留自动化测试**（含"能渲染出画面"的冒烟） | Q-F3 | 否 | 生效 |
| DEC-28 | 提交：**英文单行 + 正文说明"改了什么/为什么"**，一个可验收改动一次提交 | Q-F4 | 否 | 生效 |
| DEC-29 | Unity 侧依赖：**暂不新增**（等 DEC-11/12 落地后按需）；**允许安装 Unity MCP**（`com.coplaydev.unity-mcp`，git 源） | Q-G1 | 否 | 生效 |
| DEC-30 | Web 侧依赖：**直接搭全套并 install**（不做最小验证） | Q-G2 | **是** | **已执行** |
| DEC-31 | 包管理器：**npm** | Q-G3 | 否 | 生效 |
| DEC-32 | Electron 壳的内容形态：本地 Web 产物（同 DEC-20） | Q-E1 | 否 | 生效 |
| DEC-33 | **TypeScript 锁定 5.9.3**（不用 7.x）：`vue-tsc` 与 TS 7 不兼容（实测崩溃） | 执行中发现 | 是 | 生效 |
| DEC-34 | **`.plastic/` 排除在 git 之外**（Unity 目录内的 Plastic 工作区元数据不入 git） | Q-R2-F5（部分） | 否 | **已执行** |

## 2 需求类决策（DEC-01 ~ DEC-05）

### DEC-01 做框架，学科无关

- **决定**：本项目交付的是**框架**：基础功能 + 基础交互即可；不绑定学科与设备对象（低压电气、传感器等都只是"可填充的内容"）。
- **对设计的直接影响**：
  1. `SceneState` / `TaskType` 驱动的**骨架必须先立起来**，内容只是数据；
  2. 参考工程 `SensorSimulationTrainingSoftware_v1.0_2026` 的"框架 + 可换内容"范式（JSON 内容 + `TaskType` 分槽 + key→资源映射）**与本决定同构**，可作为主要参照物；
  3. **不允许**把任何具体设备/学科的字段硬编码进框架层（如 `Sensor`、`Knob` 这类业务名不得出现在框架层类型名里，只能出现在内容数据与内容层实现里）。

### DEC-02 规模预算：参照工程 ×3

- **决定**：容量按 `F:\Project\SensorSimulationTrainingSoftware_v1.0_2026` 的 **3 倍**设计。
- **参照工程实测基准**（详见 `research/06-scale-baseline.md`）：
  - 教学项目/章节 **17** → ×3 = **约 51**
  - 三维预制体 **约 90** → ×3 = **约 270**
  - 交互类型 **约 10 种** → ×3 后**类型数基本不变（10~15）**，是**实例翻倍**
  - 步骤 Step（以 #0 项目 39 步为模板外推）→ **约 1500~2000 条**
  - 题目 Question → **约 450 道**；仪器 Equipment 条目 → **约 255 件**
  - 教学 JSON 体量：`ProjectData.json` 561KB → ×3 **约 1.7MB**（**数据层可忽略**）
  - 需随包下载资源：参照工程约 80~120MB → ×3 **约 250~360MB**（含贴图/视频/AB 包）
- **硬性推论**：
  1. **包体约束来自资源（模型/贴图/视频），不是 JSON**；分包与压缩必须从第一天做；
  2. 单个 AB 包**不要随规模线性放大**，应限制在 **≤10MB**（参照工程最大 8.57MB）；
  3. 源资产（含 PSD 源文件）参照工程已达 350~500MB，×3 ⇒ **1~1.5GB 源资产不能直接进 git**（见 R2 问题）。

### DEC-03 本期范围：骨架 + 1 个端到端示例

- **决定**：本期只做 **架构骨架 + 一条打通的端到端示例**（一个 Unity 三维件 + 一个 Three.js 三维件 + Web 外壳 + 两者通信）。
- **"完成"的判定**：能在浏览器里从外壳切换到一个 Unity 件与一个 Three.js 件，`SceneState`/`TaskType` 双向事件流通，且状态只有一个真源（DEC-08）。

### DEC-04 数据模型全量，功能按游客

- **决定**：数据模型**一次做全**（包含角色、进度、成绩、题目作答等字段），**功能先只实现"游客"这一种使用方式**；不因为"现在没有登录"就把字段省掉或写死。
- **含义**：字段可以在界面上不出现、但结构里必须存在，且 JSON 契约里要有位置；后续接后端（DEC-24）时不需要改结构。
- **⚠️ 与 DEC-21（本期无后端）的边界**：全量**结构** + 游客**功能**；不要为"将来可能有后端"提前写网络层代码（那属于 DEC-24 的"预留接口点"，只留位置不写实现）。
- **可参考的起点**：参考工程 `MCV_Module` 的 `EnumAll.cs:156-179` 已有 `UserType`（`Unknow` 未知 / `Student` 学生 / `Teacher` 教师 / `Admin` 管理员）与 `CompletionStatus`（`Unfinished` 未完成 / `Completed` 已完成）—— 可作为"全量数据模型"的角色与完成度字段起点（**参考，不是必须照抄**；它是旧框架的定义，新框架的角色口径见 R2 问题）。

### DEC-05 运行环境：**未决（专项讨论）**

- 见 `OPEN-QUESTIONS-R2.md` Q-R2-A1。此前不得按任何一种环境假设写死资源加载策略。

## 3 架构类决策（DEC-06 ~ DEC-11）

### DEC-06 三维分流按 TaskType（**取代**按复杂度逐件判定）

- **决定**（用户原话口径）：

  | 分流 | `TaskType` |
  |---|---|
  | **Three.js**（简单三维） | `None`、`Purpose`、`Equipment`、`Principle`、`Test`、`Info`、`Exam` |
  | **Unity**（复杂三维） | `LineConnection`、`Training`、`Structure`、`Inspection` |

- **与原★建议的差别**：★建议是"按交互复杂度逐件判定"；现改为**按 TaskType 一刀切**。
- **这个标准的好处**：判定不再有争议，且与参考工程的实际工作分布吻合 —— `SensorSimulationTrainingSoftware` 里最重的两类步骤正是 `LineConnection`（18 步）与 `Training`（21 步），恰在 Unity 侧。
- **⚠️ 后果与必须补的东西**：
  1. `TaskType` 成为**技术栈的开关**，因此它也是**双端契约中最不能漂移的一项**（DEC-09 的纪律因此更重要）；
  2. 需要一份**逐 TaskType 的技术栈登记表**（含：默认相机、资源加载方式、退出时的清理动作），否则每个 TaskType 会被各自实现一遍；
  3. 若某个 `TaskType` 下出现"其实很简单"的交互（如 `LineConnection` 里只是点两下），**仍归 Unity**，不破例 —— 破例必须走新决策。

### DEC-07 通信：同页挂载 + `.jslib` 桥 + JSON

- **决定**：Unity WebGL 与 Web 外壳**同页**（同一 DOM 树），用 `.jslib` 暴露 JS 侧桥对象，Unity→Web 与 Web→Unity 双向；消息**一律 JSON**，必带 `type` / `version` / `seq`，启动时握手比对协议版本，不匹配**明确报错**不静默降级。
- **未定细节**（见 R2）：桥的具体命名、消息清单的落地位置、错误/超时约定。

### DEC-08 单一真源在 Web 侧

- **决定**：`SceneState` / 当前 `TaskType` / 内容数据**由 Web 侧持有**；Unity 只接受指令并回报事件，**禁止自己发明状态**，**禁止提供"查询当前状态"的同步接口**（沿用参考工程"事件驱动、禁止拉取查询"的红线）。
- **对 Unity 侧的硬要求**：Unity 件必须能在"外壳没给它完整上下文"时安全启动（先待命、收到 `task:switch` 再装配），否则无法满足 DEC-03 的端到端示例。

### DEC-09 枚举原样继承（`SceneState` 6 值 / `TaskType` 11 值）

- **决定**：原样继承参考工程的枚举与中文 `[InspectorName]`，**只许往后追加**，不得插值、改序、改名。
  - `SceneState`（`MCV_Module\packages\com.mcv.core\Runtime\Models\EnumAll.cs:137-152`）：
    `Setup`(初始化)、`Start`(开始)、`Login`(登录)、`Menu`(菜单)、`UI`(UI)、`Roaming`(漫游)
  - `TaskType`（同文件 `:389-415`）：
    `None`(空类型)、`Purpose`(任务目的)、`Equipment`(实验仪器)、`Principle`(实验原理)、`LineConnection`(电路连接)、`Training`(仿真实验)、`Test`(小测验)、`Info`(简介)、`Structure`(结构)、`Inspection`(检测)、`Exam`(考核)
  - 序号即上表顺序（`None=0` … `Exam=10`）；**中文是契约的一部分，逐字保持**。
- **⚠️ 必须注意的不一致**：参考工程 `SensorSimulationTrainingSoftware` 的 `TaskType` **只有 7 个值**（`None/Purpose/Equipment/Principle/LineConnection/Training/Test`，即我们 11 值的前 7 个）。若将来复用它的内容数据，**需要一张映射表**（见 R2）。

### DEC-10 契约维护：手写两份 + 校验测试比对（**偏离★**）

- **决定**：C# 与 TS 各手写一份 `SceneState` / `TaskType` / 数据契约，**用一致性校验测试守住**；不做"单一事实源 + 代码生成"。
- **⚠️ 后果**：枚举与字段的漂移不会在编译期暴露，只会到运行期。**缓解必须落实**：至少一条自动化测试（或校验脚本）逐值比对 C# 与 TS 两侧的名字与序号，并在 CI / 提交前跑；**这条测试的缺失等于本决策失效**。
- **待定细节**（见 R2）：校验落在哪一层（Unity 测试程序集 / Web 单测 / 独立脚本）、比对什么（名字、序号、中文映射）。

### DEC-11 三维资产两份各自做（**偏离★**）

- **决定**：Unity 侧与 Three.js 侧**各自制作/装配各自的模型资产**，不建立"共享 GLB + sidecar"的中立管线。
- **⚠️ 后果（这是本轮最需要盯的偏离）**：
  1. 同一个设备存在**两套资产**，外观/尺寸/命名都可能漂移；
  2. 内容工程量**翻倍**；与 DEC-02 的 ×3 规模叠加后，**资产量与工时都要按两份算**；
  3. 后续若某件从 Three.js 升到 Unity（或反向），资产**不能直接搬**。
- **缓解（建议，待 R2 确认）**：建立一份**资源登记表**，为每个三维件登记：`TaskType`、技术栈归属、两端各自的资源 key 与路径；至少让"哪些件有两份"这件事可见、可对账。

## 4 Unity 线决策（DEC-12 ~ DEC-14）

### DEC-12 Unity 交付形态：WebGL 嵌入主站

- **决定**：Unity 发布 **WebGL**，由 Web 主站按需挂载；**Electron 壳加载同一份 Web 产物**（不是 Unity Windows 单机）。
- **硬性要求**：进入/退出 Unity 模块必须**显式销毁**（`unityInstance.Quit()`），否则反复切换会泄漏 WebGL 上下文与内存；加载过程必须有进度与可取消。

### DEC-13 空场景 WebGL 基线实测：**待执行**

- **决定**：现在就做一次空场景（URP 默认）WebGL 构建，记录：产物体积、压缩格式、首屏加载时间、本机与目标机型的帧率。
- **用途**：把 DEC-02 的"包体是首要敌人"变成真实数字；也是 DEC-18（移动端）的前提。
- **前置**：需要 Unity 编辑器可被占用（若你正在使用编辑器，请告知再执行）。

### DEC-14 Unity 技术栈：uGUI + TMP

- **决定**：Unity 侧 UI 用 **uGUI + TextMeshPro**；分层**借鉴**参考工程（Controller 非 MonoBehaviour、Panel 纯被动、View 不引用 Controller、事件总线），但**目录与程序集重新设计**（R-1 要求）。
- **⚠️ WebGL 相关红线**（来自参考工程实测）：TMP 在 WebGL 上**不能动态补字**⇒ 中文字体必须预烘焙/打包全量字形，包体预算要算进去；`StreamingAssets` 只能经 `UnityWebRequest` 读；资源路径**大小写敏感**。

## 5 Web 线决策（DEC-15 ~ DEC-19）

### DEC-15 技术栈：Vite + TypeScript + Vue 3 + 裸 three

- **决定**：构建 `Vite`；语言 `TypeScript`；UI `Vue 3`；三维**直接用裸 `three`**（自己封装 Viewer，自己持有渲染循环），不用 R3F / TresJS 这类声明式封装。
- **已执行**：见 §8（依赖已安装并验证）。

### DEC-16 教学界面做在 DOM 覆盖层

- **决定**：文字/表单/列表/题目等教学界面全部用 DOM + CSS 覆盖在画布之上；画布只负责三维。

### DEC-33 TypeScript 锁定 5.9.3（补充 DEC-15，2026-10-12）

- **背景**：DEC-15 只定了"用 TypeScript"，未定大版本。执行 DEC-30（直接装最新版）时装到 `typescript@7.0.2`，`npm run typecheck` 直接崩溃：`vue-tsc` 通过内部路径 `typescript/lib/tsc` 调用编译器，而 TS 7 的 `exports` 字段不再暴露该路径（`ERR_PACKAGE_PATH_NOT_EXPORTED`）。`vue-tsc` 的 peer 只声明 `typescript >=5.0.0`，**与实际不兼容**。
- **决定**：**`typescript` 固定 `5.9.3`**（5.x 线最新），直到 `vue-tsc` 明确支持 TS 7 再评估升级。
- **纪律**：**不要**在 `web/` 里执行"把 typescript 升到最新"这类操作；升级必须验证 `npm run typecheck` 仍然通过。证据见 `research/07-web-scaffold.md` §3。

### DEC-17 浏览器基线：现代浏览器

- **决定**：目标为近两年的 Chrome / Edge / Firefox / Safari；**暂不考虑**老旧内嵌 WebView 与 IE 内核。
- **⚠️ 连带效应**：因此可以使用现代构建产物（ES2020+、`<script type="module">`）、WebGL2、以及 **wasm**（Unity WebGL 的前提）。若将来甲方平台内核过旧，**本决策、DEC-12、DEC-15 会一起失效**，需要重做技术选型 —— 这是本项目最大的单点风险，已记入 R2。

### DEC-18 必须支持移动端，但排除 iOS Safari（**偏离★**）

- **决定**（用户原话口径）：目标是"**移动端通过网页打开**"可用；**iOS Safari 不支持**（明确排除）。
- **⚠️ 后果（必须处理，见 R2）**：
  1. **Unity WebGL 在移动端普遍不可用/极不稳**（内存与 wasm 回收），而 DEC-06 已把 4 个 `TaskType` 判给 Unity ⇒ 这些 TaskType 在手机上**要么降级、要么提示"请用桌面浏览器"**，必须**明确规则**，不能默认能跑；
  2. Three.js 侧在移动端可行，但需限制：像素比上限、阴影/后处理关闭、纹理尺寸与压缩格式（移动端优先 ASTC/ETC2）；
  3. 需要明确**移动端的浏览器清单**（Android Chrome？微信内置浏览器？），否则"D4=支持移动端"没有可验收的口径。
- **注意**：这条是**唯一一条与 DEC-12/17 有张力**的决策，R2 会要求给出"移动端遇到 Unity 件时怎么办"的明确答案。

### DEC-19 Web 工程在仓库根 `web/`

- **决定**：`web/` 与 `NewStructureUnity/` 平级，同仓管理。

## 6 交付类决策（DEC-20 ~ DEC-24）

### DEC-20 Electron 壳

- **决定**：`electron/` 子目录（不是单独分支）、独立 `package.json`；装**本地打包的 Web 产物**；**业务代码零 `import electron`**（建议用 lint 规则机械保证）。

### DEC-21 本期无后端

- **决定**：纯静态交付；成绩/进度只留本地（内存或浏览器存储）。**不做**网络层实现。

### DEC-22 部署：先本地验证

- **决定**：先在本地静态服务器上验证产物可用（含 MIME/压缩/缓存清单，见 `research/02-web-threejs-line.md` §6），目标服务器后续再定。

### DEC-23 内容更新：每次整体重发（**偏离★**）

- **决定**：不做"内容与代码分离的热更新"，每次整体重新发布。
- **⚠️ 后果**：DEC-02 的规模下（51 个项目、需装载资源 250~360MB），每次改一个知识点都要重发整包 ⇒ **发布成本与回滚成本高**。
- **缓解（最小代价，不违反本决策）**：内容 JSON 与资源目录**物理分开**（即便一起发布），这样将来若要改为按需加载，不需要搬文件。

### DEC-24 未来可能对接既有系统：保留弹性

- **决定**：代码**保留对接弹性**（预留接口点/适配位），但**当期不实现任何对接**。
- **纪律**：只**预留位置**（例如统一的"外部系统调用"单一入口），**不写空实现类、不引入插件抽象层**（参考工程的教训：为可替换性预留抽象层最终被判定为负担而删除）。

## 7 工程类决策（DEC-25 ~ DEC-31）

### DEC-25 `.gitignore`：**已执行**

- 依据：仓库原先**没有** `.gitignore`，`NewStructureUnity/Library/` 一项就约 2.7 万个文件，`git add .` 会把生成目录全部纳入。
- 已创建仓库根 `.gitignore`：Unity 生成目录（`Library/`、`Temp/`、`Obj/`、`Logs/`、`UserSettings/`、`.utmp/`）、IDE 解决方案文件、`node_modules/`、`dist/`、Unity WebGL 构建落点、OS 杂物。
- **配套纪律**：补好之前**不做 `git add .`**；提交时**按路径显式 add**，不用 `-A`。
- **补充事实（2026-10-12，执行时发现）**：`NewStructureUnity/` 目录里**另有一个 Plastic SCM 工作区**（`.plastic/plastic.selector` → repo `NewStructureUnity@tj_kuaiprojcet@cloud.cn`，分支 `/main`；`plastic.wktree` 已有纳管记录），即本项目实为**双版本控制**。当前 `.gitignore` **未**排除 `.plastic/`，若按现状提交会把工作区本地元数据（含本机 GUID 与账号）写入 git。归属与处理方式转为 **Q-R2-F5**，在回答前**不要提交 Unity 侧内容**。

### DEC-34 `.plastic/` 排除在 git 之外（Q-R2-F5 的部分回答，2026-10-12）

- **用户口径**：「把 `.plastic/` 这个路径在 `.gitignore` 文件里忽略掉即可」。
- **决定**：`.gitignore` 增加 `.plastic/`（任意层级匹配）。Plastic 工作区的**本地元数据一律不入 git**：`plastic.selector`、`plastic.wktree`、`plastic.changes`、`plastic.workspace`（含本机工作区 GUID 与账号信息）。
- **不排除的**：`NewStructureUnity/ignore.conf` **保留在 git**（它是可读的忽略规则配置，不是本机状态）。
- **仍未决（Q-R2-F5 的剩余部分）**：① `NewStructureUnity/{Assets,Packages,ProjectSettings}` 是否随 git 一起走（"git 为主" vs "Unity 归 Plastic"）；② 我改动 Unity 侧文件后是否需要配套做 Plastic 提交。
- **过渡期纪律**：在②明确之前，**默认只维护 git 一侧**（不主动做 Plastic 提交），并在每次涉及 Unity 侧改动时提一句"未做 Plastic 提交"。

### DEC-26 目录结构草案：**待执行**

- 由我提出完整目录草案（含 Unity asmdef 划分、`web/` 结构、双端契约位置、`electron/` 位置）供审。
- 已落地的部分（`web/`，见 §8）在草案评审时可调整。

### DEC-27 文档与代码同交付 + 保留自动化测试

- **决定**：代码改动必须**同批更新文档**；**保留自动化测试**，至少包含：
  1. 双端契约一致性测试（DEC-10 的缓解）；
  2. Web 侧单元测试（vitest）；
  3. 一条"三维能渲染出画面"的冒烟测试（不是白屏）。

### DEC-28 提交纪律

- 英文单行摘要 + 正文说明"改了什么/为什么"；一个可验收的改动一次提交。

### DEC-29 Unity 侧依赖

- **决定**：**暂不新增任何包**；等 DEC-11 / DEC-12 落地后按需再加（候选见 `research/05-dependency-plan.md` §2.3）。
- **允许**安装 **Unity MCP**（`com.coplaydev.unity-mcp`，git 源）以便 AI 直接操作编辑器 —— 需你确认何时装、以及编辑器占用时段。

### DEC-30 Web 依赖：直接搭全套并 install（**偏离★**）— **已执行**

- **决定**：不做"最小验证"，直接按 DEC-15 的栈安装整套依赖。
- **已执行结果**：见 §8。

### DEC-31 包管理器**：npm**

## 8 已执行的落地结果（事实，非决策）

| 项 | 结果 | 证据 |
|---|---|---|
| `.gitignore` | 已创建（仓库根） | `.gitignore` |
| `web/` 工程 | 已创建并安装依赖、构建通过 | 见 `research/07-web-scaffold.md` |
| 依赖锁定 | `web/package-lock.json` 入库，版本可复现 | 同上 |
| WebGL 基线实测 | **未做**（DEC-13 待执行） | — |

## 9 待办与阻塞（本文的"未完成"清单）

| 待办 | 依赖 | 阻塞什么 |
|---|---|---|
| DEC-05 运行环境定案 | 用户专项讨论 | 资源加载策略、响应头（COOP/COEP）、离线能力 |
| DEC-13 WebGL 基线实测 | 编辑器可用时段 | 包体预算、DEC-18 的移动端结论 |
| DEC-18 移动端在 Unity 件上的规则 | 用户回答 R2 | 移动端能否算"支持" |
| DEC-26 目录结构评审 | 用户回答 R2 | 后续所有代码落点 |
| DEC-10 契约一致性测试落地 | R2（形式待定） | 双端契约不漂移的唯一保障 |
| DEC-11 资源登记表 | R2（是否需要） | 两份资产的对账依据 |
| 源资产入库方式（Git LFS / 外部存储） | R2 | DEC-23 重发成本、仓库体积 |

---

# 第二轮决策（DEC-35 ~ DEC-62）

> 来源：`OPEN-QUESTIONS-R2.md`（28 题全部已答，2026-10-12）。**本节只增不改**；与第一轮冲突的，明确写出"取代 DEC-xx"。

## 10 第二轮决策总表

| ID | 决策 | 来源 | 偏离★ | 状态 |
|---|---|---|---|---|
| DEC-35 | 运行环境**先按"服务器可控"实现**，把"不可控/离线"当降级路径留出；不阻塞架构 | R2-A1=D | 否 | 生效（收敛 DEC-05） |
| DEC-36 | 内容**按 11 个 `TaskType` 组织**；**不复用**参照工程的内容数据 | R2-A2 | 否 | 生效 |
| DEC-37 | 规模只要求**"架构可支撑"**；**不造假数据**做压测 | R2-A3 | 是 | 生效 |
| DEC-38 | 基础交互**以参照工程现成功能为直接参考**（传感器仿真工程） | R2-A4 | 是 | 生效（边界见 §11.1） |
| DEC-39 | 《TaskType 登记表》**由我起草** | R2-B1=A | 否 | 已交付 `design/01-tasktype-registry.md` |
| DEC-40 | 《Unity↔Web 桥消息清单》**由我起草** | R2-B2=A | 否 | 已交付 `design/02-bridge-protocol.md` |
| DEC-41 | 契约一致性校验走**通用门禁**：在 **git 提交与合并**两处设门禁 | R2-B3 | 是（形式） | 生效（落地见 §11.2） |
| DEC-42 | 资产登记**以"资源"为主键**（一个模型可被多页面 / 多 `TaskType` 复用），**不是** taskType 一对一 | R2-B4 | **是（修正设计）** | 生效（见 §11.3） |
| DEC-43 | 外部对接**单一入口** `services/external.ts`，只留接口定义不写空实现 | R2-B5=A | 否 | 生效 |
| DEC-44 | **现在做 WebGL 基线实测** | R2-C1=A | 否 | **待执行（被编辑器占用阻塞，见 §11.4）** |
| DEC-45 | **现在就加 Addressables**（**取代** DEC-29 的"暂不新增包"） | R2-C2=A | 是 | 待执行 |
| DEC-46 | **现在装 Unity MCP**（`com.coplaydev.unity-mcp`，git 源） | R2-C3=A | 否 | 待执行 |
| DEC-47 | Unity 目录与程序集分层**由我起草** | R2-C4=A | 否 | 已交付 `design/03-layout-and-assets.md` |
| DEC-48 | 确认"**UI 用框架、三维用裸 three**"的混合写法（DEC-15 不变） | R2-D1=A | 否 | 生效 |
| DEC-49 | 移动端**只考虑微信内置浏览器**；Android Chrome / UC / QQ / iOS 非 Safari 浏览器**暂不考虑** | R2-D2 | **是（范围收窄）** | 生效（见 §11.5） |
| DEC-50 | 三维渲染冒烟用 **Playwright**；允许用浏览器 MCP 截图作辅助 | R2-D3=A | 否 | **已执行**（12 项断言全通过） |
| DEC-51 | 目录结构**接受现状并补齐**（`web/` + Unity 分层 + `electron/` + `content/` + `tools/`） | R2-D4=A | 否 | 已交付草案 |
| DEC-52 | **加 ESLint + Prettier** | R2-D5=A | 否 | 待执行 |
| DEC-53 | 移动端遇到 Unity 类 TaskType：**先尝试加载，失败再提示**（**推翻** ★"明确阻拦"） | R2-E1=B | **是** | 生效（判定条件见 §11.6） |
| DEC-54 | 游客模式进度/成绩存 **`localStorage`，只保存一个 JSON** | R2-E2 | 否 | 生效 |
| DEC-55 | 部署目标**仍不确定**，先本地验证（DEC-22 不变） | R2-E3=A | 否 | 生效 |
| DEC-56 | **现在提交** | R2-F1=A | 否 | 待执行 |
| DEC-57 | **大尺寸资产本阶段不进 git**，另做处理；提交时若发现大文件**单独问用户** | R2-F2 | 否 | 生效（取代 DEC-25 的空白） |
| DEC-58 | `docs/` 与 `CODEBUDDY.md` **入库** | R2-F3=A | 否 | 生效 |
| DEC-59 | 编辑器占用协调：**我操作前先问用户** | R2-F4=A | 否 | 生效 |
| DEC-60 | **双渠道提交**：涉及 Unity 侧的改动，**git 与 Plastic 都要提交**；**允许部分资产在两侧各保留一份** | R2-F5 | **是（补充 DEC-34）** | 生效，**已写入 `AGENT.md`** |
| DEC-61 | **不装 FBX 包**：三维资产由外部 DCC 提供，Unity 只导入 | R2-G1=B | 否 | 生效 |
| DEC-62 | Web 侧补依赖：`playwright`（已装）**+ `eslint`/`prettier`** | R2-G2 | 否 | 部分执行 |

## 11 需要展开的第二轮决策

### 11.1 DEC-38 与 R-1（从零开始）的边界 —— 必须说清

- **用户口径**：「因为给你的参考中已有现成功能，你可以直接参考」。
- **张力**：R-1 / `AGENT.md` §2.4 明确"新增代码不得照搬旧工程的目录结构"，而这条要求"直接参考现成功能"。
- **本决策的落地边界（我按两条同时成立来理解）**：
  1. **允许**：阅读参照工程的实现、照其**行为规格**在新框架里重新实现；
  2. **允许**：直接移植**单个交互脚本**的算法（如旋钮角度映射、接线点判定），但必须落到我们自己的目录与命名下；
  3. **不允许**：复制参照工程的**目录布局**、`Global*Mgr` 那套管理器骨架、它的 UI 装配机制（prefab 名＝类名 / `ui_{类名}` 包键）；
  4. **不允许**：在参照工程里做任何修改（它仍是只读参考）。
- ⚠️ 若用户的本意是"整块复用"，则与 R-1 冲突，需要他明确放宽 R-1；已列入第三轮问题。

### 11.2 DEC-41 门禁的落地形式

- **用户口径**：「门禁类内容按照通用标准执行，可以在 git 提交和合并方面做门禁」。
- **含义**：① **提交前**（pre-commit）跑快速门禁；② **合并前**（pre-push 或 CI）跑完整门禁。
- **拟纳入门禁的检查**：
  1. 双端契约一致性（DEC-10 的缓解，脚本形式见第三轮问题）；
  2. `npm run typecheck` / `npm test` / `npm run smoke`（Web 侧）；
  3. Unity 侧：`Assets/Scripts` 与文档同交付（DEC-27）无法机器判定，改为"改动 Unity 脚本时必须同批改文档"的人工规则 + 提交信息模板提示；
  4. **禁止大文件**（DEC-57）：提交前拦截超过阈值的文件。
- **未定**：门禁用原生 `.git/hooks`（需每台机器装）、还是引入 `husky`（会加依赖）、还是走 CI（需要仓库 Actions）→ 第三轮问题。

### 11.3 DEC-42 资产登记的**设计修正**（重要）

- **用户口径**：「一个三维模型可能多个页面多个 type 调用，而且我们已经定义了 web 和 unity 在模型方面各做各的」。
- **推论（修正我上一轮的建议）**：
  1. 登记表的**主键必须是"资源"**（模型 / 贴图 / 视频），**不能是 `TaskType`** —— 一个资源被 N 个页面 / N 个 `TaskType` 复用是常态；
  2. 因此关系是**多对多**：`资源 ↔ TaskType`（或 `资源 ↔ 页面`），登记表要能表达"这个模型被哪些 TaskType 用到"；
  3. 由于 DEC-11 是"两份各自做"，每份资产还要带**技术栈归属**（`three` / `unity`），且**同名资源在两侧是两条记录**（允许部分资产两侧都有一份 —— DEC-60 明确允许）。
- **落地**：见 `design/03-layout-and-assets.md` §4。

### 11.4 DEC-44 为什么仍是"待执行"

- 用户选了 A（现在做），但**实测发现 Unity 编辑器当前正在运行**（进程 `Unity.exe` pid 46076 存在），而 DEC-59 要求我操作编辑器前先问。
- 批处理构建会与打开中的工程抢锁，**不能在编辑器打开时跑**。
- ⇒ 需要用户给一个"编辑器空闲"的时段（已列入第三轮问题）。

### 11.5 DEC-49 收窄移动端范围后的连带影响

- **只承诺微信内置浏览器**（X5 / XWeb 内核）⇒ 意味着：
  1. Android Chrome 虽然技术上更好，但**不在验收范围内**（不是不能跑，而是不背这个责任）；
  2. 微信内核对 WebGL / 视频 / 音频自动播放的限制**比 Chrome 更严**（尤其视频需用户手势、`wasm` 内存更紧），Three.js 侧必须按"较弱的实现"取参数（像素比上限、关闭重后处理、限制纹理尺寸）；
  3. 与 DEC-18（排除 iOS Safari）叠加后，实际承诺是"**Android 微信内置浏览器可打开**"。
- ⚠️ 这条与 DEC-17（现代浏览器）不冲突，但**测试基线要改成微信内置浏览器**，否则验收口径与决策不一致。

### 11.6 DEC-53（先尝试加载再提示）必须补的判定条件

- 决策本身没问题，但"失败"必须可判定，否则会变成"用户白等"。最少要定：
  1. **加载超时**（建议 20~30s，超过即判定失败）；
  2. **wasm/内存失败**（Unity 报错或 `createUnityInstance` reject）；
  3. **上下文创建失败**（无 WebGL2）；
  4. 失败后**给出明确出口**（"请在电脑浏览器中打开" + 返回按钮），并且**必须释放**已申请的 WebGL 资源。
- ⚠️ 注意：这会让 Unity 类任务在手机上先"卡一段"。若体验不可接受，仍可退回 DEC-53 的备选（明确阻拦）—— 已列入第三轮问题。

## 12 第二轮仍未闭合的项

| 未闭合 | 原因 | 去向 |
|---|---|---|
| 运行环境的最终形态 | R2-A1 选 D（先不定） | 保留 DEC-35 的降级路径 |
| WebGL 基线数字 | 编辑器被占用 | 第三轮问题 |
| 门禁的具体载体（hook / husky / CI） | 需要用户选 | 第三轮问题 |
| 契约校验脚本的比对对象与触发时机 | 需要用户确认 | 第三轮问题 |
| 移动端（微信内置）的实际内核版本与降级策略 | 需要实测 | 第三轮问题 |
| 数据模型（DEC-04"全量"）的字段清单 | 尚未起草 | 第三轮问题 |

## 13 已执行结果（累计，事实记录）

| 日期 | 事项 | 结果 | 依据 |
|---|---|---|---|
| 2026-10-12 | `.gitignore` + `.gitattributes` | 已创建；`Library/`、`.plastic/`、`node_modules/`、`dist/`、测试产物均已排除 | DEC-25 / DEC-34 |
| 2026-10-12 | `web/` 骨架 + 依赖 | 已安装并验证：`typecheck` ✅ / `test` ✅（6 用例）/ `build` ✅（vite 8.3.4，three 随页面懒加载 635KB） | DEC-15 / DEC-30 / DEC-33 |
| 2026-10-12 | 三维渲染冒烟 | `npm run smoke` **12 项断言全通过**（含确定性"非白屏"判定）；**当场抓到并修复一个真实缺陷**（跨 TaskType 导航不切换技术栈 / Unity→Three 切回不重建画布） | DEC-27 / DEC-50 |
| 2026-10-12 | **git 提交**（DEC-60 渠道①） | `c0a7b0f`（94 文件，首次纳入 docs+web+Unity 脚手架）；`1fd7614`（Unity 编辑器升级 URP 资产到 version 11）。工作区干净 | DEC-56 / DEC-28 |
| 2026-10-12 | **Plastic 提交**（DEC-60 渠道②） | 纳管 `Assets/Scenes`、`Assets/Settings`、`Packages`、`ProjectSettings`、`ignore.conf`；**`cs:1 → cs:2`**（`/main@NewStructureUnity@tj_kuaiprojcet@cloud.cn`）；私有文件 0 | DEC-60 |
| 2026-10-12 | WebGL 基线实测（DEC-44） | **构建成功**：空 URP 场景产物 **18 文件 / 8.40 MiB**（wasm.br 5.14 MiB + data.br 3.15 MiB），耗时 **3 分 08 秒**，0 error。⇒ 引擎底座只占 DEC-02 内容预算（250~360MB）的 **2~3%**。详见 `research/08-webgl-baseline.md` | DEC-44 / DEC-63 |
| 2026-10-12 | 加 Addressables + Unity MCP（DEC-45/46） | 已写入 `manifest.json` 并**解析成功**（Addressables 1.22.3 + `com.coplaydev.unity-mcp`(git) + scriptablebuildpipeline 已入 `packages-lock.json`） | DEC-45 / DEC-46 |
| 2026-10-12 | Unity 目录与程序集分层（DEC-47） | 已建 `Assets/Scripts/{Core,Contracts}` + `WSU3.Runtime` + `Assets/Editor` + `Assets/Tests/EditMode`；契约落 `Contracts/EnumAll.cs`；C# 侧契约快照测试已落地 | DEC-47 / DEC-68 / DEC-27 |
| 2026-10-12 | 门禁落地（DEC-66） | `tools/check-contracts.mjs`（TS↔快照↔C#，实测通过）、`tools/check-large-files.mjs`（10MB）、`tools/hooks/pre-commit` + 安装脚本（已装）、`.github/workflows/gate.yml` | DEC-41 / DEC-66 / DEC-65 |
| 2026-10-12 | 移动端策略落地（DEC-70/71） | `web/src/platform/device.ts`（微信识别 + 25s/1 次/可退回）+ 5 条单测通过 | DEC-49 / DEC-70 / DEC-71 |
| 待执行 | ESLint + Prettier | 已批准未安装（下一批） | DEC-52 / DEC-62 |
| 2026-10-13 | **第六轮问答关闭**（26 条 + 14 条补充） | 结论固化为 **DEC-80 ~ DEC-88**；新增 `docs/design/08`、`docs/design/09`、`docs/research/09` | R6 / DEC-80~88 |
| 2026-10-13 | **内容数据全量采用** | 7 份 JSON / 9 个项目 / 73 KB，落**两处**（`web/public/content/data` + `Assets/StreamingAssets/Data`）；新增门禁 `tools/check-content-data.mjs`（结构签名，7 份 · 63/17/6/21/33/12/5 条字段路径），已进 hook 与 CI | DEC-82 / DEC-88 |
| 2026-10-13 | **契约扩展** | `QuestionType`（0 起、有 `None`）与 `QuestionUsage`（`Exam`/`Step`）+ `BridgeMessageType`（23 条 · 两方向）；TS ↔ 快照 ↔ C# 三处同批改，门禁通过 | DEC-83 / DEC-85 |
| 2026-10-13 | **git 提交**（DEC-78 渠道①） | `ba2533c`（40 文件）已推分支 `feat/unity-scaffold-bridge`；**PR 尚未开**（本机 GitHub 凭据失效，需人工开） | DEC-78 |
| 2026-10-13 | **Plastic 提交**（DEC-60 渠道②） | `cs:6 → cs:8`（`cs:7` = `BridgeMessageType.cs` + `StreamingAssets/Data/*`；`cs:8` = `EnumAll.cs`）；**负责人编辑器内的在编文件（`0_Setup`/`1_Content`/`Core/**`/`Resources/`/`EditorBuildSettings`）未纳入**，留给他们自己那一批 | DEC-60 |
| 2026-10-13 | 门禁本地全绿 | 契约三方（4 组枚举 + 23 条桥消息）、内容数据双份、大文件、壳耦合、`typecheck` / `lint` / `format:check` / **17 项单测** | DEC-66 |

---

# 第三轮决策（DEC-63 ~ DEC-72）

> 来源：`OPEN-QUESTIONS-R3.md`（10 题全部已答，2026-10-12）。**只增不改**。其中 3 题用户明确授权「你自己定就好」，本轮把决定写清并标注"由 AI 定"。

| ID | 决策 | 来源 | 备注 |
|---|---|---|---|
| DEC-63 | **Unity 编辑器已关闭**：WebGL 基线实测 / 加 Addressables / 装 Unity MCP 三件**立即执行** | R3-1 | 时效性窗口 |
| DEC-64 | Unity MCP **只装本项目** `NewStructureUnity/`；参考工程一律不碰 | R3-2=A | 只读纪律 |
| DEC-65 | 大文件门禁阈值 **10 MB**；并且**凡是 git 无法接受的都主动提醒用户** | R3-3 | 取代"无阈值" |
| DEC-66 | 门禁载体：**原生 `.git/hooks` 脚本 + 安装脚本**，**合并门禁交给 CI**（GitHub Actions） | R3-4=D | 取代 ★"hooksPath" |
| DEC-67 | **采用契约快照基准** `content/contracts/snapshot.json`（不是真源，是门禁基准；只能与某一侧同批修改） | R3-5（**由 AI 定**） | — |
| DEC-68 | 契约校验读 C# 路径＝**`Assets/Scripts/Contracts/EnumAll.cs`** | R3-6（**由 AI 定**） | — |
| DEC-69 | **确认 DEC-38 的边界**：可读实现、可移植单个交互脚本算法；**不得**照搬目录布局、`Global*Mgr` 骨架、prefab 名＝类名的装配机制；不得改参考工程 | R3-7（**由 AI 定**） | 与 R-1 相容 |
| DEC-70 | 移动端：**检测微信内置浏览器并给出性能提示**（不阻拦）；验收**必须真机** | R3-8=A | 落地 DEC-49 |
| DEC-71 | DEC-53 的失败判定：**进入超时 25s**、**重试 1 次**、**允许退回"明确阻拦"** | R3-9 | 补数字 |
| DEC-72 | 数据模型由 AI 起草 `design/04-data-model.md`（项目/任务/步骤/题目/进度/成绩/设置 七块） | R3-10=A | — |

## 14 第三轮决策的落地要点

### 14.1 DEC-66 门禁的两道（按用户选择"原生 hooks + CI"）

| 时机 | 载体 | 检查 |
|---|---|---|
| 提交前 | `.git/hooks/pre-commit`（由 `tools/install-hooks.ps1` 安装，**hook 本体不入库**，安装脚本与检查脚本入库） | ① 大文件 >10MB 拦截（DEC-65）；② `web` 侧 `typecheck` + `test`；③ 契约快照比对；④ 生成目录误提交拦截 |
| 合并前 | `.github/workflows/gate.yml`（`pull_request` 触发） | 上述全部 + `npm run smoke`（真浏览器渲染）+ `npm run build` |

### 14.2 DEC-69 的边界（写死，避免以后反复争）

- ✅ **可以**：`SensorSimulationTrainingSoftware_v1.0_2026` 与 `MCV_Module` 里读实现、按行为规格重写；移植**单个交互脚本的算法**（旋钮角度映射、接线点判定等），落位到我们自己的目录与命名。
- ❌ **不可以**：照搬目录布局；照搬 `Global*Mgr` 管理器骨架与 `EventBus<T>` 强引用订阅配对；照搬 prefab 名＝类名 / `ui_{类名}` 的 UI 装配机制；在任何参考工程里修改文件。
- 例外流程：若确需整块复用，先提新决策取代 R-1 对应部分，不默认放行。

### 14.3 DEC-70 / DEC-71 的落地参数（可直接编码）

```ts
// 移动端策略（web/src/platform/device.ts 待建）
const WECHAT_UA = /MicroMessenger/i
enterTimeoutMs   = 25_000   // 超过即判定进入失败
retryCount       = 1        // 失败后重试 1 次
onWeChat         = 提示"性能可能受限，建议在电脑浏览器打开"+ 允许继续
fallbackToBlock  = true     // 若真机实测体验不可接受，允许改为直接阻拦
```

## 16 第四轮决策（产品脚手架与交付形态，2026-10-12）

> 来源：排版稿逐页调整完成后的"开始搭正式软件脚手架"一轮。**本节新增，不改上文。**
> 这四条都不是我擅定的：负责人明确选了方案（原话见"决定"列）。

| 编号 | 决定 | 选项来源 | 是否偏离建议 | 状态 |
|---|---|---|---|---|
| DEC-73 | **产品布局体制 = 混合**：外壳 / 列表 / 表单 / 题目页用**自适应流式**（断点 + 弹性布局）；三维任务页的**三维视口**按比例自适应。**1920×1080 仅作"设计基准尺"**（字号与间距按它设计），产品**不做**整体 `transform: scale` | 第四轮 Q1=C | 否 | 生效 |
| DEC-74 | **样式单一来源 = 拆三份**：`docs/ui-mockups/` 下拆为 `tokens.css`（令牌）/ `components.css`（`.ui-*` 组件）/ `mockup-shell.css`（`.board`/`.spec-*` 等**仅评审用**的外壳）；产品只 import 前两份，排版稿 link 三份 | 第四轮 Q2=B | 否 | 生效 |
| DEC-75 | 脚手架范围：**先立框架、不批量转页面** —— Phase 1 = 应用外壳 + 路由 + 状态与数据层 + **1 个端到端任务页**；29 页排版稿的批量转换放到布局体制落地之后 | 第四轮 Q3=A | 否 | 生效 |
| DEC-76 | **现在加 ESLint + Prettier**（推进 DEC-52）：趁存量只有 16 个文件，之后加会面对大量存量告警 | 第四轮 Q4=是 | 否 | 生效 |
| DEC-77 | 交付形态：**本地打包一份可双击运行的桌面 exe**（Windows），用于负责人亲眼看 | 第四轮追加 | 否 | 生效 |
| DEC-78 | **所有提交走 PR + merge**：`main` 不再接受直接提交（**含纯文档改动**）；合并前必须等 CI 门禁通过；**Plastic 侧无 PR 概念，双渠道纪律不变** | 第四轮追加 | 否 | 生效 |

### DEC-78 提交方式：PR + merge（立即生效）

- **决定**：`main` 受保护，所有改动经分支 → PR → CI 通过 → merge（推荐 squash）。
- **固定流程**（AI 与人同一套）：
  1. `git checkout -b <type>/<slug>`；
  2. 分支上提交（本地 pre-commit hook 仍是第一道门禁）；
  3. `git push -u origin <branch>`；
  4. 开 PR（`base = main`）→ 等 `.github/workflows/gate.yml`（比本地 hook 多跑：类型检查、单测、构建、真浏览器渲染冒烟）；
  5. merge（squash，一个 PR = 一个可验收改动，DEC-28）→ `git checkout main && git pull` → 删分支。
- **为什么连文档也走 PR**：文档改的是"事实与纪律"，评审价值不比代码低（本仓库过去几轮里，`AGENT.md`/索引与代码不一致就是靠复查抓出来的）；且"文档例外"会让例外被滥用。
- **与双渠道（DEC-60）的关系**：Plastic 没有 PR 机制，**Unity 侧的 Plastic 提交照旧**；git 侧从"直接推 main"改为"经 PR 合入 main"。两者都要做，只是 git 侧的落点变了。
- **本决策自身也走 PR**（否则规则未生效先有一次直接提交）。

**关键约束（写进纪律，避免以后各页各写一套）**：

1. 产品**不许**出现排版稿的评审外壳（`.board` / `.board-wrap` / `.spec-*` / `.note` / `.theme-switch`）——它们只在 `mockup-shell.css` 里，产品不 import。
2. 产品样式**只允许**来自 `tokens.css` / `components.css` 的类名与令牌；页面里不写零散色值/圆角/描边（沿用 §20 的令牌纪律）。
3. 1920×1080 是**设计基准**而非运行基准：定尺时按它算，运行时按流式适配（含移动端，DEC-18）。
4. 三维视口用**容器比例自适应**（不按 1920 定死宽高），保证 Unity/Three 两种承载都能放进任意尺寸容器。

### DEC-73 布局体制：为什么是混合（连带影响）

- **纯整体缩放（选项 A）的致命问题**：排版稿里已经有长正文、题干、表格（C2/C5/C6/D2）。整体缩放后手机上字会小到不可读 —— 与 DEC-18"必须支持移动端浏览器"直接冲突。
- **纯流式（选项 B）的问题**：三维视口没法"流式"，它需要确定的宽高比；且站点线是横向 11 站，纯流式必然要换行或滚动。
- **混合（C）的落法**：
  - 外层容器（titlebar 浮卡、站点线、状态条、面板栅格）= 流式 + 断点；
  - 三维视口 = 容器决定宽高，内部按视口比例渲染（将来的 Three 相机 `aspect` 与 Unity CanvasScaler 各自处理）；
  - 站点线在窄屏走 `--narrow` 变体（横向滚动 + 首尾渐隐，见 `components.css` §16.1）。
- **已执行（2026-10-12，PR #2）**：拆分落地 —— `tokens.css` 381 行 / `components.css` 1041 行 / `mockup-shell.css` 129 行 / `style.css` 14 行聚合；462 条规则按**选择器**分类，规则文本总量守恒（71876 字符前后一致），拆分前后渲染**逐像素差异 0**。产品侧约束见 AGENT.md §4。



## 第五轮追加（2026-10-12）

| 编号 | 决定 | 选项来源 | 是否偏离建议 | 状态 |
|---|---|---|---|---|
| DEC-79 | **Unity 产物必须进打包流水线，且"有没有"必须是可查询的事实**：Unity 仍由人手动构建（DEC-59），产物暂存到 `unity/builds/<key>/`（不进 git，DEC-57），由 `tools/pipeline/` 校验并生成清单，打包时产出 `release-manifest.json`；Web 侧据清单决定"挂载 Unity"还是"明确显示产物未就位" | 第五轮追加 | 否 | 生效 |

### DEC-79 Unity 产物与打包流水线

- **问题**（负责人 2026-10-12 指出）：打包出的壳里**没有 Unity 产物**，而页面对此毫无察觉 —— 这是"最终一定不对"的状态。
- **决定**：
  1. **三段式**：Unity 人工构建 → 暂存（`unity-stage.mjs`，逐文件算 sha256）→ 打包（`pack.mjs`：校验 → web build → 发布清单 → exe）；
  2. **落点唯一**：`unity/builds/<key>/`（`<key>` 对应 TaskType，见 `docs/design/05` §3.2）；早期 `.gitignore` 预留的 `web/public/unity-build/` 保留忽略规则但**不再使用**；
  3. **发布清单**：`web/dist/release-manifest.json`（随包发布）写明本次包含的 Web / 内容 / Unity（含 `treeSha256`）与**服务端约定**（MIME、预压缩、缓存）—— 把 DEC-22 的"MIME/压缩/缓存清单"落成产物本身；
  4. **Unity 缺席是允许的，但必须明说**：`unity-verify.mjs` 在没有暂存产物时输出"未包含"而**不失败**；页面显示"Unity 产物未包含在本次发布里"并给出暂存命令；**禁止**再出现"页面假设有 Unity → 卡住/白屏"这种中间态。
- **为什么 Unity 仍要人工**：WebGL 构建需 IL2CPP + 编辑器授权（DEC-44 记录约 189s），且构建前必须关编辑器（DEC-59）。CI 只跑 `unity-verify`，**不构建 Unity**。
- **已执行（2026-10-12，PR #4）**：`tools/pipeline/{unity-stage,unity-verify,make-stub-unity,pack}.mjs`；`electron/server.js` 新增 `/unity/**` 路由（独立根目录，`/unity` 下缺文件一律 404，不回退成 HTML）与 COOP/COEP 开关 `WSU3_COOP_COEP`；`electron/package.json` 把 `../unity/builds` 打进 `resources/unity`；`web/src/unity/UnityLoader.ts`（注入 loader → `createUnityInstance` → 交桥握手 → 退出 `Quit()`，超时 25s、重试 1 次）+ `stores/runtime.ts` 落地；壳冒烟新增"Unity 页"取证。
- **验证**：用**桩构建**（`make-stub-unity.mjs`，文件形状与真产物一致，并会走一遍握手）跑通全链 —— 打包版报告 `unityManifest.included=true`、`unityPage.mode="mounted"`（画布已建 + 桥已握手）、`consoleErrors=[]`。**真 Unity 产物接入后不需要改代码**，只是把桩目录换成真目录。

---

# 第六轮决策（Unity 脚手架：UI 形态 / 启动事件 / 内容数据，2026-10-13）

> 来源：`OPEN-QUESTIONS-R6.md`（**26 条已答 + 14 条补充已答**）。本轮结论落在下面 9 条里。
> 其中 **DEC-80 取代 DEC-14 的 UI 部分**（"Unity 侧 UI 用 uGUI + TMP"不再有效；TMP 中文烘焙的 WebGL 红线随之退场）；
> 其余条目是**新增**，不改旧条目全文。

| 编号 | 决定 | 来源 | 状态 |
|---|---|---|---|
| DEC-80 | **Unity 侧不做界面**：全部 UI 在 Web 的 DOM 层；三维世界内**不做跟随文字标签**；输入走 `EventSystem + StandaloneInputModule + PhysicsRaycaster`；TMP / uGUI 包**保留不删**但只当输入底座 | R6-1/2/3/4/5 + S1/S2 | 生效 |
| DEC-81 | **Unity 构建粒度 = 单构建多任务**；**实例首次启动后永不卸载**；`0_Setup` 自检后 single 切 `1_Content` 并常驻；漫游在 `1_Content` 上 additive；任务之间**只装卸资源包** | R6-6/7/8/9 + S4/S5 | 生效（清单与加载器语义**待实现**） |
| DEC-82 | **内容数据两份同名文件 + 门禁报不一致**（两份都手写、无权威侧）；门禁比对**结构签名**（字段路径 + 类型，`null` 是真实类型） | R6-17/19/20/21 + S10 | 生效 |
| DEC-83 | **内容数据里的枚举写"名字"不写序号**；`QuestionType` 取 `None/SingleChoice/MultipleChoice/TrueFalse/FillInBlank`，`QuestionUsage` 取 `Exam/Step`（照被采纳数据的形状） | R6-20 + S11 | 生效 |
| DEC-84 | **启动与运行期语义**：preload = 延迟启动 + 自检后停在内容场景待命；`assets:ready` 与 `scene:ready` 分两条；进度两段合成；预加载失败静默；不可见时"全透明父画布 + 交互提前返回 + 资产卸净"，恢复用 `runtime:resume`；模态用 `input:enable`；移动端不预加载 | R6-10~16 + S3/S5/S6/S7 | 生效 |
| DEC-85 | **桥消息类型入契约**（23 条，分 Web→Unity / Unity→Web 两组；**分组、顺序、拼写**都要三方比对） | R6-25 + S13 | 生效（已落地） |
| DEC-86 | **程序集依赖**：`WSU3.Core → WSU3.Contracts` 允许（唯一一条下行依赖）；`WSU3.Contracts` 保持零依赖；`docs/design/03` 的目录与依赖表随之更新（**删除 `UIs/` 目录**） | R6-24 + S | 生效 |
| DEC-87 | **资源加载三条链路都做**（AB 为主 / AA 管场景 / 内置 `Resources`）；包登记表落 `Resources/Config`，包产物落 `Assets/StreamingAssets`；**不采用**被采纳工程的第三方表现插件与自制 ShaderGraph（材质改用 URP + 贴图通道映射） | R6-22 + S12 | 生效 |
| DEC-88 | **全量采用既有"低压电气实训"仿真软件的内容数据**（7 份 JSON）作为本工程测试数据，并按其需要**复制三维资产**（允许 Blender 转换）；来源工程**只读**；采纳范围与剔除项见 `research/09` | 负责人 2026-10-13 追加 | 数据**已采纳**；资产搬运进行中 |

## 17 第六轮决策的落地要点

### 17.1 DEC-80：UI 形态（取代 DEC-14 的 UI 部分）

- **取代关系**：DEC-14 原文不动，但其"Unity 侧 UI 用 uGUI + TMP"与"TMP 中文烘焙包体"两条结论**不再作为本工程做法**。
- **三维世界内的文字**：不做跟随标签；文字全在 Web 侧栏 / 浮卡。点击物体仍回 `object:picked`，由 Web 决定弹什么。
- **引线 / 箭头 / 标注**：属于**三维几何**（`LineRenderer` 等），仍由 Unity 画 —— 与"没有 UI"不矛盾。
- **输入**：`EventSystem + StandaloneInputModule + PhysicsRaycaster`；**不建 Canvas**、不使用 `GraphicRaycaster`（它必须挂在 Canvas 上 —— 这是 Q-R6-S1 的关键澄清）。
- **包与依赖**：`com.unity.ugui` / `com.unity.textmeshpro` **保留在 manifest 里**（`EventSystem` 来自 uGUI 包），但**不作为界面方案**；这条写进 `docs/design/03` §2，避免以后有人往 Canvas 里塞界面。
- **输入边界**：常态由 CSS `pointer-events` 决定；模态态由 Web 发 `input:enable{false}` 显式关闭三维输入。

### 17.2 DEC-81：构建粒度与实例生命周期

- **一个构建承载全部 Unity 类任务**（`LineConnection` / `Training` / `Structure` / `Inspection`）；换任务 = `scene:exit` → `scene:enter`，**不重建实例**。
- **实例永不卸载**（直到用户关闭页面）；切到 Three 类任务或离开内容页时**只让容器不可见**。
- **场景**：`0_Setup`（自检）→ single 切 `1_Content`（常驻）；两者**都进构建**；漫游场景在 `1_Content` 之上 **additive**。
- **⚠️ 待实现**：`unity-stage.mjs --task-types`、清单 `taskTypes[]`、`stores/runtime.ts` 的匹配口径（对照表见 `docs/design/05` §3.2）。

### 17.3 DEC-82 / DEC-83：内容数据的双份与枚举口径

- **两份落点**：`web/public/content/data/*.json`（随 `web/dist`）与 `NewStructureUnity/Assets/StreamingAssets/Data/*.json`（随 Unity 构建）。
- **权威侧**：负责人选 **C —— 两边都手写，门禁只报"不一致"**。⚠️ 已记录的取舍：这与 DEC-08「单一真源」有张力，因此门禁**在提交与合并两处都跑**，且不一致时**一律先看两侧 diff 再决定改哪边**，不允许"谁红改谁"。
- **比对粒度**（由 AI 定）：**结构签名**（字段路径 + 值类型）；`null` 是真实类型；**不比对值**。
- **枚举写名字**：`"questionType": "SingleChoice"`、`"usage": "Step"`、`"contentType": "UI"`；名字是契约，三处同批改。
- **`QuestionType` 最终取值**（由 AI 定，照被采纳数据）：`None=0 / SingleChoice=1 / MultipleChoice=2 / TrueFalse=3 / FillInBlank=4`；`QuestionUsage`：`Exam=0 / Step=1`。**`docs/design/04` 原写的"1 单选 … 5 排序"作废**（草案且与数据不符）。
- **已落地**：`tools/check-content-data.mjs`（7 份文件、结构签名）+ 进 pre-commit 与 CI。

### 17.4 DEC-84：启动链与运行期语义

- **preload 的定义**（负责人口径）：**延迟启动 Unity → 自检通过后停在内容场景待命**；此时**没有装配任何任务**（不违反 DEC-08）。
- **启动链**：`unity:ready` → `app:init`（握手后立刻发）→（可选 `preload:task`）→ `scene:enter` → `assets:ready` → `unity:progress`×N → `scene:ready`。
- **两条就绪**：`assets:ready` = 资源包装完（Web 开始渲染界面）；`scene:ready` = 可交互（Web 结束 loading）。**由 AI 定**（Q-R6-S6）。
- **进度合成**：0~0.6 引擎、0.6~1.0 装配，**权重写在 Web 侧常量**。
- **失败**：进入超时 25s / 重试 1 次（沿用 DEC-71）；**预加载失败静默**；清单说"未包含 Unity"时**绝不预加载**；**移动端不预加载**。
- **不可见**：用一个**全透明父层画布**让内核继续跑，Unity 侧在交互与更新链路**提前 return**，并**把资产卸干净**；恢复用 `runtime:resume`。动机：`display:none` 会让 `rAF` 暂停，回来后状态不可预期。

### 17.5 DEC-85：桥消息入契约（已落地）

- 23 条消息分两组，写在 `web/src/contracts/bridge.ts`、`NewStructureUnity/Assets/Scripts/Contracts/BridgeMessageType.cs`、`content/contracts/snapshot.json`。
- 门禁额外校验：两组顺序、拼写，以及 **C# 常量声明顺序 = Web 组 ++ Unity 组**。

### 17.6 DEC-87 / DEC-88：资源与资产的采纳

- 三条链路的分工、包登记表与产物落点写进 `docs/design/03` §7；**四条例律**（一项目一包 / 实例登记 / WebGL 的 StreamingAssets 是 HTTP / bundle 名小写）来自被采纳工程的实际踩坑。
- **不采用**其第三方表现插件（后处理 / 高亮 / 屏幕空间反射）与自制 ShaderGraph；材质改用 URP 标准光照 + 贴图通道直接映射（BaseColor / Normal / AO-Gloss），**画面降级已确认可接受**。
- **剔除项**：PSD 设计稿、演示帧、未压缩背景大图、旧代模型、TMP 字体 SDF（理由与体积见 `research/09` §5）。
- **落点**：大资产源文件放 `content/assets/unity/`（不进 git，DEC-57）；Three 侧所需 glTF/GLB 放 `content/assets/three/`。

## 18 第七轮追加（2026-10-13）：步骤系统

| 编号 | 决定 | 选项来源 | 状态 |
|---|---|---|---|
| DEC-89 | **步骤数据的归属按"条件自带数据"**：`StepHandler` 只留元数据（id / 显示名 / 描述）+ 一个 `[SerializeReference]` 多态条件；显隐表、动画槽位、提示/音频 key、以及各条件自己的字段（点击目标、面板 id、题号、配对表）全在条件上。理由是"每种条件只用得上自己那几个字段"，摊在步骤上会留一堆空字段 | 负责人 2026-10-13（在"数据挂步骤 / 数据挂条件 / 条件做成组件"三案中选后者前一案） | **已生效**（`docs/design/10`） |
| DEC-90 | **所有跳转都从 P0S0 重置后再快进到目标**（状态一致性优先于跳转性能）：跳转先全员 `ResetCondition()`，再把目标之前的步骤 `FastComplete()`（定格末帧、不播放、不发事件），目标步骤走正常三阶段 | 需求方口径 | **已生效** |
| DEC-91 | **新增入站契约消息 `ui:result`**（教学面板回执），与既有出站 `ui:request` 成对；**判定留在界面层**（Web 持有同一份题库），Unity 只认 Success / Failed / Unavailable 三种结果 | 负责人 2026-10-13（"全链路实现"） | **已生效**（三处契约同批：C# / TS / 快照，门禁通过） |
| DEC-92 | **步骤推进由自驱小泵驱动**（`StepManager.CoreUpdate()` 逐帧推进 `Stack<IEnumerator>`）而不是 `StartCoroutine`：这样 `InputGate.ShouldUpdate` 能直接管住"容器不可见时先别推进"，编辑器测试也能手动一帧帧推 | AI 定（与 `TaskFlowManager` 同一套写法） | **已生效** |
| DEC-93 | 本期**不实现** `Tool` / `Drag` 两种条件；`ConditionLineConnect` 先做"配对状态机 + 常驻连线"，**临时线跟随鼠标**与成绩体系留待后续（`task:completed` 的 score **恒为 0**，不编造分数） | 负责人 2026-10-13 | **已生效**，遗留项见下表 |

### 18.1 DEC-89 ~ DEC-93 的落地口径

- **三级结构**：`StepManager`（场景根，导演）→ `ProcessingHandler`（进程）→ `StepHandler`（步骤）→ `ConditionBase`（条件）。收集只看**直接子节点**，缺组件会被跳过并告警（不静默少几步）。
- **三阶段**：`Prepare`（显隐归位 + 动画隐藏 + 子类隐藏交互物）→ `Waiting`（定格首帧 + 显示交互物 + 等待，**阻塞点必须用 `WaitUntilOrForceComplete`**）→ `Complete`（收尾 + 播放 + 等播完 + 按需隐藏）；`FastComplete` 不播放、直接定格末帧。
- **归位 ≠ 定格首帧**：跳转归位阶段动画物体是**隐藏**，定格首帧只发生在目标步骤进入 `Waiting` 时。
- **协作式打断**：`NextStep / SkipCurrentStep / CompleteCurrentStep` 都走 `ForceComplete()`；打断发生在阶段间隙时退化为"按最近的可跳转位置重放"。
- **面板分层**：Core 定 `IStepPanelPort`（提示 / 信息面板 / 答题），Runtime 的桥实现它（`ui:request` 出站、`ui:result` 入站）；**端口缺席时降级为"直接完成"并告警**，绝不把流程卡死在等不到的面板上。
- **事件出口**：Core 发 `StepChangedEvent` / `AllStepsCompletedEvent`，Runtime 的桥订阅后转 `step:changed` / `task:completed`（与 `object:picked` 同一走法，Core 不依赖桥）。
- **测试**：`Assets/Tests/EditMode/StepSystemTests.cs` **17 项**（全流程与扁平进度、跳转重置与快进、打断、终止型条件、空条件、面板等待与降级、答错重问、连线配对与画板，以及 DEC-94/95 的收尾 8 项），全量 EditMode **49/49 通过**。

### 18.2 第七轮复盘：跳转打断与快进的收尾（DEC-94 / DEC-95）

> 触发：2026-10-13 用两个独立 subagent 把实现与参考文档逐条对账 + 做状态机缺陷扫描，
> 命中若干"会改变运行行为"的问题，同日修完并补测试（本仓库从未把 subagent 结论直接当结论，
> 每条都回到代码复核过一遍）。

| 编号 | 决定 | 来源 | 状态 |
|---|---|---|---|
| DEC-94 | **跳转打断要收尾**：`Restart`/`StopExecution` 先 `CloseTopPanel()`；**快进 = `Prepare` + `FastComplete`**（显隐表必须落地，否则"跳过去"与"走过去"状态不等价）；终止型条件在快进路径同样结束流程；**泵内发起的导航推迟**到本轮推进结束（否则跳转会被静默吞掉）；流程结束后再按"下一步"不再重跑 | 复核发现（破坏"状态一致"） | **已生效** |
| DEC-95 | **面板等待默认不限时**（`timeoutSeconds = 0`，需要时按条件配）；**非 WebGL 环境当场降级**（编辑器/独立播放器没有页面桥）；桥停用时端口 `Dispose()` 退订 | 复核发现（与"绝不卡死"的声明不符） | **已生效** |

**同批修正的文档口径**（都改在 `docs/design/10`）：事件时机（`StepWaitingEvent`/`step:changed` 是"进入 Waiting 那一刻"发，
早于条件内部的首帧定格与交互物显示）、连线**不跨跳转保留**（与 DEC-90 的"从 0 重置"一致，不再写"跨跳转保留"）。

### 18.3 第七轮仍未闭合

| 未闭合 | 原因 | 去向 |
|---|---|---|
| Web 侧 **`ui:request` / `ui:result` 的落地面板**（DOM） | 契约与 Unity 侧已就绪，页面还没实现；WebGL 里信息/答题条件会一直等（编辑器里已改为当场降级，见 DEC-95）。落地时要守两条：弹不出来也回 `unavailable`、一个请求只回一条回执 | `PLAN.md`（Web 侧待办） |
| 面板等待的 **`timeoutSeconds` 取值** | 默认 0（不限时，尊重"学生要想很久"）；真内容接入后才知道该不该配下限 | 内容装配时定 |
| **`Tool` / `Drag` 条件** | DEC-93 本期不做（工具面板、拖拽命中都还没有业务面） | 有内容需求时再补，`ConditionType` 已留值 |
| 连线**临时线跟随鼠标** | 只做了"配对状态机 + 常驻线"，手感专项未做 | 连线手感专项 |
| 步骤层级**尚未挂进场景**（`1_Content` 里还没有 `StepManager` 节点） | 内容装配（P2-6）未落地，先有代码再有树 | 内容装配时一起接；接法与自查清单见 `docs/design/10` §6 |
| **成绩体系未建**：`task:completed` 的 `score` 恒为 0 | 计分规则未定 | 成绩专项；在此之前不编造分数 |

| 未闭合 | 原因 | 去向 |
|---|---|---|
| **接下来要做什么**（步骤 / 落点 / 验收） | 唯一维护点已独立成文，避免上下文被压缩后丢失 | **`PLAN.md`** |
| **Unity 侧协议桥实现**（`.jslib` + 消息接收 + 启动编排） | DEC-85 已定清单，尚未写代码 | `PLAN.md` P0-1；落点 `Assets/Scripts/Web/` |
| **流水线与加载器的"单构建多任务"语义**（DEC-81） | ✅ **已实现（2026-10-13）**：`--task-types` + 清单 `taskTypes[]` + `pickUnityBuild` + 壳侧同口径；验收＝桩构建 → 打包 → 壳冒烟 `mounted` | 见 `docs/PLAN.md` 已完成 1.13 |
| **Unity 侧"编辑期 SO → 导出 JSON"链路**（DEC-82 / DEC-88） | 本期先采用"JSON 手写" | 数据面稳定后接入 |
| **Web 侧内容层改用 `content/data/*.json`** | 当前仍走 `content/projects/` 的演示数据 | 与 Unity 桥同批做 |
| **三维资产搬运与格式转换**（DEC-88） | 范围、体积与取舍已测绘（`research/09`） | 分批：8 器件新代模型 → 原理图 →（需要时）Blender 转 GLB |
| 微信内置浏览器的**真机实测**结果 | 需要真机 | 待设备可用 |
| CI 是否已在 GitHub 仓库启用 | ✅ 已闭合（PR #1 起两项检查持续为绿） | 见 `.github/workflows/gate.yml` |
| WebGL 基线体积 | ✅ 已闭合（8.40 MiB / 空 URP 场景） | 见 `research/08-webgl-baseline.md` |
| WebGL 的**首屏加载时间与帧率** | 尚未测（只统计了体积） | 下一步：把真 Unity 产物挂静态服务器实测 |
| 运行环境的最终形态（在线 / 离线 / 局域网、目标静态托管） | DEC-05 / DEC-35 先不定 | 实现按"服务器可控"推进，目标托管与 COOP/COEP、缓存头一并定 |
| **亮色是否作为默认主题** | 两套主题都已支持，默认仍是深色 | 负责人拍板；改动点只有 `stores/theme` 的默认值 |
| **包体预算门禁** | DEC-02 的 250~360 MB 预算只有文字，无脚本 | 真产物接入后加门禁脚本（现有门禁只管单文件 10 MB） |

## 19 追加（2026-10-13）：模型检视页（审核用）

| 编号 | 决定 | 选项来源 | 状态 |
|---|---|---|---|
| DEC-96 | **模型检视页（审核用）落 `docs/model-preview/`**：与 `docs/ui-mockups/` 同级，静态页、不起构建；**服务根＝仓库根**（`node docs/model-preview/serve.mjs`），直接读磁盘上的 `content/assets/three/**` 与 `web/node_modules/three` —— **不复制、不进 git、不改产品构建链路**；清单**不另维护第二份**（读 `content/asset-convert-report.json`）；**只消费 `ui-mockups` 的令牌与元件**，不新增令牌与产品组件类 | 负责人 2026-10-13（"和 ui-mockups 同级、功能也差不多"） | **生效**（已实测 8 个模型） |
| DEC-97 | **素材口径：GLB 只出网格与材质，一张贴图都不带**；base（含 alpha）/ normal / mask 三张图**全部渲染期后加载** —— 落 `content/assets/three/<器件>/`（共享图落 `_shared/`），由 `content/asset-material-textures.json` 查找表定位，渲染期解算（`docs/model-preview/src/materials.mjs`）是唯一取图入口。理由：贴图正是反复要调的东西 → "改文件即生效"，不必重导；且 mask 是 HDRP 通道语义、glTF 表达不了，最终仍要在渲染期重排，那就不烘。**本条取代 §19.4 `P1-4b` 第 1/2 条**（原计划"重排烘进 GLB"作废） | 负责人 2026-10-13（"glb 只负责提供 mesh 和 mat，其他所有的贴图都后加载，包括 base(alpha) mask 和 normal"） | **生效**（GLB 21.7 → **7.3 MB**，每个 GLB **贴图 0 张**） |

### 19.1 DEC-96 的落地要点

- **它是审核工具，不是产品**：不起构建、不进门禁、不进打包链路。用途是把 13 个 GLB 逐个挂上 Three.js，当场定**环境**（光照 / 环境贴图 / 背景 / 曝光）与**材质**（金属度、粗糙度、贴图接没接上）。
- **跑法**：`node docs/model-preview/serve.mjs` → `http://127.0.0.1:5281/docs/model-preview/index.html`。**服务根必须是仓库根**，因为页面要同时取到三处：自己（`docs/model-preview/`）、13 个 GLB（`content/assets/three/**`，按 DEC-57 **不进 git**，所以不在任何 `dist` 里）、three 库（`web/node_modules/three`，一份库两处用）。
  没有用 `python -m http.server` 的理由只有一条：ESM 的 import map 与 `<script type="module">` 对 `.mjs` 的 MIME 是强校验的，自带脚本才给得稳（顺带给 `.glb` 一个 `model/gltf-binary`）。⚠️ 该脚本里有一个**踩过**的坑已写成注释：写响应头后**不能**先 `res.end()` 再 `pipe()`，否则"头写 content-length、正文 0 字节"，浏览器永远等不到 `load`。
- **清单不另维护第二份**：模型 / 字节 / 三角面 / 贴图 / 未映射项读 `content/asset-convert-report.json`（P1-4 的转换证据，进 git），器件中文名读 `content/data/ProjectData.json` 的 `clip_<器件>`；页面还会对每个 GLB 发一次 HEAD 校验字节数 —— 清单与磁盘漂了要**立刻看得见**。
- **读数分两栏**："证据"＝转换报告，"实测"＝从 GLB 现读。⚠️ 两个**口径差异**是实测踩出来的，不标清楚会得出"清单错了"的假结论：
  - 实测"网格"是 **glTF primitive 数**（GLTFLoader 一个 primitive 建一个 Mesh），清单里是 Blender 的网格对象数（一个网格拆多 primitive 时不等）；
  - 实测"材质"是 **three.js 材质实例数**（GLTFLoader 会因几何体缺法线/切线等**克隆**材质），要与清单比的是**按名字**的种类数。
- **实测结论（2026-10-13，13/13）**：三角面逐个**精确一致**、材质名逐个一致、无 console 错误、绘制调用 > 0；**切模型后显存回落基线**（几何 = primitive + 网格，贴图恒定）—— 即 `dispose()` 链无泄漏。切到 IBL 会常驻 **+12 几何 +2 贴图**（环境贴图与 PMREM 的内部资源），反复切换**不再增长**（一次性的），退出页面由 `Stage.dispose()` 一并释放。
- **材质现状（本页要拍板的依据）**：22 张贴图 **BC + N 全部接上**；13 个 GLB 的材质**全部 `doubleSided` + `alphaMode: OPAQUE`**；金属度/粗糙度是转换期的**常数兜底 `0.0 / 0.5`**（`*_M_AO_G.png` 是 HDRP mask map，通道语义与 glTF 不符，转换脚本**故意没塞**，只记进 `unmapped`）。
- **样式纪律**：只消费 `ui-mockups` 的 `tokens.css` + `components.css`（页面里的 `<style>` 只做本页布局，**不新增令牌、不新增产品组件类**），因此不产生"必须在成果页展出"的新样式。
- **与 P1-5 的边界**：本页**不**解决"产品怎么拿到大资产"。产品侧仍是 `docs/PLAN.md` 的 **P1-5**（构建前把 `content/assets/three/**` 拷进 `web/dist/assets/three/**`，运行时 URL `/assets/three/**`），**尚未实现**。

### 19.2 本页要拍板的两件事（未闭合）

| 未闭合 | 原因 | 去向 |
|---|---|---|
| **环境取哪一套**（影棚 HDRI / 产品现状 / 灯光+IBL / 仅环境光；以及背景、曝光、色调映射） | DEC-96 落地的正是"让人当场看"的页面，结论要负责人看过再定 | 本页审阅后定；定完改 `web/src/viewer/Viewer.ts` 的默认值 |
| **材质取什么值**（金属度 / 粗糙度常数，或按通道重排另出 metallicRoughness 贴图；`doubleSided` 是否保留） | 同上；常数兜底是转换期的权宜，重排贴图是另一批工 | 见 §19.5（DEC-97 已定：GLB 不出贴图，三张图全部后加载） |

### 19.3 影棚 HDR 环境贴图（2026-10-13，负责人指定）

- **落点**：`content/assets/three/env/StudioWhiteUmbrella.exr`（5.65 MB，Three 侧大资产，按 DEC-57 不进 git；`content/assets/**` 已被忽略）。
- **用法**：本页把它**同时**当**背景（天空盒）与光源（IBL）** —— 原图直接当 `scene.background`（PMREM 版太糊，只给材质做 `scene.environment`）。
- 新增环境方案 `影棚 HDRI · Studio White Umbrella`，**设为默认档**；`产品现状` 档连背景一起回到深色（要的是"整体可对照"，不只是灯）。
- 页面按负责人要求去掉了**地面网格**（连同它的开关），并**解绑右键平移**（`mouseButtons.RIGHT = null`；中键缩放、左键旋转保留）。

### 19.4 材质通路：源工程实测结论与 `P1-4b` 增量（2026-10-13）

**从只读来源工程抽出的规格**：`content/asset-material-spec.json`（新工具 `tools/pipeline/extract-material-spec.mjs`，可重跑、幂等）。

实测（全部来自材质实值，不是文档转述）：

| 项 | 实测 |
|---|---|
| 主材质 shader | `HDRPtoURPCustomDirtLitShader`（10 个器件），`_BaseMap` / `_NormalMap` / `_MaskMap` 三张全绑 |
| mask 通道语义 | **HDRP Lit 排布：R=Metallic、G=AO、B=DetailMask（未用）、A=Smoothness** |
| 区间重映射 | `_MetallicMin/Max` [0,1]、**`_OAMin/OAMax` [0.5,1]**、`_SmoothnessMin/Max` [0,1]（`SpeedRelay_Coat` 的 Smooth 是 [0,**0.8**]） |
| 表面模式 | `Glass`、`CombinationSwitch2` = **BLEND**（`_Surface=1`、`Src/Dst=1/10`、`ZWrite=0`；α 分别 0.2 / 0.6）；`ElectronicSupermarket2`、`CircuitBreaker_2`、`WYF`、`档位`、`表笔红2/黑2`、`Alpha` = **MASK** |
| 双面 | 全部 `_Cull=2`（Off）→ 双面 |
| glTF 表达不了 | `*_Metal` 的 `Chrome05.cubemap` + `_CubeColor` 染色、清漆层、程序化污渍 —— **已在规格里逐条记账**（`lostInGltf`） |

**⭐ 逐子材质核对（新工具 `tools/pipeline/audit-material-mapping.mjs`）：13 个模型里 8 个含第二/第三套子材质，全部错**：
**每个材质都共用主干的那两张贴图（`img=[1,0]`）**，即"铭牌 / 贴花 / 面板图 / 透明罩"现在显示的是**器件主干纹理**。
根因：搬运脚本只按"与 FBX 同名前缀"收贴图，而 `铭牌.png` / `ElectronicSupermarket2.png` / `TimeRelayMap.png` / `ThermalOerloadRelay_2.jpg` / `White.png`（`Model/Public` 的 2KB 白图）
**文件名对不上前缀 → 根本没搬进来**；转换脚本再按前缀给所有材质挂同一张图。合计 **18 处**。

| 子材质 | 现状 | 应为 |
|---|---|---|
| `CircuitBreaker_2` | 主干贴图 | `铭牌.png` + MASK |
| `ElectronicSupermarket2`（5 个模型） | 主干贴图 | `ElectronicSupermarket2.png` + MASK |
| `CombinationSwitch2` | 主干贴图 | `White.png` + BLEND（α 0.6） |
| `Glass`（2 个模型） | 主干贴图 | `White.png` + BLEND（α 0.2） |
| `TimeRelayMap` | 主干贴图 | `TimeRelayMap.png` |
| `ThermalOerloadRelay_2` | 主干贴图 | `ThermalOerloadRelay_2.jpg` |

**预制体覆写**（材质挂在 `MeshRenderer` 上，按 FBX 转必丢）：`SpeedRela_Metal` + `SpeedRelay_Coat` ← `speedRelay_info/structure_model`；`CombinationSwitch_Metal` ← `combinationSwitch_info/structure_model`；`CeramicPlugInFse_Metal` ← `fuse_structure_model`；`ThermalOerloadRelay_Metal` 只在 `Preview_Room1.unity`（预制体里没有）。

**⭐ 覆写机制已查明（2026-10-13，2026-10-13 负责人要求"必须通过正确的 prefab 导出"）**：

- 现在的转换链**只有 FBX、预制体一次都没参与**：`fbx-to-glb.mjs` 输入 `Assets/Models/<器件>/*.fbx`；
  `blender-fbx-to-glb.py` 第 45 行 `bpy.ops.import_scene.fbx(...)`、第 174 行 `export_scene.gltf(...)`。**这是材质覆写丢失的根因。**
- `*_info_model` 预制体里**没有自己的 MeshRenderer**（解析出 0 个），但有一个 `PrefabInstance`：
  `m_SourcePrefab` 的 guid 解析出来**就是那个 FBX**（Unity 把 FBX 当可实例化的预制体）；
  `m_Modifications` 里 `propertyPath: m_Materials.Array.data[0]` + `target: {fileID, guid: <FBX>}`
  ⇒ **覆写是按 FBX 内部 MeshRenderer 的 fileID 打的**，`.guid` 就是 `SpeedRela_Metal` / `SpeedRelay_Coat`。
- `*_structure_model` 则是**直接**在自己节点上写材质（`fuse_structure_model` 有 `CeramicPlugInFse_Metal`、
  `combinationSwitch_structure_model` 有 `CombinationSwitch_Metal`；`speedRelay_structure_model` 的 41 个节点直写 `SpeedRelay`，
  `*_Metal`/`*_Coat` 同样在 `m_Modifications` 里）。
- **因此几何不需要重新装配**（照旧从 FBX 导入），缺的只是**覆写层**：把 `m_Materials.Array.data[N]` 的 fileID
  经 `*.fbx.meta` 的 `internalIDToNameTable` 映射到节点名，再在 Blender 里按节点应用覆写材质。
  材质属性本身规格里已有（`content/asset-material-spec.json`），按 PBR 等价降级。
- ⚠️ 上一版这里写的"硬套会贴错地方"**只对"按节点名猜"成立**。

**已实施（2026-10-13）**：

1. `extract-material-spec.mjs` 增加 `devices[<器件>].prefabOverrides`（**末段节点名 → 材质名**）：以**结构件 prefab** 的 MeshRenderer 为准（节点名与 FBX 逐字对应、给出全量分配），并用 `*_info_model` 的 fileID 覆写做**交叉校验**（只比材料多重集，因 fileID 推不出名字；不满足 ≥ 就告警）。
2. `blender-fbx-to-glb.py` 增加覆写层（`--spec` + `--model-key`，不传则行为与以前完全一致）：按节点名替换材质槽；`*_Metal`/`*_Coat` 克隆主干材质并**只建一次**（`material.copy()` 会自动加 `.001`，而渲染期按**材质名**对规格 —— 名字带后缀会全部落空，实测踩过）；无基色贴图的（`Alpha`）自建材质 + α=0 + CLIP。
3. `fbx-to-glb.mjs` 传 `--spec content/asset-material-spec.json`。

**重建结果（13/13，0 失败）**：几何未变（三角面与重建前逐个一致）；**32 个非主干材质节点**落地（combinationSwitch 13×`CombinationSwitch_Metal`、fuse 2×`CeramicPlugInFse_Metal`、speedRelay 3×`_Coat` + 1×`_Metal`、breaker `CircuitBreaker60=CircuitBreaker_2`、timeRelay `TimeRelayMap` ×2…）；**GLB 里 0 个材质名对不上规格**（渲染期解算能全部命中）。

⚠️ **已知缺口（真实，不掩盖）**：预制体里有一部分节点是**预制体自己加的内置图元**（`Cube`/`Cube (1..3)`/`Cylinder`/`jiexiankong`），FBX 里没有 → 我们的 GLB 不含这些几何，它们身上的 `Alpha`（基色 α=0 ⇒ 原工程里不可见）材质也就无从应用。要不要把这些图元也搬进来，**待负责人定**。

**`P1-4b` 的增量（技术路径已定，实施另批）**：

1. **补搬**子材质引用的贴图：`tools/pipeline/import-adopted-assets.mjs` 由"同名前缀"改为"**按材质引用**"（`_BaseMap` / `_NormalMap` / `_MaskMap`），并补 `Assets/Model/Public/White.png`；
2. **按材质逐槽位挂钩** + **ORM 重排**（`R←AO(G)`、`G←1−Remap(Smoothness(A))`、`B←Metallic(R)`，区间按规格烘进去）+ **表面模式**（MASK/`alphaCutoff`、BLEND/`baseColorFactor.a`，并把 BaseColor 的 α 接到 BSDF）：改 `tools/pipeline/blender-fbx-to-glb.py`；
3. **预制体覆写**：先解决"结构件装配"这一层（节点对应关系），再谈 `*_Metal` / `*_Coat`；
4. 重建 13 个 GLB → 重跑 `audit-material-mapping.mjs`（**问题数要归零**）→ 再跑模型检视页逐个核对。

### 19.5 素材口径改为"GLB 只出 mesh + mat"（DEC-97，2026-10-13，负责人定）

**决定**：GLB **只负责网格与材质**（材质名、槽位、`baseColorFactor`、表面模式），**一张贴图都不带**；
base（含 alpha）/ normal / mask 三张图**全部渲染期后加载**。**取代 §19.4 `P1-4b` 的第 1/2 条**。

**改了什么（四处）**：

1. **导出层摘贴图**：`blender-blend-to-glb.py` 的 `strip_textures()`（一条龙路径 `blender-fbx-to-glb.py` 同步）——
   摘掉材质里的 `TEX_IMAGE`/`NORMAL_MAP` 节点，并把规格里的基色/α 写回 BSDF，让 `baseColorFactor` 仍是有意义的常量。
   ⚠️ 实现坑：`nodes.remove()` 之后该 RNA 立即失效，再读 `node.name` 会抛 `StructRNA ... has been removed`（踩过）。
2. **搬运脚本改职责**：`import-material-textures.mjs` 不再"补搬 GLB 带不动的"，而是**按材质引用搬齐三张**
   （取消了"跳过 mask"与"GLB 里已有就跳过"两个分支）。
3. **mask 并入查找表**：以前 mask 是唯一一个"直读 Unity 侧 `Assets/Models/<器件>/`"的例外 —— 那条路径
   **在产品里不存在**（打包只带 `content/assets/**`），现在三张图一视同仁走 `content/asset-material-textures.json`。
4. **渲染期解算成为唯一取图入口**（`materials.mjs`）：按文件名接 base/normal → mask 重排为 ORM（区间烘进像素）
   → 按规格对齐表面模式/双面。材质里已无 GLB 贴图，所以"名字相同就跳过"的判断自然全部命中"要加载"。

**实测（2026-10-13，8/8）**：GLB **21.7 → 7.3 MB**，每个 GLB **贴图 0 张**、材质 2~3 个逐个保留；
查找表 **30 条**（base 8 / normal 8 / mask 8 / 其余 6 = 5 张共用贴花 + `White.png`）；
**41 张贴图全部可解析、0 缺失**；`export_apply` 与贴图无关，三角面与重建前**逐个一致**。

**顺带修掉的一个真问题**：FBX 里有些网格带**全零顶点色**（`COLOR_0` = `(0,0,0,0)`，实测 `SpeedRelay01/04`），
源工程 Shader 不读它，但 glTF 会把 `COLOR_0` **乘进基色** ⇒ 那两块在 Three 里**全黑**。glTF 没有
"声明本材质不用顶点色"的开关（顶点色是网格属性），所以导出时把顶点色属性摘掉。

**"贴图后加载"必须自己补的三条约定**（换通路时漏掉就会错，实测踩过）：

- **`flipY = false`**：glTF 的 UV 原点在**左上**，GLTFLoader 从 GLB 取图时一律设 `flipY = false`。改成后加载后，
  外部用 `TextureLoader` 加载的图必须自己补 —— 否则 base / normal 整张**上下翻转**。
  典型症状是**"只有 mask 是对的"**（mask 在 `buildOrmTexture` 里显式设过 `flipY = false`）。`wrapS/wrapT` 同理（glTF 默认 REPEAT）。
- **`baseColorFactor` 必须置白**，不是规格里的 `baseColor`：它是贴图的**乘数**，写 0.79 会把后加载的贴图整体压暗；
  **但 BLEND 材质的 α 必须带出去**（`Glass` → `[1,1,1,0.2]`）—— 贴图还没进来时 α 没有别的地方可兜底。
- **`normalStrength`**：以前由 GLB 的 `normalTexture.scale` 带出去，后加载后要按规格自己给（实测规格里全是 1）。

### 19.6 排版稿内嵌真实画布 + 取图加固（2026-10-13）

**① 排版稿里的三维区不再是占位块**：`docs/ui-mockups` 的 C6「简介」把占位组件换成
`<iframe src="../../model-preview/index.html?embed=1&model=<器件>/<名字>">` —— 环境、天空盒、贴图后加载、
材质解算**全部复用检视页那一套**，不产生第二份渲染实现。`src/parts.mjs` 的 `viewport()` 增加 `liveSrc` 形参，
不传仍出占位块（其余 28 页不受影响）。换器件只改 iframe 的 `?model=`。

- **嵌入模式**（`?embed=1`）：只留画布，页壳（标题 / 模型列表 / 环境面板 / 读数）全部收起。两个"踩过"的点：
  ① 收起规则必须 `!important`（面板带**行内** `display:flex`，作者样式压不住）；
  ② `.mp-split` 是**两列**网格（`1fr 336px`），藏掉读数面板后**那一列还在** —— 空列露出页面底色，
  表现就是"画布右边一道黑"。
- **画布透明**（`clearAlpha = 0` + `scene.background = null`）：背景交给宿主 UI（排版稿自己的 `--bg-0` + 网格底纹），
  深浅主题自动跟随，不用在 three 里重画一遍；**灯不变**（影棚 HDRI 照旧作 IBL）。
  嵌入时还必须把**页内**容器（`html`/`body`/`.spec-page`/`.ui-panel`/`.ui-panel__body`）全部去底、去 blur、
  去描边 —— iframe 的页面只要不透明就会挡住宿主的毛玻璃；叠两层半透明（0.55 + 0.55 ≈ 0.8）更会让**左框明显比右框深**。
- 真实画布**只画画布**：占位态的技术栈标（`.ui-viewport__hint`）与工具组（`.ui-viewport__tools`）不再输出。
- 画布框 = `.ui-panel`（与右侧说明同款：同色描边 + 毛玻璃），所以"模型浮在一个毛玻璃半透明的框里"。

**② 排版稿样式调整（负责人逐条提）**：站点线 `.ui-route` 去底 + 去 `backdrop-filter` + **去描边**；
浮卡 `.ui-titlebar--float` 上移到与 `.ui-topright` **上边缘平齐**（50 → **22px**；只改外壳规则、不动令牌，
因为 `--shell-top-y` 还被 `.ui-company` 的 `calc()` 用着）；C2~C7 顶部留白 20 → **150px**（原来与标题、右上按钮组重合）；
C6 的页脚批注删除。

**③ 取图加固**（"偶现 baseMap / Normal 加载不出来"的两个真因，都是**时序**）：

| | 机制 | 修法 |
|---|---|---|
| **R2 快照回写**（主因） | 贴图快照是 `loadModel` 里建的（那时 GLB 无贴图 ⇒ 全 null），而 `apply()`（曝光/环境/贴图开关…任何控件一动都会调）会把快照**写回**材质 ⇒ 解算途中先接上的图被清回 null | 解算层每接一张图**立刻 commit 进快照**（新增 `stage.commitTexture`） |
| **R1 过期加载** | 切模型快时，慢的那次 `loadModel` 晚到，把新模型的材质/快照/读数搅在一起 | 加载**代次** + `loadModel` 返回 `null` 时调用侧丢弃 + 解算后核 `currentUrl` |

取图本身也从 `TextureLoader`（`<img>` + `onerror`，失败报不出原因）换成 **`fetch` + `createImageBitmap` + 重试 3 次**
（HTTP 状态 / 解码失败 / 0×0 都能明确报错）；base / normal / mask 三张图走**同一条路**；base 与 normal
**并行取**；从 ImageBitmap 建纹理显式 `needsUpdate = true`（不标脏就永远不上传）。

**回归**：解算途中狂拖控件（强行复现 R2 的时机）→ **8/8 与规格（BC / N / M）逐项一致**，console 0 错误。

**口径提醒（避免再被误记成"欠账"）**：mask 的通道重排**不是欠账，是既定做法**（DEC-97 明确"后加载"）。
§19.1 里"13 个 GLB / 13/13 / 22 张贴图"等数字是 DEC-97 之前的快照，保留作历史；**当前口径以本节为准**。

---

## 20 第七轮（2026-10-14）

| # | 决策 | 依据 | 是否偏离 | 状态 |
|---|---|---|---|---|
| DEC-98 | **排版稿 C6「简介」的形态（左三维 + 右文字）落到产品 `Info` 任务页**，且三维区由**产品自持**（`web/src/viewer/` 自己的三维舞台 + 构建期资产发布链），**不内嵌** `docs/model-preview/`（那是审核用工具，DEC-96） | 负责人 2026-10-14 指示（"把昨天调整的 info 整合到正式的工程中……exe 运行时候 info 类型和昨天调整的页面一致"） | 否 | 生效 |
| DEC-99 | **原理页（`Principle`）的形态 = "视频 + 说明"；数据里只有一段视频时右栏的"视频列表"整块不出现**。讲解视频落 `content/assets/video/**`（**不上 Git**），走与三维资产同一套发布链，页面**只认产物里的 `_meta/index.json` 清单**；`.mp4` 的 MIME 与 `Range` 是服务端硬要求（dev 中间件 + 壳的静态服务器都实现） | 负责人 2026-10-14 指示（"当数据中只有一个视频的时候 列表应该要隐藏 这个样式也需要有"；"搬 不上github 放哪你自己定"；"肯定要放视频"） | 否 | 生效 |
| DEC-100 | **站点线（`.ui-route`）只画"数据里有的站"**：站点列表 = 当前项目**启用的任务**（`stores/content` 的 `enabledTypesOf()`），顺序 / 标签 / 技术栈仍来自契约；**一站都没有时整条不渲染**；站号改为本站点线内的顺序（1..n） | 负责人 2026-10-14 指示（"ui-route 这个元素的逻辑需要调整 在加载页面的时候 要看数据有多少 Task 有 task 的显示 没有 task 的则不显示"） | 否 | 生效 |
| DEC-101 | **登录页接进产品主流程 `start → login → menu`**；本期**只提供游客入口**（无后端、无登录校验 ⇒ **不摆账号 / 密码 / 身份表单**）；游客进入**不写身份字段**（保持 `unknown`）；目录页新增「退出」回登录页，且**不清本机存档** | 负责人 2026-10-14 指示（"把 login 接到产品线里面 按照 start login menu 顺序进行"；"我们现在没有登录判断 那么我们只允许游客形式登录即可"；"菜单页加一个退出入口，回到登录页"） | 否 | 生效 |

### DEC-98 Info 页的三维区与资产发布链

**背景**：§19.6 把排版稿 C6 的三维区换成了 `<iframe src="../../model-preview/index.html?embed=1&…">` —— 那是**排版稿层面的复用**。
它**不能**进产品：`docs/model-preview/` 是"从仓库根直读磁盘、不起构建"的审核工具（DEC-96），
而产品的产物里既没有排版稿、也没有 `content/assets/**`（P1-5 当时未实现）。
于是"排版稿已经长得像成品、产品还是纯图文骨架"——本次把这个差补上。

**决定（四条）**：

1. **页面形态**：`Info`（`TaskType.Info`）在产品里的骨架从"纯图文（article）"改为**「左三维 + 右图文」**：
   左 = 三维视口（`flex:1`），右 = 380px 的「简介」栏（正文 + 徽标）——与排版稿 C6 同构；
   右栏宽度复用 `product.css` 的 `.app-split`（`minmax(0,1fr) minmax(320px,380px)`，其注释本来就写着"对应排版稿里 purpose/info 的 380px 右栏"）。
2. **三维区自持实现**：新增产品侧 `web/src/viewer/ModelStage.ts`（不 import `docs/` 下任何代码）。
   表现与排版稿**逐项对齐**：影棚 HDR（`content/assets/three/env/StudioWhiteUmbrella.exr`）当 **IBL 且无灯**、
   **无色调映射**、曝光 1、**画布透明**（底色交给 `.ui-panel` 的毛玻璃，深浅主题自动跟随）、右键不平移。
3. **资产发布链（= 原 P1-5）**：构建期把 `content/assets/three/**` 发到 `/assets/three/**`，
   三张元数据表（`asset-material-spec.json` / `asset-material-textures.json` / `asset-convert-report.json`）发到 `/assets/three/_meta/`。
   实现方式：`vite.config.ts` 里一个插件 —— **dev 走中间件**（直接从 `content/assets/three` 读盘）、**build 走拷贝**；
   这样 `npm run dev` / `npm run smoke` / `npm run build` **同一套 URL**，且 `content/assets/**` 仍然不进 git（DEC-57）、`web/public/` 不被生成物污染。
4. **材质**：沿用 DEC-97 —— GLB 只出网格与材质，base / normal / mask 三张贴图**渲染期后加载**，
   mask 按 HDRP 通道重排为 glTF ORM（区间烘进像素），表面模式 / 双面 / 法线强度按**规格**对齐。

**两条副决定（都是"与排版稿一致"的直接推论）**：

- **`Info` 页不再有"完成并前往"按钮**（排版稿 C6 里没有这个控件）：导航由站点线承担。
  这与 DEC-40 相容 —— 它明确"`None` / `Info` 这类无交互的可以只有进入，不必有完成事件"。
- **徽标只写数据里真有的**：排版稿上的"预计 45 分钟 / 中职·高职"是设计示意，
  采纳数据里**没有**这两个字段 ⇒ 产品只显示真实可得的（本站任务数、技术栈），**不编造**（同 `adopted-content` 的既有纪律）。

**未闭合（不要当成已解决）**：

| # | 事项 | 现状 |
|---|---|---|
| a | **材质解算在产品与审核页各有一份** | 审核页是无构建的静态页（`.mjs`、服务根＝仓库根），产品是打包的 TS；两者**无法共用同一份源码**而不把审核工具拖进产品构建链（DEC-96 禁止）。本次是"产品自带一份、行为对齐"，**不是**共享实现 —— 是否统一（例如把解算抽成两边都能吃的纯 JS 模块）留待后续拍板 |
| b | **包体因此增大** | 影棚 HDR 一张 **5.9 MB**（`StudioWhiteUmbrella.exr`）+ 8 个 GLB 7.3 MB + 30 张贴图；包体预算门禁（DEC-02）尚未落地，接入后需一并核算（DEC-99 又加了 65.9 MB 视频，见 `TODO.md` D-10） |
| c | 其余 C 组页面（C2/C3/C7）仍是旧骨架 | 本次只做 `Info`（被要求的那一页）；`C4 原理` 已在 **DEC-99** 落地 |

---

### DEC-99 原理页（视频 + 说明）与视频资产发布链

**背景**：承接 DEC-98 的同一批工作 —— `Info` 做完后做 `Principle`（排版稿 C4）。三条事实都是**逐条从数据与来源工程读出来的**，不是设计想象：

1. 采纳数据里 8 个器件项目**各只有 1 条 `principleStructs`**：1 段视频 + 1 段说明（50~91 字，中英双语）；
   数据里**既没有"多段"、也没有时长字段** —— 排版稿 C4 原来画的"3 段播放列表 + 03:24 + 已看完"是设计示意，不是数据；
2. 数据里的 `videoName`（`01jcq_yl` … `08zhkg_yl`）与来源工程的视频文件**同名**，8 段合计 **65.9 MB**，最大一段 **30.57 MB**；
3. 单段 30.57 MB **远超 10 MB 门禁**（DEC-65）⇒ 结论与三维资产一致：**不能进 git**，走 DEC-57 的"不进 git 的大资产"那条链。

**决定（五条）**：

1. **页面形态**：左视频 + 右说明，与排版稿 C4 同构。播放用**原生** `<video controls playsinline preload="metadata">`，
   **不自绘控制条** —— 进度、音量、全屏、移动端手势都交给浏览器（自绘一套只会更难用，且微信里更容易坏）。
2. **单段视频 ⇒ 列表隐藏**：右栏的"视频列表"**只在多段视频时出现**（负责人明确）。
   规则落在 `web/src/domain/principle.ts` 的 `showsPlaylist`（**有单测**：采纳数据全是单段，"多段"那条分支没有真实数据会走到，只能靠单测保证没写反）；
   排版稿用 `.ui-videopage--single` 演示这一档，**样式成果页第八节两档并列**（`docs/ui-mockups` 的硬纪律：看不到的样式算未完成）。
3. **视频落点**：`content/assets/video/<videoName>.mp4`（与 `three/` 同级；`.gitignore` 的 `content/assets/**` 已覆盖，**不进 git**）。
   搬运用**独立脚本** `tools/pipeline/import-principle-videos.mjs` —— **不并进** `import-adopted-assets.mjs`：
   那条链服务两条线共用的资产（要带 `.meta`、要过 Blender、有"单图 ≥10 MB 剔除"规则），而视频只服务 Web 的 Three 侧、
   且最大一段就是 30 MB，**套用那条剔除规则会把视频全剔掉**。产出 `content/asset-video-report.json`（来源 / 目标 / 字节 / sha256）作为证据。
4. **发布链**：`vite.config.ts` 的资产插件从"只服务 `three` 一棵树"改成"**服务多棵树**"（`/assets/three/` + `/assets/video/`，dev 走中间件 / build 走拷贝）。
   视频额外发一份 `_meta/index.json`，**构建时按目录实际内容现算** —— 它就是"这次产物里到底有没有这段视频"的判据，
   页面据此显示"未包含"，**不打一个必然 404 的请求**（冒烟要求 console 零错误）。
5. **服务端**：`.mp4` 的 MIME（`video/mp4`）与 **`Range`（206）** 是硬要求 ——
   dev 中间件与**壳的静态服务器**（`electron/server.js`）都实现（没有 Range，Safari 直接拖不动进度条，Chrome 会退化成整段重下）；
   同时把**不带指纹**的资产树（`/assets/three/`、`/assets/video/`）从 `immutable` 改成 **`no-cache` + ETag/Last-Modified**：
   名字固定 ⇒ `immutable` 会让"换了资产的机器"一直吃旧文件；`no-cache` 配校验器则既不读旧文件、也不把 30 MB 每次重下一遍。

**实测（可复核）**：

| 项 | 结果 |
|---|---|
| 搬运 | 8 段 / **65.9 MB** / 0 缺失（`content/asset-video-report.json`） |
| dev（`npm run smoke`，真 Chromium） | `readyState=4` `1920x1080` `81s`；`sections=1` `playlist=false` `rows=0`；右栏只有"原理说明"（91 字来自数据）；**全程 console 0 错误** |
| 壳（`electron . --smoke`，服务的是 `web/dist` 打包产物） | 同一组读数通过 —— 证明 MIME 与 Range 在**打包形态**下也对（这一段是 `electron/main.js` 的第四段取证） |
| 构建 | `dist/assets/video/**` 9 个文件（8 段 + 清单）；发布清单新增 `content.video`（数量 + 字节）与 `serving.mime['.mp4']` |
| 单测 | `web/src/domain/principle.spec.ts` 6 项（含"单段 ⇒ 不出现列表""只有文字没有视频的段不占段号""真实数据里启用原理槽位的项目都有可播视频"） |

**未闭合（不要当成已解决）**：

| # | 事项 | 现状 |
|---|---|---|
| a | **包体因此增大** | 8 段视频 **65.9 MB**（最大一段 30.57 MB）；包体预算门禁（DEC-02）尚未落地，接入后需一并核算（`TODO.md` D-10） |
| b | **完成事件** | 原理页没有"标记完成"控件（与排版稿 C4、DEC-98 对 `Info` 的处理一致）⇒ `principle:done` **目前不会发**。要不要"看完即完成"（按 `<video>` 的 `ended` 发）待拍板（`TODO.md` T-08） |
| c | **多段视频那一档没有真实数据** | 规则与分支已实现且有单测，但采纳数据**全是单段** —— 真内容出现前，它靠单测保证，不靠人工点 |
| d | **视频未转码、兼容性未实测** | 直接采纳来源的 mp4（H.264/AAC），**没有转码**：微信内置浏览器能否播放尚未真机实测（`TODO.md` T-06） |

---

### DEC-100 站点线只画"数据里有的站"

**背景**：站点线（`web/src/components/RouteBar.vue`）此前把**契约里的 11 个 `TaskType`** 逐个画成一站，与"这个项目到底有没有这一站"无关。
而同一页的"本节任务数 / 下一站 / 完成并前往"、菜单页的"X 站"都是按**本项目启用的任务**算的 —— 于是只启用 4 个槽位的器件项目里，
站点线画出 7 个点不进去的站（点进去只有"本项目未启用"），右侧却写着"4 站"。**同一页两套口径**，这是本次要修的。

**决定（三条）**：

1. **站点 = 数据里启用的任务**：`RouteBar` 的站点列表改为 `stores/content` 的 `enabledTypesOf()`（即当前项目的 `tasks`）——
   槽位为 `null` / `taskActive:false` 的任务**不出现**。**顺序、标签、技术栈仍全部来自契约**（`TASK_TYPES` / `TASK_TYPE_LABELS` / `TASK_TYPE_STACK`）：
   契约管"这一站长什么样、排在谁前谁后"，内容管"这一站到底有没有"。
2. **一站都没有 ⇒ 整条不渲染**：`items` 为空时 `<nav>` 不渲染，而不是渲染一条空壳。空数组有两种来源：
   内容还没到位（`project` 为 `null`，含"目录级兜底也读不到"）与项目本身没有任务。
3. **站号是本站点线内的顺序（1..n）**，不是契约序号 —— 数据只启用一部分槽位，用契约序号会跳号（如 3 / 7 / 8 / 9）。

**不动的东西**：契约标签逐字不变；完成态（`stores/progress`）、技术栈标注、`locked` 半透明态、`--narrow` 窄屏变体都不变；
"能不能进"的判定仍不在本组件（属于任务页 / 权限，见 `design/01`）；**任务页徽标"已完成 X / 11"本次不动**（见未闭合 a）。

**未闭合（不要当成已解决）**：

| # | 事项 | 现状 |
|---|---|---|
| a | **进度分母三处不齐** | 任务页徽标按**全契约 11** 算（`stores/progress` 的 `total`）、菜单页按**全部项目的启用任务**算（今天 33）、站点线按**当前项目**算（4 或 1）。本次只按要求改站点线；徽标要不要跟着改待拍板（`TODO.md` T-09） |
| b | **"一站都没有 ⇒ 整条不渲染"没有真实数据走过** | 采纳数据里 9 个项目**都至少启用一个任务**（单测已钉住这条），所以这一档只能靠代码与单测保证；浏览器冒烟覆盖的是"4 站（器件）/ 1 站（小测验）"两档 |
| c | **首帧短暂没有站点线** | 内容是异步取的（SPA）：数据到位前 `enabledTypesOf()` 为空 ⇒ 站点线先不画、数据到了才出现。取舍是"不知道有几站时不画"优于"先画 11 站再收掉"；要消除闪动需引入"加载中"态，本次不做 |

---

### DEC-101 登录页进主流程：`start → login → menu`，且只提供游客入口

**背景**：登录页（排版稿 A2）此前**没有接线** —— `/login` 只是指到 `PlaceholderView` 的占位路由，
全仓库没有任何一处 `router.push({ name: 'login' })`，`StartView` 的「开始实验」直接进菜单。
于是"排版稿有 A2、产品流程里没有登录"两件事同时成立（**代码现状，此前没有对应决策**）。
负责人 2026-10-14 要求把它接进产品线。

**决定（四条）**：

1. **主流程 = `start → login → menu`**：`StartView` 的主按钮进登录页；登录页的入口进项目目录；
   **项目目录页新增「退出」**回登录页（这是本次唯一的"回到登录页"出口）。
   `SceneState.Login` 本来就由路由的 `meta.scene` 统一切换（`main.ts` 的守卫），本次**不需要动契约**。
2. **只提供游客入口**：本期**没有后端、也没有登录校验**（DEC-21 / DEC-04），
   所以**不摆账号 / 密码 / 身份下拉** —— 摆一套点不动的表单只会让人以为能登录。
   排版稿 A2 同步收敛成同一形态（右栏只剩主按钮 + 无后端说明）。
3. **游客不写身份字段**：`userType` 保持 `stores/progress` 的默认值 `unknown`（它就是"游客"），
   进入动作**只做页面流转**、不落任何字段 —— 多写一次就多一个真源（DEC-04「不拦游客」）。
4. **退出不清档**：目录页的「退出」只回登录页，本机进度存档（DEC-54）**保留**，
   再次以游客进入时进度还在；"清档"是另一件事（`progress.reset()`），不藏在退出按钮里。

**两条取舍（记录在案，便于以后复议）**：

- 排版稿 A2 左栏原标"Three.js · 三维展示区（设备旋转）"。产品本期**没有**可展示的模型，
  按"不假装有"的纪律（同 DEC-79 对付缺席 Unity 产物的做法）**撤掉视口提示**，左栏只作品牌展示区；
  等真有展示模型再补。
- 目录页的「退出」走的是原「页面右上按钮组」（`.app-topright`），但目录页**没有站点线**、
  `.app-chrome` 里没有东西撑高，绝对定位的按钮组会压到面板标题上 ⇒ 加了一个
  `.app-chrome--topright-only` 占位（值全部来自令牌）。这是**布局修缺**，不是新样式。

**未闭合（不要当成已解决）**：

| # | 事项 | 现状 |
|---|---|---|
| a | **A2 的账号 / 密码 / 身份表单本"不入产品"** | 本次决定是"本期不做"；将来接后端（DEC-24）时要不要恢复这套表单、恢复成什么样，届时再定 |
| b | **没有"已登录"状态** | 游客进入不落字段，因此**刷新后仍从 `start` 开始**（流程不跳过登录页）。要不要"记住上次以游客进入、直接跳菜单"未定 |

**实测（可复核）**：

| 项 | 结果 |
|---|---|
| 冒烟（真 Chromium，`web/tools/render-smoke.mjs`） | `#/task/8?project=clip_contactor` → **4 站**（`实验原理/简介/结构/检测`）；`#/task/10?project=clip_quiz` → **1 站**（`考核`）；顺序按契约、标签逐字来自契约、Unity/Three 标注齐全；**全程 console 0 错误** |
| 反例（改前） | 旧实现是 `TASK_TYPES.map(...)`、旧冒烟断言也是 `count === 11` —— 即同一条 URL 下画 **11 站**，其中 7 站点进去只有"本项目未启用" |
| 单测 | `adopted-content.spec.ts` 增 1 项：`enabledTaskTypesOf(null)` 为空（站点线据此整条不画）、有项目时按契约顺序给出启用任务；`npm test` **54 项**全过 |

