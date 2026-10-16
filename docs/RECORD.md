# 记录（做过什么、结果与证据）

> 读者：AI 与人｜性质：**活文档（只增不改）**｜状态：2026-10-13 建立。
>
> **为什么有它**：此前"计划 / 待办 / 记录"三件事混在 `PLAN.md` 里 —— 那个文件开头写着"只写接下来做什么"，
> 正文却塞了 21 行"已完成 + 证据"；待办又散在 `DECISIONS.md` 的未闭合表、`OPEN-QUESTIONS*.md`、
> `PAGE-WORKLIST.md`、`docs/ui-mockups/TODO.md` 四处。结果是**谁也读不干净**。现在三分，各自只有一个维护点：
>
> | 文件 | 只回答一个问题 | 不写什么 |
> |---|---|---|
> | [`PLAN.md`](./PLAN.md) | **接下来要做什么**（分批、落点、验收标准） | 不写"已完成"，不写"待拍板" |
> | [`TODO.md`](./TODO.md) | **现在还剩什么**（待拍板 / 待做 / 未提交） | 不写做法细节与历史 |
> | 本文件 | **做完了什么、证据是什么** | 不写计划与待办 |
>
> **纪律**：① 每条必须有日期 + 可复核的证据（提交号 / PR / 报告文件 / 命令输出摘要）；
> ② 只记事实，不记"打算"；③ 不删旧行（要改就追加一行说明）。
> 更早的轨迹在 git 历史里（`git log`）。


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
| 1.9 | **拾取体系 + 任务流程收进 GlobalManager** | `InteractiveObjBase`（真基类：自注册 + 单一出口 + `OnHighlightChanged` 虚方法钩子，**无接口/服务**）、`InteractiveManager`（注册表 + 检测射线 + 点空白 + view:focus 全在一个文件里）、`TaskFlowManager`（流程 + 自驱协程泵）、`WebBridgeBehaviour`（意图事件 → 上网）、`Contracts/Events/BridgeEvents.cs`（入站事件 + 出站意图）；`WSU3.Core` 加 `UnityEngine.UI`（只为 EventSystems，DEC-80） | 全量重编译后 console 无 error（期间抓到并修掉一处缺 `using`） |
| 1.10 | **检测权收归管理器** | 物体不再实现 `IPointer*Handler`，改由 `InteractiveManager.CoreUpdate()` 每帧射线后调 `Invoke*`；去掉 `PhysicsRaycaster`；悬停不再碰高亮 | git `f8399e1`；Plastic `cs:14` |
| 1.11 | **`0_Setup` 场景接线（P0-1 g）** | 加 `WebBridge`（`WebBridgeBehaviour`）与 `Setup`（`StartupFlow`）；用附加加载改场景，未触碰负责人在编的 `1_Content` | git `64526b7`；Plastic `cs:15` |
| 1.12 | **P0-1 Play 验收** | 三条启动日志齐全；**抓到并修掉"桥随 `0_Setup` 被卸载"的沉默故障**（`WebBridge` 挪到 `Manager` 下 + 根物体自保 + 自检日志/上报） | git（见提交）；Plastic（见提交） |
| 1.13 | **P0-2 单构建多任务语义（DEC-81）** | 清单 `taskTypes[]` + `--task-types`（带契约校验）+ `pickUnityBuild`（兼容旧清单）+ 壳侧同口径 + 7 项选件单测；**验收：桩构建 → 打包 → 壳冒烟 `mounted`** | git（见提交）；纯 JS/TS/文档，**无 Unity 侧改动**（故未走 Plastic） |
| 1.14 | **P0-3 Web 内容层改用 `content/data/*.json`** | 适配层 + 内容 store + 菜单/任务页 + 同形状兜底 + 13 项单测 + 冒烟 8 条新断言；**过程中修掉两个 SPA 状态 bug**（坏链接污染目录、内容晚到导致视口挂不上） | git（见提交）；纯 Web/文档，无 Unity 侧改动 |
| 1.16 | **P0-1 入站验证（桥的 EditMode 单测）** | 32 项单测（信封扫描 12 / 入站分发 14 / 出站映射与拾取上报 6）；**过程中修掉 3 个真问题**：计数器跨用例串、EditMode 不跑 `OnEnable` 导致出站订阅没接上、`JsonUtility` 把坏 `taskType` 读成 0 当合法值放行；**验收：32 passed / 0 failed** | git + Plastic（`Assets/Scripts/Web/*`、`Assets/Tests/EditMode/*`） |
| 1.15 | **P1-4 三维资产搬运 + Blender 转 GLB** | 13 FBX + 24 贴图 + 48 原理图；13 个 GLB / 31.8 MB（BaseColor+Normal）；两个可重跑脚本 + 两份清单报告；**改掉 3 处口径**（两代模型是分工不是重复、闭包收不全贴图、mask map 通道不符） | git（工具/原理图/报告/文档）+ Plastic（`Assets/Models`、`Assets/Sprites`）；**未动 Unity 侧脚本与场景** |
| 1.17 | **P2-7 步骤系统全链路**（DEC-89 ~ DEC-93） | 三级结构（`StepManager → ProcessingHandler → StepHandler → ConditionBase`）+ 协程三阶段 + 跳转从 P0S0 重置与快进 + 协作式打断 + 动画五原语；条件：Default / Click / UI / Question / LineConnect / Finish（Tool、Drag 本期不做）；面板端口 `IStepPanelPort` 接 `ui:request` / `ui:result`；两个自定义 Inspector（条件多态校验、运行时驱动按钮）；新增 `docs/design/10-step-system.md` | 编译 0 error；**EditMode 49/49 通过**（新增 17 项）；`node tools/check-contracts.mjs` 通过（桥消息 24 条）；`contracts.spec.ts` 13 项 + web typecheck 通过；**尚未提交**（负责人要求等其他 agent） |
| 1.18 | **P2-7 步骤系统复核收尾**（DEC-94 / DEC-95） | 跳转打断收面板 + **快进 = Prepare + FastComplete**（显隐表落地，与"走过去"等价）+ 终止型条件在快进路径同样结束流程 + **泵内导航推迟**（防跳转被静默吞掉）+ 结束后"下一步"不重跑；面板等待默认不限时（`timeoutSeconds`）+ 非 WebGL 当场降级 + 桥停用退订；归位收回交互物/连线端点；`PrevStep` 跳过空进程；多实例不再抢 `Instance` | **EditMode 49/49**；编译 0 error；文档口径同步（design/10 事件时机、连线不跨跳转保留）；**尚未提交** |
| 1.19 | **材质通路规格 + 逐子材质核对（DEC-96 §19.3/19.4）** | 新增 `tools/pipeline/extract-material-spec.mjs` → `content/asset-material-spec.json`（从只读来源工程抽：mask 通道语义 R=Metallic/G=AO/A=Smoothness、三组区间重映射（**AO 下界 0.5**）、表面模式、**预制体覆写**、glTF 表达不了的项逐条记账）；新增 `tools/pipeline/audit-material-mapping.mjs`（逐模型逐子材质核对）；**检视页**：影棚 HDRI `content/assets/three/env/StudioWhiteUmbrella.exr` 当天空盒+光源并设为默认档、去掉地面网格、解绑右键平移 | 核对结论：**13 个模型里 8 个的子材质贴图全错**（`img=[1,0]` 共用主干贴图）、表面模式全错（`Glass`/`CombinationSwitch2` 应 BLEND，`ElectronicSupermarket2`/`CircuitBreaker_2` 应 MASK），**合计 18 处**；根因是搬运按"同名前缀"收图 → 5 张子材质贴图没搬进来。修复路径见 `DECISIONS.md` §19.4（**未实施**） |
| 1.18 | **P1-6 模型检视页（审核用，DEC-96）** | 新增 `docs/model-preview/`（与 `ui-mockups/` 同级，**不是产品**）：`serve.mjs`（服务根＝仓库根 + 正确 MIME）、`index.html`、`src/stage.mjs`（四档环境方案 / 光照·IBL·背景·曝光 / 贴图·线框·PBR 覆盖）、`src/main.mjs`（13 个模型可选可旋转 + 证据/实测两栏读数 + `?model=` 深链）；清单读 `content/asset-convert-report.json`，**不另维护第二份**；只消费 `ui-mockups` 令牌与元件 | **13/13 逐个实测通过**：三角面与材质名与清单逐个一致、无 console 错误、切模型后显存回落基线；截图与报告见 `web/tools/smoke/artifacts/model-preview/`（该目录已忽略）；**结论待负责人审阅**（环境与材质取哪一套见 `DECISIONS.md` §19.2） |
| 1.21 | **排版稿内嵌真实画布 + 取图加固（§19.6）** | C6「简介」的三维区从占位块换成 iframe 内嵌检视页的**嵌入模式**（`?embed=1`：只留画布、页壳收起、画布透明交给宿主 UI 的毛玻璃框）；`parts.mjs` 的 `viewport()` 支持 `liveSrc`；修"偶现贴图加载不出来"的两个时序真因（**快照回写**：解算每接一张图立刻 commit；**过期加载**：加代次丢弃）；取图换 `fetch` + `createImageBitmap` + 重试 3 次并明确报错 | 嵌入页 11 层全透明、左框与右框计算样式**逐值一致**；解算途中狂拖控件后 **8/8 与规格逐项一致**、console 0 错误；**未提交** |
| 1.20 | **素材口径：GLB 只出 mesh + mat（DEC-97）** | 导出层摘掉全部贴图节点（一条龙 + 中间内容仓两条路都改）；`import-material-textures.mjs` 改为**按材质引用搬齐** base / normal / mask 三张（不再"补搬 GLB 带不动的"、不再跳过 mask）；mask 并入 `content/asset-material-textures.json` 查找表（不再直读 Unity 侧路径 —— 那条路径产品里不存在）；渲染期解算成为唯一取图入口；同时摘掉 FBX 里**全零的顶点色**（`COLOR_0` 会被乘进基色 ⇒ 那几块在 Three 里全黑） | GLB **21.7 → 7.3 MB**、每个 GLB **贴图 0 张**、材质逐个保留；查找表 **30 条**（base 8 / normal 8 / mask 8 / 其余 6）；8 个模型 **41 张贴图全部可解析、0 缺失**；**未提交** |
| 1.22 | **Blender 变换重导**（2026-10-13） | 负责人在 .blend 里改了部分模型的初始角度 / 位置 → 从中间仓重导 8 个 GLB：**5 个变化**（breaker / contactor / fuse / speedRelay / thermalRelay），3 个 sha 未变（combinationSwitch / masterAppliance / timeRelay） | --from-blend；content/assets/blend/*.blend（不进 git）；asset-convert-report.json 的 sha256 / 字节变化 |
| 1.23 | **文档三分（计划 / 待办 / 记录）**（2026-10-13） | 新建 `docs/TODO.md`（待拍板 / 待做 / 未提交，合并原先四处分散的待办）与 `docs/RECORD.md`（原 `PLAN.md` §1 的 21 行"已完成"表**整表迁入**，未改写未删）；`PLAN.md` 只留计划（335 → 316 行）；`docs/README.md` 与根 `README.md` 同步口径 | **PR #13**（squash 进 main `18a8bfb`） |
| 1.24 | **文档纪律落笔 + 根 README 重写**（2026-10-13） | `AGENT.md` §4 新增「文档三分」硬纪律（三个维护点 / 联动节奏四步 / 禁止项），§5 未闭合项改指 `TODO.md`；`docs/README.md` 写作约定补三分纪律与"不写外部引用"；**重写根 `README.md`**（8 个 GLB / DEC-01~97 / 中间内容仓命令 / 排版稿与检视页改由**仓库根**起服务 / 尚未开始项改为 P1-5 资产链与 Web 侧面板） | **PR #14**（squash 进 main `2bd4002`） |
| 1.25 | **收尾：变换重导的产物进库**（2026-10-13） | 提交 `content/asset-convert-report.json`（5 个模型的 sha256 / 字节变化，即 1.22 那次重导的证据）；`TODO.md` 的 **U-01 关闭**（该表此后为空） | PR #15（squash 进 main）；报告文件本身即证据 |
| 1.26 | **Info 页对齐排版稿 C6 + 产品侧资产发布链**（2026-10-14，DEC-98） | ① 产品新增 `web/src/viewer/ModelStage.ts`（影棚 HDRI 当 IBL、无灯、无色调映射、**画布透明**、右键不平移；base/normal/mask **渲染期后加载** + mask→ORM 重排 + 表面模式按规格对齐）与 `viewer/scene-assets.ts`（只认产物里的三张元数据表，`clip_x` → 器件 → GLB）；② `TaskType.Info` 的骨架由"纯图文"改为**「左三维 + 右图文」**（`domain/registry.ts` 新 kind `model`，页面复用 `.app-split` 的 380px 右栏）；③ **原 P1-5 资产发布链落地**：`vite.config.ts` 的 `threeAssetsServe()`/`threeAssetsBuild()` 一对插件（dev 中间件直读 / build 拷进 `dist/assets/three/**`），发布清单新增 `content.assets`；④ 冒烟补 5 条断言（画布 / 就绪 / 三角面 / 解算零错误 / 画布有内容）；⑤ 壳冒烟补第三段 `smokeInfo()`（**在打包产物上**验 Info 页三维区，DEC-79 的口径） | `cd web && npm run typecheck / lint / format:check / test`（**47 项**）全过；`npm run smoke` **全过**，其中 `Info 页：模型真的画出了三角面 — triangles=29673 calls=2`、`材质解算零错误`（`NewACContactor orm=true` / `ElectronicSupermarket2 orm=false`）**与 `content/asset-convert-report.json` 的 materialDetail 逐个一致**；截图 `web/tools/smoke/artifacts/task-info.png`。**真机 exe**（`node tools/pipeline/pack.mjs` → `electron/release/WSU3-Shell-0.0.0-portable.exe`，123.6 MB）：打包摘要 `三维资产 42 个文件 / 39.6 MB`；`--smoke` 三段全过 —— 报告 `electron/release/smoke-packed.json` 里 `infoPage.ok=true`、`triangles=29673`、`columns=[1104,380]`、`consoleErrors=[]`。**已知重复**：材质解算在产品与审核页各一份（DEC-98 未闭合 a / `TODO.md` D-09） |
| 1.27 | **排版稿 C4 原理页改为"单段视频"形态**（2026-10-14，DEC-99 的前半） | 新增原理页布局类 `.ui-videopage` / `__main` / `__side` / `__list` / `__notes` + **`.ui-videopage--single`（单段时"视频列表"整块隐藏、播放器占满左栏）**；C4 改为与采纳数据一致的**单段形态**（右栏 = 原理说明；去掉排版稿自编的"3 段 / 03:24 / 已看完"——数据里既没有多段也没有时长）；样式成果页**第八节两档并列**（单段 = 列表隐藏 / 多段 = 列表出现）；`docs/design/01` 的 `Principle` 行同步 | `061edd8`（分支 `feat/mockup-c4-principle-single-clip`）。实测（Playwright 真浏览器）：单段 `list.display=none`、播放器 1046×637；多段列表 168×123；重新生成 29 页后**只有这 6 个文件变动**（其余 28 页零漂移） |
| 1.28 | **原理页产品侧落地 + 讲解视频资产链**（2026-10-14，DEC-99） | ① 搬 8 段讲解视频 **65.9 MB**（最大 30.57 MB）→ `content/assets/video/**`（**不进 git**），新脚本 `tools/pipeline/import-principle-videos.mjs` + `content/asset-video-report.json`（**与模型搬运脚本分开**：那条链的"单图 ≥10 MB 剔除"会把视频全剔掉）；② `vite.config.ts` 的资产插件从"服务 three 一棵树"改成**服务多棵树**（`/assets/three/` + `/assets/video/`），视频额外发 `_meta/index.json`（**构建时按目录内容现算**）当"这段视频在不在产物里"的**唯一判据**；③ 产品 `Principle` 页 = **左视频 + 右说明**，`<video controls playsinline preload="metadata">` 不自绘控制条；**单段视频时列表不出现**（规则 `web/src/domain/principle.ts` 的 `showsPlaylist`，6 项单测）；④ 服务端：`.mp4` 的 `video/mp4` 与 **`Range`（206）** 在 dev 中间件与**壳的静态服务器**都实现，壳里把**不带指纹**的资产树从 `immutable` 改成 **`no-cache` + `ETag`/`Last-Modified`**；⑤ 发布清单新增 `content.video`（数量 + 字节）与 `serving.mime['.mp4']`；⑥ 冒烟补 4 条断言 + 壳冒烟**第四段** `smokePrinciple()` | `00be9da`。`npm run smoke` 全过：`原理页：要么真的能播… — readyState=4 1920x1080 81s`、`单段视频 ⇒ 视频列表整块不出现 — sections=1 playlist=false rows=0`、`右栏只有"原理说明"这一个面板`、**全程 console 0 错误**；截图 `web/tools/smoke/artifacts/task-principle.png`。壳（`WSU3_WEB_ROOT=web/dist` + `npm run smoke`，即**打包形态**）：`原理页：phase=ready 段数=1 列表=无（行数 0） 播放器=1920x1080 81s readyState=4 右栏=原理说明` → 证明 MIME/Range 在壳里也对。`npm run build` → `dist/assets/video/**` 9 个文件（8 段 + 清单）。门禁：`check-large-files` / `check-shell-coupling` / `check-contracts` / `check-content-data` + typecheck / lint / format:check / test（**53 项**）全过 |
| 1.29 | **原理页合入 main + 重新打包（exe 冒烟通过）+ 文档拉齐**（2026-10-14，DEC-99 收尾） | ① **PR #17**（squash → main `b115339`，特性分支已删）；② `node tools/pipeline/pack.mjs` 重打包 → **`electron/release/WSU3-Shell-0.0.0-portable.exe` 187.4 MB**（上一版 123.6 MB，+63.8 MB ≈ 视频），摘要 `Web 117 文件 / 116.9 MB` ＋ `三维资产 42 文件 / 39.6 MB` ＋ **`原理视频 9 文件 / 65.9 MB`**；发布清单入账 `content.video = 9 文件 / 69,104,660 字节`、`serving.mime['.mp4'] = video/mp4`；③ **文档拉齐**：根 `README.md`（DEC 范围 → **DEC-01 ~ DEC-99**、"第一~七轮"；`tools/` 行补"原理视频搬运"；`OPEN-QUESTIONS` 行的口径警告改为"以 `DECISIONS.md` 为准"）、`docs/README.md`（**v4**：DEC 范围 / 章节补 §16~§20 / R6 状态由"**补充 14 条待答**"改为"已答，固化为 DEC-80~88"）、`docs/design/05` §3.4 服务端约定补 **`Range`** 与"不带指纹资产树 → `no-cache` + `ETag`"、`docs/PAGE-WORKLIST.md` 的 C4/C6 由 `[ ]` 改 `[x]` 并写真实要素；④ `TODO.md` 的 **T-07 关闭**（README 重写后已不再有"第六轮待回答"那句，README 与 `docs/README.md` 现均指向 `DECISIONS.md`，冲突不复存在） | PR **#17**（原理页合入 main）；**本次文档拉齐见 PR #18**；打包版 exe 冒烟（`WSU3_SMOKE_REPORT` → `electron/release/smoke-packed.json`）**退出码 0**：`ok=true` / `packaged=true` / `consoleErrors=[]` / `unityPage.mode=mounted` / `infoPage.triangles=29673` / **`principlePage.playable=true readyState=4 1920x1080 81s sections=1 playlist=false playlistRows=0 panels=["原理说明"]`** |
| 1.30 | **站点线只画"数据里有的站"**（2026-10-14，DEC-100） | `web/src/components/RouteBar.vue` 的站点列表从"契约 11 个 `TaskType` 全画"改为**当前项目启用的任务**（`stores/content` 的 `enabledTypesOf()`；顺序 / 标签 / 技术栈仍逐字来自契约）；**一站都没有时整条不渲染**（不是画一条空壳）；站号改为本站点线内的顺序（1..n —— 契约序号会跳号 3/7/8/9）；`AppShell` 的 `route` 注释同步口径；`docs/design/08` 的"契约 vs 内容分工"改写为"**契约管这一站长什么样、内容管这一站有没有**" | **PR #19**（分支 `feat/route-bar-data-driven`，提交 `8572be2`）。**冒烟（真 Chromium）**：`#/task/8?project=clip_contactor` → **4 站**（`实验原理/简介/结构/检测`）、`#/task/10?project=clip_quiz` → **1 站**（`考核`）—— 改前同一条 URL 画 **11 站**（旧断言就是 `count === 11`）；`npm run smoke` **39 条全过**、**全程 console 0 错误**。**单测**：`adopted-content.spec.ts` 增 1 项（`enabledTaskTypesOf(null)` 为空 ⇒ 站点线整条不画），`npm test` **54 项**全过。`web/README.md`、根 `README.md`、`docs/README.md` 的 DEC 范围与冒烟口径同步到 DEC-100 |
| 1.31 | **登录页接进产品主流程（只允许游客）**（2026-10-14，DEC-101） | ① 新增 `web/src/views/LoginView.vue`（左品牌区 + 右入口栏，**只有「以游客身份进入」**）；② `/login` 从 `PlaceholderView` 换成 `LoginView`，`StartView` 主按钮改为进登录页（流程 = `start → login → menu`）；③ `AppShell` 新增 `exit` 能力（复用 `ui-iconbtn`，不新增样式）；④ 目录页加「退出」回登录页（**不清本机存档**，DEC-54）；⑤ **布局修缺**：目录页没有站点线时 `.app-chrome` 撑不高，绝对定位的右上按钮组会压到面板标题上 → 新增 `.app-chrome--topright-only` 占位（值全部来自令牌）；⑥ 排版稿 A2 同步收敛（右栏去账号/密码/身份、左栏撤「三维展示区」提示），重跑 `render.mjs` 后**只有 `a2-login.html` 变动，其余 28 页零漂移**；⑦ `product.css` 新增 `.app-login*` 布局类 | **PR #20**（分支 `feat/login-guest-flow`，提交 `e8ae1f3`）。门禁全过：`typecheck` / `lint` / `format:check` / `test`（**54 项**）/ `build` + `check-contracts` / `check-content-data` / `check-shell-coupling` / `check-large-files`。**冒烟（真 Chromium）新增 7 条全过**：`开始实验 → 登录页（#/login）`、`登录页：不摆账号 / 密码输入框 — inputs=0`、`游客进入 → 项目目录（#/menu）`、`登录之后目录照常加载内容数据 — tiles=9`、`目录有「退出」入口`、`退出 → 回到登录页`、**全程 console 0 错误**；截图 `web/tools/smoke/artifacts/login.png`、`menu.png` |
| 1.32 | **结构任务（`Structure` = TaskType 8）资产搬入 Unity**（2026-10-14，DEC-102 / DEC-103） | ① 先摸清来源工程里结构任务的**真实载体**：不是 FBX，而是 `Assets/Prefabs/Models/StructureObjs/*.prefab`（8 个）× 零件装配 + `Assets/Animation/Model/Structure/*.anim`（46 段）= 拆装动画 + 两个脚本；每器件 = "点第 N 个零件 → 播第 N 段动画"的线性步骤；② 新脚本 `tools/pipeline/import-structure-assets.mjs`（数据驱动 + GUID 依赖闭包 + `--dry-run` + 幂等）：**8 个预制体** 0.54 MB、**46 段动画** 14.62 MB、**29 个器件材质 + 1 个公共 `Alpha.mat`**（同名同址**接管** Unity 自动抽出的占位材质，连 `.meta` 覆盖 ⇒ 源预制体引用逐条对得上）、**4 个 ShaderGraph + 1 个 SubGraph** 1.06 MB、**HighlightPlus 86 文件** 0.46 MB（只搬 Runtime/Pipelines/Editor，Demo/Documentation 9.4 MB 不进产品）、**`Chrome05.cubemap` 12.0 MB**（4 个 `*_Metal` 材质的反射环境依赖）；③ 清单 `content/asset-structure-report.json`（来源/目标/字节/sha256/类别/状态）；④ `.gitignore` 补 `Assets/Animation/`（Unity 专属大块走 Plastic），预制体/Shader/插件**进 git**；⑤ 文档：`DECISIONS.md` §21（DEC-102~105）、`design/03` §5.2、`README.md` §1/§3/§4、`PLAN.md`（P2-6d **关闭**、P1-4b **作废**、新增 P2-8）、`TODO.md`（新增 D-13~D-18 + U-02）；⑥ **过程中修掉三个真错误**：闭包只扫 `guid: <hex>` 会**漏掉整棵 ShaderGraph SubGraph**（子图引用是塞在字符串里的 JSON，须先去转义再扫）、"目标原来存不存在"在**写盘之后**取导致每份都被记成 `replaced`、**"单张 ≥10 MB 一律剔除"把 12 MB 的反射 cubemap 也剔了**（那条规则的原意是"未压缩背景照片"，现在只对位图生效，非位图照搬并记"留意"） | 8 个器件逐个报数（`contactor_structure_model → Content/clip_contactor 38 文件 4.02 MB` …）；**幂等实测**：重跑一次 `0` 个文件被写、已在本工程的按 GUID 跳过；来源工程**全程只读**（DEC-69）。**Unity 编辑器内实测**（Unity MCP 逐个 `AssetDatabase` 读回）：8 个预制体 **空网格 0 / 空材质 0**、Animation 片段数与来源一致（12/7/5/0/4/5/7/6）、着色器是自制 ShaderGraph 而非紫红；`timeRelay` / `masterAppliance`（嵌套 FBX 预制体实例）初读为空材质，**重导这两个 FBX 后归零**；HighlightPlus 已编译进 `Assembly-CSharp-firstpass`（41 类型）。**未提交**（git 走分支 + PR；Unity 侧另走 Plastic，且要**等 Unity 导入完**生成文件夹 `.meta`）——见 `TODO.md` U-02 |
| 1.33 | **HighlightPlus 接入方式落地：给插件补 asmdef**（2026-10-14，DEC-106，闭合 `TODO.md` D-16） | 新增三个程序集文件（插件源码与目录**一行未改**）：`Assets/Plugins/HighlightPlus/Runtime/HighlightPlus.Runtime.asmdef`（引用 `UnityEngine.UI`）、`Assets/Plugins/HighlightPlus/Pipelines/URP/HighlightPlus.Pipelines.asmdef`（引用 `HighlightPlus.Runtime` + URP 两个运行时程序集）、`Assets/Plugins/HighlightPlus/Editor/HighlightPlus.Editor.asmdef`（仅 Editor 平台，引用 Runtime + Pipelines + URP）；`Assets/Scripts/Core/WSU3.Core.asmdef` 的 `references` 加 `HighlightPlus.Runtime`；`InteractiveObjBase.cs` 补 `using HighlightPlus;`（`CS0246` 的报错行就在这里）；文档：`DECISIONS.md` §21 加 DEC-106、`design/03` §2 程序集表扩行 + §5.2 注释改口径、`PLAN.md` P2-8 步 b 标"已定"、`TODO.md` D-16 删除 | Unity 2022.3.53f1c1 编辑器内反射复核（`CompilationPipeline.GetAssemblies(Editor)`）：`WSU3.Core => WSU3.Contracts, UnityEngine.UI, HighlightPlus.Runtime`；`HighlightPlus.HighlightEffect` 解析到程序集 **`HighlightPlus.Runtime`**、`Assembly-CSharp-firstpass` 里**已不再有**它；`HighlightPlus.HighlightPlusRenderPassFeature` 在 `HighlightPlus.Pipelines`；`InteractiveObjBase` 的 `highlightEffect` 字段类型 = `HighlightPlus.HighlightEffect @ HighlightPlus.Runtime`（证明确实重新编译成功）；编译后 console **0 error**。**未提交**（git 走分支 + PR；Unity 侧走 Plastic，并入 `TODO.md` U-02） |
| 1.34 | **底层操控层移植进 Unity**（2026-10-14，DEC-107） | ① 新增搬运脚本 `tools/pipeline/import-input-controller.mjs`（显式清单 + GUID 闭包 + `.meta` 一起走 + 幂等 + `--dry-run`，来源只读）与移植脚本 `tools/pipeline/port-input-controller.mjs`（机械改写：命名空间 / 来源 `using` / 日志，可重跑）；② 代码落到**本工程目录与命名**：`Assets/Scripts/Core/Controllers/`（程序集 `WSU3.Core`、命名空间 `WSU3.Core.Controllers`），7 个类；③ 资产：`StarterAssets.inputactions`、角色预制体 `Assets/Prefabs/Characters/FirstPersonController.prefab`、相机 rig `Assets/Prefabs/Camera/MainCameraRig.prefab`、背景板材质 `Assets/Model/Public/Materials/CamBg.mat` + 自制 ShaderGraph `Assets/Shaders/Models/CamBgUnlitShader.shadergraph`（GUID 闭包）；④ 依赖：`com.unity.cinemachine@2.10.7` + `com.unity.inputsystem@1.11.2`，`activeInputHandler` 改 **Both**，`WSU3.Core.asmdef` 加两个引用、`HighlightPlus.Runtime.asmdef` 补 `Unity.InputSystem`（DEC-106 早已预告这一条）；⑤ 按 DEC-69 边界**不搬**来源的 `Global*Mgr` 骨架：相机取用改 `GlobalManager.MainCamera`、控制器登记改基类静态注册表、逐帧接 `InputGate`；⑥ 文档：新增 `docs/design/11-input-and-camera.md`、`DECISIONS.md` §22（DEC-107）、来源 14 份行为规格 `.md` 原文照录进 `docs/research/10-input-controller-specs/` | 清单 `content/asset-input-controller-report.json`（12 项 + 14 份文档；**重跑幂等**：第二次 `已搬 (GUID 相同) 11 / 新写 1`）。Unity 2022.3.53f1c1 编辑器内实测：两个包解析到位；**全项目重编译 console 0 error**；`WSU3.Core` 引用读回含 `Cinemachine, Unity.InputSystem`；5 个移植类型解析得到；**三个预制体缺失脚本 0**；相机 rig 的 `CamBg` 材质解析到 `Shader Graphs/CamBgUnlitShader`；输入资产 1 张动作表被 `PlayerInput` 引用。⚠️ **过程中踩到并修掉一个真问题**：首版命名空间定为 `WSU3.Core.Input`，导致 `WSU3.*` 下所有裸 `Input.GetMouseButton*`（旧版 Input）被解析成命名空间 ⇒ `InteractiveManager` 等整片报 `CS0234`，改名 `WSU3.Core.Controllers` + 目录 `Core/Controllers/` 后归零。**未提交**（git 走分支 + PR；Unity 侧走 Plastic）——见 `TODO.md` U-03；未闭合四项见 D-19~D-22 |
| 1.35 | **修操控层一处空引用 + 更正 1.34 的待办编号**（2026-10-14，DEC-107 同批） | ① `FocusRotationControl.ZoomHandle()` 重写里直接解引用 `Mouse.current`，**无鼠标设备时为 null ⇒ `NullReferenceException`**（`Update` 每帧调它）；补判空返回，与同文件 `HandleRot` / `HandleResetInput` 的写法对齐 —— 基类的守卫管不到派生类的重写。② 更正 1.34 里的待办编号笔误（`U-02b` → **`U-03`**） | 实测：编辑器里 `InputSystem.devices = 0`、`Mouse.current = null`（**Input System 后端尚未在当前会话生效** —— `activeInputHandler` 改成 Both 需**重启编辑器**），这正是该 NRE 的触发条件；守卫加上后编译 0 error。⚠️ 重启前新输入的控制器（移动/视角/滚轮）都不会响应，重启后才会 |
| 1.36 | **资源包与 AB 打包流水线落地**（2026-10-14，DEC-108 ~ DEC-110，**闭合 `TODO.md` D-17**） | ① **`AddressableManager` 从 23 行空桩补成完整实现**（三条链路 + 按 clip 装卸 + 实例登记 + 卸载纪律 + 场景 AA 路由 + 自驱泵 `CoreUpdate`）；② **移植包登记表一整套**（`PackageConfigSO` 抽象基类 + AB/AA/Default 三子类 + `PackageDatabaseSO` 主清单 + `ContentNaming` 命名规则唯一来源 + `SceneAddressableConfig` 场景路由 + `PackageType` / `ContentAssetKind`）；③ **移植编辑器打包内核**（`EditorPaths` / `EditorAssetUtil` / `BundleBuilder` / `PackageConfigWriter` / `PackageDatabaseSync`）并新写**一键编排** `BundlePipeline`（收集 → 校验 → 写配置 → 同步登记表 → **一次 `BuildAssetBundles`** → 报告）+ 内容包 Provider 契约与实现 + 全局包契约（空表）+ AA 设置/分组/场景工具；菜单 `WSU3/Pack/`（一键打 AB 包 / 对账 dry-run / 仅构建 / 仅刷新登记表 / 打开产物目录 / Addressables 四项）+ 批处理入口 `-executeMethod …BundlePipeline.BuildAllFromBatch`；④ **接线**：`TaskFlowManager` 的 `scene:enter`/`scene:exit` 真正装包卸包（新增 `9002` 致命码；`9001` 非致命口径保留）、`StructureTaskManager` 按 `prefabKey` 取件 + 实例化 + 实例登记 + 交给步骤系统、`GlobalManager` 驱动 `CoreUpdate` 并暴露 `SetCurrentTask`/`CurrentClipId`、`SceneManager` 加 AA 分流；⑤ `ignore.conf` 补 AB 产物忽略；⑥ 文档：新增 `docs/design/12-resource-packs-and-ab-build.md`、`DECISIONS.md` §23、`docs/README.md` v9、根 `README.md`、`TODO.md`（删 D-17 / 更新 D-13 / 新增 T-10） | 编辑器内实测（Unity 2022.3.53f1c1，`activeBuildTarget=WebGL`）：**全项目重编译 console 0 error**；一键打 AB 包 ✅ **8 个包 / 8 项资源 / Error 0 / Warning 0**，产物 **47,476,797 字节（45.3 MB）** 落 `Assets/StreamingAssets/Content/clip_<器件小写>`（**8 个文件名与 `content/asset-structure-report.json` 的 `bundleName` 逐条一致**）、`missing 0` / `removed 0`、报告 `Builds/assetbundles/ab-build-report.json`；包登记表 `Assets/Resources/Config/PackageDB_Master.asset` **8 条** + `ContentPackages/AB_*.asset` 8 个；**运行期读回**：`Resources.Load<PackageDatabaseSO>("Config/PackageDB_Master")` 非空 / 8 条、`AddressableManager.IsInit=True` / `ConfigCount=8` / `HasClip("clip_contactor")=True` / `HasClip("clip_nope")=False` / `GetBundleUrl` = `file:///…/StreamingAssets/Content/clip_contactor`；**AA 已初始化**：`Assets/AddressableAssetsData/AddressableAssetSettings.asset` + 2 个默认分组 + `AssetGroups/` 5 个资产，console 0 error；门禁 `check-contracts` / `check-content-data` / `check-large-files` / `check-shell-coupling` **全过**。⚠️ 过程中纠正一处真错：`TaskManagerBase.Instance` 原本 `new` 一个 MonoBehaviour（Unity 不允许），改成解析场景实例后 `1_Content` 里那个 `StructureTaskManager` 节点读回完好（`componentTypes=[Transform, StructureTaskManager]`，场景 `isDirty=false`）。**未提交**（git 走分支 + PR；Unity 侧走 Plastic） |
| 1.37 | **结构任务 / 操控层 / 资源包三条链路的 git 侧合入 main**（2026-10-14） | 1.32 ~ 1.36 那三批"未提交"的内容进版本库：Unity 侧 `Assets/**`（结构件预制体 / 器件材质 / 4 个 ShaderGraph + 1 个 SubGraph / HighlightPlus 插件 / 操控层 7 个 `.cs` / Editor 打包内核 11 个 `.cs` / `AddressableAssetsData` / `Resources/Config`）+ 各自的文件夹 `.meta`、三条搬运与移植脚本、文档（`DECISIONS.md` §21~§23、`design/11~12`、`research/10`）。**仍只走 Plastic**：`Assets/Models/`（FBX + 贴图）与 `Assets/Animation/`（46 段拆装动画）—— 两条线不共用，`.gitignore` 有意排除 | **PR #21**（squash 进 main `43df657`，**327 文件 / +94,179 / -133**）；拉取后四道门禁全过（`check-contracts` / `check-content-data` / `check-large-files` / `check-shell-coupling`）、`web` 单测 **52 passed / 2 skipped**（跳过的是"磁盘存在性"断言 —— 本 checkout 没有 `content/assets/three`，大资产本就不进 git，DEC-57）。对应 `TODO.md` U-02 / U-03 / U-04 的 git 侧关闭，Plastic 侧仍待提交 |
| 1.38 | **步骤条件的 Inspector 选型入口 + 私有文件卫生**（2026-10-14） | ① 负责人为解决"`conditionType` 在 Inspector 里没法编辑"给 `StepHandler` 加了 `[SerializeField] ConditionType conditionType`，但**没有任何代码读它**（真实类型一直是 `StepHandler.ConditionType` 属性 —— 取 `condition` 的实际类，`StepManager` / `StepManagerEditor` / `StepSystemTests` 读的都是属性）⇒ 把它接成**真入口**：`StepHandlerEditor` 的「条件类型」下拉（`EnumPopup` + 只列已实现类型；选中即 `new` 出对应条件类，`NewCondition` 是唯一的"类型 → 类"映射点；**显示值永远取 `condition` 的实际类** ⇒ 面板不会说谎；换类型会新建对象，先弹确认）；字段加 `[HideInInspector]` 并写明"它只是待选值"；② 23 个 `*.private.N` 副本（UVCS 在"git 改写受控文件"时留下的同内容副本 —— UVCS 侧 `ignore.conf` 自带规则、**git 侧没有**）⇒ 删文件 + `.gitignore` 补 `*.private` / `*.private.meta` / `*.private.[0-9]*`；③ `DECISIONS.md` 增 **§24 / DEC-111**（D-14 落点定为"预制体自带全量 StepManager 子树"），依据是来源工程 8 个预制体的 `simpleSteps` 逐器件读数 | `WSU3.Core.dll` / `WSU3.Editor.dll` 重编译于 **19:06:08**（在两处改动之后）、console **0 error**；**EditMode 49/49 passed / 0 failed**（`WSU3.Tests.EditMode`）；`git check-ignore` 对 4 个样本路径全部命中（`.gitignore:113`）；步骤数据逐器件读数见 `TODO.md` D-14 |
| 1.39 | **结构任务步骤生成器：8 个器件 46 步一次生成**（2026-10-14，DEC-111 落地） | 新增 `Assets/Editor/Steps/StructureStepGenerator.cs`（菜单 `WSU3/Steps/…` 两项 + 批处理 `-executeMethod …GenerateFromBatch`）：读**只读**来源工程的 `simpleSteps`，幂等生成/补齐 `StepManager → ProcessingHandler → StepHandler` 子树 —— `clip` 按 guid 对齐 `Scale` 上的 `Animation`，`clickObj` 落成 `ConditionClick.target`（`{fileID: 0}` ⇒ `ConditionDefault`），并顺手清掉两个有意未搬脚本的 Missing Script、给零件补 `StructureObj`；`StepConditionFactory` 抽出"类型 → 类"的唯一映射点（下拉与生成器共用）。过程中修掉三个真问题：① `Transform.Find` 不认含预制体根名的路径（34 个 target 全落空）；② 嵌套 FBX 实例里的零件在外层 YAML 是 `stripped` 块（无名字 / 无 Transform），改按"源资产 guid + 该资产里的 fileID"身份匹配（`GetCorrespondingObjectFromSource` + `TryGetGUIDAndLocalFileIdentifier`，实测 7/7 命中）；③ `BlockRegex` 漏了 `(?: stripped)?`，把 stripped 块整块跳过 | 逐器件盘上核对：**46 步 / 38 target / 46 动画槽位 / 38 `StructureObj` / 0 空 target**，`masterAppliance` 0 步不产子树（DEC-105）；**幂等**：第 4 次跑 **0 变更 / 46 未变**；报告 `content/asset-structure-steps-report.json`；**EditMode 49/49 passed**。⚠️ 预制体已变 ⇒ **结构件 AB 包要重打**（`TODO.md` D-23） |
| 1.40 | **Web ⇄ Unity 全量交互接线 + 免 Web 自测开关 + dev 期 Unity 服务**（2026-10-14，DEC-112 ~ DEC-114） | ① **Web 侧桥接线**（此前只轮询 `isReady()`，出站一条没发、入站一条没处理）：新增 `web/src/unity/UnitySession.ts`（握手后发 `app:init`；`scene:enter` **幂等**且能在握手前记意图、握手后补发；`input:enable` 握手前**只记状态不发**）、`web/src/contracts/bridge-payloads.ts`（每个 type 的载荷形状；消息名清单仍在 `bridge.ts` 由门禁守）、`web/src/domain/step-content.ts`（`StepContentData.json` → 提示条/信息面板两份索引）、`web/src/domain/step-panels.ts`（回执纪律：**一个请求只回一条**、弹不出来回 `unavailable`）、`web/src/components/StepPanelHost.vue`（B5 提示浮条 + D2 信息/答题面板，类名全部取自设计系统）、`stores/content.ts` 补 `loadStepContent` / `questionOf`、`TaskView.vue` 接上会话与面板并把 `step:changed` / `object:picked` / `task:completed` / `unity:error` 四条真实读数显示出来；② **Unity 侧免 Web 自测开关**：新增 `Assets/Scripts/Managers/StartupTestSwitch.cs`（`0_Setup` 根物体 `TestSwitch`；`testEnabled`(默认 false) / `taskType`(8 结构) / `projectClip`(`clip_contactor`) / `allowUrlOverride`；开关关着时零影响；WebGL 里 `?wsu3_test=on\|8&wsu3_clip=…` 免重打包覆盖；等管理器自检 + 等活动场景变 `1_Content` 后发**同一个** `SceneEnterRequestEvent`）；③ **dev 期把暂存 Unity 产物挂进 `vite dev`**：`vite.config.ts` 新增 `unityDevServe`（`/unity/<key>/**` → `<暂存根>/<key>/**`，并按实际暂存内容合成 `/release-manifest.json`；暂存根可用 `WSU3_UNITY_DEV_ROOT` 改道）；④ **桩构建会说协议**（`make-stub-unity.mjs` 内置可选协议仿真：`scene:enter` → `assets:ready`/`unity:progress`/`scene:ready`/`step:changed`/`ui:request`，收 `ui:result` 后推进并按 `ConditionQuestion` 口径答错重问）；⑤ `unity-stage.mjs` 加 `--stage-root` | **门禁**：`typecheck` / `lint` / `format:check` / `test`（**108 passed / 2 skipped**）/ `build` + `check-contracts` / `check-content-data` / `check-shell-coupling` / `check-large-files` 全过。**冒烟（真 Chromium）全过，新增 18 条桥交互断言**：`scene:enter{taskType:8, projectId:clip_contactor}`、`app:init{protocolVersion:1}`、提示条两行文案来自内容数据、信息面板标题/正文来自 `StepContentData.json`、模态打开 `input:enable{false}` 且关闭后 `{true}`、`step:changed` → 页面「步骤1/3」、信息面板关闭回 `ui:result{kind:ui,result:success}`、答题题干来自题库、**答错先由界面层判定**（不立刻回执）→ 点重试回 `failed` → 题目被重弹 → 答对回 `success` → `task:completed` 落到页面「任务完成（用时 4.3s）」（分数不编造）；截图 `web/tools/smoke/artifacts/task-unity-step-panel.png` / `task-unity-completed.png` / `task-unity-placeholder.png`；**全程 console 0 错误**。**EditMode 71/71 passed / 0 failed**（既有 49 + Addressables 包自带 stub 1 + 新增 `StartupTestSwitchTests` **21**），由 Lead 独立复跑确认。⚠️ 两处单测抓出的真问题已修：`input:enable` 握手前发了（会静默丢失）、`enterTask` 不幂等（会重复发 `scene:enter`）。**未提交**（git 走分支 + PR） |
| 1.41 | **结构件「洋红材质」的真因与打包前自愈**（2026-10-14，DEC-115） | ① **诊断**：负责人报「打 AB 包导致材质 shader 没加载出来」，实测**否掉了这个判断** —— 逐包 `AssetBundle.LoadFromFile`（当前 WebGL 包在编辑器里**能加载**，所以不用重建就能复现）+ **实例化后**读渲染器：只有 `timeRelay`（8 处）与 `masterAppliance`（3 处）的 `sharedMaterials` 为 `null`，另外 6 个器件的 186 处材质**全部解析得到、且 shader 来自包内** ⇒ 「8 个全中」不成立；② **根因**：这两个器件的零件是**嵌套 FBX 模型实例**（外层只存覆盖项，绑定住在 FBX 里），DEC-102/103 的「材质接管」把 FBX 自动抽出的同名 `.mat` 换成了 GUID 不同的材质 ⇒ FBX 内部绑定指向**已消失的 GUID**；③ **为什么会自己回来**（本次最有价值的发现）：对症的 `ImportAsset(fbx, ForceUpdate)` **只落在本机 `Library/`（进不了版本库）**，任何一次「不强制」的全量重导都会打回去 —— 最常见的就是**切换 Build Target**；负责人切 WebGL 时正是如此，而当时打的 8 个包把这个坏状态**原样打进了产物**；④ **修复落地**：新增 `Assets/Editor/Common/ModelMaterialBindingFixer.cs`（`PrefabUtility.LoadPrefabContents` 数空材质槽 → **只在有坏槽时**才强制重导该预制体**依赖树里**的 FBX → 复测；**修不好则中止构建**，绝不产出洋红产物）+ `BundlePipeline` 在 `BuildAssetBundles` **之前**调用它（对账 dry-run 只告警不修，因为那次操作的承诺是不写盘）+ 菜单 `WSU3/Pack/修复模型材质绑定（嵌套 FBX）`；⑤ 文档：`DECISIONS.md` §26（DEC-115）、`design/12` §4.3（含「shader 挪 Resources 无用也无害」的否定结论，与「别直接读预制体资产」的坑）、`TODO.md` D-24 | **字节数铁证**：出问题 8 个包合计 **37,464,472** → 重导 + 重打后 **47,500,295**（+10.0 MB 正是这两个器件找回的材质与贴图），对照 DEC-108 当时的报告 **47,476,797** 几乎一字不差 ⇒ 回到回归之前的正确状态。**逐包复测**：8 个包全部「材质缺失 0 / shader NULL 0」，shader 来源**全部「包内」**（`clip_masterappliance` 4,380,057 B、`clip_timerelay` 7,621,356 B 已带材质）。**重导前后**：timeRelay 0→8 正常、masterAppliance 0→3 正常。两种读法（`LoadPrefabContents` 与 `Instantiate`）在 8 个预制体上**读数完全一致**（11/44/8/3/10/61/41/21 个材质槽）。**EditMode 71/71 passed / 0 failed**。⚠️ **保留负责人的动作**：5 个自制 ShaderGraph 仍在 `Assets/Resources/Shaders/`（实测**无害**：包内仍各自包含 shader 副本；但与 `content/asset-structure-report.json` 记载路径不一致，要挪回是安全的 —— GUID 未变）。⚠️ **未验证**：真 WebGL 产物里的 shader 变体裁剪（`Graphics Settings` 的 `m_PreloadedShaders` 为空、`m_AlwaysIncludedShaders` 只有内置默认项）—— 归到 `TODO.md` D-24。**未提交**（git 走分支 + PR） |
| 1.42 | **真 WebGL 产物上 AB 取包失败 → WebGL 取包路径分开**（2026-10-14，DEC-116） | ① **现场**：负责人用 VS Code Live Server（`127.0.0.1:5500`）打开真 WebGL 产物，报 `[AddrMgr] AB 下载失败：Content/clip_contactor ← http://127.0.0.1:5500/StreamingAssets/Content/clip_contactor（）` + `[TaskFlow] 装包失败…中止`；② **六个探针把范围压死**：那条日志的原因字段是**空串** ⇒ 诊断本身不合格；`HEAD` 该 URL = **200 / 4,201,911 字节 / application/octet-stream**（与工程里逐字节一致）⇒ 不是 404/MIME；`Range` = **206 + Accept-Ranges** ⇒ 服务器没问题；**8 个包字节数与工程完全一致** ⇒ **构建产物是最新的（含 DEC-115 材质修复），不是旧包**；把同一 URL 的字节下回来 `AssetBundle.LoadFromMemory` = **OK**（`magic=UnityFS`、资产名与预制体逐级可读）⇒ **包与字节都没坏**；③ **改法**：WebGL 分支改用 `UnityWebRequest.Get(url)` + `AssetBundle.LoadFromMemoryAsync(bytes)`，不再走带 IndexedDB 缓存的 `UnityWebRequestAssetBundle.GetAssetBundle`（那条在 WebGL 上缓存键就是 URL，同地址换过几次包就会命中旧条目且 `error` 可能为空）；两处失败日志补上 `result` / `http` / `err`；API 均经 `unity_reflect` 核验 | **编译**：`refresh_unity` 后 console **0 error**、`scriptCompilationFailed=False`；`GetBundleUrl("Content/clip_timeRelay")` 实测仍给出 `…/clip_timerelay`（纪律④小写未受影响）；**EditMode 71/71 passed / 0 failed**。**未闭合**：改后必须在**真 WebGL 产物**上复跑一次才算闭合（`TODO.md` D-24）—— 本轮只确证了"包与字节是好的"并给出改法。**未提交**（git 走分支 + PR） |
| 1.43 | **洋红定案：编辑器加载 WebGL bundle 必然退化成 error shader**（2026-10-14，DEC-117，**推翻上一轮两处判断**） | ① **推翻**：上一轮"坏的是 timeRelay/masterAppliance 两个器件"只解释包内材质为 null、解释不了洋红（contactor 11 个材质一直正常却一样洋红）；"`material.FindPass("UniversalForward") == -1` 判缺前向 pass"是**无效探针**（`FindPass` 匹配 pass 名而非 LightMode tag，内置 `URP/Lit` 同样 -1）。② **三条证据链把机制钉死**：洋红截图逐像素 = `(254,0,254)` = error shader 的 `(1,0,1)`；AB 里 shader 的 3 个 pass 名（`<Unnamed Pass 0>`/`DepthNormalsOnly`/`DepthOnly`）与 `Hidden/InternalErrorShader` **逐字相同**、`GetPropertyCount()` 都是 0、`IsPassCompiled` 全 True（而工程那份 9 个 pass 全 False）；**对照实验**：内置 `URP/Lit` 打 WebGL AB 加载后**一模一样**（3 pass、`UniversalForward=-1`），而同一材质打 StandaloneWindows64 AB 则 pass 齐全（我们的 5 个含 `Universal Forward`、URP/Lit 4 个含 `ForwardLit`）。③ **对照实验 3**：按现有配置真跑一次 Addressables（WebGL）产出 79,937 B bundle，加载后仍是那 3 个 pass ⇒ **AA 底层就是 AssetBundle，换 AA 治不了洋红**。④ **落成判定规则**（DEC-117）：编辑器里加载 WebGL 产物看到的洋红**不作数**，验渲染必须用真产物。⑤ 交付侧：负责人随后确认"预制体 / 编辑器运行 / 打包后 Live Server 运行都已 OK" | 全部读数来自编辑器内实测（Unity 2022.3.53f1c1，`activeBuildTarget=WebGL`）：截图 `Assets/Screenshots/play-structure-diag.png` 逐像素直方图（主色 `(254,0,254)`）；AB `Assets/StreamingAssets/Content/clip_contactor` 内 shader 的 `passCount`/pass 名/`GetPropertyCount`/`IsPassCompiled`；对照 AB 见 `Temp/WSU3PassProbe`（临时探针，已删）；AA 对照见 `Library/com.unity.addressables/aa/WebGL/**`。⚠️ 探针与临时资产全部已清理，`git status` 回到负责人原有脏文件集 |
| 1.44 | **内容包全量迁 Addressables**（2026-10-14，DEC-118，**删除 `PackageType.AB` 整条链路**） | ① 删除 `ABPackageConfigSO` / `BundleBuilder` / `BundlePipeline`，新增 `ContentPipeline`（一键编排 + 菜单 `WSU3/Pack/一键打 AA 包（全部）` + 批处理 `BuildAllFromBatch` + 脚本化 `BuildAllNonInteractive`）与 `AaContentBuilder`（建组/清残留/注册条目/构建的唯一落点）；② `AAPackageConfigSO` 承接内容包（新增 `clipId` / `groupName` / `assetKind`，`GetLoadKey()` = address）；`PackageType` 只留 `Default`/`AA`；③ **共享材质单独成组 `WSU3_Shared` 并先于内容组装载**（`AddressableManager.LoadClipRoutine` 先装 `shared_model_materials`）；④ `ContentNaming` 去掉 bundle 命名那套（`BundleNameFor` / 大小写校验），换成 `GroupNameForClip` / `SharedGroupName` / `SharedAddress` / `IsManagedGroup`；⑤ `AddressableManager` 删掉 `LoadFromAB` / `GetBundleUrl` / `m_BundleCache`，同步/异步取件只剩 Default + AA；⑥ 内容包配置目录由 `AB_*.asset` 改为 `AA_*.asset`（9 条 = 8 器件 + 1 shared）；⑦ `EditorAssetUtil` 加 `DeleteAssetsByFilePrefix`（旧类型资产按类型搜不到，只能走文件系统枚举）；⑧ `ignore.conf` 的 `Content` 规则保留防误提交 | **一次构建产出 9 个组 / 27 项资源**，实测字节：`wsu3_shared` **32,921,147**、`wsu3_clip_timerelay` 1,021,328、`wsu3_clip_contactor` **1,441,813**（AB 时代同一个包 4,201,911 ⇒ 材质抽到共享组后显著变小）、其余 6 个 570K~3.9M；包登记表 `PackageDB_Master` = **9 条 / 空引用 0**；**运行期实测**（编辑器 Play，免 Web 自测开关进 Structure）：`[AddrMgr] 内容包已装载：clip_contactor（1 个内容包 + 共享材质包）` → 结构件实例化 → 12 步开始执行，**0 报错**；活体材质读数 `passCount=9`、`pass0='Universal Forward'`、`nullMaterials=0`（对照 DEC-117：AB 时代同一处是 3 pass 的 error shader）。**编译 0 error；EditMode 71/71 passed / 0 failed**。过程中修掉 6 个真坑（一个资源只能一个 address、包配置 id 不能带 `/`、不能读 `BuildPlayerContent` 返回值判成败、no-op 重建不是失败、清残留只清 `WSU3_` 前缀、旧类型资产按文件系统枚举清）—— 详见 `DECISIONS.md` §28.2 |
| 1.45 | **显隐与动画分家 + 碰撞体闸门 + 动画运行模式**（2026-10-14，DEC-119 ~ DEC-121） | ① **显隐只认两张表**：动画路径里 4 处 `SetActive` 全部删除，`HideAnimations`→`PrepareAnimations()`（只停动画+回 0 帧）、`AnimationStruct.ifHideOnFinish` 字段删除、生成器写它的那段去掉；新增 `IsAnimationVisible` 护栏（隐藏的物体不播并告警 —— Legacy `Animation` 对隐藏物体不推进而"播完"判据是 `isPlaying`，否则该步骤会**瞬间算播完且不报错**）；`StepHandlerEditor` 加"动画物体不在显示表"校验。② **碰撞体闸门**：`ConditionClick` 按生命周期开关 target 自己的碰撞体（`Prepare` 关 / `Waiting` 开 / 完成后关 / `OnReset` 关），只改 `enabled` 不动显隐；新增可空 `targetCollider`（留空则运行期 `GetComponent<Collider>()` 兜底解析并缓存）；`toggleTargetActive` 除接触器 10 处（负责人改）外，其余 7 个预制体 **23 处**批改为 false。③ **动画运行模式**：新增 `StepRunMode` 枚举 + `StepManager.RunMode`（公开可改）/`IsAnimationMode`/`EnterAnimationMode`/`EnterStepByStepMode`；核心是 `ConditionBase.AdvanceWithoutWaiting()`（只让等待循环退出、不碰状态机），`ExecuteStep` 在 `Waiting()` 前调它 ⇒ 其余全按流程走；判据合成 `ShouldStopWaiting`（所有等待口统一认，顺带修掉 `ConditionQuestion` 外层重问循环只认 `forceComplete` 的隐患）；切模式时**立刻放行正在等待的那一步**（否则界面看着像没生效） | **编译 0 error；EditMode 71/71 passed / 0 failed**。**动画模式实测**（contactor 12 步，先切模式再重跑）：`isFinished=True`、**12 个条件全部 Complete / 0 个在等待**、用时 **58.8s**（= 12 段 clip 真实总长）。**碰撞体闸门实测**（Play）：10 个零件的碰撞体全部被关、每个 `ConditionClick.TargetCollider` 都解析到自己的 BoxCollider。⚠️ **预制体改动（显隐表口径 / `toggleTargetActive`）只落在工程资产，真 WebGL 产物要重打 AA 包才带上**（编辑器 Play 走 AA fast mode 读 AssetDatabase，所以立刻生效） |
| 1.46 | **排版稿三维页归队 B 组规范 + 占位画布统一 + 部件名称悬浮提示**（2026-10-15，DEC-122 ~ DEC-130） | 按负责人 2026-10-15 的逐条指示，把 C8~C11（Unity 侧四页）逐项归队、并把占位画布的样式全线统一：① 导航换站点线 `route()`，旧页签栏 `tabs()` 与 `.ui-tabs` 样式**一并删除**（DEC-122）；② 角落 fab 换右上按钮组 `topRight()`，与「简介」页逐值相同（DEC-123）；③ 画布框 `.ui-viewport` 由「占位网格 + 深色实底」改**毛玻璃**（DEC-124），并把"嵌在 `.ui-panel__body` 里不再自画一层"写成规则（DEC-128）；④ 占位叠层 `.ui-viewport__hint` / `__tools` **整体退役**，只在样式成果页留档（DEC-125 / DEC-128）；⑤ 三维页右侧栏回常规面板（DEC-126）；⑥ 补 `statusbar: false`，四页内容区与 C1~C7 等高（DEC-127）；⑦ 布局值定稿并收成令牌 `--layout-3d-top / gutter / gap / bottom` = 150 / 50 / 20 / 20（DEC-129）；⑧ 新增组件 `.ui-parttip`（画布上"部件名称悬浮提示"由 Web 侧画，`pointer-events: none`，DEC-130）。文档：`DECISIONS.md` §29（DEC-122~130）、`TODO.md`（收掉 T-11 / T-14、T-13 收窄、新增 **D-29**）、`ui-mockups/TODO.md` T4。**产品代码零改动**（`web/src` 未动） | **PR #26**（squash 进 main）。本地 pre-commit **五道门禁全过**（大文件 / 壳耦合 / 双端契约 4 组枚举 + 24 条桥消息 / 内容数据双份 / `web` 类型检查 + ESLint + Prettier + **110 passed**）；29 页排版稿 + 成果页已重新生成；**真 Chromium 逐页量取（深浅两套主题）**：九个带画布的页面网格归零且均带 `blur(16px) saturate(1.45)`、C8~C11 的 `statusbar / hint / tools` 均为 **0**、布局 `padding: 0px 50px 20px` + `gap: 20px`、内容高 **612 → 637（与 C6 逐值相同）**、`.ui-parttip` 实测底 `rgba(20,29,41,.78)` / `border: 0` / 圆角 8px / 主名 14px。⚠️ 上游 hover 消息尚不存在（`TODO.md` D-29），故该组件当前只落在排版稿 |
| 1.47 | **桥契约三处同批：`scene:parts` + `object:hover`，收掉 D-29**（2026-10-15） | 负责人指派「任务1」：① `web/src/contracts/bridge.ts` `FromUnity` 追加 `'scene:parts'` / `'object:hover'`；② `content/contracts/snapshot.json` fromUnity 末两条同步（共 **26** 条）；③ `BridgeMessageType.cs` 加常量 `SceneParts` / `ObjectHover` 并入 FromUnity 数组；④ 载荷形状 `bridge-payloads.ts`：`PartEntry`（key/name/nameEn/parentKey）、`ScenePartsPayload`、`ObjectHoverPayload`（key + 归一化 x/y）、`PartNode`、`PartHover`；⑤ `docs/design/02-bridge-protocol.md` 时序图 + §3.2 消息表补两行（口径：parts 装配后报一次、hover 只在变化时报 + 限频、空串 key = 移出）。**配套实现**：`web/src/domain/part-tree.ts` 树组装纯函数（缺父/自环/成环断第二回边/空键防御）+ 6 测试；`UnitySession.ts` 读包（防御式 + 坐标夹 0~1）与状态清理 + 出站 `focusPart()`（`view:focus`）；`registry.ts` 加 `kind: 'structure'`；新组件 `BridgeStatusPanel.vue` / `UnityViewportPanel.vue`；`TaskView.vue` structure 分支（左视口 + 右部件树 + `.ui-parttip` 悬停浮标） | `node tools/check-contracts.mjs` 通过（枚举 4 组、桥消息 26 条三方一致）；五处落点逐条 grep 可见；**typecheck / lint / format 全过，vitest 122 tests / 10 files 全过** |
| 1.48 | **收掉 D-12：排版稿生成器 `.ui-alert__icon` 坏拼接修复**（2026-10-15） | `pages-ab.mjs`（A7/A8/A9 等 **4** 处）+ `pages-d.mjs`（D1/D3 **2** 处）的 `<span class="u${icon('info', 14)}-alert__icon">i</span>` 统一改为 `<span class="ui-alert__icon">${icon('info', 14)}</span>`（写法与 DEC-101 修 A2 时一致，兜底文字 "i" 不留）；`style-spec.mjs` 3 处实测已是正确写法（D-12 记载的"5 处"含它已过期，实际坏点 **6** 处） | `node docs/ui-mockups/src/render.mjs` 重新生成 29 页 + index.html；全库 grep `u${icon` 归零 |
| 1.49 | **收掉 D-06：四份 README 分册按新口径逐个核对**（2026-10-15） | `web/` / `electron/` / `content/assets/` / `unity/builds/` 逐份通读。**旧口径标记（"未闭合见 `DECISIONS` 末尾表" / 13 个 GLB / `http.server 5280`）四处均已不存在**（D-06 记载的疑点全部过期）。修掉三处**事实性过期**：① `web/README.md` 冒烟断言数 39 → **64**（数 `render-smoke.mjs` 的 `check(` 调用）；② 同文件「未完成」首条改为"步骤面板已落地（DEC-112）+ `.ui-parttip`（DEC-130 / `scene:parts` / `object:hover`），仍未做的是 Unity 侧初始化（D-13 / D-21）"，包体一条去掉过期的"39.6 MB"总数、改指 `TODO.md` D-10 明细；③ `electron/README.md`「还没做」首条与 §打包（DEC-77）自相矛盾 → 改为"portable exe 已能出，剩安装包形态 / 图标 / 正式签名"。另把 `web/README.md` 测试行口径补上 Unity 会话 / 部件树。`content/assets` 与 `unity/builds` 两份核对为最新口径、未动 | 四份逐一通读 + 全库 grep 三个旧口径标记均 0 命中；断言数以 `Select-String` 统计 `^\s*check\(` = 64 为准 |
| 1.50 | **收掉 D-01 / D-02 / D-23：三条已完成/过期条目的核验清账**（2026-10-15） | 逐条对代码核验后从 `TODO.md` 删除：① **D-01**（"产品侧资产链未实现"）已过期 —— `web/vite.config.ts` 的 `assetsBuild()`（`apply: 'build'`）把 `three` / `video` 两棵树连同三张 `_meta` 表拷进 `dist/assets/<树>/**`，与 `content/assets/README` 规则 3、"web/README §大资产"一致；② **D-02**（"取图链未实现"）已过期 —— `web/src/viewer/scene-assets.ts` 运行期读 `/assets/three/_meta/material-textures.json` 并把仓库路径重写为 `/assets/three/**` 产物 URL（有 `scene-assets.spec.ts` 锁行为）；③ **D-23**（重打内容包）条目本身记载 2026-10-14 夜已按 AA 口径重打（9 组 / 27 项资源，DEC-118），"改预制体要重打"的常备提醒已含在 D-24 前置里。**本轮无代码改动，纯核验清账** | 证据：`vite.config.ts` L210-256（assetsBuild + meta 拷贝）、`scene-assets.ts` L91-98（查找表读取与 URL 重写）、`scene-assets.spec.ts` L65（产物 URL 断言）；三行均已从 `TODO.md` §2 删除 |
| 1.51 | **真 WebGL 联调打通 + 桌面 exe 打包**（2026-10-15，结构任务桥全链路第 5~6 条收尾） | ① **EditMode 78 条全过**（负责人实机确认；新增 `ScenePartInventoryTests` 5 条 + 出站契约闸扩到 12 条）；② **真 WebGL 构建打通**：修 `WebGLBaselineBuild`（场景列表还写着 `SampleScene.unity` —— 场景重组后已不存在，构建直接 Failed；改为 `0_Setup` + `1_Content`，且 `EditorApplication.Exit(1)` 只在批处理模式生效 —— 交互模式下它会把整个编辑器退掉）、AA 产物曾随 Library 清理丢失需重打（9 组）；③ **dev 真产物联调发现并修掉三个问题**：`UnityLoader` 创建的 canvas 没有 `id` → 真框架 `jsCanvasSelector()` 拼出 `' #'` 选择器抛 SyntaxError → `main()` 中断（**桩构建不走这条真框架路径，冒烟测不出**）；`.app-viewport` 的 `flex:1` 在 block 父级失效 → 画布被 `min-height` 压成 220px 一条（补 `.ui-panel__body > .app-viewport { height: 100% }`）；`TaskView` 漏导入 `LoaderCircle`；④ **桌面包打通**：`pack.mjs` 全链（unity-stage 校验 → web 构建 → release-manifest → electron-builder）产出 `WSU3-Shell-0.0.0-portable.exe`（Unity 131.9 MB 内含）。⚠️ 遗留：真 Unity 的 `scene:parts` 在 dev 实测未到页面（部件树 0 行），悬停/部件树的真机验证进行中；新增 `TODO.md` D-30（Unity 启动时机前移到 start/login/menu，负责人指示） | PR #27；真 Unity 挂载实测：模型渲染、握手/资产/可交互全绿、步骤 2/12 推进、画布 942×679 铺满（Playwright 实测读数） |
| 1.52 | **待拍板批量收敛：17 条 → DEC-134 ~ DEC-146，可实施的当场落地**（2026-10-15） | ① **决策入档** `DECISIONS.md` §31：影棚 HDRI 固化 / 材质常数 m=0·r=0.5·移除 doubleSided·不另出 ORM / SpeedRelay01→Coat / 原理页**进入即完成** / 进度分母统一站点线口径 / 挂载根维持自动建（查证 `1_Content` 无预摆节点，与负责人"已有节点"口径不符已反馈）/ 页面样式逐页调整 / TODO 只留"未确定+明确要做" / 材质解算各一份 / RendererFeature 已挂（实测三份 URP Renderer 各 1 处）/ 相机 brain **文件实测未检出**（与负责人口径不符，待 D-21 实机核对）/ 动画 Web 入口暂缓 / AB 残留移除 / **D-30 口径修正：单实例常驻**（启动后 JS 控制搬挂载点或隐藏，吸收进 D-25）/ 零件命名来源 = 低压电器项目。② **实施**：T-02（`ModelStage.ts` + `model-preview/materials.mjs` 两份同批：常数钉死 + 一律 FrontSide，`scene-assets.ts` 删 doubleSided 字段）；T-04（`asset-material-spec.json` 两处 SpeedRelay01 → SpeedRelay_Coat）；T-08（`TaskView` 进 Principle 站即 `progress.complete`）；T-09（`TaskView` 徽标分母改 `projectProgress` = 当前项目启用任务数，弃全局 11）；**D-15**（新 `tools/pipeline/fill-part-names.mjs`：按 GameObject 名从 `Low-voltageElectricalSimulationSoftware` 搬 `structureName/En` → **34/38 处已填**）。③ **TODO 清理**：§1 只剩 T-06（暂缓）；§2 删 D-07/09/18/19/27/28/30 | 门禁：typecheck / lint / format / vitest 122 / smoke 71 全过。**遗留**：D-15 剩 timeRelay 4 处（部件挂在嵌套预制体实例上，名字要另查 PrefabInstance 指向）与 masterAppliance（源工程本就没填）；填完需重打 AA 才进真产物；D-28 删除命令待负责人批准执行 |
| 1.53 | **D-28 / D-15 收尾：AB 残留已删、零件名 38/38 全填**（2026-10-15） | ① **D-28（DEC-144）执行**：删除 `Assets/StreamingAssets/Content/**`（16 文件 / 45.3 MB）与孤儿 `Content.meta`；`Data/**`（内容 JSON 双份之一）保留；② **D-15 全量完成**：timeRelay 的 4 个部件挂在本文件内**数字名 GO** 上（名字 join 失败的根因），但两侧预制体**同源搬运、GO fileID 一致** —— `fill-part-names.mjs` 增加 fileID 兜底索引后填上（衔铁/Armature、瞬时触点/Instantaneous contact、线圈/Coil、铁芯/Core）。至此 **38/38 全部有值**、空值 0、YAML 无粘连；masterAppliance 源工程本就无 StructureObj 部件（口径一致，无需填）。dry-run 复现验证：0 新填、0 未匹配 | 逐预制体统计 `objName: "` 38 处、空值 0、块头粘连 0；`--dry` 全表跑一遍（"已有值不覆盖"路径全走通）。⚠️ 预制体已改，**真 WebGL 产物需重打 AA**（`WSU3/Pack/一键打 AA 包（全部）`）后再走 unity-stage / pack |
| 1.54 | **D-22 修复 + D-25 单实例常驻实现 + 待办迁 GitHub Issues**（2026-10-15） | ① **D-22**：新建 `CapsuleDefault.mat`（URP Lit，同 Block.mat 模板），把 FirstPersonController.prefab 里那条继承性断链 guid（73c176f4…，全工程仅此一处引用）替换为新材料；② **D-25（DEC-145）落地 Web 侧**：新增 `UnityHost.ts`（常驻实例单例：幂等创建 / 停泊区隐藏 / `attachTo`·`detach` 只搬 DOM 不 Quit）与 `unity-bridge-instance.ts`（桥模块级单例，实例创建成功立刻 attach —— 握手不丢）；`UnitySession` 构造时"桥已握手"立刻补发 onHandshake（app:init 不丢）+ 新增 `resume()`（`runtime:resume`）；`TaskView` 挂/卸载改为"挂靠 / 摘靠"（离开任务只发 `scene:exit` + 搬回停泊区，**不再销毁实例**）；`MenuView` 挂载时预载（清单缺失则静默跳过）；③ **待办迁 GitHub Issues**（DEC-147）：#30~#42 共 13 条（TODO 表 / PLAN 计划项 / PAGE-WORKLIST 整表），`TODO.md` / `PLAN.md` / `PAGE-WORKLIST.md` 改为指针 stub（PLAN 保留 §3 纪律速查）；`AGENT.md`（§1/§3/§4/§5）与 `docs/README.md`（v12）改写为"计划待办在 Issues、记录决策在仓库" | 门禁：typecheck / lint / format / vitest 122 / smoke 71 全过。**待真机验证**：换任务不重载、回任务直接可交互、预载时机（Issue #38） |
| 1.55 | **scene:parts 真机 0 部件根因修复 + D-26 根治脚本**（2026-10-15，PR #43） | ① **scene:parts 0 部件根因**：`StructureTaskManager.cs` 被编辑器旧缓冲**整体覆盖回 PR #25 版**（与 StructureObj 同坑），`PublishSceneParts()` 调用消失 —— 字节级验证（构建 data 含 ScenePartInventory 类但无该方法与日志串）后重新应用并提交（055e734）；新构建无头实测 **`[Structure] 已上报部件清单：10 条`、部件树 10 行中英文名、点行 `view:focus` 高亮 ACContactor06**；② **D-26 根治**：`import-structure-assets.mjs` 材质接管改**嫁接口径**——目标 .mat 已存在时**不覆盖 `.meta`（GUID 保留 → FBX 内部绑定不断）**，只把源材质 `m_Shader:` 之后的 shader/关键字/SavedProperties 移植进目标文件（`graftMaterial`，结构不合退回整体覆盖）；夹具单测通过、dry-run 跑通（现有资产先前已被整体覆盖、GUID 与源相同而走"已跳过"路径，嫁接只影响新抽取场景——正是"切 Build Target 退化"的靶点）。RuntimeResume 订阅者（TaskFlowManager）确认在位 | PR #43（未合并，等真机验证）；Issue #37 已回写根因与验证结果 |
| 1.56 | **D-25 / D-15 / scene:parts 真机验收通过**（2026-10-15，负责人实机 exe 确认） | 三条全过：① 菜单预载生效，进任务**无加载进度条、无 Unity 启动画面**，直接可交互；② 任务间来回切换**不重载**（单实例常驻 + 搬挂载点）；③ **部件树显示零件中文名 + 悬停浮标**正常（scene:parts 10 条 → 10 行）。D-25 关闭（Issue #38）；Issue #37 的结构新协议部分闭合，剩"46 步逐条全走"留待日常使用中覆盖 | PR #43 merge；无头预验 + 实机双重确认 |
| 1.57 | **A4 画质 / 首次设置落地**（2026-10-15，PAGE-WORKLIST A4 / Issue #30 第一批） | 新组件 `QualityDialog.vue`：三档卡片（标清/高清/超清，图标+标题+描述+推荐）+ 移动端硬件提示（`detectDevice`，DEC-70 只提示不阻拦）+「使用推荐值」（移动端→标清、桌面→高清）。两个挂出来源：**首启**（`App.vue` 在 `settings.qualityChosen === false` 时挂出，跨页面一次性输入放根组件）与**右上「画质」按钮**（AppShell 的死按钮接活）。确定后 `chooseQuality` 写本机存档（progress 新增 `settings.qualityChosen` + `chooseQuality` + `settings` computed），Unity 在线时同步发 `ui:set-quality`（超清对 Unity 归 high，`device.unityQualityOf`）；TaskView 会话的 `qualityProfile` 改从存档读。冒烟新增 4c 节 2 条断言（首启弹窗三档卡片 / 使用推荐值写存档），种子策略改"仅缺失时播种"；过程中踩坑：**hash 导航不重载页面**，验证首启态必须真 `reload` | 门禁：typecheck / lint / format / vitest 122 / smoke 73 全过（71+2） |
| 1.58 | **原理视频移除下载按钮**（2026-10-15，Issue #47） | `TaskView.vue` 的 `<video>` 加 `controlslist="nodownload"`；冒烟新增断言「原理页：播放器不带下载按钮」 | **PR #50**（squash 进 main `d3f058c`）；门禁 vitest 122 全过、冒烟新断言 PASS、全程 console 0 错误；Issue #47 随 PR 关闭 |
| 1.59 | **站点线顺序改按来源工程装配顺序**（2026-10-15，Issue #48，DEC-148） | 查证来源工程（只读）`ProjectData.cs` `ProjectClip.Tasks` 的装配顺序 = 简介→结构→原理→检测→（旧线）目的→仪器→连接→仿真→测验→考核；`adopted-content.ts` 新增 `TASK_PRESENTATION_ORDER` 并用于 `toContentProject`（契约 `TaskType` 序号不动，仍是协议权威）；单测 3 处顺序断言改写 + 新增"呈现顺序 = 契约槽位排列"防回归项；冒烟顺序断言实测 `简介/结构/实验原理/检测`；文档同批：`DECISIONS.md` 追加 DEC-148、`design/08` 口径改写、各处"契约顺序"注释同步 | **PR #51**（squash 进 main `63532e1`）；门禁 vitest **123** 全过、冒烟全过、本地 pre-commit 五道全过；Issue #48 随 PR 关闭 |
| 1.60 | **Unity WebGL 透明背景调研报告**（2026-10-15，Issue #49） | 新增 `docs/research/11-unity-webgl-transparent-background.md`：官方口径（2022.3 / Unity 6 **均无透明开关**，官方扩展点=自定义模板 + browser scripting）；社区"三层全通"配方（相机 alpha=0 + 模板 canvas 透明 + 宿主不遮盖）；**后处理写死 alpha 是最大杀手**（本项目结构任务未开后处理卷，暂无影响）；Linear 色彩空间与 `file://` 禁 alpha 坑；本项目现状盘点（相机/模板/加载器三处差距）与三条候选路线（A 真透明 / B 背景板贴图=接 D-20 / C jslib 兜底），验收口径 = 真产物（DEC-117）；`docs/README.md` 索引补条目 | **PR #52**（squash 进 main `b25dbbe`）；门禁全过；Issue #49 关闭（方案待拍板后另开实现 Issue） |
| 1.61 | **页面底图落地（外壳铺满）**（2026-10-15，Issue #44，DEC-149） | 把排版稿那张底图铺进产品：图 `web/public/bg/room-dark.jpg`（1920×1080 / 123KB，RGB×0.5 已烘焙，与 `docs/ui-mockups/assets/` 同一张）；`product.css` 的 `.app-root` 两层叠（**面纱令牌** `--board-veil` + 照片 + `--bg-0`），产品里**不用 `::after`**（绝对定位层会盖到面板上）；深浅主题都由令牌决定（深色不加纱 / 亮色 42% 白纱），与排版稿 `mockup-shell.css` 同口径；规则写进 `design/07` **§9**，成果页新增**第九节**深浅两档对照 | **PR #54**（squash 进 main `445f189`）；重新生成 29 页排版稿 + 成果页 **只有 index.html 变动**（零漂移）；冒烟新增 2 条断言（`页面底图已铺` / `底纱走令牌`）PASS、单测 123 全过、pre-commit 五道全过；Issue #44 随 PR 关闭 |
| 1.62 | **应用图标（矢量源 + 脚本生成）**（2026-10-15，Issue #45，DEC-150） | 新增矢量源 `electron/assets/app-icon.svg`（深色圆角方 + 插头闪电，图形取自产品已在用的图标库 `lucide-vue-next@1.0.0` 的 `plug-zap`，**ISC 许可**，版权声明按规保留在 DEC-150）；生成链 `web/tools/make-app-icon.mjs`（`npm run icon`，用 web 侧**已有 Chromium** 光栅化 16/24/32/48/64/128/256 → ICO（PNG 负载）+ 512 PNG，**不新增依赖**）；接线 `build.win.icon` + `BrowserWindow({ icon })` + 打包 `files`；`electron/README.md` 新增「应用图标」一节并改掉两处"图标还没做" | **PR #55**（squash 进 main `c322c13`）；**三重验证**：ICO 结构（7 条目全是合法 PNG 负载 / 30,292 字节）、Electron `nativeImage` 读回 `256x256 非空`、**`electron-builder --dir` 产物 exe 里提取出的 32×32 图标就是它**（肉眼核对）；Issue #45 随 PR 关闭 |
| 1.63 | **结构站画布透明落地：三台相机 + 层隔离 + 工程设置 + 文档拉齐**（2026-10-15，DEC-151 ~ DEC-156，Issue #58） | ① **相机分工定案为三台**（预制体由负责人手工接线）：主相机回到"渲染到屏幕 + 交互"（无 RT、掩码 `55`）；新增子对象 `ColorCamera` 做**颜色路**（`Color` RT 1920×1080、掩码 `183`）；`AlphaCamera` 只出 alpha（`Alpha` RT、掩码 `128`）；② **层隔离**：模型层改 `ShowObj`(7)，层 6 = `NoRender` ⇒ 那 6 个 `Cube` **有意不渲染**（原 `design/13` §7.4 的待确认项就此定案）；③ **脚本侧**：`CameraManager` 新增 `GetColorCamera / GetPickCamera`（`GetRgbCamera` 转发）、**后处理策略落点改颜色相机**（`ApplyPostProcessingPolicy` / `SetColorCameraPostProcessing`）、`GetMainCamera()` 兜底"另一台 MainCamera 相机的后代"（**`ColorCamera` 从主相机继承了该标签**，旧口径会把它 `DestroyImmediate` 掉 ⇒ 颜色路整条断）；`InteractiveManager` 换拾取相机 + 视口坐标；④ **工程设置**：三份渲染器资产 `IntermediateTextureMode: Always → Auto`、WebGL 明确 OpenGLES3 + 关 GraphicsJobs、当前质量档 `Low → High`；⑤ **文档拉齐**：`design/13` 整篇按三台相机改写（原稿"两台相机 / 主相机就是颜色路"已与定案相反）、`DECISIONS.md` 追加 **DEC-155 / DEC-156**（原 DEC-151/152 条目**不改**，口径更正由新条目承载）、根 `README` §1/§3、`docs/README` 索引行、`design/06` 的"本仓当前值"对账（补 `preserveFramebufferAlpha = 0` 实测值与质量档，标出两处**本地自测态**）、`TODO.md` stub 时效说明；⑥ **web**：新增 `tools/verify-unity-transparency.mjs`（`npm run verify:unity`）与 `tools/lib/png-stats.mjs`（从 `render-smoke.mjs` 抽出，净 -85 行） | **PR #61**（squash 进 main `cddf798`）；CI 两门禁 pass（**Web 构建与渲染冒烟 1m18s / 契约与资产门禁 8s**）；本地 pre-commit 五道 + web `lint` / `format:check` / `typecheck` / **vitest 123** 全过；Unity 编译 **0 error**（`scriptCompilationFailed=False`，反射确认新 API 在 `WSU3.Core` 里、旧名已不存在）；16:25 那份真 WebGL 产物**重新暂存**（37 文件 / 86.6 MB，`unity-verify` 通过），dev 服务实测 `included=true`；**Issue #58 随 PR 关闭**（回执与遗留见该 Issue 评论）；⚠️ 真产物逐条验收（§8）仍未做 |
| 1.64 | **拾取口径修复：出画面的相机 + 归一化视口坐标**（2026-10-15，DEC-156） | 负责人报"structure 类型在 Unity 里点击好用、在 web 里点击无效、移入也没有高光"。**根因**：**挂了 `targetTexture` 的相机，`pixelWidth/pixelHeight` 等于 RT 尺寸**（不是画布尺寸）⇒ `ScreenPointToRay` 按 RT 尺寸折算屏幕像素。编辑器内三组实测（fov 42，画布按浏览器实测的 942×679 代入）：旧结构（主相机挂 1920×1080 RT）**画布正中偏 `20.59°` 且指到左下**；主相机（无 RT）+ `ScreenPointToRay` 正中 `0°` 但 `uv.x=0.25` 偏 `3.93°`、`0.15` 偏 `5.09°`；**颜色相机 + `ViewportPointToRay` 逐点 `0°`**（改后口径）。**"在 Unity 里点击好用"是假象**：Game view 实测恰好 1920×1080 = RT 尺寸 ⇒ 两种写法都退化正确，这条只会在真产物 / 非 16:9 画布上暴露；悬停与点击共用同一条射线，两个症状才会一起出现。落点：`CameraManager.GetPickCamera()` + `InteractiveManager.RaycastTarget()`（相机**没挂 RT** 时两写法等价 `0.00°` ⇒ 对其它任务类型零行为变化） | 三组探针读数（编辑器内 `execute_code`，临时相机建在预览场景、每次 `activeSceneDirty=False`，未污染负责人打开的场景）；口径与读数写进 `design/13` §2.4 / §4.3 与 `DECISIONS.md` DEC-156；**同批收尾读盘另发现两处不一致并开 Issue**：**#59**（`webGLCompressionFormat` / `insecureHttpOption` 是本地自测态、与 `design/06` §1 的交付值不符）、**#60**（dev/暂存清单缺 `treeSha256` ⇒ 加载器拼不出 `?v=` ⇒ 浏览器按 URL 命中旧 `.data`）；另把 `preserveFramebufferAlpha` 实测 `0`（与 DEC-153 记载不符）写进 `design/13` §5.1 / §7.9 作**待验** |
| 1.65 | **页面 / 站间过渡：淡入淡出落地**（2026-10-15，Issue #57，DEC-157） | 负责人："页面切换需要过渡效果，现在都是瞬切，增加一个淡入淡出效果"。① **两处过渡、一套节奏**：路由级 `ui-page`（`App.vue` 的 `<router-view>`，`out-in`，只淡入淡出）+ 站间级 `ui-station`（`TaskView` → `AppShell` 的 `.app-main__body`，同节奏 + 6px 位移）；节奏只认令牌（`tokens.css` §22：`--dur-page` 160ms / `--ease-page` / `--page-shift` 6px），类名与用法在 `components.css` §22。② **外壳新增两个 prop**（`transition` / `transitionKey`）并包裹主内容区：包裹层 `.app-main__body` **故意不定位**（`.ui-tips-float` / `.ui-mask` 的定位祖先必须仍是 `.app-main`），只补 `height: 100%`；这样页面模板不必为动画套一层包裹（否则每个页面整文件重排缩进）。③ **Unity 画布红线**：新 `domain/page-transition.ts` 的 `stationKeyOf()` —— **Unity 站共用一个恒定 key**（结构/检测/电路连接/仿真实验之间不换 key）⇒ 不触发过渡、不重建 DOM、常驻画布（DEC-145）原地不动；非 Unity 站逐站一个 key；跨栈翻站必然过渡。④ 「减少动态效果」交给 `components.css` §20.6 的**全局**媒体查询兜底，令牌不另给一份。⑤ 成果页新增"页面过渡"一节（同一对令牌的循环动画演示，演示件在评审外壳 `mockup-shell.css`）。<br>⚠️ **过程中踩到并改掉一个真坑**：站间过渡一开始用了 `out-in`，而 `out-in` 会把新内容推迟到离场结束（160ms）之后才创建 —— 任务页的挂载逻辑是「`watch` → `nextTick` → 往模板 `ref` 容器挂视口」，于是**Unity→Three 切回时画布重建失败**、**原理页卡在"载入中"**（冒烟两条既有断言当场红）。改法：两份短暂共存 + **离场层脱流**（`.ui-station-leave-active { position:absolute; inset:0; pointer-events:none }`）的交叉淡入淡出；依据是 Vue 源码 `unmount()` 同步置空 `ref`、新 `ref` 排 post-flush ⇒ 同一 patch 内"先卸旧后挂新"后 ref 指向新元素 | **门禁全过**：`typecheck` / `lint` / `format:check` / vitest **132（130 passed + 2 skipped）** / 构建；`npm run smoke` **全过**（含新增第 8 节 11 条断言：路由级只播 `ui-page-*`、站间播 `ui-station-*` 且不混 `ui-page-*`、**Unity ↔ Unity 翻站零过渡类**、翻站后仍是**同一块画布**（`dataset` 标记比对）且回到视口内、时长等于令牌 `160ms`、`prefers-reduced-motion` 下压到 <0.01s、包裹层 `position: static`）。重新生成排版稿：**只有 `index.html` 变动**（29 页零漂移）。<br>⚠️ **CI 首轮红了、并因此修好一类真问题**：`gate` 的冒烟步骤在 GitHub 上只给出 `exit code 1`（job 日志要仓库权限，check-runs API 看不到读数），所以先给冒烟加了**注解**出口（失败断言与中断各发一条 `::error`，见下）—— 一跑就看清是**两条既有断言**被过渡挤掉了余量：`欢迎页：主视觉与主按钮存在`、`登录页：提供游客入口`（`waitForTimeout(400)` 而过渡要 320ms，慢 runner 上读到的还是上一屏）。修法不是加 sleep，而是**过渡感知的等待**：新增 `settle(page)`（先等过渡出现、再等它收干净；hash 路由的 `push` 是异步的，只等"类消失"会把 `#/login` 误读成 `#/start`）与 `quiet(page)`（装过渡探针前先收干净，避免把上一屏的离场层记进这一轮 —— 这一条本地复现过一次假红）；四处"点完读页面"的固定等待改为 `settle()`。⚠️ 过渡类型与时长**待负责人拍板**（Issue #57 原文要求），暂按"淡入淡出 + 极短位移"实施 |
| 1.66 | **结构站画布透明需求撤销：回到单个 `MainCamera`**（2026-10-15，DEC-158，Issue #64） | 负责人："原本是为了 Unity WebGL 在 Web 页面中可以透明，我们现在不要这个需求了 ⇒ 一个 MainCamera 就可以了，Canvas / RawImage 什么的都移除掉"。① **Unity 资产**：`Resources/MainCamera.prefab` 删 `ColorCamera` / `AlphaCamera`（只剩一台：tag `MainCamera`、掩码 `55`、无 `targetTexture`、清屏回预制体原值 `Skybox`）；`1_Content` 删 `OutputCanvas` + `RawImage`；删 `Color` / `Alpha` 两张 RT + `AlphaComposite.mat` + `Assets/Shaders/UI/` 三份合成 shader（含空目录与 `.meta`）；**层隔离撤销**（8 个结构件预制体 **207 个对象** `m_Layer: 7 → 0`、`TagManager` 去 `ShowObj` 名 —— 层 6 `NoRender` 保留，那 6 个 `Cube` 仍有意不渲染）；`0_Setup` 删掉透明期为常驻主相机加的 `m_ClearFlags = SolidColor` / `m_BackGroundColor.a = 0` 覆盖项。② **脚本**（按 `cddf798^` 精确回退 6 个文件）：`CameraManager` 回到只有 `Init / OnDespose / GetMainCamera`（删取相机入口 + 后处理策略 + "另一台 MainCamera 后代的兜底"）、`TaskFlowManager` 去两处 `ApplyPostProcessingPolicy`、`InteractiveManager` 拾取回 `GlobalManager.MainCamera` + `ScreenPointToRay`（DEC-156 的归一化视口写法不再需要：单相机不挂 RT 时两种写法等价）、`InteractiveObjBase` / `ConditionClick` 注释、`WSU3.Core.asmdef` 去 `Unity.RenderPipelines.Universal.Runtime`。③ **文档**：删 `docs/design/13`（原文留 git 历史 `cddf798`）、`docs/README` 索引行、`design/06` 的 `preserveFramebufferAlpha` 行，`README` §1/§3 改写；`DECISIONS.md` 追加 **DEC-158**（原 DEC-151 ~ DEC-156 **不改**，撤销由新条目承载）。④ **web**：删 `tools/verify-unity-transparency.mjs` 与 `npm run verify:unity`（`tools/lib/png-stats.mjs` 保留，`render-smoke` 仍用）。⑤ **保留不动**：渲染器 `IntermediateTextureMode = Auto`、WebGL 明确 OpenGLES3 + 关 GraphicsJobs、质量档 `High`；`0_Setup` / `1_Content` 的环境（`AmbientMode` / 天空盒）⇒ **三维区背景口径另开 Issue #65**；真 WebGL 产物**未重出**（并入 #59 的交付态）。⑥ 过程中发现 `Assets/AddressableAssetsData/link.xml`（AA 生成物）被 Unity 侧操作一并删掉，已按会话开始时的状态还原（内容 = AA 构建产物里的同一份）并在 Plastic 侧重新纳管 | **PR #66**（squash 进 main `f0e302a`）；CI 两门禁 pass（**契约与资产门禁 7s / Web 构建与渲染冒烟 1m33s**）；本地：Unity 编译 **0 error**、**EditMode 78/78**、预制体实测 **1 台相机 / 掩码 `55` / 无 RT**、8 个预制体层 7 对象计数 **0**、`ShowObj` 层名 `-1` / `NoRender` 仍 `6`；仓库四道门禁（契约 / 内容数据双份 / 大文件 / 壳耦合）通过，`unity-verify` 通过（**本机当前没有暂存产物 ⇒ 按"未包含"报告，不失败**）；web `lint` / `format:check` / `typecheck` / vitest **132（130 passed + 2 skipped）**；**Plastic cs:28**（`cm ci --all` 同批带上工作区既有 AA 生成物，`cm status --all` 复核只剩工作区标题行）；**Issue #64 随 PR 关闭**，Issue #34 留了口径更新回执（拾取/相机两项撤销，D-13 的"相机就位 / 闸门高亮"与 D-21 实机验收继续留着） |
| 1.67 | **Web 主题同步到 Unity + 结构站三维区背景口径定案**（2026-10-16，DEC-159 / DEC-160，Issue #69 / #65） | ① **契约**：新桥消息 `ui:set-theme`（Web→Unity 组末尾追加，载荷 `{ theme: "dark" \| "light" }`），三处同批，桥消息总数 27 条；取值两侧各留镜像常量（`bridge-payloads.ts` 的 `BridgeTheme` ←→ 新增 `Contracts/ThemeKind.cs` —— 放 Contracts 是因为消费端 `CameraBg` 在 Core，Core 不能引用 Web 层）。② **Web**：`UnitySession.setTheme()` 幂等 + **握手前只记不发、握手后补发**（Unity 侧材质默认深色板，亮色页面不补发会看到反色）；触发点用现成 `theme` ref，`TaskView.vue` watch + 挂载补一次，`shell/theme.ts` 零改动；单测 +3。③ **Unity**：`WebBridgeBehaviour.Dispatch` 新 case → `EventBus<ThemeChangedEvent>` → `CameraBg.ApplyTheme()` 换 `sharedMaterial` 并同步自身缓存的 `material`；认不出的主题 / 缺材质**只告警**、保持原材质；EditMode +1。④ **材质**：新增 `Assets/Materials/Background/CamBgGradientLight.mat`（中心 `#f8fafc` / 边缘 `#cfd8e3`，取页面亮色令牌 `--bg-2` / `--bg-0`），两枚材质走 **prefab 序列化引用**。⑤ **背景口径（DEC-160）**：三维区背景 = 相机子物体 `BgPlate`（内置 Quad，local `z = 10`，不透明 unlit 径向渐变板）；"距离 10"的依据为 **Play 实测** —— 取景由**器件预制体自带的 Cinemachine vcam** 决定（8 个结构件预制体同为 local `(0, 1.08, -4.66)`，priority 10），相机到模型 ≈ **4.78**，模型沿视线 4.46 / 5.20 ⇒ 板子在模型**后面**约 5 个单位，不挡模型（截图核对）。⑥ **顺带更正**：`docs/design/11` §5 的"未检出 `CinemachineBrain`"改为实测结论（预制体按 GUID 存脚本，按文本搜字样必然 0 命中）；`README` §3 修正 DEC 范围与设计文档篇数两处漂移。**范围外**：主题切换**入口**（产品现状 `toggleTheme()` 无调用方）；本次不新增样式令牌/组件类，故 `docs/ui-mockups/index.html` 无需变动。**仍开放**：#65 第 2 问（页面是否给视口铺底色）与第 3 问（与 #59 交付态的关系），已写进 DEC-160 的"仍开放" | **PR #70**（squash 进 main `579e376`）；CI 两门禁 pass（**契约与资产 11s / Web 构建与渲染冒烟 2m2s**）；本地 hook 五道全过；`check-contracts` 27 条三方一致；Unity **EditMode 79/79**；**Play 实测**：`切换前=CamBgGradient` → 收到 `light` → `CamBgGradientLight`，再收未知主题 `high-contrast` ⇒ 材质不变且 Console 只有一条告警；web `lint` / `format:check` / `typecheck` / vitest **135 passed** / `build` 全过；Plastic **cs:31 → cs:32**（同批 20 项，注释中文正常）；Issue #69 / #65 随本次关闭 |
| 1.68 | **Issue 批量收口：D-13 关闭 + D-20 / D-21 两条"不做"**（2026-10-16，DEC-161 / DEC-162，Issue #34 / #35 / #36） | ① **#34（D-13 结构任务初始化）关闭**：复核后三项其实**都在位** —— **相机就位**由**器件预制体自带的 Cinemachine vcam** 决定（8 个预制体同为 local `(0, 1.08, -4.66)`，priority 10，Play 实测相机世界位姿 = vcam 位姿）；**交互闸门** `InputGate` 在位且**已接线**（`TaskFlowManager` 订阅 `input:enable` / `runtime:resume` 设闸门，`InteractiveManager` / `InteractiveObjBase.CanInteract` / `StepManager.Update` / `InputControllerBase` 四处消费）；**高亮初始化**走 `StructureObj.Awake → HighlightInit()`（profile `Highlight`）+ `view:focus → InteractiveManager.OnViewFocus → SetHighlight`。Play 旁证：`[Structure] contactor_structure_model 已实例化并开始执行步骤（共 12 步）`、`已上报部件清单：10 条（scene:parts）`；**真产物上逐条判归 #37**。② **#35（D-20 相机背景板取图入口）关闭：不做**（DEC-161）—— 结构站背景已改**程序化径向渐变板**（DEC-160），双纹理口径无消费方；搬运产物原样留存、`LoadBgTextures()` 保持桩；`design/12` §9 的"背景包"从此**不欠**。③ **#36（D-21 操控层实机验收）关闭：本期不做**（DEC-162）—— **D-19 那半已有结论**（Play 实测 Brain 在位生效、场景内那台 vcam 来自器件预制体；DEC-142 的"未检出"据此更正，原因是预制体按 GUID 存脚本），**D-21 本体未做**（实测场景内 `FocusRotationControl` / `InputControllerBase` 实例数**均为 0**）。④ **#40 保留（不关）**：d StepManager 挂场景**已闭合**（口径改为器件预制体自带步骤子树）、e 成绩体系**未做**（`StepManager.cs:723` `float score = 0f`）、c 连线手感**部分**（`LineConnectBoard` 只把已配对两端画线、线跟随端点，**没有**临时线跟随 / 吸附容差 / 错误提示：`Core/Steps` 搜 `吸附\|容差\|snap\|Tolerance` 0 命中）、f 动画手感复核**未做**。⑤ 文档更正：`design/12` §9 第 1 / 6 条（"背景包遗留"→"有意不做"；"三项未接"→"已闭合"）、`design/11` §5 第 2 条（"没接"→"拍板不做"） | **PR #72**（纯文档）；Issue **#34 / #35 / #36 关闭**（各附核对结论与证据）、**#40 保留**（附复核评论）。备注：本次提交期间工作区里有另一会话在飞的 #60 改动（`web/vite.config.ts` 等），本地 hook 两度被其文件挂住（typecheck、prettier），等其修好后按正常门禁提交，未夹带进本批 |
| 1.69 | **dev / 暂存链补齐产物指纹 `treeSha256`：重建后不再复用旧 `.data`**（2026-10-16，Issue #60） | 负责人报的现象（2026-10-15 实测）：「重新构建 Unity → 重新暂存 → 重启 dev 服务后，浏览器**仍可能跑上一版场景**，要靠清站点数据（IndexedDB）才拿到新包」。**机制（逐段读代码确认）**：`webGLDataCaching = 1` ⇒ Unity 按 **`.data` 的 URL** 把包存进 IndexedDB；加载器 `resolveUrls()` 本来就会拼 `?v=<指纹前 12 位>`，但 `unity-stage.mjs` 写 `unity/builds/manifest.json` 时**没有** `treeSha256` 字段（只有逐文件 `sha256` + `fileCount`/`totalBytes`/`stagedAt`），dev 中间件只是如实转述 ⇒ 指纹拿不到 ⇒ URL 不变 ⇒ 命中旧缓存（`design/06` §3② 那条坑在 dev 链上没被规避）。**落点 = Issue 里的方案 A（暂存脚本补写），并把"算法只有一份"落成模块**：① 新增 `tools/pipeline/lib/tree-hash.mjs` 的 `treeSha256(dir, files, readFileImpl?)`（路径排序 + `update(相对路径)` + `update(单文件 sha256)`，与 `pack.mjs` 的 `treeHash` **逐位一致**）+ `node --test` 单测 9 项（确定性 / 改一字节即变 / 增删文件即变 / 入参顺序无关 / 路径参与身份 / 与 pack 口径同值）；② `unity-stage.mjs` 每个 build 条目写 `treeSha256`（字段上写明"这是 `?v=` 的唯一来源"），摘要多打一行指纹；③ 新增 `web/src/unity/release-manifest.ts`：暂存清单 → 发布清单的合成（`normalizeBuilds` 两代 `taskTypes` 兼容口径）+ **指纹新鲜度判定**（`isTreeFingerprintFresh`：文件数 / 总字节 / 逐文件字节与哈希，**绝不为此重算整树**）+ 兜底复算（`resolveTreeFingerprints`：新鲜 ⇒ 零重算复用清单值，不新鲜/缺失 ⇒ 按同一算法现算）；哈希原语与文件系统都由调用方注入，**产品源码目录不依赖任何 `node:*`**；④ `vite.config.ts` 的 dev 中间件接线：注入 `node:fs`/`node:crypto`，加**廉价签名缓存**（清单 `mtimeMs` + 声明字段 + 产物目录的**路径 + 大小 + mtime** 签名 ⇒ 重新暂存必复核、绕过暂存脚本换产物也必复核，代价约 80 次 `stat`/8ms），指纹缺失时**不静默**（留 warn）；④b **按负责人 2026-10-16 指示把"等长改写"这条堵死**：产物只由**受控流程**产生（Unity 编辑器菜单/构建脚本、`unity-stage.mjs` 先删目录再整份拷回），每次都会重写文件 ⇒ **mtime 必变**，所以签名并入 mtime 后，"内容变了但大小没变、又没重新暂存"也能被发现；签名只决定"要不要复核"，**真判据仍是逐文件哈希**（内容逐字节相同 ⇒ 照旧复用旧指纹，不白换 URL）；签名算法抽成 `release-manifest.ts` 的 `devTreeSignature(files, filePath, fs, createHash)`（可单测），`FingerprintFs` 增加可选 `mtimeMs`；⑤ 桩构建补一次真实 `.data` 请求并把实际 URL 记进 `window.__WSU3_STUB_DATA_URL__`（否则"页面到底发了哪条请求"只能靠人看 Network 面板）；⑥ 新增 `web/tools/verify-unity-fingerprint.mjs`（`npm run verify:fingerprint`，根目录有转发脚本）作为机器可读验收探针；⑦ 文档同批：`design/05` 新增 **§3.5「产物指纹从哪来（三条链必须同值）」**、`design/06` §3② 补 dev/暂存链口径、`README` §3/§4、`unity/builds/README.md`、`docs/TODO.md` 举例；⑧ 工具侧 `node:test` 进合并门禁（根 `package.json` 的 `test:tools` + `gate.yml` 一步 + 本地 hook 第 5 步，hook 由 5 步扩为 6 步）**范围外**：真 Unity 侧产物未重出（`unity/builds/main` 仍是既有那份 37 文件 / 86.6 MB，只是重新暂存了一次把指纹写进清单）；Unity 侧脚本/场景未动 ⇒ **不走 Plastic 渠道** | **验收三条逐条有证据（均不需要清站点数据）**：① 重暂存后真产物清单 `treeSha256 = 64131cad419e80c3d8d46b8ef66a96092d729cb0336bb28e6f29fc813e6bdde2`，与 `pack.mjs` 自己打印的 `64131cad419e…` **逐位相同**（暂存链 / 发布链同值）；② **真浏览器**探针 `npm run verify:fingerprint` **10/10 PASS**：`/unity/main/Build/stub-main.data?v=665b35cac60d`（= dev 合成清单里的指纹前 12 位）；③ 重暂存一版**内容不同**的包后刷新 ⇒ URL 换成 `?v=ac83230b904d`（两版 URL 不同 ⇒ IndexedDB 按新 URL 落新条目）；④ **同尺寸变体**（`make-stub-unity.mjs --variant` 写定长标记 ⇒ 逐文件字节 / 总字节完全相同、只有内容不同）⇒ 指纹与 `?v=` **都必须换**（`4d1a0d8723fa → 32df0234feae`）；⑤ 只把整棵树的 **mtime 统一拨到过去**（内容逐字节相同）⇒ 复核后**仍报同一指纹、`.data` URL 不变**（既不误报"内容变了"，也不白下载 86 MB）。另：同一份产物重跑暂存指纹不变、改一字节后变（`f1b7ba091d1d…`）；`node tools/pipeline/unity-verify.mjs` 通过；工具侧 **9/9**、web **vitest 168 passed（12 files）**、`typecheck` / `lint` / `format:check` / `build` / `npm run smoke`（全量冒烟，含 Unity 站交互与过渡）全过；仓库四道门禁（契约 27 条 / 内容数据双份 / 大文件 / 壳耦合）通过 | **PR #76**（分支 `fix/unity-stage-tree-sha256`：实现提交 `a442dde` + **签名补强提交 `8894291`**；本记录行的提交见该分支 git log）；**CI 两门禁 pass（契约与资产门禁 10~12s / Web 构建与渲染冒烟 1m27s~1m40s，多次运行均 pass，含带本记录行的那次）**；本地 pre-commit **六道全过**（含新加的工具侧单测）；Issue #60 随 PR 关闭。⚠️ **过程记录**：本 PR 文档链上有一次自伤（用 GitHub 文件接口做定点替换，实际是整文件覆盖，`docs/RECORD.md` 一度被写成 11 字节），随即用本地完好副本 force-push 覆盖恢复；**恢复判据 = 本地与远端 blob 哈希一致 + `git diff origin/main HEAD -- docs/RECORD.md` 只有 `+1` 行（无内容丢失）**，教训与细节见 PR #76 的评论 |
| 1.70 | **A5 菜单页方案收敛落地：唯一候选 = 水平环形伪三维卡片（三视图 + 产品对齐）**（2026-10-16，DEC-163 ~ DEC-166，Issue #73 / T1；提交 ① 75703c6 / ② b9a4765 / ③ e666c60 / ④ 0aed752（四条为**改写后**的 sha；产品侧原提交 14509da 已从本批历史移除、留痕 tag `a5-web-ring-wip`，见 §5.8）；PR #95（分支 ship/a5-menu-ring）） | ① **方案收敛**：五个候选（①伪三维卡片滚动 / ②节点散射 / ③六边形蜂窝 / ⑦档案抽屉 / ⑧探照灯取景器）收敛为**唯一候选 = 水平环形伪三维卡片**，②③⑦⑧ 四个废案页**保留在盘不删**、逐页挂「已废弃」徽章 + `.note` 处置说明（**未借用 `.todo-mark`**，那是"待重做"语义）；② **样式**：`components.css` 新增 **§26**（`.a5r-*` 全套，**纯新增**，既有 37 页类名与取值一个未动 —— FRZ-18 实测 **0 删除行**）+ **§24** 五案历史留档（段注写明"不删不改、新代码不得复用 `.a5v1-*`~`.a5v5-*`"，仅 `.ui-progress-ring` 是五页共用件、环形页继续消费）+ **§25** 探照灯压暗层令牌（`.a5v5-spot` 的斑外压暗，走 `--scrim-rgb` / `--scrim-mid` / `--scrim-strong`）；`tokens.css` 同批补 `--dur-page: 160ms`（`:411`）与三枚 scrim 令牌（深/浅两套；§26.8 的 `160ms` `!important` 字面值就是它的镜像）；③ **三个手写页 + 五个手写页登记**：`a5-menu-ring.html`（桌面水平环）/ `-narrow.html`（窄屏垂直环）/ `-reduced-motion.html`（豁免档），`render.mjs` 的 `handWrittenPages` 登记 **V1~V5**（含四个废案）；④ **契约**：`design/13` 重写为**方案文档**（唯一候选 v1 = 水平环形伪三维卡片、②③⑦⑧ 列入"已否决方向·勿再提"、参数以保留追溯为准），新增 `design/14`（几何 / 档位表 / 交互 / 键盘 / DOM 与类名 / §12 验收判据 / 逐页骨架）并**只增不改**追加**附 B**（三处实现偏差登记：§4.5 三套数值互不相容、§4.3 表 `k=4` 算错、§10.4 变量名与新增项）、**附 C**（负责人真机反馈后的四处调整）、**附 D**（手感定稿 + 开场旋转），**正文条款一字未动**；`DECISIONS.md` §33 落 **DEC-163**（只留一个候选 + 废案处置）/ **DEC-164**（reduced-motion 时长豁免）/ **DEC-165**（第三批细节口径 D13~D22）/ **DEC-166**（目录 = 并列展示 + 筛除线，长期规则）；⑤ **成果页（生成物，禁手改）**：新增「**十三、A5 环形菜单**（唯一候选）」节（`src/spec-ring.mjs` → `styleSpecSectionsRound4`）+ **E 组「历史留档」（5 个入口）与「现役」（3 个视图）**分列，round3 节标题改「A5 菜单页**历史留档**」；`src/pages-ab.mjs` 摘除 A5 现状页（15 → 14 条）、`src/style-spec.mjs` 索引同步摘除；⑥ **产品对齐**：`web/src/views/MenuView.vue` 网格换环，**同一套 `.a5r-*`**（产品 import 的 `tokens.css` + `components.css` 与排版稿同一份）；两条有意差异（形态只跟随系统偏好、无页内开关；环高由祖先给 `--a5r-ring-height`、锚点 `--a5r-top`）已在 §26.1 与 `MenuView.vue` 注释写明。**如实登记**：§2.4 的**触控真机与性能读数两项未测**，§2.5 的三条已知落差（A5 工具条产品侧不加 / reduced-motion 豁免的实际可见行为 / `.a5r-ring` 定位用语与 §10.3 字面不同）与「改这个文件前先读」清单，处置留负责人；§5.5 另附两条**交付阶段口径澄清** | `§12 判据 20/20`（脚本 `.tmp-a5-verify/audit-v12.mjs` / 读数 `v12-audit.json`）；三页 `errors=0`、焦点卡中心 **cy=454 / cx=960**、卡尺寸 360×420、9 张卡常驻 DOM、**无滚动条**；静止态档位表**逐条等于契约 §5.2/§5.3**（`scale 1/.85/.72/.61/.58` · `blur 0/2/4/6/6px` · `opacity 1/.72/.44/.28/.28` · `z 500/400/300/200/100`）与承轴露出宽度（P1/P3 `360/217/178.5/104.9/20.7`；P2 承轴纵向 `420/212.5/174.6/101.6/19.8`）；**开场落位环序 1**（转约 1 圈 / 1900ms / ease-out，不挂 `.is-snapping`、减少动态效果档跳过、用户一碰即中止）；**拖拽连续**（8px 细步长扫过整个环 ⇒ **>100px 的单步位移 0 次**）且方向 = 契约 §7.2 的 `−dx`（拖左 ⇒ 环序递增）；键盘环闭合 `[3,2,1,0,8]`、↑/↓ = `7/8`；产品侧 `vue-tsc` / `eslint` / **177 测试** / `vite build` **全过**；生成器**逐字节可复现**；成果页索引 **0 死链**（`check-index-links.mjs`）。**issue 处置见 §6.2**（#73 可关闭、#74 / #75 / #31 / #30 保持 open），**提交 ① 75703c6 / ② b9a4765 / ③ e666c60 / ④ 0aed752（四条为**改写后**的 sha；产品侧原提交 14509da 已从本批历史移除、留痕 tag `a5-web-ring-wip`，见 §5.8）；PR #95（分支 ship/a5-menu-ring）**；**交付阶段收口**：本行的提交号与 PR 号已按交付阶段回填，回填口径与另两处更正见 **§5.5 / §5.6**（残留字样数量更正、`design/13` 指代更正、`DECISIONS.md` §33 标题范围更正） |
> **契约 §13.3 说的「出数即伪造」到此结束：数由实现阶段实测补齐。** 本节（含 §2 的三条结论、§3 的 20/20、§4 的未测声明）就是那一句的兑现：
> 设计阶段（`design/14` §13.3）明确"本阶段无浏览器可测，出数等于伪造"；现在有了真 Chromium 的读数，逐个补在这里，并**如实标出仍没测的那两项**。

---

## 2 本轮实现记录 · 实测与结论（2026-10-16）

> 批次：**A5 菜单页方案收敛落地**（Issue #73 / T1，DEC-163 ~ DEC-166）。对应 §1 的 **1.70** 行。
> 口径：下表所有数字都是**真 Chromium（Playwright）实测**，坐标已按 `--board-scale` 还原成 1920×1080 逻辑坐标；脚本在 `.tmp-a5-verify/`（评审脚手架，不进库）。

### 2.1 三页 §12 判据实测（核心读数）

| 量 | P1 `a5-menu-ring` | P2 `a5-menu-ring-narrow` | P3 `a5-menu-ring-reduced-motion` |
|---|---|---|---|
| **焦点卡中心 y（V-D，要求 ≈ 454）** | **454** ✓ | **454** ✓ | **454** ✓ |
| 焦点卡中心 x | 960 | 960 | 960 |
| 焦点卡尺寸 | 360 × 420 | 360 × 420 | 360 × 420 |
| 纵向包围盒 | **244 ~ 664** | **−264.5 ~ 1172.5** | **244 ~ 664** |
| 是否出现滚动条（§5.6 门槛②） | 无 ✓ | 无 ✓ | 无 ✓ |
| 9 张卡是否常驻 DOM（§5.6 门槛③） | 9 张 ✓ | 9 张 ✓ | 9 张 ✓ |
| console error / pageerror / requestfailed | 全部 0 | 全部 0 | 全部 0 |

**承轴露出宽度（V-G，**一律按承轴量** —— 负责人 2026-10-16 裁决）**：

| 档位 | P1（承轴 = 横向） | P2（承轴 = **纵向**） | P3 |
|---|---|---|---|
| 1（焦点） | 360 | 420 | 360 |
| 2 | 217 | 212.5 | 217 |
| 3 | **178.5**（≥150 ✓） | **174.6**（≥150 ✓） | 178.5 |
| 4 | 104.9 | 101.6 | 104.9 |
| 5（最远） | 20.7 | 19.8 | 20.7 |

> ⚠️ **判据口径（写清，免得后来人量错）**：垂直形态 **不能**用横向差集量 V-G —— 横向在垂直形态里是**起伏轴**（×0.35），量出来只有 60 / 50 / 18，会误判成"不满足 ≥150"。**V-G 一律按承轴量**（水平取横向、垂直取纵向）。
> **P2 的包围盒超出 1080（−264.5 ~ 1172.5）是设计意图**，不是缺陷：契约 §11.3 明写"纵向包围盒会超出 1080，由 `.a5r-ring` 的 `overflow: hidden` 收口"（F3：后方卡片不入画）。实测两页**都不出滚动条**，收口有效。

### 2.2 §12 判据自查：**20/20 通过**

证据：`.tmp-a5-verify/v12-audit.json`（`pass: 20 / total: 20`）。逐条：`V-A`（三页零 console 错误）/ `V-C`（§26 代码行里无 `perspective` / `transform-style` / `rotateY|X|3d`）/ `V-D`（焦点卡 454 ✓）/ `V-E`（每卡都有项目名 + 进度环）/ `V-G`（承轴口径）/ `V-H`（卡内子元素无 `filter`/`opacity`/`scale(`）/ `V-K`（环闭合：环序 1 按 ← 到 9、再 → 回 1）/ `V-P`（9 条名称与分母逐字对契约 §9.3、页眉含「已完成 15 / 共 31」）/ `V-R`（§26 代码行无游离 `#hex`/`rgba(`/时长字面量；`.is-focus` 里搜不到 `--glow-accent`）/ `V-S`（`@media (prefers-reduced-motion: reduce)` 只多 1 处、选择器 == `.a5r-track.a5r--motion` 且**不含 `*`**、旁有 `/* = tokens.css:411 --dur-page */` 注记）/ `§10.4`（样式表里没有给 7 枚冻结变量写默认值）/ `FRZ-18`（既有进度环那一链 **0 删除行**）/ `FRZ-20`（三个新页里 `<style>` 标签数 0）/ `FRZ-22`（用户可见文本里无 emoji）/ `FRZ-23`（三页都有主题 + 输入模态内联脚本、无 `type="module"` / 外链）/ `§5.6/②`、`§5.6/③`。

### 2.3 三条「逻辑门槛」核对结论（不是性能实测，是架构门槛）

| 门槛（契约 §5.6） | 结论 | 依据 |
|---|---|---|
| ① 整排位移**只允许** `transform` / `opacity`；**禁止** `left`/`top`/`width`/`height`/`margin` 的过渡 | **成立** ✓ | §26 里位置入口是 `transform`（`translate(var(--a5r-dx), calc(var(--a5r-dy) + var(--a5r-lift))) scale(...)`）；过渡只声明在 `background` / `border-color` / `box-shadow` / `transform` 上，**没有任何布局属性的过渡** |
| ② 三个手写页在 1920×1080 画布上**打开时不出现滚动条** | **成立** ✓ | 三页实测 `horizontalScroll=false` / `verticalScroll=false`（`.a5r-ring` 的 `overflow: hidden` 收口） |
| ③ 9 张卡**全部常驻 DOM**、不虚拟化 | **成立** ✓ | 三页实测 `.a5r-card` 计数 = 9、无增删节点 |

### 2.4 **未测**两项（如实写，不编数）

| 项 | 结论 | 原因 |
|---|---|---|
| 触控拖拽 vs 页面滚动的**互抢实测**（契约 §13.2 第 1 项 / §7.5） | **未测** | 本机**没有真触控设备**（只有鼠标 + 触控板，触控板走的是 pointer 事件而非触摸屏语义）；机制已按契约落地（轴判定 `|dx| > |dy| × 1.2 && |dx| > 8px`、判定前不 `preventDefault`、判定后 `preventDefault`、`.a5r-ring { touch-action: pan-y }` / 垂直形态 `pan-x`），但**阈值在真触控上的手感没有实测数据** |
| **性能数值**（帧耗时 / blur 面积 / 合成层数，契约 §13.2 第 2 项 / §5.6） | **未测** | **没有做帧率采样**（本轮只核了上面 2.3 的三条架构门槛，没有跑 profiler / 没有采样 frame timing）。契约 §5.6 已明确"本期不设数值上限"，故不构成阻塞，但**读数确实为空**，不填假数 |

> 两项若将来要补：触控需真机（或 DevTools 的 touch 模拟 + `Input.dispatchTouchEvent`），性能建议在实时 Chrome（非 headless）上跑 `PerformanceObserver` 的 `longtask` 或 DevTools Performance 录制。

### 2.5 变更 / 迁移说明

**A5 菜单页**：

| 项 | 变更 |
|---|---|
| 现状页 `pages/a5-menu.html` | **从生成器摘除**（`src/pages-ab.mjs` 15 → 14 条；成果页索引 A 组同步摘掉）。**文件本身保留在盘、不删除**（它与四个废案页一样，留作历史对照）⇒ 见 §5 的三个页数口径 |
| 新三页 | `a5-menu-ring.html`（水平环 · 桌面主形态）、`a5-menu-ring-narrow.html`（垂直环 · 同一份代码 + `.a5r-ring--vertical`）、`a5-menu-ring-reduced-motion.html`（`.a5r-ring--static`） |
| 新样式 | `components.css` **§26**（`.a5r-*`）—— **纯新增**，既有 37 页的类名与取值**一个都没动**（`FRZ-18` 实测 0 删除行） |
| 四个废案页 | ②③⑦⑧ **保留在盘、不删除**，逐页挂"已废弃"徽章 + `.note` 处置说明；**未借用 `.todo-mark`**（那是"待重做"语义） |
| 成果页 | 追加「十三、A5 环形菜单（唯一候选）」新节（`src/spec-ring.mjs` → `styleSpecSectionsRound4`，6 个 item）+「E 组（现役）」三个视图索引；round3 节标题改「A5 菜单页**历史留档**」 |

**产品对齐（`web/src/views/MenuView.vue`）**：网格已换成环，**同一套 `.a5r-*`**（产品 import 的 `tokens.css` + `components.css` 与排版稿同一份）。

| 门禁 | 结果 |
|---|---|
| `npx vue-tsc --noEmit` | **exit 0** |
| `npx eslint src/views/MenuView.vue` | **exit 0**（prettier 已格式化） |
| `npm test` | **12 文件 / 177 tests 全过**（含 `page-transition.spec.ts` —— 它会读 `components.css`，说明 §26 的新增没破坏既有样式契约） |
| `npx vite build` | **成功**（`MenuView-q6xw76X-.js` 10.26 kB） |

与契约 §11.5 的对照：**没有**新增工具条（FRZ-25）✓、保留原有两条降级提示 ✓、`next` / `totals` / `enter` / `preloadUnity` **一行未动** ✓、没动 `.ui-route__dot--current` ✓、数据仍由 `MenuData.json` / `ProjectData.json` 供数（**不写死** §9.3 的示例数据）✓。

**产品侧与排版稿的两条有意差异**（都是"同一套样式服务两种宿主"的必然结果，已在 §26.1 与 `MenuView.vue` 的注释里写明）：

1. **形态入口**：产品只跟随**系统偏好**（`max-width: 900px` ⇒ 垂直环），**没有**页内开关 —— 页内开关（`.a5r-viewswitch`）是**评审手段**，不进产品。
2. **环高与卡片锚点**：产品的环高由祖先给 **`--a5r-ring-height`** 像素值（面板正文带高度是算出来的，`inset: 0` 在外壳 flex 链里会解析成 0），卡片锚点用 **`--a5r-top` = 环高 × 42%**；排版稿两者都回落成"环与画布同高 ⇒ 454px"。

**唯一需要跟改的硬编码**：`§26.8` 豁免里的 **`160ms`** = `tokens.css:411` 的 `--dur-page`。`!important` 覆盖只能给固定值（不能写"恢复成原值"），所以取的是**字面值**；**若 `--dur-page` 改了，这一处必须同步改**（契约 §13.2 已登记；实现里已旁注 `/* = tokens.css:411 --dur-page */`）。

**如实登记的已知落差（处置留负责人，不替他决定）**：

1. **A5 工具条**：排版稿有（搜索框 / 状态筛选 / 去漫游 / 我的成绩），**产品侧本轮不加**（FRZ-25 / 契约 §13.4）。这是 D15 与产品现状之间的**既有落差**，不是本轮的疏忽。
2. **reduced-motion 豁免的实际可见行为与契约字面不一致**（Lead 已定案，照抄）：契约 §7.6 要求豁免的选择器**只能是** `.a5r-track.a5r--motion` 且不含 `*`；但按 §4.5 做法 A 的定位模型，**吸附过渡声明在 `.a5r-card` 上**（`.a5r-track` 自身没有 `transition`），而全局兜底 `*{transition-duration:.01ms!important}`（§20.6）会命中卡片 ⇒ **reduced-motion 档下吸附实际是瞬时的（0.01ms），豁免规则存在但不改变用户可见行为**。本实现按契约**字面选择器**落地（保住 V-S），差异与理由如实登记，**不在实现阶段自行改契约**。
3. **`.a5r-ring` 的定位与契约 §10.3 字面不同**：契约写 `.a5r-ring { position:absolute; inset:0 }`（在 `.a5v-stage__body` 内 ⇒ `42%` 落点 399px），实现取 §4.5 的**推荐做法 A**（相对 `.board__body` 铺满 1080 ⇒ 落点 **454px**），并在 §26 注明换算条件（若挪回 `__body` 内**必须**把锚点改成 47.8%）。产品侧另行引入可选 `--a5r-ring-height`（见上）。

**「改这个文件前先读」清单（A5 环形相关，踩过就会静默错位）**：

- **`.a5r` 不得写 `position: relative`** —— 写了它就成为 `.a5r-ring` 的包含块，卡心落点从 **454px** 变成 **399px**（约 55px 的整体上移，且不会报错）。
- **`.a5r-track` 自身不写 `transform`** —— 位置全部由 9 张卡各自的 `--a5r-dx` / `--a5r-dy` 表达；在轨道上写位移 = 两套定位打架。
- **样式表里不得给 `--a5r-scale` / `--a5r-blur` / `--a5r-opacity` / `--a5r-z` / `--a5r-dx` / `--a5r-dy` / `--a5r-ring-rescale` 写默认档位值** —— 行内变量天然盖过样式表，两处都写会留下"看起来生效其实没生效"的死代码。
- **卡片的 `top` 用 `--a5r-top`（长度），不要写百分数** —— `top` 的百分数解析的是**环绕块**高度，产品侧与画布不等高时落点会偏。
- 三个新页的**页面里不得出现 `<style>` 块**（FRZ-20）—— 新样式只有 `components.css` §26 一个来源。

---

## 3 页数口径（2026-10-16 定稿）

> 本轮把 A5 现状页从生成器摘除、同时登记三个环形新视图 ⇒ **三个数各不相同**，写文档时必须说清是哪一个口径。
> 实测命令：`node .tmp-w4-build/counts.mjs`（数组长度 + 目录枚举，不靠肉眼数）

| 口径 | 值 | 怎么来的 / 说明 |
|---|---|---|
| **盘上 `docs/ui-mockups/pages/*.html`** | **37** | 目录枚举。**主口径**（"仓库里有多少个排版稿文件"） |
| **生成器条目** | **28** | `pagesAB 14 + pagesC 11 + pagesD 3`（`src/pages-*.mjs` 的数组长度） |
| **手写页** | **5** | `render.mjs` 的 `handWrittenPages`（V1~V5）；生成器 stdout 那句 `33 个页面排版稿` = **28 + 5** |
| **成果页页面索引** | **36** | `pageIndexGroups` 合计：A 9 + B 5 + C 11 + D 3 + **E 组历史留档 5** + **E 组（现役）3**；`index.html` 里 `class="spec-page-link"` 实测也是 **36** |

**为什么 37 ≠ 36（是预期，不是对不上）**：被摘除的 `pages/a5-menu.html` **仍在盘上**（FRZ-24：只摘生成器注册与成果页索引，**不删文件**）⇒ `盘上 37 = 索引 36 + 1`。
**各文档落点**：`docs/README.md` 的两行（成果页入口数 / 排版稿页数）、根 `README.md` 的三行（仓库导航、§1 排版稿行、§4 重新生成命令）。

---

## 4 决策与契约的落点（本轮）

| 落点 | 内容 |
|---|---|
| `DECISIONS.md` §33 | **DEC-166**（W6 落）：把「**目录 = 并列展示 + 筛除线**」写成长期规则（邻接 = 观看顺序不是内容顺序 / 不画弧线箭头 / 不写「下一个项目」/ 位置与尺寸不编码权重 / 不画条目之间的连线；筛除线 S1~S4 逐字沿用 + S2 边界） |
| `design/14` **附 B**（"只增不改"追加） | **三处实现偏差登记**：**B-1** §4.5 三套数值互不相容 ⇒ 实现取满可用高度（`--a5r-descent-budget: 152px` + `--a5r-descent-sign: −1`，实测偏移 0 / −5.9 / −22.8 / −47.5 / −76）；**B-2** §4.3 表 `k=4` 算错（`R·sin96° = 596.7`，不是 654.6；横向包围盒 701.1 < 960 ✓）；**B-3** §10.4 变量名照正文（`--a5r-dx` / `--a5r-dy`）、**新增** `--a5r-enter`（进入倍数）、环定位的可选 `--a5r-ring-height`、卡片锚点 `--a5r-top: 454px`、transform 改 `translate(-50%, -210px)`。**正文条款逐字保持原样** |
| `design/14` **附 C**（"只增不改"追加） | **负责人真机反馈后的四处调整**：**C-1** 拖拽方向**反转成跟手**（`Δn = +dx/slot`，正文明写的是 `−dx`）；**C-2** `transform` 过渡**只在吸附期间挂**（常驻 transition 去掉 `transform`、新增 `.a5r-track.is-snapping .a5r-card`、`pointerdown` 不再走 `snapTo`）；**C-3** 环内 `user-select: none`；**C-4** 吸附时长的 `!important` 落点（兑现 §7.6 意图，不动 §20.6 与 V-S 选择器） |
| 未动 | `design/13`、`design/07`、`docs/requirement/issue-73-a5-menu-redo.md` —— 只读文档，一个字未改 |

**全仓库 `@media (prefers-reduced-motion: reduce)` 处数**：`components.css` 共 **2 条** —— `:913`（§20.6 全局兜底）+ **`:1898`（§26.8 新增的 A5 具名豁免，选择器 `.a5r-track.a5r--motion`，不含 `*`）** ⇒ **比开工前只多 1 处** ✓（另有两处出现在注释文字里：`:1091`、`:1144`；`tokens.css:406` 是说明文字；三个**作废页** `a5-menu-v1/v2/v3.html` 的 JS 里有 `matchMedia` 调用共 3 处，按契约 §12 V-S 的原文口径属既有存量）。

**「五方案」残留（本轮收口后）**：成果页 `index.html` **0 处** ✓（生成物里连历史行都没有）。仍在的都在**只读文档与历史行**里，按裁决不动：`design/13`（4 处）、`design/14`（4 处，其中 1 处是本轮附 B 的叙述）、`requirement/issue-73`（1 处）、`DECISIONS.md` §33 的既有历史行（3 处）、`components.css:1122` 的 §24 段注（W0 改的"五方案新增样式（历史留档）"）。

---

## 5 负责人真机反馈后的修（2026-10-16 追加）

> 来源：负责人实测三条观感问题 ——「① 鼠标拖动 menu 旋转方向要反过来（键盘是对的）」「② 鼠标拖拽要和移动同步，现在是松手再动」「③ 文字可选中，左键拖拽会触发浏览器功能」。
> 累计落点：`components.css` §26.1 / §26.2 / §26.7 + 三个手写页的拖拽段 + `web/src/views/MenuView.vue`（同源注释）。契约登记见 `design/14` **附 C**。

### 5.1 三条的**根因**（都是先复现、后改，不是猜的）

| # | 现象 | 实测根因 | 改法 |
|---|---|---|---|
| ① | 方向反 | 契约 §7.2 原文是 `Δn = −dx / var(--a5r-slot)`，实现**忠实地照抄了负号** ⇒ 拖右环左转 | **最终回到契约口径 `−dx`**（"拨转盘"）。⚠️ 中途曾按"跟手"改成一版 `+dx`，负责人二次裁决后又改回 `−`；**那次改动未留在代码里**，登记见附 C-1 |
| ② | "松手再动" | **`transform` 常挂着 160ms 过渡**：实测拖拽第 1~3 步 `--a5r-dx` 已更新而 computed `transform` 还在 `matrix(1,…,-180,-210)`，第 4 步起才逐帧追（`0.91 → 0.85 → 0.855`）⇒ 画面在**追赶**指针，观感"粘住、松手才对上" | 常驻 `transition` **去掉 `transform`**；新增 `.a5r-track.is-snapping .a5r-card` 只在吸附期挂；`pointerdown` **不再走 `snapTo`**（那会顺带挂过渡）⇒ 见附 C-2 |
| ③ | 文字可选中 | `.a5r-ring` / `.a5r-card` / `html` 的 `user-select` 实测都是 `auto` | `.a5r-ring` 加 `user-select: none`（继承到 9 张卡）；**环外**工具条保持 `auto` ⇒ 见附 C-3 |
| ④ | "卡片没动、只是文字改了" | 卡片位置取的是 `d(k)` 而 `k` **取整**（契约 §5.1 的 `k = Math.round(off)`），档位间距又大（249.6 / 211.1 / 110.0 / 83.9）⇒ 实测指针每走 25px，卡片位移**10 步里 8 步是 0**，跨档那一帧直接跳 −244px；**焦点卡更是全程钉在正中**（`dx` 恒 0）不动 | 位置改用**连续角度** `pos = R·sin(off·Δ)`（`off` 为小数）。契约 §4.3 的 `d(k)=R·sin(kΔ)` **本身就是连续函数**，表里的 0/244.0/445.9/570.6/596.7 只是它在整数 k 上的取值 ⇒ 整数处**逐位相等**、拖动时连续。⇒ 见附 C-5 |

### 5.2 修复后的实测（真 Chromium，三页）

- **方向（最终口径 = 契约 §7.2 的 `−dx`，"拨转盘"）**：指针往**左**拖 ⇒ 焦点环序**递增**（环右转）；往**右**拖 ⇒ 环序**递减**（环左转，0 会绕到 8/7/6…）。三页一致（P2 是垂直形态，用**纵向**位移驱动，方向同样一致）。
- **拖拽过程中焦点就在前进**（不是松手才变），单调不回退。
- **卡片位置连续跟随**：指针每步 25px ⇒ 卡片位移 16.4 / 15.7 / 14.8 / 13.9 / 13.0px，**"位移为 0 的步"占比从修复前的 80% 降到 0%**。
- **跟手比**（= 卡心位移 / 指针位移）：**0.92 → 0.98** 平滑收敛到 1.00；与理论 `cos(off·Δ)` 吻合（环心附近严格 1:1，越到两侧越小 —— 这是圆周投影的几何，见 5.3）。
- **拖拽期无 transform 过渡**：实测 `transitionProperty` = `background, border-color, box-shadow`（**不含 `transform`**）；松手时挂 `.is-snapping` 且 `transition-duration` = `0.16s`。
- **吸附仍平滑**：点非焦点卡 ⇒ 实测 `distinctTransforms = 8` 帧不同值、`.is-snapping` 被观察到（不是瞬跳）。
- **文字不可选中**：`ring=none` / `card=none` / **工具条=`auto`**（环外仍可选中复制）。
- **回归**：`§12 判据 20/20` 仍全过；三页 `focus cy = 454`、`errors=0`、无滚动条、静止态档位表（`scale`/`blur`/`opacity`/`z`/露出）**逐条未变**、键盘环闭合（`left5 = [3,2,1,0,8]`）、↑/↓（`7/8`）**均未变**；产品侧 `vue-tsc` / `eslint` / `177 测试` / `vite build` 全过。

### 5.3 第二轮反馈后的定稿（负责人 2026-10-16「手感 OK，这部分交付」）

第二轮又提了三件事：「拖拽太灵敏」「交叠处仍能看出层级在切换」「（新需求）开场要转一下、最后停在第一个上」。逐条处置：

| # | 现象 | 实测根因 | 改法（登记处） |
|---|---|---|---|
| ⑤ | 太灵敏 | 换算比例是 1.0（屏幕走 1 格距离 = 环转 1 格） | 抽成命名常量 **`DRAG_GAIN = 0.2`**，**拖动 / 松手结算 / 惯性三处共用**（只调拖动不调惯性会让"甩一下"仍飞很远）⇒ 附 **D-1** |
| ⑥ | 交叠处看得出层级在切换 | z 按**取整档位**直接写 ⇒ 实测跨档那一帧有 **8 张卡同时换层** | `z = tier.z − 90·(kd − k)`：整数处仍**精确等于**契约的 500/400/300/200/100，档位内部按连续 `kd` 单调修正（最大偏差 45 < 档距 100）⇒ 跨档时**相邻两张只交换一次** ⇒ 附 **D-2** |
| ⑦ | 最远档换侧时瞬移 | `d(k)=R·sin(kΔ)` 在 `k=N/2` 取极值后**回落**，折叠 `off` 会让两侧位置相同、卡片只能瞬移（实测 816px） | 位置改为 `d = R·sin(min(kd, N/2)·Δ)`：**超出极值贴住不动**、左右由 `off` 符号决定 ⇒ 附 **D-3** |
| ⑧ | **新需求**：开场要转、最后停在第一个 | 原实现是加载后直接 `render()`（静止出现在环序 1） | `startIntro()`：`focusFloat` 从 `−SPIN_TURNS` 用 **ease-out 幂曲线**推到 0（末速度趋零）⇒ 精确停在环序 1，**不需要再吸附**；`SPIN_TURNS = 1`、`SPIN_MS = 1900`；不挂 `.is-snapping`；**减少动态效果档跳过**；用户一碰就中止 ⇒ 附 **D-4** |

**定稿实测（真 Chromium，三页）**

| 项 | 结果 |
|---|---|
| 开场旋转 | 三页都是：动画期间经过 **8~9 个环序**（确实转了）⇒ 最终焦点环序 **0**（接触器）⇒ 活区播报「第 1 / 共 9 · 接触器」 |
| 静止态档位表 | `scale 1/.85/.72/.61/.58`、`blur 0/2/4/6/6px`、`opacity 1/.72/.44/.28/.28`、**`z 500/400/300/200/100`**（**逐条等于契约 §5.2/§5.3**） |
| 露出宽度 | P1/P3 `360/217/178.5/104.9/20.7`；P2（承轴纵向）`420/212.5/174.6/101.6/19.8` |
| 焦点卡中心 | 三页 `cy = 454`、`cx = 960`；`errors = 0`；无滚动条 |
| 键盘 | 环闭合 `left5 = [3,2,1,0,8]`、↑/↓ = `7/8` —— 与开场旋转互不干扰 |
| 拖拽连续性 | 8px 细步长扫过整个环 ⇒ **>100px 的单步位移 0 次**（另截图 `ring-turn-*.png` / `drag-step-*.png`） |
| 方向 | 拖**左** ⇒ 环**右**转（环序递增）；拖**右** ⇒ 环**左**转（递减）—— 即契约 §7.2 的 `−dx` 口径 |
| §12 判据 | **20/20 通过** |
| 产品侧 | `vue-tsc` 0 · `eslint` 0 · **177 测试**全过 · `vite build` 成功 |

**方向定稿（留痕，免得后人再翻）**：契约 §7.2 的 `Δn = −dx / slot` 就是对的，实现一度改成 `+dx`（"跟手"）又被负责人裁决改回 `−`（"拨转盘"）。**最终 = `−`**。

### 5.4 可调旋钮（后续想调手感只动这两处）

| 想改什么 | 动哪里 | 现值 |
|---|---|---|
| 拖拽灵敏度（屏幕上要拖多久才转过一格） | `DRAG_GAIN`（三页 + 产品同源） | `0.2` |
| 开场转几圈 / 多久 | `SPIN_TURNS` / `SPIN_MS` | `1` 圈 / `1900ms` |

> **跟手比的几何上限（不是缺陷）**：环是圆周，卡片横向投影的瞬时速度天然带 `cos(off·Δ)` ⇒ 跟手比**不可能处处 1.00**（环心附近 = 1.00、档位 1 处 0.91、档位 2 处 0.67）。要处处严格 1.00 就得放弃圆周、改成整排平铺 —— 那是另一个方案，不在本轮范围。

---

### 5.5 定稿澄清（交付阶段批注 · 2026-10-16）

> 性质：**本节只做口径澄清，不改上文任何一个字**。两条都是"上文某处的字面已被后来的裁决取代"——按本文件开头的纪律（只增不改），**过时的字面原样留着**，以本条为准。
> 为什么不在原文上改：那些字面是**当时真实的中间状态留痕**（改掉就看不出"裁决过一次又改回来"的过程）。终稿依据都在 `design/14` 的附录里。

**C-1 方向：§4 那格的「跟手 `+dx`」是中途那一版，终稿是 `−dx`「拨转盘」**

- **上文过时处**：§4 的落点表里，「`design/14` **附 C**」那一格写的是 **C-1 拖拽方向反转成跟手（`Δn = +dx/slot`）**。那是**中途那一版**字面。
- **终稿**：负责人**二次裁决**后已改回 **`−dx`**「拨转盘」—— **终稿 = 契约 §7.2 的 `Δn = −dx / var(--a5r-slot)`**：**指针往左拖 ⇒ 焦点环序递增**（环右转）；往右拖 ⇒ 递减（0 会绕到 8/7/6…）。与 `design/14` **附 C-1** 的终稿表述一致（附录原样保留中间版的过程叙述）。
- **§5.1 / §5.2 / §5.3 无需改**：§5.1 表格「①」行、§5.2 第一条与 §5.3 定稿实测表的**读数本来就是 `−dx`**（§5.1 甚至已写明"中途曾按'跟手'改成一版 `+dx`…那次改动未留在代码里"）；§5.3 末尾另有一行「方向定稿（留痕）」同口径。**故此处澄清只针对 §4 那一格的表述**。

**reduced-motion 豁免：§2.5「已知落差」第 2 条的字面已被 `design/14` 附 C-4 取代**

- **上文过时处**：§2.5「如实登记的已知落差」**第 2 条**写「…**reduced-motion 档下吸附实际是瞬时的（0.01ms）**，豁免规则存在但不改变用户可见行为」。该字面描述的是**豁免落地之前**的状态。
- **以本条为准**：附 C-4 已把豁免**真正落到** `.a5r-card` 上（加 `transition-duration: var(--dur-page) !important`）⇒ **吸附 160ms 不再被 §20.6 的全局兜底 `*{transition-duration:.01ms!important}` 压掉**，即**该豁免现在是生效的**（落地口径：只改落点、不动 §20.6 与 V-S 的具名选择器 `.a5r-track.a5r--motion`，故 `§12 V-S` 仍 20/20 通过）。
- **如实写明（不夸大）**：**本条为文档口径更正，交付阶段未再在真浏览器 / 真机复测该档手感** —— 没有为该条重跑 `prefers-reduced-motion` 档的观感读数。**RECORD §2.4 的「未测两项」（触控真机 / 性能数值）仍然成立**，本条不构成对它们的补充，也不改变 §5.3 定稿实测表的适用范围。

**C-3 残留字样的数量更正：「五方案 0 处」这句话只在字面口径上成立**

- **不改上文**：§4 末段那句「成果页 `index.html` **0 处** ✓」**原样保留**，本节只在它旁边说清检索词口径 —— 那句子说的是**当时的检索词**。
- **前半句成立（按当时那个检索词）**：「**五方案**」这个词在成果页 `index.html` 与 `components.css` 里确实 **0 处**（`components.css:1122` 的 §24 段注按裁决改写成「五方案新增样式（历史留档）」，保留了"五方案"这一历史叙述词）。
- **但「五个方案」这一措辞仍留 4 处**（复核者实测）：
  - `docs/ui-mockups/index.html:1220` —— **生成物**（禁手改），来源是生成器 `src/style-spec.mjs:817`；文字是 §24 历史留档那一节的说明：为了五个方案读起来一致，三类反馈在这里统一定义；
  - `docs/ui-mockups/components.css:1412 / 1443 / 1516` —— 三条注释（`:1412` 三类反馈/五方案一致、`:1443` 五个方案的正文都放在这个容器里、`:1516` 与 24 号（五方案遗留）的关系）。
- **本轮不动它们，理由写清**：DEC-163 ④ 要收的是**指向五方案的悬空引用**（成果页那一节 / E 组 / 页数口径），`index.html:1220` 与那三条 CSS 注释**不在该清单里** —— 它们描述的是 **§24 历史留档自身**的内容，属历史叙述。另外，`index.html` 是**生成物**，改一个字都要改生成器并重跑 `render.mjs` ⇒ 那是**新一批实现改动**，不该塞进交付阶段。
- **收口（以本条为准）**：涉及"五方案残留"的准确说法是 —— **「五方案 = 0 处；五个方案 = 4 处（1 生成物 + 3 注释），按裁决保留」**。

---

### 5.6 交付阶段的两条口径更正（2026-10-16）

> 性质：**只做口径更正，不改上文任何一个字**，也不改动任何决定与读数。两条都是"标题 / 指代写窄了"，**准确说法以本条为准**。

**（1）§4「未动」那一格的指代有歧义**

- **上文原样**：§4 末行写「`design/13`、`design/07`、`requirement/issue-73` —— 只读文档，一个字未改」。
- **歧义在哪**：这句把三者并列成"一个字未改"，但**本轮 `design/13` 实际是被重写覆盖**的（DEC-163 自述"重写覆盖为方案文档"；见 §1 的 1.70 行 ④ 与 §6.1 的补齐行）。**且它在 git 里没有更早的基线可比对**（该文件是本轮新入 git：`+464`），所以"未改"与"重写"两种读法都说得通 —— 这正是需要说清的地方。
- **准确说法**：本轮**未改**的是 **`design/07`** 与 **`requirement/issue-73`**（复核：`design/07` 与开工基线 `551b852` **逐字节相同**，`requirement/issue-73` 同）；**`design/13` 是本轮重写**（作为新文件入 git，`+464` 行），不是"未改"。

**（2）`DECISIONS.md` §33 的小节标题范围漏了 DEC-166**

- **上文原样**：`docs/DECISIONS.md` 的小节标题写「`## 33 第二十轮（2026-10-16）：A5 菜单页方案收敛（DEC-163 ~ DEC-165）`」，但该节表格内**含 DEC-166**（"目录 = 并列展示 + 筛除线"的长期规则）⇒ 标题范围漏了 166。
- **已在本批一并更正**：标题括号内容改为 **`（DEC-163 ~ DEC-166）`**（**只改这一行的括号内容**，该节正文与表格一个字不动）。
- **收口**：上面两条都是**标题 / 指代的口径更正**，**不涉及任何决定或读数的改变**。

---

### 5.7 CI 门禁读数（交付阶段实测 · 2026-10-16）

> 性质：**只记事实，不修饰上文**。本条与 §5.5 / §5.6 一样是"追加说明"，不删改任何一个字。

**门禁结果（PR #95）**：**「契约与资产门禁」pass（11s）**；**「Web 构建与渲染冒烟」fail（2m17s）** —— 失败三条断言原文：

```
启动流程：登录之后目录照常加载内容数据 — tiles=0
菜单页：项目卡片 ≥ 9 个 — count=0
坏链接之后目录仍然是完整的 — count=0
```

紧随其后的点击步骤**超时**，报错原文两段：

```
2 × waiting for element to be visible, enabled and stable / - element is not stable
```

```
<span class="ui-tile__desc">4 站 · 下一站：简介</span> from <article ... aria-label="第 4 / 共 9 · 主令电器 · 4 站">...</article> subtree intercepts pointer events
```

**归属（两条，分工不同，都未在本批提交）**：

1. **`web/tools/render-smoke.mjs` 的选择器已过时** —— 它仍按旧的网格类查目录卡片（`.ui-tile-grid .ui-tile`），而环形菜单页里该选择器**命中 0**（卡片上只有 `.ui-tile.a5r-card`，**没有 `.ui-tile-grid` 祖先**）⇒ 上面三条断言全部读成 0 而红。**属另一条工作线**，其修法（换成 `.a5r-card`）**在工作区里已有未提交改动**。
2. **紧接的点击断言在环形页上不成立** —— 脚本第 981 行点 `.a5r-card.is-focus` 仍超时。原因是 **`MenuView.vue` 的开场旋转（`SPIN_MS = 1900`，只跳过 `prefers-reduced-motion`）在脚本点击时还没停**：环还在动（`element is not stable`），焦点卡还被邻卡压着（邻卡 `subtree intercepts pointer events`）—— 脚本那一步**既没有等开场段、也没有把 `reducedMotion` 设成 `reduce`**。**属产品侧环形实现 + 冒烟适配的收尾**。

**归属的边界（写给复核者）**：失败**不是**排版稿 / 生成物 / 契约的问题 —— 那三条（`§12 判据 20/20`、生成物逐字节可复现、成果页索引 0 死链）本机与 CI 都过；红的这条是**产品侧环形菜单与既有渲染冒烟脚本的适配尚未收口**。

**本机复现读数（真 Chromium，1920×1080）**：把选择器换成工作区那份未提交的 `.a5r-card` 后，前三条转为 PASS —— 实测 `tiles=9` / `count=9` / 9 条真实项目名全部命中；**随后点击步骤仍超时**，报错就是上面两段（`element is not stable` 与邻卡 `subtree intercepts pointer events`）。

**与 §6.2 的关系（明写，不修饰上文）**：§6.2 说 #73「可关闭」的依据是**排版稿侧验收 + 产品侧四项检查**（`vue-tsc` / `eslint` / **177 测试** / `vite build`），**不含渲染冒烟**。**渲染冒烟这条门禁目前是红的**；它的处置（分两批提交 / 等另一条工作线修完 / 单开 PR）**由负责人定**，**本条只记事实、不给处置**。

> **收口**：本轮交付的**排版稿部分不受此影响**；**产品侧环形的合入判据以渲染冒烟转绿为准**。

---

### 5.8 处置：产品侧撤回，改走产品 PR（拆两批 · 2026-10-16）

> 性质：**只增不改** —— 上文（含 §5.7）一个字不动，处置与口径的**最终说法以本条为准**。

**1. 裁决与依据**

- **依据**：§5.7 记的 **Web 构建与渲染冒烟门禁红（两条原因）** ⇒ 负责人 2026-10-16 裁决采用 **"拆两批"**。
- **本批的性质**：**PR #95 只交排版稿这条线**。
- **#73 的关闭依据随之收窄为**：**排版稿侧交付 + 契约 / 生成物 / 文档证据** —— `§12 判据 20/20`、生成物逐字节可复现、成果页索引 0 死链、三页 `cy=454` / `errors=0` / 无滚动条、静止态档位表逐条等于契约、开场落位环序 1、拖拽连续。
- **不再把产品侧四项检查**（`vue-tsc` / `eslint` / **177 测试** / `vite build`）**算作本批的合入证据** —— 那四项**仍然做过了**（读数见 §2.5 / §5.3，未变），只是**随产品批走**。
- **撤回留痕**：产品侧那条提交在本地打了 tag 留痕 —— **被撤回提交 `14509da`，留痕 tag `a5-web-ring-wip`**（用于将来开产品 PR 时取回那段改动；该提交仍可由 tag 解析）。
- **改写后的提交替换关系（改写完成于 2026-10-16 交付阶段，与本节同批）**：原列表的 **③ `14509da`（产品侧，含 `web/src/views/MenuView.vue`）已从本批历史移除**；原 ④ `683f592`（decisions+readme）与 ⑤ `a402336`（record）**因改写而换了 sha** ⇒ 现为 ④ **`e666c60`**、⑤ **`0aed752`**；**①② 未变**（`75703c6` / `b9a4765`）。改写后 `git log --oneline main..HEAD` 共 **4 条**（契约 / 排版稿 / 文档·decisions / 文档·record），**不含产品侧那一条**。（改写中途曾取过一版 sha `33e351f` / `f812f4c`：那一版把 `MenuView.vue` 误并进了文档提交，已重做并作废 —— 如别处引用过这两个 sha，一律按本行更正。）

**2. 本批范围（＝ PR #95 的内容，逐项列出）**

| 类别 | 内容 |
|---|---|
| 契约 | `docs/design/13-a5-menu-redo-contract.md`（本轮重写为方案文档）· `docs/design/14-a5-menu-ring-contract.md`（附 B / C / D）· `docs/requirement/issue-73-a5-menu-redo.md` |
| 排版稿 | **三视图**（`a5-menu-ring.html` / `-narrow.html` / `-reduced-motion.html`）+ **五个历史方案页**（`a5-menu-v1-pseudo3d.html` 及四个废案页） |
| 样式 | `docs/ui-mockups/components.css` **§24 / §25 / §26** · `docs/ui-mockups/tokens.css` |
| 生成器 | `docs/ui-mockups/src/spec-ring.mjs` · `render.mjs` · `style-spec.mjs` · `pages-ab.mjs` |
| 成果页 | `docs/ui-mockups/index.html`（生成物） |
| 文档 | `README.md` · `docs/README.md` · `docs/DECISIONS.md` §33 · `docs/RECORD.md`（本文） |

**范围判据**：`git diff --name-only main..HEAD` **不含任何 `web/**`** —— 采用拆两批后，上一节 §5.7 记的那条"红的门禁"**在本批内不再出现**（本批不含 `web/**`，渲染冒烟脚本的检材里没有环形菜单页）。

> **口径与时序（如实记）**：上面这句说的是**产品侧撤回提交生效之后**的范围。**写本条时该撤回已由 committer 在同一支分支上完成改写** ⇒ 现 `git diff --name-only main..HEAD` 只剩 **4 条**提交；**改写前**的那一刻该列表里**仍有 `web/src/views/MenuView.vue` 一项**（改写前后的提交替换关系见本节 1）。**以撤回生效后的范围为准**；§5.7 记的门禁读数出自**改写前的那次运行**，改写后应重跑一次才能说"本批的渲染冒烟转绿"。
>
> **改写后的实测补充（2026-10-16，写本节时复核）**：`git log --oneline main..HEAD` = **4 条**（契约 / 排版稿 / 文档·decisions / 文档·record）；`git diff --name-only main..HEAD` = **22 项，全部落在 `README.md` 与 `docs/**`，不含任何 `web/**`** ✓；`git show --name-only e666c60` = `README.md` / `docs/DECISIONS.md` / `docs/README.md`（**不含 `MenuView.vue`**）；`git diff main -- web/src/views/MenuView.vue` = **空** ⇒ 产品侧改动在本批内已完全退出，只余留痕 tag。**上面"范围判据"的条件已满足。**（改写过程留痕：中途曾取过 `33e351f` / `f812f4c` 一版，把 `MenuView.vue` 误并进文档提交，已重做作废；凡引用该两 sha 之处一律以本行更正。）

**3. 产品批的前置条件（两条）**

1. **冒烟选择器收口**：`web/tools/render-smoke.mjs` 的 `.ui-tile-grid .ui-tile` → **`.a5r-card`**（属**另一条工作线**，工作区已有未提交修法）。
2. **开场旋转的点击时序收口**：脚本那一步**既没等开场段、也没把 `reducedMotion` 设成 `reduce`**，而 `MenuView.vue` 的 `SPIN_MS = 1900` 只跳过 `prefers-reduced-motion`（见 §5.7）。

**产品批还要带上 `web/src/styles/product.css` 的那一节**（修**面板高度链的静默塌陷**：环形菜单里 `.a5r-ring` / `.a5r-track` / 9 张卡全是 `position: absolute` ⇒ 面板唯一在流子项是一层高度 0 的空包裹 ⇒ 面板塌到只剩 46px 头部、`--a5r-ring-height` 跟着是 0px、9 张卡被 `overflow: hidden` 整块裁掉）。依据是**工作区那一节注释的自述**（`.app-main__body > .ui-panel { height: 100% }` / `.ui-panel--ring > .ui-panel__body { flex: 1; min-height: 0; overflow: hidden; padding: 0 }` / `.a5r-stage-body { height: 100% }`），**该节未在本批提交、也未在本批验证**。

**4. 收口**

- §5.7 记的"**红的门禁**"**在本批内不再出现**（本批不含 `web/**`）；
- **产品批的合入判据仍是"渲染冒烟转绿"**；
- **上文（含 §5.7）一个字不改，以本条为准**。

---

### 5.9 合并落地与 issue 关闭（交付阶段收尾 · 2026-10-16）

> 性质：同 §5.5~§5.8 —— **只增不改**，上文一个字不动。

| 项 | 读数 |
|---|---|
| **PR #95** | 分支 `ship/a5-menu-ring` → `main`；**已 squash 合并**，合并提交 **`9741446`**（2026-10-16T07:45:56Z）；合并信息内含 `Issue #73`（随 PR 自动关闭） |
| **PR 的门禁** | **「契约与资产门禁」pass（8s）** · **「Web 构建与渲染冒烟」pass（1m56s）** —— §5.7 记的那条红门禁**在拆两批后转绿** |
| **`main` 上的门禁** | 合并到 `main` 后 `gate` 运行 **completed / success（2m6s）**（run `38869292901`） |
| **本批提交** | `75703c6`（契约）· `b9a4765`（排版稿）· `e666c60`（decisions+readme）· `0aed752`（record 1.70）· `a452e03`（交付阶段收口：§5.5~§5.8）⇒ 5 条，squash 成 `main` 的 `9741446` |
| **范围复核** | `9741446` 共 **22 个文件，全部是 `README.md` 与 `docs/**`**，**零 `web/**`**（与 §5.8 的范围判据一致） |
| **issue** | **#73 已关闭**（附证据链评论：三个排版稿页 + 成果页新节 + §12 判据 20/20 + 定稿实测表 + 三份附录 + 本批未含/未测项）；**#74 / #75 / #31 / #30 保持 open**（与本轮无关） |
| **产品侧留痕** | tag **`a5-web-ring-wip` → `14509da`**（解引用后含 `web/src/views/MenuView.vue` 环形版 `b846fbf`）；另有 `%TEMP%\a5-web-ring-wip-backup\` 5 份 `format-patch` 备份，供产品 PR 取用 |
| **工作区** | 本批文件已全部入 `main`；另一条工作线（`NewStructureUnity/**`、`web/src/styles/product.css`、`web/tools/render-smoke.mjs`、评审脚手架 `.tmp-*/`、`docs/requirement/issue-74-75-quiz-exam-redo.md`）**原样留在工作区、一件未提交** |

> **一处如实记录的过程弯路**：本批第一次改写历史时，把产品侧那笔改动**误并进了文档提交**（只摘掉提交、没摘掉内容）；由 `git diff --name-only main..HEAD` 的复核抓出，随即重做并按"独立算法交叉验证树与真 `cherry-pick` 逐位一致"确认终态。中间态 sha `33e351f` / `f812f4c` **已作废**，凡引用一律以 §5.8 的更正行与本节为准。

---

### 5.10 产品批：A5 环形菜单入 `main` —— 三项前置条件的实测收口（2026-10-16）

> 性质：同 §5.5~§5.9 —— **只增不改**，上文一个字不动。
> 起因：§5.8 把产品侧拆出本批（`PR #95` 只交排版稿），**本批 = 那个产品批**：把 §5.8「3. 产品批的前置条件」的三条**同时**收口。

**1. 范围与落点（3 个 web 文件，其余一件未动）**

| 文件 | 改动 | 来源 |
|---|---|---|
| `web/src/views/MenuView.vue` | 环形版（`+680 / −45`） | tag **`a5-web-ring-wip` → `14509da`** 里的那一版；落地后 `git hash-object` = **`b846fbf290584993ea425005adbc9548e3a7e346`**，与 tag 内 blob **逐字节相同** |
| `web/src/styles/product.css` | **+39**（「目录页（A5）」一节：面板高度链） | 工作区既有未提交改动（§5.8 第 3 条要求"产品批还要带上它"） |
| `web/tools/render-smoke.mjs` | 4 处 `.ui-tile-grid .ui-tile` → `.a5r-card`（其中 8b 那一步是 `.a5r-card.is-focus`）；新增 `waitForMenuSettled()` 并在 3 处目录页改用它（**不再**用固定等待） | 同上（工作区既有未提交改动 + 本批补上的时序修；固定等待那版在独立复核后换掉，见本节 3-b） |

**2. 冒烟：从"红"到"全绿"**

| 项 | 读数 |
|---|---|
| **修前（工作区那份不完整修法）** | 仅 **1 条**失败：`render-smoke.mjs:981` 点 `.a5r-card.is-focus` ⇒ 日志两种表现**同源**：① `element is not stable`（重试约 27s）；② 稳定后 `<span class="ui-tile__desc">…</span> from <article …aria-label="第 4 / 共 9 · 主令电器…"> subtree intercepts pointer events` |
| **修后** | **`npm run smoke` 全绿（85 条 PASS，exit 0）**，含此前红的那条「过渡：路由级切换播了页面过渡（ui-page-*）」（读到 `ui-page-leave-from … ui-page-enter-to`） |
| **产品侧菜单断言（修后）** | `tiles=9`（登录后）/ `count=9`（内容层）/ `count=9`（坏链接之后）；真实项目名 `接触器 / 热继电器 / 时间继电器 / 主令电器 / 熔断器 / 断路器 / 速度继电器 / 组合开关 / 小测验` |

**3. 根因：不是"邻卡遮挡"，是开场旋转还在跑（附 E 的 E-2 / E-3）**

- 冒烟那一步的新语义（`onCardClick`）：**点非焦点卡只把它转到前方正中、不进项目**；只有点当前焦点卡才 `enter()`。⇒ 脚本必须等开场旋转收尾、`.a5r-card.is-focus` 不再漂移。
- **"邻卡遮挡"实测不成立**：真 Chromium 对焦点卡的**中心 / 左 25% / 左 10% / 左 2px / 右 90% / 上 25%** 六点做 `document.elementFromPoint` ⇒ **六点全部命中 `is-focus` 那张**（`ownerCard=0`）。相邻卡虽横向重叠 **88px**（焦点卡 `(460,366,360×420)` / 邻卡 `(731,392,306×357)`），但 `.a5r-card` 的 `z-index` 是 `500 / 400 / 300 / …`（§5.2 / §26.3），焦点卡恒在最上层。
- **取"等"不取"跳过动画"**：`reducedMotion: 'reduce'`（跳过开场）与正常播完的最终态**逐字段相同** —— 焦点卡 rect 都是 `(460, 366, 360, 420)`、可见卡都是 9、`--a5r-ring-height` 都是 `618px` ⇒ 开场旋转**只影响那 1900ms、不改变落位**。给整条脚本开 reduced-motion 会把后面 `ui-page-* / ui-station-*` 的过渡断言一起压成瞬时（**扩大作用域**），故只在目录页那 3 处等。

**3-b. 机制修正（独立复核提出、本批采纳）**：上面"等开场段"的**判据**改过一版。

- 初版用固定等待 `MENU_INTRO_MS = 2200`（= `SPIN_MS 1900` + 300ms 余量）。独立复核指出这是**手抄副本、余量只有 300ms、且没有任何绑定** ⇒ `SPIN_MS` 一旦调大就会**静默等不够**。**该意见成立，本批采纳**：改成 `waitForMenuSettled()` —— 用 `requestAnimationFrame` 逐帧采样**全部 9 张 `.a5r-card` 的 rect + `.is-focus` 落在第几张**，连续两帧完全一致才返回；15s 内没停稳就**明确报错**（而不是悄悄点错卡）。判据直接是"环不动"，与 `SPIN_MS` 解耦。
- 同一份复核还纠正了根因**理由的写法**（结论不变）：旋转期间点 `.is-focus` 会 `element is not stable`、**反复重试**（本批实测日志 `54 × retrying click action / waiting 500ms` ≈ 27s 之后才转成"稳定"）——**不是**"它自己会停、晚 2s 就成功"。更锋利的机制在于：点击自身的 `pointerdown` 会调 `stopIntro()`（`MenuView.vue:341`）把环**冻在非整数格路上**，而 `snapTo()` 只在 `pointerup` 里 `Math.round`（`:514-519`）⇒ 冻住的位置**不会再吸附**；同一时刻 hover（`:524-531`）也**不**中止旋转 ⇒ 两个条件可能一直不满足，重试到 30s 超时。另有 `SPIN_MS` 手抄副本的漂移风险与"本地 pre-commit 不跑 `build` / `smoke`"两条也一并记下（见本节 7）。

**4. `product.css` 的高度链：**实测**修好了静默塌陷（§5.8 那条"未在本批验证"的自述，本批已验）

| `.ui-panel` | `.ui-panel__body` | `.a5r-stage-body` | `.a5r-ring` | `--a5r-ring-height` | 可见卡 |
|---|---|---|---|---|---|
| **664** | **618** | **618** | **618** | **618px** | **9** |

> 链断掉时的表现（§5.8 记的自述，机制已核）：环 / 轨道 / 9 张卡全是 `position: absolute` ⇒ 面板唯一在流子项高度 0 ⇒ 面板塌到 46px 头部、`--a5r-ring-height` 算成 `0px`（**0 是合法长度，`var()` 不回退**）⇒ `.a5r-ring { height: 0; overflow: hidden }` 把 9 张卡整块裁掉：**页面空白但 DOM 在、单测过、typecheck 过**。
> 另一处**实现选择**（与 §5.8 引用的工作区注释不同、以本行为准）：第 3 环用 `.a5r-stage-body { height: 100% }`，**不是** `flex: 1` —— `.ui-panel__body` 是**块级**盒（设计系统只给它 padding / overflow），`flex` 属性在里面**空转**，必须用 `height: 100%` 吃父级的确定高度。

**5. 本地门禁读数（全过）**

| 道 | 命令 | 读数 |
|---|---|---|
| 1 | `node tools/check-large-files.mjs` | 通过 |
| 2 | `node tools/check-shell-coupling.mjs` | 61 个文件零 `import electron`（DEC-20） |
| 3 | `node tools/check-contracts.mjs` | 枚举 4 组 / 桥消息 27 条逐值一致 |
| 4 | `node tools/check-content-data.mjs` | 7 份内容数据结构与类型一致 |
| 5 | `npm run test:tools` | 9 passed / 0 fail |
| 6 | `web`：`typecheck` / `lint` / `format:check` / `test` / `build` | 全过；**vitest 12 files / 177 passed**；`vite build` 过（`MenuView-*.js` 10.82 kB gzip 4.76 kB） |

**6. 一处实现语义的补记（不是偏差）**：`docs/design/14-a5-menu-ring-contract.md` 新增**附 E**（只增不改）—— E-1 点击口径 **与排版稿 P1 逐条同源**（`pages/a5-menu-ring.html:523-529` 的 `snapTo(i)` / `enterFocused()`，产品 `onCardClick` 同形，**零偏差**；正文 §7 的状态机表只是**没写**"点击"这一维）；E-2 重叠区命中赢家；E-3 "重装开场不换最终态"；E-4 产品侧面板高度链**不吃** `inset: 0`（正文 §10.3 的写法只适用于排版稿的 1080 画布）。**正文条款一字未动。**

**7. 范围复核与未纳入本批的东西**

| 项 | 处置 |
|---|---|
| 本批入 `main` | **3 个 `web/**` + 文档**（`docs/RECORD.md` 本文 · `docs/DECISIONS.md` §34 · `docs/design/14` 附 E） |
| Unity 那条工作线（`NewStructureUnity/Assets/**` 数十项 M / ??，含 `link.xml` 删除与 `(name_conflict)` 文件） | **一件未碰，原样留在工作区** |
| 评审脚手架 `.tmp-a5-verify/` · `.tmp-w4-build/` · `.tmp-a5-fix/` | 保留在工作区、未提交（`docs/RECORD.md` §6.3 的引用因此不悬空） |
| `ISSUE-SWEEP-2026-10-16.md` · `docs/requirement/issue-74-75-quiz-exam-redo.md` | 未跟踪、未提交，归属留给各自的负责人 |
| `%TEMP%\a5-web-ring-wip-backup\` 5 份 `format-patch` | 保留（tag `a5-web-ring-wip` 同时保留，供追溯） |
| `GIT_SEQUENCE_EDITOR` 环境变量 | 本会话已核**不存在**（`unset`） |

**8. 独立复核（另起一个只读复核员，本批提交后做的）**

复核窗口内的**实测核查**结论：`MenuView.vue` 的 blob 与 tag 内 blob 相等（并用 `git cat-file -s` = `34413` = 工作区字节数**反证** `.gitattributes` 的 `* text=auto eol=lf` + `core.autocrlf=true` 没有改写任何字节；无 U+FEFF、CR=0）；`product.css` 那条 hunk **恰 3 条选择器**、`--numstat` = `39 / 0`；`render-smoke.mjs` 里 `.ui-tile-grid` **残留 0 处**、第 4 处换的是 `.a5r-card.is-focus`（"4 处全换成 `.a5r-card`"严格说只有 3/4 成立）；门禁口径 = CI **2 job（8 步 + 10 步）**、hook **6 道**、**共同覆盖 9 条**、**仅 hook 覆盖 0 条**。

| 复核提的问题 | 本批处置 |
|---|---|
| 固定等待是 `SPIN_MS` 的手抄副本、余量 300ms、无绑定 ⇒ 会静默漂 | **采纳**：换成 `waitForMenuSettled()`（帧级判据 + 超时明确报错），见 3-b |
| "旋转期间点必然超时"的理由不准（更锋利的是 `pointerdown → stopIntro` 冻在非整数格） | **采纳**：理由按实测日志与源码更正，见 3-b |
| 本地 pre-commit **不跑** `build` / `smoke`（而本批改的正是 `render-smoke.mjs`），且 `web/node_modules` 缺失时第 6 道整段跳过 ⇒ 只看"本地全过"对冒烟零验证 | **如实记**：本批的冒烟证据来自**本地真跑**（`npm run smoke`，见本节 2）与 **CI 的 `web` job**（10 步含 `npm run build` + `npx playwright install` + `npm run smoke`）；**不把本地 hook 当成冒烟的证据** |
| 提交 6 个文件"多于三项前置"（含 3 份文档） | **如实记**：仓库既有交付纪律要求"每批带记录"（§5.5~§5.9 同例），三份 docs 均为 `+N / −0` 的**只增不改**；范围复核已核**零** Unity / 零未跟踪文件混入 |
| tag 不是 `main` 的祖先（`14509da` 是旁支快照，含 README / DECISIONS / RECORD 差异，`HEAD..tag` 3 个提交） | **如实记**：本批不是 cherry-pick `14509da`，而是**只取**该 tag 的 `MenuView.vue` blob（其余 4 个文件未取），所以 tag 里那几份文档的旧版本**不会**回流 `main` |

复核**未做**（如实记）：没有跑 `npm run smoke`，也没有复现"修复前面板塌到 46px"——那两条的独立证据在本节 2 / 4。

---

## 6 交付状态与 issue 交接（2026-10-16）

### 6.1 本轮交付物

| 类别 | 文件 |
|---|---|
| 新样式 | `docs/ui-mockups/components.css` §26（`.a5r-*`）—— 纯新增，既有规则 0 删除 |
| 三个手写页 | `pages/a5-menu-ring.html`（桌面水平环）· `-narrow.html`（窄屏垂直环）· `-reduced-motion.html`（豁免档） |
| 成果页 | `index.html`（生成物）+ `src/spec-ring.mjs`（新节内容）+ `src/render.mjs` 接线 |
| 生成器 | `src/pages-ab.mjs`（摘除 A5 现状页）· `src/style-spec.mjs`（索引摘除 A5、E 组改「历史留档」+「现役」） |
| 产品 | `web/src/views/MenuView.vue`（网格换环，同一套 `.a5r-*`） |
| 废案标记 | 四个废案页（②③⑦⑧）逐页挂「已废弃」徽章 + `.note` 处置说明（保留在盘不删） |
| 令牌 | `docs/ui-mockups/tokens.css`（**+19**）—— §25 探照灯压暗层令牌（`--scrim-rgb` / `--scrim-mid` / `--scrim-strong`，深浅两套）与 `--dur-page: 160ms`（`:411`，§26.8 的 `160ms` `!important` 字面值就取自它） |
| 手写页 V1 | `pages/a5-menu-v1-pseudo3d.html`（**+440**）—— V1 = 唯一候选的**前身**（伪三维卡片滚动），旧实现已作废、页保留在盘 |
| 方案文档 | `docs/design/13-a5-menu-redo-contract.md`（**+464**）—— 本轮**重写**为方案文档（唯一候选 v1 + 已否决方向清单 + 参数追溯）；**不是"未改"**，见 §5.6(1) |
| 需求条目 | `docs/requirement/issue-73-a5-menu-redo.md`（**+499**）—— Issue #73 需求条目化 |
| 文档 | `docs/RECORD.md`（本文）· `design/14` 附 B/C/D（只增不改）· `docs/README.md` · 根 `README.md` · `docs/DECISIONS.md`（DEC-166） |
| — | **指代更正（§5.8）**：上面"产品"那一行的 `MenuView.vue` **已随本批撤回、不在本批** —— 改走**产品批**（前置条件与留痕见 §5.8） |

### 6.2 issue 交接（**必须做**）

| issue | 标题 | 本轮处置 | 依据 |
|---|---|---|---|
| **#73** | T1 · 菜单页（A5）手写重做 | ✅ **可关闭** —— 唯一候选（水平环形伪三维卡片）三视图 + 产品对齐都已完成并按负责人裁决**"手感 OK，这部分交付"** | 交付物见 §6.1；验收证据见 §5.3 的定稿实测表 + `§12 判据 20/20` |
| **#74** | T2 · 题目样式 | ❌ **保持 open** —— 与本轮无关（C5 小测验 / D2 题目控件），另有 `requirement/issue-74-75-quiz-exam-redo.md` 在跟 | 本轮一个字未动题目控件 |
| **#75** | T3 · 考核页 C7 | ❌ **保持 open** —— 同上 | 同上 |
| **#31**（父） | 页面重做（#73 / #74 / #75） | ❌ **保持 open** —— 三个子 issue 只完成了 #73 | `GET /issues/31/sub_issues` = 3 |
| **#30**（父） | D-04 / D-05 逐页重核（#77~#94 共 18 条） | ❌ **保持 open** —— 与本轮无关 | 见 `ISSUE-SWEEP-2026-10-16.md` |
| — | **指代更正（§5.8）**：#73 的关闭依据**以 §5.8(1) 的收窄口径为准** —— 产品侧四项检查（`vue-tsc` / `eslint` / 177 测试 / `vite build`）**随产品批走，不再算作本批的合入证据** |
| — | **已落实（§5.9）**：#73 **已于 2026-10-16 关闭**（PR #95 squash 进 `main` `9741446`，合并信息内含 `Issue #73`），关闭评论即上方证据链 |

**关闭 #73 时建议附的证据链**（便于复核者不用翻仓库）：
1. 三个排版稿页路径 + 成果页新节「十三、A5 环形菜单」；
2. `docs/design/14-a5-menu-ring-contract.md` §12 的 **V-A~V-S 20/20**（脚本 `.tmp-a5-verify/audit-v12.mjs`）；
3. 定稿实测表（§5.3）：开场落位环序 1 / 静止态档位表逐条等于契约 / 拖拽连续（>100px 单步位移 0 次）；
4. 产品侧 `vue-tsc` / `eslint` / 177 测试 / `vite build` 全过；
5. 契约的三条附录（附 B 三处偏差 / 附 C 四处调整 / 附 D 手感定稿 + 开场旋转）—— **正文条款未改**。

### 6.3 仍未闭合（转后续，不阻塞 #73 关闭）

1. **触控真机**：斜向手势互抢的阈值手感 —— 本机无真触控设备，**未测**（机制已按契约 §7.5 落地）。
2. **性能读数**：未做帧率采样；只核了三条架构门槛（只用 transform/opacity、无滚动条、9 卡常驻）。
3. **`docs/PAGE-WORKLIST.md:3` 的「29 页排版稿」**：那是 2026-10-15 迁移当时的**历史叙述**，按裁决保持不动。
4. **`.tmp-a5-verify/` 与 `.tmp-w4-build/`** 两个评审脚手架（未跟踪）保留作证据；若要清、请连同 RECORD 里对 `counts.mjs` 的引用一起处理。
5. **契约 §4.5 三套数值互不相容**、**§11.3 的 150px 声明**：已在附 B 登记并取定，若要让正文也一致，需另开设计阶段（本文与附录都**不改正文**）。
