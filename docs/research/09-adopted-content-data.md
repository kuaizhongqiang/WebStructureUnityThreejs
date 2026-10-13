# 调研 09：采用的内容数据与三维资产测绘

> 读者：AI 与人｜状态：2026-10-13 v1｜性质：**调研与采纳记录**。
> 层次说明：本文属 `docs/requirement/**`、`docs/research/**` 那一层，**允许保留被调研对象的名称与结论**；
> 但本机绝对路径一律用占位符 `<来源工程>/` 代替（见 `../AGENT.md` §4）。
> 规则与纪律不在这里 —— 落地的规则见 `../design/08-content-data-adoption.md`；采纳决定见 `../DECISIONS.md` DEC-80 起。

## 1 来源与授权

- 负责人 2026-10-13 决定：**全量采用**既有"低压电气实训"虚拟仿真软件（下称**来源工程**）的**内容数据**作为本工程的测试数据，并按需要**复制三维资产**；允许转换格式（本机可用 Blender）。
- 来源工程：`<来源工程>/`，Unity 2022.3 + **URP 14.0.11** + Addressables 1.22.3 + TMP 3.0.7 + Newtonsoft 3.2.1，另有 Beautify / HighlightPlus / ShinySSRR 三个第三方表现插件。
- 纪律：来源工程**只读**（DEC-69）——本轮全过程未修改其任何文件。
- 已采纳的内容：**内容数据 7 份 JSON 全量复制**（见 §2）；三维资产按 §5 的范围与批次搬运（进行中）。

## 2 数据清单（已全量采用）

| 文件 | 体积 | 用途 | 顶层 |
|---|---|---|---|
| `ProjectData.json` | 30,997 B | 内容正文：9 个项目（8 器件 + 1 小测验） | `clips[]` |
| `QuestionData.json` | 13,959 B | 题库：8 道考核题 + 2 道步骤题 | `questions[]` |
| `MenuData.json` | 1,883 B | 菜单树（扁平 `clips[]`，靠 `parentId` 组树） | `clips[]` |
| `StepContentData.json` | 11,625 B | 步骤弹框 / 提示文案（按 `contentType` 分 `UI` / `Tips` 两种形状） | `contents[]` |
| `SystemData.json` | 1,362 B | 软件信息 / 版权 / 画质 / 语言 / 文本形态（唯一可写回的一份） | 对象 |
| `UserData.json` | 380 B | 用户档案占位（游客） | 对象 |
| `LanguageData.json` | 14,475 B | 多语言文案表（65 条） | `languageClips[]` |

合计约 **73 KB**，远低于大文件阈值（DEC-65）。

**9 个项目**（`ProjectData.json` 的 `clips[]`）：

| # | id | 显示名 | 启用的任务槽位 |
|---|---|---|---|
| 1 | `clip_contactor` | 接触器 | principle / info / structure / inspection |
| 2 | `clip_thermalRelay` | 热继电器 | principle / info / structure / inspection |
| 3 | `clip_timeRelay` | 时间继电器 | principle / info / structure / inspection |
| 4 | `clip_masterAppliance` | 主令电器 | principle / info / structure / inspection |
| 5 | `clip_fuse` | 熔断器 | principle / info / structure / inspection |
| 6 | `clip_breaker` | 断路器 | principle / info / structure / inspection |
| 7 | `clip_speedRelay` | 速度继电器 | principle / info / structure（`inspection` 槽位 `taskActive=false`） |
| 8 | `clip_combinationSwitch` | 组合开关 | principle / info / structure（`inspection` 槽位 `taskActive=false`） |
| 9 | `clip_quiz` | 小测验 | exam |

- `purpose` / `equipment` / `lineConnection` / `training` / `test` 五个槽位在**全部**器件里为 `null`（来源工程没有做这五类任务的内容）。
- 每个器件的 `taskInfoData.images` 各 6 张原理图；`taskPrincipleData.principleStructs` 各 1 条。

## 3 三维资产测绘（只读统计）

| 类别 | 数量 | 体积 | 备注 |
|---|---|---|---|
| FBX 模型 | 19 | **18.0 MB** | 8 个器件**各有新旧两代**模型（如 `ACContactor` 与 `NewACContactor`） |
| PNG 贴图 | 284 | **415.6 MB** | 含 3 张未压缩背景大图（20~47 MB/张）与 13 张演示帧（5~6 MB/张） |
| PSD 设计稿 | 5 | **225.8 MB** | 纯美术稿，**不参与运行** |
| 内容资源包（AB） | 8 个 clip 包 | **62.6 MB** | 每 clip 一个无扩展名 bundle |
| 全局资源包（AB） | 4 个 | **21.6 MB** | 相机背景 / 房间图标 / UI（5.15 MB）/ 字体（13.32 MB） |

- **材质不是 URP Lit**：29 个 `.mat` 指向来源工程自制的 ShaderGraph（HDRP→URP 移植版，带脏污遮罩）。
- **最终画面由后处理叠加**：URP Renderer 上有 SSAO + HighlightPlus + Beautify + ShinySSRR + Decal 五项 RendererFeature。
- **两条资源链路的分工**（事实）：**AB** 承担全部 3D / 贴图 / 字体 / UI 内容；**AA 只覆盖 1 个漫游场景**。
- 每个 clip 的包依赖可由 `<来源工程>/Assets/Resources/Config/ContentPackages/` 下的包配置反推（每 clip 3 个模型 + 6 张原理图 = 9 条）。

## 4 可搬运性结论

| 资产 | 搬到新 Unity 工程 | 转 glTF/GLB 给 Three.js |
|---|---|---|
| FBX 模型 + PBR 贴图 | **低**（标准 FBX + BaseColor/AO-Gloss/Normal 三通道） | **可直接转** |
| `.mat` 材质 | **高**（依赖自制 ShaderGraph，缺则紫红） | **不可直接转**（需在 Blender 里降级成 glTF PBR，脏污/清漆效果只能烘进贴图或放弃） |
| 自定义 ShaderGraph | **中–高**（跨 URP 版本可能坏，含子图依赖） | 无对应节点 |
| 预制体 | **中–高**（依赖 HighlightPlus 组件与自制脚本；类名＝预制体名的装配约定） | 不适用 |
| 结构拆装动画（`.anim`） | **中** | **中**（Unity 动画不能直出 glTF，需要在 Blender 重建关键帧） |
| 房间/灯光/贴花/立方体贴图 | 中 | 需先在 Blender 处理 |
| Beautify / HighlightPlus / ShinySSRR | **高**（第三方插件，必须整体带过去） | **必须舍弃**（Three 侧只能用后处理近似） |
| 字体（TMP SDF 33.84 MB） | 中 | 不适用（Web 侧用 DOM 字体） |

**体积风险项（前 5）**：TMP 字体 33.84 MB；3 张未压缩背景图 ≈ 115 MB；PSD 226 MB（可剔除）；演示帧 13 张 ≈ 71 MB；房间 PBR 贴图 ≈ 50 MB。

## 5 采纳范围与剔除项

**采纳**（按批次搬运，落点与忽略规则见 `../design/03-layout-and-assets.md`）：

1. **内容数据 7 份 JSON**（已采纳，两侧各一份）；
2. **8 个器件的新代 FBX + PBR 贴图**（用于 Unity 侧复杂三维任务）；
3. **原理图 Sprite**（8 器件 × 6 张，用于 Web 侧图文页面）；
4. **菜单 / 公共 UI 图**（按需，体积小的那些）。

**剔除**：

- 5 个 PSD 设计稿（226 MB，不参与运行）；
- 13 张演示帧 `TVShow_*.png`（71 MB，漫游展示用，本阶段不做漫游内容）；
- 3 张未压缩背景大图（115 MB，需要时另行压缩后再取）；
- 旧代 FBX 与配套贴图（同一器件两代模型，只取新代）；
- TMP 字体 SDF（Unity 侧不再用 UGUI/TMP 做界面 —— DEC-80）；
- 第三方表现插件与自制 ShaderGraph（**改用量身重做的 URP 材质**：贴图通道直接映射，效果降级可接受，避免把插件与自制 Shader 拖进新工程）。

## 6 未决 / 待办

| 项 | 状态 |
|---|---|
| 三维资产的**分批复制与格式转换**（含 Blender 批量转 GLB） | 进行中；清单与落点见 `../design/03-layout-and-assets.md` §5 |
| 来源工程里**题目有两套**（`QuestionData.json` 的 8 道考核题 与 `clip_quiz.taskExamData` 的 5 道题，内容不同） | 采用现状（两套都留着），口径见 `../design/04-data-model.md` §2.5 |
| 结构拆装动画（`.anim`）是否重建 | 待三维资产批次推进后定 |
| 漫游（房间）内容是否采纳 | 本期只保留"漫游"这个 TaskType 位置，不采纳房间内容 |
