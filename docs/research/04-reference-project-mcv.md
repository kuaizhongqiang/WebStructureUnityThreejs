# 调研 04：参考工程 MCV_Module 系列（SceneState / TaskType / 架构）

> 读者：AI 与人｜状态：2026-10-12 v0｜性质：**只读调研**，两个参考工程未被修改。
> 采纳情况：本文 §7.1 的"必须继承"已由 DEC-09（枚举原样继承）、DEC-10（契约维护）采纳；§7.2 的"必须避开"已体现于 DEC-14（目录重设）、DEC-24（不铺抽象层）。

## 0 一句话结论

`MCV_Module_0928`（宿主工作区）与 `MCV_Module`（UPM 包仓库）是同一套**自研 MVC 框架（namespace 根 `MCV_Module.*`）**的两个形态；我们要继承的只有**词汇与纪律**（`SceneState` / `TaskType` / 事件驱动 / 枚举契约），**框架代码与目录布局一律不照搬**；两仓库**都没有**任何 Unity 与 Web/Three.js 分工的记载。

## 1 SceneState：是枚举，语义＝页面级导航状态机

**结论**：`enum`，不是 class / SO / 接口。六个值，对应"一 Canvas 一状态"。**只事件驱动**读写，**禁止拉取查询**；唯一运行时宿主是 `GlobalUIMgr`（单例 + `DontDestroyOnLoad`）；不跨场景序列化，无 SO 资产。

证据：

- 定义：`F:\Project\MCV_Module\packages\com.mcv.core\Runtime\Models\EnumAll.cs:137-152`
  `[Serializable] public enum SceneState { Setup, Start, Login, Menu, UI, Roaming }`，每个值带 `[InspectorName("中文")]`（初始化 / 开始 / 登录 / 菜单 / UI / 漫游）。宿主同源副本：`MCV_Module_0928\Assets\Scripts\Models\EnumAll.cs:136-152`。
- 事件载体：`...\com.mcv.core\Runtime\Event\CoreEvent.cs:120-126` → `class SceneStateChangeEventData { public SceneState State; ... }`。
- 变更入口：`GlobalUIMgr.cs:285`（初始状态）、`:144`（LoginSuccess→Menu）、`Controllers\StartController.cs:23`、`MenuController.cs:55,62`、`ContentFunctionController.cs:42`。
- 读取方：`GlobalUIMgr.cs:19`（当前值字段）、`:150-157`、`:190-199`（`SceneState → ProjectState` 映射）；`UI\CanvasBase.cs:16,21-22`（`MatchesState`）；另有 `GlobalCameraMgr / GlobalAssetsMgr / InspectionManager / LogOverlay` 订阅。
- 生命周期：`GlobalUIMgr.cs:51-52` `DelayInit` 订阅、`:65-67` `OnDestroy` 退订。
- 纪律原文：`MCV_Module_0928\AGENT.md:50`「`SceneState` / `TaskType` 一律事件驱动，**禁止参数透传与拉取查询**」。

> 注意 `Roaming`（漫游）与 `UI` 的二分：既有框架已经用枚举把"三维空间内活动"和"平面界面"分开——这一点对我们 R-6 的分流设计有直接参考价值。

## 2 TaskType：是枚举，语义＝当前展示的业务任务页签

**结论**：同文件同 region 的 `enum`，11 个值。它不是"步骤"——**步骤是另一套引擎**（`StepManager → StepHandler → ConditionBase`），`TaskType` 是"页"，Steps 是"页里的流程"。与 `TaskXxxPanel` + `TaskXxxController` + `TaskXxxData` **1:1:1 对应**。

证据：

- 定义：`...\com.mcv.core\Runtime\Models\EnumAll.cs:389-415` → `None, Purpose, Equipment, Principle, LineConnection, Training, Test, Info, Structure, Inspection, Exam`；同 region 还有 `ProjectState(:435)`、`ConditionType(:449)`、`StepStutus(:475)`、`StepContentType(:486)`。
- 变更入口：`MCV_Module_0928\Assets\Scripts\Controllers\TaskListController.cs:49` → `Publish(new TaskTypeChangeEventData(clip, taskType))`（`CoreEvent.cs:132-136`）。
- 唯一数据源：`GlobalUIMgr.cs:151` → `GlobalDataMgr.SetCurrentTaskType(e.TaskType)`；`GlobalUIMgr.cs:26` 注释明确 `ProjectData.currentTaskType` 才是唯一源，Inspector 字段仅作兼容。
- 装配点（1:1 的证据）：`UI\UICanvas\ContentCanvas.cs:36-61` → `switch (TaskType)` 取对应 `TaskXxxPanel`。
- 数据模型：`Models\Project\ProjectData.cs:201-207`（`clips: List<ProjectClip>` + `currentClip` + `currentTaskType` + `projectState`）、`:254-263`（按 TaskType 分槽）、`:267-301` `GetTaskData(TaskType)`、`:358-360` `abstract class TaskDataBase { public abstract TaskType TaskType { get; } }`。
- **"工单"概念在两工程中零命中**，不存在的概念不要凭想象引入。

## 3 MCV 是什么 + 包结构现状（⚠️ 与旧记忆不同）

**结论**：MCV = 团队自研私有 MVC 框架「MCV_Module」。**当前只剩 2 个包**：`com.mcv.core` 0.1.27、`com.mcv.editor` 0.1.5；`com.mcv.module` / `com.mcv.input` **已于 2026-09-30 随业务层剥离而删除**。**`MCV_Module\README.md` 是过期文档**，仍写着三分包结构——不要照它做设计。

证据：

- `F:\Project\MCV_Module\packages\com.mcv.core\package.json:2-5` → `"name":"com.mcv.core","version":"0.1.27"`，description 明确「MCV 框架运行时全量（单一程序集 MCV.Core）…低压电气业务层已于 2026-09-30 剥离，**此后不再拆包**」；`"unity":"2022.3"`（`:6`）。
- 依赖（`package.json:12-19`）：newtonsoft-json 3.2.1、ugui 1.0.0、textmeshpro 3.0.7、inputsystem 1.11.2、cinemachine 2.10.7、addressables 1.22.3。
- 程序集：`...\com.mcv.core\Runtime\MCV.Core.asmdef:2-12`（名 `MCV.Core`）。
- `com.mcv.editor` 0.1.5 依赖 core 0.1.27，内含三个 Editor asmdef（`MCV.Editor.Common` / `.Tools` / `.Build`）。
- 陈旧引用（**要避开**）：`MCV_Module_0928\MCV.Module.csproj`、`TODO.md:16` 仍指 `com.mcv.module`；`MCV_Module\README.md:1,9-14` 过期。
- 版本指针：`MCV_Module_0928\TODO.md:39` → `v0.1.30`（core 0.1.27 / editor 0.1.5）。

**核心抽象基类**（`...\com.mcv.core\Runtime\` 下 16 个 `*Base.cs`）：`SingletonBase`、`SingletonGlobalMgr<T>`、`ControllerBase<TView>`、`UIBase → CanvasBase → PanelBase → ComponentBase`（+ `TaskPanelBase`）、`ObjectBase`、`InteractiveBase`、`ConditionBase`、`InstManagerBase`、`RoomDynamicMgrBase`、`InputControllerBase`、`DataBase`、`ApiBase`。

**没有 Adapter 基类**：`MCV_Module_0928\Assets\Scripts\Adapters\README.md:11,21-24` 记录插件抽象（`IHighlightService` / `IVideoPlayer`）**已被删除**，理由是"插件资产一律留在宿主侧，包内不得出现插件类型"。

## 4 架构模式：经典分层 MVC，无 DI，uGUI + TMP

**结论**：**经典 MVC**（团队自称"私有 MVC 框架"），**不是 MVVM**。UI 是 **uGUI + TextMeshPro**，**没有用 UI Toolkit**。**无 DI 容器**，用"单例服务定位器 + 静态类型表 + 静态事件总线"替代。Controller **非 MonoBehaviour、不挂场景**，由 `GlobalControllerMgr` 统一创建常驻；Panel 完全被动。

证据：

- 分层表：`MCV_Module_0928\Docs\design_ai\Architecture.md:11-23`；`:15` 明确 `ControllerBase<TView>`「**非 MonoBehaviour、不挂场景**」。
- 单向依赖（红线）：`Assets\Scripts\README.md:20-21` → `Setup → Managers → Singleton / Models / Event / Utils`；"View 不引用 Controller 类型，Controller 不持有 Canvas；数据单向 Controller → View"。
- Controller 生命周期：`...\com.mcv.core\Runtime\Controllers\ControllerBase.cs:10-15,18-21,28-36`（静态注册 + `OnInit` / `OnViewBound` / `OnDispose`，协程经 `GlobalControllerMgr.RunCoroutine`）。
- UI 装配链：`Architecture.md:70-88` → `SceneState 变化 → EventBus<SceneStateChangeEventData> → GlobalUIMgr.SwitchToState → CanvasBase.Init(state, taskType) → ClearPanels() + OnRebuild()`；`:91` 绑定优先 `[RequireController(typeof(XxxController))]`，回退名字约定。
- 服务定位器：`Architecture.md:47,68` → `SingletonGlobalMgr<T>` = 唯一实例 + `DontDestroyOnLoad` + `DelayInit` 协程 + `isInit`，"对外优先暴露静态方法"。
- 无 DI：`Packages\manifest.json:15,29-30` 只有 `com.unity.ugui` 与默认 `modules.ui/uielements`，全局无 VContainer / Zenject 类包。

## 5 工程规模事实

- Unity 版本：`MCV_Module_0928\ProjectSettings\ProjectVersion.txt:1` → `2022.3.53f1c1`（**与我们 `NewStructureUnity/` 完全相同**）。
- `Assets/Scripts/` 共 **163 个 `.cs`**，另有 **163 份同名契约 `.md`** 与 41 份目录 `README.md`（`Docs\README.md:33` 明确"163 份与 163 个 .cs 一一对应"）。
- 关键第三方包（`Packages\manifest.json:3-16`）：`com.coplaydev.unity-mcp`(git main)、addressables 1.22.3、cinemachine 2.10.7、inputsystem 1.11.2、newtonsoft-json 3.2.1、URP 14.0.11、textmeshpro 3.0.9、timeline 1.7.6、visualscripting 1.9.4、test-framework 1.1.33。
- 主要模块：`Managers/`（11 个 `Global*Mgr` + `Steps/StepManager` + `InstManagers/`）、`Controllers/`（17 个，含 11 个 `Task*`）、`UI/`、`Objects/Interactives/`、`Steps/`、`InputController/`、`Models/`（`ProjectData` 23.6KB、`EnumAll` 13.3KB）、`Event/`、`Singleton/`、`Utils/`。
- 第三方插件已全清：`TODO.md:42`「资产与引用全清，且不再为插件留抽象…`Assets/Plugins/` 只剩随包提供的 `MCV.AiClient/`」；视频用 Unity 原生 `VideoPlayer`（经 `UI/Tools/VideoTool` 封装），**没有 AVProVideo**。

## 6 文档体系要点

- `MCV_Module_0928\AGENT.md` 是该仓库**唯一"有内容"的 agent 手册**，其 `:12` 明确规定：其它 agent 工具手册（`CODEBUDDY.md` / `CLAUDE.md` / `CODELY.md`）**只允许写一行指针**指向它 —— 这正好与本仓库用户给 `CODEBUDDY.md` 的定位一致。
- 文档纪律（可借鉴，不必照搬密度）：路径 `README.md` 索引 + `X.cs ↔ X.md` 契约配对 + 单一事实源 + 审核过程稿进 `.plans/` 且禁止引用。
- 双形态纪律：`/bare` = 开发（框架平铺 `Assets/Scripts/`）、`/main` = 交付（宿主只留 `Setup.cs` + `Adapters/`，框架走包引用），**永不合拼，只走镜像通道**（`AGENT.md:15-21`）。这是**该团队的框架交付法**，与本项目"Web 优先"无关，仅供参考。
- **Web 相关记载只有 Unity WebGL 的受限清单**（对我们的 Web 线有用，务必看）：
  - `Docs\design_ai\Data.md:50,52` → WebGL 不能写盘，StreamingAssets 必须走 `UnityWebRequest`；
  - `Docs\design_human\Score.md:25` → 网页版成绩只留内存；
  - `Docs\design_ai\BundlePipeline.md:38` → bundle 名末段强制小写以兼容 WebGL / Linux / Android；
  - `Docs\design_ai\Localization.md:557` → WebGL 资源只读 ⇒ TMP 动态补字不可用。
- **Three.js / Electron / 独立前端：两仓库全库 0 命中。**

## 7 对新项目的直接影响

### 7.1 必须继承

1. **状态机词汇直接复用**：`SceneState`（页面级导航，且已含 `Roaming`(三维漫游) / `UI`(平面交互) 的二分）+ `TaskType`（业务页签，1:1 映射 Panel/Controller/Data）+ `ProjectState`。这是已验证的教育仿真领域模型，**建议作为双端（C#/TS）共享契约**。
2. **"事件驱动状态、禁止拉取查询"的铁律**。Web 端用等价的 store + 事件/订阅实现，**不要暴露 `GetCurrentState()`**。
3. **枚举即 JSON 契约、只许往后追加、`[InspectorName]` 中文逐字保持**。跨端必须**单一事实源 + 生成器**（C# 与 TS 各生成一份），否则双端枚举漂移是必然事故。
4. **Controller 非 MonoBehaviour / Panel 纯被动 / View 不引用 Controller** —— 这套"无 MonoBehaviour 的调度层"在 TS 里天然成立，Web 端沿用同构分层可显著降低双端心智成本。
5. **数据真源纪律**：运行期数据以 JSON 为唯一真源，SO/编辑器资产只是编辑期；平台差异只改**路径构造与写盘分支**，不动调用方签名。
6. **配置驱动内容**：按 TaskType 分槽的数据结构（`ProjectClip` / `GetTaskData(TaskType)`）。

### 7.2 必须避开（均为参考工程自己记录的教训）

1. **不要照抄三分包划分**（`com.mcv.core/module/input` 已废弃，`package.json:5` 写明"此后不再拆包"）。
2. **不要为可替换性预留插件抽象层**（`Adapters\README.md:21-24` 的教训）。
3. **不要手写事件订阅/退订配对**（`EventBus<T>` 持强引用，实际已产生漏订阅/漏退订缺陷，`TODO.md:24-31`）；Web 端用可自动释放的方案。
4. **不要复刻"启动串联等待 11 个管理器、各自 15s 超时"的启动链**（`Architecture.md:31-42`）；Web 首屏体验不可接受，改为按需 + 并行。
5. **不要复刻 uGUI/AB 式面板装配机制**（prefab 名 = 类名、`ui_{类名}` 包键、`RequestLayoutRebuild` 等，`Architecture.md:85,93`）—— Unity 特有包袱，Web 端用组件树 + 声明式渲染。
6. **不要期待既有工程给出 R-6 的答案**：分工方式必须我们定义。
7. **注意"只有文档纪律、没有测试体系"的后果**：`Assets\Scripts\README.md:11` 记录 2026-09-30 起测试体系已整体移除，`TODO.md` 里随之积压了 `Debug.Log` 违规、面板未接线、空实现、同帧 `ForceRebuildLayoutImmediate`、`Instantiate(new GameObject())` 等缺陷。新项目应**保留自动化测试**。
