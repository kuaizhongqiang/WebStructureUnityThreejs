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
| T-06 | 微信内置浏览器**真机实测** / 亮色是否作默认主题 / 包体预算门禁脚本 | 分别：待设备、待拍板、待真产物接入。真机实测另含：原理页的 mp4（H.264/AAC）能不能播、能不能拖进度条（DEC-99 未闭合 d）。**负责人 2026-10-15：全部暂缓，暂不处理**（DEC-135） | 待设备与真产物，届时逐条定 |

> 其余 T 条目（T-01 ~ T-05 / T-08 ~ T-10 / T-12 / T-13）已于 2026-10-15 由负责人一次性拍板，落 **`DECISIONS.md` §31（DEC-134 ~ DEC-139）**，按纪律从本表删除、`RECORD.md` 留痕。

## 2 待做（方向已定，缺实施）

| # | 事项 | 现状 |
|---|---|---|
| D-04 | `PAGE-WORKLIST.md` 里的未完成页面（考核页重做等） | 见 `docs/PAGE-WORKLIST.md` |
| D-05 | 排版稿层面的待办（组件打磨、页面调整） | 见 `docs/ui-mockups/TODO.md`（其 T4 已随 DEC-139 作废，逐页调整时以页为单位处理） |
| D-10 | **包体因此增大**（DEC-98 未闭合 b）：影棚 HDR 5.9 MB + 8 个 GLB 7.3 MB + 30 张贴图，**再加 DEC-99 的 8 段讲解视频 65.9 MB**（最大一段 30.57 MB），**再加 DEC-118 的 9 个内容 AA 组约 43 MB** | 待包体预算门禁（DEC-02 的 250~360 MB）落地时一并核算；发布清单里已单列 `content.assets` / `content.video`；AA 侧逐组字节见 `Builds/assetbundles/aa-build-report.json`（不进版本库）。⚠ AA 是**按需下载**的运行时内容、不是首屏负担，核算时要与"首屏"分开看。⚠ **迁 AA 后口径变了**：`WSU3_Shared`（32.9 MB 材质+贴图+ShaderGraph）被**所有 clip 共用**、只下载一次，而 AB 时代同一份材质在 8 个包里各存一份（8 个包合计 47.5 MB）—— 所以"总字节变小"与"单个 clip 包变小"都要按新口径重算 |
| D-11 | 原理页的**多段视频**那一档（列表出现、可切段 + 换段换说明）已实现且有单测，但没有真实数据走过 | 采纳数据 8 个项目**全是单段**；等真内容出现时按实际数据复核一遍（DEC-99 未闭合 c） |
| D-13 | **结构任务的"实例化 / 初始化"**：进 `Structure` 站怎么实例化结构件预制体、怎么初始化（相机 / 交互闸门 / 高亮 / 拆装动画驱动） | **实例化已落地**（2026-10-14，DEC-110 / `design/12` §6）：进站按 `prefabKey` 从 AB 包取件 → 实例化 → 登记实例归属 → 挂 `StructureRoot`。**步骤数据也已落地**（DEC-111：预制体自带 46 步子树，`StructureTaskManager` 会 `StartExecution()`）。**Web 侧的显示也已落地**（2026-10-14，DEC-112：步骤进度 / 提示条 / 信息面板 / 答题面板 + `object:picked` / `unity:error` 都能在页面上看见了）。**仍未做**：相机 / 交互闸门 / 高亮的初始化（比"实例化"更靠后的那一段，在 Unity 侧）—— 与 `D-21` 合并做 |
| D-15 | **38 个零件的 `objName` / `objName_en` 内容还没填**（生成器只接线不管文案，DEC-146） | 负责人 2026-10-15 指示：**从低压电器项目（TK231）找对应的中英文名填进预制体**，填完重打 AA。脚本承载本身已落地（2026-10-14：`StructureObj.cs` + 生成器补齐 8 器件 38 零件，Missing Script 40 处全清） |
| D-20 | **相机背景板的取图入口未接**（DEC-107 未闭合）：`CameraBg.LoadBgTextures()` 现在是"只告警不加载"的待办桩 —— 本工程的资源包链路（P2-6）未落地 | 资源包链路落地后按双纹理接进去（材质属性 `_Texture_1/_Texture_2/_TexOrColor/_CutTex` 都已在位） |
| D-21 | **操控层没有任何实机验收**（DEC-107 未闭合）：角色预制体与相机 rig 都还没进场景，三条控制器一次都没跑过 | 与 `D-13`（结构任务的实例化 / 初始化）合并做：先把角色与虚拟相机放进 `1_Content`，再逐条验（移动 / 俯仰 / 缩放 / 瞬移 / 聚焦环绕） |
| D-22 | **角色预制体的 `Capsule` 材质是空的**（**继承缺陷**，不是搬漏）：这条材质引用在参照工程里就断（清单 `unresolved` 的那条 guid） | 本项目自行给一个材质即可，不影响编译与脚本引用 |
| D-24 | **真 WebGL 构建 + 实机端到端验收**：本轮的桥交互是用**桩构建**验的（`make-stub-unity.mjs` 的协议仿真，18 条冒烟断言），它证明的是**契约两侧对得上**，不等于真 Unity 产物跑得通 | **部分闭合（2026-10-14 晚报，DEC-117/118）**：负责人已实机确认「预制体 / 编辑器运行 / 打包后 Live Server 运行**都已 OK**」，并且**洋红这条已定案**——不是"变体裁剪被裁"（那一栏可以划掉）：真因是**编辑器加载 WebGL 平台的 bundle 时，包里每个 shader（含内置 URP/Lit）都拿不到可用 pass ⇒ 一律回退 error shader**（DEC-117，含三条对照实验）。**仍未做**：① 进结构站逐条走 46 步（拆装动画 / `object:picked` / `step:changed` / `task:completed`）；② `0_Setup` 免 Web 自测开关在**真 WebGL 构建**里确实能自启；②a 进站后部件树渲染、悬停浮标跟随、点行高亮（`scene:parts` / `object:hover` / `view:focus`，DEC-131 ~ DEC-133 的实机验收）；③ 步骤：Unity 切 WebGL 并构建（DEC-59：构建前关编辑器）→ `node tools/pipeline/unity-stage.mjs --from <构建目录> --key main --task-types 4,5,8,9 --bridge`（或菜单）→ 起 dev 服务器或 `node tools/pipeline/pack.mjs` 打包。⚠️ **迁 AA 之后这条多一个前置**：内容先跑 `WSU3/Pack/一键打 AA 包（全部）`（产物落 `Library/com.unity.addressables/aa/<平台>/`，Build Player 时由 Addressables 自动拷进 `Assets/StreamingAssets/aa/<平台>/`；**只跑 AA 构建不会让 StreamingAssets/aa 出现东西，这是设计如此**，见 `design/12` §6） |
| D-25 | **Unity 单实例常驻（DEC-81 目标形态 + DEC-145 修正口径）**：无论多少个 task，**只有一个 Unity 实例** —— 最早时机（web 启动后 Unity 稍延迟启动、`0_Setup` 自检通过停在 `1_Content`）创建并**常驻**，之后由 **JS 控制把同一实例挂到当前页面容器、或隐藏**；进 task 直接可交互，**不再出现加载进度条与 Unity 启动画面**（负责人 2026-10-15 指示，吸收原 D-30） | 未做。现状：离开 Unity 任务即销毁实例（DEC-12）、进 task 才挂载。要做的：① 实例创建前移到 `start → login → menu` 阶段（`preload:task` 协议已预留）；② Unity 容器不再随 `practice` 分支摘掉（`docs/design/09` §2/§5），不可见状态配"透明父层画布 + `runtime:resume`"；③ JS 侧把常驻画布搬挂到当前页容器或 `display:none`。配套：`scene:exit` 才真正有意义 |
| D-26 | **"材质接管"的根治**（DEC-115 / `design/12` §4.3）：现在靠打包前**强制重导 FBX** 事后补救（`ModelMaterialBindingFixer`），根因是接管时**替换**了 FBX 自动抽出的同名 `.mat`（GUID 变 → FBX 内部绑定悬空）。⚠️ 该修复只落在本机 `Library`，**切换 Build Target 就会退化一次**，靠自愈兜着 | 未做。根治要改成**不替换**那些材质：保留 FBX 抽出的 `.mat`（保住 GUID），只改它的 shader 与属性（`content/asset-material-spec.json` 那套口径本来就是这个思路）；落点是重做 `tools/pipeline/import-structure-assets.mjs` 的材质那一段 |

## 3 已进 git、只剩 Unity 侧（Plastic）待提交

| # | 内容 | 说明 |
|---|---|---|
| U-02 | **结构任务（TaskType 8）资产搬运**（DEC-102 / DEC-103）：`tools/pipeline/import-structure-assets.mjs` + `content/asset-structure-report.json` + Unity 侧 `Assets/{Prefabs,Animation,Shaders,Plugins,Models/**/Materials,_shared/Model/Public}` + 文档（`DECISIONS.md` §21、`design/03` §5.2、`README.md`、本文件） | **git 侧已进 main**（PR #21，squash 进 `43df657`；`Assets/Prefabs.meta` 等文件夹 meta 已随包进库）；**剩 Unity 侧 Plastic 待提交**。⚠️ 只走 Plastic 的 `Assets/Animation/`（46 段动画）被 `.gitignore` 排除，其 `.meta` 只能由 Unity 生成 —— **2026-10-14 19:02 已就位**：Plastic 同步完成，`Assets/Animation/{Model,Structure}/**` 46 个 `.anim`（14.61 MB，与 DEC-102 清单一致）+ 46 个 `.meta`、`Assets/Animation.meta` 全在位（逐个核对无缺） |
| U-03 | **底层操控层移植**（DEC-107）：`tools/pipeline/{import,port}-input-controller.mjs` + 清单 `content/asset-input-controller-report.json` + `Assets/Scripts/Core/Controllers/**`（7 个 `.cs` + `StarterAssets.inputactions`）+ `Assets/Prefabs/{Characters,Camera}/**` + `Assets/Model/Public/Materials/CamBg.mat` + `Assets/Shaders/Models/CamBgUnlitShader.shadergraph` + `Assets/Plugins/HighlightPlus/Runtime/HighlightPlus.Runtime.asmdef`（补 `Unity.InputSystem`）+ `Packages/manifest.json` + `ProjectSettings/ProjectSettings.asset` + 文档（`DECISIONS.md` §22、`design/11`、`design/03`、`README.md`、`docs/README.md`、本文件、`RECORD.md`）。⚠️ `Assets/Scripts/Core/Controllers/` 与两个预制体的文件 `.meta` 已随搬运到位，**文件夹 `.meta` 由 Unity 生成**，同样要等导入完再提交 | **git 侧已进 main**（PR #21 / `43df657`）；**剩 Unity 侧 Plastic**。⚠️ `activeInputHandler` 已改 Both，**建议重启一次 Unity 编辑器**让输入后端在运行时生效（编译已按 Both 走）；⚠️ 本次拉取把 `Cinemachine` / `Input System` 两个新包带进 `Packages/manifest.json`，Unity 会全量重导一遍，等它跑完再 `cm ci` |
| U-04 | **资源包与 AB 打包流水线**（DEC-108 ~ DEC-110，闭合 D-17）：Unity 侧新增/改动 —— `Assets/Scripts/Core/Models/Addressable/**`（9 个 `.cs`）、`Core/Managers/FunctionManager/{AddressableManager,TaskFlowManager,SceneManager}.cs`、`Core/Managers/TaskManager/{TaskManagerBase,StructureTaskManager}.cs`、`Core/Managers/GlobalManager.cs`、`Core/DataStruct/DataStructMapping.cs`、`Core/WSU3.Core.asmdef`、`Assets/Editor/{Common/**,BuildTools/**}`（11 个 `.cs`）、`Assets/Editor/WSU3.Editor.asmdef`、`ignore.conf`；**新增资产**：`Assets/Resources/Config/{PackageDB_Master.asset,ContentPackages/AB_*.asset ×8}`、`Assets/AddressableAssetsData/**`（设置 + 2 个默认分组 + 5 个 `AssetGroups/*.asset`）；文档（`docs/design/12`（新）、`docs/README.md` v9、`DECISIONS.md` §23、`PLAN.md` P2-6a/b + P2-8e、`TODO.md`、`RECORD.md` 1.36、根 `README.md`） | **git 侧已进 main**（PR #21 / `43df657`）；**剩 Unity 侧 Plastic**。⚠️ 新增 `.cs` 的 `.meta` 要**等 Unity 导入完**再提交；⚠️ **只提交包登记表与 `AddressableAssetsData`，不要提交 `Assets/StreamingAssets/Content/**`（AB 产物，已加 `ignore.conf` 规则）**；⚠️ 若将来新增别的"包名首段"，`ignore.conf` 要同步补规则（`design/12` §4.4） |
