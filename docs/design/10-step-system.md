# 设计 10：步骤系统（进程 → 步骤 → 条件）

> 读者：AI 与人｜状态：2026-10-13 **v1**｜性质：**生效**（决策见 `docs/DECISIONS.md` DEC-89 ~ DEC-93）
> 落点：`NewStructureUnity/Assets/Scripts/Core/Steps/**`、`Assets/Editor/Steps/**`、`Assets/Tests/EditMode/StepSystemTests.cs`
> 上游依据：`docs/design/02`（桥消息，含 `step:changed` / `task:completed` / `ui:request` / `ui:result`）、`docs/design/04`（数据模型）

## 0 它解决什么

Unity 侧承载的四类任务（`LineConnection` / `Training` / `Structure` / `Inspection`）里，前三类都是"**一步步做**"的教学流程：
每一步有自己的显隐、动画、交互（点一下 / 看说明 / 答一道题 / 连一条线），做完才进入下一步。

步骤系统就是这条流程的引擎：**一个协程驱动的状态机**，管住
"什么时候显示什么、物体停在哪一帧、现在等的是什么交互、跳转之后状态怎么回到一致"。

而任务的**装配**（装包、实例登记、把树摆进场景）不在这里，见 `docs/PLAN.md` P2-6。

## 1 结构与文件

```
StepManager（场景根节点，导演）
├── ProcessingHandler（进程）
│   ├── StepHandler（步骤）── condition（ConditionBase 子类：数据 + 行为）
│   └── StepHandler
└── ProcessingHandler
```

| 角色 | 文件 | 职责 |
|---|---|---|
| 导演 | `Core/Steps/StepManager.cs` | 收集三级结构、逐帧推进流程、跳转/打断、发事件；交互事件统一转发 |
| 进程 | `Core/Steps/ProcessingHandler.cs` | 收集**直接子** `StepHandler`，本身不承载执行逻辑 |
| 步骤 | `Core/Steps/StepHandler.cs` | 元数据（id / 显示名 / 描述）+ 一个多态条件；回填位置与生命周期 |
| 条件 | `Core/Steps/Conditions/*.cs` | 一个条件 = 一个步骤的**数据 + 行为**（DEC-89） |
| 连线画板 | `Core/Steps/Lines/LineConnectBoard.cs` | 把已配对的端点用 `LineRenderer` 连起来（临时物，归位时销毁） |
| 事件 | `Core/Steps/StepEvents.cs` | 进度/完成事件 + 三个入口事件（下一步 / 进程内跳转 / 跨进程跳转） |
| 面板端口 | `Core/Steps/StepPanelPort.cs` | 教学面板的抽象口（Core 定义、Runtime 实现），缺席即降级 |

**收集规则**：`StepManager` 只看**直接子节点**里的 `ProcessingHandler`，`ProcessingHandler` 只看**直接子** `StepHandler`。
缺组件会被**跳过并告警** —— 静默跳过的后果是"步骤凭空少了几步"，比报错难查得多。

## 2 数据模型（DEC-89）

`StepHandler` 上只有三样东西：`id`、`displayName` / `description`、以及一个条件对象。
**其余全在条件上**：因为"点击要目标、答题要题号、连线要配对表"只有各自那一种条件用得上，
摊到步骤上就是一堆永远空着的字段；反过来，用 `[SerializeReference]` 多态序列化后，
Inspector 里**每个步骤只显示自己那套字段**。

> **怎么在 Inspector 里选条件类型**（2026-10-14 补）：条件类型是**由类决定**的（`ConditionBase.Type` 属性），
> `ConditionType` 枚举里那几个（结束 / 问题 / 点击 / UI / 连线配对 / 默认）只是标签。
> 所以**换类型 = 换对象**：`StepHandlerEditor` 的「条件类型」下拉里选一个，就建出对应的条件类
> （`NewCondition` 是唯一的"类型 → 类"映射点）；下拉的**显示值永远取 `condition` 的实际类**，
> 所以面板上写的类型与运行期真正跑的条件不可能对不上。
> `StepHandler.conditionType` 那个序列化字段**只在还没有条件时**当待选值用，运行期没有人读它
> （带 `[HideInInspector]`，由上面那个下拉画）。只有已实现的类型可选，灰掉的是「开始」（与默认同义）
> 与「拖拽 / 工具」（DEC-93 本期不做）。
> 换类型会新建对象 ⇒ 旧条件里已填的字段会丢掉，编辑器会先弹确认；也可以走「清空条件（重新选类型）」。

条件的公共字段（`ConditionBase`）：

| 字段 | 说明 |
|---|---|
| `activeObjects` / `inactiveObjects` | `Prepare` 阶段设定一次的显隐表（步骤的可见性） |
| `animations`（`List<AnimationStruct>`） | 动画槽位：`animation`（Legacy）+ `clip` + `ifHideOnFinish` |
| `tipsKey` | 提示 id：进入 `Waiting` 时经面板端口请求（**不阻塞**） |
| `audioKey` | 预留：音频播放要等资源装载落地（P2-6），本期不播 |

各条件的私有字段：点击目标（`InteractiveObjBase`）、面板 id、题号 + 重试上限、配对表（源端点 → 目标端点）等。

**两条 Inspector 纪律**（`Assets/Editor/Steps/StepHandlerEditor.cs` 会直接拦下）：

1. **`clip` 必须是非循环动画**。循环动画会让 `Complete` 阶段的"等播完"永不成立（运行期有超时护栏兜底并告警，但那是护栏不是设计）；
2. 同一物体不能**同时在**显隐两张表里（结果取决于执行顺序，必须二选一）。

## 3 执行模型

### 3.1 自驱小泵（DEC-92）

推进不是 `StartCoroutine`，而是 `StepManager` 内部一个 `Stack<IEnumerator>`：每帧 `CoreUpdate()` 把栈顶 `MoveNext()` 一次，
遇到嵌套 `IEnumerator` 就压栈（同帧进入），遇到 `yield return null` 就收工等下一帧。

换来两件事：**`InputGate.ShouldUpdate` 能直接管住"容器不可见时先别推进"**；**编辑器测试能手动一帧帧推**（不必依赖播放态）。
代价是：等待一律不能用 `WaitForSeconds` / `WaitForEndOfFrame`，只能用 `yield return null` + 真实时间循环
（`WaitSecondsOrForceComplete`）。

### 3.2 三阶段生命周期

```
ExecuteStep(进程 p, 步骤 s)
  ├─ Prepare  ：显隐归位 + 动画隐藏 + 子类隐藏交互物 → 发 StepPreparedEvent
  ├─ Waiting  ：进入即发 StepWaitingEvent / StepChangedEvent，然后定格首帧 + 请求提示 + 子类显示交互物并等待
  ├─ Complete ：子类收尾 + 播放动画 + 等播完 + 按需隐藏 → 发 StepCompletedEvent
  └─ 步骤间停顿（默认 0.5s）
```

> **事件时机的口径（要说清楚，别让下游猜）**：`StepPreparedEvent` / `StepCompletedEvent` 是**阶段做完**之后发；
> 而 `StepWaitingEvent` / `step:changed` 是**进入 Waiting 那一刻**发 —— 语义是"从此刻起这一步开始接受交互"，
> 它**早于**条件内部的首帧定格与交互物显示（那些由条件在随后的 Waiting 里做）。
> 所以监听者不要在这两条事件里读"视觉是否已就绪"，它们表达的是**时机**，不是**画面完成**。

| 阶段 | 动画物体 | 显隐表 | 交互目标 |
|---|---|---|---|
| `Prepare` | **隐藏**（归位） | 按表设定一次 | 子类隐藏 |
| `Waiting` | 显示 + **定格首帧** | 保持 | 子类显示 |
| `Complete` | 播放 → 停在末帧 → 按需隐藏 | 保持 | 子类隐藏 |
| `FastComplete` | 直接定格末帧（不播放） | 保持 | 子类隐藏 |

> ⚠️ **归位 ≠ 定格首帧**：跳转归位阶段动画物体是**隐藏**；"定格首帧"只发生在目标步骤进入 `Waiting` 时。
> 这条是跳转后状态能一致的关键。

**动画原语**（`ConditionBase`，子类只调不写）：`ApplyObjectsActive` / `HideAnimations` / `ShowAnimationsAtFirstFrame` /
`StopAtLastFrame` / `PlayAnimations` / `HideAnimationsOnComplete`。
定格帧靠精确控帧三连：`normalizedTime = 0 或 1` → `Play` → `Sample`（把该帧应用到物体）→ `Stop`（"粘"住不动）。

### 3.3 特性判

- **逐步推进**：`NextStep / SkipCurrentStep / CompleteCurrentStep` 都走 `ForceComplete()`（协作式打断），
  让 `Waiting` 里的等待循环**尽快退出**，而不是靠轮询硬拽；
- **终止型条件**（`ConditionType.Finish`）：不执行三阶段，直接报"全部完成"；
- **空条件**（`condition == null`）：按"立即完成"处理 —— 但**必须告警**，静默的"没有条件"最难查；
- **超时护栏**：等动画播完有 `clip 时长 + 1s` 的上限，到时告警并往下走（宁可留一条告警，不要卡死整条流程）。

## 4 跳转与打断（DEC-90）

**所有跳转都从第 0 进程第 0 步重置后快进到目标**：

```
SetStep(2, 3)
  → 清空推进栈（等效 StopAllCoroutines）
  → CloseTopPanel()           把 DOM 层的面板收掉（它不在"栈"里，清栈带不走它）
  → ResetAllConditions()      全员归位：所有条件 Reset + 动画隐藏 + 子类收回自己揭示的交互物
  → P0S0 → 快进 → P0S1 → 快进 → … → P2S2 → 快进 → P2S3（正常三阶段）★目标
  → 继续往后正常推进
```

**"快进"= `Prepare` + `FastComplete`（两段都要）**：`Prepare` 里才有显隐表 ——
少了它，"跳过去的"与"一步步走过去的"显隐状态就不一样，直接违背"状态一致"（这是实现时踩过的坑，已钉进测试）。
快进的步骤**不发事件**，但状态照走：`Condition.Status = Complete`、`Lifecycle = Done`。

**终止型条件在快进路径同样生效**：跳转目标落在某个"结束"步骤之后时，快进到那一步就报全部完成 ——
与正常推进同一口径（不然"到此即结束"会被跳转悄悄绕过）。

**泵内发起的导航要推迟**：订阅者在收到步骤事件时同步调 `NextStep/JumpToStep` 的话，
此刻 `CoreUpdate` 正拿着栈顶协程在 `MoveNext`，立刻清栈会让它返回后把**刚压进去的跳转协程**当成"跑完的旧协程"弹掉
（症状：跳转被静默吞掉、流程停住）。所以泵内只登记目标，这一轮推进结束后再执行。

- **代价与距离成正比**（中间每一步都要走一次 `FastComplete`），换来的是**状态永远一致**；
- **快进的步骤不发事件**（它们是"补账"，不是"走过的路"），只有真正执行的那一步发 `StepPrepared/Waiting/Completed` 与 `step:changed`；
- 公开入口：`StartExecution` / `JumpToStep(p, s)` / `JumpToStep(s)` / `JumpToProcessing(p)` / `SetProcessing(p)` / `SetStep(p, s)` /
  `PrevStep` / `NextStep` / `SkipCurrentStep` / `CompleteCurrentStep` / `StopExecution`；
  另有三个入口事件（下一步 / 进程内跳转 / 跨进程跳转），谁想让步骤往前走都发事件而不是互相持引用。

**已知限制（有意留的）**：打断发生在**阶段间隙**（例如步骤间停顿里、或空条件步骤的两个 `yield` 之间）时，
没有可打断的等待协程，此时"下一步"退化为**按最近的可跳转位置重放**（仍走全量重置，结果一致，只是多花一次重放）。

## 5 接线

| 方向 | 通道 | 说明 |
|---|---|---|
| 交互 → 条件 | `GlobalInteractionEventData` | 由 `StepManager` 订阅一次后**转发给当前处于 `Waiting` 的那一个条件**；条件不自己订阅（非 MonoBehaviour 没有 `OnDestroy` 兜底，自订阅就是漏退订的温床） |
| 进度 → Web | `StepChangedEvent` → `step:changed` | 字段与桥载荷逐字对齐：**扁平**序号 / 总数 / 步骤名 |
| 完成 → Web | `AllStepsCompletedEvent` → `task:completed` | 带任务类型与用时；**score 恒为 0**（成绩体系未建，不编造分数） |
| 面板 | `IStepPanelPort`（Core 定义） | Runtime 侧实现：`ui:request` 出站、`ui:result` 入站；一次只允许一个"等结果"的请求 |
| 面板降级（三条） | — | ① 端口缺席 / id 为空 → 告警 + 按"直接完成"处理；② **非 WebGL 环境没有页面桥**（编辑器、独立播放器）→ 当场按 `unavailable` 放行并告警，免得在编辑器里点不动又没报错；③ 面板**有去无回** → 由条件上的 `timeoutSeconds` 兜底 |
| 面板的收尾 | — | 跳转/停止流程时 `CloseTopPanel()`；桥停用时端口 `Dispose()` 退订 —— 面板在 DOM 层，**清推进栈带不走它** |

**`timeoutSeconds` 默认 0（不限时）**：等交互的场景里"学生可能真的在想很久"，替他做决定是错的。
只有明确知道这条面板有去无回时（例如外部系统对接）才配一个上限；到点会告警并按"降级放行"处理。

`ui:request` / `ui:result` 的载荷口径见 `docs/design/02` §3.2；
其中**判定留在界面层**（Web 持有同一份题库）：Unity 只认 `success` / `failed` / `unavailable`
（信息面板是"关闭即完成"；答题是"答对即完成、答错重问、到重试上限放行并告警"）。
**一个请求只该回一条回执**（迟到/重复的回执会被端口忽略，但别指望它替你纠错）。

## 6 场景接线（怎么摆、怎么自查）

1. 内容场景根节点挂 `StepManager`（与其它管理器同级）；下面每个进程一个空物体挂 `ProcessingHandler`；
   每个步骤一个空物体挂 `StepHandler`，并在 Inspector 里给条件选类型、填字段；
2. **Progress**：`step:changed` 的序号是**扁平序号**（跨进程连续），Web 侧进度条直接用；
3. `StepManager` 的 Inspector 在运行时提供"看进度 + 开始 / 下一步 / 上一步 / 跳到 P0S0 / 重新收集 / 停止并归位"，
   与 Web 指令走的是**同一套公开 API**；
4. 自查顺序：进 Play → 看 Console 的"已收集 N 个进程 / M 个步骤" → 用面板按钮逐步走一遍 →
   再"跳到 P0S0"重走一遍（**这一遍是重点**：跳转后的显隐与定格帧必须与第一次一致）。

## 7 条件一览

| 条件 | 交互语义 | 状态 |
|---|---|---|
| `ConditionDefault` | 无交互：定格首帧后立即完成，只播动画 | 已实现 |
| `ConditionClick` | 点击指定交互物即完成（可选"由步骤揭示物体"） | 已实现 |
| `ConditionUI` | 请求信息面板，**关闭即完成** | 已实现（面板要 Web 侧落地） |
| `ConditionQuestion` | 弹题，**答对即完成**；答错重问（有重试上限） | 已实现（同上） |
| `ConditionLineConnect` | 先点源、再点目标；全部配对成功即完成；已连的线在**本步骤内**保留，**跳转会随全员归位一起清空**（与"从 0 重置"一致）；作为跳转前缀时快进会把线补齐画出（呈现"已连完"） | 已实现（临时线跟随未做） |
| `ConditionFinish` | 终止型：直接报全部完成 | 已实现 |
| `Tool`（工具） | 从工具面板选工具拖到目标 | **本期未做**（DEC-93） |
| `Drag`（拖拽） | 把源拖到目标松开命中 | **本期未做**（DEC-93） |

## 8 测试与验收

`Assets/Tests/EditMode/StepSystemTests.cs`（17 项，随全量 EditMode 一起跑，**49/49 通过**）：

| 用例 | 钉住的结论 |
|---|---|
| 全流程跑完 + 扁平进度 | 三阶段顺序、每步一条 `step:changed`、完成只发一次 |
| 跳转重置 + 前缀快进 | 目标之前的步骤全部快进且**不发事件**、目标步骤正常三阶段、**全员归位一次** |
| 打断等待中的条件 | `NextStep` 能穿透等待、被打断的步骤仍走完 `Complete` |
| 终止型条件 | 第一步就结束时，后面一步都不跑 |
| 空条件 | 按"立即完成"，不卡流程 |
| 面板等待 / 端口缺席降级 | 面板没回执不往下走；没有端口则降级完成 |
| 答错重问 | 答错重问一次、答对后放行 |
| 连线配对 | 源→目标配对、换选、点错取消、全配对后完成，且**画板（常驻线）真的建出来** |
| 跳转打断面板 | 跳转必须把面板收掉，之后流程能继续 |
| 泵内跳转 | 在步骤事件回调里发起的跳转**不能被吞**（表现为流程停住） |
| 结束后再"下一步" | 不重跑、不再报一次完成 |
| 跳到"结束"之后 | 快进路径同样走到"任务完成"，不被绕过 |
| 快进的显隐与状态 | 前缀步骤的显隐表真的落地、`Status = Complete`（"跳过去"与"走过去"等价） |
| 归位收回揭示物 | 跳走后，这一步揭示的交互物要重新隐藏 |
| 上一步跳过空进程 | 空进程不吞掉 `PrevStep` |
| 非 WebGL 的面板 | 没有页面桥时当场降级，不无限等 |

**编辑器里的手工验收**：按 §6 第 4 条走一遍 + 跳回 P0S0 再走一遍，比对显隐与定格帧。

## 9 待办

1. ~~**Web 侧落地面板**（`ui:request` / `ui:result`）~~ ✅ **已落地（2026-10-14，DEC-112）**：
   落点 `web/src/unity/UnitySession.ts`（出站/入站与状态）、`web/src/domain/step-panels.ts`（**回执纪律**）、
   `web/src/domain/step-content.ts`（`StepContentData.json` → 提示条/信息面板两份索引）、
   `web/src/components/StepPanelHost.vue`（B5 提示浮条 + D2 信息/答题面板）。
   两条纪律都钉住了并有单测/冒烟：**弹不出来回 `unavailable`**、**一个请求只回一条**；
   冒烟里真跑了一遍"信息面板 `success` → 答题答错 `failed` → 重问 → 答对 `success` → `task:completed`"。
   ⚠️ 两个容易写错的地方（都写进代码注释了）：`tips` **不需要回执**（`ShowTip` 发出去就不管，不占 pending）；
   `input:enable` 在**握手之前只能记状态**（Unity 的任务流程管理器是在管理器自检里才订阅的，早发会静默丢失）。
   面板 `timeoutSeconds` 的取值口径不变：**默认 0 = 不限时**（见 §5），要兜底就在条件上配；
2. **`Tool` / `Drag`** 两种条件；
3. 连线**临时线跟随鼠标**与手感（含吸附容差、点错提示）；
4. **步骤树挂进内容场景**（等 P2-6 内容装配）+ 一次**真 WebGL 构建**的实机验收
   （本轮的桥交互用桩构建验的：契约两侧对得上 ≠ 真产物跑得通，见 `TODO.md` D-24）；
5. **成绩体系**：`task:completed` 的 score 现在是恒 0 的占位；
6. 动画播完的护栏阈值（现在是 `clip 时长 + 1s`）与 `timeoutSeconds` 的实际取值，按真内容复核。

## 7 从来源工程生成步骤子树（结构任务 = TaskType 8，DEC-111）

结构任务的 **46 步不是手工搭的**，由 `Assets/Editor/Steps/StructureStepGenerator.cs` 从**只读来源工程**
（DEC-69）的 `InstControlledManager.simpleSteps` 生成；层级形状见 §1（StepManager → 直接子 ProcessingHandler
→ 直接子 StepHandler）。映射：

| 来源 `simpleSteps` | 落到本工程 |
|---|---|
| `clip`（guid） | `Condition.animations[0].clip`；播放器 = 该器件 `Scale` 上的 `Animation`（来源 `controlAnim` 指的就是它），并会检查该 clip 有没有注册进它的 `m_Animations`（没注册的运行期取不到 = 静默不播） |
| `clickObj`（零件脚本 MonoBehaviour 的 fileID） | `ConditionClick.target` = 该零件上的 `StructureObj`（没有就补）；`{fileID: 0}` ⇒ 用 `ConditionDefault`（只播动画、不等待交互） |
| `delay` / `animSpeed` | **不落**：7 个器件全 0；只有 `contactor` 用 `0.5` / `1`，正好是 `StepManager.stepDelaySeconds`（默认 0.5f）与默认播放速度 |
| `index` | **不用**（来源数据里每条都写 0）：**顺序**才是步骤顺序 |

**怎么跑**：菜单 `WSU3/Steps/生成结构任务步骤（选来源工程…）`（第一次选目录，之后走「沿用上次来源工程」）；
批处理 `-executeMethod WSU3.Editor.StructureStepGenerator.GenerateFromBatch -structureSource <来源工程根目录>`。
两个菜单入口都会先拦"预制体编辑模式开着"与"编辑器正在编译"，并有确认弹窗。

**四条纪律**：① 来源工程**只读**（只 `File.ReadAllText`）；② **幂等**（重复跑应报 0 变更）；
③ **只补空**（手工在 Inspector 里填过的非空字段保留，唯一例外是与来源不符时替换并**告警**）；
④ 顺手清掉 `StructureTaskObj` / `InstControlledManager` 的 Missing Script 残留（DEC-104：这两个脚本有意未搬）。

⚠️ **预制体改完要重打 AB 包**（`WSU3/Pack/一键打 AB 包（全部）`）—— 运行期加载的是包里的那份。
报告落 `content/asset-structure-steps-report.json`（逐器件：步数 / 新建 / 变更 / 清的 Missing Script / 补的零件与 clip / 告警）。
