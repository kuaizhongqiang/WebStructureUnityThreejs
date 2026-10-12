# 调研 06：规模基线（参照工程 `SensorSimulationTrainingSoftware_v1.0_2026`）

> 读者：AI 与人｜状态：2026-10-12 v0（只读调研，被参照工程未被修改）｜用途：DEC-02 的容量预算依据。

## 0 为什么看它

- 它是**同一团队、同一技术栈**（Unity `2022.3.53f1c1` + URP `14.0.11`）、并且是**"框架 + 可换内容"**范式的既有工程 —— 与 DEC-01（做框架）同构。
- 用户明确说：本项目规模**按它的 3 倍**算（DEC-02）。

## 1 它的规模事实

### 1.1 内容规模

| 项 | 数量 | 性质 |
|---|---|---|
| 教学项目 / 章节（`ProjectClip`） | **17** | **实测**（`docs/拓展17项目分析.md` 逐个列表 + `Assets/Prefabs/Model/Training/` 下 17 个 `*_training.prefab` 双向印证） |
| 每项目任务槽（`TaskType`） | 6（`Purpose/Equipment/Principle/LineConnection/Training/Test`） | 实测（枚举） |
| 任务槽总数 | 约 102，其中**实际有内容约 85**（`Principle` 全部 `active:false`） | 估算 |
| 场景 | 游戏 4（`0_Setup`/`1_Content`/`2_Roaming`/`99_Loading`）+ 预览 4 | 实测（`Assets/Scenes/`） |
| 步骤 Step | **仅 #0 项目完整**：`LineConnection` 18 步 + `Training` 21 步 = 39 步 | 实测 |
| 题目 Question | 仅 #0：结论题 4 + 测验 5 = 9 道 | 实测 |
| 仪器 Equipment 条目 | 仅 #0：5 件 | 实测 |
| 完成度 | 仅 #0 完整、#1 部分，其余 15 个是空壳 | 实测（`docs/拓展17项目分析.md:5`） |

### 1.2 内容数据（JSON）

**真正的教学数据在 `Assets/StreamingAssets/Data/`**（根目录的 `data/` 是空目录壳，别被误导）：

| 文件 | 大小 | 作用 |
|---|---|---|
| `ProjectData.json` | **561.14 KB** | 核心：17 个项目 + 任务 + 步骤 + 内联题目 |
| `QuestionData.json` | 3.51 KB | 公共题库（几乎未用，题目都内联在 ProjectData 里） |
| `SystemData.json` | 1.08 KB | 系统配置 + 场景表 |
| `14Sensor.json` | 2.36 KB | 元件元数据 |
| 用户进度 2 个 | <1 KB | 单用户进度 |

数据层级（键名）：`ProjectDatas[] → ProjectClip{index,name,desc,score,active,taskDatas[]} → TaskDataBase{index,name,taskType,score,active,...} → ProcessingData{StepClips[]} / items[] / QuestionClips[]`；多态反序列化用 `Newtonsoft.Json` + `TaskDataConverter`。

### 1.3 三维交互件

- **约 90 个三维预制体**（17 接线 + 17 实训 + 10 Purpose + 40 Equipment + UI 元件）；**约 40 个交互 `.cs`**。
- **交互类型约 10 种**（类型数少、实例多）：点击推进、接线（两点连线）、旋钮旋转、按钮开关、数显/仪表读数、物体显隐、答题（单选/多选/判断/填空/排序）、漫游点击、轨道旋转浏览、长按/高亮。

### 1.4 既有状态模型（对 DEC-09 的补充证据）

| 枚举 | 位置 | 值 |
|---|---|---|
| `TaskType` | `Assets\Scripts\Data\ProjectData.cs:106` | `None, Purpose, Equipment, Principle, LineConnection, Training, Test`（**7 值**） |
| `StepType` | `Assets\Scripts\Data\StepData.cs:190` | `Default, Click, Drag, UIShow, Question, Line, Text` |
| `StepStatus` | `Assets\Scripts\Data\StepData.cs:201` | `Ready, Start, Finish` |
| `SceneClipType` | `Assets\Scripts\Data\SystemData.cs:168` | `None, Tour, Show, Step, Exam` |
| `QuestionType` | `Assets\Scripts\Data\QuestionData.cs:110` | 单选/多选/判断/填空 |

> ⚠️ **它的 `TaskType` 只有 7 值，正好是 MCV 那套 11 值的前 7 个**（`None/Purpose/Equipment/Principle/LineConnection/Training/Test`）。我们按 DEC-09 继承 **11 值**，因此**复用它的内容数据需要一张映射表**。

### 1.5 技术栈事实

- Unity `2022.3.53f1c1`、URP `14.0.11`（与本项目一致）。
- 包：Addressables `1.22.3`、Cinemachine `2.10.7`、InputSystem `1.11.2`、TMP `3.0.9`、FBX `4.2.1`、scripting-python `6.0.1`；另以 `Assets/` 形式提供 AVProVideo、Beautify、HighlightPlus、Newtonsoft.Json、AssetBundle-Browser。
- `ProjectSettings` 里有 WebGL 字段，但都是模板默认值，**没有证据表明真正做过 WebGL 构建**（`m_BuildTargetGraphicsAPIs: []`、无 WebGL 产物）⇒ **它的经验不能替我们回答 WebGL 能不能跑**（这正是 DEC-13 要做的）。
- **没有** Web / Three.js / Electron 相关目录或文档（与本仓库的另一参考工程 `MCV_Module_0928` 结论一致）。

### 1.6 资源体量

| 类别 | 事实 |
|---|---|
| `Assets/Model/` | 440 文件；含 4 个 `Precaution_*.psd` **各约 58MB**（合计约 232MB，源文件不入包）；最大 fbx 2.85MB |
| `Assets/Sprites/` | 500 文件，含 17 个视频约 25MB，单图最大 5.35MB |
| `Assets/Video/` + `StreamingAssets/Video/` | 4 个 mp4，约 19.4MB |
| `Assets/Prefabs/` | 250 文件，单预制体最大 1.41MB；Training 预制体 0.43~2.02MB |
| `StreamingAssets/AB/` | 312 个 AB 文件，最大 **8.57MB**，多个 4.48MB |
| **`Assets/` 总量** | 约 **350~500MB**（估算，被 232MB 的 PSD 源文件主导） |
| **实际需随包加载** | 约 **80~120MB**（估算） |

## 2 换算到本项目的容量预算（DEC-02：×3）

### 2.1 可数（有实测基准）

| 项 | 参照工程 | 本项目（×3） |
|---|---|---|
| 教学项目 / 章节 | 17 | **约 51** |
| 场景 | 4 + 4 | 12 + 12 |
| 三维预制体 | 约 90 | **约 270** |
| 交互脚本 `.cs` | 约 40 | 约 120 |
| **交互类型** | 约 10 种 | **10~15 种（类型不翻倍，是实例翻倍）** |
| 教学 JSON 体量 | 561KB | **约 1.7MB** |

### 2.2 可估（以 #0 为模板线性外推，仅供参考区间）

| 项 | 参照工程（#0 模板） | 本项目（×3） |
|---|---|---|
| 步骤 Step | 39 步/项目 | **约 1500~2000 条** |
| 题目 Question | 9 道/项目 | **约 450 道** |
| 仪器 Equipment 条目 | 5 件/项目 | **约 255 件** |
| 知识点 Tips | 每步 2 条 | **约 3000~4000 条** |

### 2.3 资源与包体预算（**关键约束**）

| 项 | 参照工程 | 本项目（×3） |
|---|---|---|
| `Assets/` 总目录（含源文件） | 350~500MB | **1.0~1.5GB** |
| 实际需装载资源 | 80~120MB | **约 250~360MB** |
| 单个 AB 包最大 | 8.57MB | 建议**仍限 ≤10MB**（拆包，不线性放大） |

## 3 结论（直接影响我们）

1. **数据层可以忽略**（×3 后仍 <2MB）；**撑预算的是模型/贴图/视频**。⇒ 分包与压缩必须从第一天做（DEC-02）。
2. **交互类型不随规模翻倍**（10~15 种），所以"做框架"是正确策略：**把 10~15 种交互做成框架能力，内容只是参数与资源**。
3. **源资产 1~1.5GB 不能进 git** ⇒ 需要明确的资产入库方式（R2 问题）。
4. **参照工程没做过 WebGL 构建**，因此它的"能跑"不能证明我们的 WebGL 能跑 ⇒ DEC-13 的基线实测不可跳过。
5. **`TaskType` 7 值 vs 11 值的差异**必须在复用其内容前解决（映射表）。
