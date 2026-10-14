# 设计 12：资源包与 AB 打包流水线

> 读者：AI 与人｜状态：**2026-10-14 落地**（一键打 AB 包已可跑通）｜依据：`../DECISIONS.md` **DEC-87**（三条链路都做）、
> **DEC-103**（三条链路继续生效）、**DEC-108 ~ DEC-110**（本轮落地口径）、`../TODO.md` D-17。
> 上游：目录与程序集分层见 [`03-layout-and-assets.md`](./03-layout-and-assets.md) §7；Unity 手动构建检查清单见
> [`06-unity-manual-build-checklist.md`](./06-unity-manual-build-checklist.md) §3③；厂商产物流水线见 [`05-unity-packaging-pipeline.md`](./05-unity-packaging-pipeline.md)；
> 启动链与"两条就绪"见 [`09-startup-orchestration.md`](./09-startup-orchestration.md)；步骤系统见 [`10-step-system.md`](./10-step-system.md)。

## 1 一句话

**调用方只给"包 id / clip"，不关心走哪条链路** —— 三条链路（内置 / AB / AA）由一张**包登记表**分流，
内容包按"一个项目一个包"打，**一条菜单命令**把它们全部构建出来并落到 `Assets/StreamingAssets/`。

## 2 三条链路的分工（DEC-87，继续生效）

| 链路 | `PackageType` | 用途 | 运行期取件 | 包产物落点 |
|---|---|---|---|---|
| **内置** | `Default` | 全局单例资源（管理器、相机、配置表、高亮 profile） | `Resources.Load` | `Assets/Resources/` |
| **AB**（主） | `AB` | **内容包**（一个项目一个包）；将来的 UI 包 / 字体包 / 相机背景包 | `UnityWebRequestAssetBundle`（WebGL 下 StreamingAssets 就是 HTTP 路径） | `Assets/StreamingAssets/{包名首段}/…` |
| **AA** | `AA` | 场景（漫游）与需要 AA 语义的资源 | `Addressables.LoadAssetAsync / LoadSceneAsync` | `StreamingAssets/aa/[BuildTarget]`（默认 profile 口径，见 §7） |

## 3 包登记表

**落点**：`Assets/Resources/Config/`（运行期与编辑器共用同一份，因为 `Resources` 两边都取得到 —— 这是 DEC-87 的原话）。

| 文件 | 作用 |
|---|---|
| `PackageDB_Master.asset` | **主清单**：`PackageDatabaseSO`，持有全部包配置引用。运行期加载路径是契约：`Resources.Load<PackageDatabaseSO>("Config/PackageDB_Master")` |
| `ContentPackages/AB_{id}.asset` | 内容包的包配置（一个 clip 的资源 → 多条配置） |
| `GlobalPackages/AB_{id}.asset` | 全局包的包配置（`clipId` 留空；今天为空目录，见 §8） |
| `SceneAAConfig.asset` | 场景 AA 路由表（`场景名 → address`；今天为空） |

### 3.1 一条包配置长什么样

`PackageConfigSO`（抽象基类）+ 三个子类，**各自独占一个同名文件**（Unity 只给"文件名 = 类名"的类生成 MonoScript，
同文件时 `CreateAsset` 出来的资产 `m_Script` 会是 `{fileID: 0}`，加载为 null）：

- `ABPackageConfigSO`：`clipId` / `assetKind` / `bundleName` / `assetPath` / `variant`
- `AAPackageConfigSO`：`address` / `labels` / `groupName`
- `DefaultPackageConfigSO`：加载键就是 `id`（即 `Resources` 下的路径）

⚠ **`sourceAsset` 一律留空**：它是直接引用，而配置资产在 `Resources/` 下 —— 一旦引用素材，
Unity 会把素材一并打进 `resources.assets`，资源变两份、AB 白打。所以 AB 流水线只写 `assetPath` / `bundleName` 两个字符串。

⚠ **`assetKind` 必须写准**：运行期按它选泛型加载（`Sprite` 是 `Texture2D` 的子资产，用 `Object` 取只会拿到 `Texture2D`）。

### 3.2 命名规则（唯一来源：`ContentNaming`）

| 名字 | 规则 | 例 |
|---|---|---|
| 项目 id | `clip_` + 器件小驼峰（内容数据里的键值） | `clip_contactor` / `clip_thermalRelay` |
| 器件段 | 去掉 `clip_` 前缀、保持原样 | `contactor` / `thermalRelay` |
| bundle 名 | `Content/` + `clip_` + **器件全小写** | `Content/clip_contactor` |
| 包配置 id | `{器件}_{任务段}_{资源段}` | `contactor_structure_model` |

任务段取 TaskType 枚举名小写：`info` / `structure` / `inspection`；资源段：`model`（预制体）/ `image`（简介图集）。

**bundle 的文件名段必须全小写**：运行期拼 URL 时会把末段强制小写，而工具写盘按原样保留 ——
两者不一致在 Windows 上看不出问题，在 WebGL / Linux 上**必然 404**。目录段（`Content`）保持原样。

## 4 一键打 AB 包

### 4.1 菜单与命令

| 菜单 | 干什么 | 写盘？ |
|---|---|---|
| `WSU3/Pack/一键打 AB 包（全部）` | 全流程：收集 → 校验 → 写包配置 → 同步登记表 → 构建到 `StreamingAssets/` → 出报告 | 是 |
| `WSU3/Pack/对账（dry-run，不写盘）` | 只看：收集 + 校验 + 登记表只读体检，**不改任何文件** | 否 |
| `WSU3/Pack/仅构建（不写配置）` | 配置已在磁盘上时只同步登记表 + 构建（不覆盖人工修正） | 是（构建产物） |
| `WSU3/Pack/仅刷新包登记表` | 全量重收磁盘上的包配置写回主清单，并对残留只读告警 | 是（登记表） |
| `WSU3/Pack/打开 AB 产物目录` | 在资源管理器里打开 `Assets/StreamingAssets/` | 否 |

批处理（不弹任何窗，失败以退出码 1 结束）：

```bash
Unity.exe -batchmode -quit -projectPath NewStructureUnity -buildTarget WebGL \
  -executeMethod WSU3.Editor.BuildTools.BundlePipeline.BuildAllFromBatch -logFile -
```

### 4.2 五步流程

```
① 收集   内容数据（Assets/StreamingAssets/Data/ProjectData.json）逐 clip 跑 Provider
         + 全局包 Provider（今天为空表）
② 校验   bundle 名合法性 / 素材存在性与导入类型 / id 与 bundle 名是否被重复占用
③ 写配置 {Content|Global}Packages/AB_{id}.asset（先按本次产出清残留）
④ 同步   PackageDB_Master（AutoCollect 全量重收 + 本次产出兜底补入 + 回读自检脚本丢失）
⓪ 自愈   **构建前**：预制体材质绑定体检 —— 有空材质槽就强制重导它依赖的 FBX（见 §4.3）
⑤ 构建   一次 BuildAssetBundles → Temp 中转 → 只把 bundle 本体落到 StreamingAssets/{包名首段}/
```

**新增一类内容 = 一个 `IContentProvider` 实现 + 在 `BundlePipeline.ContentProviders` 登记一行**；
**新增一个全局包 = 一个 `IGlobalBundleProvider` 实现 + 在 `GlobalProviders` 登记一行**。两者都不需要改流程。

> 本期 `ContentProviders` 只登记 **结构件模型**（`Assets/Prefabs/Models/StructureObjs`）——
> 简介 / 检测的预制体目录本工程还没有，现在登记它们会让"找不到预制体"变成阻塞构建的 Error。
> 素材搬入后加一行即可（见 `../TODO.md`）。

### 4.3 构建前的材质绑定自愈（2026-10-14 实测踩出来的，不是预防性设计）

**现象**：进结构站后 `timeRelay` / `masterAppliance` 两个器件的模型**全洋红**。

**根因**（与 AB 机制**无关**，是资产状态）：

`timeRelay` / `masterAppliance` 的零件是**嵌套 FBX 模型实例**（外层预制体只存覆盖项，零件本体与材质绑定
住在 FBX 里）。DEC-102/103 的"**材质接管**"把 FBX 自动抽出的同名 `.mat` 换成了本工程搬来的材质 ——
两者 **GUID 不同**，于是 FBX 内部的材质绑定指向一个**已消失的 GUID** ⇒ 实例化后那些
`MeshRenderer.sharedMaterials` 全是 `null` ⇒ 洋红。

**为什么它会"自己回来"**：对症的办法是 `AssetDatabase.ImportAsset(fbx, ForceUpdate)`（重导后绑定归零），
但这个修复**只落在本机 `Library/`（派生数据，不进版本库）** —— 任何一次"不强制"的全量重导都会把它打回去，
最常见的就是**切换 Build Target**。实测：负责人切到 WebGL 之后，`timeRelay` 8 处 / `masterAppliance` 3 处
重新变空；而当时打的 8 个 AB 包把这个状态**原样打进了产物**（包内实测同样是 8/3 处为 null）。
**字节数就是铁证**：出问题时总量 37,464,472，修好后 47,500,295 —— 差的 10 MB 正是这两个器件丢掉的
材质与贴图；而 DEC-108 当时的报告是 47,476,797，几乎一字不差。

**做法**（`Editor/Common/ModelMaterialBindingFixer.cs`）：

| 环节 | 口径 |
|---|---|
| 体检 | `PrefabUtility.LoadPrefabContents` 展开预制体，数"材质为 null **或** 材质 shader 为 null"的槽位 |
| 自愈 | 只在**有坏槽**时才 `ImportAsset(fbx, ForceUpdate)`（幂等；不无谓地触发 importer 警告），FBX 从**依赖树**里取，不按名字猜 |
| 拦不拦 | 修不好 ⇒ **中止构建**，绝不产出洋红产物（"包打好了但模型是粉的"比"没打包"更贵） |
| 菜单 | `WSU3/Pack/修复模型材质绑定（嵌套 FBX）`（只重导 FBX，不改任何资产） |
| 对账 | `对账（dry-run）` 只**告警**不修 —— 那次操作的承诺是"不写盘"，而重导会动 Library |

⚠️ **不要**图省事把体检改成 `AssetDatabase.LoadAssetAtPath<GameObject>()` **直接读预制体资产**：
嵌套实例里的零件在外层 YAML 是 `stripped` 块（没有名字、没有 Transform），那样读**必然全是 null** ——
这正是 DEC-111 记下的教训（"对预制体内容里的物体取 id 实测 16/16 失败"）。
实测两种读法在本工程 8 个预制体上结果完全一致（11/44/8/3/10/61/41/21 个材质槽），所以选了不污染场景的那种。

> ⚠️ **shader 不是这个问题**。曾把 5 个自制 ShaderGraph 挪到 `Assets/Resources/Shaders/` 试图修复 ——
> 实测**无害也无用**：包内仍然各自包含 shader 副本（8 个包的 shader 来源全部是"包内"），
> 因为 shader 是通过"材质 → shader"的依赖被隐式卷进包的。见 `../DECISIONS.md` §26。

### 4.3 三条铁律（都是踩过的坑，别拆）

1. **一次 `BuildAssetBundles` 调用建出全部包**：Unity 的"同一资产被显式分配后不再复制"**只在同一次调用内成立**。
   分成几次构建，被引用的资源会被**复制**进引用方的包（体积翻倍）。因此本流水线不提供"按包逐个构建"的入口。
2. **先构建到 `Temp/`，只把 bundle 本体拷进 `StreamingAssets/`**：`BuildAssetBundles` 会在输出根额外写一个
   "清单 bundle"（名字取自输出目录末段）与配套 `.manifest` —— 直接打到 `StreamingAssets` 会让这些中间物跟着玩家包一起发布。
3. **包粒度 = 一个项目一个包**（DEC-87 纪律①）：切任务 = 卸旧 clip 的包 + 装新 clip 的包；
   残留清理按目录各自进行，且 gate 在"构建成功且产物齐全"之后（失败现场不再动目录）。

### 4.4 产物与版本库

```
Assets/StreamingAssets/Content/clip_<器件小写>        ← 8 个内容包（无扩展名的 bundle 本体）
Builds/assetbundles/ab-build-report.json             ← 构建报告（不进版本库）
```

- AB 产物是**构建产物、可一键重建**，因此**不进版本库**：`ignore.conf` 已加
  `**/Assets/StreamingAssets/Content` 与 `Content.meta`（大小写两套，Plastic 的忽略匹配区分大小写）。
  ⚠ **新增别的"包名首段"时要同步补规则**（例如将来加 `UI/`、`CameraBg/`）。
- 包配置资产与主清单是**源**（小体积、要能 diff 评审），**要提交**。
- 产物随 WebGL 玩家包一起发布（`StreamingAssets` 会被原样拷进构建目录），所以第三方流水线
  `tools/pipeline/unity-stage.mjs` **不需要** `--extra`。

### 4.5 构建报告

`Builds/assetbundles/ab-build-report.json`：`buildTarget` / 每个包的字节数与资源清单 / `missing` / `removed` / `warnings`。
它回答的是"这次到底打出了什么"—— 与 `docs/design/05` 的发布清单是同一套思路（可查询、可留档）。

> **⚠️ 目标平台**：AB 与构建目标绑定（为本机平台打的包在 WebGL 里加载不了，反之亦然）。
> 流水线按 `EditorUserBuildSettings.activeBuildTarget` 构建；**不是 WebGL 时会在 Console 里给出显式告警**
> （交付形态是 WebGL，DEC-12）。

## 5 运行期：`AddressableManager`

`Assets/Scripts/Core/Managers/FunctionManager/AddressableManager.cs` —— 由 `GlobalManager` 持有并驱动
（`Init` 建表 + `CoreUpdate` 推进自驱泵），**不是 MonoBehaviour**：与 `TaskFlowManager` / 步骤系统同一套写法，
好处是 EditMode 测试能一帧帧手动推。

### 5.1 接口面

| 类别 | 成员 |
|---|---|
| 登记表查询 | `GetConfig` / `TryGetConfig` / `HasConfig` / `GetConfigsByClip` / `GetConfigsByBundleName` / `GetClipIds` / `HasClip` |
| 装载 / 卸载 | `LoadClipRoutine(clipId, onDone)` / `UnloadClip(clipId)` / `UnloadByBundleName` / `UnloadBundle` / `UnloadAllBundles` |
| 取件 | `LoadAsset<T>`（同步：只服务内置与**已装好**的 AB）/ `LoadAssetAsync<T>` / `LoadAssetsAsync<T>` / `LoadAssetRoutine<T>`（可 `yield return`） |
| 实例化 | `InstantiatePrefab(prefab, packageId, parent)` / `InstantiateAsync` / `ReleaseInstance` / `DestroyInstances` / `DestroyAllInstances` |
| 实例登记 | `InstanceCount`（取之前先清掉被外部销毁的空槽） |
| 场景 AA | `IsSceneAA` / `GetSceneAddress` / `LoadSceneAsync` / `UnloadSceneAsync` |
| 诊断 | `ConfigCount` / `SceneRouteCount` / `LoadedBundleCount` / `Busy` |
| 工具 | `GetBundleUrl(bundleName)`（静态，纪律③④的落点） |

`LoadAsset<T>` **同步取件不服务 AA**：AA 天生异步，同步返回只会给出"看起来成功、其实是 null"的结果，
故那一条路径会明确报错并指路异步入口。

### 5.2 装卸时序（已接进任务流）

`TaskFlowManager` 的 `scene:enter` / `scene:exit` 已真正装包卸包（`docs/design/09` §3 的那条链）：

```
scene:enter {taskType, projectId}
  ├─ ① 装包：登记表里 HasClip(projectId) → LoadClipRoutine(projectId)
  │        失败（9002, fatal=true）→ 中止，**不发** scene:ready（界面不能以为可交互）
  │        登记表里没有该 clip（9001, fatal=false）→ 只提示，仍走到 scene:ready（Web 联调不受影响）
  ├─ ② assets:ready
  ├─ ③ 装配：GlobalManager.SetCurrentTask(clipId, taskType) → 按 taskType 分派 AssemblyRoutine
  │        Structure → StructureTaskManager.StartTaskRoutine(clipId)
  └─ ④ scene:ready

scene:exit
  ├─ ① 先销毁本次任务装配出来的实例（StructureTaskManager.StopTask）
  ├─ ② 再卸包（UnloadClip）+ SetCurrentTask(null, None)
  └─ ③ scene:exited（**引擎实例不销毁**，DEC-81）
```

**顺序不能反**：先卸包会让存活实例的材质引用到已释放资源（变粉）—— 这就是 DEC-87 纪律②。

### 5.2b WebGL 的取包路径**故意与其它平台不同**（2026-10-14，DEC-116）

```csharp
#if UNITY_WEBGL && !UNITY_EDITOR
    UnityWebRequest.Get(url) + AssetBundle.LoadFromMemoryAsync(bytes)     // ← WebGL 走这条
#else
    UnityWebRequestAssetBundle.GetAssetBundle(url)                        // ← 其它平台
#endif
```

**为什么**：`UnityWebRequestAssetBundle.GetAssetBundle` 在 WebGL 上走"IndexedDB 缓存 + `DownloadHandlerAssetBundle`"，
**缓存键就是 URL** —— 同一个地址换过几次包之后会命中旧条目而加载失败，而且 `request.error` 可能是**空串**。
实测现场（真 WebGL 产物 + VS Code Live Server）：

| 探针 | 结果 |
|---|---|
| 运行日志 `AB 下载失败：Content/clip_contactor ← http://127.0.0.1:5500/StreamingAssets/Content/clip_contactor（）` | 原因字段是**空的** |
| 同一 URL 的 HTTP 探针 | **200**，`Content-Length 4201911` 与工程里的包逐字节一致，`Accept-Ranges: bytes`，Range → **206** |
| 把同一份字节下回编辑器解包 | **UnityFS 合法**，`LoadFromMemory` → 资产名 / 预制体逐级可读 |

⇒ 坏的是**那条缓存路**，不是包、不是服务器、也不是 shader。改成"普通 GET + `LoadFromMemoryAsync`"：
不碰任何缓存，字节到手直接解包；顺带去掉"`using` 把 request 释放掉、而 bundle 归 handler 所有"这层归属歧义。
同时两处的失败日志都补上了 `result` / `http` / `err` 三个字段 —— 只打 `request.error` 会退化成一句没有原因的 `（ ）`。

> ⚠️ 若将来需要"包缓存在浏览器里、换版本只下差异"，要显式设计（带版本号的 URL + 自己管缓存），
> 而不是回头依赖这条默认路径。

### 5.3 实例登记与卸载纪律（DEC-87 纪律②）

- 经本管理器实例化的对象都记在"实例 → 包 id"表里；
- 卸载包**之前**先销毁该包的全部实例（`DestroyInstances` 由 `UnloadBundle(..., true)` 串起来）；
- 卸载**之前**先失效资源缓存（`InvalidateCache`）—— 否则下次取件会拿到已销毁对象；
- AA 取件**留住 handle** 并在失效时 `Addressables.Release`（只留 `Result`、丢 handle，那份资源永远释放不掉）；
- 场景 handle 单独留一份，卸载时连包一起释放。

## 6 任务装配：结构任务（TaskType 8）

`StructureTaskManager` 是**内容场景里的节点**（`1_Content` 下的 `StructureTaskManager`），
由 `TaskFlowManager` 的泵 `yield return` 驱动（它自己不开协程）：

1. 按 `prefabKey` 要包 —— 内容数据里有 `prefabKey` 就以它为准，否则按命名规则推导
   （`clip_contactor` → `contactor_structure_model`，两条路得到同一个字符串，不会漂）；
2. `LoadAssetRoutine<GameObject>` 取预制体 → `InstantiatePrefab`（登记实例归属）→ 挂到**结构件挂载根**；
3. `GetComponentInChildren<StepManager>()` → 有就 `StartExecution()`；**没有就只实例化、不假装跑流程**，
   并把原因写在 Console 里。**8 个结构件预制体现在都带 46 步子树**（DEC-111，见 `10-step-system.md` §7），
   所以这条告警只在"手里的包是旧的"时才会出现 —— ⚠️ 预制体在 2026-10-14 晚变过，**这 8 个包要重打**（`../TODO.md` D-23）。

**挂载根**（`DataStructMapping.GetStructureRoot`）：场景里已有 `StructureRoot` 节点就用它，
没有就运行期在管理器节点下建一个 —— 工具不替人改场景文件（场景由负责人在编辑器里装配），
运行期建节点是幂等、可回退的。

## 7 AA 链路

菜单在 `WSU3/Pack/Addressables/` 下：**初始化设置与默认分组** / **同步场景分组（按 `SceneAAConfig`）** /
**构建 AA 内容** / **清理场景分组**。

- 设置用官方 API 建（`AddressableAssetSettingsDefaultObject.GetSettings(true)`），落 `Assets/AddressableAssetsData/`；
- 走 AA 的场景**必须从 Build Settings 移除** —— 两边都留会让同一份场景既被打进玩家包又被 AA 当内容带着（包体翻倍），
  而且运行时不知道该用哪一份；
- **内容位置**（`docs/design/06` §3③ 最大的坑）在本工程的结论是：**默认 profile 就已经对**
  —— `Local.LoadPath` 解析到 `StreamingAssets/aa/[BuildTarget]`，也就是"内容随玩家包一起走"。
  但这是**读数不是假设**：工具会把当前生效的 profile 路径打到 Console，改了 profile 一眼能看出漂了。
- 本期的 AA 资源是 **0 条**（漫游场景还没做，`../PLAN.md` P2-6c），所以这三个菜单今天只完成"设置与默认分组"，
  场景分组是一个明确的空操作（弹窗说明原因，不假装做了什么）。

## 8 明确没做 / 未闭合

1. **全局包一个都没登记**：Unity 侧不做界面（DEC-80）⇒ 没有 UI 包与字体包；
   相机背景板的取图入口还没接（`../TODO.md` D-20）⇒ 没有背景包。抽象与流程已就位，登记表留空是**如实**状态。
2. **简介 / 检测的内容 Provider 未登记**：对应素材目录本工程还没有。
3. **`ServerData/` 这套"内容跑到构建目录之外"的老路径本工程不会出现**：AB 走 `StreamingAssets`，
   AA 走默认 profile；`tools/pipeline/unity-stage.mjs` 的 `--extra` 在本工程用不上（留着不影响）。
4. **没有包体预算门禁**：8 个内容包合计 **47.5 MB**（构建报告里有逐包字节），
   12 MB 反射 cubemap 被卷进 4 个金属材质所在包的依赖里 —— 预算核算见 `../TODO.md` D-10。
5. **步骤数据已落地**（DEC-111，见 `10-step-system.md` §7）：8 个结构件预制体自带 **46 步** `StepManager` 子树
   （由 `StructureStepGenerator` 从只读来源工程生成、幂等可重跑），**且这 8 个包已按新预制体重打**（`../TODO.md` D-23 已关闭）。
6. **结构件的相机 / 交互闸门 / 高亮初始化未接**（`../TODO.md` D-13）：比"实例化"更靠后的那一段。
7. **材质绑定的自愈是"事后补救"而非"根治"**：根因是"材质接管"换了 GUID 导致 FBX 内部绑定悬空（§4.3）。
   根治要改成**不替换** FBX 自动抽出的材质（只改它的 shader 与属性、保住 GUID）—— 那是一次导入链重做，未做。
8. **真 WebGL 构建里还验过一次 shader 变体**：本次只在**编辑器**里逐包证实"材质与 shader 都解析得到"
   （8 个包、199 处引用、0 处为 null）。构建后是否因变体裁剪而洋红，要真产物才说得准 —— 见 `../TODO.md` D-24。

## 9 落点速查（本次新增/改动）

| 路径 | 作用 |
|---|---|
| `NewStructureUnity/Assets/Scripts/Core/Models/Addressable/*.cs` | 包登记表数据模型（9 个文件：类型 / 命名规则 / 基类与三子类 / 主清单 / 场景路由） |
| `NewStructureUnity/Assets/Scripts/Core/Managers/FunctionManager/AddressableManager.cs` | 运行期：三条链路 + 按 clip 装卸 + 实例登记 |
| `NewStructureUnity/Assets/Scripts/Core/Managers/FunctionManager/TaskFlowManager.cs` | 装/卸包与装配分派接线（9001 语义保留、新增 9002） |
| `NewStructureUnity/Assets/Scripts/Core/Managers/TaskManager/StructureTaskManager.cs` | 结构件实例化 + 步骤驱动 |
| `NewStructureUnity/Assets/Scripts/Core/Managers/GlobalManager.cs` | 驱动 `AddressableManager.CoreUpdate`；`SetCurrentTask` / `CurrentClipId` |
| `NewStructureUnity/Assets/Scripts/Core/Managers/FunctionManager/SceneManager.cs` | 场景 AA 分流（保持"唯一场景 API 入口"这条口径） |
| `NewStructureUnity/Assets/Scripts/Core/DataStruct/DataStructMapping.cs` | 结构件挂载根 |
| `NewStructureUnity/Assets/Editor/Common/*.cs` | 打包内核：路径常量 / 资产工具 / `BundleBuilder` / 包配置写入 / 登记表同步 / **材质绑定自愈（`ModelMaterialBindingFixer`，§4.3）** |
| `NewStructureUnity/Assets/Editor/BuildTools/BundlePipeline.cs` | **一键**编排 + 菜单 + 构建报告 |
| `NewStructureUnity/Assets/Editor/BuildTools/ContentProviders/*.cs` | 内容包 Provider 契约 + 通用实现 + 内容数据读取 |
| `NewStructureUnity/Assets/Editor/BuildTools/GlobalProviders/IGlobalBundleProvider.cs` | 全局包契约（扩展点） |
| `NewStructureUnity/Assets/Editor/BuildTools/SceneAddressableTools.cs` | AA 设置 / 分组 / 场景注册 / 内容构建 |
| `NewStructureUnity/Assets/Resources/Config/**` | 包登记表（**要提交**） |
| `NewStructureUnity/Assets/AddressableAssetsData/**` | AA 设置与默认分组（**要提交**；`*.bin*` 已在 `ignore.conf` 里排除） |
| `NewStructureUnity/Assets/StreamingAssets/Content/**` | AB 产物（**不进版本库**，`ignore.conf` 已加规则） |
