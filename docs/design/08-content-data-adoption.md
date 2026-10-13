# 设计 08：内容数据的采用与"双份"口径

> 读者：AI 与人｜状态：2026-10-13 v1｜依据：`../DECISIONS.md` **DEC-80 ~ DEC-84**（本轮决策）。
> 相关：数据的来源与测绘见 `../research/09-adopted-content-data.md`（那一层允许写被调研对象名称）；
> 本文只写**规则**，不写来源工程名与本机路径（`../AGENT.md` §4 第一层）。

## 1 为什么是"两份"，以及为什么这不是"两个真源"

本工程的内容数据**物理上有两份**（DEC-82，负责人选定"两边都手写 + 门禁报不一致"）：

| 侧 | 落点 | 谁写 | 随什么发布 | 怎么读 |
|---|---|---|---|---|
| **Web** | `web/public/content/data/*.json` | 手写 | `web/dist` → 桌面壳 / 静态服务器 | `fetch` |
| **Unity** | `NewStructureUnity/Assets/StreamingAssets/Data/*.json` | 手写（后续由编辑期 ScriptableObject 导出覆盖） | Unity 构建产物 | `UnityWebRequest`（**WebGL 下没有本地文件系统**） |

**为什么不能只留一份**：两侧的读取通道不同（浏览器 `fetch` vs Unity 的 `StreamingAssets` HTTP），而内容数据必须**跟各自的构建一起发布**（DEC-23：内容整体重发、不做热更新）。让其中一侧去读另一份，就要么跨域、要么把 Unity 的产物塞进 `dist`，两种都比"两份 + 门禁"更贵。

**为什么它仍然不算"两个真源"**：两份是**同名文件、同结构**，且 `tools/check-content-data.mjs` 在提交与合并两处机械比对。风险与取舍已写进 DEC-82：**门禁只能发现不一致、不能告诉人改哪边** —— 负责人接受这一点（希望两份各自独立维护）。

## 2 门禁 `tools/check-content-data.mjs`

- **比对对象**：`web/public/content/data/<名>.json` ↔ `NewStructureUnity/Assets/StreamingAssets/Data/<名>.json`，逐文件。
- **比对内容**：**结构签名 = 字段路径 + 值类型**（例如 `clips[].taskInfoData.prefabKey: string`）。**不比对值** —— 两份的值允许不同（不同语言样例、不同阶段的占位）。
- **`null` 是真实类型**：`"taskInspectionData": null` 与一个对象**判为不一致**（这正是"某个任务槽位没启用"与"启用了"的差别）。
- **登记表**：文件清单写死在 `FILES` 数组里 —— **新增数据文件必须同批登记**，否则门禁看不见它。
- **接入点**：`.git/hooks/pre-commit` 第 4 步 + `.github/workflows/gate.yml`。
- **抓得到**：一边加了字段忘了另一边、字段改名、类型从 string 变 object、文件缺失。
- **抓不到**：值写错、枚举名字拼错（除非拼错到连枚举都不认识）、两侧"同时改错"。

## 3 数据的形状（采用现状，不改动）

顶层是对象，每份文件一个顶层数组或对象；**九个项目**在 `ProjectData.json` 的 `clips[]` 里。

### 3.1 项目（`ProjectClip`）

```jsonc
{
  "id": "clip_contactor",
  "displayName": "接触器",
  "displayNameEn": "Contactor",
  "description": "…",
  "taskPurposeData": null,          // 未启用就是 null（不是缺字段）
  "taskEquipmentData": null,        // …
  "taskPrincipleData": { … },       // 启用：实验原理
  "taskLineConnectionData": null,
  "taskTrainingData": null,
  "taskTestData": null,
  "taskExamData": null,
  "taskInfoData": { … },            // 启用：简介
  "taskStructureData": { … },       // 启用：结构（Unity 三维）
  "taskInspectionData": { … }       // 启用：检测（Unity 三维）
}
```

**十个槽位是固定形状**（`taskPurposeData` … `taskInspectionData`），对应 11 个 `TaskType` 里的 10 个（`None` 无槽位）。
**约定**：槽位要么是 `null`、要么是**该任务的完整对象**；不出现"空对象占位"。

### 3.2 每个槽位自带的公共字段

所有任务槽位共享：`id` / `displayName` / `displayNameEn` / `description` / `taskActive`（布尔，`false` = 该任务对该项目**不启用**）。

### 3.3 各槽位的专有字段

| 槽位 | 专有字段 |
|---|---|
| `taskPurposeData` | `contentText` / `contentTextEn` / `prefabKey` |
| `taskEquipmentData` | `equipmentStructs[]`（`prefabKey` / `title` / `titleEn` / `contentText` / `contentTextEn` / `audioName`） |
| `taskPrincipleData` | `principleStructs[]`（`title` / `titleEn` / `contentText` / `contentTextEn` / `videoName`） |
| `taskLineConnectionData` / `taskTrainingData` / `taskStructureData` / `taskInspectionData` | `prefabKey` |
| `taskInfoData` | `contentText` / `contentTextEn` / `prefabKey` / `imageKey` / `images[]` |
| `taskTestData` / `taskExamData` | `questionClips[]`（内联题目，见 §3.5） |

### 3.4 题库（`QuestionData.json`）

```jsonc
{
  "questions": [
    {
      "id": "1",
      "displayName": "…",
      "questionText": "题干",
      "questionTextEn": "…",
      "questionType": "SingleChoice",   // ★ 名字，不是序号
      "usage": "Step",                 // ★ 缺省 = Exam
      "options": [{ "itemText": "…", "itemTextEn": "…", "isCorrect": true }]
    }
  ]
}
```

### 3.5 题目有两套（现状事实，**都保留**）

| 来源 | 数量 | 用途 |
|---|---|---|
| `QuestionData.json` | 8 道 `usage=Exam` + 2 道 `usage=Step` | 考核抽题池 / 步骤内答题 |
| `ProjectData.json` 的 `clip_quiz.taskExamData.questionClips[]` | 5 道（内联） | "小测验"这个项目的题目 |

两套内容不同、互不覆盖。**规则**：`usage` 决定"这道题进不进考核池"，`clip_quiz` 的内联题只服务于"小测验"项目本身；**不允许**把它们合并（合并会改变既有内容语义）。

### 3.6 菜单（`MenuData.json`）

扁平 `clips[]`，靠 `parentId` 组树；`parentId` 为 `null` 的是根。**不要写成空字符串**（空串会被当成"父节点是空 id"而查不到根）。

## 4 枚举在数据里一律写**名字**（DEC-83）

- 数据里的枚举字段写成**枚举名**：`"questionType": "SingleChoice"`、`"usage": "Step"`、`"contentType": "UI"`。
- **不写序号**。理由：① 这是被采纳数据的既有口径（改成序号等于全量改写数据，且失去可读性）；② 名字在 diff 与评审里可读；③ 序号一旦改动就会静默错位，而名字改了会立刻被门禁的"名字比对"抓住。
- 因此**枚举的"名字"是契约的一部分**：`QuestionType` / `QuestionUsage` 的名字与序号在 `web/src/contracts/question-type.ts`、`NewStructureUnity/Assets/Scripts/Contracts/EnumAll.cs`、`content/contracts/snapshot.json` 三处同批维护。
- 注意：`SceneState` / `TaskType` 这两个**跨端代码契约**仍以序号为准（它们不在内容数据里，是导航与分流开关）。

## 5 资源标识（`prefabKey` / `images` / `videoName` / `audioName`）的命名规则

我们从被采纳数据里提取到以下规则，**照它执行**（来源见 `../research/09-adopted-content-data.md` §3）：

1. **器件段**取自项目 id 去掉 `clip_` 前缀（如 `clip_contactor` → `contactor`；驼峰保持原样，如 `clip_timeRelay` → `timeRelay`）。
2. **任务段**用固定词：`info` / `structure` / `principle` / `inspection`。
3. **模型包 key** = `{器件}_{任务}_model`（例：`contactor_structure_model`）。
4. **原理图 key** = `{器件}_info_{NN}`（`NN` 从 `01` 起，例：`contactor_info_01`）。
5. **内容资源包名** = `Content/{项目 id 全小写}`（例：`Content/clip_contactor`）。**bundle 文件名一律小写，目录段保持原样** —— 大小写写错在 WebGL 上表现为 404。
6. `videoName` / `audioName` **不是包 key**：前者拼 `StreamingAssets/Video/{名}.mp4`，后者走 `Resources` 下的音频目录。

## 6 编辑期与运行期（Unity 侧，**待实现**）

被采纳数据的既有形态是"**编辑期 ScriptableObject → 构建前钩子全量导出 JSON → 运行期只读**"：

- 导出是**单向覆盖**（SO → JSON，无回写、无合并）；
- **危险点**：一旦生成了空的 SO，构建前钩子会把对应 JSON 覆盖成空。采用其数据时**必须先备份 JSON**，并禁止在未填数据时执行"创建缺失 SO"。
- 运行期唯一例外：**设置类字段**（画质 / 语言）允许写回，WebGL 下写盘失败只告警、保留内存态。

本工程本期**先沿用"JSON 手写"**（两份都在手写），把"SO 导出链"作为下一批（已在 `../DECISIONS.md` 未闭合表登记）。

## 7 未采用 / 明确不做

- 不采用其**目录布局**与**代码**（DEC-69）；只取数据与资产。
- 不采用其"每帧物理射线拾取"的实现（本工程用 `EventSystem + PhysicsRaycaster`，DEC-80）。
- 不采用其 TMP 字体资产（本工程 Unity 侧不做 UGUI/TMP 界面，DEC-80）。
- 内容层面的 `StepType`（步骤交互类型）**本期不纳入契约**：被采纳数据里没有"步骤序列"字段（步骤数据在来源工程里不在 JSON 中），本工程先不定义，避免造一份没有数据支撑的契约。
