# WebStructureUnityThreejs

教育类虚拟仿真软件 —— **Web 为主、Unity 承担复杂三维交互** 的双线工程，另有 Electron 应用壳分支。
本仓库同时承载：产品文档（需求 / 调研 / 决策 / 设计）、Web 前端工程、Unity 工程、静态排版稿与提交门禁。

> **接手请先读 [`AGENT.md`](./AGENT.md)** —— 它是 AI 与人的共用入口与工作约定，也是本仓库纪律的权威。
> 冲突时的权威层级：`docs/requirement/raw/raw-requirement.md` > `AGENT.md` > `docs/DECISIONS.md` > 其他文档。

## 1 仓库结构

| 路径 | 内容 |
|---|---|
| `docs/requirement/raw/raw-requirement.md` | **原始需求，唯一权威来源**（只读，不得改写） |
| `docs/DECISIONS.md` | **决策记录（已定事项的唯一权威）**：现 **DEC-01 ~ DEC-158**（第一~十轮问答 + **第十一轮：结构任务步骤落点** + **第十二轮：Web⇄Unity 全量交互与免 Web 自测** + **2026-10-15 按 Issue 落地的一批 DEC-147 ~ DEC-158**，含页底图 / 应用图标 / 页面过渡 / **结构站画布透明（三相机方案已撤销，DEC-158）**），**只增不改** |
| `docs/PLAN.md` | **执行计划（活文档）**：**只写"接下来做什么"** —— 分批（P0→P1→P2）/ 落点 / 验收标准 / 依赖顺序 |
| `docs/TODO.md` | **待办（活文档）**：**只写"现在还剩什么"** —— 待拍板 / 待做 / 未提交。**新增待办只加这里** |
| `docs/RECORD.md` | **记录（活文档）**：**只写"做完了什么 + 证据"** —— 批次总表 + 日期 / 提交号 / PR；**只增不改** |
| `docs/OPEN-QUESTIONS*.md` | 问答清单原文保留（答案固化进 `DECISIONS.md`）。**轮次与关闭状态以 `DECISIONS.md` 为准**，本文件不重复维护 |
| `docs/requirement/requirement-analysis.md` | 需求分析：原始需求条目化（R-1~R-8）、红线、需求→交付物映射、缺口闭合表 |
| `docs/research/01~10` | 技术调研：Unity 线、Web/Three.js 线、集成交付、既有同类工程调研、依赖方案、**规模基线（×3 预算）**、Web 工程落地、**WebGL 基线实测**、**被采纳内容数据与三维资产测绘**、**底层操控层的行为规格原文（只读档案）** |
| `docs/design/01~12` | 设计文档：TaskType 登记表、Unity↔Web 桥协议、目录与程序集分层、数据模型、**Unity 产物与打包流水线**、**Unity 手动构建检查清单**、**框体样式规则**、**内容数据的采用与双份口径**、**启动编排与桥消息落地**、**步骤系统**（含**三种走法：一步一步 / 跳步快进 / 动画运行**）、**底层操控层（输入控制器与相机）**、**资源包与内容打包流水线（全量 Addressables）** |
| `docs/PAGE-WORKLIST.md` | 页面工作清单（6 组 / 11 个任务页 + 通用组件）+ 里程碑 + 照什么不照什么 |
| `docs/ui-mockups/` | **静态排版稿与样式唯一来源**：29 页排版稿 + `index.html`（样式与元件成果页）+ `tokens.css` / `components.css`（**产品只用这两份**）/ `mockup-shell.css`（仅评审用）；`style.css` 是聚合入口 |
| `docs/model-preview/` | **模型检视页（审核用）**：把 `content/assets/three/**` 的 **8 个 GLB** 逐个挂上 Three.js，用来定**环境**（光照 / 环境贴图 / 背景 / 曝光）与**材质**（贴图接没接上、清漆、表面模式）。自带 `serve.mjs`（服务根＝仓库根，见 §4） |
| `docs/README.md` | 文档总索引与**写作 / 维护纪律** |
| `web/` | **Web 前端工程**：Vite 8 + TypeScript 5.9.3 + Vue 3 + 裸 three + ESLint/Prettier |
| `electron/` | **应用壳**：Electron + 只绑 127.0.0.1 的本机静态服务器（含 `/unity/**` 路由），加载 `web/dist`；**打包产出单文件 exe**（DEC-20 / DEC-32 / DEC-77） |
| `NewStructureUnity/` | **Unity 工程**：Unity 2022.3.53f1c1 + URP 14.0.11 + Addressables 1.22.3。资源包链路见 `docs/design/12`：**包登记表**落 `Assets/Resources/Config/**`（`PackageDB_Master` + `ContentPackages/AA_*.asset`，**要提交**）、**AA 设置/分组**落 `Assets/AddressableAssetsData/**`（**要提交**）、**AA 产物**落 `Library/com.unity.addressables/aa/<平台>/**`（**不进版本库**，Build Player 时由 Addressables 自动拷进 `Assets/StreamingAssets/aa/<平台>/`、可一键重建） |
| `unity/builds/` | **Unity 产物暂存区**（不进 git，DEC-57/79）；只保留说明文件 |
| `content/` | 内容与契约：`contracts/snapshot.json`（契约校验的**基准快照**）、`assets/`（大资产落点，**不进 git**：`three/` 模型、`video/` 原理视频）；材质规格与人工修正：`asset-material-spec.json` / `asset-material-textures.json` / `material-overrides.json`；搬运清单：`asset-import-report.json` / `asset-convert-report.json` / **`asset-video-report.json`** / **`asset-structure-report.json`**（结构任务，DEC-102）；**内容数据有两份**：`web/public/content/data/`（Web）+ `NewStructureUnity/Assets/StreamingAssets/Data/`（Unity），由门禁比对 |
| `tools/` | 门禁与流水线：契约一致性 / **内容数据双份一致性** / 大文件 / 壳耦合 / pre-commit hook + `pipeline/`（Unity 暂存校验打包、三维资产搬运与 Blender 转换、**原理视频搬运**、发布清单与打包） |
| `.github/workflows/gate.yml` | 合并门禁（CI） |

## 2 架构红线（不可违背）

1. **三维交互按复杂度分流**：复杂三维交互 → **Unity**；简单三维交互 → **Three.js**。两条线是**分工关系**，不是二选一。
2. **沿用 `SceneState` / `TaskType` 概念**：11 个 TaskType，序号与中文标签是**跨端契约**，只许往后追加。
3. **Web 优先，Electron 为壳**：平台相关逻辑不得渗入核心业务代码。
4. **全新架构、从零开始**：从旧工程提取的是概念与经验，不是目录布局。

更细的边界判定与分流映射以 `docs/DECISIONS.md`（尤其 DEC-06 / DEC-09）为准。

## 3 当前状态

> **本节是"仓库状态"的唯一维护点**（`AGENT.md` 只放纪律，不再重复维护状态）。
> **未闭合项（待拍板 / 待做 / 未提交）见 `docs/TODO.md`**；已定事项见 `docs/DECISIONS.md`；
> 做完的事与证据见 `docs/RECORD.md`；接下来做什么见 `docs/PLAN.md`。

| 部分 | 状态 |
|---|---|
| 文档与决策 | **DEC-01 ~ DEC-160** 生效；"计划 / 待办 / 记录"已分家（`PLAN.md` / `TODO.md` / `RECORD.md`；**2026-10-15 起计划与待办迁 GitHub Issues**，三个文件是指针 stub）；设计文档 **12 篇**、调研 **11 篇** |
| Web 骨架 | ✅ 已落地并验证：双端契约、会话单一真源、裸 three 封装、Unity 桥协议骨架、移动端/微信策略 |
| Web 产品脚手架 | ✅ **Phase 1 已落地**（DEC-73/75）：外壳组件（浮卡 / 站点线 / 状态条）、**启动流程 `start → login → menu`（DEC-101，登录页只提供游客入口）**、`MenuView` / `TaskView`（登记表驱动）/ 骨架自检页；样式只走设计系统令牌；ESLint + Prettier 已进 hook 与 CI |
| Web 验收 | ✅ `typecheck` / `lint` / `format:check` / 单测（**108 passed / 2 skipped**）/ 构建全过；**渲染冒烟**（真 Chromium：三维渲染非白屏、设计系统令牌真的加载、**站点线只画数据里有的站**（DEC-100）、**登录页真的点得通且不摆输入框**（DEC-101）、骨架自检页可达、无 console 错误）+ **Web⇄Unity 全量交互 18 条**（DEC-112：`scene:enter` 载荷 / `app:init` / 内容数据落地的提示条与信息面板 / `input:enable` 开合 / `step:changed` 进度 / 信息面板 `success` / 答题答错 `failed` → 重问 → 答对 `success` → `task:completed`） |
| Unity 工程 | ✅ 程序集分层 + 契约（`SceneState` / `TaskType` / `QuestionType` / `QuestionUsage` / `BridgeMessageType`）+ **协议桥**（`.jslib` + 信封扫描 + 入站分发/出站映射） + **启动编排** + **免 Web 自测开关**（`0_Setup` 的 `StartupTestSwitch`，DEC-113：指定 `taskType` + `projectClip` 自启一个任务，WebGL 可用 `?wsu3_test=8&wsu3_clip=…` 免重打包覆盖）+ **任务编排 + 输入闸门** + **拾取体系** + **步骤系统**（进程 → 步骤 → 条件三级结构、跳转重置与快进、协作式打断；**三种走法**：一步一步 / 跳步快进 / **动画运行**（DEC-121）；显隐只认两张表、点击带**碰撞体闸门**（DEC-119/120））+ **底层操控层**（第一人称 / 第三人称 / 聚焦环绕 / 相机背景；`Core/Controllers/`，DEC-107 —— **代码与资产在位、编译 0 error，但还没进场景接线**）+ **资源包链路**（DEC-87 / DEC-108~110 / **DEC-118 全量迁 Addressables**，`docs/design/12`：两条链路 + 包登记表 + **共享材质组先装** + **一键打 AA 包**，见 §4）；EditMode **71/71** 通过（既有 49 + 包自带 stub 1 + `StartupTestSwitch` 21） |
| Unity 依赖 | `Cinemachine` **2.10.7** + `Input System` **1.11.2** 已入 `Packages/manifest.json`，输入后端 = **Both**（旧版 Input 的拾取继续可用，DEC-107）；其余沿用脚手架 |
| 内容数据 | ✅ **已全量采用既有实训软件的数据**（DEC-88）：7 份 JSON / 9 个项目 / 73 KB，Web 与 Unity **各一份**（DEC-82），`tools/check-content-data.mjs` 在 hook 与 CI 里比对结构 |
| 三维资产（Three 侧） | ✅ **8 个 GLB / 7.3 MB**：**GLB 只出 mesh + mat，一张贴图都不带**，base（含 alpha）/ normal / mask 三张图**全部渲染期后加载**（DEC-97，查找表 `content/asset-material-textures.json`）；材质规格由 `content/asset-material-spec.json` 驱动，人工修正落 `content/material-overrides.json` |
| 材质通路 | ✅ 逐子材质核对（贴图按**规格声明**接、表面模式 MASK/BLEND、清漆 `_CoatedMask` 带出、全零顶点色剔除）；mask 已按 HDRP 通道在渲染期重排为 glTF ORM ⇒ **金属度 / 粗糙度是贴图驱动**，不再是常数兜底 |
| Blender 中间内容仓 | ✅ `content/assets/blend/<器件>.blend`（贴图已打包、自包含，**不进 git**）：FBX 载入 → 人在 Blender 里细调 → 从 .blend 导出 GLB（**不重导 FBX**，手工调整全保留） |
| **结构任务（TaskType 8）资产** | ✅ **已搬入 Unity**（DEC-102 / DEC-103）：8 个结构件预制体（含 1 个空壳）+ **46 段拆装动画 14.6 MB** + 29 个器件材质（**接管**从 FBX 自动抽出的同名材质）+ 4 个自制 ShaderGraph + 1 个 SubGraph + HighlightPlus 插件 + **12 MB 反射 cubemap**（4 个金属材质的依赖）；脚本 `tools/pipeline/import-structure-assets.mjs`、清单 `content/asset-structure-report.json`。**已打成 9 个 AA 组**（DEC-118 全量迁 Addressables，含 `WSU3_Shared` 共享材质组，合计约 43 MB）。零件脚本 `StructureTaskObj` 与 `InstControlledManager` 有意未搬（用本工程 `StepManager` 承载，DEC-104）；**HighlightPlus 已可由业务程序集引用**（`WSU3.Core → HighlightPlus.Runtime`，DEC-106）。⚠️ **进结构站已能实例化结构件**（DEC-110）且**步骤子树已就位**（DEC-111：8 个器件 **46 步**由 `StructureStepGenerator` 从来源工程生成、幂等可重跑，见 `docs/design/10` §7）；**Web 侧的步骤显示也已落地**（DEC-112：进度 / 提示条 / 信息面板 / 答题面板）；**结构站画布 = 单个 `MainCamera` 渲染到屏幕**（画布透明需求已撤销，DEC-158 / Issue #64）：模型在**默认层 0**、主相机掩码 `55`、无 RT；**不再有** `ColorCamera` / `AlphaCamera` / 两张 1920×1080 RT / `AlphaComposite.mat` / `OutputCanvas`(RawImage)，拾取回主相机 + `ScreenPointToRay`，`TaskFlowManager` 也不再按任务类型关后处理。**结构站三维区背景 = 相机子物体 `BgPlate`**（内置 Quad，local `z = 10`，不透明 unlit 径向渐变板，shader `WSU3/Background/CamBgGradientUnlit`），随桥消息 **`ui:set-theme`** 在深浅两枚材质之间切换（DEC-159 / DEC-160；相机实际取景由**器件预制体自带的 Cinemachine vcam** 决定，相机到模型约 4.78 单位 ⇒ 板子在模型后面，不挡模型）。⚠️ #65 的第 2 问（页面是否给视口铺底色）与第 3 问（与 #59 交付态的关系）仍开放。⚠️ 这 9 个 AA 组**已重打**（`TODO.md` D-23 已改口径：AB 时代的 8 个包已作废，2026-10-14 夜按 AA 重打为 9 组 / 27 项资源）—— AA 内容同样是**平台锁定**的，出 Web 产物前确认当前那份是 WebGL |
| **资源包与内容打包** | ✅ **已落地**（DEC-87 / DEC-108~110 / **DEC-118 全量迁 AA**，`docs/design/12`）：**包登记表**（`Assets/Resources/Config/PackageDB_Master` + 9 条 `ContentPackages/AA_*.asset`）+ **一键打 AA 包**（菜单 `WSU3/Pack/一键打 AA 包（全部）`，9 个组 / 约 43 MB 落 `Library/com.unity.addressables/aa/<平台>/`）+ **两条链路运行期**（`AddressableManager`：内置 / AA）+ **共享材质组先于内容组装载** + **装包卸包已接进 `scene:enter`/`scene:exit`** + Addressables 设置与分组已就位。⚠️ 全局包（UI / 字体 / 相机背景）登记表为空（Unity 侧不做界面 + 背景取图入口未接）；简介 / 检测的内容 Provider 未登记（素材未到位） |
| WebGL 基线 | ✅ 已实测：空场景 WebGL 构建 **8.40 MiB / 18 文件 / 188.9 秒**（Brotli）—— 见 `docs/research/08-webgl-baseline.md` |
| Unity 产物接入 | ✅ 流水线已落地（DEC-79）：暂存 + 逐文件 sha256 校验 + **发布清单** + 打包内 `/unity` 路由 + 加载器（超时/重试/退出销毁） |
| 排版稿 | 29 页静态排版稿 + 样式与元件成果页，深/浅两套主题；**C6「简介」的三维区已是真实画布**（内嵌模型检视页的嵌入模式 `?embed=1`，框体与右侧面板同款毛玻璃）；框体规则见 `docs/design/07-frame-style-rules.md` |
| 模型检视页 | ✅ `docs/model-preview/`（审核用，DEC-96）：8 个 GLB **逐个实测通过** —— 三角面与材质名与 `content/asset-convert-report.json` 逐个一致、无 console 错误、切模型后显存回落基线（无泄漏）；**"环境与材质取哪一套"待负责人审阅后定**（见 `TODO.md` T-01 / T-02） |
| **Info 页（产品侧）** | ✅ **左三维 + 右图文**（DEC-98，与排版稿 C6 同构）：三维由产品自持的 `web/src/viewer/ModelStage.ts` 承载（影棚 HDRI 当 IBL、无灯、画布透明、base/normal/mask **渲染期后加载** + mask→ORM）；**资产发布链已落地**（原 P1-5）：dev 由 vite 中间件直读 `content/assets/three`、build 拷进 `dist/assets/three/**`，发布清单记 `content.assets`。冒烟：`triangles=29673` 与转换报告逐个一致、材质解算 0 错误 |
| **Principle 页（产品侧）** | ✅ **左视频 + 右说明**（DEC-99，与排版稿 C4 同构）：8 段讲解视频 **65.9 MB** 落 `content/assets/video/**`（**不进 git**），与三维资产同一套发布链（同一插件服务多棵树：`/assets/three/` + `/assets/video/`），视频另有 `_meta/index.json` 清单当**唯一判据**（缺了显示"未包含"，不打 404）；**数据只有一段视频时右栏"视频列表"整块不出现**（规则在 `web/src/domain/principle.ts`，有单测）；`.mp4` 的 MIME 与 `Range` 在 dev 中间件与壳的静态服务器都实现。冒烟：`readyState=4 1920x1080 81s`、列表 `rows=0`、右栏只有"原理说明"、console 0 错误；**壳里（打包产物）同组读数通过** |
| 门禁 | pre-commit hook + CI（**双端契约**、**内容数据双份**、大文件、壳耦合、Unity 清单、类型检查、Lint、格式、单测、构建、渲染冒烟） |
| Electron 壳 | ✅ 骨架 + 窗口外观（Windows 隐藏原生标题栏、系统浮层按钮、主题同步）+ **打包分发**（electron-builder portable → 单文件 exe）；冒烟**四段**（挂载 + Unity 页 + Info 页三维区 + **原理页视频**），报告落 JSON。细节见 [`electron/README.md`](./electron/README.md) |
| **尚未开始 / 欠** | ① ~~Web 侧步骤系统的落地面板~~ ✅ **已落地**（DEC-112）；② 其余 C 组页面骨架（C2/C3/C7）仍与排版稿不同构；③ 材质解算在产品与审核页各一份（`TODO.md` D-09）、包体核算（D-10，已加 65.9 MB 视频 + 内容 AA 组合计约 43 MB）；④ Unity 侧：**结构站初始化已接、但未在真产物上逐条验收**（Issues #34 / #37，含 46 步 / 拾取 / 描边；画布透明一项已随 DEC-158 撤销、背景口径另见 Issue #65）、~~实例在任务之间常驻~~ ✅ **已落地**（DEC-145 / Issue #38）、全局包与其余内容 Provider（`design/12` §8）、操控层进场景与验收（Issues #35 / #36）；⑤ 待负责人拍板项见 `TODO.md` §1 |

## 4 怎么跑

### Web 侧

```bash
cd web
npm install
npm run dev           # 开发服务器
npm run typecheck     # vue-tsc --noEmit
npm run lint          # ESLint（DEC-52）
npm run format        # Prettier 写入（format:check 用于门禁）
npm test              # vitest（契约快照测试）
npm run smoke         # 真浏览器冒烟（三维渲染 / 设计系统加载 / 站点线按数据画站 / 内容层 / Web⇄Unity 全量交互）
npm run build         # 类型检查 + 生产构建 → dist/
```

> **dev 服务器现在也服务 Unity 产物**（DEC-114）：`/unity/<key>/**` 与合成出来的 `/release-manifest.json`
> 从 `unity/builds/` 读（暂存根可用 `WSU3_UNITY_DEV_ROOT` 改道）。所以**不必先打包**就能在浏览器里
> 人工联调 Unity 类任务；一个构建都没暂存时它会如实报 `unity.included = false`（页面显示"产物未就位"）。
>
> **Unity 侧的自测开关**（DEC-113）：`0_Setup` 的根物体 `TestSwitch` 上有 `StartupTestSwitch` ——
> Inspector 里把 `testEnabled` 勾上并填 `taskType` / `projectClip`，或者在 WebGL 产物地址后面加
> `?wsu3_test=8&wsu3_clip=clip_contactor`（**免重打包**），Unity 就会自己进那个任务，不需要网页发指令。
> 默认**关**，关着时产品路径完全不变。

**产品源码结构**（Phase 1 脚手架，DEC-75）：

```
web/src/
  components/   AppShell（外壳骨架）· ShellCard（左上浮卡）· RouteBar（站点线）· StepPanelHost（步骤落地面板，DEC-112）
  views/        StartView（A1）· LoginView（A2，只提供游客入口）· MenuView · TaskView（登记表驱动的任务页）· DebugView(/#/debug) · PlaceholderView
  domain/       registry.ts —— TaskType 表现层登记表（标签/栈仍来自 @/contracts）· step-panels.ts（回执纪律）· step-content.ts（步骤内容索引）
  shell/        bridge.ts（唯一的壳接触面）· theme.ts
  stores/       session（真源，DEC-08）· progress（本机单 JSON，DEC-54）· content（内容层）· runtime（发布清单）
  styles/       index.css（只 import @ds 的 tokens+components）· product.css（流式布局与断点）
  unity/        UnityBridge（信封/握手）· UnitySession（时序与状态，DEC-112）· UnityLoader（挂载与销毁）
  contracts/ viewer/ platform/   —— 契约（含桥载荷形状 bridge-payloads.ts）/ 裸 three / 设备策略
```

样式**单一来源**：`@ds` 别名指向 `docs/ui-mockups/`，产品 import `tokens.css` + `components.css`；
**不得** import `mockup-shell.css`（那是排版稿的评审外壳，见 DEC-74）。

> ⚠️ **TypeScript 固定 5.9.3，不要升到 7.x**：`vue-tsc` 与 TS 7 不兼容（实测直接崩溃），见 DEC-33。

### 静态排版稿与模型检视页（审核用）

```bash
# 一个服务同时供两者（服务根＝仓库根）：
node docs/model-preview/serve.mjs
#   排版稿     → http://127.0.0.1:5281/docs/ui-mockups/index.html
#   模型检视页 → http://127.0.0.1:5281/docs/model-preview/index.html
```

- **`5280` 那种"进到 `docs/ui-mockups` 起服务"的方式已经不够用了**：C6 的三维区是 iframe 内嵌检视页，
  它要取 `content/assets/three/**` 与 `web/node_modules/three` —— **必须从仓库根起服务**。
- 排版稿：右上角可切「深色 / 亮色」，单页也可用 `?theme=light`；改过样式或页面生成器后跑
  `node docs/ui-mockups/src/render.mjs` 重新生成（29 页 + 成果页）。
- 模型检视页：左侧按器件列出 **8 个 GLB**（中文名取 `content/data/ProjectData.json`），点开即加载、可旋转；
  深链 `?model=<器件>/<名字>`（如 `?model=contactor/NewACContactor`）；**嵌入模式 `&embed=1`** 只留画布，
  页壳（列表 / 环境面板 / 读数）收起 —— 排版稿用的就是它。
- 读数分两栏："证据"来自 `content/asset-convert-report.json`，"实测"是从 GLB 现读的 —— 两边不一致就说明清单漂了。
- 环境默认是**影棚 HDRI**：`content/assets/three/env/StudioWhiteUmbrella.exr`（不进 git）**同时**当天空盒与光源；
  嵌入模式下画布**透明**，背景交给宿主 UI（排版稿自己的底色与网格底纹）。
- 材质通路的可重跑工具：`node tools/pipeline/extract-material-spec.mjs`（抽规格）、
  `node tools/pipeline/audit-material-mapping.mjs`（逐模型逐子材质核对）。

### 三维资产：搬运 / Blender 转换 / 中间内容仓

```bash
# ① 从既有实训软件搬 FBX + 贴图 + 原理图（只读来源工程；先加 --dry-run 看要搬什么）
node tools/pipeline/import-adopted-assets.mjs --from <来源工程根目录> --dry-run
node tools/pipeline/import-adopted-assets.mjs --from <来源工程根目录>

# ② 两条产出 GLB 的路（都是 Blender 批处理，每个模型一个独立进程）
node tools/pipeline/fbx-to-glb.mjs --blender <blender.exe>                # 一条龙 FBX → GLB（可复现基线）

# ③ Blender 当**中间内容仓**用（人要在 Blender 里细调材质的那条路）
node tools/pipeline/fbx-to-glb.mjs --blender <blender.exe> --prepare-blend   # FBX → content/assets/blend/<器件>.blend
#    …在 Blender 里调好、Ctrl+S 保存…
node tools/pipeline/fbx-to-glb.mjs --blender <blender.exe> --from-blend      # .blend → GLB（不重导 FBX，改动全保留）

# ④ 贴图搬运（**按材质引用**搬齐 base / normal / mask，写查找表）
node tools/pipeline/import-material-textures.mjs

# ⑤ 原理视频搬运（8 段 / 65.9 MB → content/assets/video/，**不进 git**）
node tools/pipeline/import-principle-videos.mjs --from <来源工程根目录> --dry-run
node tools/pipeline/import-principle-videos.mjs --from <来源工程根目录>

# ⑥ 结构任务（TaskType 8）专属资产搬运（DEC-102：预制体 / 拆装动画 / 材质 / 自制 Shader / HighlightPlus）
node tools/pipeline/import-structure-assets.mjs --from <来源工程根目录> --dry-run
node tools/pipeline/import-structure-assets.mjs --from <来源工程根目录>
```

- 四份清单是**证据**（来源 / 目标 / 字节 / sha256 / 三角面 / 未映射项 / 每个材质的接线）：
  `content/asset-import-report.json`、`content/asset-convert-report.json`、`content/asset-video-report.json`、
  **`content/asset-structure-report.json`**。
- 视频**专门一个脚本**、不并进 ①：那条链服务两条线共用的资产（要带 `.meta`、要过 Blender、有"单图 ≥10 MB 剔除"规则），
  而视频只服务 Web 侧，且最大一段就是 **30.57 MB** —— 套用"≥10 MB 剔除"会把视频全剔掉。
- **结构任务同理单独一条链**（DEC-102 / DEC-103）：它要的恰好是 ① 当年**明确剔除**的那几样
  （结构件预制体 / 46 段拆装动画 / 器件材质 / 自制 ShaderGraph），判据与 ① 完全不同。
- `content/assets/three/**` 与 `content/assets/video/**` 的发布链是**同一个插件**（`web/vite.config.ts`）：
  dev 走中间件直读、build 拷进 `dist/assets/<树>/**`；视频额外发一份 `_meta/index.json`（**构建时按目录内容现算**），
  原理页只认它 —— 没有视频的包，页面显示"讲解视频未包含在本次发布里"，而不是打一个 404。
- 落点：`Assets/Models/`（Plastic 管，含**结构件材质**）、`Assets/Animation/`（结构拆装动画，Plastic 管）、
  `Assets/Prefabs/` 与 `Assets/Shaders/` 与 `Assets/Plugins/`（结构件预制体 / 自制 Shader / HighlightPlus，**进 git**）、
  `web/public/content/sprites/`（进 git）、
  `content/assets/three/`（GLB 与贴图，**不进 git**，DEC-57）、`content/assets/blend/`（中间仓，同）。
- ⚠️ `--prepare-blend --force` 会**覆盖** .blend，把手工调整丢掉 —— 加这个组合前先想清楚。

### 应用壳（Electron）

```bash
cd web && npm run build       # 壳加载的是构建产物，不是源码
cd ../electron && npm install
npm start                     # 开窗口
npm run smoke                 # 冒烟：不显示窗口，断言 DOM 与预加载桥后退出（可进 CI）
npm run dist                  # 打包 → release/WSU3-Shell-<version>-portable.exe（双击即用）
```

打包版没有控制台，因此 `--smoke` 会把结果写成 JSON（默认与 exe 同目录，或 `WSU3_SMOKE_REPORT=<path>`），
"能打开"这件事有可读证据。窗口外观见 [`electron/README.md`](./electron/README.md)。

### Unity 产物与打包流水线

**Unity 由人手动构建，但"进不进包"由流水线决定、校验、并写进清单**（DEC-79，细则见
[`docs/design/05-unity-packaging-pipeline.md`](./docs/design/05-unity-packaging-pipeline.md)）。

```bash
# ① Unity 编辑器里构建（菜单 WSU3/Build/WebGL Baseline，构建前必须关编辑器）
# ② 暂存 + 校验（产物进 unity/builds/，不进 git；逐文件 sha256 写进清单）
node tools/pipeline/unity-stage.mjs --from NewStructureUnity/Builds/webgl --key main --task-types 4,5,8,9
# ③ 一键打包（校验 → web build → 发布清单 release-manifest.json → exe）
node tools/pipeline/pack.mjs
```

- 没有真 Unity 时也能验流水线：`node tools/pipeline/make-stub-unity.mjs --key main --task-types 4,5,8,9 --stage`。
- 发布清单 `web/dist/release-manifest.json` 会随包发布，写明本次包含的 Web / 内容 / Unity（含 `treeSha256`）与服务端约定。
- **Unity 缺席不影响 Web 侧打包，但界面上会明确写"Unity 产物未包含"**（Unity 类任务不再假装能进）。
- `pack.mjs --out <目录>` 可换输出目录（上一次的 exe 还在运行时会锁住 `release/`）。

### 提交门禁

```bash
node tools/check-contracts.mjs        # 双端契约：TS ↔ 基准快照 ↔ C#（枚举 + 桥消息类型）
node tools/check-content-data.mjs     # 内容数据双份：Web 与 Unity 两份同名文件的结构签名
node tools/check-large-files.mjs      # 大文件阈值 10 MB
node tools/check-shell-coupling.mjs   # 业务代码零 import electron（DEC-20）
powershell -File tools/install-hooks.ps1   # 安装 pre-commit hook（一次性）
```

### 提交方式：**必须走 PR**

`main` 不接受直接提交（**含文档改动**）——见 `docs/DECISIONS.md` DEC-78。固定流程：

```bash
git checkout -b feat/xxx      # 1 开分支
# …改动… git add <路径> 并提交   # 2 本地 hook 先跑一遍门禁
git push -u origin feat/xxx    # 3 推分支
# 4 开 PR（base=main），等 CI（比本地多跑类型检查/单测/构建/渲染冒烟）
# 5 squash merge，然后 git checkout main && git pull
```

> Unity 侧改动**另外**要在 Plastic 提交（双渠道，DEC-60）；Plastic 没有 PR 概念，git 侧从"直接推 `main`"改为"经 PR 合入 `main`"。

### Unity 侧

- 用 Unity **2022.3.53f1c1** 打开 `NewStructureUnity/`；
- **一键打 AA 包**（内容包，DEC-108 + **DEC-118 迁 Addressables**，细则见 [`docs/design/12`](./docs/design/12-resource-packs-and-ab-build.md)）：菜单
  `WSU3/Pack/一键打 AA 包（全部）` —— 收集 → 校验 → 写包配置 → 同步包登记表 → **注册分组 → 一次构建** → 出报告；
  产物落 `Library/com.unity.addressables/aa/<平台>/`（**不进版本库**，可一键重建），报告落 `Builds/assetbundles/aa-build-report.json`。
  ⚠️ **产物要进 WebGL 构建目录还差一步 Build Player**：Addressables 在 Build Player 时把内容自动拷进 `Assets/StreamingAssets/aa/<平台>/`（见 `design/12` §6）。
  等价批处理（不弹窗）：
  ```bash
  Unity.exe -batchmode -quit -projectPath NewStructureUnity -buildTarget WebGL \
    -executeMethod WSU3.Editor.BuildTools.BundlePipeline.BuildAllFromBatch -logFile -
  ```
  同菜单下另有 `对账（dry-run，不写盘）` / `仅构建（不写配置）` / `仅刷新包登记表` / `打开 AA 产物目录`；
  Addressables 相关在 `WSU3/Pack/Addressables/`（初始化设置与默认分组 / 同步场景分组 / 构建 AA 内容 / 清理场景分组）；
  **内容包本身也走 AA**（DEC-118），故上面那条「一键打 AA 包」已经是唯一的打包入口。
  ⚠️ AA 内容与构建目标平台绑定 —— **发布 WebGL 前先在 Build Settings 里切到 WebGL 再打一次**（不是 WebGL 时 Console 会给告警）。
- WebGL 基线构建：菜单 `WSU3/Build/WebGL Baseline`（等价批处理：`-executeMethod WSU3.Editor.BuildTools.WebGLBaselineBuild.RunBaseline`）；
- 契约冻结单测：EditMode 测试 `ContractIntegrityTests`（校验 TaskType / SceneState 的**名字、顺序、中文标签**）；
- 步骤系统单测：EditMode `StepSystemTests`（49 项全流程）。

## 5 纪律（细节与依据见 `AGENT.md` §4）

- **⚠️ 文档三分，各只有一个维护点（硬纪律）**：
  **接下来做什么** → `docs/PLAN.md`；**现在还剩什么** → `docs/TODO.md`；**做完了什么 + 证据** → `docs/RECORD.md`；
  **已定事项** → `docs/DECISIONS.md`（只增不改）。**同一件事不许两处写**（会漂）。做法见 `AGENT.md` §4「文档三分」。
- **双版本控制**：外层 git 仓库 + `NewStructureUnity/` 内嵌的 Plastic 工作区。**涉及 Unity 侧的改动，两个渠道都必须提交**（git 按路径显式 `add`，永不 `-A`；Plastic 用 `cm add --recursive` + `cm ci --all` 并复核）。只提交一侧会造成两边历史分叉。
- **样式必须看得见**：任何 Web 样式都要在 `docs/ui-mockups/index.html` 成果页里有对应展示；框体规则（0.5px 发丝描边 + α 阶梯、圆角 6 级按角色、浮层 elevation、交互叠加层、键盘焦点环、中文排版）的权威描述见 [`docs/design/07-frame-style-rules.md`](./docs/design/07-frame-style-rules.md)，落地在 `tokens.css` + `components.css` §20。
- **样式只有一份**（DEC-74）：`tokens.css`（令牌）+ `components.css`（组件）= **产品要用的**；`mockup-shell.css` 是评审外壳，产品不得 import；`style.css` 只是排版稿的聚合入口。
- **壳与业务的边界**：业务代码（`web/src`）**零 `import electron`**（DEC-20）。壳能力只通过 `window.wsu3Shell` 只读快照暴露，实现在 `electron/preload.js`；这条由 `tools/check-shell-coupling.mjs` 机械保证（已进 hook 与 CI）。
- **文档里不写外部引用**：`README.md`、`AGENT.md`、`docs/README.md`、`docs/design/**` 与代码注释**不得**出现外部仓库名或本机绝对路径；需要遵循的规则要**摘录进 `docs/`**（如框体规则 → `docs/design/07`、Unity 构建注意 → `docs/design/06`），再引用我们自己的文档。

## 6 许可

见 [`LICENSE`](./LICENSE)。`NewStructureUnity/` 内引用的第三方包各自遵循其许可。
