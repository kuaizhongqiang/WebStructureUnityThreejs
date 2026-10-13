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
