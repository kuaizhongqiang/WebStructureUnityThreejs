# 设计 03：目录结构、程序集分层与资产登记

> 读者：AI 与人｜状态：2026-10-12 v0（**草案，待确认**）｜依据：`../DECISIONS.md` DEC-47（Unity 分层）、DEC-51（目录接受现状并补齐）、DEC-42（**资产登记以资源为主键**）、DEC-57（大资产不进 git）。

## 1 仓库顶层

```text
WebStructureUnityThreejs/
  AGENT.md              # AI 协作入口（唯一"有内容"的手册）
  CODEBUDDY.md          # 仅指向 AGENT.md
  .gitignore
  docs/                 # 需求 / 调研 / 问答 / 决策 / 设计（本目录）
  web/                  # Web 主站（Vite + Vue 3 + 裸 three）已落地
  NewStructureUnity/    # Unity 工程（复杂三维）——同时是 Plastic 工作区
  electron/             # ✅ 已建：应用壳（DEC-20）—— server.js 本机静态服务 / main.js 窗口 / preload.js 预留接口
  content/              # ★ 待建：双端共享的内容数据与资产登记（见 §4/§5）
  tools/                # ★ 待建：跨端脚本（契约校验、大文件拦截、门禁，DEC-41）
```

- `tools/`（仓库根）与 `web/tools/`（Web 专属）**职责不同**：根 `tools/` 放**跨端**门禁与校验；`web/tools/` 放 Web 自己的（如 `render-smoke.mjs`）。
- `docs/design/` 放**已定方向的设计草案**；`docs/research/` 放**事实与选项调研**；两者都不承载"已决定/未定"的判定（那是 `DECISIONS.md` 的职责）。

## 2 Unity 侧目录与程序集（DEC-47 / DEC-51）

```text
NewStructureUnity/Assets/Scripts/
  Core/        # 框架基础设施：单例基类、事件总线、日志、JSON、协程、状态机基类、资源包管理器
               #   子目录：`Interactive/` 拾取与交互闸门、`Managers/` 全局与功能管理器、
               #   `Controllers/` 底层操控层（输入控制器 + 相机背景，DEC-107）、`Steps/` 步骤系统、`DataStruct/`、`Models/`、`Interfaces/`
  Contracts/   # ★ 与 Web 共享的契约（SceneState / TaskType / QuestionType / QuestionUsage / BridgeMessageType）
  Managers/    # 全局管理器：Data / Assets（包登记与装卸）/ Scene / Camera / Interactive
  Viewers/     # 三维承载：每个 Unity 类 TaskType 一个 Viewer（进入 / 退出 / 清理）
  Web/         # 桥：WebBridgeBehaviour（收 Web 消息）+ Plugins/*.jslib（发消息给 Web）
  Services/    # 外部对接单一入口（DEC-43）：当前只有接口定义，无实现
NewStructureUnity/Assets/Editor/          # 编辑器工具（独立程序集）
NewStructureUnity/Assets/StreamingAssets/Data/   # ★ 内容数据（Unity 那一份，随构建发布，WebGL 下经 UnityWebRequest 读）
NewStructureUnity/Assets/Tests/           # 测试（DEC-27）
```

**没有 `UIs/` 目录**（DEC-80）：Unity 侧不做界面 —— 全部 UI 在 Web 的 DOM 层（DEC-16），
三维世界内也**不做跟随文字标签**（Q-R6-2 = C：改为"侧栏列表 ↔ 物体高亮"联动）；
引线 / 箭头这类**几何**仍由 Unity 画（不算 UI，Q-R6-S2 = A）。

程序集（asmdef）：

| 程序集 | 目录 | 依赖 | 说明 |
|---|---|---|---|
| `WSU3.Contracts` | `Contracts/` | 无（除 Unity 内置） | 契约层：只有枚举与消息常量，**不得**引用其它程序集 |
| `WSU3.Core` | `Core/` | `WSU3.Contracts` + `UnityEngine.UI` + `HighlightPlus.Runtime` + `Cinemachine` + `Unity.InputSystem` | 框架基础设施，不得反向依赖上层；后两个是底层操控层带来的（DEC-107） |
| `WSU3.Runtime` | `Managers/` `Viewers/` `Web/` `Services/` | `WSU3.Core` `WSU3.Contracts` | 业务运行时 |
| `WSU3.Editor` | `Assets/Editor/` | `WSU3.Runtime` `WSU3.Core` | 编辑器工具 |
| `WSU3.Tests.*` | `Assets/Tests/` | 被测程序集 + test-framework | 单测 / PlayMode |
| `HighlightPlus.Runtime` | `Assets/Plugins/HighlightPlus/Runtime/` | `UnityEngine.UI` + `Unity.InputSystem` | 第三方高亮插件的运行时代码（DEC-103 搬入 / DEC-106 定接入方式；输入后端改 Both 后补 `Unity.InputSystem`，见 DEC-107） |
| `HighlightPlus.Pipelines` | `Assets/Plugins/HighlightPlus/Pipelines/URP/` | `HighlightPlus.Runtime` + URP 运行时 | 插件的 URP 渲染特性；**是否挂进 URP 资产未定**（`../TODO.md` D-18） |
| `HighlightPlus.Editor` | `Assets/Plugins/HighlightPlus/Editor/` | `HighlightPlus.Runtime` + `HighlightPlus.Pipelines` + URP 运行时 | 插件编辑器脚本（仅 Editor 平台） |

**为什么只有 `WSU3.Core` 引用 `UnityEngine.UI`**（2026-10-13 补，DEC-80 的落地）：它提供的是
`UnityEngine.EventSystems`（`EventSystem` / `StandaloneInputModule` / `PhysicsRaycaster` / `IPointer*Handler`），
也就是**三维拾取的那套输入体系** —— **不是**拿来画界面的（界面在 Web 的 DOM 层，DEC-16/80）。
拾取与交互登记都收在 `Core/Managers/FunctionManager/InteractiveManager.cs` 一个文件里
（**不另建 manager、不另建注册表脚本**，驱动是 `GlobalManager.Update` → `InteractiveManager.CoreUpdate`），
所以只有 Core 需要这个引用；`WSU3.Runtime` 不需要。

依赖纪律（DEC-86）：本工程各层之间，`WSU3.Core → WSU3.Contracts` 是**允许且唯一**的一条下行依赖（`Core` 里的管理器要认枚举与消息名）；
`Contracts` 必须保持零依赖。**另有一条指向第三方的引用**：`WSU3.Core → HighlightPlus.Runtime`（DEC-106，高亮表现要用插件）——
它不属于本工程的分层，不算上面那条下行依赖；`WSU3.Runtime` 未加。至于 **TMP / uGUI 包**：本批**保留在 `Packages/manifest.json` 里不删**（Q-R6-5 = B），
但它们是"输入与服务用的底座"（`EventSystem` / `PhysicsRaycaster` 属于 uGUI 包），**不作为界面方案**（DEC-80 / Q-R6-S1 = A）。

⚠️ **执行前置**：创建目录与 asmdef 会让 Unity 重新导入并生成 `.meta`，且改动属于 Unity 侧 ⇒ 需走 DEC-60 的**双渠道提交**，并在编辑器空闲时进行（DEC-59）。

## 3 Web 侧（已落地）

见 `../research/07-web-scaffold.md` §1。要点：`src/{contracts,viewer,unity,stores,router,pages,styles}`；`tools/render-smoke.mjs`；`content` 数据从 `content/`（根）读取，不放在 `web/public/` 里硬编码。

## 4 资产登记表（**按 DEC-42 修正为"以资源为主键"**）

用户口径：**一个三维模型可能被多个页面、多个 `TaskType` 调用**；且 Web / Unity 各自做各自的资产。

因此登记表**不能**按 `taskType` 一对一，必须是：

```jsonc
// content/asset-registry.json（草案）
{
  "version": 1,
  "resources": [
    {
      "key": "lib.sensor.temperature",        // ★ 主键：资源标识（稳定、不随页面变）
      "name": "温度传感器",
      "kind": "model",                         // model | texture | video | audio | font
      "stack": "three",                        // ★ three | unity（DEC-11：两侧各做各的）
      "source": "blender",                     // blender | unity | purchased | unknown
      "path": "content/assets/three/lib.sensor.temperature.glb",
      "bytes": 1234567,
      "sha256": "…",                           // 大资产不入 git 时，这是唯一的完整性依据（DEC-57）
      "usedBy": {                              // ★ 多对多：被哪些项目/任务用到
        "projects": ["proj.001"],
        "taskTypes": [2, 7]
      },
      "status": "ready"                        // ready | wip | missing | deprecated
    }
  ]
}
```

规则：
1. **主键是 `key`**（资源），不是 `taskType`；`usedBy` 表达多对多用例；
2. **同名资源在 `three` 与 `unity` 是两条记录**（`stack` 区分）——这正好对上 DEC-60"允许部分资产两侧各保留一份"；
3. `sha256` 是**大资产不入 git 时的唯一完整性依据**（DEC-57），因此它是必需字段；
4. 这份 JSON **同时是加载器的索引**（Three 侧按 key 找模型路径；Unity 侧按 key 找 AB 条目），避免出现"只给文档看的数据"。

## 5 内容数据的落点（**两份，同名同结构**，DEC-82）

```text
content/
  contracts/
    snapshot.json         # ★ 契约校验基准（不是真源，见下）；枚举与桥消息的第三方比对物
  asset-registry.json     # §4 的资源登记表（以资源为主键）
  assets/
    three/                # Three.js 侧大资产（glTF/GLB）★ 不进 git（DEC-57）；构建前拷进 web/dist

web/public/content/data/                        # ← **Web 那一份内容数据**（随 web/dist 发布）
  ProjectData.json  QuestionData.json  MenuData.json  StepContentData.json
  SystemData.json   UserData.json      LanguageData.json
NewStructureUnity/Assets/StreamingAssets/Data/  # ← **Unity 那一份**（同名同结构，随 Unity 构建发布）
```

- **为什么两份**、门禁怎么比对、形状与字段清单：见 [`08-content-data-adoption.md`](./08-content-data-adoption.md)。

### 5.1 三维资产的落点（P1-4，**已落地**）

```text
NewStructureUnity/Assets/Models/<器件>/            # FBX + PBR 贴图（+ 配套 .meta）★ 不进 git
NewStructureUnity/Assets/Models/_shared/…          # 多器件共用的贴图（万用表 / 表笔等）
NewStructureUnity/Assets/Sprites/Content/<器件>/    # 原理图（供 Unity）★ 不进 git
web/public/content/sprites/<器件>/                 # 同一批原理图（供 Web，小，进 git）
content/assets/three/<器件>/<名>.glb               # Blender 转出的 GLB（Three 侧）★ 不进 git
content/assets/video/<videoName>.mp4               # 原理页讲解视频（DEC-99）★ 不进 git
content/asset-import-report.json                   # 搬运清单（来源 / 目标 / 字节 / sha256）★ 进 git
content/asset-convert-report.json                  # 转换清单（三角面 / 贴图 / 未映射项）★ 进 git
content/asset-video-report.json                    # 视频搬运清单（来源 / 目标 / 字节 / sha256）★ 进 git
```

四条工具链（都可重跑，幂等）：

| 脚本 | 作用 |
|---|---|
| `tools/pipeline/import-adopted-assets.mjs` | 按**内容数据**决定搬什么：`prefabKey` → 包配置 → prefab → GUID 依赖闭包取 FBX + 贴图；`images[]` → 原理图。**只读来源工程** |
| `tools/pipeline/import-principle-videos.mjs` | 按**内容数据**的 `principleStructs[].videoName` 搬讲解视频（DEC-99）。**与上一条分开**：那条链服务两条线共用的资产（带 `.meta`、过 Blender、有"单图 ≥10 MB 剔除"规则），视频只服务 Web 侧且单段最大 30 MB，套用那条剔除规则会把视频全剔掉 |
| `tools/pipeline/fbx-to-glb.mjs` + `blender-fbx-to-glb.py` | 每个模型一个 `blender --background` 进程转 GLB，自带"清掉 FBX 里的失效贴图引用、按文件名重接 BaseColor/Normal" |
| `tools/pipeline/import-structure-assets.mjs` | 搬**结构任务专属**的 Unity 资产（DEC-102 / DEC-103）：结构件预制体 + 46 段拆装动画 + 器件材质 + 自制 ShaderGraph（含 SubGraph）+ HighlightPlus 插件。**单独一条链**：上面两条一条剔除过 `.mat`/`.anim`（服务两条线共用的几何）、一条只服务 Web 侧视频，判据都不同 |

两条从执行中学到的规矩：

1. **FBX 的依赖闭包收不全贴图**：prefab 会覆盖材质，于是 FBX 自己的 PBR 贴图可能不在依赖链上 ——
   所以按**同名前缀**把兄弟贴图一并搬（`<FBX 名>_*.png`）；
2. **`*M_AO_G*` 不能直连 glTF**：它是 HDRP 的 mask map（R=金属度 / G=AO / A=光泽度），
   与 glTF 的 occlusion（读 R）/ roughness（读 metallicRoughness 的 G）通道语义不符，
   硬塞出来的画面是错的且难查 —— 转换脚本只**记录未映射**，金属度/粗糙度用常数兜底。
- **`content/assets/` 不进 git**（DEC-57）：模型与贴图体积远超单文件阈值，落点与忽略规则在 `.gitignore` / `ignore.conf` 里成对维护。
- 早期 `content/projects/*.json` 的示例数据（`demo-temperature.json`）**保留**，供"没有真实内容时也能跑通页面"的演示路径使用；真实内容一律走 `content/data/`。

⚠️ **`content/contracts/snapshot.json` 的性质**：它**不是**真源，而是**门禁的比对基准**（两侧都必须与它一致）。
它只能在一侧或两侧同时修改时、作为可评审的 diff 一起更新 —— 若不做这个约束，它就变成了"第三份事实源"，与 DEC-10 冲突。
**同理**：`content/data/*.json` 与 `Assets/StreamingAssets/Data/*.json` 是**两份手写文件**，靠门禁报"不一致"（DEC-82）。

### 5.2 结构任务（TaskType 8）的资产落点（**已落地**，DEC-102 / DEC-103）

结构任务**只在 Unity 侧表现**，它的载体是"预制体 = 零件装配 + 拆装动画 + 零件交互"，与 §5.1 那批共用几何**不是一回事**。

```text
NewStructureUnity/Assets/Prefabs/Models/StructureObjs/<器件>_structure_model.prefab   # 8 个（含 1 个空壳）★ 进 git
NewStructureUnity/Assets/Animation/Model/Structure/<器件>_structure_model_<n>.anim    # 46 段 14.6 MB ★ Plastic（git 忽略）
NewStructureUnity/Assets/Shaders/Models/*.shadergraph · *.shadersubgraph               # 4 + 1 ★ 进 git
NewStructureUnity/Assets/Plugins/HighlightPlus/{Runtime,Pipelines,Editor}/…            # 插件 ★ 进 git（Runtime / Pipelines / Editor 各一个 asmdef，见 DEC-106）
NewStructureUnity/Assets/Models/<器件>/Materials/*.mat                                 # **接管**：覆盖自动抽出的同名材质（DEC-102 §4）
NewStructureUnity/Assets/Models/_shared/Model/Public/Materials/Alpha.mat               # 多器件共用的公共材质
NewStructureUnity/Assets/Models/_shared/Model/Cubicmap/_cubmap/Chrome05.cubemap        # 12.0 MB 反射环境（4 个 *_Metal 材质的真实依赖）★ Plastic
content/asset-structure-report.json                                                    # 搬运清单（来源 / 目标 / 字节 / sha256）★ 进 git
```

- **为什么 `.anim` 走 Plastic、预制体 / Shader / 插件进 git**：判据是"**两条线共用的资产进 git**
  （如 `Assets/Sprites/Content`，Web 也用得上），**Unity 专属的大块走 Plastic**"（`Assets/Models` 已是这个待遇）；
  预制体 / Shader / 插件体积小且是**要能 diff 评审**的东西，进 git。
- **材质为什么落在 `Assets/Models/<器件>/Materials/`**：Unity 从 FBX 抽材质时就抽到这个位置，
  搬入的源材质**同名同址**才会在 FBX 重导时被复用（"接管"）；且搬运连 `.meta` 一起覆盖，
  GUID 换成源工程的 ⇒ 源预制体里的材质引用逐条对得上。
- **AB 打包**：结构件的包名与来源工程一致（`bundleName = Content/clip_<器件>`，见清单的 `entries`），
  包配置的 `assetPath` 指向上面那 8 个预制体 —— 打包规则仍走 §7 的"三条链路"（DEC-87，继续生效）。
- **本轮不做**：`.cs`（`StructureTaskObj` / `InstControlledManager`）与"实例化 / 初始化"，
  后者见 `../TODO.md`；口径见 `DECISIONS.md` DEC-104。

### 5.3 底层操控层的资产落点（**已落地**，DEC-107）

详细规格见 [`11-input-and-camera.md`](./11-input-and-camera.md)。

```text
NewStructureUnity/Assets/Scripts/Core/Controllers/                          # 7 个 .cs + StarterAssets.inputactions（程序集 WSU3.Core）★ 进 git
NewStructureUnity/Assets/Prefabs/Characters/FirstPersonController.prefab    # 角色 + 控制器 + 它自己的虚拟相机 ★ 进 git
NewStructureUnity/Assets/Prefabs/Camera/MainCameraRig.prefab                # 相机 rig（CinemachineBrain + 背景板）★ 进 git
NewStructureUnity/Assets/Model/Public/Materials/CamBg.mat                   # 背景板材质（跟来源工程的 Assets 相对路径）
NewStructureUnity/Assets/Shaders/Models/CamBgUnlitShader.shadergraph        # 它的自制 ShaderGraph
content/asset-input-controller-report.json                                  # 搬运清单（来源 / 目标 / 字节 / sha256 / 未解析引用）★ 进 git
docs/research/10-input-controller-specs/**                                  # 来源的 14 份行为规格 .md（原文照录，只作对照）
```

- **为什么 rig 不落 `Assets/Resources/`**：本工程首批脚手架已有同名的 `Resources/MainCamera.prefab`（精简相机），
  搬运规矩是**不覆盖同名资产**；"要不要把它换成本工程的主相机"是负责人的决定（`../TODO.md` D-19），不由脚本替人定。
- **代码为什么进 `Core/`**：它和拾取（`Core/Interactive`）同类，是"三维世界怎么响应输入"的**基础设施**，不是某个任务的业务。
- **`.inputactions` 与两个预制体进 git**：都是小体积、要能 diff 评审的东西（判据同 §5.2）。

## 6 门禁（DEC-41 / DEC-66，**已落地**）

| 时机 | 载体 | 检查 |
|---|---|---|
| **提交前** | `.git/hooks/pre-commit`（安装源 `tools/hooks/pre-commit`） | ① 大文件 >10 MB 拦截（DEC-65）；② 业务代码零 `import electron`（DEC-20）；③ **双端契约三方比对**（`tools/check-contracts.mjs`：枚举 + 桥消息类型）；④ **内容数据双份比对**（`tools/check-content-data.mjs`，DEC-82）；⑤ `web` 侧 `typecheck` + `lint` + `format:check` + `test` |
| **合并前** | `.github/workflows/gate.yml` | 上述全部 + `npm run build` + **真浏览器渲染冒烟** + Unity 清单校验（缺席只报告不失败，DEC-79） |

两个比对脚本都**不打开 Unity**：契约侧是纯文本解析 `Assets/Scripts/Contracts/*.cs`（DEC-68），数据侧是直接解析两份 JSON。

## 7 资源加载与打包（DEC-87：三条链路都做）

从被采纳数据与资产的实际形态出发，Unity 侧的资源加载**统一走"包登记表 + 三条链路"**（规则来源见 `../research/09-adopted-content-data.md` §3）：

| 链路 | 用途 | 运行期取件 | 包产物落点 |
|---|---|---|---|
| **AB**（主） | 内容包（一个项目一个包）、UI 包、字体包、相机背景包 | `UnityWebRequestAssetBundle` | `Assets/StreamingAssets/{包名首段}/…` |
| **AA** | 场景（漫游场景）与需要 AA 语义的资源 | `Addressables.LoadAssetAsync / LoadSceneAsync` | `Addressables` 构建产物 |
| **内置** | 全局单例资源（管理器、相机、配置表） | `Resources.Load` | `Assets/Resources/` |

**必须遵守的四条**（踩过的坑，写死）：

1. **一个项目一个内容包**：切任务 = 卸旧项目的包 + 装新项目的包；
2. **实例要登记"实例 → 包"**：卸载包前先销毁该包实例（否则材质变粉），卸载前先失效资源缓存（否则下次取到已销毁对象）；
3. **WebGL 下 `StreamingAssets` 就是 HTTP 路径**：不能加 `file://`，且只能经 `UnityWebRequest` 读；
4. **bundle 文件名一律小写、目录段保持原样** —— 大小写写错在 WebGL / Linux 上直接 404。

**包登记表的落点**：`Resources/Config/` 下的包配置资产 + 一张主清单（运行时与编辑器共用，`Resources` 保证两边取到同一份）。
**包产物的落点**：`Assets/StreamingAssets/`（随构建发布）。

**大资产源文件的落点**（2026-10-13 定）：

| 用途 | 落点 | 谁管 | git |
|---|---|---|---|
| Unity 侧源资产（FBX / 贴图 / 预制体） | `NewStructureUnity/Assets/Models/**` | **Plastic**（Unity 侧渠道） | **忽略**（DEC-57；Unity 要导入就必须放在自己的 `Assets/` 下） |
| Three.js 侧资产（glTF/GLB） | `content/assets/three/**` | git 仓库（不进库） | **忽略**；构建前由流水线拷进 `web/dist/assets/three/` |
| 原理页讲解视频（mp4，DEC-99） | `content/assets/video/**` | git 仓库（不进库） | **忽略**（单段最大 30.57 MB，远超 10 MB 门禁）；构建时拷进 `web/dist/assets/video/`，并附 `_meta/index.json` 清单 |

> 「`content/assets/unity/`」这个早期设想**作废** —— 那会让同一份资产在仓库里出现两次。

**明确的取舍**（见 `../research/09-adopted-content-data.md` §5）：早期定的是**不采用**被采纳工程的第三方表现插件与自制 ShaderGraph，
材质改用 URP 标准光照 + 贴图通道直接映射（BaseColor / Normal / AO-Gloss），画面效果降级但避免把插件依赖拖进来。
⚠️ **这一句已被 `DECISIONS.md` DEC-103 取代一部分**：结构任务（TaskType 8）所需的**自制 ShaderGraph 与 HighlightPlus 已搬入本工程**
（理由与实际画面强依赖它们）；被取代的范围**仅限这一句**，DEC-87 的"三条链路"继续生效。
