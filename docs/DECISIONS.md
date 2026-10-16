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


---

## 21 第八轮（2026-10-14）：结构任务（`Structure` = TaskType 8）的资产口径

> 背景：结构任务**只在 Unity 侧表现**（DEC-06），而 P1-4 那条资产链当初**明确剔除了它真正要用的三样东西**
> —— `.mat`、自制 ShaderGraph、`.anim`（`PLAN.md` P1-4「剔除」行 / `research/09` §5）。
> 原因是那条链服务的是"**两条线共用**的几何（FBX + PBR 贴图，要过 Blender 转 GLB）"，
> 而结构任务的载体是**预制体 = 零件装配 + 拆装动画 + 零件交互**，判据完全不同。
> 本轮（负责人 2026-10-14 逐条拍板）把结构任务的口径重新定死，并**先把资产搬进来**；
> "怎么实例化、怎么初始化"**不在本轮**（`TODO.md` 已登记）。

| ID | 决策 | 来源 | 偏离★ | 状态 |
|---|---|---|---|---|
| DEC-102 | 结构任务的资产**全部从来源工程搬入且不重做**（预制体照搬 / 旧版 `.anim` 直接搬 / 内置图元照搬 / 材质**接管** / 零件名留预制体 / 空壳照搬）；**P1-4b 作废** | 负责人 2026-10-14 逐条拍板 | 否 | 生效 |
| DEC-103 | **取代 DEC-87 的"不采用插件与自制 Shader"一句**：搬入 4 个 ShaderGraph + 1 个 SubGraph + HighlightPlus（只搬 Runtime / Pipelines / Editor）；后处理插件本期不搬；**零件名显示由 Web 侧做** | 同上 | 是（取代 DEC-87 一句） | 生效 |
| DEC-104 | 结构任务的**步骤承载 = 本工程既有的 `StepManager`**（`design/10`）；**不搬** `InstControlledManager`、**不整份搬** `StructureTaskObj` | 同上 | 否 | 生效（步骤数据落点未闭合） |
| DEC-105 | `structure:done` **只在全部步骤走完时发**；`masterAppliance` 无步骤数据 ⇒ **永远不发**（接受，非缺陷） | 同上 | 否 | 生效（是否带进度/分数未闭合） |
| DEC-106 | **HighlightPlus 的接入方式 = 给插件补 asmdef**：`Runtime` / `Pipelines/URP` / `Editor` 各一个程序集（`HighlightPlus.Runtime` / `.Pipelines` / `.Editor`），业务侧由 `WSU3.Core` 正向引用 `HighlightPlus.Runtime`；插件源码与目录位置不动 | 负责人 2026-10-14 选定 | 否 | 生效（闭合 DEC-103 未闭合项，原 `TODO.md` D-16） |

### DEC-102 结构任务的资产全部搬入、不重做（负责人定）

1. **结构件预制体照搬**：`Assets/Prefabs/Models/StructureObjs/*.prefab`（8 个）→ 同名同结构，
   不重做装配、不改层级、不改节点名（零件名与网格对应关系是业务数据）。
2. **旧版 `AnimationClip` 直接搬**：46 段 / 14.6 MB（`Assets/Animation/Model/Structure/*.anim`），
   **不做 Reanimated / Timeline 重建** —— `PLAN.md` P2-6d「结构拆装动画是否重建」由此**关闭**（答案是"用现成的"）。
3. **内置图元照搬**：`fuse` 的 `Cube` / `Cube (1..3)`、`breaker` 的 `Cylinder`、`jiexiankong`
   是 Unity 内置资源，跟着预制体走（"Unity 搬 Unity，没什么不能搬的"）。
4. **材质接管**：源器件材质（`Model/Element/Show/<器件>/Materials/*.mat`）**覆盖** Unity 从 FBX
   自动抽出的同名材质（那批是 `_BaseMap` 为空的 URP Lit 占位）。搬运**连 `.meta` 一起覆盖**，
   于是 GUID 变成源工程的 —— 源预制体里的材质引用因此逐条对得上。
   ⇒ **`PLAN.md` P1-4b「给自动抽出的 24 个材质接贴图」作废**（不再需要，源材质本身是对的）。
5. **零件名留在预制体上**：`structureName` / `structureNameEn` 随零件组件走（与来源工程一致），
   **不进**内容数据 JSON —— 它是"随模型预制体走的业务数据"，每套结构模型各不相同。
6. **空壳照搬**：`masterAppliance_structure_model` 在来源工程里只有 `root` + `Scale` + 一个整体 FBX 实例
   （无零件、无动画、无步骤），**照搬成空壳**，不做补内容（后果见 DEC-105）。
7. **落点与版本控制**：落点见 `design/03` §5.2；`Assets/Animation/`（Unity 专属、14.6 MB）走 **Plastic**、git 忽略，
   判据是"**两条线共用的资产进 git（如 `Assets/Sprites/Content`），Unity 专属的大块走 Plastic**"；
   预制体 / Shader / 插件（均为小体积且要能 diff 评审）**进 git**。

### DEC-103 取代 DEC-87 的一部分：搬入自制 ShaderGraph 与 HighlightPlus

**取代关系（只取代一句，其余继续生效）**：DEC-87 写死"**不采用**被采纳工程的第三方表现插件与自制 ShaderGraph
（材质改用 URP + 贴图通道映射，画面降级已确认可接受）"。结构任务的实际画面**依赖**这两样，故：

- **继续生效**：DEC-87 的"资源加载三条链路（AB 为主 / AA 管场景 / 内置 `Resources`）"、
  包登记表落 `Resources/Config`、包产物落 `Assets/StreamingAssets`。
- **被取代**：同条里"不采用第三方表现插件与自制 ShaderGraph"那句（仅就**结构任务所需的那部分**）。

**决定**：

| 项 | 决定 |
|---|---|
| 自制 Shader | 搬入 **4 个 ShaderGraph + 1 个 SubGraph**（`Assets/Shaders/Models/`，1.06 MB）—— 器件材质指向它们，缺则紫红 |
| 器件材质 | 搬入 **29 个器件材质 + 1 个公共 `Alpha.mat`**（见 DEC-102 §4） |
| HighlightPlus | 搬入插件（**只搬 `Runtime` / `Pipelines` / `Editor`**；`Demo` 与 `Documentation` 约 9.4 MB 不进产品） |
| 其它表现插件 | **本期不搬**（Beautify / ShinySSRR / SSAO / Decal —— 负责人："其他不影响可以先不管"） |
| 零件名显示 | **由 Web 侧做**（与 DEC-80「Unity 不做 UI」一致）；HighlightPlus 在本工程**只承担高亮表现** |

**未闭合（已有实测证据）**：HighlightPlus **没有 asmdef**，因为它在 `Assets/Plugins/**` 下，
Unity 把它编译进**预定义程序集** `Assembly-CSharp-firstpass`（实测：`HighlightPlus.*` 41 个类型都在那里）。
而本工程业务代码在 asmdef 程序集 `WSU3.Core` / `WSU3.Runtime` 里 ——
实测 `CompilationPipeline.GetAssemblies(Player)` 读回，这两者的 `assemblyReferences` 里**都没有**任何预定义程序集
⇒ **业务代码现在用不了 `HighlightPlus.*`**。
"业务代码怎么用上插件"（给插件补 asmdef / 把用到它的脚本放到无 asmdef 的目录 / 其它）
留到接入时定，`TODO.md` 已登记。

### DEC-104 结构任务的步骤承载 = `StepManager`

- **不搬 `InstControlledManager`**：它是来源工程的"简化版步骤运行器"（点击 + 播片 + 延时），
  与本工程既有的步骤系统（`design/10`：`StepManager → ProcessingHandler → StepHandler → ConditionBase`）**职责重叠**。
- **`StructureTaskObj` 不整份搬**：它的父类是 `MCV_Module.Objects.Interactives.InteractiveBase`，
  还依赖 HighlightPlus 门面；搬进来整个工程编译不过。它承载的字段
  （`structureName` / `structureNameEn` / `HoverOrTips`）由本工程 `InteractiveObjBase` 的派生类重新承载。
- **步骤数据落点未闭合**：源预制体上那张 `simpleSteps`（`clip` + `clickObj` + `delay` + `animSpeed`，
  每器件 4~12 条）是**唯一的步骤定义**，改用 `StepManager` 后它没地方待了。
  负责人会先给一个预制体结构，再定"挪到哪儿"（Unity 侧步骤节点 / 内容数据 JSON）。

### DEC-105 `structure:done` 的语义

- **全部步骤走完**才发 `structure:done`（与来源工程的"完成事件"语义一致）。
- `masterAppliance` 的结构件是空壳、**没有任何步骤数据** ⇒ 该站**永远不发 `structure:done`**。
  这是**接受的结果**，不是缺陷（负责人明示）。
- **未闭合**：带不带进度（如 5/7 步）/ 分数。`design/03` 规则 3 要求"完成事件必须有语义"，
  不许含糊，因此这一条要在接 `StepManager` 时一起定（`TODO.md` 已登记）。

### 21.1 本轮实测（可复核）

| 项 | 结果 / 证据 |
|---|---|
| 搬运脚本（可重跑、`--dry-run`） | `tools/pipeline/import-structure-assets.mjs` |
| 清单 | `content/asset-structure-report.json`（来源 / 目标 / 字节 / sha256 / 类别 / 本次状态） |
| 结构件预制体 | **8 个**（含 1 个空壳）· 0.54 MB |
| 拆装动画 | **46 段** · 14.62 MB |
| 器件材质 | **29 个 + 1 个公共 `Alpha.mat`**（接管自动抽出的同名材质） |
| 反射立方体贴图 | **`Chrome05.cubemap` 1 个 · 12.0 MB**（4 个 `*_Metal` 材质的**真实依赖**）—— 它是**非位图**，不受"单张位图 ≥10 MB 剔除"约束（那条规则的原意是"未压缩背景照片"）；套用会把金属件的反射静默弄坏，第一次跑就踩到了 |
| 自制 Shader | **4 个 ShaderGraph + 1 个 SubGraph** · 1.06 MB |
| 插件 | **HighlightPlus 86 文件** · 0.46 MB |
| 幂等 | 重跑一次：**0 个文件被写**，已在本工程的按 GUID 跳过 |
| 未搬（登记为待办） | 2 个脚本（`StructureTaskObj.cs` / `InstControlledManager.cs`）—— 见 DEC-104 |
| 纪律 | 来源工程**全程只读**（DEC-69）；不打开 Unity；不碰 git / Plastic |

**Unity 编辑器内实测**（导入完成后用 Unity MCP 逐个 `AssetDatabase` 读回，2026-10-14）：

| 器件 | 网格件 | 渲染器 | 空网格 | 空材质 | Animation 片段 | 实测着色器 |
|---|---|---|---|---|---|---|
| contactor | 11 | 11 | 0 | 0 | 12 | `Shader Graphs/HDRPtoURPCustomDirtLitShader` |
| thermalRelay | 44 | 44 | 0 | 0 | 7 | 同上 |
| timeRelay | 6 | 6 | 0 | 0 | 5 | 同上 |
| masterAppliance（空壳） | 2 | 2 | 0 | 0 | 0 | 同上 |
| fuse | 10 | 10 | 0 | 0 | 4 | Dirt + Unlit + CubeSpecular |
| breaker | 61 | 61 | 0 | 0 | 5 | Dirt + URP Lit + Unlit |
| speedRelay | 41 | 41 | 0 | 0 | 7 | Dirt + ClearCoated + CubeSpecular |
| combinationSwitch | 21 | 21 | 0 | 0 | 6 | Dirt + CubeSpecular |

- **合计 0 空网格 / 0 空材质** ⇒ 两条关键假设都成立：① 源预制体里按 `fileID + FBX guid` 引用的子网格，
  在"FBX 连同 `.meta` 一起搬"之后**仍然解析得到**（逐字命中，没有变成空网格）；② 材质接管后着色器是**自制 ShaderGraph 而非紫红**。
- 抽查动画可读：`contactor_structure_model_0 = 5s`、`_11 = 3s`、`fuse_structure_model_3 = 1s`、`breaker_structure_model_4 = 2s`。
- `timeRelay` / `masterAppliance` 这两个的零件是**嵌套 FBX 预制体实例**，材质走的是 FBX 自己的绑定；
  换掉同名材质后 FBX 的绑定指向已消失的旧 GUID ⇒ 第一次读回是**空材质**。**已对该两个 FBX 做 `ImportAsset(ForceUpdate)` 重导**，
  重导后空材质归零（Unity 会各留一条 `FBXImporter generated inconsistent result` 警告，是"这次导入结果与上次不同"的提示，不是错误）。
- HighlightPlus 已编译：`Assembly-CSharp-firstpass` 里 `HighlightPlus.*` 类型 **41 个**、Editor 侧 6 个，
  URP 的 `HighlightPlusRenderPassFeature.cs` 也在位。
- **后续（DEC-106）**：上一条的落点**已改变** —— 这些类型不再住在预定义程序集里，见下。

### DEC-106 HighlightPlus 的接入方式：给插件补 asmdef

**背景（DEC-103 的未闭合项）**：插件搬入时**没有 asmdef**，又落在 `Assets/Plugins/**` 下，
Unity 于是把它编进**预定义程序集** `Assembly-CSharp-firstpass`；而本工程业务代码都在 asmdef 程序集里，
**asmdef 一律不引用预定义程序集** ⇒ 业务代码里写 `HighlightEffect` 必定 `CS0246`（无解的是引用关系，不是 `using`）。

**决定**：给插件补 asmdef，业务程序集**正向**引用它（插件源码与目录位置都不动）：

| 程序集 | 目录 | 引用 |
|---|---|---|
| `HighlightPlus.Runtime` | `Assets/Plugins/HighlightPlus/Runtime/` | `UnityEngine.UI`（`HighlightTrigger` / `HighlightManager` 要判 `GraphicRaycaster`） |
| `HighlightPlus.Pipelines` | `Assets/Plugins/HighlightPlus/Pipelines/URP/` | `HighlightPlus.Runtime` + `Unity.RenderPipelines.{Core,Universal}.Runtime` |
| `HighlightPlus.Editor` | `Assets/Plugins/HighlightPlus/Editor/` | `HighlightPlus.Runtime` + `HighlightPlus.Pipelines` + 同上两个 URP 程序集（`includePlatforms = ["Editor"]`） |

- **业务侧**：`WSU3.Core` 的 `references` 加 `HighlightPlus.Runtime`；`WSU3.Runtime` **未加**（目前只有高亮钩子要用它）。
- **高亮的落点不变**：`InteractiveObjBase` 只留 `SetHighlight(bool)` 状态与 `OnHighlightChanged` 钩子，
  **表现由派生类自己写**（与该文件自己的注释一致）；本工程**不引入"门面服务"**（DEC-104 已明确不整份搬 `StructureTaskObj`）。
- **未闭合（将来才需要）**：`HighlightPlus.Runtime` 未引用 `Unity.InputSystem` ——
  插件里 `InputProxy.cs` 有 `#if ENABLE_INPUT_SYSTEM` 分支，将来启用 Input System 包时需给这个程序集补引用。
- **未定项照旧**：URP RendererFeature 要不要挂进 URP 资产仍待定（`TODO.md` D-18）——
  "插件能被业务程序集引用"**不等于**高亮现在就能画出描边。

**实测（2026-10-14，Unity 2022.3.53f1c1 编辑器内反射读回）**：
`CompilationPipeline.GetAssemblies(Editor)` 得到 `WSU3.Core => WSU3.Contracts, UnityEngine.UI, HighlightPlus.Runtime`；
`HighlightPlus.HighlightEffect` 解析到程序集 **`HighlightPlus.Runtime`**、`Assembly-CSharp-firstpass` 里**已不再有**它；
`HighlightPlus.HighlightPlusRenderPassFeature` 落在 `HighlightPlus.Pipelines`；
`InteractiveObjBase` 的 `highlightEffect` 字段类型 = `HighlightPlus.HighlightEffect @ HighlightPlus.Runtime`；编译后 console **0 error**。

---

## 22 第九轮（2026-10-14）：底层操控层的移植（DEC-107）

> 背景：负责人要求把参照工程 `Assets/Scripts/InputController/` 那套**底层操控层**（第一人称 / 第三人称 / 聚焦环绕 / 相机背景）
> **连相关预制体一起**搬到本工程。这套代码原本住在参照工程的单一程序集里、强依赖它的 `Global*Mgr` 管理器骨架与自带日志门面，
> 照搬会**同时触犯** R-1 与 DEC-69 的两条禁令（照搬目录布局、照搬 `Global*Mgr` 骨架）。
> 负责人按既有边界选了**移植**：算法保留，目录与命名落到本工程。

| ID | 决策 | 来源 | 偏离★ | 状态 |
|---|---|---|---|---|
| DEC-107 | 底层操控层**按 DEC-69 的边界移植**（不照搬来源的目录布局与 `Global*Mgr` 骨架）：代码落 `Assets/Scripts/Core/Controllers/`（程序集 `WSU3.Core`、命名空间 `WSU3.Core.Controllers`）；控制器登记改**基类静态注册表**、相机取用走 `GlobalManager.MainCamera`、逐帧接 `InputGate`；**新增 `com.unity.inputsystem` 1.11.2 与 `com.unity.cinemachine` 2.10.7**，并把 `activeInputHandler` 改 **Both**（旧版 Input 的拾取继续可用） | 负责人 2026-10-14 逐条选定（形态 / 依赖包 / 范围） | 是（**翻 Q-G1 的"暂不新增包"**） | 生效（接入与验收未闭合，见 `TODO.md`） |

### DEC-107 落地要点

- **搬什么**：操控层 7 个 `.cs` + 输入资产（`.inputactions`）+ 两个预制体（角色 / 相机 rig）
  + 它们的 **GUID 依赖闭包**（背景板材质与自制 ShaderGraph）+ 参照工程的 14 份行为规格 `.md`（原文照录进 `docs/research/10-input-controller-specs/`）。
- **不搬**：参照工程的管理器 / 工具 / 事件骨架与目录布局（`GlobalInputMgr` / `GlobalCameraMgr` / `GlobalAssetsMgr` / 日志门面）。
  这些职责改由本工程**既有**组件承担：相机 → `GlobalManager.MainCamera`；控制器登记 → 基类静态注册表；逐帧闸门 → `InputGate`（DEC-84）。
- **⚠️ 命名空间必须避让 `Input`**：首版落成 `WSU3.Core.Input`，编译立刻把整个 `WSU3.*` 下裸 `Input.GetMouseButton*`（旧版 Input）
  解析成"命名空间"，`InteractiveManager` 等文件整片打红 —— **命名空间优先于 `using` 导入的类型**。
  故定名 **`WSU3.Core.Controllers`**、目录 `Core/Controllers/`，原因写进 `design/11`。
- **不覆盖同名资产**：本工程首批脚手架已有 `Assets/Resources/MainCamera.prefab`（精简相机，`96a03e8` 入库），
  而参照工程那台是**带 `CinemachineBrain` 与背景板的 rig** ⇒ rig 落 `Assets/Prefabs/Camera/MainCameraRig.prefab`。
  "要不要把它换成本工程的主相机"（换掉才能用缩放与视角控制）**登记在 `TODO.md`，不由搬运脚本替人决定**。
- **纪律**：搬运与移植各有**可重跑**脚本（`tools/pipeline/import-input-controller.mjs`、`port-input-controller.mjs`），
  参照工程全程只读；清单落 `content/asset-input-controller-report.json`；`design/11` 记本层规格与未闭合项。

**实测（2026-10-14，Unity 2022.3.53f1c1 编辑器内）**：`com.unity.cinemachine@2.10.7` 与 `com.unity.inputsystem@1.11.2` 解析到位；
全项目重编译 **console 0 error**；`WSU3.Core.asmdef` 引用读回 = `WSU3.Contracts, UnityEngine.UI, HighlightPlus.Runtime, Cinemachine, Unity.InputSystem`；
5 个移植类型在 `WSU3.Core` 里解析得到；**三个预制体缺失脚本 0**（角色 6 节点 / 7 个 MonoBehaviour、相机 rig 2 节点 / 3 个、`Resources/MainCamera` 1 节点 / 1 个）；
相机 rig 的背景板材质与 `Shader Graphs/CamBgUnlitShader` 都解析到位；输入资产 `StarterAssets`（1 张动作表）被 `PlayerInput` 正常引用。
**已知继承缺陷**：角色预制体 `Capsule` 的材质引用在**参照工程里就是断的**（清单 `unresolved`），搬过来仍是空材质。
**未做**：任何实机验收（没进场景、没接线 ⇒ 跑不了），见 `TODO.md`。

---

## 23 第十轮（2026-10-14）：资源包与 AB 打包流水线（DEC-108 ~ DEC-110）

> 背景：负责人要求 ① **完善 `AddressableManager`**（此前是 23 行的空桩：`Init` 里一个 TODO、`OnDespose` 空），
> ② 把 **AB 打包流水线移植进来**并要求**一键打包**，③ 明确"**可以参考既有同类工程的脚本，不要全部凭空空写**"。
> 负责人逐条选定：**一键 = Unity 菜单里一个按钮（只打 AB 包）**；**三条链路（AB / AA / 内置）都实装**；
> **并把 `TaskFlowManager` 的装/卸包与结构件实例化一起接上**。

| ID | 决策 | 来源 | 偏离★ | 状态 |
|---|---|---|---|---|
| DEC-108 | **AB 打包入口 = Unity 菜单一个按钮**（`WSU3/Pack/一键打 AB 包（全部）`）：收集 → 校验 → 写包配置 → 同步包登记表 → **一次 `BuildAssetBundles` 建出全部包** → 出报告；产物落 `Assets/StreamingAssets/{包名首段}/`（DEC-87 原定），**不进版本库**（`ignore.conf` 已加规则） | 负责人 2026-10-14 指示 | 否 | **生效**（已跑通） |
| DEC-109 | **内容包 Provider 本期只登记"结构件模型"一类**；全局包抽象（`IGlobalBundleProvider`）就位但**登记表留空**（不产出空包）。理由：简介 / 检测的预制体目录本工程还没有，登记它们会让"找不到预制体"变成阻塞构建的 Error；UI / 字体包因"Unity 侧不做界面"（DEC-80）不存在，相机背景包因取图入口未接（D-20）不存在 | **由 AI 定**（可推翻） | 否 | 生效 |
| DEC-110 | **结构件实例的挂载根** = 场景里已有同名节点 `StructureRoot` 就用它、没有则运行期在管理器节点下建一个（工具不替人改场景文件）；**结构任务的步骤驱动**按"预制体自带 `StepManager` 子树"实现，没有子树时**只实例化、不假装跑流程**；顺带纠正 `TaskManagerBase.Instance` 的 `new MonoBehaviour` 老写法（改为解析场景实例） | **由 AI 定**（挂载根待负责人确认，见 `TODO.md` §1） | 否 | 生效 |

### DEC-108 落地要点

**照搬的部分**（既有同类工程的做法经验证有效，直接沿用）：包登记表形状（`PackageConfigSO` 抽象基类 +
`ABPackageConfigSO` / `AAPackageConfigSO` / `DefaultPackageConfigSO` 三子类，**各自独占同名文件**，否则 `CreateAsset`
出来的资产 `m_Script` 是 `{fileID: 0}`）、命名规则唯一来源 `ContentNaming`、编辑器内核
（`EditorPaths` / `EditorAssetUtil` / `BundleBuilder` / `PackageConfigWriter` / `PackageDatabaseSync`）、
`PackageDatabaseSO.AutoCollect` 按"基类 + 各子类"各搜一遍（类型过滤器**收不到抽象基类的派生资源**）、
以及三条铁律（一次构建 / Temp 中转只拷本体 / 按目录各自清残留）。

**两处有意改动**（不是照抄，理由写在此处）：

1. 既有实现把"内容包"与"全局包"**拆成两条各带构建步骤的流水线**；本工程把"收集 / 校验 / 写配置 / 同步登记表"
   收成一个 planner、**一次性把全部包交给同一次 `BuildAssetBundles`**。
   理由：Unity 的"同一资产被显式分配后不再复制"**只在同一次调用内成立**（既有实现的注释里就有这条实测），
   一次建全比"靠依赖声明把两个包凑进同一批"更稳 —— 而那正是"一键"的字面含义。
2. 因此既有实现里 `IGlobalBundleProvider.BuildWith`（声明"必须与本包同批构建"的依赖表）在本工程**被上一条整体取代**，
   没有这个成员；顺带也去掉了 `CleanStaleConfigs` / `AbortOnFirstAssetProblem` 两条 per-provider 策略
   （它们服务的是某个包的历史语义，本工程没有这条包袱）。

**实测（2026-10-14，Unity 2022.3.53f1c1，`activeBuildTarget = WebGL`）**：

| 项 | 读数 |
|---|---|
| 对账 | **8 个包 / 8 项资源 / Error 0 / Warning 0** |
| 包登记表 | `Assets/Resources/Config/PackageDB_Master.asset` 建成，**8 条** |
| 包配置 | `Assets/Resources/Config/ContentPackages/AB_*.asset` **8 个** |
| 构建 | **8 个 bundle / 47,476,797 字节（45.3 MB）**，`missing 0` / `removed 0` | 
| 逐包 | contactor 4.20 MB · thermalRelay 3.26 · timeRelay 7.62 · masterAppliance 4.38 · fuse 4.27 · breaker 6.73 · speedRelay 10.13 · combinationSwitch 6.90 |
| 产物 | `Assets/StreamingAssets/Content/clip_<器件小写>`，**无扩展名、无 `.manifest`**（Temp 中转生效） |
| 报告 | `Builds/assetbundles/ab-build-report.json`（不进版本库） |
| 运行期读回 | `Resources.Load<PackageDatabaseSO>("Config/PackageDB_Master")` **非空 / 8 条**；`AddressableManager.IsInit=True`、`ConfigCount=8`、`HasClip("clip_contactor")=True`、`HasClip("clip_nope")=False`；`GetBundleUrl("Content/clip_contactor")` = `file:///…/Assets/StreamingAssets/Content/clip_contactor`（编辑器口径；WebGL 下不带 `file://`） |
| 编译 | 全项目重编译 **console 0 error**；`WSU3.Core` 新增引用 `Unity.Addressables` / `Unity.ResourceManager`，`WSU3.Editor` 另加 `Unity.Addressables.Editor` |

**包名与既有清单逐条一致**：8 个 `bundleName` 与 `content/asset-structure-report.json` 的 `entries[].bundleName` **完全相同**
（`Content/clip_contactor` … `Content/clip_combinationswitch`），包配置 id 与内容数据里的 `prefabKey` 也逐字符一致
（`contactor_structure_model` …）—— 也就是说 `TODO.md` D-17 里"包配置的 assetPath 已对得上"这条承诺兑现了。

### DEC-109 落地要点

- 登记点唯一：`BundlePipeline.ContentProviders`（内容包）与 `BundlePipeline.GlobalProviders`（全局包）。
  **新增一类内容 = 加一个 `IContentProvider` 实现 + 登记一行**，不需要改流程。
- 内容数据的读取**不走运行期模型**：`ProjectData.json` 的键是 `taskStructureData` / `taskActive`，
  而运行期模型的字段名是 `structure` / `isActive` —— 两者**不同名**，`JsonUtility` 按字段名对位，
  直接反序列化只会得到一堆空字段（表现是"对账通过、一个包都没收集到"这种最难查的沉默故障）。
  故编辑器侧另立 `ProjectDataDto`（只声明流水线要用的键，与 JSON 逐字对齐）。
- 全局包抽象就位但为空表：**不产出空包**，且空表是如实状态（理由见上表）。

### DEC-110 落地要点

- **挂载根两级口径**：`DataStructMapping.GetStructureRoot()` —— 场景里有 `StructureRoot` 就用它（位置 / 父级由负责人摆），
  没有就运行期在管理器节点下建一个。为什么不由工具往场景里塞节点：`1_Content` 由负责人在编辑器里装配，
  工具替人改场景会让"场景长什么样"出现两个作者；运行期建节点是幂等、可回退的。
- **`TaskManagerBase.Instance` 的老写法是错的**：原实现 `instance = new StructureTaskManager()` ——
  Unity **不允许** `new` 一个 MonoBehaviour（只能用 `AddComponent`），那种实例没有 `transform`/`gameObject`、
  `Awake`/`OnDestroy` 也不跑，而场景里真正挂着的那个节点永远收不到指令。
  实测代价：把 `TaskManagerBase` 改成非 MonoBehaviour 的那一刻，编辑器立刻报
  `'StructureTaskManager' is missing the class attribute 'ExtensionOfNativeClass'` +
  `GameObject (named 'StructureTaskManager') references runtime script in scene file. Fixing!`
  —— 这由 `1_Content.unity` 里那个**真实存在**的 `StructureTaskManager` 节点触发。
  改回 MonoBehaviour + `Instance` **解析场景实例**（`FindObjectsByType`，`Include` 非激活）后，
  该节点与组件读回完好（`componentTypes = [Transform, StructureTaskManager]`），`1_Content` 未被改动。
- **装载顺序**：`scene:exit` 与"切任务"时**先销毁实例、再卸包** —— 反过来会让存活实例的材质引用到已释放资源（变粉），
  这正是 DEC-87 纪律②。
- **两条失败口径分开**：装包失败 → `9002`（`fatal=true`，**不发** `scene:ready`，界面不能以为可交互）；
  登记表里没有该 clip 的包 → `9001`（`fatal=false`，仍走到 `scene:ready`，保留原联调口径）。

### AA（Addressables）这条链路的落地

- 运行期实装：`AddressableManager` 的 `LoadFromAA` 走 `Addressables.LoadAssetAsync` 并**留住 handle**
  （只把 `Result` 塞进缓存、丢掉 handle 的话，卸载时那份资源永远释放不掉）；场景走
  `Addressables.LoadSceneAsync` / `UnloadSceneAsync` 并把场景 handle 单独留一份。
- 编辑器工具：`WSU3/Pack/Addressables/`（初始化设置与默认分组 / 同步场景分组 / 构建 AA 内容 / 清理场景分组）。
- **已初始化**：`Assets/AddressableAssetsData/AddressableAssetSettings.asset`（**2 个默认分组**）+ `AssetGroups/` 5 个资产，`console 0 error`。
- **内容位置**（`design/06` §3③ 的最大坑）的结论是**默认 profile 就已经对**：
  `Local.LoadPath` 解析到 `StreamingAssets/aa/[BuildTarget]` ⇒ 内容随玩家包一起走，
  不需要手工改 profile，也不需要 `unity-stage.mjs --extra`。但这条是**读数不是假设** ——
  工具会把当前生效的 profile 路径打到 Console。
- 本期的 AA 资源是 **0 条**（漫游场景未做，`PLAN.md` P2-6c），场景分组是**明确的空操作**（弹窗说明原因）。



## 24 第十一轮（2026-10-14）：结构任务的步骤落点（DEC-111）

> 背景：DEC-104 把结构任务的步骤承载定为 `StepManager`，但**步骤数据放哪**留成了未闭合项
> （`TODO.md` D-14：Unity 侧步骤节点 / 内容数据 JSON 二选一）。负责人 2026-10-14 在
> `breaker_structure_model.prefab` 里手工搭出 `StepManager → 0(ProcessingHandler) → 0(StepHandler)`
> 骨架，并给出结论：**"我们直接用全量的 `StepManager`"**。

| ID | 决策 | 来源 | 偏离★ | 状态 |
|---|---|---|---|---|
| DEC-111 | **结构任务的步骤数据落点 = Unity 侧步骤节点**：结构件预制体自带**全量** `StepManager → ProcessingHandler → StepHandler` 子树（步骤与条件都住在预制体里），**不走内容数据 JSON**。`StructureTaskManager` 早有对应实现（DEC-110：`GetComponentInChildren<StepManager>()` → `StartExecution()`；没有子树时只实例化并说明原因）⇒ 这条决策**不需要改运行期代码** | 负责人 2026-10-14 指示（原话"我们直接用全量的 StepManager"） | 否 | **生效** |

### DEC-111 落地要点

- **层级形状是硬约束，不是风格问题**（`design/10` §1）：`StepManager` 只看**直接子** `ProcessingHandler`，
  `ProcessingHandler` 只看**直接子** `StepHandler`。手工搭出的骨架（`StepManager/0/0`）正好是这个形状；
  将来若写生成器，产出也必须是这个形状。
- **一条步骤 = "点第 N 个零件 → 播第 N 段"**：来源预制体 `simpleSteps` 的条数**与拆装动画段数逐器件相等**
  （breaker 5 / combinationSwitch 6 / contactor 12 / fuse 4 / speedRelay 7 / thermalRelay 7 / timeRelay 5 = **46**；
  `masterAppliance` 0 条 —— 空壳，见 DEC-105）。`simpleSteps[i].clip` 与该预制体 `Scale` 上
  `Animation.m_Animations` **同序同 guid**（实测 breaker 5/5 命中）。
- **`clickObj` 可以直接当 `ConditionClick.target`**：它在来源工程里是**挂零件脚本的 MonoBehaviour 的 fileID**
  （不是 GameObject），而预制体搬运时 fileID **逐字保留** ⇒ 本工程同一个 fileID 就是那个零件的
  `InteractiveObjBase`（`StructureObj`，DEC-104 的重新承载）。实测 breaker 的 4 个非零 `clickObj` 已逐个对上
  （Cylinder / CircuitBreaker01 / CircuitBreaker13 / CircuitBreaker16，4 处都已挂 `StructureObj`）；
  `clickObj: {fileID: 0}` 的那条 = 无交互 ⇒ 映射成 `ConditionDefault`。
- **`delay` / `animSpeed` 无需另立数据**：7 个器件两者全为 0；只有 `contactor` 用 `delay: 0.5` 与 `animSpeed: 1`
  —— 前者正是 `StepManager.stepDelaySeconds`（默认 `0.5f`），后者就是默认播放速度。
- **`masterAppliance` 不产子树**（0 步）：与 DEC-105"该站永远不发 `structure:done`"一致，是接受的结果。
- **未闭合**：这 46 步由**脚本从只读来源工程生成**、还是**在编辑器里手工搭**；
  以及 `ifHideOnFinish`（动画播完是否隐藏该物体）与 `activeObjects` / `inactiveObjects`（显隐表）
  在来源的 `simpleSteps` 里**没有对应字段**，取值要负责人定（当前骨架留的是类默认值）。

### DEC-111 补记（2026-10-14）：46 步由脚本生成，两个未闭合项已定

- **"脚本生成还是手工搭" → 脚本生成**：新增 `Assets/Editor/Steps/StructureStepGenerator.cs`
  （菜单 `WSU3/Steps/生成结构任务步骤（选来源工程…）` / `（沿用上次来源工程）`；
  批处理 `-executeMethod WSU3.Editor.StructureStepGenerator.GenerateFromBatch -structureSource <来源工程根目录>`）。
  8 个器件一次跑完且**幂等**（第 4 次跑 0 变更）。证据：`docs/RECORD.md` 1.39、`content/asset-structure-steps-report.json`。
- **`ifHideOnFinish` / 显隐表 → 都用类默认**（负责人 2026-10-14 定）：`ifHideOnFinish = false`、两张表留空，
  收场交给 `ConditionClick.toggleTargetActive`（Prepare 藏 / Waiting 显 / Complete 再藏）。
  要逐器件调就在 Inspector 里改 —— 生成器**只补空**，不覆盖手工值。
- **两条"找不到目标"的坑（都已修，记在这里免得再踩）**：
  ① `Transform.Find` 要的是**相对**预制体根的路径，而按 fileID 算出来的路径是**从根开始**的（含根名）⇒ 必须先剥根名；
  ② 嵌套 FBX 实例里的零件在外层 YAML 里是 `stripped` 块（没有名字、没有 Transform），路径算不出来 ⇒
  改按"**源资产 guid + 该资产里的 fileID**"当身份：stripped GameObject 的 fileID 在两个工程里**保留**，
  先在本工程 YAML 里把 stripped id 翻成身份，再在内容里按身份匹配。
  ⚠️ 取 id 只能用**源资产物体**（`GetCorrespondingObjectFromSource` 的返回值，实测 7/7 命中）；
  对**预制体内容里的物体**调 `TryGetGUIDAndLocalFileIdentifier` 实测 16/16 失败，别走那条路。
- **预制体已变 ⇒ 结构件 AB 包要重打一次**（`WSU3/Pack/一键打 AB 包（全部）`），已登记 `TODO.md` D-23。

---

## 25 第十二轮（2026-10-14）：Web ⇄ Unity 全量交互与免 Web 自测（DEC-112 ~ DEC-114）

> 背景（负责人 2026-10-14 给的**范围**，逐字转述）：
> "① webgl 做一个测试环境 —— 因为现在 webgl 的环境是通过 web 发消息才能启动，我们在 setup 里面增加一个
> 测试开关，可以指定启动的 tasktype + projectclip；② 搞定全量的 web + unity 交互要跑通。你把 web 服务
> 拉起来我会手动测试。"
> 资产口径（同一轮）："先跑通结构这个 tasktype，其他可以先做省缺（缺省）处理"；大资产**暂不补**。
>
> 动手前的实测（决定了 DEC-112 的必要性）：Web 侧**一条桥消息都没接** ——
> `web/src` 里只有 `bridge.isReady()` 的轮询，`app:init` / `scene:enter` / `scene:exit` 从没发过，
> `assets:ready` / `scene:ready` / `step:changed` / `task:completed` / `object:picked` / `ui:request`
> 一条都没处理。**"Unity 那边在跑、页面这边什么都不显示"就是这一条造成的**，不是 Unity 侧的问题。

| ID | 决策 | 来源 | 偏离★ | 状态 |
|---|---|---|---|---|
| DEC-112 | **Web 侧的接线收进一个会话对象**（`UnitySession`），视图不再自己 `bridge.on(...)`：`app:init` 在握手后发一次；`scene:enter` **幂等**且允许"握手前先记意图、握手后补发"；`input:enable` **握手前只记状态、不发消息**；步骤面板的**回执纪律**（一个请求只回一条、弹不出来回 `unavailable`）收进 `StepPanelQueue` | 负责人 2026-10-14（"搞定全量的 web + unity 交互要跑通"） | 否 | **生效** |
| DEC-113 | **`0_Setup` 上的免 Web 自测开关**（`StartupTestSwitch`）：默认**关**；打开时在"管理器自检通过 + 活动场景已是 `1_Content` + 当前没有任务"三个条件都满足时，发**同一个** `SceneEnterRequestEvent`，走产品那条装包 → 装配 → `scene:ready` 链路。WebGL 里可用 `?wsu3_test=…&wsu3_clip=…` **免重打包**覆盖 | 负责人 2026-10-14（"在 setup 里面增加一个测试开关，可以指定启动的 tasktype + projectclip"） | 否 | **生效** |
| DEC-114 | **dev 期由 Vite 提供 Unity 服务与发布清单**（`/unity/<key>/**` + 合成的 `/release-manifest.json`），并让**桩构建可选地仿真 Unity 侧协议** —— 于是"桥交互"能在 `vite dev` 里人工联调、也能进冒烟自动验，不必等真 WebGL 构建（DEC-59 要求构建前关编辑器，那条路很慢） | AI 定（依据 DEC-27 的"每页有程序化验收"与 DEC-79 的"缺席必须明说"） | ★ 是（只加**开发期**通道，不进产品产物） | **生效** |

### DEC-112 落地要点

三件事必须收在一处，散在视图里必然漏：

1. **`app:init` 必须"握手之后"发一次**（Unity 靠它拿语言 / 画质 / 协议版本）。时序依据：Unity 侧
   `StartupFlow` 是"管理器自检通过 → 发 `unity:ready`"（`design/09` §3），所以**收到 `unity:ready` 就是可以发指令的信号**。
2. **`scene:enter` 可以在握手之前就被要求**（页面先导航、Unity 懒挂载是常态）⇒ 会话记住**意图**，
   握手后补发；同时必须**幂等**：视图的同步函数会被各种响应式信号反复触发，重发会让 Unity 侧
   一直"先退旧的再进新的"（表现是画面反复重装）。
3. **`input:enable` 在握手前只能记状态，不能发**。⚠️ **这条是单测抓出来的真问题**：
   Unity 的任务流程管理器是在**管理器自检里**才订阅这些事件的，早于握手发出去的消息
   **桥收得到、但没有订阅者** ⇒ 静默丢失，表现是"面板关了，三维还是点不动"。

另外三条口径：

- **面板回执"一个请求只回一条"**（`design/02` §3.2 / `design/10` §5）落在 `StepPanelQueue` 里：
  没有 pending、`kind` 不匹配、已经回过 —— 三种情况一律返回 `null`，调用方**什么都不发**。
  这样"迟到的回执打到下一个请求上（答非所问）"从结构上不可能发生。
- **`tips` 不占"等回执"的位置**：Unity 侧 `WebStepPanelPort.ShowTip` 是发出去就不管
  （不调 `BeginPending`、不订阅 `UiResultEvent`），所以提示条**不进 pending、也不需要回执**。
- **答题的"判定"在 Web 侧、"重问"在 Unity 侧**：界面层用题库判对错（答对回 `success`、
  答错回 `failed`），`ConditionQuestion` 按它自己的 `maxAttempts` 决定再问一次还是放行。
  Web **不自己实现重试循环** —— 两处都做会变成两套上限。

### DEC-113 落地要点

- **它就是"复述一遍 Web 的 `scene:enter`"**：发的是同一个 `SceneEnterRequestEvent`、走的是同一条
  `TaskFlowManager` 链路，所以它验证的是**产品路径本身**，不是一条平行的假路径。
- **开关关闭时对产品路径零影响**：不发事件、不改状态，只在内容场景到位后打一条日志说"仍在等 Web 的
  `scene:enter`"，然后自毁。默认值就是关（`testEnabled = false`），产品构建不需要任何额外操作。
- **绝对不替 Web 做决定**：`CurrentTaskType != None`（Web 已经先发了 `scene:enter`）时自动让位，不重复进入。
- **必须等 `1_Content` 成为活动场景**才发：结构任务的 `StructureTaskManager` 是**场景里的节点**，
  场景没到就发会走进"内容场景里没有 `StructureTaskManager` 节点"那条错误分支 —— 装包装了个寂寞还留一条像 bug 的报错。
- **不挂在 `StartupFlow` 那个物体上**：`StartupFlow` 在引导末尾 `Destroy(gameObject)`，会把同物体上的协程
  在切场景那一帧一起带走。给它**自己的根物体**（`0_Setup` 的 `TestSwitch`）并 `DontDestroyOnLoad`。
- **URL 覆盖的键与口径**：`wsu3_test=on|true|1` 开（沿用序列化取值）、`wsu3_test=off|false|0` 显式关、
  `wsu3_test=<数字>` 开并把该数字当 `TaskType`（未定义的数字只忽略这一项并告警）、`wsu3_clip=<clip>` 覆盖 clip
  （空值忽略）。⚠️ 取舍：`1` 是**布尔字面量**而不是 `TaskType.Purpose` —— `wsu3_test` 首先是"开/关"；
  要 `Purpose` 请在 Inspector 上改。
- **字段名不叫 `enabled`**：那会遮蔽 `Behaviour.enabled`（Inspector 里出现两枚"启用"，且
  `GetComponent<StartupTestSwitch>().enabled = false` 的语义是"关掉组件"、不是"关掉自测开关"）。叫 `testEnabled`。

### DEC-114 落地要点

- **为什么需要**：`/unity/**` 与 `release-manifest.json` 一直**只有壳的静态服务器**（`electron/server.js`）提供
  ⇒ `vite dev` 下点进 Unity 任务永远走"产物未就位"那条分支，人工联调必须先打包，改一行前端都要重来一遍；
  自动化冒烟也拿不到任何桥交互的证据。
- **只做如实转述，不假装有**：读 `unity/builds/manifest.json`（`unity-stage.mjs` 写的），
  暂存了几个构建就报几个；一个都没有就 `unity.included = false` 并写明原因（DEC-79）。
  **产品链路口径不变**：产物清单仍由 `tools/pipeline/pack.mjs` 产出。
- **中间件必须注册在 Vite 内部中间件之前**（在 `configureServer` 里直接 `use`，而不是 return 一个函数）：
  否则 `/release-manifest.json` 会先被 SPA 兜底接走，返回一份 **200 的 index.html**，
  页面 `response.json()` 解析失败后**静默**退化成"没读到清单" —— 最难查的那种。
- **桩构建的协议仿真是可选的**（默认关）：桩仍只是"一块画布 + 一次握手"；显式打开
  （`window.__WSU3_STUB_PROTOCOL__ = true` 或 URL 带 `?wsu3_stub=protocol`）后才按契约回消息。
  仿真用的 `refId` 取**真实内容数据**里的 id，所以顺带把"内容数据 → 面板文案"那一段也验了。
- **测试隔离**：`unity-stage.mjs` 新增 `--stage-root`，Vite 侧新增 `WSU3_UNITY_DEV_ROOT` ——
  冒烟把桩暂存到**临时目录**验完即删，`unity/builds/`（负责人真打好的产物落点）从头到尾不被碰。

---

## 26 第十三轮（2026-10-14）：结构件"洋红材质"的真因与打包前自愈（DEC-115）

> 背景（负责人 2026-10-14 报障，逐字转述）："因为打 AB 包，所以 mat 的 shader 应该是没加载出来，
> 我给 shader 挪进 Resources 也没用，需要解决一下。"
> 追问得到三个关键限定：**现象 = 洋红**、**环境 = 编辑器 Play 模式**、**范围 = 8 个结构件全都这样**。

**查证结论：这不是 AB 的问题，也不是 shader 的问题 —— 是"材质接管"留下的悬空绑定，而且"8 个全中"这条不成立。**
逐包实测（编辑器内 `AssetBundle.LoadFromFile` + 实例化后读渲染器）：

| 包 | 材质引用为 null | shader 来源 |
|---|---|---|
| breaker 61 / combinationSwitch 21 / contactor 11 / fuse 10 / speedRelay 41 / thermalRelay 44 | **0** | 全部"包内" |
| **timeRelay** | **8** | 包内 0 / 项目 0 |
| **masterAppliance** | **3** | 包内 0 / 项目 0 |

⇒ 只有 2 个器件坏了（正是 DEC-102 §21.1 记的"两个嵌套 FBX 预制体实例"），另外 6 个的 shader 与材质
**一直在包里**。而 `ImportAsset(ForceUpdate)` 重导那两个 FBX 之后当场归零（8→0、3→0）。

| ID | 决策 | 来源 | 偏离★ | 状态 |
|---|---|---|---|---|
| DEC-115 | **打包前对"预制体材质绑定"体检 + 自愈**：`BundlePipeline` 在 `BuildAssetBundles` **之前**用 `PrefabUtility.LoadPrefabContents` 数空材质槽；有坏槽就**强制重导该预制体依赖树里的 FBX**（幂等，只在坏时才动）；**修不好则中止构建**，绝不产出洋红产物。对账（dry-run）只告警不修（那次操作的承诺是不写盘） | AI 定（依据本轮的实测根因；口径承 DEC-79"缺席必须明说"与 DEC-27"每页有程序化验收"） | 否 | **生效** |

### 26.1 根因与"为什么会自己回来"

- **根因**：`timeRelay` / `masterAppliance` 的零件是**嵌套 FBX 模型实例**（外层预制体只存覆盖项，
  零件与材质绑定住在 FBX 里）。DEC-102/103 的"材质接管"把 FBX 自动抽出的同名 `.mat` 换成本工程搬来的材质，
  两者 **GUID 不同** ⇒ FBX 内部绑定指向**已消失的 GUID** ⇒ 实例化后 `MeshRenderer.sharedMaterials` 全是 `null` ⇒ 洋红。
- **为什么会回来**（这条是本次最有价值的发现）：对症的 `ImportAsset(fbx, ForceUpdate)` **只落在本机
  `Library/`（派生数据，不进版本库）** —— 任何一次"不强制"的全量重导都会把它打回去，
  最常见的就是**切换 Build Target**。负责人切到 WebGL 之后它就回来了，而当时打的 8 个 AB 包
  把这个状态**原样打进了产物**（包内实测同样是 8/3 处为 null）。
- **字节数铁证**：出问题时 8 个包合计 **37,464,472**；重导并重打后 **47,500,295** —— 差的 10 MB
  正是这两个器件丢掉的材质与贴图；而 DEC-108 当时的报告是 **47,476,797**，几乎一字不差
  ⇒ 这次重打回到了回归之前的正确状态。

### 26.2 为什么用 `LoadPrefabContents` 而不是"直接读预制体资产"

嵌套实例里的零件在外层 YAML 是 `stripped` 块（没有名字、没有 Transform），**直接读预制体资产必然全是 null**
—— 这正是 DEC-111 记下的教训（"对预制体内容里的物体取 id 实测 16/16 失败"）。
实测 `LoadPrefabContents` 与 `Instantiate` 在 8 个预制体上**结果完全一致**（11/44/8/3/10/61/41/21 个材质槽），
所以选不污染场景的那一种。

### 26.3 明确否定的一条路（别重复踩）

**把 shader 挪进 `Assets/Resources/Shaders/` 既无用也无害**。实测（重打后逐包读回）：
8 个包的 shader 来源**全部仍是"包内"** —— 因为 shader 是通过"材质 → shader"的依赖被**隐式卷进包的**，
与它放在哪个目录无关；而 `Assets/Resources/**` 里的资产本来也会进玩家构建，于是只是**多一份副本**。
⇒ shader 从来不是这个问题；本轮**没有**把它挪回 `Assets/Shaders/Models/`（负责人的动作保留），
但若要恢复与 `content/asset-structure-report.json` 记载路径的一致性，挪回去是安全的（GUID 不变）。

> ⚠️ **仍未验证**：构建后的**真 WebGL 产物**里 shader 变体会不会被裁（`Graphics Settings` 的
> `m_PreloadedShaders` 是空的、`m_AlwaysIncludedShaders` 只有内置默认项）。
> 编辑器里证明的是"材质与 shader 都解析得到"，不等于构建后一定不洋红 —— 见 `TODO.md` D-24。

---

## 27 第十四轮（2026-10-14）：真 WebGL 产物上 AB 取包失败（DEC-116）

> 背景（负责人 2026-10-14 报障，逐字转述）："我尝试打包 webgl，通过 VSCode liveserver 打开，但是会报错
> `[AddrMgr] AB 下载失败：Content/clip_contactor ← http://127.0.0.1:5500/StreamingAssets/Content/clip_contactor（）`
> `[TaskFlow] 装包失败，本次进入 Structure 中止：clip 'clip_contactor' 的第 1/1 个包装载失败：contactor_structure_model`"

| ID | 决策 | 来源 | 偏离★ | 状态 |
|---|---|---|---|---|
| DEC-116 | **WebGL 的取包路径与其它平台分开**：WebGL 上改用 `UnityWebRequest.Get(url)` + `AssetBundle.LoadFromMemoryAsync(bytes)`，**不再走 `UnityWebRequestAssetBundle.GetAssetBundle`**（那条在 WebGL 上带 IndexedDB 缓存）；同时两处失败日志补上 `result` / `http` / `err`。⚠️ **它修的是"原因②"，不是全部**（见 §27.2） | AI 定（依据本轮实测，见下） | 否 | **生效** |

### 27.1 查证过程（每一步都可复核）

| 探针 | 结果 | 排除了什么 |
|---|---|---|
| 那条日志的原因字段 | **空串**（`（ ）`） | 说明"只打 `request.error`"这个诊断本身不合格 |
| `HEAD /StreamingAssets/Content/clip_contactor`（Live Server） | **200**，`Content-Length 4201911`，`application/octet-stream` | 不是 404 / 不是 MIME |
| 与工程里的包比对字节数 | 8 个包**逐字节同大小**（`clip_timerelay` 7,621,356 / `clip_masterappliance` 4,380,057） | **构建产物是最新的**（含 DEC-115 的材质修复），不是"旧包" |
| `Range: bytes=0-1023` | **206** + `Accept-Ranges: bytes` | 不是"服务器不支持 Range" |
| 把同一 URL 的字节下回来 → `AssetBundle.LoadFromMemory` | **OK**：`magic=UnityFS`、资产名 1 个、预制体读得到 | **包本身没坏**、**字节没问题** |
| `#if UNITY_WEBGL` 分支的 API 核验（`unity_reflect`） | `AssetBundle.LoadFromMemoryAsync(byte[])` ✅、`UnityWebRequest.result` ✅ | 不靠记忆写 API |

⇒ 这**排除了包 / 服务器 / 字节 / 材质 / shader**，把范围压到"WebGL 运行期发起的那个请求本身"。
⚠️ 但它**还不足以**指出是哪一条 —— 下面 §27.2 是更可能的首要原因。

### 27.2 但还有一条更可能的**首要**原因：明文 HTTP 被 Unity 挡住了

`ProjectSettings` 的 `insecureHttpOption` 在项目里原本是 **0 = `NotAllowed`**（默认值），
官方口径逐字是："**Determines if plain text HTTP connections are allowed.**"（`PlayerSettings.insecureHttpOption`，
枚举 `NotAllowed` / `DevelopmentOnly` / `AlwaysAllowed`，已用 `unity_reflect` + `unity_docs` 核验）。
而 AB 的地址正是明文 `http://127.0.0.1:5500/...`：

- **UnityWebRequest 会被这条策略挡下** ⇒ `result != Success`、`error` 可能为空 —— 与现场完全吻合；
- 而**播放器自己的文件**（`.data` / `.framework.js` / `.wasm`）是 **JS loader** 拉的、不走 UnityWebRequest
  ⇒ 所以"播放器起来了、只有 AB 下载失败"也说得通。

**结论（不要只修一个）**：

| 原因 | 现象 | 对策 | 谁改的 |
|---|---|---|---|
| **① 明文 HTTP 被挡**（首要嫌疑） | UnityWebRequest 直接失败、`error` 为空 | `Project Settings → WebGL → Publishing Settings → Allow downloads over HTTP = Always allowed`（序列化值 `insecureHttpOption: 2`） | 负责人本轮已改为 **2** |
| **② `DownloadHandlerAssetBundle` 的 IndexedDB 缓存路** | 同一 URL 换过几次包后命中旧条目而失败 | 本轮改为"普通 GET + `LoadFromMemoryAsync`"（本条决策） | 本轮改 |

另外负责人同批还改了 `webGLCompressionFormat: 0 → 2`（**Disabled**）——
**这也是本地静态服务器能跑的必要条件**：Live Server 不会对 `.br` / `.gz` 附 `Content-Encoding`，
用 Brotli 打出来的产物在它上面必然加载失败。改分辨率与 `companyName` 属产品侧取值，与本条无关。

> ⚠️ **所以"改完就一定好了"这句话不成立**：①② 任一都足以造成同一个症状。
> 本轮只把 ② 修掉并把诊断补全（失败时现在会打 `result` / `http` / `err`），
> **必须在真 WebGL 产物上复跑一次**才能判定到底是哪一条 —— 见 `TODO.md` D-24。
> 复跑时若仍失败，看新日志里的 `result`：`ConnectionError` + `http=0` 指向 ①；HTTP 200 却 `DataProcessingError` 指向 ② 之外的解析层。

### 27.3 改法与纪律

- WebGL 分支：普通 `GET` 拿到 `downloadHandler.data` → `AssetBundle.LoadFromMemoryAsync`。
  代价是大包会多一份内存驻留（最大 10 MB 那档 → 峰值 ~20 MB）；换来的是**不碰任何缓存**、
  以及去掉"`using` 释放 request、而 bundle 归 handler 所有"这层归属歧义（bundle 现在归调用方，卸载纪律不变）。
- 两处失败日志都带上 `result` / `http` / `err`：**"原因为空"这件事本身就是本轮最大的排查障碍**，
  以后同类失败至少能看见 HTTP 码与 Result 枚举。
- 纪律④（bundle 文件名段强制小写）未受影响，`GetBundleUrl("Content/clip_timeRelay")` 实测仍给出 `…/clip_timerelay`。

> ⚠️ **仍未闭合**：本条只在编辑器侧确证了"包与字节是好的"并给出改法，
> **改后必须在真 WebGL 产物上复跑一次**才算闭合 —— 见 `TODO.md` D-24。
> 另：负责人用 VS Code Live Server 复现（`127.0.0.1:5500`），交付形态仍是 WebGL（DEC-12），
> 与 `docs/design/09` §12.2 的 dev 服务器是两条不同的服务路径，别混。

---

## 28 第十五轮（2026-10-14）：洋红定案 → 全量迁 Addressables → 步骤系统两种新行为（DEC-117 ~ DEC-120）

> 背景：负责人 2026-10-14 晚报"编辑器 Play 洋红 + 真 WebGL 产物取包失败"。
> 上一轮（§26 / §27）两次判断都被推翻（详见 §28.1），本轮先把机制查到底，再按结论动架构。

| ID | 决策 | 来源 | 偏离★ | 状态 |
|---|---|---|---|---|
| DEC-117 | **"编辑器 Play 洋红"是测试方式的必然假象，不是内容/材质/shader 的问题**：WebGL 平台的 AssetBundle 在 Windows 编辑器里加载时，包里**每一个 shader**（含 Unity 内置的 `Universal Render Pipeline/Lit`）都拿不到可用 pass ⇒ Unity 一律套内置 error shader ⇒ 纯洋红。**判定规则：编辑器里加载 WebGL 产物看到的洋红不作数；验渲染必须用真产物**（或该平台自己的 AB） | AI 定（依据本轮实测对照，见 §28.1） | 否 | **生效** |
| DEC-118 | **内容包全量迁到 Addressables（`PackageType.AB` 整条删除）**：模型预制体与漫游场景统一走 AA；**共享材质单独成组 `WSU3_Shared`，先于任何内容组装载**。收益不是"治洋红"（AA 底层同样是 AssetBundle），而是①**编辑器 Play 走 Play Mode Script（AssetDatabase）、开发循环不再看到洋红**；②两条链路合一，不再手拼 URL / 手管 `bundle.Unload` / 不用再守"文件名段必须小写" | 负责人 2026-10-14 定（"彻底改掉这个问题"，并要求材质进 shared 组先装） | 否 | **生效** |
| DEC-119 | **显隐与动画彻底分家**：动画槽位**不再 `SetActive`**（原 `HideAnimations` / `ShowAnimationsAtFirstFrame` / `HideAnimationsOnComplete` 里的显隐动作全部删除），显隐**只由 `activeObjects` / `inactiveObjects` 两张表**负责；`AnimationStruct.ifHideOnFinish` 字段删除 | 负责人 2026-10-14 定 | 否 | **生效** |
| DEC-120 | **点击条件自带"碰撞体闸门"**：拾取是物理射线，所以"能不能点"= "碰撞体开没开"。`ConditionClick` 按生命周期开关 target 自己的碰撞体：`Prepare` 关 → `Waiting` 开 → 完成后关（`OnReset` 也关）⇒ **全场最多只有一个可点**（当前步骤那个） | 负责人 2026-10-14 定 | 否 | **生效** |
| DEC-121 | **步骤系统新增"动画运行模式"**（`StepRunMode.Animation`）：条件的 `Waiting` 阶段**照走**（照常定格首帧、发事件、播动画），只是**不等条件成立** ⇒ 流程自动一路推进到结束。与"一步一步"并列，`StepManager.RunMode` 公开可改 | 负责人 2026-10-14 定 | 否 | **生效** |

### 28.1 洋红的定案过程（推翻上一轮的两处判断）

上一轮（§26 / §27）的两处判断**都是错的**，本轮逐条推翻：

| 上一轮的说法 | 本轮的实测反证 |
|---|---|
| "坏的是 `timeRelay` / `masterAppliance` 两个器件"（DEC-115） | 那只解释了**包内材质为 null**，解释不了洋红 —— contactor 的 11 个材质一直正常解析，却一样洋红。DEC-115 是真 bug 但不是这个症状的解 |
| "用 `material.FindPass("UniversalForward") == -1` 判缺 URP 前向 pass" | **探针无效**：`FindPass` 匹配的是 **pass 名**，不是 LightMode tag；内置 `URP/Lit` 同样返回 `-1`。以后禁用这个判据 |

**本轮的决定性对照（全部可复核）**：

| 探针 | 结果 |
|---|---|
| 洋红截图逐像素 | 模型区主色 **`(254,0,254)`** = error shader 的 `(1,0,1)` 被 sRGB 取整 |
| AB 里那个 shader 的 pass 名 | `<Unnamed Pass 0>` / `DepthNormalsOnly` / `DepthOnly` —— 与 `Hidden/InternalErrorShader` **逐字相同** |
| 两者的 `GetPropertyCount()` | 都是 **0**（名字还是原 shader 名、数据已是 error shader 的"混合态"） |
| 两者每个 pass 的 `ShaderUtil.IsPassCompiled` | **全 True**（而工程那份 9 个 pass **全 False**）⇒ AB 的 shader 数据是按 **WebGL 平台**编的 |
| **对照实验 1**：新建材质用**内置** `Universal Render Pipeline/Lit` → 打 WebGL AB → 编辑器加载 | `passCount=3`、pass 名与 error shader 完全相同、`UniversalForward=-1` ⇒ **与我们的 shader 一模一样** |
| **对照实验 2**：同一材质打 **StandaloneWindows64** AB → 编辑器加载 | 我们的 shader `passCount=5`（`Universal Forward` / `ShadowCaster` / `DepthOnly` / `DepthNormals` / `Universal 2D`）、URP/Lit `passCount=4`（含 `ForwardLit`）⇒ **前向 pass 都在** |
| **对照实验 3**：按现有配置真的跑一次 Addressables（`BuildPlayerContent`，WebGL）→ 编辑器加载 | 产出 `defaultlocalgroup_assets_all_*.bundle` **79,937 字节**（与 AB 探针同量级同结构），加载后同样是那 3 个 pass、同样 `UniversalForward=-1` ⇒ **AA 底层就是 AssetBundle，换成 AA 治不了洋红** |

⇒ **结论**：洋红 = "在 Windows 编辑器里加载 WebGL 平台的 bundle"的必然结果（error shader 回退），
**与材质、shader、AB/AA 的选择都无关**。所以 DEC-118 迁 AA 的**正当理由**不是"治洋红"，
而是"编辑器 Play 走 AssetDatabase"这一条（AA 的 Play Mode Script）—— 它让开发循环不再踩这个假象。

### 28.2 迁 AA 的落点与不变量

**落点**（`Assets/Editor/BuildTools/`）：

| 文件 | 作用 |
|---|---|
| `ContentPipeline.cs` | **一键编排**（菜单 `WSU3/Pack/一键打 AA 包（全部）`）：收集 → 校验 → 写配置 → 同步登记表 → 注册分组 → 一次 AA 构建 → 报告；批处理入口 `-executeMethod …ContentPipeline.BuildAllFromBatch`；另加 `BuildAllNonInteractive()` 供脚本化验证（弹窗会卡住调用方） |
| `AaContentBuilder.cs` | **地址与分组怎么落到 Addressables** 的唯一落点：建组 / 清本流水线残留组与残留条目 / `CreateOrMoveEntry` + 设地址 → `BuildPlayerContent` |

**不变的三条铁律**：
- ① **包粒度 = 一个 clip 一个组**（`WSU3_clip_{器件}`），切任务 = 卸旧 clip + 装新 clip，与 AB 时代同口径；
- ② **共享材质单独成组、先于内容组装载**（`AddressableManager.LoadClipRoutine` 先装 `shared_model_materials`）；
- ③ **一次构建产出全部组**（AA 的 `BuildPlayerContent` 本就是全局操作）。

**新增的四条实测坑（都已在代码里写清 WHY）**：
1. **一个资源只能有一个 address**：Addressables 的 entry 由 **GUID** 定位，第二次 `entry.address = …` 会**静默覆盖**第一次
   （症状是"某个地址注册了却查不到"、运行期 `InvalidKeyException: No Location found for Key=…`）。
   实测踩过：共享组先把 18 份材质注册成 `shared_material/*`、再 `insert(0)` 组级配置，
   结果 `shared_model_materials` 消失、整组装载失败。**修法：组级配置先注册**（那份"代表材质"于是同时持有两个地址）。
2. **包配置 id 会变成文件名**（`AA_{id}.asset`）⇒ 不能带 `/`：共享材质条目的 `configId` 与 `address` 必须分开取值
   （实测第一次就抛 `Creating asset at path …/AA_shared_material/ACContactor.asset failed`）。
3. **判构建成败不能读 `BuildPlayerContent()` 的返回值**：它在不少版本里返回 `void`，反射拿到 `null` 会被误判成失败
   （实测：日志写着 `Addressable content successfully built (duration : 0:00:23)`，流水线却报失败、体积报 0.00 MB）。
   ⇒ 判据改成**数输出目录里的 bundle**。
4. **"没有新增文件"不等于失败**：什么都没改就重跑时 Addressables 会做一次 **no-op 重建**（实测 4.7 秒、bundle 哈希不变）。
   ⇒ 判据是"输出目录里有 bundle"，新增数只作"是否真正重建过"的参考。
5. **清残留只能清本流水线的组**：`WSU3_` 前缀；AA 的 settings 是全局单例，误删别人手工建的分组是不可逆的现场破坏。
6. **旧类型的资产按类型搜不到**：`ABPackageConfigSO` 被删后，那些 `AB_*.asset` 的 `m_Script` 是 `{fileID: 0}`，
   `AssetDatabase.FindAssets("t:ScriptableObject")` **不会**把它们报出来（实测按类型搜 0 命中、文件明明在盘上）
   ⇒ 只能走**文件系统枚举**按文件名前缀清理（`EditorAssetUtil.DeleteAssetsByFilePrefix`）。

**产物落点**（容易误判的一条）：`BuildPlayerContent()` 把包写进
`Library/com.unity.addressables/aa/<平台>/`，**再由 `AddressablesPlayerBuildProcessor` 在 Build Player 时**
拷进 `Assets/StreamingAssets/aa/<平台>/`（从而被 Unity 带进 WebGL 产物）。
实测：只调 `BuildPlayerContent` 时 `StreamingAssets/aa` 是**空的**、包都在 `Library` 下 —— 这是设计如此，不是失败。

**实测读数**（`activeBuildTarget=WebGL`，9 个组 / 27 项资源）：

| 组 | 字节 |
|---|---|
| `wsu3_shared`（18 份材质 + 贴图 + 4 个 ShaderGraph） | **32,921,147** |
| `wsu3_clip_timerelay` | 1,021,328 |
| `wsu3_clip_contactor` | 1,441,813（AB 时代同一个包是 4,201,911 ⇒ 材质被抽到共享组之后显著变小） |
| 其余 6 个 clip | 570K ~ 3.9M |

包登记表 `PackageDB_Master` = **9 条 / 空引用 0**（8 个器件 + 1 个 `shared_model_materials`）。

### 28.3 显隐与动画分家、碰撞体闸门、动画运行模式

**① 显隐只认两张表（DEC-119）**

原先 `ConditionBase` 的动画路径里藏着 4 处 `SetActive`（`HideAnimations` 归位即隐藏、
`ShowAnimationsAtFirstFrame` / `PlayAnimations` / `SampleAnimations` 显示、`HideAnimationsOnComplete` 隐藏）。
后果是**显隐被动画暗中接管**，"这一步该看见什么"无处可查，两张表也被架空。现在：

- 删除上述全部 `SetActive`；`HideAnimations` → **`PrepareAnimations()`**（只 `Stop()` + 回 0 帧，不动显隐）；
- `AnimationStruct.ifHideOnFinish` **删除**（与显隐表重复管一件事），生成器里写它的那段一并去掉；
- 新增护栏 **`IsAnimationVisible`**：物体隐藏时**不播**并明确告警。
  WHY 必须有这道：Legacy `Animation` 对**隐藏**的物体不推进（`Play` 调得下去但 `isPlaying` 恒 false、画面也不动），
  而"播完"判据就是 `AnyAnimationPlaying()` ⇒ 被隐藏的槽位会让该步骤**瞬间算播完且不报错**，
  现象是"动画莫名不执行"。有了这道护栏，问题从"动画不播"变成一句"这一步没把这个物体放进 activeObjects"。
- `StepHandlerEditor` 同步加一条校验：动画物体若不在显示表（也没有祖先在表里）→ 警告。

**② 碰撞体闸门（DEC-120）**

拾取链是 `InteractiveManager.RaycastTarget()` 的 `Physics.Raycast` + `GetComponentInParent<InteractiveObjBase>()`，
所以闸门就是**开关碰撞体**（只改 `enabled`，不动物体显隐）：

| 阶段 | 动作 |
|---|---|
| `OnPrepare` | `SetTargetColliderEnabled(false)` |
| `OnWaiting` | `SetTargetColliderEnabled(true)` ⇒ 此刻唯一可点 |
| `OnCompleteHide` | `SetTargetColliderEnabled(false)` |
| `OnReset`（跳转归位） | `SetTargetColliderEnabled(false)` |

配套：
- 新增可空字段 `targetCollider`（留空 ⇒ 运行期取 target **自己身上**的第一个 `Collider` 并缓存；
  用 `GetComponent` 而非 `GetComponentInParent`，否则可能抓到别的零件的碰撞体）；`SetTarget()` 会清掉缓存；
- 目标没有碰撞体时告警说清"它本来就点不到"（拾取走物理射线）；
- **`toggleTargetActive` 全部置 false**：接触器 10 处（负责人改）+ 其余 7 个预制体 **23 处**（AI 批改：
  breaker 4 / timeRelay 4 / thermalRelay 6 / fuse 3 / speedRelay 6 / combinationSwitch 5；
  `masterAppliance` 无点击步骤）。它管"物体本身露不露面"，与闸门是**两件事**。

实测（Play，contactor）：10 个零件的碰撞体**全部被关**，每个 `ConditionClick.TargetCollider` 都解析到自己的
BoxCollider —— "初始全关"生效，剩下由 `Waiting` 开当前那一个。

**③ 动画运行模式（DEC-121）**

```csharp
public enum StepRunMode { StepByStep = 0, Animation = 1 }   // StepManager 上，与"一步一步"并列
public StepRunMode RunMode { get; set; }                    // 公开可改（脚本 / Inspector）
public bool IsAnimationMode { get; }
public void EnterAnimationMode();  public void EnterStepByStepMode();
```

实现要点（**"不是跳过 Waiting 阶段，而是进了 Waiting、只是不等"**）：
- `ConditionBase.AdvanceWithoutWaiting()`：只让等待循环立刻退出，**不碰状态机**；
- `ExecuteStep` 在 `Waiting()` **之前**调它；
- ⇒ Prepare / Waiting / Complete / 动画播放 / 事件广播 **全部与正常模式同源**，唯一差别是"等不等"。
  若真的跳过整个 `Waiting()`，就会连"定格首帧"与"请求提示"一起丢掉，动画会从当前位置乱跳。

**为什么单独开一个入口、不复用 `ForceComplete()`**：后者是"外部把这一步提前结掉"，会置 `IsForceCompleted`（诊断要看见）；
动画模式是"这一步本来就不等人"，不是被打断 —— 混用会污染诊断。

**为什么把判据合成 `ShouldStopWaiting`**：原先四个等待循环各自写 `!forceComplete`，新增一种"不等"来源时
最容易漏改其中一个，症状是"某个条件类型在动画模式下莫名卡住"。现在
`ShouldStopWaiting => forceComplete || advanceWithoutWaiting`，所有等待口统一认它。
顺带修掉 `ConditionQuestion` 的一处真实隐患：内层等待已认新判据、**外层重问循环**原来只认 `forceComplete`，
在"动画模式 + 无超时"下会一圈圈重复提问退不出去。

**切模式时立刻放行"正在等待的那一步"**：否则界面看着像没生效（用户把类型改成动画、画面还停在"等你点"）。
实测踩过这个观感问题 —— **修法**是 setter 里对该条件调 `AdvanceWithoutWaiting()`（仍然不是 `ForceComplete`）。

**实测**（先切模式再重跑，contactor 12 步）：`isFinished=True`、**12 个条件全部 Complete / 0 个在等待**、
用时 **58.8s**（正是 12 段 clip 的真实总长）⇒ 一路自动跑到"全部步骤完成"。

### 28.4 工程侧卫生

- **`AddressableAssetsData/**` 必须进版本控制**（AA 的配置就住在那里：settings + 分组 + 各分组的 schema）。
  它此前**未被 git 跟踪** —— 一丢整条 AA 配置就没了。
- **`Assets/StreamingAssets/Content/**`（AB 时代的 8 个包 / 45.3 MB）已成无主产物**：
  运行期不再读它，`.gitignore` 与 `ignore.conf` 里那几条规则可留（防误提交），但目录本身该删。
- **`Assets/AddressableAssetsData/WebGL/`（AA 构建输出 / 2 文件 / 3,893 B）不入库**，属产物。

---

## 29 第十六轮（2026-10-15）：三维页归队 B 组规范与占位画布统一（DEC-122 ~ DEC-130）

> 背景：负责人审 C10「结构」时接连指出几处"样式不对"——先是"`ui-tabs` 这个样式和现有的其他样式好像不同"，
> 再是"`ui-corner ui-corner--lb` 这个用的也不对，需要和 info 的右上角部分相同"，
> 之后又让画布框"参考 info 的三维部分样式"，最后把画布上的叠层"都移除掉"。
> 核查结论：**前两处是同一个原因** —— C8~C11 是第二轮修订时**有意留着的欠账**（`ui-mockups/TODO.md` T4
> "Unity 侧 UI 暂不设计"），它们用的组件被新规范取代后没有跟着换：
> `ui-tabs` 是被 §16.1 站点线取代的旧页签栏、`ui-corner--rt` / `ui-corner--lb`（角落 fab）是被 §16.4 右上按钮组取代的旧件。
> 后两处则是**把三维页的画布区对齐 C6「简介」的形态**：同款框 + 画布上不摆壳层叠层。

| # | 决策 | 依据 | 是否偏离 | 状态 |
|---|---|---|---|---|
| DEC-122 | **排版稿 C8~C11（Unity 侧四页）的任务导航换成站点线 `route()`**，旧页签栏 `tabs()` 与其样式（`.ui-tabs` / `.ui-tab` / `.ui-tab--*` / `.ui-tab__stack*`）**一并删除**；整份排版稿只剩一套导航 | 负责人 2026-10-15 指示（"都换成 route()"） | 否 | 生效 |
| DEC-123 | **C8~C11 的角落 fab（`corners()`）换成与 C6「简介」相同的右上按钮组 `topRight()`**：返回固定在第一位、其后全屏 / 画质 / 帮助三个图标钮；四页自此**不再有**角落 fab | 负责人 2026-10-15 指示（"`ui-corner ui-corner--lb` …需要和 info 的右上角部分相同，用的样式不对"） | 否 | 生效 |
| DEC-124 | **三维页（`.ui-layout-3d`）的画布框 = C6 的三维区同款**：底图由"占位网格 + `--bg-0` 深色实底"改为 **`--glass-panel` 毛玻璃 + `backdrop-filter`**；描边与圆角本来就一致，不动。落地为一条**限定在 `.ui-layout-3d__view .ui-viewport`** 的覆盖，**不改 `.ui-viewport` 基类** | 负责人 2026-10-15 指示（"底图或者说 border 样式参考 info 的三维部分样式"） | 否 | 生效 |
| DEC-125 | **三维页的画布上不再摆壳层的叠层**：C8~C11 去掉左上技术栈标（`.ui-viewport__hint`）、右上工具组（`.ui-viewport__tools`）与底部悬浮条（`.ui-floatbar`）；`viewport()` 新增 `{ bare: true }`（只留画布）。这三个组件本身**不退役**（C3 与成果页仍在用） | 负责人 2026-10-15 指示（"`ui-viewport__tools` 这个不要、`ui-viewport__hint` 这个也不要、`ui-floatbar` 这个也不要，移除掉"） | 否 | 生效 |
| DEC-126 | **三维页的右侧栏回到常规面板**：`.ui-layout-3d__side` 去掉 `border-left` 与 `background: var(--bg-2)` 铺底（只当容器），里面的 `.ui-panel` 由"去边框去圆角"改回 `.ui-panel` 常规框；连带删除 §20.1 的"边到边对接的容器不圆角" | 负责人 2026-10-15 指示（"`ui-panel` 这个元素的 border 要换掉，改为 info 右侧部分的样子"） | 否 | 生效 |
| DEC-127 | **三维页不再渲染底部状态条**：C8~C11 补 `statusbar: false`（此前只有 C1~C7 写了），四页内容区因此与 C1~C7 **等高** | 负责人 2026-10-15 指示（回答 `TODO.md` T-14："去掉"） | 否 | 生效 |
| DEC-128 | **占位画布的样式全线统一为 C10「结构」的样子，不再分页面**：① `.ui-viewport` 底图由"占位网格 + `--bg-0` 深色实底"改为 **`--glass-panel` 毛玻璃 + 模糊**（DEC-124 那条"只在三维页"的限定覆盖撤销、并入基类）；② 嵌在 `.ui-panel__body` 里的画布**不再自画一层**（框由外层面板给）；③ **左上技术栈标与右上工具组整体退役** —— 从 `viewport()` 与 A6 / A10 的手写标记里移除，两个组件只在**样式成果页**留档 | 负责人 2026-10-15 指示（回答 `TODO.md` T-13："按照结构 type 的样式调整"） | 否 | 生效 |
| DEC-129 | **三维页布局定稿（试排转正）**：四个值保留并收成令牌 —— `--layout-3d-top: 150px` / `--layout-3d-gutter: 50px` / `--layout-3d-gap: 20px` / `--layout-3d-bottom: 20px`；其中 150 与 20 与 C1~C7 内容容器的上下内边距**同口径**，50 与 20 不在 `--sp-*` 刻度上（属观感值，故单独成组）。② 右上按钮组**保持** `right: 18px`（全站同一基准），不为三维页单独右对齐到 50px | 负责人 2026-10-15 指示（回答 `TODO.md` T-11："固化一下"）；② 的落点由 AI 按"同一个组件不留两套边距"定，**待确认** | 否 | 生效（② 不同意可随时改） |
| DEC-130 | **画布上的"部件名称悬浮提示"由 Web 侧（DOM 层）画**：新增组件 **`.ui-parttip`** —— 强玻璃底 + 毛玻璃 + 发丝阴影边 + 8px 圆角 + **主名 14px / 英文副名 12px**（`--fs-14` / `--fs-12`，2026-10-15 由 12/11 调大一档），可选 `.ui-parttip__en` 中文/英文两行；**`pointer-events: none`**（不抢画布的旋转/缩放手势，也不让它自己成为 hover 目标而与 Unity 侧的移入/移出事件打架），位置由宿主给（内联 `left/top` 或跟指针 `transform`）。C10 上以「灭弧罩 / Arc Chute」占位 | 负责人 2026-10-15 指示（"当我鼠标移入 Unity 一个部件中，会有一个部件名称的提示 UI —— 这个 UI 我们在 web 里面做，而不是 unity 做"；"字有点小，用稍微大点的样式"） | 否 | 生效（⚠️ 上游 hover 消息**尚不存在**，见 `TODO.md` D-29） |

### 29.1 为什么它是"另一套导航"（实测证据）

真 Chromium 量取（画布 0.7 缩放，下表数值已折算；两页均为 11 站的满形态）：

| | `.ui-tabs`（旧页签栏） | `.ui-route`（站点线） |
|---|---|---|
| 形状 | 一行凸起页签，只圆上两角 `12px 12px 0 0` | 28px 圆点 + 标签 + 站间连线 |
| 条高 | **57px** | **106px** |
| 内边距 | `8px 16px` | `18px 268px 12px 660px`（右侧避让右上按钮组、左侧避让左上浮卡） |
| 背景 | `--glass-bar` 毛玻璃 | `none`（§21 已去底："压在三维画布上会糊住画面"） |
| 当前态 | 顶部内阴影色条 `inset 0 2px 0 var(--accent)` | 实心圆点 + `0 0 0 6px` 光晕 + 文字加粗 |
| 样式成果页 | **没有展示** | 有（第三节「站点线导航（替代页签栏）」） |

⇒ 站点线吃过 §17 / §19 / §21 三轮修订，旧页签栏只吃到 §17 与一条文字色补丁：
**左右避让与"去底"当年都只加在站点线上**，所以旧页签栏一被露出来就会被左上浮卡压住、压在三维画布上会糊。
它同时违反"样式必须在 `index.html` 成果页里看得见"这条硬纪律 —— 这两点合起来说明它是**欠账**，不是"另一种风格"。

### 29.2 落地

- `src/pages-c.mjs`：C8 / C9 / C10 / C11 四处 `tabs(...)` → `route(...)`，并从 `parts.mjs` 的导入里去掉 `tabs`。
- `src/parts.mjs`：删除 `tabs()`；`tips()` / `corners()` 保留（前者 C8~C11 仍在用、后者现只剩 D1，属 T4 的其余部分）。
- `components.css`：§6「页签栏」整节删除（原位留一条"为什么删"的说明），并清掉 §17 玻璃底、§19 文字色、
  §20 圆角、§20.3 交互叠加层、§23 mask 图标里对 `.ui-tabs` / `.ui-tab` / `.ui-tab__stack` 的引用。
- `node docs/ui-mockups/src/render.mjs` 重新生成 29 页 + 成果页（成果页无 `.ui-tab` 展示，产物未变）。

**实测（可复核）**：四页 × 深浅两主题，站点数均为 **11**、当前站标签分别为「电路连接 / 仿真实验 / 结构 / 检测」、
`document.querySelectorAll('.ui-tabs, .ui-tab').length === 0`、站点线背景 `rgba(0, 0, 0, 0)`（已去底）、无 console 错误；
`ui-layout-3d` 与右侧栏顶边一致（详见 DEC-122 相邻的试排条目）。

### 29.3 第二处：角落 fab → 右上按钮组（DEC-123）

被换掉的是第一轮的**角落 fab**：`corners()` 渲染出 `.ui-corner--rt`（右上竖排三个 56px 方块：目录 / 全屏 / 画质）
与 `.ui-corner--lb`（左下"菜单"）。它们是 §16.4 右上按钮组（`.ui-topright` + `.ui-iconbtn`）的老形态，
与 C1~C7 全都不一致（Info 页用的是按钮组）。

- **落点不变、只换组件**：`corners()` 与 `topRight()` 在页面里的位置相同（都是 `board__body` 的直接子元素、
  绝对定位），所以四页只把 `${corners()}` 换成 `${topRight('')}`，不动其它结构。
- **左下"菜单"的去处**：按钮组第一位就是「返回目录」（`ui-iconbtn--back`），语义与前"菜单"一致，故不再单留一个左下按钮。
- **`.ui-corner` / `.ui-fab` 的样式暂不删**：D1「成绩结算」仍在用 `corners()`（那页没有站点线，是另一种形态）。

**实测（可复核）**：C6（基准）与 C10 的 `.ui-topright` 量取结果**逐值相同**（`top 39 / left 1464 / 宽 155 / 高 24`，画布 0.7 缩放下），
按钮组内容同为 `返回目录 / 全屏 / 画质 / 帮助`；两页 `document.querySelectorAll('.ui-corner, .ui-fab').length === 0`。

### 29.4 画布框、画布上的叠层与右侧栏（DEC-124 ~ DEC-126）

量取结果（真 Chromium，画布 0.7 缩放）：

| | C6 的三维框（由外层 `.ui-panel` 给） | C10 的画布框（改后） |
|---|---|---|
| 底图 | `rgba(22,32,46,0.55)` = `--glass-panel` | **同值** |
| 模糊 | `blur(16px) saturate(1.45)` | **同值** |
| 描边 / 圆角 | 0.5px `--line-1` / 28px | 同值（**本来就没差**，所以不必写） |
| 网格底纹 | 无 | **已去掉**（`background-image: none`） |

- **为什么只写一条限定覆盖**（`.ui-layout-3d__view .ui-viewport`）而不改 `.ui-viewport` 基类：
  基类的网格底图是"占位态"的信号，而嵌在 `.ui-panel` 里的用法本来就该透明（框由外层给，
  `src/parts.mjs` 里 `viewport()` 的注释写着"再画一层就是两层半透明叠加"）。三维页的视口是**独立**的、
  没有外层框，所以由它自己承担这一层玻璃。
- **叠层移除后各页实况**：c8 / c10 只剩画布 + 占位文字；c9 / c11 的左上两个**数显**（`.ui-meter`）**保留**
  （它不在被点名的三样里）；**C3 实验仪器未动**（它的悬浮条是"自动旋转 / 复位视角 / 标注"，属 Three 侧交互）。
- **右侧栏（DEC-126）**：改后 C10 的 `.ui-layout-3d__side .ui-panel` 与 C6 的右栏 `.ui-panel` **逐值相同**
  （`--glass-panel` / 四边 0.5px `--line-1` / 28px 圆角 / `blur(16px) saturate(1.45)`）——改前它四边无描边、圆角为 0。
  量取时顺带发现：**C8~C11 的内容区比 C1~C7 矮 36px**，因为 `statusbar: false` 只写在 C1~C7（详见 `TODO.md` T-14）。

### 29.5 本批收尾（DEC-127 ~ DEC-129）

**实测量取（真 Chromium，画布 0.7 缩放；九个带画布的页面逐个跑）**：

| 检查项 | 结果 |
|---|---|
| 画布底图（DEC-128） | **九个页面全部 `background-image: none`**（网格退役）+ 均带 `blur(16px) saturate(1.45)`；独立摆放的（A6 / A10 / C8~C11）自持毛玻璃 + 0.5px 发丝 + 28px 圆角；嵌在面板里的（C2 / C3 / C6）**透明无框**（不叠两层） |
| 占位叠层退役 | 九页 `hint = 0`、`tools = 0`；C8~C11 另 `floatbar = 0`（C3 的悬浮条保留 —— 它不在本次范围内） |
| 状态条（DEC-127） | C8~C11 `statusbar = 0`；**内容高 612 → 637，与 C6 逐值相同**（差的 36px 正是那条状态条） |
| 布局令牌（DEC-129） | C8~C11 实测 `padding: 0px 50px 20px`、`gap: 20px`、盒顶 129（= 150 × 0.7）——四个令牌全部生效 |
| 部件提示（DEC-130） | C10 实测：底 `rgba(20,29,41,0.78)`（= `--glass-strong`）、`border: 0px`、圆角 8px、`box-shadow` 第一层就是 0.5px 发丝（§20.2 铁律）、`backdrop-filter: blur(16px) saturate(1.45)`、`pointer-events: none`、`z-index: 45`；字号 **14 / 12**、内边距 `--sp-2` / `--sp-3`、中英两行尺寸 **80 × 56**（设计值），深浅两套主题均实测可读 |

**样式成果页联动**：三维视口卡改述为"毛玻璃底 + 0.5px + 28px"，退役的两块叠层另立一张**"页面上已不用，只在本页留档"**卡（否则会出现"CSS 里有的样式在成果页看不见"，违反 `AGENT.md` §4 的硬纪律）。

### 29.6 未闭合

| # | 事项 | 现状 |
|---|---|---|
| a | **T4 的其余部分仍是第一轮样式** | C8~C11 的**底部固定提示栏**（`tips()`）还没换成 §16.2 浮窗提示（`tipsFloat()`）；D1 仍在用 `corners()`。**负责人 2026-10-15 明确"先不动"**，留在 `TODO.md` T-12 |
| b | **C8~C11 的 UI 是否自此纳入评审范围** | 原 T4 写着"Unity 侧 UI 暂不设计、不要按它们评审 B 组规范"；本次 DEC-122 ~ DEC-126 都是按负责人要求改的，等于局部撤回。见 `TODO.md` T-12 |
| c | **占位画布的文字对比度** | `.ui-viewport__center` 仍是 `--text-3`（本次按"照结构页的样子"原样保留），落在毛玻璃上偏淡。要不要提到 `--text-2`，见 `TODO.md` T-13 |

---

## 30 第十七轮（2026-10-15）：结构任务的部件清单与悬停上报（DEC-131 ~ DEC-133）

**背景**：DEC-130 在 Web 侧落了 `.ui-parttip` 样式，但桥协议里只有 `object:picked`（点击），没有 hover 通道（`TODO.md` D-29）；
结构页（C10 / DEC-131 的骨架）也没有数据源来渲染右侧部件树。负责人 2026-10-15 指派"契约三处同批 + 两端实现 + 桩冒烟 + Unity 上报 + 文档提交"一条龙。

### 30.1 决定

| # | 决定 |
|---|---|
| **DEC-131** | **结构任务的部件清单走 `scene:parts`**：装配完成后 Unity 侧上报一次（`StructureTaskManager` 实例化即收集 —— **没有步骤流程也报**，结构认知不依赖步骤系统）。清单 = 扁平条目 `{ key, name, nameEn?, parentKey? }`；`parentKey` 指向**实例内最近的部件父级**（只认 `StructureObj`，纯 Transform 中间层被跳过、不越实例根，收集器 `ScenePartInventory`）；**成树在 Web 侧**（`web/src/domain/part-tree.ts`，缺父/自环/成环都在那里面挡）。部件名随预制体走（DEC-104），没填时回落 objectKey（空名条目 Web 侧会丢，宁可显示 key） |
| **DEC-132** | **悬停走 `object:hover`**：只在目标进出时上报（enter/exit 本身就是天然限频，**不逐帧发**——逐帧会把桥淹掉）；`key` 空串 = 移出（闸门关闭时的 `ClearHover` 也必须报，否则 Web 浮标卡住）；`x`/`y` 是相对画布**左上角**的归一化坐标（Unity 的 mousePosition 原点在左下，上报前翻 Y，与 CSS 同原点）。名字浮标（`.ui-parttip`）由 DOM 层画，Unity 不做这个 UI |
| **DEC-133** | **右树点选的选中态在 Web 侧本地记**：点部件行发 `view:focus{objectKey, animate}`，但 Unity **不会**为它回 `object:picked`（那是"三维里点中"的语义）——所以"当前亮着哪一行"的优先序是：悬停 key > 右树点选的本地回显（`focusedPartKey`）> Unity 报的 picked。`scene:exit` / 重新挂载时本地回显清零 |

### 30.2 落地与验证

- **契约**：TS / 快照 / C# 三方同批（26 条桥消息，`check-contracts` 过）；载荷形状 `PartEntry` / `ScenePartsPayload` / `ObjectHoverPayload` / `PartNode` / `PartHover`（`web/src/contracts/bridge-payloads.ts`）。
- **Web 侧**：`part-tree.ts`（6 测试）、`UnitySession`（读写 + 坐标夹取 + 状态清理 + `focusPart`）、`TaskView` structure 分支（部件树 + 浮标 + `BridgeStatusPanel`）。
- **Unity 侧**：`BridgeProtocol.cs` 出站载荷与 `WebBridge.SceneParts / ObjectHover`；`BridgeEvents.cs` 意图事件（`ScenePartsReportEvent` / `ObjectHoverEvent`，照 Core 只发意图、Runtime 上网的分层）；`ScenePartInventory`（新，纯收集器）；`StructureTaskManager` / `InteractiveManager` 两个发布点；`WebBridgeBehaviour` 转发。
- **桩与冒烟**：`make-stub-unity.mjs` 会说新协议（`scene:enter{taskType:8}` 自动发清单、`__WSU3_STUB_HOVER__` 驱动口、`view:focus` 记录到 stub state）；冒烟新增第 2c 节 **7 条断言**（成树 / 浮标出现与定位 / 移出消失 / 出站 `view:focus` / 选中态），**64 → 71 项全过**。过程中修掉一个真 bug：`TaskView` 的 handlers 漏接 `onParts` / `onHover`（部件树能渲染纯属后到消息顺带刷新的光，浮标永远不会出现）。
- **Unity 编译**：2026-10-15 负责人实机确认 **0 error**（`ScenePartInventoryTests` 等新增 EditMode 见 `Assets/Tests/EditMode/`）。

### 30.3 未闭合

| # | 事项 | 现状 |
|---|---|---|
| a | **EditMode 全量重跑**（新增 `ScenePartInventoryTests` 5 条 + 出站契约闸扩到 12 条） | 编译已过，测试待负责人在 Test Runner 里跑一遍 |
| b | **实机 Play 验收**：进结构站看部件树渲染、悬停浮标跟随、点行高亮 —— 与 `TODO.md` D-24 的实机端到端合并做 | 待真 WebGL / Play |
| c | **镜头推进**：`view:focus` 的 `animate` 目前只影响日志（P2-6 接） | 未做 |

---

## 31 第十八轮（2026-10-15）：待拍板批量收敛（DEC-134 ~ DEC-146）

**背景**：`TODO.md` §1/§2 里累计 17 条等负责人拍板，2026-10-15 一次性答完（原文见对话记录）。本轮把答案固化、`TODO.md` 收敛为"只保留未确定与明确要做"（D-07 的口径），可实施的当场实施。

| # | 决定 |
|---|---|
| **DEC-134**（T-01 ~ T-05，检视页与材质口径） | ① 环境取**影棚 HDRI**（Studio White Umbrella）为默认（现状已是默认，决策固化）；② 无 mask 材质常数 **metalness = 0 / roughness = 0.5**，**移除 `doubleSided`**，**不**另出 metallicRoughness 贴图；③ `CombinationSwitch08` 维持现状（不透明正确，此前已拍板，不再处理）；④ **`SpeedRelay01` 改 Coat**；⑤ 预制体内置图元维持现状不搬。审核页与产品侧**各改各的**（DEC-140：不抽公共模块） |
| **DEC-135**（T-06，微信三件） | 微信真机实测 / 亮色默认主题 / 包体预算门禁 —— **全部暂缓不做**（待设备与真产物） |
| **DEC-136**（T-08，原理页完成语义） | **进入即完成**：进入 Principle 站即发 `principle:done`，**不等**视频 `ended`（推翻"看完才算"的候选口径） |
| **DEC-137**（T-09，进度分母） | 三处分母**统一为站点线口径**（当前项目的启用任务数）；"已完成 X / 11"这类全契约分母退役 |
| **DEC-138**（T-10，结构件挂载根） | 查证 `1_Content` **没有**预摆 `StructureRoot` 节点（场景节点实测：灯光组 / Cube×6 / StructureTaskManager / TestSwitch）—— 负责人"已有相关节点"与文件实测不符，已反馈；**维持运行期自动建**（`DataStructMapping.GetStructureRoot` 的"有则用、无则建"逻辑两头都兼容，将来预摆零改动） |
| **DEC-139**（T-12 / T-13，页面样式收尾策略） | C8~C11 底部提示栏 / D1 角落 fab / 占位画布文字对比度（`--text-3`）：**维持现状，每个页面逐步调整**，不做一次性收尾（T-12 / T-13 关闭，T4 明细随之作废） |
| **DEC-140**（D-07 / D-09，文档与代码的收敛口径） | ① `TODO.md` **只保留"未确定"与"明确要做"**两类条目，历史已决即删、`RECORD.md` 留痕；② 材质解算**产品与审核页各留一份**，不抽公共模块（DEC-98 未闭合 a 关闭） |
| **DEC-141**（D-18，HighlightPlus RendererFeature） | **已挂**，实测 `High/Middle/Low-Renderer.asset` 各含 1 处 HighlightPlus feature —— 条目闭合 |
| **DEC-142**（D-19，主相机 rig） | 负责人口径"已带 brain"；**文件实测未检出**（`MainCameraRig.prefab` / `Resources/MainCamera.prefab` / 两场景 CinemachineBrain 均 0 命中，仅 FirstPersonController 引用 Cinemachine）—— 差异如实记录，**待 D-21 实机验收时核对**，本轮不改码 |
| **DEC-143**（D-27，动画运行模式的 Web 入口） | **暂缓不做**，后续会考虑（条目删除；要做时按桥消息双向各加一条 + 三处同批门禁走） |
| **DEC-144**（D-28，AB 残留） | `Assets/StreamingAssets/Content/**`（AB 时代 8 包）**移除**（`Data/**` 是内容 JSON 双份之一，保留） |
| **DEC-145**（D-30，Unity 启动时机与形态——修正负责人口径） | **无论多少个 task，只有一个 Unity 实例**：最早时机（web 服务启动后 Unity 稍延迟启动，`0_Setup` 自检通过即停在 `1_Content`）创建并**常驻**；之后由 **JS 控制把同一实例挂到当前页面容器、或隐藏**（不是"每个 task 加载一次"，也不是"预装 N 个包"）。与 D-25（实例常驻、`scene:exit` 有意义）合并推进。R6-S3 的 preload 口径与此一致 |
| **DEC-146**（D-15，零件命名来源） | 38 个零件的 `objName` / `objName_en` **从低压电器项目（TK231）找对应内容**，由 AI 填进预制体（填完重打 AA）—— 已实施（38/38，`tools/pipeline/fill-part-names.mjs`） |
| **DEC-147**（工作流，计划与待办迁 GitHub Issues） | `docs/TODO.md` / `docs/PLAN.md` / `docs/PAGE-WORKLIST.md` 的内容**整体迁往 GitHub Issues**（#30 ~ #42），三个文件改为指针 stub；**`RECORD.md` 与 `DECISIONS.md` 保留在仓库**（固化历史，不进 Issues）。新增待办/计划直接开 Issue（标题带 `[待办]` / `[计划]` / `[暂缓]` 前缀）。说明落在 `AGENT.md` §1/§3/§4/§5 与 `docs/README.md` v12 |
| **DEC-148**（#48，站点线呈现顺序） | 任务页**站点线的排列顺序不再按契约序号**，改按**来源工程 `ProjectData.cs` `ProjectClip.Tasks` 的装配顺序**：简介 → 结构 → 原理 → 检测 →（旧实验线）目的 → 仪器 → 连接 → 仿真 → 测验 → 考核（来源只读，DEC-69）。契约 `TaskType` 序号仍是**协议**权威（枚举值 / 桥载荷不变，`TASK_TYPES` 不动）；落点 `adopted-content.ts` 新增 `TASK_PRESENTATION_ORDER`，单测 + 冒烟同步。负责人 2026-10-15 指示"你来处理"（Issue #48） |
| **DEC-149**（#44，页面底图） | 产品外壳**整页铺排版稿那张底图**（负责人："就用 ui preview 里面的"）：`web/public/bg/room-dark.jpg`（1920×1080 / 123KB，RGB×0.5 已烘焙，与 `docs/ui-mockups/assets/` 同一张）；落点 `product.css` 的 `.app-root`，两层叠（面纱令牌 `--board-veil` + 照片本体 + `--bg-0`），**产品里不用 `::after`**（绝对定位层会盖到面板上）；深浅主题都由令牌决定（深色不加纱 / 亮色 42% 白纱），与排版稿 `mockup-shell.css` 同口径。规则写进 `design/07` §9，成果页第九节对照展示。负责人 2026-10-15 指示（Issue #44） |
| **DEC-150**（#45，应用图标） | 应用图标用**矢量源 + 脚本生成**：源 `electron/assets/app-icon.svg`（深色圆角方 + 插头闪电图形，图形取自产品已在用的图标库 `lucide-vue-next@1.0.0` 的 `plug-zap`，**ISC 许可**）；生成链 `node web/tools/make-app-icon.mjs`（用 web 侧已有 Chromium 光栅化 16/24/32/48/64/128/256 七档 → ICO（PNG 负载）+ 512 PNG 预览），产物 `app-icon.ico` **不手改**；接线 `electron/package.json` 的 `build.win.icon` 与 `main.js` 的 `BrowserWindow.icon`（窗口/任务栏/exe 同一份）。**临时版**（先把"没有图标"去掉），换正式品牌图标时沿用同一条生成链。负责人 2026-10-15 指示（Issue #45）。<br>**必须随包保留的版权声明**（ISC + 派生自 Feather 的 MIT 部分，全文见依赖包内 LICENSE）：<br>`ISC License — Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2026 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2026.`<br>`Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.`<br>`THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES ... (MIT 部分) Copyright (c) 2013-2026 Cole Bemis` |
| **DEC-151**（结构站画布透明：方案口径） | 结构站画布透明走 **"两台相机 + 运行时 RT + RawImage 合成"**（负责人 2026-10-15 方案讨论后拍板；**修正**：一开始以为要三台相机，实际**没有独立的"颜色相机"**）：**主相机** = 射线/交互 **+ 颜色路**（带后处理，开关归它自己），**alpha 相机** = 主相机的**子对象**且**不走后处理**、只用来出 alpha；两张 RT + 内容场景 Canvas/RawImage + **UI 材质（两张 texture2D：RGB 取颜色路、A 取 alpha 路）** 合成出带 alpha 的整幅画面（**接线全部在场景里手工挂**：负责人 2026-10-15 指定，代码不再动态创建/赋值；配方见 DEC-154）；模型按 **layer 隔离**。**其它两处口径**：① **放弃**"改 `FocusRotationControl` 预制体驱动虚拟相机 FOV"（结构站相机不动，不需要逐帧对齐）；② 相机参数对齐靠 alpha 相机挂在主相机下的父子关系（预制体里一次性对齐，实测 FOV/near/far/正交已逐项一致）。**硬约束**：额外相机**不能带 `MainCamera` 标签**（`CameraManager.GetMainCamera()` 按标签收集且会销毁多余项）；两台相机的 `culling mask` 决定"画面里可见的集合" —— **颜色路可见而 alpha 路不可见的"渲染物"合成后 alpha=0 会被整块抠掉**（代码做运行期告警，不自动改；实测配置主 `183` / alpha `128`，差异层上只有灯光/探针/管理器，安全）。**实现形态**：合成器是**一般类**（不是 MonoBehaviour），由 `CameraManager` 创建、逐帧驱动、释放。**实测**：WebGL 上下文 `alpha=true`、`premultipliedAlpha=true` 已由 Unity 自带 ⇒ **最后一公里只剩 Unity 侧**（详见 `docs/design/13` §5.5）。**未决**：alpha 取法（帧 alpha vs override 覆盖率材质）、合成目标 RawImage 的摆放与材质资产、质量项（颜色路清屏由 Skybox 改深色、超采样）。落地细节见 `docs/design/13-unity-canvas-transparency.md` |
| **DEC-152**（#49 实现，主相机后处理：结构任务必须关） | **`TaskType.Structure` 一律把主相机的后处理关掉**（负责人 2026-10-15 规定）：主相机是颜色路，而 **URP 的后处理（UberPost）会把 alpha 写死成 1** ⇒ 开着就整个画布不透明，网页侧怎么调都是黑底/不透。落点：`CameraManager.ApplyPostProcessingPolicy(taskType)`（结构 ⇒ 关；其它 / 退出 ⇒ 回 `Init` 读到的**预制体原值**），调用点 `TaskFlowManager.EnterRoutine`（`scene:enter` 后）与 `ExitRoutineCore`（退出即回默认）；用 URP 正式属性 `UniversalAdditionalCameraData.renderPostProcessing`（`WSU3.Core` 新增引用 `Unity.RenderPipelines.Universal.Runtime`）；**合成器自检"主相机后处理开着"直接告警**。⚠️ 表象陷阱（实测）：**Web 上是黑块、编辑器里却"看着是透明的"**（Game view 背后是中性底板），所以此条只能看真产物（DEC-117）。规则与排查写进 `docs/design/13` §4.4 |
| **DEC-153**（#49 实现，URP 相机 RT 的 alpha 通道） | **打开 `preserveFramebufferAlpha`**（`ProjectSettings.asset` 由 0 改 1）：URP 源码里 `needsAlphaChannel = Graphics.preserveFramebufferAlpha` 决定相机渲染目标的格式，本工程渲染器资产又是 `IntermediateTextureMode = Always` ⇒ 中间纹理按"无 alpha"分配 ⇒ **相机清屏设的 `alpha=0` 与写入的 alpha 一起被丢掉**（读回来恒为 1）⇒ alpha 路永远"不透"、画布整片不透明。这条会把"混合方式改对、后处理关掉"的努力全部吃掉，是本透明方案**第二个 alpha 杀手**（第一个见 DEC-152）。⚠️ 它的表象同样是"Web 黑块 / 编辑器看着透"。配套（**已落地**）：渲染器资产 `IntermediateTextureMode` 由 `Always` 改 **`Auto`**（无后处理的相机直接渲染进自己的 `ARGB32` RT —— 既保住 alpha，也让**编辑器里能正确显示**，因为 player setting 在编辑器下不生效）。依据与产线写进 `docs/design/13` §5.1 |
| **DEC-154**（#49 实现，合成配方与显示端清屏） | 合成 shader **取样结构与负责人给的参照工程 `ColorAlphaUIShader` 一致**（`_ColorTex` 取 RGB、`_AlphaTex` 取 A、UV 走 `TRANSFORM_TEX`、stencil/clip 同形），但**混合故意不同**：本工程用 **`Blend One Zero` + 预乘输出**。依据（实测）：① 参照那套（`SrcAlpha` + 非预乘）背景处"什么都不写"，**依赖显示端一开始是透明黑**；② 本工程两台相机都渲染到 RT、没有相机渲染到屏幕，实测**保不住**这个透明黑 ⇒ 背景保留 backbuffer 的不透明黑（黑块 + 拖影）；③ 覆盖式由我们写 `(0,0,0,0)`，不看显示端脸色，且预乘正是网页 `premultipliedAlpha: true` 要的形态。**配套**：~~显示端清屏相机（`WSU3_DisplayClearCamera`）~~ **已按负责人要求删除（2026-10-15 后续）** ⇒ 背景"什么都不写"这一支完全落在显示端，本工程不再干预；曾用 **alpha 诊断开关**（URL `?wsu3_alphaDebug=1`）实测确认 **alpha 源本身是对的**（绿 0.949/红 0.049），缺口在显示端，该开关已随实现移除、思路留档。写进 `docs/design/13` §5.2 |
| **DEC-155**（结构站相机分工改为**三台**：颜色路从主相机摘到子相机） | 负责人 2026-10-15 晚定案：`Resources/MainCamera.prefab` **新增子对象 `ColorCamera` 专做颜色路**（挂 `Color` RT 1920×1080、掩码 `183` = 55 **+ 层 7**），**主相机回到"渲染到屏幕 + 不挂 RT"**（掩码 `55`，不含模型），alpha 相机不变（子对象、掩码 `128`、`Alpha` RT）。**取代 DEC-151 的两处口径**：① DEC-151"**没有独立的颜色相机**、主相机就是颜色路"——**不再成立**；② DEC-153 配套里说的"两台取图相机"现指**颜色 + alpha**。**DEC-152 的目标相机随之更正**：结构任务要关的是**颜色相机**的后处理（`SetColorCameraPostProcessing`），**主相机的后处理不动**（它只把层 0/1/2/4/5 与清屏画到屏幕，而那一片会被合成的覆盖式写入整块盖掉 ⇒ 与透明无关）。**为什么改回来**：主相机一挂 `targetTexture`，`Camera.pixelWidth/pixelHeight` 就变成 **RT 尺寸** ⇒ `ScreenPointToRay` 折算错位、拾取整体失效（实测画布正中偏 `20.59°`，见 DEC-156）；把颜色路摘给子相机，主相机回到"无 RT"，坑自然消失。**配套落地**：`CameraManager` 新增 `GetColorCamera()`（按名字关键字 `color` 取主相机子对象，与 alpha 相机同一处取法）+ `GetPickCamera()`，`GetRgbCamera()` 改为转发 `GetColorCamera()`；模型层 = **7 `ShowObj`**（`TagManager` 新增该层名，8 个结构件预制体的零件由层 `0` 改到 `7`），**层 6 = `NoRender`**（那 6 个 `Cube` 有意不渲染 —— 定案）。**遗留**：`ColorCamera` 的 tag 实测是 `MainCamera`（从主相机继承而来），`GetMainCamera()` 现把"另一台 MainCamera 相机的后代"**忽略、不删**（`IsDescendantOfTaggedCamera()` 兜底 + WARNING）；**建议把它的 tag 改成 `Untagged`**。细节与实测读数见 `docs/design/13` §2 / §4.2 |
| **DEC-156**（三维拾取口径：**出画面的相机 + 归一化视口坐标**） | `InteractiveManager.RaycastTarget()` **不再用 `cam.ScreenPointToRay(Input.mousePosition)`**，改为 **`CameraManager.GetPickCamera()` + `cam.ViewportPointToRay(new Vector3(mouse.x / Screen.width, mouse.y / Screen.height, 0f))`**。**依据（编辑器中三组实测，fov 42；画布按浏览器实测的 942×679 代入）**：**挂了 `targetTexture` 的相机，`pixelWidth/pixelHeight` 就是 RT 的尺寸**（不是画布尺寸）⇒ `ScreenPointToRay` 会按 RT 尺寸把屏幕像素折成 NDC —— ①旧结构（主相机挂 1920×1080 RT）：画布正中偏 **`20.59°`** 且射线指到左下 ⇒ **点哪儿都不中**；②主相机（无 RT）+ `ScreenPointToRay`：正中 `0°`，但 `uv.x=0.25` 偏 `3.93°`、`0.15` 偏 `5.09°`（RT 16:9 与画布比例不同 ⇒ 越靠边越偏）；③**颜色相机 + `ViewportPointToRay`：逐点 `0°`**。**"在 Unity 里点击好用"是假象**：编辑器 Game view 实测恰好 `1920×1080` = RT 尺寸，两种写法都退化正确 ⇒ 这条只会在真产物/非 16:9 画布上暴露，症状是**点击无效 + 移入没有高光**（悬停与点击共用同一条射线）。**判据**：拾取相机 = **"出画面的那台"**（挂 RT 的那个 = 你看到的那幅画），射线只认"画面里的比例"，与 RT 尺寸、画布尺寸都无关；相机**没挂 RT** 时两种写法等价（实测 `0.00°`）⇒ **对其它任务类型零行为变化**。**不采用**"把主相机 aspect 对齐 RT"的修法（那会把主相机自己渲染到屏幕的画面拉歪，且依赖后人保持同步）。**落点**：`CameraManager.GetPickCamera()`（颜色相机缺席/没挂 RT 时退回主相机）+ `InteractiveManager`；口径写进 `docs/design/13` §4.3 / §2.4 |
| **DEC-157**（#57，页面 / 站间过渡） | **两处过渡、一套节奏**（负责人 2026-10-15 指示"页面切换需要过渡效果，现在都是瞬切，增加一个淡入淡出效果"）：<br>① **路由级** `ui-page`（`App.vue` 的 `<router-view v-slot>` + `<Transition mode="out-in">`）—— 启动/登录/目录/任务页之间换整视图，**只淡入淡出、不带位移**（换的是整屏含整页底图，位移会把底图一起挪、边沿露出底色缝）；用 `out-in` 是因为换的是**不同组件**，两屏共存会把两套外壳（浮卡 + 站点线）叠在一起。<br>② **站间级** `ui-station`（`TaskView` → `AppShell` 的 `.app-main__body`）—— 沿站点线翻站只换主内容区，外壳留在原地，同节奏 + **6px 位移**。<br>**节奏只认令牌**（`tokens.css` §22）：`--dur-page: 160ms`、`--ease-page: cubic-bezier(.4,0,.2,1)`、`--page-shift: 6px`；类名与用法见 `components.css` §22。「减少动态效果」由 `components.css` §20.6 的**全局** `prefers-reduced-motion`（时长压到 0.01ms）兜底，令牌不再给一份媒体查询。<br>⚠️ **站间过渡不能用 `out-in`**（实测踩到并已改）：`out-in` 会把新内容推迟到离场结束（160ms）之后才创建，而任务页的挂载逻辑是「`watch` → `nextTick` → 往模板 `ref` 的容器里挂视口」（Three 的 `Viewer`、Unity 搬挂点、`<video>` 都这样）—— 实测后果是 **Unity→Three 切回时画布重建失败**、**原理页卡在"载入中"**（冒烟两条既有断言当场红）。改为**两份短暂共存 + 离场层脱流**（`.ui-station-leave-active { position:absolute; inset:0; pointer-events:none }`）的交叉淡入淡出，新 DOM 在同一个 patch 里就位。源码依据：`unmount()` 同步置空 `ref` 并把新 `ref` 排进 post-flush ⇒ 同一 patch 内"先卸旧、后挂新"后 ref 指向新元素。<br>🔴 **Unity 画布红线**（DEC-145 的延续）：常驻实例的画布**不许**跟着淡出再淡入。落点是一个纯函数 `domain/page-transition.ts` 的 `stationKeyOf()`：**Unity 站共用一个恒定 key**（结构 ↔ 检测 ↔ 电路连接 ↔ 仿真实验 之间不换 key）⇒ Vue 不触发过渡、不重建 DOM，画布原地不动；非 Unity 站逐站一个 key；跨栈翻站 key 必然不同 ⇒ 走过渡（此时画布本来就要搬进/搬出，淡入淡出是期望行为）。单测把这条不变量钉住（`page-transition.spec.ts`：全部 Unity 站共键 / 非 Unity 站不共键 / 跨栈必不同），并在注释里写明"不要优化成 `station:<taskType>`"。<br>**落点清单**：`web/src/App.vue`（路由级）、`web/src/components/AppShell.vue`（新增 `transition` / `transitionKey` 两个 prop，包裹层 `.app-main__body` **故意不定位** —— `.ui-tips-float` / `.ui-mask` 的定位祖先必须仍是 `.app-main`）、`web/src/domain/page-transition.ts`（+ 单测）、`web/src/styles/product.css`（`.app-main__body { height: 100% }`）、`tokens.css` §22、`components.css` §22。<br>**评审可见**（硬纪律）：成果页新增"页面过渡"一节（`style-spec.mjs`），静态页用**同一对令牌**的循环动画演示（`mockup-shell.css` 的 `.spec-motion*`，评审外壳专用）；重新生成后 **只有 `index.html` 变动**（29 页零漂移）。<br>**连带纪律（冒烟）**：换页多了 160ms 级过渡之后，"点一下 + `waitForTimeout(400)` 再读页面"不再可靠（CI 实测红了两条既有断言：欢迎页主按钮、登录页游客入口）。冒烟改为**过渡感知的等待**：`settle(page)`（先等过渡出现、再等它收干净 —— hash 路由的 `push` 是异步的，只等"过渡类消失"会在导航还没起来时误判为稳定）与 `quiet(page)`（装过渡探针前先收干净，避免把上一屏的离场层记进这一轮）。同时给冒烟加了 **GitHub 注解出口**（失败断言/中断各发一条 `::error`）：CI 上只看到 `exit code 1` 的问题就此解决 —— 哪一条失败、读数是什么，在 PR 的 Checks 面板即可读。<br>⚠️ **待负责人拍板**（Issue #57 原文要求）：过渡类型与时长（本条按"淡入淡出 + 极短位移 + 可被系统偏好关闭"的暂定口径实施），如要改节奏只动 §22 三个令牌 |
| **DEC-158**（#64，结构站画布透明需求**撤销**：回到单个 `MainCamera`） | 负责人 2026-10-15 指示："原本是为了 Unity WebGL 在 Web 页面中可以透明，我们现在不要这个需求了 ⇒ 一个 MainCamera 就可以了，Canvas / RawImage 什么的都移除掉"。**撤销 DEC-151 ~ DEC-156 的整套方案与 DEC-152 的"结构任务关后处理"规定**（原条目**不改**，撤销由本条承载）。**落地形态**：① `Resources/MainCamera.prefab` 删 `ColorCamera` / `AlphaCamera` 子对象 ⇒ **只剩一台相机**（tag `MainCamera`、掩码 `55`、无 `targetTexture`、清屏回预制体原值 `Skybox`）；② `1_Content` 删 `OutputCanvas` + `RawImage`；③ 删资产 `Color.renderTexture` / `Alpha.renderTexture` / `AlphaComposite.mat` 与 `Assets/Shaders/UI/` 三份合成 shader（含参照版 `ColorAlphaUIShader`）；④ **层隔离撤销**：8 个结构件预制体的零件 `m_Layer: 7 → 0`（共 207 个对象），`TagManager` 去掉 `ShowObj` 层名（层 6 `NoRender` 保留 —— 那 6 个 `Cube` 仍**有意不渲染**）；⑤ **脚本**：`CameraManager` 回到只有 `Init / OnDespose / GetMainCamera`（删 `GetColorCamera / GetRgbCamera / GetAlphaCamera / GetPickCamera / FindCameraByKeyword / ApplyPostProcessingPolicy / SetColorCameraPostProcessing / ReadColorCameraPostProcessing` 与"另一台 MainCamera 后代的兜底"），`TaskFlowManager` 删两处策略调用，`InteractiveManager` 拾取回 `GlobalManager.MainCamera` + `ScreenPointToRay`（DEC-156 的归一化视口写法**不再需要**：单相机不挂 RT 时两种写法等价），`WSU3.Core.asmdef` 去掉 `Unity.RenderPipelines.Universal.Runtime`；⑥ **文档**：删 `docs/design/13`（原文见 git 历史 `cddf798`；DEC-151 ~ DEC-156 里指向它的引用按**历史引用**看待）、`docs/README.md` 索引行、`README.md` §1/§3、`design/06` 的 `preserveFramebufferAlpha` 行；⑦ **web**：删 `tools/verify-unity-transparency.mjs` 与 `npm run verify:unity`（`tools/lib/png-stats.mjs` 保留，`render-smoke` 仍用）。**保留不动**：渲染器 `IntermediateTextureMode = Auto`（本就是 URP 默认，单相机无副作用）、WebGL 明确 OpenGLES3 + 关 GraphicsJobs、质量档 `High`、`0_Setup` / `1_Content` 的环境（`AmbientMode` / 天空盒）—— **三维区背景口径**另开 **Issue #65**（画布不再透明后看到的就是 Unity 清屏）；`docs/research/11`（WebGL 透明背景调研）作为**调研档案**保留。**未做**：真 WebGL 产物**未重出**（并入 Issue #59 的交付态一起）⇒ 本次改动**没有真产物证据**（DEC-117 的验收口径） |

---

## 32 第十九轮（2026-10-16）：主题同步与结构站三维区背景口径（DEC-159 ~ DEC-160）

**背景**：负责人 2026-10-16 先看结构站背景板（Issue #65）后指示："unity 和 web 增加一个事件：web 切换亮色暗色，unity 也需要知道；然后 maincamera bg 材质根据事件来替换。现在这个暗色的 OK，再来一个亮色的。" 同批定了范围：**不加入口、只做机制**。

| # | 决定 |
|---|---|
| **DEC-159**（#69，主题同步：`ui:set-theme` + 背景板换材质） | ① **契约**：新增桥消息 **`ui:set-theme`**（追加到 Web→Unity 组**末尾**，载荷 `{ theme: "dark" \| "light" }`）；三处同批（`web/src/contracts/bridge.ts` / `content/contracts/snapshot.json` / `NewStructureUnity/Assets/Scripts/Contracts/BridgeMessageType.cs`），取值另在两侧各留一份镜像常量（`web/src/contracts/bridge-payloads.ts` 的 `BridgeTheme` ←→ 新增 `NewStructureUnity/Assets/Scripts/Contracts/ThemeKind.cs`）—— 放在 Contracts 而不是 Web 层，是因为**消费端在 Core**（`CameraBg`），而 Core 不能引用 Web 层。② **Web 侧纪律**：`UnitySession.setTheme()` **幂等**，且**握手之前只记不发、握手后补发**（与 `input:enable` 同一条理由：Unity 侧材质默认是**深色板**，页面是亮色时不补发就会看到反色背景）；触发点用既有 `theme` ref —— 在 Unity 宿主 `TaskView.vue` 里 `watch` + 挂载时补一次，**`shell/theme.ts` 零改动**。③ **Unity 侧**：`WebBridgeBehaviour.Dispatch` 新 case → `EventBus<ThemeChangedEvent>` → `CameraBg.ApplyTheme()` 换 `MeshRenderer.sharedMaterial`（并同步本类缓存的 `material` —— 它按材质读 `_CutTex` / 写背景图，留旧的会静默失效）；**认不出的主题 / 那个主题没配材质 ⇒ 只告警、保持原材质**（换成 null 会让整块背景消失，把观感问题升级成画面问题）。④ **材质**：新增 `Assets/Materials/Background/CamBgGradientLight.mat`（中心 `#f8fafc` / 边缘 `#cfd8e3`，取页面亮色令牌 `--bg-2` / `--bg-0`；与暗色板同构：中心亮、四角暗），两枚材质走 **prefab 上的序列化引用**（不走 `Resources`、不走 Addressables 全局包 —— 后者登记表当前为空）。⑤ **范围外（本批不做）**：主题切换**入口** —— 产品现状是 `shell/theme.ts` 的 `toggleTheme()` **没有调用方**、`stores/progress.ts` 的 `settings.theme` 与主题真源**互不联通**；本次只落"跟随机制"，验证走 URL `?theme=light` 或 localStorage `wsu3.theme`。⑥ **样式成果页（硬纪律已核）**：本次**不新增任何令牌或组件类**（复用既有 `data-theme` 机制），故 `docs/ui-mockups/index.html` 无需变动。**证据**：Unity EditMode **79/79**（新增 1 条入站用例 `UiSetTheme_CarriesTheThemeName`）；**Play 实测**（真事件路径：`dark → 收到 light` 换到 `CamBgGradientLight`，收到未知主题 `high-contrast` 材质不变且 Console 只有一条告警）；web `lint` / `format:check` / `typecheck` 通过、vitest **135 passed**；四道仓库门禁通过（契约 **27** 条桥消息） |
| **DEC-160**（#65，结构站三维区背景口径：背景板 + 距离 10 的依据） | ① **口径**：结构站三维区背景 = 主相机子物体 **`BgPlate`**（内置 Quad + `CameraBg`，local `z = 10`，`Cull Off` + `ZWrite On` 的**不透明 unlit 径向渐变板**，shader `WSU3/Background/CamBgGradientUnlit`），随 `ui:set-theme` 在两枚材质之间换（DEC-159）。**天空盒与 `1_Content` 的环境维持现状不动**（相机清屏仍是预制体原值 `Skybox`）—— 板子把它整块挡住，同时给"板子缺席"留了兜底。② **"距离 10"的依据（Play 实测，并更正一条我方的早期误判）**：结构站的相机**不是** `0_Setup` 里那个静止摆法（`z = -11.1` —— 那是**编辑态**的摆法，也是我最初据以判断"10 会挡住模型"的那个读数，**该判断不成立**）；真实取景由**器件预制体自带的 Cinemachine vcam** 决定：8 个结构件预制体各带一台 `Virtual Camera`（priority 10，local `(0, 1.08, -4.66)`，8 份逐字符相同），`CinemachineBrain` 生效后把主相机拉到该位姿 ⇒ **相机到模型 ≈ 4.78 单位**；模型包围盒沿视线的最近 / 最远点为 **4.46 / 5.20** ⇒ 板子在 10 处，位于模型**后面**约 5 个单位，**不挡模型**（Play 截图核对通过：器件正常可见）。板子是相机**子物体** ⇒ 相机怎么动它都跟着，取景关系恒定。③ **顺带更正 DEC-142 的"未检出 `CinemachineBrain`"**：预制体按 **GUID** 存脚本，按文本搜 `CinemachineBrain` 字样必然 0 命中；Play 实测 Brain 在位且生效（细节写进 `docs/design/11` §5 的第 1 条更正）。④ **仍开放（本条目不覆盖）**：#65 的第 2 问"**页面是否给视口铺底色**"（`.app-viewport` 现在不铺，底色靠 `.ui-panel` 毛玻璃）与第 3 问"与 #59 交付态 WebGL 设置的关系（真产物是否重出）"，故 **Issue #65 是否关闭由负责人定** |
| **DEC-161**（#35 / D-20，相机背景板取图入口**不做**） | 负责人 2026-10-16 指示：D-20「相机背景板取图入口未接」**这个需求不用了**。**依据与影响**：① 结构站三维区背景已改为**程序化径向渐变板**（DEC-160）—— 不需要任何背景图，搬运进来的 `CamBg.mat` 那套 `_Texture_1 / _Texture_2 / _TexOrColor / _CutTex` 双纹理口径**没有消费方**；② 搬运产物（`Assets/Prefabs/Camera/MainCameraRig.prefab`、`Assets/Model/Public/Materials/CamBg.mat`、`Assets/Shaders/Models/CamBgUnlitShader.shadergraph`）**原样留存**，`CameraBg.LoadBgTextures()` 保持桩的形态（启动告警一次、不做静默降级），**不再计划接取图入口**；③ `docs/design/12` §9 第 1 条的口径由"遗留未闭合"改为"**有意不做**"—— 全局包登记表仍为空，其中"背景包"这一项从此**不欠**；④ 将来若确实要贴图背景板，**另开新 Issue 走新口径**，不复活本条。**落地**：`docs/design/11` §5 第 2 条、`docs/design/12` §9 第 1 条加注；DEC-107 的未闭合清单里这一项就此闭掉。**证据**：Issue #35 关闭（附理由）+ 本批 docs PR |
| **DEC-162**（#36 / D-21，操控层实机验收**本期不做**） | 负责人 2026-10-16 决定关闭 Issue #36（原话"36 可关"）：D-21「角色预制体与相机 rig 进 `1_Content`，逐条验移动 / 俯仰 / 缩放 / 瞬移 / 聚焦环绕」**本期不做**、不再占用待办。**其中 D-19 那半已有结论**：Play 实测主相机**带 `CinemachineBrain` 且生效**，场景里确有一台 vcam —— 它由**器件预制体自带**（8 个结构件预制体同为 local `(0, 1.08, -4.66)`，priority 10），主相机跟着它走；DEC-142 的"未检出"据此**更正**（预制体按 GUID 存脚本，按文本搜字样必然 0 命中），详见 `docs/design/11` §5 与 DEC-160。**未做的部分如实记录**：实测场景内 `FocusRotationControl` / `InputControllerBase` 实例数**均为 0** ⇒ 操控层"代码与资产在位、没进场景"，四条验收一条都没跑过。**将来若确认操控层是本产品的必需能力，另开 Issue 重新评估**（本轮不做不等于永久不做）。**证据**：Issue #36 关闭（附核对结论）+ 本批 docs PR |
| **DEC-163**（#73 / T1，A5 菜单页：方案收敛为唯一候选 v1 + ②③⑦⑧ 废案处置） | 负责人 2026-10-16 拍板：**A5 菜单页只保留一个候选方案 —— v1 水平环形伪三维卡片（旋转木马）**；② 节点散射 / ③ 六边形蜂窝 / ⑦ 档案抽屉 / ⑧ 探照灯取景器 **全部废案**。**这意味着上一轮"五案各出一页、并存供看形态"的口径结束**（那五页已实现并实测通过，其设计契约文档由本次重写覆盖为**方案文档**：只写机制、已拍参数、冲突与待确认，不再冻结类名 / DOM / 骨架）。**① v1 的机制随之更正**：从"9 张卡沿**水平轴**排开、`perspective()` + `translateZ()` 近大远小、居中者得焦点"改为"卡片沿**水平圆周**排成一圈（旋转木马），前后遮挡、左进右出、焦点卡在前方正中，靠**旋转环**切换焦点"。**② v1 的已拍参数**（D1~D10，逐条见方案文档 §3.3）：水平圆环 / 环大于视口只露前方 5~6 张 / 手动拖拽 + 松手吸附 + 键盘 ←→ 移焦点 / 惯性滑行 + 停后吸附 / 远端**尺寸 + 模糊 + 透明度三项同时**衰减 / "父层级模糊"= **卡片作为一层整体变糊变透**（不是卡内分层、不是整排一起糊）/ 键盘 ←→ 移一格（环闭合）+ Enter 进入 / ②③⑦⑧ 废案 / 上一轮"滚动响应限制"口径**作废**（"节点位置算法找参考"随 ② 一并失效）。**③ 废案页面处置：可以删除、也可以标记**（原文"可以删除 可以标记"），**第三批已选定"标记即可"**（D20 / DEC-165：保留在盘、**不删除**）；唯一约束是：**不得静默处理** —— 标记必须留下可追溯的落点（"已废弃"这一语义，`todo-mark` 的"待重做"语义**不可复用**），且**成果页上"已废弃"这件事必须可见**（否则撞"看不到的样式算未完成"的硬纪律）。**④ 连带必做**（实现阶段）：指向"五方案"的 6 处悬空引用（`components.css` 段注、`style-spec.mjs` 段注 / 成果页"五个方案"节 / `pageIndexGroups` 的 E 组、`render.mjs:151` 段注）与页数口径（现 34）随删 / 标一并校正。**⑤ 保留不动**：共享的**进度环**组件（五页复用的公共件，本轮 v1 仍可继续用）**不算废案专属**；②③⑦⑧ 各自专属的布局件类同废案一并处置。**依据**：`docs/design/13-a5-menu-redo-contract.md`（方案文档，本次重写）+ `docs/ui-mockups/TODO.md` T1（第 8~12 行）。**未做**：未删任何文件、未改任何页面 / 样式 / 生成器（留待实现阶段） |
| **DEC-164**（#73 / T1，A5 环形方案的 reduced-motion：**忽略时长压缩**） | 负责人 2026-10-16 拍板：**菜单卡片的动画不受"全局把时长压到 0.01ms"那条兜底的限定**。**已知的机械约束（如实记录）**：那条兜底是**带 `!important` 的通配选择器**（`docs/ui-mockups/components.css:913-919`：`*, *::before, *::after { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; animation-iteration-count: 1 !important }`）⇒ **任何局部选择器都盖不过它**；要让菜单卡片"忽略限定"，实现上只有两条路：**① 在该媒体查询里给菜单卡片开一个具名豁免并加 `!important`**（"不要各自写媒体查询"的纪律仍守），或 **② 改这条全局兜底本身**（会全站 34 页一起变，风险最大）。**走哪条、豁免范围多大（是"环的惯性 / 吸附"还是"整页所有动效"）属设计阶段定，本条目只记负责人已拍的方向**：菜单卡片的动效不被该档压缩。**⚠️ 本条与规则文件的既有纪律存在张力**（规则原文要求"不要再各自写媒体查询"，做法是在既有那份媒体查询下**换布局 / 换交互**）——张力已如实登记在方案文档 §3.7 C1 与 §6-23，**落地前不要把它读成"可以随手加媒体查询"** |
| **DEC-165**（#73 / T1，A5 环形方案的第三批细节口径：D13~D22） | 负责人 2026-10-16 逐条给口径（原文：**朝向"面向视口"／悬停"暂停惯性"／工具条"先保留 后续可能删"／并列语义"认可"／reduced-motion"单开豁免 menu 比较特殊"／废案"标记即可"／衰减曲线与下限"让设计定"／窄屏"改垂直滚 也是环"／并列原则入档"可以"／选中态与描边冲突"给设计来 是个观感问题"**）。落成：**D13 卡片始终面向视口**（连带 **C2 发丝在斜面忽粗忽细、C3 圆角被透视拉伸两条冲突随之不成立、结案**）· **D14 悬停即暂停环的惯性**（防误触进入）· **D15 A5 工具条先保留**（搜索 / 状态筛选 / 去漫游 / 我的成绩；后续可能删）· **D16 窄屏改垂直滚、"也是环"**（是 D1 水平圆环的**降级形态**，不是新方案；←/→ 是否改 ↑/↓ 属设计对齐）· **D17 远端衰减曲线与下限交设计阶段定** · **D18 并列语义论证负责人认可**（←/→ 邻接 = **观看顺序**、不是内容顺序）· **D19 reduced-motion 走"单开豁免"**（**不动** `components.css:913-919` 那条全局兜底；豁免类名与作用域留设计阶段；与"不许各自写媒体查询"的纪律张力仍记在 DEC-164）· **D20 四个废案页面"标记即可"**（保留在盘、打"已废弃"标记，**不删除**；不得静默处理、"已废弃"语义不可借用 `.todo-mark` 的"待重做"、成果页上必须可见）· **D21 并列原则可以入档**（"目录 = 并列展示 + 筛除线"写成长期规则）· **D22 焦点卡选中态与描边规则的并存交设计阶段**（观感问题）。**转设计 / 实现阶段的收尾项**（都不是负责人待定）：最小命中尺寸沿用 44×44、只剩"远端卡片是否允许小于 44"；触控手势冲突实测；性能预算实测；标记的具体写法与连带项（6 处"五方案"引用、成果页那一节、页数口径 34）由实现阶段改。**依据**：`docs/design/13-a5-menu-redo-contract.md` §3.3b.1（D13~D22）与 §6（逐条对应） |

---

## 33 第二十轮（2026-10-16）：A5 菜单页方案收敛（DEC-163 ~ DEC-165）

**背景**：上一轮 A5 走的是"五个候选方案各出一页、并存供负责人看形态"（① 伪三维卡片滚动 / ② 节点散射 / ③ 六边形蜂窝 / ⑦ 档案抽屉 / ⑧ 探照灯取景器），五页已实现并实测通过，设计契约文档落 `docs/design/13`。负责人 2026-10-16 分三批收口：**第一批**只留 v1、且机制改为"水平环形伪三维卡片（旋转木马）"；**第二批**定了 reduced-motion 档下菜单卡片的动效口径（不受时长压缩限定）；**第三批**（DEC-165）逐条给了环形方案的细节口径（朝向 / 悬停 / 工具条 / 窄屏 / 衰减 / 豁免落法 / 废案处置 / 入档 / 选中态）。方案文档（重写覆盖 `docs/design/13`）是决策的展开与出处，本节把它固化成决策。

| # | 决定 |
|---|---|
| **DEC-163** | **A5 只留一个候选（v1 水平环形伪三维卡片）**，②③⑦⑧ 全部废案；v1 机制由"水平轴排开"更正为"水平圆周排开（旋转木马）"；已拍参数 D1~D10 见方案文档 §3.3；**废案页面可以删除、也可以标记**（不得静默删除；"已废弃"语义不可用 `todo-mark` 的"待重做"；成果页上这件事必须可见）；连带 6 处"五方案"悬空引用与页数口径随删 / 标一并校正 |
| **DEC-164** | **菜单卡片的动画不受全局 `prefers-reduced-motion` 时长压缩的限定**；机械约束（全局兜底是带 `!important` 的通配选择器，局部盖不过）与两条可行的落法如实记录；**落法已定 = 单开豁免（DEC-165 的 D19）**：不动全局兜底，仅菜单页具名豁免；豁免类名与作用域留设计阶段 |
| **DEC-165** | **第三批细节口径 D13~D22**：卡片**始终面向视口**（⇒ 发丝斜面、圆角透视两条冲突结案）/ 悬停**暂停惯性** / 工具条**先保留**（后续可能删）/ 窄屏**改垂直滚、也是环**（水平环的降级形态）/ 衰减曲线与下限**交设计** / 并列语义论证**认可** / reduced-motion **单开豁免** / 废案页面**标记即可（不删除）** / 并列原则**可以入档** / 选中态与描边冲突**交设计（观感问题）** |
| **DEC-166** | **长期规则：目录 = 并列展示 + 筛除线**（D21「并列原则可以入档」的落档，2026-10-16 实现阶段落盘）。**规则正文**：① 目录 / 索引一类的页面是**并列展示** —— 条目之间没有先后、没有依赖、没有强弱；② 邻接（←→ 或上下）若存在，语义只能是**观看顺序**、**不是内容顺序**（同一组条目循环，转到头与转到尾回到同一组）；③ **不画弧线箭头**、**不写「下一个项目」这类文案**；④ **位置与尺寸只表示"当前在看哪一条"**，不得编码权重（排位 / 分档 / 远近强弱一律不做）；⑤ 不画条目**之间**的连线。**筛除线（满足即出局，S1~S4 逐字沿用需求原文）**：**S1** 推进箭头（流水线 / 时间带 / 看板）、**S2** 条目之间的连线（接线图、散射节点的边）、**S3** 排位（排行榜 / 大小分档 / 远近分档）、**S4** 强制顺序（关卡 / 解锁链 / 逐级开放）；**S2 的边界照旧**：只筛"条目与条目之间的边" —— "当前在看哪一格"是观看关系、不在筛除线内；站点线画的是**同一个条目内部**的站与站，也不在筛除线内。**适用范围**：本仓库所有目录 / 索引 / 候选陈列（含 `docs/ui-mockups` 成果页的页面索引与今后新增的目录页），新方案在动手前先按 S1~S4 自查一次。**本轮已按本条落地**：成果页页面索引的 E 组标题改为"唯一候选 = 水平环形 + 历史留档（四个废案页）"，候选不再并列陈列，四个废案页的索引注记逐页写明"已废弃"；废案页本身也逐页挂了"已废弃"徽章（**保留在盘、不删除**，只作反面参照）。**语义承载件不用新样式**：用 `.ui-badge--info`（在册 / 唯一候选）与 `.ui-badge--warn`（已废弃）两枚**既有**徽章承载，不新增类、不改框体规则（依据 `docs/design/07-frame-style-rules.md`）。**废止与"待重做"必须用不同语义**：`todo-mark` 是"待重做"，不得借用（DEC-163 / DEC-165 的 D20）。 |

> **与规则文件的张力（未闭合）**：规则原文的纪律是"**不要再各自写媒体查询**"，做法是"在既有那份媒体查询下**换布局 / 换交互**，而不是加时长"。DEC-164 / DEC-165(D19) 的方向与这条纪律不同（它要的就是"时长不被压"，走具名豁免）。**处置**：规则文件的相应条目与全局兜底**本轮都不改**，张力登记在方案文档 §3.3b.1 / §3.7 C1 与 §6-23 已结案行，**由设计阶段在落豁免时按"具名 + 最小作用域"处理**。
