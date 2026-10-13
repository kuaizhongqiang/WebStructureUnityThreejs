# 执行计划（活文档）

> 读者：AI 与人｜状态：2026-10-13 **v1**｜性质：**活文档**。
> **为什么有它**：会话上下文会被压缩，计划必须落盘 —— 本文件是"**接下来要做什么**"的唯一维护点。
> 边界：**已定事项**（结论）仍在 `DECISIONS.md`；**未闭合需要负责人拍板**的也在 `DECISIONS.md` 末尾的表里；本文件只写**步骤、落点、验收与证据**。
> 权威层级：`requirement/raw/raw-requirement.md` > `../AGENT.md` > `DECISIONS.md` > 本文件 > 其它。

## 0 怎么用

1. 每完成一项：把状态改成 ✅，并把**证据**写进"证据"列（命令输出摘要 / commit / PR / Plastic 变更集号）。**不要删条目**，保留轨迹。
2. 新增待办：只加到这里；若需要负责人拍板，**同批**加进 `DECISIONS.md` 未闭合表。
3. 执行顺序默认按 §2 的编号（P0 → P1 → P2）；同一优先级里可并行（多开 subagent 时，各自负责不重叠的文件集）。

---

## 1 已完成（2026-10-13，第六轮）

| # | 事项 | 结果 | 证据 |
|---|---|---|---|
| 1.1 | 第六轮问答（26 + 14 条）→ 决策 | DEC-80 ~ DEC-88 生效 | `DECISIONS.md` §17 |
| 1.2 | 内容数据全量采用 | 7 份 JSON / 9 个项目 / 73 KB，两处落点 | `web/public/content/data/`、`Assets/StreamingAssets/Data/` |
| 1.3 | 内容数据双份门禁 | 结构签名比对（7 份，63/17/6/21/33/12/5 条字段路径） | `tools/check-content-data.mjs`，进 hook + CI |
| 1.4 | 契约扩展 | `QuestionType` / `QuestionUsage` / `BridgeMessageType`（23 条） | 三方比对通过；`contracts.spec.ts` 17 项单测 |
| 1.5 | 文档 | `design/08`、`design/09`、`research/09`；`design/02/03/04/05` 同步 | — |
| 1.6 | 双渠道提交 | git `ba2533c` + `10a74f4` + `5f49b62`（分支 `feat/unity-scaffold-bridge`）；Plastic `cs:6 → cs:9` | **PR 待人工开**（本机 GitHub 凭据失效） |
| 1.7 | Unity 侧桥的**传输与分发** | `.jslib` + 信封扫描器 + 4 个 C# 文件；4 个文件 `validate_script` 0 error、Unity console 无编译错误 | git `debea2e`；Plastic `cs:9` |
| 1.8 | **启动编排 + 任务编排 + 输入闸门** | `StartupFlow`（自检 → 握手 → single 切内容场景 → 待命）、`TaskFlowController`（消息落地 + `assets:ready`/`progress`/`scene:ready`/`scene:exited`）、`InputGate`、`SceneManager` 的三个场景调用；5 个文件 `validate_script` 0 error | git `26488d0`；Plastic `cs:10` |
| 1.9 | **拾取体系 + 任务流程收进 GlobalManager** | `InteractiveObjBase`（真基类：自注册 + 单一出口 + `OnHighlightChanged` 虚方法钩子，**无接口/服务**）、`InteractiveManager`（注册表 + 检测射线 + 点空白 + view:focus 全在一个文件里）、`TaskFlowManager`（流程 + 自驱协程泵）、`WebBridgeBehaviour`（意图事件 → 上网）、`Contracts/Events/BridgeEvents.cs`（入站事件 + 出站意图）；`WSU3.Core` 加 `UnityEngine.UI`（只为 EventSystems，DEC-80） | 全量重编译后 console 无 error（期间抓到并修掉一处缺 `using`） |
| 1.10 | **检测权收归管理器** | 物体不再实现 `IPointer*Handler`，改由 `InteractiveManager.CoreUpdate()` 每帧射线后调 `Invoke*`；去掉 `PhysicsRaycaster`；悬停不再碰高亮 | git `f8399e1`；Plastic `cs:14` |
| 1.11 | **`0_Setup` 场景接线（P0-1 g）** | 加 `WebBridge`（`WebBridgeBehaviour`）与 `Setup`（`StartupFlow`）；用附加加载改场景，未触碰负责人在编的 `1_Content` | git `64526b7`；Plastic `cs:15` |
| 1.12 | **P0-1 Play 验收** | 三条启动日志齐全；**抓到并修掉"桥随 `0_Setup` 被卸载"的沉默故障**（`WebBridge` 挪到 `Manager` 下 + 根物体自保 + 自检日志/上报） | git（见提交）；Plastic（见提交） |
| 1.13 | **P0-2 单构建多任务语义（DEC-81）** | 清单 `taskTypes[]` + `--task-types`（带契约校验）+ `pickUnityBuild`（兼容旧清单）+ 壳侧同口径 + 7 项选件单测；**验收：桩构建 → 打包 → 壳冒烟 `mounted`** | git（见提交）；纯 JS/TS/文档，**无 Unity 侧改动**（故未走 Plastic） |
| 1.14 | **P0-3 Web 内容层改用 `content/data/*.json`** | 适配层 + 内容 store + 菜单/任务页 + 同形状兜底 + 13 项单测 + 冒烟 8 条新断言；**过程中修掉两个 SPA 状态 bug**（坏链接污染目录、内容晚到导致视口挂不上） | git（见提交）；纯 Web/文档，无 Unity 侧改动 |

---

## 2 待执行

### P0-1 Unity 侧协议桥 + 启动编排（**a/b 已完成**，c~g 待做）

**目标**：Unity 侧能真正收发桥消息，并按 `design/09` 的启动链跑起来。

| 步骤 | 内容 | 落点 | 验收 | 状态 |
|---|---|---|---|---|
| a | `.jslib`：把 Unity → Web 的消息投到 `window.__WSU3_BRIDGE__`（`onReady` / `post` / `onProgress` 三条通道） | `NewStructureUnity/Assets/Scripts/Web/Plugins/Wsu3Bridge.jslib` | WebGL 构建里能看到握手 | ✅ 代码就位（**WebGL 构建后实测**） |
| b | 信封解析（`type`/`version`/`seq`/`payload`）+ 分发到 `EventBus<T>`；版本不符 → 错误码 1001 | `Assets/Scripts/Web/{BridgeJson,BridgeProtocol,WebBridgeBehaviour}.cs`、`WebChannelNative.cs`、`WebChannelEditor.cs` | 未知 `type` 只告警；编辑器里 `WebChannel.Sent` 能观察到出站消息 | ✅ `validate_script` 4 个文件 0 error；Unity console 无编译错误 |
| c | 启动编排：`0_Setup` 自检 → single 切 `1_Content` → **待命**（不装配） | `Assets/Scripts/Managers/StartupFlow.cs`、`Core/Managers/FunctionManager/SceneManager.cs` | 日志出现"已停在 '1_Content' 待命" | ✅ 代码就位（**待场景挂载**，见 g） |
| d | Web → Unity 消息落地：订阅 `app:init` / `preload:task` / `preload:cancel` / `scene:enter` / `scene:exit` / `input:enable` / `runtime:resume`（`debug:ping` 已在桥里成对处理） | `Core/Managers/FunctionManager/TaskFlowManager.cs`（`GlobalManager.TaskFlowManager`） | 每条消息有日志；`debug:ping` 回 `debug:pong` | ✅ 代码就位 |
| e | 就绪语义：`assets:ready` → `unity:progress`×N → `scene:ready`（内容包装卸见 P2-6） | 同上（只发意图事件，上网在桥里） | 切任务时两条就绪都发得出来 | ✅ 序列就位；**资源装载/装配是占位**（报非致命码 9001） |
| f | 拾取体系：**检测全在 `InteractiveManager.CoreUpdate()`**（自建 `ScreenPointToRay` + `Physics.Raycast`，不建 Canvas、物体不实现 `IPointer*`）+ 交互物自注册 + `object:picked` | `Core/Interactive/InteractiveObjBase.cs`、`Core/Managers/FunctionManager/InteractiveManager.cs`（含注册表与检测，**不另建脚本/manager**）、`GlobalManager.Update`、`Web/WebBridgeBehaviour.cs`（上报） | 点中物体 → Web 收到 `object:picked`；点空白 → 一条 `Target=null` 的 Click | ✅ 代码就位（**待场景里有交互物可点**，见 g） |
| g | 场景接线：`0_Setup` 挂 `StartupFlow` + `WebBridge`；`WebBridge` 放在 `Manager` 下（常驻子树） | `Assets/Scenes/0_Setup.unity`、`Web/WebBridgeBehaviour.cs`、`Managers/StartupFlow.cs` | 编辑器里 Play 起来，启动链日志齐全且桥存活 | ✅ **已改好 + Play 验收通过**（见下） |

**f 的实现要点**：
- **检测在管理器里**（负责人 2026-10-13 明确）：`InteractiveManager.CoreUpdate()` 每帧一次 `Camera.ScreenPointToRay` + `Physics.Raycast`，
  命中后调物体的 `InvokeEnter / InvokeExit / InvokeDown / InvokeUp / InvokeClick`；**物体不实现 `IPointer*Handler`**
  —— 注册表的意义就是"管理器统一检测、统一派发"，否则检测权又回到 EventSystem，注册表就白建了。
- **只有一个管理点**：拾取 + 登记都在 `Core/Managers/FunctionManager/InteractiveManager.cs`（`GlobalManager.InteractiveManager`），**不另建 manager、不另建注册表脚本**。
- **驱动**：它不是 MonoBehaviour，逐帧由 `GlobalManager.Update()` → `InteractiveManager.CoreUpdate()` 驱动；`Init/OnDespose` 挂在管理器链上。
- **注册表是 `InteractiveManager` 的 static 字典**（按**契约 key**）：交互物在 `Awake` 里自注册，走静态入口是为了不在管理器链就绪前把 `GlobalManager` 提前创建出来。
- **`EventSystem` 仍建但只做一件事**：`IsPointerOverGameObject()` 挡住"指针压在原生 UI 上"的情况（防御性）+ 将来真有原生 UI 时派发；
  **不再加 `PhysicsRaycaster`** —— 射线由本管理器自己发，加了只是白做一遍（与 DEC-80 的早期列法有出入，按本口径为准）。
- **闸门**：`InputGate` 关上时**连射线都不做**，并把悬停态收尾（`InvokeExit` 不受闸门约束，否则悬停态会卡住）。
- **点空白**：左键抬起且没命中交互物时补发一条 `Target = null` 的 Click（取消连线 / 收起浮卡依赖它）。
- **高亮只留状态与钩子**（负责人 2026-10-13 明确）：基类只有 `IsHighlighted` + `protected virtual OnHighlightChanged(bool)`，
  由 `view:focus` 调 `SetHighlight`；**悬停不碰高亮** —— 要不要悬停高亮由业务自己决定；不引入接口/服务注册。
- **`view:focus`**：按 key 找物体 → `SetHighlight(true)`（每次只亮一个；`scene:exit` 时清掉）。
- **未做**（有意）：右键与双击（契约里已有 `ClickRight` / `ClickDouble`，需要时在 `InteractiveManager` 里补判定）。

**g 的实现要点（2026-10-13 已做）**：
- `0_Setup` 现场（用 Unity MCP 改的）：`Manager`（`GlobalManager` + 子物体 `EventSystem`、`MainCamera`）、**`WebBridge`（`WebBridgeBehaviour`）**、**`Setup`（`StartupFlow`）**；
- `Manager` 里**已经有** `EventSystem + StandaloneInputModule`，所以 `InteractiveManager.EnsureEventSystem()` 不会重复创建；
- 改场景时用的是**附加加载**（`load additive` + `set_active_scene` + `save` + 关掉 + 切回），**没有碰负责人正在编辑的 `1_Content`**（它当时是 dirty 状态）；
- **Play 验收（2026-10-13 已做，通过）**：`1_Content` 存盘后进 Play，console 三条日志齐全：
  1. `[StartupFlow] 管理器自检通过。`
  2. `[StartupFlow] 切换到常驻内容场景 '1_Content' …`
  3. `[StartupFlow] 已停在 '1_Content' 待命，WebBridge 就绪，等待 Web 指令（preload:task / scene:enter）。`
- 🐛 **验收抓到的真 bug（已修）**：`WebBridge` 原本是 `0_Setup` 的**根物体**，而 `StartupFlow` 用 `LoadSceneSingle`
  切场景时**会把 `0_Setup` 整个卸掉** → 接消息的物体被销毁，Web 的消息从此无人接收，而画面看起来一切正常（沉默故障）。
  修法两条并用：① 场景里把 `WebBridge` 挪到 **`Manager` 下**（`GlobalManager` 已 `DontDestroyOnLoad`，子树一起常驻）；
  ② `WebBridgeBehaviour.Awake` 里"作为根物体时自保"（`transform.parent == null` 才 `DontDestroyOnLoad`，子物体标了会报错）。
  并加了**自检日志/错误上报**（`WebBridgeBehaviour.IsAlive`）：切完场景若桥不在，直接 `Debug.LogError` + 上报 1001，不再沉默。
- ⚠️ **一条工具限制（别被误导）**：Unity MCP 的 `find_gameobjects` **看不到 `DontDestroyOnLoad` 场景里的物体**
  （实测连常驻的 `EventSystem` 也搜不到）。所以"搜不到"**不能**当作"物体被销毁了"的证据 ——
  判定存活要用**游戏自己的自检日志**（如上面的 `WebBridge 就绪`）。
- 编辑器里没有页面桥：握手与消息只在 WebGL 构建里才真正上网（`WebChannel.Sent` 事件是编辑器/单测的观察点）。
  **入站路径（Web → Unity）尚未在真环境跑过** —— 要等 P0-2 的单构建语义改完、真 WebGL 构建接上页面才能验。

**c/d/e 的实现要点（给下一次续会话）**：
- **流程管理点只有一处**：`Core/Managers/FunctionManager/TaskFlowManager.cs`（`GlobalManager.TaskFlowManager`），**不另建 controller/MonoBehaviour**；`Init` 订阅入站事件，逐帧由 `GlobalManager.Update` → `CoreUpdate` 推进。
- **不是 MonoBehaviour 也能跑异步序列**：`TaskFlowManager` 内部有一个**自驱小泵**（`Stack<IEnumerator>` + `MoveNext`，支持 `yield return 另一个 IEnumerator` 的嵌套写法），所以进入/退出序列照旧用协程风格写。
- **Core 不调桥**：Core 只 `Publish` **意图事件**（`TaskAssetsReadyEvent` / `TaskSceneReadyEvent` / `TaskExitedEvent` / `SceneProgressEvent` / `BridgeErrorEvent`，都在 `Contracts/Events/BridgeEvents.cs`），由 Runtime 的 `WebBridgeBehaviour` 订阅后真正上网 —— 这样"时机留给 Core、协议留在 Runtime"。
- 资源装卸还是占位：`scene:enter` 会发 `unity:error{code:9001, fatal:false}`（说明"内容包装载尚未实现"），然后照常发 `assets:ready` → `progress` → `scene:ready` —— 这是**故意**的，好让 Web 侧整条流先联调；P2-6 落地后删掉那条占位报错即可。
- `SceneManager`（Core）是**唯一**碰 Unity 场景 API 的地方：`LoadSceneSingle` / `LoadSceneAdditive` / `UnloadScene`（后者拒绝卸载常驻内容场景）。

**已知实现细节（给下一次续会话）**：
- `WebBridgeBehaviour` 必须挂在**名叫 `WebBridge` 的 GameObject** 上（Web 侧 `BRIDGE_GAME_OBJECT` 写死了这个名字），收消息方法是 `OnWebMessage(string)`。
- 出站走 `WebBridge.*`（`AssetsReady` / `SceneReady` / `SceneExited` / `SceneProgress` / `StepChanged` / `TaskCompleted` / `ReportError` / `Pong`）；`WebChannel.Sent` 是编辑器/单测的观察点。
- 平台分文件是**刻意的**（`WebChannelNative.cs` / `WebChannelEditor.cs`）：静态检查工具不懂 `#if`，同文件两分支同名会被判"重复方法"。
- WebGL 里 `.jslib` 的函数名必须与 C# 的 `DllImport("__Internal")` 名字逐字一致（`Wsu3Bridge_Ready/Post/Progress`）。

**风险/约束**：
- ⚠️ 写 `.cs` 会让**正在开着的 Unity 编辑器重编译**（负责人知情）；`asmdef` 变动会触发更久的重导入，尽量一次改完。
- ⚠️ 新目录 `Assets/Scripts/Web/` 落在 `WSU3.Runtime.asmdef` 覆盖范围内（该 asmdef 在 `Assets/Scripts/` 根，递归生效），**不要**为它新建 asmdef。
- Unity 侧每次改动都要**双渠道**提交（git 走 PR 分支；Plastic 按路径 `cm add` + `cm ci`）。
- 本期**不采用** Newtonsoft（避免加包）；信封用小扫描器 + `JsonUtility` 解析 payload（见 `design/09`）。

### P0-2 流水线"单构建多任务"语义（DEC-81）—— ✅ **已完成（2026-10-13）**

| 步骤 | 内容 | 落点 | 状态 |
|---|---|---|---|
| a | 暂存入参改 `--key main --task-types 4,5,8,9`（`--task-type` 废弃但兼容） | `tools/pipeline/unity-stage.mjs` | ✅ |
| b | 清单每项写 `taskTypes: number[]`（升序去重）；暂存时与契约快照的 `TaskType` 序号比对，写错直接拒绝 | `tools/pipeline/unity-stage.mjs`、`unity-verify.mjs`、`make-stub-unity.mjs`、`pack.mjs` | ✅ |
| c | 加载器改"**第一个声明包含该 taskType 的构建**"，并兼容旧清单的单值 `taskType` | `web/src/stores/runtime.ts`（`declaresTaskType` / `pickUnityBuild`）、`web/src/unity/UnityLoader.ts` | ✅ |
| d | 壳侧同一口径（独立进程，不共享页面模块）+ 启动日志与冒烟打印 `taskTypes` | `electron/main.js` | ✅ |
| e | 单测锁住四种形状：新清单命中/不命中、旧清单兼容、声明为空不认定、多候选取第一个 | `web/src/stores/runtime.spec.ts`（7 项） | ✅ |
| f | 页面"接入命令"提示改为新命令 | `web/src/views/TaskView.vue` | ✅ |

**验收（已跑通）**：
1. `node tools/pipeline/make-stub-unity.mjs --key main --task-types 4,5,8,9 --stage` → 清单写 `taskTypes: [4,5,8,9]`；
2. `node tools/pipeline/unity-verify.mjs` → `[unity] ✓ main（承载 taskTypes=4,5,8,9）`；
3. `node tools/pipeline/pack.mjs` → 发布清单里 `taskTypes` 正确、摘要不再出现 `undefined`；
4. `cd electron && npm run smoke` → **`Unity 页：canvas=true … → mounted`，冒烟通过**；壳日志打印 `· main（承载 taskTypes=4,5,8,9）`。

**兼容性口径（写进代码注释与文档）**：新清单只写 `taskTypes`；旧清单的单值 `taskType` 仍被读取（已打出去的包不用重打）。
**两代都为空 ⇒ 不认定** —— 宁可显示"产物未就位"，也不挂上不知道能不能干活的构建。

### P0-3 Web 内容层改用 `content/data/*.json` —— ✅ **已完成（2026-10-13）**

| 步骤 | 内容 | 落点 | 状态 |
|---|---|---|---|
| a | **纯适配层**：被采纳 JSON → 页面内容模型（`TaskType` ↔ 10 个槽位、防御式读取、枚举按名字） | `web/src/domain/adopted-content.ts` | ✅ |
| b | 内容取数：一次读全目录 + 项目 + 题库，幂等缓存；**目录级**与**项目级**兜底分开 | `web/src/stores/content.ts` | ✅ |
| c | 项目列表用真实数据（9 个项目 × 各自启用的站数）；任务页出真实正文/分节/题目；未启用槽位显示明确状态 | `web/src/views/{MenuView,TaskView}.vue` | ✅ |
| d | 兜底内容改成**同形状**（走同一条适配路径，不做第二套代码） | `web/public/content/projects/demo-temperature.json` | ✅ |
| e | 渲染冒烟补 6 条内容层断言 + 2 条"状态不被污染"断言 | `web/tools/render-smoke.mjs` | ✅ |
| f | 单测：13 项（形状与三个静默陷阱 + **真实数据的结构性不变量**：菜单→项目无死链、题型都认得出） | `web/src/domain/adopted-content.spec.ts` | ✅ |

**验收（已跑通）**：`cd web && npm run smoke` →
`菜单页：项目卡片 9 个（接触器/热继电器/…/小测验）`、`项目任务页：正文 63 字（真实内容）`、
`未启用槽位：显示"本项目未启用"`、`小测验页：共 5 题（项目题组）`、`坏链接：状态条明说且目录不被污染`，
全套 29 项断言通过；`npm test` 37 项、typecheck / lint / format 全绿。

**过程中修掉的两个真 bug（都是 SPA 状态问题，只有真浏览器冒烟抓得到）**：

1. **一次坏链接污染整个目录**：项目找不到时曾把 `menu` / `projects` 一起换成兜底 —— hash 路由不重载页面，于是目录一直是兜底的。改成"目录级失败才换目录，项目级失败只换当前项目并在状态条明说"。
2. **内容晚到，三维视口挂不上**：换 `?project=` 后项目数据是异步取的，页面先落到"未启用"分支（没有视口容器），数据到达后没人再挂视口。补了"内容到位再同步一次视口"的监听。

**留给内容侧的缺口（不是实现问题，已写进 `design/08` §8）**：8 个器件**都没有**填
`Purpose` / `Equipment` / `LineConnection` / `Training` / `Test` 五个槽位 —— 其中 Three 的 `list` 骨架（实验仪器）
今天只有兜底项目能走到；Unity 侧的 4/5 站只能由 Unity 自己带内容。

**依赖**：P1-4 的原理图 Sprite（页面要显示图），否则先只跑文字。

### P1-4 三维资产搬运（首批）

**范围**（已测绘，见 `research/09` §5）：8 个器件的**新代** FBX + PBR 贴图（BaseColor / Normal / AO-Gloss）+ 8×6 张原理图 Sprite。
**剔除**：PSD 设计稿、演示帧、未压缩背景大图、旧代模型、TMP 字体 SDF。

**落点决定（2026-10-13，AI 定）**：

| 用途 | 落点 | 谁管 | git |
|---|---|---|---|
| Unity 侧源资产（FBX / 贴图 / 预制体） | `NewStructureUnity/Assets/Models/**` | **Plastic** | **忽略**（`.gitignore` 增规则） |
| Three 侧资产（glTF/GLB） | `content/assets/three/**` | git 仓库（不进库） | **忽略**（已有规则） |

> 原 `content/assets/unity/` 的设想**作废**：Unity 要导入资产就必须放进它自己的 `Assets/`，放仓库根等于又多一份。

**步骤**：
1. 复制 8 器件新代 FBX + 贴图 → `NewStructureUnity/Assets/Models/`（保持原目录语义：按器件分目录）；
2. 复制原理图 Sprite → 同一工程内（供 Unity）与 `web/public/content/sprites/`（供 Web，体积小先在 git 里）；
3. 可选：Blender 批量把 FBX 转 GLB → `content/assets/three/`（Three 侧任务用）；
4. `.gitignore` 增 `NewStructureUnity/Assets/Models/`；Plastic 侧提交。

**验收**：Unity 里能把模型拖进场景无紫红；Web 侧原理图能显示。

### P1-5 资产发布链（大资产怎么进产物）

| 项 | 内容 |
|---|---|
| 问题 | `web/public/` 下的东西会被 Vite 拷进 `dist` 并进 git；`content/assets/` 不能进 git，但运行时必须能被 Web 服务到 |
| 方案 | 新增 `tools/pipeline/web-assets.mjs`：构建**前**把 `content/assets/three/**` 拷进 `web/dist/assets/three/**`（`dist` 不进 git）；`pack.mjs` 把它计入发布清单 |
| 落点 | `tools/pipeline/`、`web/dist/release-manifest.json` 的 `content.assets` 字段 |

### P2-6 资源包与场景（依赖 P0-1 落地）

| # | 事项 | 说明 |
|---|---|---|
| a | 包登记表 + 三条链路（AB / AA / 内置） | `design/03` §7；包配置资产放 `Resources/Config/`，产物落 `Assets/StreamingAssets/` |
| b | 一个项目一个内容包 + 实例登记 + 卸载纪律（防变粉） | 切任务 = 卸旧项目包 + 装新项目包 |
| c | 漫游场景（additive，走 AA 或同构建内场景） | 入口先不做实现（浮动按钮预留）；**内容不采纳房间场景** |
| d | 结构拆装动画（`.anim`）是否重建 | 取决于 P1-4 之后的效果评估 |
| e | Unity 侧"编辑期 SO → 导出 JSON"链路 | 数据面稳定后接入；接入前**必须先备份 `StreamingAssets/Data/*.json`**（空 SO 会覆盖） |
| f | 桥消息的 Unity 侧单测（EditMode） | 信封解析 / 版本不符 / 未知 type |

---

## 3 关键落点与纪律速查

| 东西 | 落点 |
|---|---|
| Unity 源码 | `NewStructureUnity/Assets/Scripts/{Core,Contracts,Managers,Viewers,Web,Services}`（**无 `UIs/`**，DEC-80/86） |
| Unity 内容数据 | `NewStructureUnity/Assets/StreamingAssets/Data/*.json` |
| Unity 大资产 | `NewStructureUnity/Assets/Models/**`（Plastic 管，git 忽略） |
| Web 内容数据 | `web/public/content/data/*.json` |
| Three 大资产 | `content/assets/three/**`（git 忽略；构建前拷进 `dist`） |
| 契约三处 | `web/src/contracts/*` ↔ `content/contracts/snapshot.json` ↔ `Assets/Scripts/Contracts/*.cs` |
| 门禁 | `node tools/check-contracts.mjs`、`node tools/check-content-data.mjs`、`check-large-files`、`check-shell-coupling` |
| 提交 | git：分支 + PR（`main` 不收直接提交，DEC-78）；Unity 侧：另走 Plastic（`cm add --recursive` + `cm ci`，DEC-60） |

### 3.1 Plastic 的两个坑（2026-10-13 实测）

1. **`cm ci` 传多个路径时**：若列表里有"**已更改但未显式签出**"的文件，会报
   `The item '…' is not changed in current workspace` 并**整体中止**（一条都没提交）。
   **解法**：先 `cm co <这些被修改的文件>`，再 `cm ci -c="…" <路径…>`。
2. **不要用 `cm ci --all` 收尾**（除非确实要提交全部）：工作区里可能有**负责人在编辑器里的在编文件**
   （场景 / `Core/**` / `EditorBuildSettings`），`--all` 会把它们一起扫进来。按**显式路径**提交更安全。
3. **删除文件怎么提交**：文件已从磁盘删掉后，`cm ci <路径>` 会报 "not changed" 并整体中止
   —— 必须**先 `cm rm <路径>` 登记删除**，再 `cm ci`。`cm rm` 可以作用在**目录**上（会连带目录里的文件）。
4. **别把没改动的 `.meta` 传进 `cm ci`**：它会被判 "not changed" 而整体中止；只传**确实有改动**的路径。

> 另：MCP 的 `validate_script` **读不懂 `#if`**（同文件两分支同名会被判"重复签名"），且**不接受文件名带点**
> —— 平台相关实现要拆成两个文件（如 `WebChannelNative.cs` / `WebChannelEditor.cs`）。

## 4 待负责人拍板（已登记在 `DECISIONS.md` 未闭合表）

| 项 | 现在怎么办 |
|---|---|
| PR 由谁开 | 本机 GitHub 凭据失效，需人工开：`feat/unity-scaffold-bridge` → `main` |
| 编辑器内的在编文件（`0_Setup`/`1_Content`/`Core/**`/`Resources/`）何时提交 | 未纳入本批，留负责人自己那一批 |
| 亮色是否作为默认主题 | 现状：默认深色 |
| 包体预算门禁（DEC-02 的 250~360 MB 只有文字） | 真产物接入后加脚本 |
| 微信内置浏览器真机实测 | 待设备 |
