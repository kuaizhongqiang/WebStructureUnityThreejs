# 页面工作清单（Page Worklist）

> 读者：AI 与人｜状态：2026-10-12 v0（**待你审**）｜性质：**工作清单 + 打勾跟踪**，不是决策（决策在 `DECISIONS.md`）。
> 来源：两个只读参考工程的实测盘点 —— `SensorSimulationTrainingSoftware_v1.0_2026`（产品页范式）与 `MCV_Module_0928`（状态分层与装配契约）。

## 0 先把差距说清楚

| | 现在跑起来的页 | 参考产品 |
|---|---|---|
| 内容 | 我在 `web/` 里搭的**技术骨架**：一个 `SceneState` 按钮条 + 一个 `TaskType` 清单 + 一个 three 网格 | 一套完整教学软件界面 |
| 页数 | 2 个（首页 / 任务页） | Sensor：**22 个面板**（6 任务页 + 16 非任务页）；MCV：**6 个 Canvas + 21 个 Panel** |
| 来源 | 我自己设计的演示页 | 与参考**没有对应关系** —— 这正是你说的问题 |

**为什么会这样**：`DECISIONS.md` DEC-03 把本期范围定成"架构骨架 + 1 个端到端示例"，我按这个做，结果做出了"能证明双线分工跑通"的最小演示，**没有照产品页做**。现在补上这份清单，把骨架转成产品页。

**处理办法（建议）**：
1. 现有 2 个演示页**不要删**，移到 `/#/debug`，作为"骨架自检页"（冒烟测试也靠它）；
2. 产品页另起路由结构（本清单 §1~§3），首页变成欢迎/开始页。

## 1 页面清单（按参考工程归纳，共 6 组）

### A 组 · 启动与导航（纯 DOM，Vue 实现）

| # | 页面 | 归属 `SceneState` | 参考来源（已实现可参考） | 要素 | 状态 |
|---|---|---|---|---|---|
| A1 | 欢迎/开始页 | `Start` | MCV `StartPanel` ✅ / Sensor `StartPanel` 空壳 | 软件名/中英文/开始按钮 | [ ] |
| A2 | 登录页 | `Login` | MCV `LoginPanel` ✅ / Sensor `LoginPanel` ✅（流程未接线） | 账号/密码/游客入口/角色下拉 | [ ] |
| A3 | 加载过渡页 | 常驻 | MCV `LoadingPanel` ✅ / Sensor `LoadingPanel` ✅ | 进度条 + 百分比 + 呼吸动效 | [ ] |
| A4 | 画质/首次设置 | `Start`（首启弹窗） | MCV `RenderQualityPanel` ✅ / Sensor 同名 ✅ | 标清/高清/超清 + 硬件提示 | [ ] |
| A5 | 菜单/项目列表页 | `Menu` | MCV `MenuPanel` ✅ / Sensor `MenuPanel_Content` ✅ | 项目按钮列表 + 退出 + 去漫游 + 看成绩 | [ ] |
| A6 | 漫游大场景页 | `Roaming` | Sensor ✅（`RoamingCanvas` + 漫游底部提示 + 点选物体浮窗）/ **MCV 整条链缺失** | 漫游底栏、物体信息浮窗、点物体进项目 | [ ] |
| A7 | 常驻：顶部标题栏 | 常驻 | MCV `ContentFunctionPanel` ✅ / Sensor `TitlePanel` ✅ | 标题/中英文/版权/返回 | [ ] |
| A8 | 常驻：通用模态框 | 常驻 | MCV `DialogPanel` ✅ / Sensor `DialogPanel` ✅，**含事件回传链** | 返回/退出/跳转/提交四类确认 | [ ] |
| A9 | 常驻：沉睡/唤醒遮罩 | 常驻 | Sensor `SleepTipsPanel` ✅ | 无操作 N 秒后遮罩 | [ ] |
| A10 | 常驻：AI 助理浮窗 | 常驻 | Sensor `AiDialogPanel` 有代码缺 prefab / MCV 同 | 对话气泡 + 输入框 | [ ] |

### B 组 · 项目内主页面（`SceneState = UI`）

| # | 页面 | 参考来源 | 要素 | 状态 |
|---|---|---|---|---|
| B1 | 项目内容页壳 | MCV `ContentCanvas` ✅ / Sensor `ContentCanvas` ✅ | 标题栏 + 功能条 + 页签栏 + 任务页插槽 | [ ] |
| B2 | 任务页签栏（11 个 TaskType） | MCV `TaskListPanel` ✅ / Sensor `TaskListPanel` ✅ | 页签切换 → 重建任务页 | [ ] |
| B3 | 任务切换资产加载遮罩 | Sensor `LoadingAssetsPanel` ✅ | 切换时遮罩 + 进度 | [ ] |
| B4 | 底部/角落操作条 | MCV `ContentFunctionPanel` ✅ / Sensor `RightUpPanel`+`LeftBottomPanel` ✅ | 返回目录 / 打开菜单 | [ ] |
| B5 | 步骤提示 + 操作提示栏 | Sensor `TipsPanel` ✅（双缓冲切换）| 步骤提示、操作提示、图文 | [ ] |

### C 组 · 任务页（按 `TaskType`，**技术栈由 DEC-06 决定**）

> ⚠️ **关键差异**：参考工程（Sensor / MCV）**全部用 Unity 做这些页的视图**；我们按 DEC-06 把其中 7 个判给 Three.js，**这 7 个等价视图要用 three 重做**，不能照抄参考工程实现。

| # | `TaskType` | 技术栈 | 参考实现情况 | 要素（照参考归纳） | 状态 |
|---|---|---|---|---|---|
| C1 | `None` 空类型 | Three | MCV `TaskDefaultPanel` 空壳（设计即占位） | 占位/无操作 | [ ] |
| C2 | `Purpose` 任务目的 | **Three** | Sensor `Task_PurposePanel` ✅ / MCV 半接线 | 3D 模型循环动画 + 图文说明 + 跳过 | [ ] |
| C3 | `Equipment` 实验仪器 | **Three** | Sensor ✅ / **MCV ✅「最佳样板」** | 左仪器列表 + 中 3D 可交互 + 右图文 | [ ] |
| C4 | `Principle` 实验原理 | **Three** | Sensor 半（视频字段）/ MCV 半 | 图文 + 原理动画/视频 | [ ] |
| C5 | `Test` 小测验 | **Three** | Sensor `Task_TestPanel` ✅（题目控件）/ MCV 空壳 | 题干/选项/提交/对错反馈 | [ ] |
| C6 | `Info` 简介 | **Three** | MCV 半（有字段无写入方） | 图文 | [ ] |
| C7 | `Exam` 考核 | **Three** | MCV 空壳（`ProjectState.Exam` 不可达） | 抽题/计时/交卷 | [ ] |
| C8 | `LineConnection` 电路连接 | **Unity** | Sensor ✅（`WiringElement`，步骤驱动）/ MCV 空壳 | 全屏画布 + 工具条 + 接线点/引线 | [ ] |
| C9 | `Training` 仿真实验 | **Unity** | Sensor ✅（`SimulationTraining`）/ MCV 空壳 | 全屏画布 + 步骤面板 + 操作提示 | [ ] |
| C10 | `Structure` 结构 | **Unity** | MCV 半（浮动提示未实现） | 部件树 + 爆炸/高亮 | [ ] |
| C11 | `Inspection` 检测 | **Unity** | MCV 空壳（控制器只 Warning） | 仪表读数 + 测量步骤 + 计分 | [ ] |

### D 组 · 考核与结算

| # | 页面 | 参考来源 | 要素 | 状态 |
|---|---|---|---|---|
| D1 | 成绩结算/提交页 | Sensor `ResultSummitPanel` ✅ | 学号/班级/姓名/项目/完成情况/成绩/起止时间/用时 + 提交 | [ ] |
| D2 | 题目控件（被 C5/C7 复用） | Sensor `QuestionElement_Test` / `QuestionPanelBase` ✅ | 题号/题干/图片/选项/答案/得分/提交 | [ ] |
| D3 | 答题结果反馈 | Sensor `Question_RightICO/WrongICO` ✅ | 对/错图标 + 解析 | [ ] |

### E 组 · 通用组件（原子控件，被上面各页复用）

| # | 组件 | 参考来源 | 状态 |
|---|---|---|---|
| E1 | 通用按钮 / 图标按钮 | Sensor `NormalBtn` / MCV `NormalBtn` | [ ] |
| E2 | 列表条目（项目行 / 仪器行 / 任务行） | MCV `MenuClipBtn` `EquipmentChildBtn` `TaskListBtn` | [ ] |
| E3 | 3D 模型展示视图（three 版） | 参考 `ObjectShowElement` 的**行为规格** | [ ] |
| E4 | 图文说明视图 | 参考 `TextShowElement` / `ImageShowElement` | [ ] |
| E5 | 仪表/数显 | Sensor `DigitalDisplay` 等 | [ ] |
| E6 | 旋钮 / 开关 / 拖拽控件 | Sensor `KnobGroup` / `LineBtnClickPrefab` | [ ] |
| E7 | 提示气泡 / 浮窗 | Sensor `TipsContentUtiliy` / `LabelTextPrefab` | [ ] |
| E8 | 视频播放（原理页） | Sensor `VideoComponentBase` + WebGL 实测结论 | [ ] |
| E9 | 加载中 / 进度条 | 通用 | [ ] |

## 2 里程碑建议（先把"能看的产品"做出来）

| 里程碑 | 内容 | 依赖 | 产出观感 |
|---|---|---|---|
| **M1 外壳** | A1 A2 A3 A5 A7 A8（欢迎→登录→菜单→进入项目）+ B1 B2 B4 | 数据模型（`design/04`） | **能像软件一样点进去**，不再是演示页 |
| **M2 项目内两条三维** | C3（Three，最佳样板）+ C9（Unity，接已构建好的 WebGL 产物） | DEC-07 桥、DEC-44 产物 | 双线分工第一次真的跑通 |
| **M3 补齐 TaskType** | C1 C2 C4 C6 C7 + C8 C10 C11 | M2 的两种承载 | 11 个页签都能进 |
| **M4 考核与结算** | C5 D1 D2 D3 | M1 | 有"学完给分"的闭环 |
| **M5 漫游与辅助** | A6 A9 A10 + B3 B5 | M3 | 接近参考产品的完整体验 |
| **M6 移动端** | 微信内置浏览器适配 + 逐页自检 | M1~M4 | DEC-49/70 可验收 |

## 3 与参考工程的对应关系（照什么、不照什么）

**照（已实现可参考）**
- **状态分层**：MCV 的 6 个 Canvas（Start/Login/Menu/Content/Roaming/Loading）+ 常驻 LoadingCanvas；
- **页签范式**：Sensor 的"一个 `TaskType` 一个面板，`switch(TaskType)` 装配"；
- **取件契约**：prefab 名＝类名（我们用组件名＝模块名），MCV 的 `ui_{类名}` 命名可借鉴为我们的资源 key 规范（与 `design/03` 的资产登记表对齐）；
- **7 个真实页面**：`StartPanel` `LoginPanel` `MenuPanel` `ContentFunctionPanel` `TaskListPanel` `DialogPanel` `TaskEquipmentPanel`（MCV 最佳样板）+ Sensor 的 `TipsPanel` `ResultSummitPanel` `QuestionPanelBase` `LoadingAssetsPanel` `SleepTipsPanel` `RenderQualityPanel`。

**不照（参考工程自己的坑）**
- **MCV 的漫游链路整条是断的**（没有任何发布 `SceneState.Roaming` 的按钮，`RoamingFunctionPanel` 无 prefab 无创建点）⇒ 我们要自己设计漫游入口；
- **MCV 的空壳**：`LineConnection / Training / Test / Inspection / Exam` 五个任务页只有骨架 + 控制器只打 `Warning` ⇒ 不可参考，需自研（Sensor 侧这几个是完整的，可参考行为规格）；
- **`ProjectState.Exam` 不可达**（`ToProjectState` 永不返回 `Exam`）⇒ 我们的考核态必须真的可达；
- MCV 用 AB 预加载面板、`ComponentBase` 只有 2 个派生类、`TextComponent` 是 28KB 的独立巨类 ⇒ **不照搬这套装配与组件体系**（R-1 也要求不照搬目录）。

**参考工程里"没有"的**
- 登录流程实际未接线（Sensor 的"游客/登录"都直接进菜单）；
- 步骤/工具/答题面板在 MCV 已被整块移除，只剩接口 `IStepPanels.cs`；
- Sensor 的 `FunctionPanel` / `ControlInfoPanel` / `RightBottomPanel` 是空壳。

## 4 尚未读的素材（可能影响页面细节）

| 素材 | 说明 |
|---|---|
| `F:\Project\SensorSimulationTrainingSoftware_v1.0_2026\docs\传感器项目横向拓展字典.pdf`（1.18 MB） | **最可能含界面设计图/项目结构图**，尚未读。需要我用视觉模型/Pdf 工具提取的话说一声 |
| `SensorSimulationTrainingSoftware_v1.0_2026\Assets\Scenes\Preview\Preview_UI.unity` | 把**全部 22 个面板摆在一起**的预览场景 —— 想看"参考产品长什么样"最直接的办法是打开这个场景截图 |
| 各页 UI 贴图 | `Assets/Sprites/ICO/*.png`（BG/ContentBase/QuestionBg 等）、`Assets/Sprites/AB/*.png`（仪器图标） |

## 5 范围边界（本清单不做的事）

- 不做后端相关的页（登录校验、成绩上传、内容管理）—— DEC-21 本期无后端；A2/D1 只做界面与本地存储（DEC-54）；
- 不做 AI 助理的真实问答能力（A10 先做界面与预留入口，对接走 `services/external.ts`，DEC-43）；
- 不做像素流/桌面壳专属页（DEC-20 的 Electron 壳复用同一套 Web 页）。

## 6 我建议的下一步

1. 你审这份清单：**删掉不要的、补上我漏的、调整 M1~M6 的优先级**；
2. 按 M1 开工（外壳 6 页 + 项目内壳 2 页），同时把现有演示页移到 `/#/debug`；
3. 每完成一页，我用渲染冒烟（`npm run smoke`）加一条断言，保证"页面不是白屏"能自动验收（DEC-27）。
