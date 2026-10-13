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