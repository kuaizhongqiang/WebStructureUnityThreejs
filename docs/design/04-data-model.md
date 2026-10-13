# 设计 04：数据模型

> 读者：AI 与人｜状态：2026-10-13 **v1（已按被采纳数据对齐）**｜依据：`../DECISIONS.md` DEC-04（结构全量 / 功能按游客）、DEC-54（本地只存一个 JSON）、DEC-82（内容数据双份）、DEC-83（枚举写名字）。
> 纪律：本文描述的**契约字段**改一处就要三处同批改（TS / 快照 / C#，DEC-10 / DEC-67）；**内容数据**是两份同名文件，改一处要同批改另一处（DEC-82）。
> 内容数据的形状、门禁与命名规则详见 [`08-content-data-adoption.md`](./08-content-data-adoption.md)；来源与测绘见 `../research/09-adopted-content-data.md`。

## 1 两类数据，不要混

| | **内容数据**（随包发布、只读） | **本地数据**（用户产生、可写） |
|---|---|---|
| 放哪 | **两份**：`web/public/content/data/*.json`（Web）+ `NewStructureUnity/Assets/StreamingAssets/Data/*.json`（Unity） | `localStorage`，**一个 JSON**（DEC-54） |
| 谁读 | Web `fetch`；Unity `UnityWebRequest`（WebGL 无本地文件系统） | 运行时（浏览器） |
| 谁写 | **手写**（后续 Unity 侧由编辑期 ScriptableObject 单向导出覆盖） | 运行时 |
| 有无后端 | 无（DEC-21）；将来对接走单一入口（DEC-43） | 无 |
| 门禁 | `tools/check-content-data.mjs`（结构签名比对） | — |

> **同一份结构，两处落点**：Content（随包）与 Save（本机）。将来接后端时 `save` 整体换成远端读写，`content` 不变。

## 2 内容数据（只读）

**权威形状 = 被采纳数据的形状**（DEC-80 / DEC-82），本节只做索引；逐字段清单见 [`08-content-data-adoption.md`](./08-content-data-adoption.md) §3。

| 文件 | 顶层 | 说明 |
|---|---|---|
| `ProjectData.json` | `clips[]` | **项目**。每个项目含 **10 个固定任务槽位**（`taskPurposeData` … `taskInspectionData`），未启用写 `null` |
| `QuestionData.json` | `questions[]` | 题库：`usage` 决定进不进考核抽题池 |
| `MenuData.json` | `clips[]` | 菜单树（扁平 + `parentId`；`null` 才是根） |
| `StepContentData.json` | `contents[]` | 步骤弹框 / 提示文案（按 `contentType` 分 `UI` / `Tips` 两种形状） |
| `SystemData.json` | 对象 | 软件信息 / 版权 / 画质 / 语言 / 文本形态（**唯一允许运行期写回**的一份） |
| `UserData.json` | 对象 | 用户档案（当前恒为游客，但字段保留 —— DEC-04） |
| `LanguageData.json` | `languageClips[]` | 多语言文案表 |

### 2.1 项目 / 任务

```jsonc
{
  "id": "clip_contactor",
  "displayName": "接触器",
  "displayNameEn": "Contactor",
  "description": "…",
  "taskPrincipleData": {
    "id": "clip_contactor_principle",
    "displayName": "实验原理",
    "taskActive": true,
    "principleStructs": [{ "title": "…", "contentText": "…", "videoName": "01jcq_yl" }]
  },
  "taskStructureData": { "taskActive": true, "prefabKey": "contactor_structure_model" },
  "taskInspectionData": { "taskActive": false, "prefabKey": "contactor_inspection_model" }
}
```

规则：

1. **`id` 是稳定字符串主键**（形如 `clip_<器件>`），**不是数组下标**（DEC-69）；
2. **槽位只有两种状态**：`null`（未启用）或完整对象；不出现空对象占位；
3. `taskActive=false` 表示"该任务在这个项目里不启用"（与"槽位为 null"并存，两者都要按不启用处理）；
4. **三维资源只写 key**（`prefabKey` / `images[]`），不写路径 —— 路径由各端的包登记表解析（`design/03` §7，DEC-42）。

### 2.2 枚举一律写**名字**（DEC-83）

数据里的枚举字段写成枚举名，不写序号：

```jsonc
{ "questionType": "SingleChoice", "usage": "Step", "contentType": "UI" }
```

因此 `QuestionType` / `QuestionUsage`（以及后续任何进内容数据的枚举）的**名字**是契约，三处同批维护：
`web/src/contracts/question-type.ts` ↔ `content/contracts/snapshot.json` ↔ `NewStructureUnity/Assets/Scripts/Contracts/EnumAll.cs`。

| 枚举 | 取值 | 中文标签 |
|---|---|---|
| `QuestionType` | `None`=0 / `SingleChoice`=1 / `MultipleChoice`=2 / `TrueFalse`=3 / `FillInBlank`=4 | 空类型 / 单选 / 多选 / 判断 / 填空 |
| `QuestionUsage` | `Exam`=0 / `Step`=1 | 考核 / 步骤 |

> **注意**：`SceneState` / `TaskType` 仍以**序号**为准 —— 它们是跨端**代码**契约（导航状态与三维分流开关），不出现在内容数据里。

### 2.3 题目

```jsonc
{
  "id": "1",
  "questionText": "题干",
  "questionTextEn": "…",
  "questionType": "SingleChoice",
  "usage": "Exam",
  "options": [{ "itemText": "选项", "itemTextEn": "…", "isCorrect": true }]
}
```

- `usage` **缺省即 `Exam`**；
- 题目有两套来源（题库文件 + "小测验"项目内联），**都保留**（`08-content-data-adoption.md` §3.5）。

### 2.4 步骤（`Step`）—— 本期**不纳入契约**

被采纳数据里**没有步骤序列**（步骤是被采纳工程里挂场景对象上的编辑器数据，不进 JSON）。
因此本工程**本期不定义步骤数据契约**，避免造一份没有数据支撑的契约；等真有步骤内容时再按"新增契约"流程走（三处同批改）。

### 2.5 与其它契约的关系

| 契约 | 落点 | 谁比对 |
|---|---|---|
| `SceneState` / `TaskType` / `QuestionType` / `QuestionUsage` | 三处（TS / 快照 / C#） | `tools/check-contracts.mjs` |
| 桥消息类型（23 条） | 三处（TS / 快照 / C#） | `tools/check-contracts.mjs` |
| 内容数据（7 份同名文件） | 两处（Web / Unity） | `tools/check-content-data.mjs` |

## 3 本地数据（可写，`wsu3.save.v1`，DEC-54）

```jsonc
{
  "version": 1,
  "profile": {
    "userType": 0,             // 0 未知(游客) / 1 学生 / 2 教师 / 3 管理员
    "nickname": "游客",
    "createdAt": 0
  },
  "progress": {
    "currentProjectId": null,
    "projects": {
      "clip_contactor": {
        "completion": 0,                       // 0 未完成 / 1 已完成
        "currentTaskType": null,
        "updatedAt": 0
      }
    }
  },
  "scores": [
    { "projectId": "clip_contactor", "taskType": 10, "score": 88, "at": 0, "detail": {} }
  ],
  "settings": {
    "locale": "zh-CN",
    "qualityProfile": "high",   // low / high；移动端强制 low（DEC-70）
    "volume": 1
  }
}
```

规则：

1. **一个 JSON，不拆多份**（DEC-54）；读写只有一处实现（`web/src/stores/progress.ts`），其他模块不得直接碰 `localStorage`；
2. `userType` 现在恒为 `0`（游客），但**字段保留**（DEC-04：结构全量、功能按游客）；
3. `scores` 只追加不修改；
4. 进度**按"项目 + 任务"记**（本工程一个项目只有一个 `currentTaskType` 在推进）；
5. 将来接后端（DEC-43）时把实现换成远端读写即可，**结构不变**。

## 4 与既有同类工程的对照（照抄词汇，不照抄结构）

| 本设计 | 既有同类工程（见 `../research/04` / `../research/09`） |
|---|---|
| `Project` / 项目槽位 | `ProjectData → ProjectClip → taskXxxData`（十槽位） |
| `Question` | `QuestionData → QuestionClip`（题型 + 用途 + 选项） |
| 本地数据 `profile.userType` | `UserType`（未知 / 学生 / 教师 / 管理员） |
| 进度 `completion` | `CompletionStatus`（未完成 / 已完成） |
| 内容数据两份 + 门禁 | 该工程只有 Unity 侧一份（Web 侧不存在）—— **这是我们的新约束** |

**刻意不照搬的四点**：

1. 用**稳定字符串 id** 做主键，不用数组下标；
2. **枚举写名字**，不写序号（该工程的数据里两种混用）；
3. 内容数据**两份 + 门禁**（该工程没有第二份消费者）；
4. 步骤数据**不进 JSON** 这一点继承其现状，但**不继承**"步骤编辑器"这类编辑器工具。

## 5 待办

| 项 | 状态 |
|---|---|
| Unity 侧"编辑期 SO → 导出 JSON（单向覆盖）"的链路 | **待实现**（登记在 `../DECISIONS.md` 未闭合表） |
| Web 侧内容层改造为读 `content/data/*.json` | **待实现**（当前 `stores/content.ts` 仍走 `content/projects/` 的演示数据） |
| 是否引入 JSON Schema 校验内容数据 | 本阶段不做；现有门禁做的是**结构签名**比对 |
| 多语言 | 内容数据自带 `*En` 列；`locale` 只进 settings |
