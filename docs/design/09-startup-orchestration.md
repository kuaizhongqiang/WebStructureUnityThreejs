# 设计 09：启动编排与桥消息落地

> 读者：AI 与人｜状态：2026-10-13 v1｜依据：`../DECISIONS.md` **DEC-80 ~ DEC-85**（第六轮问答的结论）。
> 上游：消息清单与信封见 [`02-bridge-protocol.md`](./02-bridge-protocol.md)；Unity 侧目录与程序集见 [`03-layout-and-assets.md`](./03-layout-and-assets.md)；
> 产物流水线见 [`05-unity-packaging-pipeline.md`](./05-unity-packaging-pipeline.md)。

## 1 `preload` 是什么（负责人口径，逐字转述）

> **启动 Web 服务时稍微延迟一点启动 Unity；Setup 自检通过后停留在内容场景上，等待接收 Web 传来的事件 —— 这个就是 preload。**

三条要点：

1. **Unity 的启动比页面晚一点**，不抢首屏（"无感加载"）；
2. "自检"= Unity 侧自己的初始化链（管理器逐个 Init），**通过后停在内容场景待命** —— 此时它**还没有装配任何任务**（不违反 DEC-08：装配必须由 Web 指令触发）；
3. **待命 ≠ 空闲**：它随时准备接收 `preload:task` 或 `scene:enter`。

## 2 场景结构

| 场景 | 角色 | 构建设置 | 生命周期 |
|---|---|---|---|
| `0_Setup` | 引导：引擎与管理器自检 | **进** | 自检通过后**切成 `1_Content` 并卸载自己**（single 切换） |
| `1_Content` | 常驻外壳：承载全部任务的装配 | **进** | **全程常驻，永不卸载**；任务之间只装卸资源包 |
| 漫游场景（若启用） | 房间漫游 | 进（或走 AA） | **在 `1_Content` 之上 additive** 加载，退出时卸载 |

规则（DEC-81）：

- **Unity 实例一旦启动就不卸载**，直到用户关掉整个页面；
- 任务之间**不重新加载场景**，只做"卸旧项目的资源包 + 装新项目的资源包"；
- 因此 `.data` 里只有 2~3 份场景，体积可预期。

## 3 启动链（Web 视角的时序）

```text
用户打开页面
  ├─（首屏先出 Web 自己的界面：外壳 / 菜单 / 图文任务）
  └─ 空闲后（且清单里有 Unity 产物）→ 延迟启动 Unity：
       注入 loader → createUnityInstance()   ← 引擎加载（进度 0~1）
       ◀─ unity:ready {version}              ← 握手；版本不符 → 明确报错，不降级
       ─▶ app:init {locale, qualityProfile, protocolVersion}
       Unity 侧：0_Setup 自检 → 切 1_Content → 待命
       ◀─ unity:progress（待命阶段可选）

用户点进某个 Unity 类任务：
       ─▶ preload:task {taskType}            ←（可选，提前装包）
       ─▶ scene:enter {taskType, projectId, contentVersion}
       ◀─ assets:ready {taskType}            ← 资源包装完（Web 可开始渲染该任务的界面）
       ◀─ unity:progress × N                 ← 装配进度
       ◀─ scene:ready {taskType}             ← 可交互（Web 结束 loading）
       用户切换任务：scene:exit → scene:enter（同实例，不重建）
       用户离开内容页：容器隐藏 + input:enable{false}
       回到内容页：容器可见 + runtime:resume + input:enable{true}
```

## 4 就绪语义：为什么"资产就绪"与"可交互"要分两条（DEC-84）

| 消息 | 含义 | Web 侧该做什么 |
|---|---|---|
| `assets:ready {taskType}` | 该任务的**资源包已装好**，三维世界还没装配完 | 开始加载/渲染该任务的 DOM 界面（题目、步骤提示、图集） |
| `scene:ready {taskType}` | 三维**装配完成、可交互** | 结束 loading 遮罩，解锁页签与交互 |

理由：界面的加载与渲染也在 Web 侧，把它与三维装配**并行**才叫"无感"。若只发一条 `scene:ready`，Web 只能等三维全好才开始渲染界面。

## 5 实例常驻时的"不可见"处理（DEC-84）

容器隐藏时**不能只 `display:none`** —— 浏览器会暂停 `rAF`，Unity 的渲染循环与协程一起停，回来后状态不可预期。做法：

1. **用一个全透明的父层画布（或让画布保持可渲染但不可见）**，让 Unity 内核继续跑，而不是把画布摘出文档流；
2. Web 发 **`runtime:resume`** 显式告知"恢复了"；
3. Unity 侧在"不可见"期间**让交互与更新链路提前返回**（不处理拾取、不推进步骤），但**保留渲染循环**；
4. **资产要卸干净**：切走时卸掉当前项目的资源包（与 §2 的"永不卸载实例"配套，否则实例常驻 + 包常驻会一路涨内存）。

## 6 输入边界（DEC-80）

- 常态：DOM 覆盖层用 `pointer-events` 决定谁能吃到输入；三维视口区域**不铺遮挡层**。
- 模态态：面板打开时 Web 发 **`input:enable{enabled:false}`**，Unity 停止处理三维输入，避免"被盖住的拖拽还在生效"。
- Unity 侧拾取体系：`EventSystem + StandaloneInputModule + PhysicsRaycaster`（**不建 Canvas、不用 GraphicRaycaster**）；交互物自注册（注册表），不靠 `FindObjectsOfType`。

## 7 进度合成

界面上只有一条进度条，因此由 **Web 侧**把两段映射成一条（权重写死在 Web 常量里，不由 Unity 下发）：

| 区间 | 来源 | 文案 |
|---|---|---|
| 0 ~ 0.6 | `createUnityInstance` 的 `onProgress`（引擎下载 + wasm 编译） | 正在加载三维引擎 |
| 0.6 ~ 1.0 | `unity:progress`（Unity 内装配） | 正在装配场景 |

## 8 失败与超时

- **用户主动进入**时：进入超时 **25s**、失败**重试 1 次**（DEC-71），失败必须给出可判定原因与出口（DEC-53 §11.6）。
- **预加载失败静默**：只记 `console`，等用户真的进入时再走完整流程与错误提示（DEC-84）。
- **清单说没有 Unity 产物时，绝不预加载**（DEC-79：缺席必须明说）。
- **移动端不预加载**（流量与内存），画质一律 `low`（DEC-70）。

## 9 构建粒度（DEC-81）—— **已实现**

**决定**：**一个 Unity 构建承载全部 Unity 类任务**（换任务只换资源包），不再"一个 TaskType 一个构建"。

落到代码里就是下面这几处（2026-10-13 落地，验收：桩构建 → 打包 → 壳冒烟仍 `mounted`）：

| 环节 | 实现（2026-10-13 已落地） |
|---|---|
| `unity/builds/<key>/` 的 `<key>` | **构建名**（当前固定 `main`），不再是任务名 |
| 暂存命令 | `--key main --task-types 4,5,8,9`（`--task-types` 必填，且与契约里的 TaskType 序号比对，写错直接拒绝） |
| `unity/builds/manifest.json` / `release-manifest.json` 的 `unity.builds[]` | 每项 **`taskTypes: number[]`**（升序去重）；旧清单的单值 `taskType` 仍兼容读取 |
| `web/src/stores/runtime.ts` | `pickUnityBuild`：**第一个声明包含该 taskType 的构建**（`declaresTaskType` 处理新/旧两种形状） |
| `electron/main.js` | 壳侧同一口径（独立进程，不共享页面模块） |
| 单测 | `web/src/stores/runtime.spec.ts` 锁住四种形状：新清单命中/不命中、旧清单兼容、声明为空不认定、多候选取第一个 |

## 10 本轮**不**做的事

- 不做 `ui:request` 的具体裁定（Unity 只允许"请求"，由 Web 决定是否响应 —— 沿用 `02-bridge-protocol.md` §5）。
- 不做心跳（长连接探活）；只在需要时用 `debug:ping/pong` 手动自检。
- 不做运行期热切换语言/画质之外的多语言动态补字（DEC-14 的 WebGL 字体红线在 Unity 侧随 UGUI 一起退场，本工程的语言切换由 DOM 承担）。

## 11 Web 侧的接线（2026-10-14，DEC-112）

§3 的时序在 Web 侧**收在一个会话对象**里（`web/src/unity/UnitySession.ts`），视图不再自己 `bridge.on(...)`。
三条必须收在一处、散在视图里必然会漏的纪律：

| 纪律 | 为什么 | 落点 |
|---|---|---|
| `app:init` 在**握手之后**发一次 | 收到 `unity:ready` 才是"Unity 可以收指令了"的信号（§3：自检通过才发握手） | `UnitySession.onHandshake` |
| `scene:enter` **幂等**，且允许"握手前先记意图、握手后补发" | 页面先导航、Unity 懒挂载是常态；而视图的同步函数会被各种响应式信号反复触发 —— 重发会让 Unity 侧一直"先退旧的再进新的" | `UnitySession.enterTask` + `enterDispatched` |
| `input:enable` 在**握手之前只记状态、不发消息** | ⚠️ Unity 的任务流程管理器是在**管理器自检里**才订阅这些事件的，早于握手发出去的消息**桥收得到、但没有订阅者** ⇒ 静默丢失（表现是"面板关了，三维还是点不动"） | `UnitySession.setInputEnabled` |

入站消息的落点：两条就绪（`assets:ready` / `scene:ready`）进状态位；`step:changed` 直接进进度条
（**扁平序号**，不用关心"进程"）；`task:completed` 进完成提示（`score` 缺席就只说用时，**不编造 0**）；
`object:picked` / `unity:error` 如实显示（非致命错误也要显示）；`ui:request` 进步骤面板（见 `10-step-system.md` §9）。

## 12 免 Web 自测与 dev 期联调（2026-10-14，DEC-113 / DEC-114）

### 12.1 为什么需要"免 Web 自测"

§1 的 preload 语义是"Unity 停在内容场景**等 Web 发指令**"，`scene:enter` 也只能由 Web 发（DEC-08）。
对产品这是对的，对**自测**却是死结：WebGL 产物一旦离开页面，就没有任何人能发指令 ——
验收时只能看到"停在 `1_Content`、画面里什么都没有"，而且失败时说不清是桥的问题还是装配的问题。

**做法**（`Assets/Scripts/Managers/StartupTestSwitch.cs`，摆在 `0_Setup` 的根物体 `TestSwitch` 上）：
在"管理器自检通过 + **活动场景已是 `1_Content`** + 当前没有任务"三个条件都满足时，
发一个与 Web **完全相同**的 `SceneEnterRequestEvent` —— 走的就是 §3 那条装包 → 装配 → `scene:ready` 链路，
所以它验证的是**产品路径本身**，不是一条平行的假路径。

| 项 | 口径 |
|---|---|
| 默认值 | `testEnabled = false` —— **关着时对产品路径零影响**（不发事件、不改状态，只打一条"仍在等 Web"的日志然后自毁） |
| 指定任务 | Inspector：`taskType`（默认 8 结构）/ `projectClip`（默认 `clip_contactor`） |
| WebGL 免重打包 | `?wsu3_test=on\|true\|1`（开，沿用 Inspector 取值）／`off\|false\|0`（显式关）／`<数字>`（开并把该数字当 `TaskType`）；`&wsu3_clip=<clip>` 覆盖 clip |
| 不抢 Web 的决定 | `CurrentTaskType != None`（Web 已先发 `scene:enter`）时自动让位，不重复进入 |
| 为什么等 `1_Content` | 结构任务的 `StructureTaskManager` 是**场景里的节点**；场景没到就发会走进"内容场景里没有 `StructureTaskManager` 节点"那条错误分支 |
| 为什么独占一个根物体 | `StartupFlow` 在引导末尾 `Destroy(gameObject)`（§2），会把同物体上的协程在切场景那一帧一起带走 |

### 12.2 为什么 dev 服务器要服务 Unity 产物

`/unity/**` 与 `release-manifest.json` 原本**只有壳的静态服务器**（`electron/server.js`）提供
⇒ `vite dev` 下点进 Unity 任务永远走"产物未就位"那条分支，人工联调必须先打包，改一行前端都要重来一遍。

`web/vite.config.ts` 的 `unityDevServe` 补上这两样（`apply: 'serve'`，不进产品）：

1. `/unity/<key>/**` → `<暂存根>/<key>/**`（暂存根默认 `unity/builds`，`WSU3_UNITY_DEV_ROOT` 可改道；与 `unity-stage.mjs --stage-root` 配套做**测试隔离**）；
2. 按**实际暂存内容**合成 `/release-manifest.json` —— 暂存了几个构建就报几个，一个都没有就 `unity.included = false` 并写明原因（DEC-79：缺席必须明说）；
3. 中间件注册在 Vite 内部中间件**之前**（在 `configureServer` 里直接 `use`）—— 否则 `/release-manifest.json` 会先被 SPA 兜底接走，
   返回一份 **200 的 index.html**，页面 `response.json()` 解析失败后**静默**退化成"没读到清单"。

### 12.3 桩构建的协议仿真（可选）

`tools/pipeline/make-stub-unity.mjs` 生成的桩默认只是"一块画布 + 一次握手"；
打开协议仿真（`window.__WSU3_STUB_PROTOCOL__ = true` 或 URL 带 `?wsu3_stub=protocol`）后，它会按契约回消息：
`scene:enter` → `assets:ready` → `unity:progress` → `scene:ready` → `step:changed` → `ui:request`（tips + ui），
收到 `ui:result` 后推进，并按 `ConditionQuestion` 的口径"答错重问"。仿真用的 `refId` 取**真实内容数据**里的 id。

于是"桥交互"进了冒烟（真 Chromium，18 条断言，见 `web/tools/render-smoke.mjs` 第 2b 节），
**不必等真 WebGL 构建**（DEC-59 要求构建前关编辑器，那条路很慢）。
⚠️ 但要说清：桩证明的是**契约两侧对得上**，**不等于**真 Unity 产物跑得通 —— 后者见 `TODO.md` D-24。
