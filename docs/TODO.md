# 待办（现在还剩什么）

> 读者：AI 与人｜性质：**活文档**（做完就删条目，并在 [`RECORD.md`](./RECORD.md) 记一行）｜状态：2026-10-13 建立。
>
> **为什么有它**：此前"待办"散在四处（`PLAN.md` 的 §2、`DECISIONS.md` 各章末尾的「未闭合」表、
> `OPEN-QUESTIONS*.md`、`PAGE-WORKLIST.md` / `ui-mockups/TODO.md`），**没人能一眼答出"现在还剩什么"**。
> 现在合并到这里，做法：**一条索引 + 一句话状态 + 来源链接**（细节仍以原文件为准，不在两处重复写）。
>
> **三分**：接下来做什么 → [`PLAN.md`](./PLAN.md)；**待办** → 本文件；做过什么 → [`RECORD.md`](./RECORD.md)。
>
> **纪律**：① 每条要能回答"下一步动作是什么、谁拍板"；② 做完立刻从本文件删除、在 `RECORD.md` 加一行；
> ③ **新增待办只加到这里**（历史遗留的四个来源文件不再各自新增，遇旧条目就搬一条过来）。

## 1 待拍板（需要负责人一句话）

| # | 事项 | 现状 | 要你定什么 |
|---|---|---|---|
| T-01 | 检视页**环境取哪一套**（影棚 HDRI / 产品现状 / 灯光 + IBL / 仅环境光；含背景、曝光、色调映射） | 四档都在，默认「影棚 HDRI · Studio White Umbrella」 | 定下来我把默认值写进 `web/src/viewer/Viewer.ts` |
| T-02 | **材质取值**：无 mask 材质的金属度 / 粗糙度常数定多少；`doubleSided` 保留否；要不要另出 metallicRoughness 贴图 | 有 mask 的已是**贴图驱动**（渲染期按 HDRP 通道重排为 ORM）；无 mask 的（贴花 / 玻璃 / 白件）走规格里的常数 | 常数定成多少、是否重排另出一张图 |
| T-03 | `CombinationSwitch08` 用哪个材质 | 源工程数据是 `CombinationSwitch2`（白 0.6 半透）；**你的清单写"用原材质"** | 二选一（一条命令的事） |
| T-04 | `speedRelay` 的 `SpeedRelay01` 是否也改成 Coat | 现为主干 `SpeedRelay`（与你早先清单一致）；你说过"01 也该是 Coat" | 二选一 |
| T-05 | 预制体**自带的内置图元**（`Cube` / `Cylinder` / `jiexiankong`）要不要搬进 GLB | 现在不含这些几何，它们身上的 `Alpha`（α=0）材质无从应用 | 搬 or 不搬 |
| T-06 | 微信内置浏览器**真机实测** / 亮色是否作默认主题 / 包体预算门禁脚本 | 分别：待设备、待拍板、待真产物接入。**真机实测现在多一项**：原理页的 mp4（H.264/AAC）能不能播、能不能拖进度条（DEC-99 未闭合 d） | 逐条定 |
| T-08 | 原理页要不要"看完即完成" | 现在**只发进入、不发完成**：原理页没有"标记完成"控件（与排版稿 C4 一致，也同 DEC-98 对 `Info` 的处理），`principle:done` 因此不会发 | 定：保持"只有进入"，还是按 `<video>` 的 `ended` 发 `principle:done`（DEC-99 未闭合 b） |
| T-09 | **进度分母三处不齐**：任务页徽标按全契约 **11** 算、菜单页按全部项目的启用任务（今天 **33**）算、站点线按**当前项目**算（**4** 或 **1**） | DEC-100 按要求只改了站点线，其余两处未动；同一页上"已完成 X / 11"与站点线上的 4 站并排，看着像两套口径 | 定：三处**统一成哪个分母**（建议统一按"当前项目的启用任务"，与站点线/下一站同口径），还是各自保留 |
| T-10 | **结构件实例的挂载根**（DEC-110，**由 AI 定**、待确认）：进 `Structure` 站时结构件实例挂哪 | 现在是"场景里有 `StructureRoot` 节点就用它、没有就运行期在管理器节点下自动建一个"（`DataStructure`/`Assets/Scripts/Core/DataStruct/DataStructMapping.cs` 的 `GetStructureRoot`）。`1_Content` 里目前没有这个节点，所以走的是自动建 | 定：就这样（运行期自动建），还是你在 `1_Content` 里预摆一个 `StructureRoot` 并把它交给我的位置/父级口径 |

来源：T-01 / T-02 → `DECISIONS.md` §19.2；T-03 / T-04 → 本轮对话；T-05 → §19.4；T-06 → `DECISIONS.md` 末尾未闭合表；T-08 → `DECISIONS.md` DEC-99 未闭合 b；T-09 → `DECISIONS.md` DEC-100 未闭合 a。

## 2 待做（方向已定，缺实施）

| # | 事项 | 现状 |
|---|---|---|
| D-01 | **P1-5 产品侧资产链**：构建前把 `content/assets/three/**` 拷进 `web/dist/assets/three/**`，运行时 URL 走 `/assets/three/**` | **未实现**。检视页是"从仓库根直读磁盘"的审核工具，不等于产品能用 |
| D-02 | 产品侧**取图链**：DEC-97 的"贴图全部后加载"要随 D-01 一起带进产物（30 张贴图 + `asset-material-textures.json` 查找表） | 未实现（打包时漏了图，产品里会全是缺图） |
| D-04 | `PAGE-WORKLIST.md` 里的未完成页面（考核页重做等） | 见 `docs/PAGE-WORKLIST.md` |
| D-05 | 排版稿层面的待办（组件打磨、页面调整） | 见 `docs/ui-mockups/TODO.md` |
| D-06 | 其余 README 按**新口径**逐个核对：`web/`、`electron/`、`content/assets/`、`unity/builds/` 四份是否还写着旧口径（如"未闭合见 `DECISIONS` 末尾表"、13 个 GLB、"进 `docs/ui-mockups` 起 `http.server 5280`"） | 本轮只做了**根 `README.md` 重写**与 `docs/README.md`；四份分册尚未逐个核对 |
| D-07 | `DECISIONS.md` 各章末尾的历史「未闭合」表：**整体删除、只留 `TODO.md` 一份**，还是保留作"每条决策自己的出处"？ | 现状：保留 + `TODO.md` 汇总回链（`AGENT.md` §5 已写明"状态以 `TODO.md` 为准"）；请负责人定 |
| D-09 | **材质解算在产品与审核页各有一份**（DEC-98 未闭合 a）：审核页是无构建静态页、产品是打包 TS，两者无法共用源码而不把审核工具拖进产品构建链 | 现状：产品自带一份、行为逐项对齐；是否统一（抽成两边都能吃的纯 JS 模块）**待拍板** |
| D-10 | **包体因此增大**（DEC-98 未闭合 b）：影棚 HDR 5.9 MB + 8 个 GLB 7.3 MB + 30 张贴图，**再加 DEC-99 的 8 段讲解视频 65.9 MB**（最大一段 30.57 MB），**再加 DEC-108 的 8 个内容 AB 包 45.3 MB** | 待包体预算门禁（DEC-02 的 250~360 MB）落地时一并核算；发布清单里已单列 `content.assets` / `content.video`；AB 侧逐包字节见 `Builds/assetbundles/ab-build-report.json`（不进版本库）。⚠ AB 是**按需下载**的运行时内容、不是首屏负担，核算时要与"首屏"分开看 |
| D-11 | 原理页的**多段视频**那一档（列表出现、可切段 + 换段换说明）已实现且有单测，但没有真实数据走过 | 采纳数据 8 个项目**全是单段**；等真内容出现时按实际数据复核一遍（DEC-99 未闭合 c） |
| D-12 | 排版稿生成器里 `.ui-alert__icon` 的**模板拼接写错**：`pages-ab.mjs`（A5/A8）、`pages-d.mjs`（D1/D3）、`style-spec.mjs`（组件清单）共 **5 处**写成 `<span class="u${icon('info', 14)}-alert__icon">i</span>`，产物里 svg 被塞进 `class` 属性 ⇒ 图标样式丢失、标签结构坏 | A2 那处已在 **DEC-101** 顺手改掉；其余 5 处未动（不在那次改动范围内）。改法：`<span class="ui-alert__icon">${icon('info', 14)}</span>` 或 `<span class="ui-alert__icon">i</span>`（"i" 要不要留作兜底文字需定），改后跑 `node docs/ui-mockups/src/render.mjs` |
| D-13 | **结构任务的"实例化 / 初始化"**：进 `Structure` 站怎么实例化结构件预制体、怎么初始化（相机 / 交互闸门 / 高亮 / 拆装动画驱动） | **实例化已落地**（2026-10-14，DEC-110 / `design/12` §6）：进站按 `prefabKey` 从 AB 包取件 → 实例化 → 登记实例归属 → 挂 `StructureRoot`。**步骤数据也已落地**（DEC-111：预制体自带 46 步子树，`StructureTaskManager` 会 `StartExecution()`）。**Web 侧的显示也已落地**（2026-10-14，DEC-112：步骤进度 / 提示条 / 信息面板 / 答题面板 + `object:picked` / `unity:error` 都能在页面上看见了）。**仍未做**：相机 / 交互闸门 / 高亮的初始化（比"实例化"更靠后的那一段，在 Unity 侧）—— 与 `D-21` 合并做 |
| D-15 | **零件脚本的重新承载**（DEC-104）：`StructureTaskObj` 的字段（`structureName` / `structureNameEn` / `HoverOrTips`）要在本工程落一个 `InteractiveObjBase` 派生类；且**不再**在 `Awake` 里调 HighlightPlus 门面 | **已落地**（2026-10-14）：`StructureObj.cs` 承载零件字段（`objName` / `objName_en`，基类提供 `objectKey` / `isInteractable`）；生成器已把它补到 **8 个器件共 38 个零件**上（breaker 那 4 处是手工先做的），两个有意未搬脚本的 **Missing Script 40 处全清**（34 处 `StructureTaskObj` + 6 处 `InstControlledManager`，与来源工程逐器件核对过）。⚠️ 内容字段（`objName` 等）的值还没填 —— 生成器只管接线，不管文案 |
| D-18 | **HighlightPlus 的 URP RendererFeature 要不要挂进 `Assets/Settings/URP-*.asset`**（后处理 pass） | 未定。**原"材质接管要重导 FBX"这半条已做完**：2026-10-14 在编辑器里对 `TimeRelay.fbx` / `MasterControlAppliances.fbx` 重导后，8 个预制体**空网格 0 / 空材质 0**（`DECISIONS.md` §21.1 有逐器件读数） |
| D-19 | **主相机要不要换成带 `CinemachineBrain` 的 rig**（DEC-107）：操控层的缩放与视角控制**要 brain 才生效**，而本工程主相机是 `Assets/Resources/MainCamera.prefab`（精简相机，没 brain） | 二选一：把 `Assets/Prefabs/Camera/MainCameraRig.prefab` 顶替 `Resources/MainCamera`（画面行为随之变：背景板 + TAA + 后处理）／保留精简相机并另给它加 brain。**要负责人定** |
| D-20 | **相机背景板的取图入口未接**（DEC-107 未闭合）：`CameraBg.LoadBgTextures()` 现在是"只告警不加载"的待办桩 —— 本工程的资源包链路（P2-6）未落地 | 资源包链路落地后按双纹理接进去（材质属性 `_Texture_1/_Texture_2/_TexOrColor/_CutTex` 都已在位） |
| D-21 | **操控层没有任何实机验收**（DEC-107 未闭合）：角色预制体与相机 rig 都还没进场景，三条控制器一次都没跑过 | 与 `D-13`（结构任务的实例化 / 初始化）合并做：先把角色与虚拟相机放进 `1_Content`，再逐条验（移动 / 俯仰 / 缩放 / 瞬移 / 聚焦环绕） |
| D-22 | **角色预制体的 `Capsule` 材质是空的**（**继承缺陷**，不是搬漏）：这条材质引用在参照工程里就断（清单 `unresolved` 的那条 guid） | 本项目自行给一个材质即可，不影响编译与脚本引用 |
| D-23 | **重打结构件 AB 包**：2026-10-14 起 8 个结构件预制体已经变了（新增 **46 步** `StepManager` 子树、38 个 `StructureObj`、清掉 40 处 Missing Script） | **已做**（负责人 2026-10-14 19:43 重打：8 个包 / 32,698,327 字节，`missing 0 / removed 0 / warnings 0`，落 `Assets/StreamingAssets/Content/**`，报告 `NewStructureUnity/Builds/assetbundles/ab-build-report.json`）。⚠️ 那次 `buildTarget = StandaloneWindows64`；负责人随后**已切回 WebGL 并重打**（本轮口径）。**AB 是平台锁定的**，出 Web 产物前确认当前那份是 WebGL |
| D-24 | **真 WebGL 构建 + 实机端到端验收**：本轮的桥交互是用**桩构建**验的（`make-stub-unity.mjs` 的协议仿真，18 条冒烟断言），它证明的是**契约两侧对得上**，不等于真 Unity 产物跑得通 | 未做。步骤：① Unity 切 WebGL 并构建（DEC-59：构建前关编辑器）；② `node tools/pipeline/unity-stage.mjs --from <构建目录> --key main --task-types 4,5,8,9 --bridge`（或菜单）；③ 起 dev 服务器（`vite dev` 现在会自己服务 `/unity/**` 与发布清单，见 DEC-114）或 `node tools/pipeline/pack.mjs` 打包；④ 进结构站逐条走 46 步，核对拆装动画、`object:picked`、`step:changed`、`task:completed`。⚠️ 另需验 `0_Setup` 的免 Web 自测开关（`StartupTestSwitch`：`?wsu3_test=8&wsu3_clip=clip_contactor`）在**真 WebGL 构建**里确实能自启 |
| D-25 | **Unity 实例在任务之间的常驻（DEC-81 的目标形态）未达**：本实现离开 Unity 任务时**直接销毁实例**（DEC-12），所以 `scene:exit` 发出去多半来不及被处理 —— `UnitySession.exitTask()` 的注释里如实写了这一点 | 未做。要做成"实例常驻、只换资源包"，得让 Unity 容器在任务之间常驻（而不是随 `practice` 分支一起被摘掉，见 `docs/design/09` §2/§5），并给不可见状态配"透明父层画布 + `runtime:resume`"。与此配套：`scene:exit` 才真正有意义 |

## 3 已进 git、只剩 Unity 侧（Plastic）待提交

| # | 内容 | 说明 |
|---|---|---|
| U-02 | **结构任务（TaskType 8）资产搬运**（DEC-102 / DEC-103）：`tools/pipeline/import-structure-assets.mjs` + `content/asset-structure-report.json` + Unity 侧 `Assets/{Prefabs,Animation,Shaders,Plugins,Models/**/Materials,_shared/Model/Public}` + 文档（`DECISIONS.md` §21、`design/03` §5.2、`README.md`、本文件） | **git 侧已进 main**（PR #21，squash 进 `43df657`；`Assets/Prefabs.meta` 等文件夹 meta 已随包进库）；**剩 Unity 侧 Plastic 待提交**。⚠️ 只走 Plastic 的 `Assets/Animation/`（46 段动画）被 `.gitignore` 排除，其 `.meta` 只能由 Unity 生成 —— **2026-10-14 19:02 已就位**：Plastic 同步完成，`Assets/Animation/{Model,Structure}/**` 46 个 `.anim`（14.61 MB，与 DEC-102 清单一致）+ 46 个 `.meta`、`Assets/Animation.meta` 全在位（逐个核对无缺） |
| U-03 | **底层操控层移植**（DEC-107）：`tools/pipeline/{import,port}-input-controller.mjs` + 清单 `content/asset-input-controller-report.json` + `Assets/Scripts/Core/Controllers/**`（7 个 `.cs` + `StarterAssets.inputactions`）+ `Assets/Prefabs/{Characters,Camera}/**` + `Assets/Model/Public/Materials/CamBg.mat` + `Assets/Shaders/Models/CamBgUnlitShader.shadergraph` + `Assets/Plugins/HighlightPlus/Runtime/HighlightPlus.Runtime.asmdef`（补 `Unity.InputSystem`）+ `Packages/manifest.json` + `ProjectSettings/ProjectSettings.asset` + 文档（`DECISIONS.md` §22、`design/11`、`design/03`、`README.md`、`docs/README.md`、本文件、`RECORD.md`）。⚠️ `Assets/Scripts/Core/Controllers/` 与两个预制体的文件 `.meta` 已随搬运到位，**文件夹 `.meta` 由 Unity 生成**，同样要等导入完再提交 | **git 侧已进 main**（PR #21 / `43df657`）；**剩 Unity 侧 Plastic**。⚠️ `activeInputHandler` 已改 Both，**建议重启一次 Unity 编辑器**让输入后端在运行时生效（编译已按 Both 走）；⚠️ 本次拉取把 `Cinemachine` / `Input System` 两个新包带进 `Packages/manifest.json`，Unity 会全量重导一遍，等它跑完再 `cm ci` |
| U-04 | **资源包与 AB 打包流水线**（DEC-108 ~ DEC-110，闭合 D-17）：Unity 侧新增/改动 —— `Assets/Scripts/Core/Models/Addressable/**`（9 个 `.cs`）、`Core/Managers/FunctionManager/{AddressableManager,TaskFlowManager,SceneManager}.cs`、`Core/Managers/TaskManager/{TaskManagerBase,StructureTaskManager}.cs`、`Core/Managers/GlobalManager.cs`、`Core/DataStruct/DataStructMapping.cs`、`Core/WSU3.Core.asmdef`、`Assets/Editor/{Common/**,BuildTools/**}`（11 个 `.cs`）、`Assets/Editor/WSU3.Editor.asmdef`、`ignore.conf`；**新增资产**：`Assets/Resources/Config/{PackageDB_Master.asset,ContentPackages/AB_*.asset ×8}`、`Assets/AddressableAssetsData/**`（设置 + 2 个默认分组 + 5 个 `AssetGroups/*.asset`）；文档（`docs/design/12`（新）、`docs/README.md` v9、`DECISIONS.md` §23、`PLAN.md` P2-6a/b + P2-8e、`TODO.md`、`RECORD.md` 1.36、根 `README.md`） | **git 侧已进 main**（PR #21 / `43df657`）；**剩 Unity 侧 Plastic**。⚠️ 新增 `.cs` 的 `.meta` 要**等 Unity 导入完**再提交；⚠️ **只提交包登记表与 `AddressableAssetsData`，不要提交 `Assets/StreamingAssets/Content/**`（AB 产物，已加 `ignore.conf` 规则）**；⚠️ 若将来新增别的"包名首段"，`ignore.conf` 要同步补规则（`design/12` §4.4） |
