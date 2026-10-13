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
| 1.9 | **拾取体系 + 任务流程收进 GlobalManager** | `InteractiveObjBase`（真基类：自注册 + 指针事件单一出口 + `OnHighlightChanged` 虚方法钩子，**无接口/服务**）、`InteractiveManager`（注册表 + EventSystem + PhysicsRaycaster + 点空白 + view:focus 全在一个文件里）、`TaskFlowManager`（流程 + 自驱协程泵）、`WebBridgeBehaviour`（意图事件 → 上网）、`Contracts/Events/BridgeEvents.cs`（入站事件 + 出站意图）；`WSU3.Core` 加 `UnityEngine.UI`（只为 EventSystems，DEC-80） | 全量重编译后 console 无 error（期间抓到并修掉一处缺 `using`） |

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
| f | 拾取体系：`EventSystem + StandaloneInputModule + PhysicsRaycaster`（**不建 Canvas**）+ 交互物自注册 + `object:picked` | `Core/Interactive/InteractiveObjBase.cs`、`Core/Managers/FunctionManager/InteractiveManager.cs`（含注册表，**不另建脚本/manager**）、`GlobalManager.Update`、`Web/WebBridgeBehaviour.cs`（上报） | 点中物体 → Web 收到 `object:picked`；点空白 → 一条 `Target=null` 的 Click | ✅ 代码就位（**待场景里有交互物可点**，见 g） |
| g | 场景接线：`0_Setup` 挂 `StartupFlow` + `WebBridge`；`Manager.prefab` 上放常驻对象 | `Assets/Scenes/*`、`Assets/Resources/*` | 编辑器里能 Play 起来 | ⬜（**只有这一步必须动场景**） |

**f 的实现要点**：
- **只有一个管理点**：拾取与交互登记都在 `Core/Managers/FunctionManager/InteractiveManager.cs`（即 `GlobalManager.InteractiveManager`），**不另建 manager、不另建注册表脚本**。
- **驱动**：它不是 MonoBehaviour，逐帧由 `GlobalManager.Update()` → `InteractiveManager.CoreUpdate()` 驱动；`Init/OnDespose` 挂在管理器链上，与其它 FunctionManager 一致。
- **注册表是 `InteractiveManager` 的 static 字典**（按**契约 key**）：交互物在 `Awake` 里自注册，走静态入口是为了不在管理器链就绪前把 `GlobalManager` 提前创建出来。
- **就位**：`Init` 时没有 `EventSystem` 就建一个（`EventSystem + StandaloneInputModule`，`DontDestroyOnLoad`，不建 Canvas）；`CoreUpdate` 里兜底给主相机补 `PhysicsRaycaster`（相机可能晚就绪）。
- **闸门**：`InputGate` 关上时连射线都不做（并把 `PhysicsRaycaster` 一起禁用）。
- **点空白**：EventSystems 只在命中物体时回调，所以"点空白"由 `InteractiveManager` 自己射线判定后补发一条 `Target = null` 的 Click（取消连线 / 收起浮卡依赖它）。
- **物体侧**：派生 `InteractiveObjBase` 的组件（配 `Collider`）自动登记；悬停/按下/抬起/点击 → `EventBus<GlobalInteractionEventData>` 单一出口。
- **高亮不做实现**（负责人 2026-10-13 明确）：基类只维护 `IsHighlighted` 状态并提供 `protected virtual OnHighlightChanged(bool)` 钩子，**表现由业务自己重写**；不引入接口/服务注册。
- **`view:focus`**：按 key 找物体 → 调 `SetHighlight(true)`（每次只亮一个；`scene:exit` 时清掉）。
- **未做**（有意）：右键与双击（契约里已有 `ClickRight` / `ClickDouble`，需要时在 `InteractiveManager` 里补判定）。

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

### P0-2 流水线"单构建多任务"语义（DEC-81）

| 步骤 | 内容 | 落点 |
|---|---|---|
| a | 暂存入参改 `--key main --task-types 4,5,8,9` | `tools/pipeline/unity-stage.mjs` |
| b | 清单每项加 `taskTypes: number[]` | `tools/pipeline/*`、`unity/builds/manifest.json` 形状 |
| c | 加载器改"找第一个声明包含该 taskType 的构建" | `web/src/stores/runtime.ts`（`unityBuildFor`）、`web/src/unity/UnityLoader.ts` |
| d | 壳冒烟里的 Unity 页断言随之更新 | `electron/` 冒烟脚本、`web/tools/` |

**验收**：`make-stub-unity.mjs` 用新形状产出桩构建 → 打包 → 壳里 Unity 页仍 `mounted`。

### P0-3 Web 内容层改用 `content/data/*.json`

| 步骤 | 内容 | 落点 |
|---|---|---|
| a | 内容层读取路径与形状换成被采纳数据（`ProjectData.json` / `QuestionData.json` / `MenuData.json`） | `web/src/stores/content.ts`、`web/src/domain/*` |
| b | 项目列表 / 菜单 / 题目页改用真实数据；`content/projects/demo-temperature.json` 保留为"无真实内容时的演示兜底" | `web/src/views/*` |
| c | 渲染冒烟断言随之补（至少：9 个项目出现、随机进一个项目能出正文） | `web/tools/render-smoke.mjs` |

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
