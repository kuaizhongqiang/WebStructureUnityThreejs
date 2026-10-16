# 设计 12：资源包与内容打包流水线

> 读者：AI 与人｜状态：**2026-10-14 晚重写**（全量迁 Addressables，DEC-118）｜依据：`../DECISIONS.md`
> **DEC-87**（链路分流）、**DEC-108 ~ DEC-110**（落地口径）、**DEC-115**（材质绑定自愈）、
> **DEC-116**（旧 AB 的 WebGL 取包路径，**已随迁 AA 作废**，见 §10）、**DEC-117**（编辑器洋红的定案）、
> **DEC-118**（全量迁 AA）、`../TODO.md` D-17 / D-23 / D-24。
> 上游：目录与程序集分层见 [`03-layout-and-assets.md`](./03-layout-and-assets.md) §7；Unity 手动构建检查清单见
> [`06-unity-manual-build-checklist.md`](./06-unity-manual-build-checklist.md) §3③；厂商产物流水线见 [`05-unity-packaging-pipeline.md`](./05-unity-packaging-pipeline.md)；
> 启动链与"两条就绪"见 [`09-startup-orchestration.md`](./09-startup-orchestration.md)；步骤系统见 [`10-step-system.md`](./10-step-system.md)。
>
> **本文件在 2026-10-14 晚被重写**：原稿标题是"资源包与 **AB** 打包流水线"，正文按"内容包走 AB、漫游场景走 AA"写。
> 现在内容也全走 AA（DEC-118），故按"两条链路 + 一个内容流水线"重写；**旧 AB 链路的历史结论保留在 §10**，
> 不删（那些是踩过的坑，将来若有人想退回手写 AB 会用到）。
>
> ⚠️ **文件名还叫 `12-resource-packs-and-ab-build.md`**：改名会连带改大量文档内链，收益不抵风险，
> 故只改标题与正文。看到文件名里的 "ab-build" 以本注为准。

## 1 一句话

**调用方只给"包 id / clip"，不关心走哪条链路** —— 两条链路（内置 / AA）由一张**包登记表**分流；
内容包按"一个项目一个组"打，模型材质单独进**共享组**先装，**一条菜单命令**把它们全部构建出来。

## 2 两条链路的分工

| 链路 | `PackageType` | 用途 | 运行期取件 | 包产物落点 |
|---|---|---|---|---|
| **内置** | `Default` | 全局单例资源（管理器、相机、配置表、高亮 profile） | `Resources.Load` | `Assets/Resources/` |
| **AA** | `AA` | **内容包**（一个项目一组）+ 模型**共享材质组** + 场景（漫游）+ 将来的 UI / 字体 / 背景包 | `Addressables.LoadAssetAsync / LoadSceneAsync` | 构建落 `Library/com.unity.addressables/aa/<平台>/`；Build Player 时由 Addressables 自动拷进 `Assets/StreamingAssets/aa/<平台>/` |

> **为什么删掉了 `AB` 那条**（DEC-118）：它和 AA 底层是**同一条**（AA 也是 `BuildAssetBundles` 产物），
> 却要多养一套"手拼 URL + 手管 `bundle.Unload` + 保证文件名段小写"的纪律；
> 而 AA 多给的 **Play Mode Script**（编辑器 Play 直取 AssetDatabase、不碰 bundle）正好解掉了 DEC-117 的死结。
> **注意：迁 AA 不是为了治洋红**——AA 治不了洋红（同一条底层，见 §10.1）。

## 3 包登记表

**落点**：`Assets/Resources/Config/`（运行期与编辑器共用同一份，因为 `Resources` 两边都取得到 —— 这是 DEC-87 的原话）。

| 文件 | 作用 |
|---|---|
| `PackageDB_Master.asset` | **主清单**：`PackageDatabaseSO`，持有全部包配置引用。运行期加载路径是契约：`Resources.Load<PackageDatabaseSO>("Config/PackageDB_Master")` |
| `ContentPackages/AA_{id}.asset` | 内容包 / 共享材质包的包配置（一个 clip 的资源 → 一条配置；共享组 → 一条组级配置） |
| `GlobalPackages/AA_{id}.asset` | 全局包的包配置（`clipId` 留空；今天为空目录，见 §9） |
| `SceneAAConfig.asset` | 场景 AA 路由表（`场景名 → address`；今天为空） |

### 3.1 一条包配置长什么样

`PackageConfigSO`（抽象基类）+ 两个子类，**各自独占一个同名文件**（Unity 只给"文件名 = 类名"的类生成 MonoScript，
同文件时 `CreateAsset` 出来的资产 `m_Script` 会是 `{fileID: 0}`，加载为 null）：

- `AAPackageConfigSO`：`address` / `labels` / `groupName` + **`clipId`**（内容包按它聚合）+ **`assetKind`**
  —— 后两个字段是从已删除的 `ABPackageConfigSO` 搬过来的；
- `DefaultPackageConfigSO`：加载键就是 `id`（即 `Resources` 下的路径）。

⚠ **`sourceAsset` 一律留空**：它是直接引用，而配置资产在 `Resources/` 下 —— 一旦引用素材，
Unity 会把素材一并打进 `resources.assets`，资源变两份、AA 白打。所以流水线只写 `address` / `groupName` / `assetPath`。

⚠ **`assetKind` 必须写准**：运行期按它选泛型加载（`Sprite` 是 `Texture2D` 的子资产，用 `Object` 取只会拿到 `Texture2D`）。

⚠ **`id` 会变成文件名**（`AA_{id}.asset`）⇒ **不能带 `/`**。共享材质组的条目里 `id`（`configId`）与 `address`
**分开取值**正是为此：`id` 要文件名安全、`address` 只是 catalog 里的字符串。
（实测：`AA_shared_material/ACContactor.asset` 会直接抛 `Creating asset at path … failed`。）

### 3.2 命名规则（唯一来源：`ContentNaming`）

| 名字 | 规则 | 例 |
|---|---|---|
| 项目 id | `clip_` + 器件小驼峰（内容数据里的键值） | `clip_contactor` / `clip_thermalRelay` |
| 器件段 | 去掉 `clip_` 前缀、保持原样 | `contactor` / `thermalRelay` |
| **分组名** | `WSU3_` + `clip_` + 器件（**一个 clip 一个组**） | `WSU3_clip_contactor` |
| **共享组名** | `WSU3_Shared` | `WSU3_Shared` |
| **共享组地址** | `shared_model_materials`（**契约**：运行期靠它先装材质） | `shared_model_materials` |
| 包配置 id | `{器件}_{任务段}_{资源段}` | `contactor_structure_model` |

任务段取 TaskType 枚举名小写：`info` / `structure` / `inspection`；资源段：`model`（预制体）/ `image`（简介图集）。

> **迁 AA 后少了一条纪律**：AB 时代"bundle 文件名段必须全小写，否则 WebGL / Linux 上必然 404"这条**不再需要** ——
> AA 的 address 与分组名是 catalog 里的字符串，不经文件系统。故 `ContentNaming` 里删掉了
> `BundleNameFor` / `IsBundleFileNameLowerCase` / `BundleDirSegmentOf`。
> 新增 `IsManagedGroup(name)`：清理残留只动 `WSU3_` 前缀，**绝不碰别人手工建的分组**。

## 4 一键打 AA 包

### 4.1 菜单与命令

| 菜单 | 干什么 | 写盘？ |
|---|---|---|
| `WSU3/Pack/一键打 AA 包（全部）` | 全流程：收集 → 校验 → 写包配置 → 同步登记表 → 注册分组 → 构建 | 是 |
| `WSU3/Pack/对账（dry-run，不写盘）` | 只看：收集 + 校验 + 登记表只读体检 + **地址漂移检查**，**不改任何文件** | 否 |
| `WSU3/Pack/仅构建（不写配置）` | 配置已在磁盘上时只同步登记表 + 注册 + 构建（不覆盖人工修正） | 是（构建产物） |
| `WSU3/Pack/仅刷新包登记表` | 全量重收磁盘上的包配置写回主清单，并对残留只读告警 | 是（登记表） |
| `WSU3/Pack/打开 AA 产物目录` | 在资源管理器里打开 `Library/com.unity.addressables/aa/` | 否 |

批处理（不弹任何窗，失败以退出码 1 结束）：

```bash
Unity.exe -batchmode -quit -projectPath NewStructureUnity -buildTarget WebGL \
  -executeMethod WSU3.Editor.BuildTools.ContentPipeline.BuildAllFromBatch -logFile -
```

脚本化入口（**不弹窗**，供编辑器内自动化 / MCP 验证用 —— 弹窗会卡住调用方）：
`ContentPipeline.BuildAllNonInteractive()`。

### 4.2 五步流程

```
① 收集   内容数据（Assets/StreamingAssets/Data/ProjectData.json）逐 clip 跑 Provider
         + 全局包 Provider（今天为空表）
② 校验   分组名合法性 / 素材存在性与导入类型 / id 是否被重复占用 / **id 是否文件名安全**
③ 写配置 {Content|Global}Packages/AA_{id}.asset（先按本次产出清残留 + 清 AB 时代的旧配置）
④ 同步   PackageDB_Master（AutoCollect 全量重收 + 本次产出兜底补入 + 回读自检脚本丢失）
⓪ 自愈   **构建前**：预制体材质绑定体检 —— 有空材质槽就强制重导它依赖的 FBX（见 §4.4）
⑤ 构建   注册进 AA 分组（共享组 + 每 clip 一组）→ 一次 BuildPlayerContent
```

**新增一类内容 = 一个 `IContentProvider` 实现 + 在 `ContentPipeline.ContentProviders` 登记一行**；
**新增一个全局包 = 一个 `IGlobalBundleProvider` 实现 + 在 `GlobalProviders` 登记一行**。两者都不需要改流程。

> 本期 `ContentProviders` 只登记 **结构件模型**（`Assets/Prefabs/Models/StructureObjs`）——
> 简介 / 检测的预制体目录本工程还没有，现在登记它们会让"找不到预制体"变成阻塞构建的 Error。
> 素材搬入后加一行即可（见 `../TODO.md`）。

### 4.3 共享材质组：**先装材质，再装内容**

`ContentPipeline` 除了每 clip 一组，还会**多推一个 `WSU3_Shared` 组**，成员从各内容预制体的
**依赖树**里爬出来（`AssetDatabase.GetDependencies`，滤 `.mat`）—— 而不是新加一个 Provider：
材质是模型预制体的依赖，不在内容数据里单独声明（内容数据只写 `prefabKey`）。

| 为什么 | 说明 |
|---|---|
| **装载顺序确定** | `AddressableManager.LoadClipRoutine` 先装 `shared_model_materials` 再装该 clip 的内容包（DEC-118 纪律③） |
| **避免重复** | AA 里**一个资源只能属于一个组**（`CreateOrMoveEntry` 会把资源**移**过来）⇒ 同一份材质天然不会在 8 个 clip 组里各存一份 |
| **实测收益** | AB 时代 `clip_contactor` 包 4,201,911 B → AA 时代 **1,441,813 B**；材质集中进 `wsu3_shared`（32,921,147 B）只下一次 |

**共享组的两条地址**：
1. **组级配置**（`configId = address = shared_model_materials`，代表素材 = 列表里的第一份材质）；
2. 每份材质各自的 `shared_material/{材质名}`。

⚠ **组级配置必须"先"注册**：AA 的 entry 由 **GUID** 定位，第二次 `entry.address = …` 会**静默覆盖**第一次。
先注册组级配置 ⇒ 那份"代表材质"同时持有两个地址（两个 key 指向同一 entry）；反过来则组级地址会消失，
运行期报 `InvalidKeyException: No Location found for Key=shared_model_materials`（实测踩过）。
`AaContentBuilder` 里为此加了同组 GUID 去重：重复的只记一条 Log 并跳过（**预期内取舍，不是错误**）。

### 4.4 构建前的材质绑定自愈（2026-10-14 实测踩出来的，不是预防性设计）

**现象**：进结构站后 `timeRelay` / `masterAppliance` 两个器件的模型**全洋红**。

**根因**（与打包机制**无关**，是资产状态）：

`timeRelay` / `masterAppliance` 的零件是**嵌套 FBX 模型实例**（外层预制体只存覆盖项，零件本体与材质绑定
住在 FBX 里）。DEC-102/103 的"**材质接管**"把 FBX 自动抽出的同名 `.mat` 换成了本工程搬来的材质 ——
两者 **GUID 不同**，于是 FBX 内部的材质绑定指向一个**已消失的 GUID** ⇒ 实例化后那些
`MeshRenderer.sharedMaterials` 全是 `null` ⇒ 洋红。

**为什么它会"自己回来"**：对症的办法是 `AssetDatabase.ImportAsset(fbx, ForceUpdate)`（重导后绑定归零），
但这个修复**只落在本机 `Library/`（派生数据，不进版本库）** —— 任何一次"不强制"的全量重导都会把它打回去，
最常见的就是**切换 Build Target**。实测：负责人切到 WebGL 之后，`timeRelay` 8 处 / `masterAppliance` 3 处
重新变空；而当时打的 8 个包把这个状态**原样打进了产物**（包内实测同样是 8/3 处为 null）。
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
> 实测**无害也无用**：包内仍然各自包含 shader 副本。见 `../DECISIONS.md` §26。

> ⚠️ **"编辑器里看到洋红"也不等于这个问题** —— 那是另一个机制（WebGL bundle 在编辑器里必然回退 error shader），
> 见 §10.1 与 DEC-117。**两者现象相同、根因完全不同**，别混。

### 4.5 三条铁律（都是踩过的坑，别拆）

1. **一次构建产出全部组**：AA 的 `BuildPlayerContent` 本就是全局操作，天然满足
   （AB 时代那条"必须一次 `BuildAssetBundles`，否则被引用资源会被复制进引用方的包"同理，只是现在不用自己守）。
2. **共享材质单独成组**（§4.3）：既保证装载顺序，又避免重复。
3. **包粒度 = 一个项目一个组**（DEC-87 纪律①）：切任务 = 卸旧 clip + 装新 clip；
   残留清理只清 `WSU3_` 前缀的组与组内条目。

### 4.6 产物与版本库

```
Library/com.unity.addressables/aa/<平台>/          ← AA 构建产物（bundle + catalog.json + settings.json）
Assets/StreamingAssets/aa/<平台>/                  ← Build Player 时由 Addressables 自动拷入（随玩家包发布）
Builds/assetbundles/aa-build-report.json           ← 构建报告（不进版本库）
```

- AA 产物是**构建产物、可一键重建**，**不进版本库**（`ignore.conf` 已覆盖 `**/assets/streamingassets/*/aa/*`）；
  `Assets/AddressableAssetsData/<平台>/`（AA 构建输出）同样不入库。
- **`Assets/AddressableAssetsData/**` 是"源"、必须提交**：AA 的设置、分组、各分组的 schema 都住在那里
  （settings + `AssetGroups/*.asset` + `AssetGroups/Schemas/*.asset`），丢了这个整条 AA 配置就没了。
- 包配置资产与主清单是**源**（小体积、要能 diff 评审），**要提交**。
- 产物随 WebGL 玩家包一起发布（`StreamingAssets` 会被原样拷进构建目录），所以第三方流水线
  `tools/pipeline/unity-stage.mjs` **不需要** `--extra`。

> ⚠️ **最容易误判的一条**：只调 `BuildPlayerContent()` 时 **`Assets/StreamingAssets/aa` 是空的**，
> 包都在 `Library/com.unity.addressables/aa/<平台>/` 下 —— **这是设计如此**，不是失败。
> 拷进 StreamingAssets 那一步是 `AddressablesPlayerBuildProcessor` 在 **Build Player** 时做的。
> 所以"有没有产出"必须查 `Library` 那个目录（`AaContentBuilder.SnapshotBundles` 就是这么判的）。

### 4.7 构建报告

`Builds/assetbundles/aa-build-report.json`：`buildTarget` / `groupCount` / `entryCount` / `totalBytes` /
每个组的资源清单 / `warnings`。它回答的是"这次到底打出了什么"——
与 `docs/design/05` 的发布清单是同一套思路（可查询、可留档）。

> **⚠️ 目标平台**：AA 内容与构建目标绑定（为本机平台打的包在 WebGL 里加载不了，反之亦然）。
> 流水线按 `EditorUserBuildSettings.activeBuildTarget` 构建；**不是 WebGL 时会在 Console 里给出显式告警**
> （交付形态是 WebGL，DEC-12）。

> **⚠️ 判成败不能读 `BuildPlayerContent()` 的返回值**：它在不少版本里返回 `void`，反射拿到 `null` 会被误判成失败
> （实测：日志写着 `Addressable content successfully built (duration : 0:00:23)`，流水线却报失败、体积报 0.00 MB）。
> 同理"**这次没有新增文件**"也不等于失败 —— 什么都没改就重跑时 Addressables 会做一次 **no-op 重建**
> （实测 4.7 秒、bundle 哈希不变）。**判据是"输出目录里有 bundle"**，新增数只作"是否真重建过"的参考。

## 5 运行期：`AddressableManager`

`Assets/Scripts/Core/Managers/FunctionManager/AddressableManager.cs` —— 由 `GlobalManager` 持有并驱动
（`Init` 建表 + `CoreUpdate` 推进自驱泵），**不是 MonoBehaviour**：与 `TaskFlowManager` / 步骤系统同一套写法，
好处是 EditMode 测试能一帧帧手动推。

### 5.1 接口面

| 类别 | 成员 |
|---|---|
| 登记表查询 | `GetConfig` / `TryGetConfig` / `HasConfig` / `GetConfigsByClip` / `GetSharedConfig` / `GetClipIds` / `HasClip` |
| 装载 / 卸载 | `LoadClipRoutine(clipId, onDone)`（**先装共享材质包**）/ `UnloadClip(clipId)` / `UnloadAllBundles` |
| 取件 | `LoadAsset<T>`（同步：**只服务内置**）/ `LoadAssetAsync<T>` / `LoadAssetsAsync<T>` / `LoadAssetRoutine<T>`（可 `yield return`） |
| 实例化 | `InstantiatePrefab(prefab, packageId, parent)` / `InstantiateAsync` / `ReleaseInstance` / `DestroyInstances` / `DestroyAllInstances` |
| 实例登记 | `InstanceCount`（取之前先清掉被外部销毁的空槽） |
| 场景 AA | `IsSceneAA` / `GetSceneAddress` / `LoadSceneAsync` / `UnloadSceneAsync` |
| 诊断 | `ConfigCount` / `SceneRouteCount` / `LoadedBundleCount`（= 已留住 handle 的包数）/ `Busy` |

`LoadAsset<T>` **同步取件不服务 AA**：AA 天生异步，同步返回只会给出"看起来成功、其实是 null"的结果，
故那一条路径会明确报错并指路异步入口。

### 5.2 装卸时序（已接进任务流）

`TaskFlowManager` 的 `scene:enter` / `scene:exit` 已真正装包卸包（`docs/design/09` §3 的那条链）：

```
scene:enter {taskType, projectId}
  ├─ ① 装包：登记表里 HasClip(projectId) → LoadClipRoutine(projectId)
  │        内部先装共享材质包 shared_model_materials，再装该 clip 的内容包
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
**共享材质包不随 clip 卸载**：它被多个 clip 共用，跟着某个 clip 走会把别的 clip 的材质一起带掉；
它常驻到 `UnloadAllBundles` / `OnDespose`。

### 5.3 实例登记与卸载纪律（DEC-87 纪律②）

- 经本管理器实例化的对象都记在"实例 → 包 id"表里；
- 卸载包**之前**先销毁该包的全部实例（`DestroyInstances`，由 `UnloadClip` 串起来）；
- 卸载**之前**先失效资源缓存（`InvalidateCache`）—— 否则下次取件会拿到已销毁对象；
- AA 取件**留住 handle** 并在失效时 `Addressables.Release`（只留 `Result`、丢 handle，那份资源永远释放不掉）；
- 场景 handle 单独留一份，卸载时连包一起释放。

## 6 从源码到真产物的完整链路（三步，别漏第三步）

```
① 打内容包   WSU3/Pack/一键打 AA 包（全部）
             → Library/com.unity.addressables/aa/<平台>/（bundle + catalog）
② Build Player（Unity：File → Build Settings → WebGL）
             → AddressablesPlayerBuildProcessor 把 ① 拷进 Assets/StreamingAssets/aa/<平台>/
             → 随玩家包一起进构建目录
③ 起服务器   Live Server / 产物目录（StreamingAssets/aa/<平台>/ 就是 HTTP 路径）
```

⚠️ **只做 ① 不做 ② ⇒ 产物里没有 aa 内容**，运行期必然取件失败。这是迁 AA 之后最容易漏的一步。
⚠️ 本地静态服务器（VS Code Live Server）不附 `Content-Encoding`，所以自测期要用
`ProjectSettings → webGLCompressionFormat = Disabled`（**不是交付值**，见 `06` §7）。

## 7 任务装配：结构任务（TaskType 8）

`StructureTaskManager` 是**内容场景里的节点**（`1_Content` 下的 `StructureTaskManager`），
由 `TaskFlowManager` 的泵 `yield return` 驱动（它自己不开协程）：

1. 按 `prefabKey` 要包 —— 内容数据里有 `prefabKey` 就以它为准，否则按命名规则推导
   （`clip_contactor` → `contactor_structure_model`，两条路得到同一个字符串，不会漂）；
2. `LoadAssetRoutine<GameObject>` 取预制体 → `InstantiatePrefab`（登记实例归属）→ 挂到**结构件挂载根**；
3. `GetComponentInChildren<StepManager>()` → 有就 `StartExecution()`；**没有就只实例化、不假装跑流程**，
   并把原因写在 Console 里。**8 个结构件预制体现在都带步骤子树**（DEC-111 + DEC-119/120 的改动，
   见 `10-step-system.md` §7），所以这条告警只在"手里的包是旧的"时才会出现。
   ⚠️ **凡改了预制体都要重打内容包**（`../TODO.md` D-23）—— 编辑器 Play 走 AA fast mode 读 AssetDatabase 会立刻生效，
   **真产物不会**。

**挂载根**（`DataStructMapping.GetStructureRoot`）：场景里已有 `StructureRoot` 节点就用它，
没有就运行期在管理器节点下建一个 —— 工具不替人改场景文件（场景由负责人在编辑器里装配），
运行期建节点是幂等、可回退的。

## 8 AA 设置与场景分组

菜单在 `WSU3/Pack/Addressables/` 下：**初始化设置与默认分组** / **同步场景分组（按 `SceneAAConfig`）** /
**构建 AA 内容** / **清理场景分组**。

- 设置用官方 API 建（`AddressableAssetSettingsDefaultObject.GetSettings(true)`），落 `Assets/AddressableAssetsData/`；
- **Play Mode Script**：编辑器 Play 走 `BuildScriptFastMode`（= 直接读 AssetDatabase、不碰 bundle）——
  这是迁 AA 的**主要收益**：开发循环里不会再看到"WebGL bundle 在编辑器里退化成 error shader"的洋红（DEC-117）。
  真构建走 `BuildScriptPackedMode`（`ContentPipeline` 在构建前会把 Player 构建脚本切到 Packed）。
- 走 AA 的场景**必须从 Build Settings 移除** —— 两边都留会让同一份场景既被打进玩家包又被 AA 当内容带着（包体翻倍），
  而且运行时不知道该用哪一份；
- **内容位置**（`docs/design/06` §3③ 最大的坑）在本工程的结论是：**默认 profile 就已经对**
  —— `Local.LoadPath` 解析到 `StreamingAssets/aa/[BuildTarget]`，也就是"内容随玩家包一起走"。
  但这是**读数不是假设**：工具会把当前生效的 profile 路径打到 Console，改了 profile 一眼能看出漂了。

## 9 明确没做 / 未闭合

1. **全局包一个都没登记**：Unity 侧不做界面（DEC-80）⇒ 没有 UI 包与字体包；
   相机背景板的取图入口**经负责人拍板不做**（**DEC-161**，2026-10-16）⇒ **不欠**背景包。抽象与流程已就位，登记表留空是**如实**状态。
2. **简介 / 检测的内容 Provider 未登记**：对应素材目录本工程还没有。
3. **`ServerData/` 这套"内容跑到构建目录之外"的老路径本工程不会出现**：AA 走默认 profile；
   `tools/pipeline/unity-stage.mjs` 的 `--extra` 在本工程用不上（留着不影响）。
4. **没有包体预算门禁**：9 个 AA 组合计 **约 43 MB**（构建报告里有逐组字节），
   12 MB 反射 cubemap 被卷进共享材质组的依赖里 —— 预算核算见 `../TODO.md` D-10。
5. **步骤数据已落地**（DEC-111）：8 个结构件预制体自带步骤子树（由 `StructureStepGenerator` 从只读来源工程生成、
   幂等可重跑），且已按新预制体重打为 AA 内容包。
6. ~~**结构件的相机 / 交互闸门 / 高亮初始化未接**（`../TODO.md` D-13）~~ **已闭合**（2026-10-16 复核，Issue #34 关闭）：① **相机就位**——结构件预制体**自带 Cinemachine vcam**（8 个预制体同为 local `(0, 1.08, -4.66)`，priority 10），`CinemachineBrain` 生效后主相机跟着它走（Play 实测），不需要代码去"摆相机"（DEC-160）；② **交互闸门**——`InputGate` 一套在位且**已接线**：`TaskFlowManager` 订阅 `input:enable` / `runtime:resume` 设闸门，`InteractiveManager` / `InteractiveObjBase` / `StepManager` / `InputControllerBase` 都消费它；③ **高亮**——`StructureObj.Awake → HighlightInit()`（profile `Highlight`，`Resources.Load`）+ `view:focus → SetHighlight`（`InteractiveManager.OnViewFocus`）。**仍归 #37 的是"在真产物上逐条判"**，不是"接线"。
7. **材质绑定的自愈是"事后补救"而非"根治"**：根因是"材质接管"换了 GUID 导致 FBX 内部绑定悬空（§4.4）。
   根治要改成**不替换** FBX 自动抽出的材质（只改它的 shader 与属性、保住 GUID）—— 那是一次导入链重做，未做。
8. **动画运行模式没有 Web 侧切换入口**（DEC-121）：现在只能由脚本 / Inspector 改 `StepManager.RunMode`；
   要页面触发就得接一条桥消息。见 `../TODO.md` D-27。
9. **AB 时代的产物目录未删**（`../TODO.md` D-28）：`Assets/StreamingAssets/Content/**`（8 个包 / 45.3 MB）
   已是无主残留，不影响运行。

## 10 历史：AB 链路（已作废，保留备查）

DEC-118 之前，内容走**手写 AssetBundle 链路**（`PackageType.AB` + `UnityWebRequestAssetBundle` + 手管
`bundle.Unload` + `ContentNaming.BundleNameFor` 的小写纪律），产物落 `Assets/StreamingAssets/Content/clip_<器件小写>`。
相关的 `ABPackageConfigSO` / `BundleBuilder` / `BundlePipeline` 已随之删除。本节留两条**将来还有用**的结论。

### 10.1 编辑器里加载 WebGL 平台的 bundle ⇒ 必然洋红（DEC-117）

**这是"编辑器 Play 洋红"的真因，与材质 / shader / AB 还是 AA 都无关。**

机制：WebGL 平台的 bundle 里，shader 数据是按 WebGL 编的；Windows 编辑器**一个 pass 都用不了**
⇒ Unity 一律套内置 `Hidden/InternalErrorShader` ⇒ 纯洋红 `(1,0,1)`。

| 探针 | 结果 |
|---|---|
| 洋红截图逐像素 | 模型区主色 **`(254,0,254)`** = error shader 的 `(1,0,1)` 被 sRGB 取整 |
| AB 里那个 shader 的 pass 名 | `<Unnamed Pass 0>` / `DepthNormalsOnly` / `DepthOnly` —— 与 `Hidden/InternalErrorShader` **逐字相同** |
| 两者的 `GetPropertyCount()` | 都是 **0**（"名字还是原 shader 名、数据已是 error shader"的混合态） |
| 两者每个 pass 的 `ShaderUtil.IsPassCompiled` | **全 True**（而工程那份 9 个 pass **全 False**）⇒ AB 的 shader 是按 WebGL 平台编的 |
| **对照 1**：内置 `URP/Lit` 打 WebGL AB → 编辑器加载 | `passCount=3`、pass 名与 error shader 相同、`UniversalForward=-1` ⇒ 与我们那份一模一样 |
| **对照 2**：同一材质打 StandaloneWindows64 AB | 我们的 shader `passCount=5`（含 `Universal Forward`）、URP/Lit `passCount=4`（含 `ForwardLit`）⇒ pass 都在 |
| **对照 3**：按现有配置真跑一次 Addressables（WebGL）→ 编辑器加载 | 同样是那 3 个 pass、同样 `UniversalForward=-1` ⇒ **AA 底层就是 AssetBundle，换 AA 治不了洋红** |

**两条不要再犯的判断**：
- ❌ "坏的是 `timeRelay` / `masterAppliance`"—— 那只解释"包内材质为 null"，解释不了洋红（contactor 材质一直正常却一样洋红）；
- ❌ `material.FindPass("UniversalForward") == -1` **不是**"缺 URP 前向 pass"的判据 ——
  `FindPass` 匹配的是 **pass 名**，不是 LightMode tag（内置 `URP/Lit` 同样返回 `-1`）。

**判定规则**：编辑器里加载 WebGL 产物看到的洋红**不作数**；验渲染必须用**真产物**（或该平台自己的 AB）。

### 10.2 旧 WebGL 取包路径（DEC-116，已随迁 AA 作废）

```csharp
#if UNITY_WEBGL && !UNITY_EDITOR
    UnityWebRequest.Get(url) + AssetBundle.LoadFromMemoryAsync(bytes)     // ← 当时 WebGL 走这条
#else
    UnityWebRequestAssetBundle.GetAssetBundle(url)                        // ← 其它平台
#endif
```

**当时的理由**：`UnityWebRequestAssetBundle.GetAssetBundle` 在 WebGL 上走"IndexedDB 缓存 + `DownloadHandlerAssetBundle`"，
**缓存键就是 URL** —— 同一地址换过几次包之后会命中旧条目而加载失败，而且 `request.error` 可能是**空串**。
两处的失败日志都补上了 `result` / `http` / `err` 三个字段 —— 只打 `request.error` 会退化成一句没有原因的 `（ ）`。

**现状**：迁 AA 后这条路径连同 `GetBundleUrl` 一起删除；下载改由 Addressables 自己管
（它的失败同样会带 `OperationException`，`LoadFromAA` 的失败日志保留了"必须打出原因"这条纪律）。
⚠️ 若将来需要"包缓存在浏览器里、换版本只下差异"，要显式设计（带版本号的 URL + 自己管缓存）。

## 11 落点速查

| 路径 | 作用 |
|---|---|
| `NewStructureUnity/Assets/Scripts/Core/Models/Addressable/*.cs` | 包登记表数据模型（类型 / 命名规则 / 基类与两子类 / 主清单 / 场景路由） |
| `NewStructureUnity/Assets/Scripts/Core/Managers/FunctionManager/AddressableManager.cs` | 运行期：两条链路 + 按 clip 装卸（先共享后内容）+ 实例登记 |
| `NewStructureUnity/Assets/Scripts/Core/Managers/FunctionManager/TaskFlowManager.cs` | 装/卸包与装配分派接线（9001 语义保留、9002 致命） |
| `NewStructureUnity/Assets/Scripts/Core/Managers/TaskManager/StructureTaskManager.cs` | 结构件实例化 + 步骤驱动 |
| `NewStructureUnity/Assets/Scripts/Core/Managers/GlobalManager.cs` | 驱动 `AddressableManager.CoreUpdate`；`SetCurrentTask` / `CurrentClipId` |
| `NewStructureUnity/Assets/Scripts/Core/Managers/FunctionManager/SceneManager.cs` | 场景 AA 分流（保持"唯一场景 API 入口"这条口径） |
| `NewStructureUnity/Assets/Scripts/Core/DataStruct/DataStructMapping.cs` | 结构件挂载根 |
| `NewStructureUnity/Assets/Editor/Common/*.cs` | 打包内核：路径常量 / 资产工具 / 包配置写入 / 登记表同步 / **材质绑定自愈（`ModelMaterialBindingFixer`，§4.4）** |
| `NewStructureUnity/Assets/Editor/BuildTools/ContentPipeline.cs` | **一键**编排 + 菜单 + 构建报告 |
| `NewStructureUnity/Assets/Editor/BuildTools/AaContentBuilder.cs` | **地址与分组怎么落到 Addressables** 的唯一落点（建组 / 清残留 / 注册条目 / 构建） |
| `NewStructureUnity/Assets/Editor/BuildTools/ContentProviders/*.cs` | 内容包 Provider 契约 + 通用实现 + 内容数据读取 |
| `NewStructureUnity/Assets/Editor/BuildTools/GlobalProviders/IGlobalBundleProvider.cs` | 全局包契约（扩展点） |
| `NewStructureUnity/Assets/Editor/BuildTools/SceneAddressableTools.cs` | AA 设置 / 场景分组工具 |
| `NewStructureUnity/Assets/Resources/Config/**` | 包登记表（**要提交**） |
| `NewStructureUnity/Assets/AddressableAssetsData/**` | AA 设置 / 分组 / 分组 schema（**要提交**；构建输出 `<平台>/` 不入库） |
| `Library/com.unity.addressables/aa/<平台>/**` | AA 产物（**不进版本库**；Build Player 时自动拷进 `StreamingAssets/aa/<平台>/`） |
