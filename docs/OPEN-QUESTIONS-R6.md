# 问题清单 · 第六轮（R6）：Unity 脚手架 —— UI 形态与启动阶段事件

> 读者：**你**（本项目负责人）｜状态：2026-10-13（**26 条已答；补充 14 条待答**，见 §六）｜性质：**活文档**。
> 权威层级：`requirement/raw/raw-requirement.md` > `../AGENT.md` > `DECISIONS.md` > 本文 > 其他。
> 回答结果在回答后固化为 `DECISIONS.md` 的新条目（**DEC-80 起**），本文只作为问题与回答的原文留痕。

## 一、这一轮为什么还要问

你在 2026-10-13 给了两条口径：

1. **所有 UI 组件都用 Web（DOM），不用 Unity 原生 UGUI**；
2. 事件通讯**先搞定启动部分**：Web → Unity 发事件，明确"预加载 / 加载哪些数据进去 / 切换"。

第 1 条与**已生效的 DEC-14**（"Unity 侧 UI 用 uGUI + TMP"）直接冲突；第 2 条要落地，必须先解决三个当前**已经存在于工作区、但互相矛盾**的事实。所以本轮问三类东西：

- **冲突澄清**：你的新口径与已定决策、现有脚手架代码不一致的地方（§二，必须先答）；
- **落地必须补的数字与形状**：启动阶段到底发哪几条消息、谁读内容 JSON、进度怎么合成（§三、§四）；
- **连带纪律**：契约同批修改、依赖分层、本批提交范围（§五）。

本轮**不改** Web 侧样式与页面（那些走 `docs/ui-mockups/` 那条线），也**不动**排版稿。

## 二、怎么用

在 `回答：` 后写（写字母即可）；`★` 是建议默认值，写 `同意★` 即采纳；**【P0】= 阻塞我下一步**。

当前进度：**已答 26 / 26；补充提问 14 条待答（S1 ~ S14）**。

## 三、先看这三条（本轮全部问题里最硬的三个冲突）

| # | 冲突 | 两侧各是什么 |
|---|---|---|
| ① | **Unity 侧还要不要 UI** | 你说"全部 Web" ↔ DEC-14 说"uGUI + TMP"，`docs/design/03-layout-and-assets.md` §2 还留着 `UIs/`（uGUI Canvas/Panel/Component）目录 |
| ② | **Unity 产物粒度** | 现有流水线是"**一个 TaskType 一个 WebGL 构建**"（`web/src/unity/UnityLoader.ts` 按 `key` 挂 `/unity/<key>/`；DEC-79 的 `unity-stage.mjs --key --task-type`）↔ 工作区里的新脚手架是"**一个 Unity 实例、按 `prefabKey` 装配不同任务**"（`Assets/Scripts/Core/Models/ProjectData.cs` 里 `TaskData_LineConnection/Training/Structure/Inspection` 都只有 `prefabKey` 字段） |
| ③ | **内容数据的权威形状** | Web 侧是 `tasks: Task[]` + `data` 判别式联合 + `resources: string[]`（`docs/design/04-data-model.md` §2.2）↔ Unity 侧是 `ProjectClip` 下**十个固定槽位** `purpose/equipment/principle/lineConnection/training/test/info/structure/inspection/exam`（`ProjectData.cs`） |

> 提前说明一个事实：你现在工作区里这批 Unity 文件**都还没提交**，且已与文档冲突（尤其 `QuestionType` 与 `WSU3.Core.asmdef`，见 Q-R6-20 / Q-R6-24）。所以三条冲突都在"还来得及改"的窗口内。

---

## 第一部分 · UI 形态（你的第 1 条口径怎么落地）

### Q-R6-1 Unity 侧 UI 是否"归零"？【P0】

- 背景：DEC-14 定的是"uGUI + TMP"，并附了一条 WebGL 红线（TMP 中文字形必须预烘焙、包体要算进去）。你说"全部用 Web"，需要一条**新决策取代 DEC-14 的 UI 部分**（DECISIONS 只增不改，我不会去改 DEC-14 原文）。
- 绕不开的例外：**三维世界内贴着物体的文字**（部件名称、读数、引线标签）也是"文字"，但它有三维坐标。
- 选项：
  - A) **完全归零**：Unity 里没有任何 Canvas / TMP 文本，连世界内标签也用 DOM 画 ★
  - B) 面板归零，**世界内文字仍用 TMP**（保留 TMP 与中文烘焙，DEC-14 的字体红线继续有效）
  - C) 其他（请说明）
- ★建议：**A**，但把"世界内标签"做成**可开关的一条消息**（见 Q-R6-2），避免每帧消息变成性能黑洞。
- 影响：`WSU3.Core`/`WSU3.Runtime` 的 asmdef 依赖、`docs/design/03` §2、包体预算（DEC-02）、DEC-14 的连带红线。
- 回答：A 世界内我们也不用UGUI系统

### Q-R6-2 三维世界内的标签/引线怎么做？【P0】（若 Q-R6-1 选 A 则必答）

- 背景：DOM 覆盖层画标签，必须知道"这个物体现在在屏幕的哪"。三种做法代价完全不同。
- 选项：
  - A) **Unity 回报屏幕坐标**：新增一条 `object:screen {objectKey, x, y, visible}`，Unity 在**位置变了才发**（不是每帧）；DOM 用 `transform` 平移标签 ★
  - B) **Unity 每帧回报**（简单但会成为消息热点，Web 里再插值）
  - C) **不做跟随标签**：只做"侧栏列表 ↔ 物体高亮"联动，文字全在侧栏
  - D) 世界内文字用 TMP（等于 Q-R6-1 选 B）
- ★建议：**A**（变化才发；且"变化"由 Unity 侧做阈值判定，避免抖动）。
- 回答：C

### Q-R6-3 Unity 侧还留不留 EventSystem / Canvas？【P1】

- 背景："面板 UI 全在 Web"不等于"Unity 不需要输入"。三维拾取（点物体、拖拽、旋钮）需要射线检测。
- 选项：
  - A) **只留物理拾取**：Unity 侧用 Camera 射线（或 `Physics` + Collider）自己判定，**不装 UGUI/EventSystem** ★
  - B) 保留 `Canvas + GraphicRaycaster + EventSystem`，但 Canvas 里没有任何可见 UI（只为输入服务）
- ★建议：**A**（少一个包、少一层事件系统；且与"归零"一致）。
- 回答：GraphicRaycaster + EventSystem 要保留 但是Canvas不会有

### Q-R6-4 Web 覆盖层与画布的输入边界怎么划？【P1】

- 背景：DOM 覆盖在 canvas 上，点击/滚轮/右键菜单/拖拽都可能被两边同时吃。
- 选项：
  - A) **DOM 优先，画布只吃"没被 DOM 挡住"的区域**（CSS `pointer-events` 控制；三维视口区域 DOM 不加遮挡层）★
  - B) 用一层"输入透传开关"：面板打开时 Unity 不接收输入（由 Web 发 `input:enable{enabled}` 指令）
  - C) A + B 都要（遮挡区用 CSS，模态面板用显式开关）
- ★建议：**C**（CSS 解决常态、消息解决模态态；模态态必须有显式开关，否则 Unity 会继续响应被盖住的拖拽）。
- 回答：C

### Q-R6-5 包与依赖怎么改（TMP / uGUI 还留吗）？【P1】

- 背景：`NewStructureUnity/Packages/manifest.json` 现有 `com.unity.textmeshpro@3.0.7`、`com.unity.ugui@1.0.0`，以及 `com.unity.modules.ui` / `uielements`。
- 选项：
  - A) **按 Q-R6-1 的结论删干净**（若选 A 就移除 TMP/uGUI；UI Elements 属于编辑器/运行时基础模块，是否一并去掉请一并答）★
  - B) 先留着不删（潜在收益是以后想加回来容易；代价是包体与"两套 UI 纪律"的漂移风险）
- ★建议：**A**，并**同批**在 `docs/design/03` 更新依赖表（去 TMP/uGUI）。
- 回答：B

---

## 第二部分 · Unity 产物粒度与场景结构（第二节的冲突②）

### Q-R6-6 Unity 构建的粒度：一个 TaskType 一个构建，还是一个构建装全部任务？【P0】

- 背景（现状事实）：
  - **流水线侧**（已实现，DEC-79）：`unity/builds/<key>/`，`key` 对应 TaskType；`web/src/unity/UnityLoader.ts` 用 `unityBaseUrl(key)` 挂 `/unity/<key>/`；`stores/runtime.ts` 按 `unityBuildFor(taskType)` 判断能不能挂。
  - **新脚手架侧**：`ProjectClip` 里每个任务只给 `prefabKey`（`ProjectData.cs`），暗示"一个实例内按 key 装配"。
- 选项：
  - A) **单构建多任务**（脚手架现状）：一个 WebGL 构建装全部 Unity 类任务，任务间只换 prefab/Addressables 条目。切换快、只需下载一次引擎；但**首包更大**（除非用 Addressables 远程/按需分包），且切任务不能释放引擎
  - B) **一 TaskType 一构建**（流水线现状）：每个任务一个独立构建，切换即换构建。切换慢（每次 8.40 MiB 起 + 重新编译 wasm）；但互不影响、可单独更新
  - C) A 为主 + 特殊任务单独构建（如"漫游"这种完全不同的场景）
- ★建议：**A**（并保留 C 作为逃生口）。理由：`docs/research/08-webgl-baseline.md` 实测空场景底座 8.40 MiB，若每个任务都重下重编一遍，11 个任务里 4 个 Unity 任务的体验会被"反复冷启动"吃掉；而 Addressables 本来就是为"一个引擎 + 按需内容"设计的。
- ⚠️ 选 A 意味着**要改已落地的流水线与加载器语义**（`UnityLoader.ts` 的 `key` 含义、`release-manifest.json` 的 `unity.builds[]` 语义、`runtime.ts` 的"能不能挂"）。这是本轮改动最大的地方，必须你点头。
- 回答：A

### Q-R6-7 双场景（`0_Setup` + `1_Content`）保留吗？【P0】

- 背景（工作区现状，未提交）：`Assets/Scenes/0_Setup.unity`（空）+ `Assets/Scenes/1_Content.unity`（Main Camera + Directional Light），两者都已写进 `ProjectSettings/EditorBuildSettings.asset`。**WebGL 会把 Build Settings 里的场景全部打进 `.data`**（`docs/design/06-unity-manual-build-checklist.md`），多一个场景就是多一份常驻体积；且 `SceneManager.LoadScene` 在 WebGL 里是**同步阻塞**（会在加载时卡住主线程）。
- 选项：
  - A) **只留一个场景**（把 `1_Content` 作为唯一场景；"Setup"只是概念上的初始化阶段，不需要独立场景）★
  - B) 保留双场景，`0_Setup` → `1_Content` 走 `LoadScene`
  - C) 保留双场景源码但**只有 `1_Content` 进 Build Settings**（`0_Setup` 仅供编辑器里手动调试）
- ★建议：**A**。理由：`GlobalManager` 的 `DelayInit` 已经把"初始化"做成了协程流程（`Core/Managers/GlobalManager.cs`），不需要靠场景来分阶段；而双场景在 WebGL 上纯属体积与卡顿。
- 回答：B 这说明确说一下 暂时看我们会在第一次启动unity后就不卸载了 但是会不断加载卸载AB AA资产

### Q-R6-8 "切换"的语义：任务之间怎么切？Three 类任务与 Unity 类任务互切时实例去留？【P0】

- 背景：11 个 TaskType 里只有 4 个走 Unity（`docs/design/02-bridge-protocol.md` §4），其余走 Three.js。所以页签切换有四条边：Unity→Unity、Unity→Three、Three→Unity、Three→Three。
- 选项（Unity 实例的生命周期）：
  - A) **Unity 实例常驻**：一旦挂上就不销毁，切到 Three 任务时只隐藏容器（`display:none`），回到 Unity 任务直接复用。**最快**，但内存与显存一直占着，且隐藏时浏览器可能暂停 `rAF`（Unity 渲染循环会停，需确认恢复逻辑）★
  - B) **切走即销毁**（现状 `UnityLoader.unmount()` → `bridge.detach()` → `Quit()`）：内存干净，但每次回到 Unity 都要重新走一遍 8.40 MiB 级加载
  - C) 按"是否离开内容页"决定：内容页内切换复用，离开内容页才销毁 ★（= A 的收敛版）
- 补充必答：Unity→Unity 切换时，是 `scene:exit` + `scene:enter`（同实例换任务），还是重建实例？（若 Q-R6-6 选 A，这里只能是前者）
- ★建议：**C**，且 Unity→Unity = `scene:exit` → `scene:enter`；**并且要新增一条"隐藏/恢复"语义**（否则 `display:none` 期间的状态无法定义）。
- 回答：A 但是要正确加载和卸载资产

### Q-R6-9 `CoreEvent.cs` 里的"漫游场景"还要不要？【P2】

- 背景：工作区的 `Assets/Scripts/Contracts/Events/CoreEvent.cs` 里有 `LoadRoamingSceneRequestEvent` / `LoadRoamingSceneFinishEvent`（整场景加载，像"大场景漫游"）。`docs/PAGE-WORKLIST.md` A6 也列了漫游页（标注 MCV 缺、Sensor 有）。但漫游整场景在 WebGL 上就是"再打一份场景进包"。
- 选项：
  - A) **本期删掉这两条事件与漫游场景概念**，只保留"项目内容页"一条线 ★
  - B) 保留，漫游作为一个独立 TaskType/独立构建（走 Q-R6-6 的 C）
- ★建议：**A**（需求里没有漫游；`requirements` 未提，DEC 也没定，属于参考工程带进来的概念）。
- 回答：B 功能要有 也许会有单独的入口 AA包加载卸载

---

## 第三部分 · 启动阶段的 Web → Unity 事件与编排（你的第 2 条口径）

> 现状：`docs/design/02-bridge-protocol.md` 已有消息清单（`app:init` / `scene:enter` / `scene:exit` / `view:focus` / `ui:set-locale` / `ui:set-quality` / `debug:ping`），但 **Unity 侧一行都没实现**（`.jslib` + `WebBridge.OnWebMessage` 尚未落地，README「尚未开始」也这么写）。所以现在定的是"等一下就要照着写代码"的清单。

### Q-R6-10 "启动部分"的边界到底是哪一段？【P0】

- 选项：
  - A) **从"用户打开应用"到"第一个 Unity 任务可以交互"**（含引擎下载、实例化、装配、可点）★
  - B) 只到"Unity 画面出现"（引擎 ready），装配不算
  - C) 只到"Web 侧决定要进某个 Unity 任务"（即只定 Web 发出的指令，不管 Unity 怎么回）
- ★建议：**A**。理由：只有 A 才能回答"用户白等了多久"这件事，而 DEC-53/71 的失败判定（25s / 重试 1 次）也是按这个口径才有意义。
- 回答：每一个任务类型的加载 我们都设定一个事件 当触发加载完成事件之后web再继续 等待可以用loading

### Q-R6-11 启动阶段要发哪几条消息？（要不要新增 `preload:*`）【P0】

- 背景：现在文档里启动阶段只有 `app:init` + `scene:enter` 两条；你这次要的"**预加载**"在文档里**根本不存在**，要么新增消息，要么明确"预加载不用协议"。
- 选项：
  - A) **不加新消息**：引擎预热由 Web 自己做（`createUnityInstance` 就是预加载），任务资源一律等到 `scene:enter` 时才装
  - B) **新增 `preload:task {taskType, contentId}`**：让 Unity 在用户还在看上一页（或刚进内容页）时，就把该任务的 prefab/资源装好；进入时才 `scene:enter` 正式装配 ★
  - C) B + **`preload:cancel`**（用户切走了，取消预加载）
- ★建议：**C**（B 是收益，C 是"不取消就会白装一堆东西"的必要配套）。要不要再加 `preload:engine` 这条纯 Web 自做的事，我倾向**不加**（Web 自己能做，不该让协议承担）。
- 回答：发几条消息你自己定 但是预加载应该先把unity启动起来 然后等待事件 到底加载什么

### Q-R6-12 `app:init` 什么时候发、带什么？【P0】

- 背景：文档里 `app:init` 的 payload 是 `{ locale, qualityProfile, protocolVersion }`。问题在**时机**：到底是"Unity 一握手就发"，还是"第一次 `scene:enter` 时合并发"。
- 选项：
  - A) **握手后立刻发**（`unity:ready` → `app:init`）：它是"环境配置"不是"内容"，早发早生效；此时 Web 未必有项目上下文，但也不需要 ★
  - B) 延后到第一次 `scene:enter` 一起发（少一条消息，但 Unity 在装配前拿不到语言/画质）
- 补充必答：`locale` 与 `qualityProfile` 的**初始值**从哪来？（`stores/session` 的 settings？设备探测？——`web/src/platform/device.ts` 已有移动端强制 `low` 的逻辑）
- ★建议：**A**；初始值取 `save`（DEC-54）里的 `settings`，缺失时用设备探测结果。
- 回答：你来定就好

### Q-R6-13 预加载什么时候触发？【P0】

- 选项：
  - A) **进入任务时才加载**（= 现状：`TaskView` 挂载时才 `mountUnity`）。首屏最干净，进 Unity 任务最慢
  - B) **应用启动后、首屏可交互后的空闲时段预热**（只把引擎底座拉下来 + 实例化，停在"待命"状态，不装配任务）★
  - C) **在菜单页/内容页按"用户将要点的项目"预加载**（比 B 更晚、更准）
  - D) B + C（引擎底座用 B，具体任务资源用 C）
- 必答条件：移动端要不要预加载？（DEC-70 已定"移动端一律 `low`"，但没定"要不要提前下载"）——建议**移动端不预加载**（流量+内存），只在桌面端 B+C。
- ★建议：**D**，且 `release-manifest.json` 里 `unity.included=false` 时**绝不预加载**（DEC-79 的"缺席要说清"）。
- 回答：你来定就好 我希望是无感加载

### Q-R6-14 "预加载哪些数据"具体是哪几层？【P1】

- 背景：目前至少有四层东西，混在一起就没法定义进度与失败。
  - L1 **引擎底座**：`/unity/<key>/` 下的 `.loader.js` / `.wasm` / `.data` / `.framework.js`（`docs/research/08-webgl-baseline.md`：空场景 8.40 MiB）
  - L2 **Unity 侧资源**：Addressables 分组（按 TaskType？按项目？按资源类型？`docs/design/03-layout-and-assets.md` §7 未定）
  - L3 **内容 JSON**：`content/projects/<id>.json`（Web 侧读，见 Q-R6-17）
  - L4 **大资产**：模型/贴图/视频（`content/assets/`，DEC-57 不进 git）
- 选项：
  - A) 只定义 **L1 + L3** 的预加载（L2/L4 一律等到 `scene:enter` 后按需）★
  - B) L1 + L2 + L3 都预加载（L2 需要先定分组策略）
  - C) 全部，包括 L4
- ★建议：**A**（先把启动跑通；L2/L4 的按需策略等真资源接入再定，否则会在没有真实资源时先设计一堆分组，随后全部返工）。
- 回答：你来定就好

### Q-R6-15 预加载失败了怎么办？25s 超时覆盖到哪？【P1】

- 背景：DEC-71 定的 `25s / 重试 1 次` 是针对"**进入**"，但现在多了"**预加载**"这个更早的动作，两者失败语义不同。
- 选项：
  - A) **预加载失败静默**（只记 `console`，进入任务时再走完整流程与错误提示）；25s 覆盖"从开始加载到 `scene:ready`"全长 ★
  - B) 预加载失败立刻弹提示（用户可能还没打算进 Unity 任务，会莫名其妙）
  - C) 25s 只覆盖引擎加载，装配阶段另设一个超时
- ★建议：**A**（不打扰）；并明确"**用户主动进入时**才允许把失败呈现出来"。若选 C，请给装配阶段的阈值。
- 回答：A

### Q-R6-16 进度条怎么合成？【P1】

- 背景：现在有**两段互不相干**的进度：`createUnityInstance` 的 `onProgress`（下载+编译，`UnityLoader.ts` 直接透传）与 Unity 侧装配的 `unity:progress`（`docs/design/02` §3.2）。用户在界面上只能看一条进度条。
- 选项：
  - A) **两段式映射**：0~0.6 给引擎（Web 定权重）、0.6~1.0 给装配；文案分"正在加载引擎 / 正在装配场景" ★
  - B) 各显示各的（两条进度或两次不同的加载界面）
  - C) 只显示引擎进度，装配阶段显示不确定动画（转圈）
- ★建议：**A**（权重写死在 Web 侧常量里，不放在 Unity 下发，避免"进度由被加载方指挥"）。
- 回答：A

---

## 第四部分 · "加载哪些数据进去"：内容数据的形状与归属（冲突③）

### Q-R6-17 内容 JSON 谁来读？Web 读完下发，还是 Unity 自己去 HTTP 拉？【P0】

- 背景：两条路都能走，代价差别很大。
  - **Web 读后下发**：单一真源最干净；但要走 `SendMessage` 传**一个字符串**（`docs/design/02` §1 硬约束②），而内容规模是 ×3 后约 1.7MB（`docs/research/06-scale-baseline.md`），整包塞消息里代价高、也不好定位问题。
  - **Unity 自己拉**：要给它 URL（`baseUrl` 由 Web 传，因为部署前缀/版本指纹在 Web 手里）；好处是大内容不经过消息通道。注意这不违反 DEC-08——DEC-08 管的是**会话/导航状态**的唯一真源，不是"文件谁能读"。
- 选项：
  - A) **拆分**：小配置（`{taskType, contentId, baseUrl, resourceKeys}` 之类）走消息；大 JSON 由 Unity 按 `baseUrl` 自己 `UnityWebRequest` 拉 ★
  - B) Web 全量读后整包下发（简单，但大项目会撞消息长度与 GC）
  - C) Unity 全量自读（Web 只给 `contentId`；但"给什么"的字段就要重新定义）
- ★建议：**A**。
- 回答：二者数据各自存 build project 门禁来保证二者内容一致

### Q-R6-18 如果走 A，`scene:enter` 的 payload 里到底放什么？【P0】

- 选项：
  - A) **最小集 + 版本指纹**：`{ taskType, contentId, contentUrl, contentVersion, resourceKeys: string[] }`★
  - B) A + **任务数据的完整内联**（Unity 不需要再请求，但 payload 很大）
  - C) 你指定字段
- ★建议：**A**；`contentVersion` 用于 Unity 侧缓存失效（DEC-23 内容整体重发，不做热更新）。
- 回答：

### Q-R6-19 内容 JSON 的**权威形状**用哪一套？【P0】

- 背景（两套并存，必须二选一或定一份映射）：
  - Web 侧（`docs/design/04-data-model.md`）：`{ version, projectId, name, engName, tasks: Task[] }`，其中 `Task = { taskType, active, score, camera, resources[], data }`，`data` 是**判别式联合**（按 `taskType` 决定形状）。
  - Unity 侧（工作区 `Core/Models/ProjectData.cs`）：`ProjectClip : DataBase` + **十个固定槽位**（`purpose`/`equipment`/`principle`/`lineConnection`/`training`/`test`/`info`/`structure`/`inspection`/`exam`），字段名如 `prefabKey` / `content` / `equipmentList`。
  - 还有明显对不上的：

    | 语义 | Web 侧 | Unity 侧 |
    |---|---|---|
    | 名称 | `name` | `name` / `name_en` / `displayName` / `displayName_en`（`DataBase.cs`） |
    | 三维资源引用 | `resources: string[]`（引用资产登记表 `key`） | `prefabKey`（单值） |
    | 步骤/题目 | `Step[]` / `Question[]` 内联 | 只有 `questionClipIds: List<string>`（题目另表） |

- 选项：
  - A) **以 Web 的 `docs/design/04` 为权威形状**，Unity 侧 C# 改成能反序列化这套 JSON（`tasks[]` + 判别式 `data`）；Unity 内部的十个槽位只做"运行时索引缓存"，不是 JSON 形状 ★
  - B) 以 Unity 的 `ProjectClip` 十槽位为权威，Web 侧改 TS 契约
  - C) 定一份"映射文档"两套并存（我不建议：这正是漂移的来源）
- ★建议：**A**。理由：内容 JSON 是**随包发布的只读文件**，Web 与 Unity 都要读它；而 `docs/design/04` 已经是"双端共享契约的一部分"，有 DEC-67/68 的快照门禁守着；反之 Unity 侧那套是刚从既有工程移植过来的，还没进门禁。
- ⚠️ 选 A 的话，`ProjectData.cs` 里那 10 个 `TaskData_*` 类要重写（工作量不大，但要在本轮定，否则后面越滚越远）。
- 回答：你来定如何统一 但我要求两套各自存各自的

### Q-R6-20 `QuestionType` 的取值到底哪个对？契约要不要同批改？【P0】

- 背景（**这是一个会直接拦提交的问题**）：
  - `docs/design/04-data-model.md` §2.5 写的是 `questionType`：**1 单选 / 2 多选 / 3 判断 / 4 填空 / 5 排序**；
  - 工作区 `Assets/Scripts/Contracts/EnumAll.cs` 新增的是 **0 单选 / 1 多选 / 2 判断 / 3 填空 / 4 问答**。
  - 两者**值域与语义都不同**；而且这个新增枚举**没有同批改** `web/src/contracts/*` 与 `content/contracts/snapshot.json`，`tools/check-contracts.mjs` 会直接拦下提交（DEC-10 / DEC-67 / DEC-68）。
- 选项：
  - A) **以 `EnumAll.cs` 为准**（0 起、含"问答"、无"排序"），改 `docs/design/04` 与 Web/快照 ★？
  - B) **以 `docs/design/04` 为准**（1 起、含"排序"、无"问答"），改 C#
  - C) 两者都不对，你重给一份（请写：`0=? 1=? ...`）
- ★建议：**A**，但请确认"排序题"是否真不需要（参照工程里 `questionType` 有 5 种形态）。**枚举序号是跨端契约，改一次就要三处同批改**，所以现在定下来最便宜。
- 回答：你来定如何统一 但我要求两套各自存各自的

### Q-R6-21 资源 `key` → 实际路径由谁解析？【P1】

- 背景：`docs/design/03-layout-and-assets.md` §4 定了"以资源为主键（key）"的登记表，`sha256` 是完整性依据；Web 侧 `resources: string[]` 只放 key。Unity 侧 `prefabKey` 也一样。
- 选项：
  - A) **Unity 自己按 key 查 Addressables**（Web 只传 key 列表）；Web(Three) 侧按 `content/asset-registry.json` 自己解析 ★
  - B) Web 把 key 解析成 URL 后传给 Unity（Unity 不关心登记表）
- ★建议：**A**（各端各管各的，正好对上 DEC-11"两侧各做各的"与 DEC-60"允许两侧各留一份资产"）。
- 回答：你来定如何统一 但我要求两套各自存各自的

### Q-R6-22 Addressables 的分组与存放位置怎么定？【P2】

- 背景：`docs/design/03-layout-and-assets.md` §7 留了三个未定项（分组策略 / 大资产放 `content/assets/unity/` 还是交给 Addressables / 是否远程目录）。Q-R6-6 若选"单构建多任务"，这一项就从"可选"变成"必答"。
- 选项：
  - A) **先按 TaskType 分组、全部进包内（`StreamingAssets`/内置 catalog）**，不做远程；等体积真的超预算再切远程 ★
  - B) 一开始就按项目分组 + 远程目录（`content/assets/unity/` 走 HTTP）
  - C) 本期不定，等真资源接入再说
- ★建议：**A**（本阶段没有真资源，定远程目录等于先写一套没有数据的运维面）。
- 回答：参考之前给你的参考项目 F:\Project\MCV_Module_0928

---

## 第五部分 · 状态归属与连带纪律

### Q-R6-23 Unity 侧 `SceneState` 是"镜像"还是"真源"？【P1】

- 背景：工作区 `Core/Managers/GlobalManager.cs` 里有 `[SerializeField] SceneState currentSceneState = SceneState.Setup;`，而 DEC-08 说真源在 Web、Unity 只待命。另外 `SceneManager`（`Core/Managers/FunctionManager/SceneManager.cs`）持有 `DataStructMapping.GetContentSceneName()`，暗示它可能会自己 `LoadScene`。
- 选项：
  - A) **Unity 侧只读镜像**：`currentSceneState` 由收到的桥消息赋值，Unity**永不自己改**；场景加载也必须由 Web 指令触发 ★
  - B) Unity 侧可以自主推进 `SceneState`（Web 只做粗粒度导航）
- ★建议：**A**（否则会出现两个真源，`stores/session.ts` 的那份与 Unity 那份打架）。
- 回答：A

### Q-R6-24 `WSU3.Core` 现在依赖 `WSU3.Contracts`，`docs/design/03` 的知识要不要更新？【P1】

- 背景：工作区把 `Core/WSU3.Core.asmdef` 的 `references` 从 `[]` 改成 `["WSU3.Contracts"]`。但 `docs/design/03-layout-and-assets.md` §2 的表格写的是"`WSU3.Core` 依赖：**无**（除 Unity 内置）"。
- 选项：
  - A) **接受这次依赖，并更新 design/03 表格**（`WSU3.Core → WSU3.Contracts`；只要不发生反向依赖，"契约在最底"这条就成立）★
  - B) 撤掉这个依赖（`Core` 不碰枚举，枚举只在 `Runtime` 层用）
- ★建议：**A**。
- 回答：A

### Q-R6-25 桥消息的 `type` 清单要不要纳入契约机械校验？【P1】

- 背景：现在 `web/src/contracts/` 只有 `SceneState` / `TaskType`（+ `BRIDGE_PROTOCOL_VERSION`），桥消息类型（`app:init`/`scene:enter`/…）**只是文档里的字符串**，写错不会有任何门禁拦。而 `docs/design/02` 说"每个 TaskType 的最小消息集合是硬约束"。
- 选项：
  - A) **纳入契约**：TS 侧导出 `BridgeMessageType` 常量，C# 侧也写一份，`snapshot.json` 记一份，`tools/check-contracts.mjs` 三方比对 ★
  - B) 不纳入（靠文档 + code review）
- ★建议：**A**（否则"硬约束"只是口头约定；这份清单是接下来要照抄写代码的东西，最值得机械守住）。
- 回答：你来定

### Q-R6-26 这一批脚手架的落地顺序与提交范围？【P1】

- 背景（现状事实）：工作区里这批 Unity 文件**全部未提交**，且其中有**会拦门禁的改动**（Q-R6-20 的 `QuestionType`、Q-R6-24 的 asmdef）；同时 git 侧走 PR（DEC-78）、Unity 侧还要走 Plastic 双渠道（DEC-60）。
- 选项（顺序）：
  - A) **先答复本文件 → 我改 `docs/design/02/03/04` 与契约三处 → 再落 Unity 侧桥（`.jslib` + `WebBridge`）与脚手架代码** ★
  - B) 先落桥代码，文档后补（我不建议：契约三处不同批改，门禁会拦，且容易留下两份事实）
  - C) 只提交文档，代码你自己来
- 补充必答：`QuestionType` 这类工作区改动，是**你自己移植的**还是希望我按答案改？（涉及要不要我动你的文件）
- ★建议：**A**；并且把"脚手架植入"切成**两个可验收改动**分别提交：① 契约与文档对齐；② 桥 + 启动编排代码（每个改动一次提交，DEC-28）。
- 回答：A

---

# 第六部分 · 补充提问（R6 补 · S 系列）

> 2026-10-13，你答完 26 条后我复核了一遍。下面 14 条分三类：**① 回答之间技术上进不去（S1~S4）**、**② 需要把口径变成可执行定义（S5~S10）**、**③ 你说"你来定"我先定好了、请你过一眼（S11~S14）**。
> 格式同上：`回答：` 后写字母；`★` 是建议；**【P0】阻塞**。

## 一、回答之间技术上进不去（必须先解决）

### Q-R6-S1 "保留 GraphicRaycaster + EventSystem 但不建 Canvas"在 Unity 里落不了地【P0】

- 事实：`GraphicRaycaster` 是**挂在 Canvas 上**的组件（`RequireComponent(typeof(Canvas))`），没有 Canvas 就没有 GraphicRaycaster；而 `EventSystem` / `StandaloneInputModule` 本身属于 uGUI 包。
- 你的三条回答放一起产生了歧义：Q-R6-1 = **A**（完全归零，世界内也不用 uGUI）、Q-R6-3 = **保留 GraphicRaycaster + EventSystem 但没有 Canvas**、Q-R6-5 = **B**（包先不删）。我的理解是：**UI 全在 Web，但三维输入仍要一套体系**。
- 选项：
  - A) `EventSystem + StandaloneInputModule + PhysicsRaycaster`（拾取三维 Collider），**不建 Canvas、不用 GraphicRaycaster** ★
  - B) 建一个**空 Canvas**（全屏 RectTransform、无任何可见子物体）+ GraphicRaycaster，只为让 uGUI 输入链路成立
  - C) 不装 EventSystem，自己 `Camera.ScreenPointToRay` + 自写拾取（彻底不依赖 uGUI）
- ★建议：**A**。若选 B，请说明那个空 Canvas 还承载什么（否则它只是纯负担）。
- 回答：A

### Q-R6-S2 你 Q-R6-2 选了 C（不做跟随标签），要确认"三维引线/标注几何"画在哪【P0】

- 背景：`docs/design/01-tasktype-registry.md` 与页面清单里存在"引线、指向、标注"。文字标签不跟随后，**箭头/连线这类几何**仍然要有落点。
- 选项：
  - A) 引线/箭头由 **Unity 画**（`LineRenderer`/网格 —— 属于三维内容，不是 UI）★
  - B) 引线也由 **Web 画**（SVG 叠层）—— 但这需要 Unity 回报屏幕坐标，等于把 Q-R6-2 改回 A
  - C) 本期都不做
- ★建议：**A**（这样 Q-R6-2 = C 与"引线可画"两件事才不互相打架）。若选 B，则 Q-R6-2 必须改回 A，请一并说明。
- 回答：A

### Q-R6-S3 Q-R6-18 漏答：`scene:enter` 的 payload 到底放什么【P0】

- 结合你 Q-R6-17/19/21 的口径（Unity 读自己那份数据），我拟：`{ taskType, projectId, contentId, contentVersion, resourceKeys: string[] }`；`contentVersion` 用于 Unity 侧内容包缓存失效（DEC-23：内容整体重发、不热更）。
- 选项：A) 就按我这个 ★ B) 你给字段清单 C) 只给 `{ taskType }`，其余 Unity 自己查
- 追问：`resourceKeys` 要不要？（若 Unity 按 `clipId` 自己聚合包，则不需要）
- 回答：来澄清一下关于Unity preload的概念 最后一次 启动web服务的时候 稍微延迟一点启动unity setup自检通过后停留在content上等待接收web传来的事件 这个就是preload

### Q-R6-S4 Q-R6-7 选 B（双场景）之后，体积与职责要确认【P0】

- 你的补充说明让题意变了：既然是"第一次启动 Unity 后就不卸载、之后只装卸 AB/AA 资产"，那双场景只被用**一次**。我的理解是：`0_Setup` = 引擎/管理器初始化（`GlobalManager` 等走 `DontDestroyOnLoad`），切到 `1_Content` 后**永不再 LoadScene**，所有 TaskType 在 `1_Content` 里靠 AB/AA 装卸。
- 追问 1：`0_Setup → 1_Content` 用 **single** 还是 **additive**？
- 追问 2：既然之后不再用，`0_Setup` 还要不要进 WebGL 构建？（不进 = 原题的 C，省一份常驻 `.data` 体积；进 = 现状）
- 追问 3：若 Q-R6-9 的漫游也做成场景，WebGL 的 `.data` 里会有**几份场景**？确认体积可接受？
- 回答：1 single 2 你这个问题很奇怪 3 如果有roaming场景 是在content基础上 additive

## 二、把口径变成可执行定义

### Q-R6-S5 Q-R6-8 选 A（实例永久常驻）的三条边界【P1】

- 追问 1：切到 Three 任务/回首页时用 `display:none` 隐藏 —— 隐藏期间浏览器会暂停 `rAF`，**恢复**需要一条显式指令吗？（我倾向要，例如 `runtime:resume`，否则"醒不过来"）
- 追问 2：WebGL **上下文丢失**（错误码 1005，`docs/design/02` §3.3）在"永不卸载"前提下只能提示刷新页面 —— 确认？
- 追问 3：**移动端**也常驻吗？（DEC-70 只定了画质 `low`，没定内存/实例策略）
- 回答：这个问题我们可以在unity里面增加一个事件 主要是interactive的update里面 让这个生命周期暂时return 关于不可见 可以直接给Unity一个父层级画布 让这个画布全透明 这样只有unity内核运行 资产卸载干净 这样的资源消耗可以接受

### Q-R6-S6 Q-R6-10 的"每个 TaskType 一个加载完成事件"要定名字与层次【P1】

- 背景：你 `CoreEvent.cs` 里已有 `LoadTaskTypeFinishEvent`，而 `docs/design/02` 已有 `scene:ready{taskType}`。它们可能是同一件事，也可能是两件。
- 选项：A) **一件事**：`scene:ready` 就代表"装完且可交互"★ B) **两件**：`assets:ready`（AB/AA 装完）→ `scene:ready`（装配完可交互）
- 追问："触发加载完成事件之后 Web 再继续"——"继续"具体是什么动作？（我理解是：Web 那边结束 loading、解锁 UI / 允许切页签）请确认。
- 回答：因为可能涉及到web侧 UI的加载和渲染 所以你可以自己定如何抉择

### Q-R6-S7 Q-R6-9 保留的"漫游"是什么形态、入口在哪【P1】

- 追问 1：漫游是"**同构建内的一个场景**（走 sceneName → address 的 AA 路由）"还是"**独立 WebGL 构建**"？
- 追问 2：入口在哪个页面？（`docs/PAGE-WORKLIST.md` 的 A6 漫游页？还是菜单页某个项目进去）
- 追问 3："AA 包加载卸载"是指漫游场景也走 AA 吗？
- 回答：入口先不考虑实现 也许就是一个浮动按钮 1 AA包加载 然后add 到content 2 先不考虑 3 对 AA加载卸载

### Q-R6-S8 你新建的 `Assets/StreamingAssets/`（当前是空的）打算放什么【P1】

- 选项：A) 放**内容 JSON**（Unity 侧那一份）B) 放 **AB 资源包** C) 两者都放 D) 只是占位
- 注意红线（`docs/design/06-unity-manual-build-checklist.md`）：WebGL 下 `StreamingAssets` 只能经 `UnityWebRequest` 读，且**随包发布、不能热更**（DEC-23）。
- 回答：去参考给我你的参考工程 这种问题不要再问了

### Q-R6-S9 Q-R6-6 选 A 之后，构建与清单的语义请确认我的改法【P1】

- 我的改法：① `unity/builds/<key>/` 的 `<key>` 从"TaskType 名"改成"**构建名**"（建议 `main`）；② `release-manifest.json` 的 `unity.builds[]` 每项加 `taskTypes: number[]`（声明该构建能承载哪些 TaskType）；③ `web/src/stores/runtime.ts` 由"按 taskType 精确找"改成"找第一个声明包含该 taskType 的构建"。
- 追问：`tools/pipeline/unity-stage.mjs` 的入参是否改成 `--key main --task-types 4,5,8,9`？
- 回答：这种问题不要问我

### Q-R6-S10 你的"两套各自存各自的 + 门禁保证一致"要补四个定义【P1】（本组最重要）

- 背景：Q-R6-17 / 19 / 20 / 21 你给的是同一句口径 —— **Web 与 Unity 各存各的数据、由门禁保证内容一致**。这个口径能落地，但门禁只能"发现不一致"，不能"告诉人改哪边"，所以必须补下面四个定义。
- 追问 1 —— **权威侧**（不一致时改哪边）：
  - A) **Web 侧为权威，Unity 那份由脚本生成**（生成物也入库，门禁比对"重新生成的结果 == 入库文件"）★
  - B) Unity 侧为权威，Web 那份由脚本生成
  - C) 两边都手写，门禁只报"不一致"（长期可能一直红，且没人知道改哪边）
- 追问 2 —— **门禁比对什么**：A) 只比枚举与字段名（轻）★ B) 比完整 JSON Schema C) 字段名 + 一份示例数据逐值
- 追问 3 —— **Unity 那份放哪**：`Assets/StreamingAssets/`？`Resources/`？还是别处？
- 追问 4 —— **与 DEC-10/67/68 共处**：枚举仍"TS / 快照 / C# 三处同批改"；内容数据改成"双份同批改 + 门禁比对"——这样理解对吗？
- ⚠️ 我必须指出的风险：这与 DEC-08「单一真源」以及"同一件事只有一个维护点"的精神有张力。选 **1-A（生成）** 风险可控（两份但只有一处手写）；选 **1-C** 等于承认会有两份可能不一致的事实。请明确取舍，我会把取舍与理由一并写进 DEC。
- 回答：1 C 2 你来决定 3 去看参考工程 4 你来定就好

## 三、我说"你来定"的项，已定好，请过一眼

> 这一组没有选项，你只需回"**可以**"或指出要改哪条。

### Q-R6-S11 `QuestionType` 我去看了参考工程，它跟两边都不一样，请你拍板【P1】

- 参考工程的形状：`None=0 / SingleChoice=1 / MultipleChoice=2 / TrueFalse=3 / FillInBlank=4`（**有 None、无排序、无问答**），另有独立的 `QuestionUsage`：`Exam=0 / Step=1`。
- 你的工作区 `EnumAll.cs`：`0 单选 / 1 多选 / 2 判断 / 3 填空 / 4 问答`；`docs/design/04-data-model.md`：`1 单选 … 5 排序`。三份互不相同。
- 选项：
  - A) **照参考工程的形状**（0 起、有 `None`、无排序/无问答）+ 一并沿用它的 `QuestionUsage`（考核 / 步骤）★
  - B) 用你工作区那份（含"问答"）
  - C) 你重给一份
- ★建议：**A**。若以后要做"排序题"，**作为新值往后追加**（契约只许追加，不许插值改号）。
- 回答：不相同就修改 如何修改你来定

### Q-R6-S12 Q-R6-22 Addressables：我从参考工程提取的规则，请确认按这个摘录进 `docs/design/03`【P1】

> 按纪律，我只会把**规则本身**写进我们自己的文档（不写外部工程名与本机路径），下面是我读出来的规则。

- 提取到的规则：
  1. **包登记表是核心**：每份资源一条包配置 —— `id` / 包类型（AA / AB / 内置）/ `clipId`（内容包按项目聚合）/ `bundleName` / `assetPath`（AA 侧则是 `address` / `labels` / `groupName`）；**调用方只给包 `id`，不关心走哪条链路**。
  2. **一个项目（ProjectClip）一个内容包**：切任务 = 卸旧 clip 的包 + 装新 clip 的包（与你"反复加载卸载 AB/AA 资产"完全一致）。
  3. **实例必须登记"实例 → 包"**：卸包前先销毁该包实例（否则材质变粉）；卸包前先失效资源缓存（否则下次取到已销毁对象）。
  4. **WebGL 下 `StreamingAssets` 是 HTTP 路径**（不能加 `file://`）；AB 的**文件名小写、目录保持原样**（跨平台敏感）。
  5. **场景也能走 AA**（`sceneName → address` 的路由表），且**必须保留 handle** 才能卸载释放。
  6. AA 侧的**分组与批量**靠 `labels`（运行时筛选），`groupName` 只是编辑器分组名（运行时不读）。
- 追问：A) 本期三条链路（AA / AB / 内置）**都做**，还是先只做 AA + 内置？B) 包登记表放 `Resources/`（运行时与编辑器共用）还是 `StreamingAssets`？
- 回答：AA AB resources都放哪些内容你可以去参考工程看 我要求是都做

### Q-R6-S13 你说"你来定"的 5 项，我定如下（有异议请指出）【P1】

| # | 项 | 我的决定 |
|---|---|---|
| 1 | Q-R6-12 `app:init` 时机与取值 | **握手后立刻发**；`locale` / `qualityProfile` 取本地 `save` 的 `settings`，缺失时用设备探测（移动端 `low`） |
| 2 | Q-R6-13 预加载时机（"无感加载"的落法） | **桌面端**：首屏可交互后的空闲时段预热引擎 + 选项目后预装该项目的包；**移动端不预加载**；`release-manifest.json` 里 `unity.included=false` 时**绝不预加载** |
| 3 | Q-R6-14 预加载的层 | 只 **L1 引擎底座** + **L3 内容 JSON**；L2 交给 `preload:task` 覆盖；L4 不预加载 |
| 4 | Q-R6-11 消息条数与启动链 | 新增 **`preload:task {taskType}`** 与 **`preload:cancel`**；**不加** `preload:engine`（Web 自己能做）。启动链：`unity:ready` → `app:init` →（可选 `preload:task`）→ `scene:enter` → `unity:progress`×N → `scene:ready`；保留 `debug:ping/pong` |
| 5 | Q-R6-25 桥消息纳入契约 | `web/src/contracts/bridge.ts` 导出 `BridgeMessageType` 常量 + C# `BridgeMessageType.cs` + `snapshot.json`，`tools/check-contracts.mjs` 增加一段比对 |

- 回答：

## 四、授权

### Q-R6-S14 我可以直接改你工作区那批未提交的 Unity 文件吗？【P1】

- 涉及：`Assets/Scripts/Contracts/EnumAll.cs`（`QuestionType`）、`Core/Models/ProjectData.cs`、`Core/Managers/FunctionManager/*`、`Core/Managers/GlobalManager.cs`、`Core/DataStruct/DataStructMapping.cs`、两个场景与 `ProjectSettings/EditorBuildSettings.asset`。
- 选项：
  - A) **你按答案直接改**（保持我的命名与风格，只做契约/结构对齐）★
  - B) 我只给规格，你自己改
  - C) 混合：纯代码我改，场景/预制体你改
- 若选 A：我会在改完后把"改了哪些文件、为什么"逐条列出，且**不会**顺手重构你其它文件。
- 回答：可以修改可以提交

---

## 附：本轮答完之后我会做什么（预告，不需要你回答）

1. 把 26 条答案固化进 `DECISIONS.md`（DEC-80 起，含"取代 DEC-14 的 UI 部分"这条）；
2. 按答案同批改三处契约（`web/src/contracts/*`、`content/contracts/snapshot.json`、`NewStructureUnity/Assets/Scripts/Contracts/EnumAll.cs`）与 `docs/design/02/03/04`；
3. 落 Unity 侧桥（`.jslib` + 消息接收）与启动编排的最小可跑版本；
4. git 走 PR（DEC-78），Unity 侧另走 Plastic（DEC-60）。
