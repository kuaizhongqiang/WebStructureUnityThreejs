# 设计 04：数据模型草案

> 读者：AI 与人｜状态：2026-10-12 v0（**草案，待确认**）｜依据：`../DECISIONS.md` DEC-04（数据模型全量 / 功能按游客）、DEC-54（本地只存一个 JSON）、DEC-72（本文由 AI 起草）。
> 纪律：这是**双端共享契约**的一部分 —— 改字段必须同批改 C# 侧与 `content/contracts/snapshot.json`（DEC-10 / DEC-67），否则门禁拦提交。

## 1 两类数据，不要混

| | **内容数据**（随包发布、只读） | **本地数据**（用户产生、可写） |
|---|---|---|
| 放哪 | `content/projects/*.json` | `localStorage`，**一个 JSON**（DEC-54） |
| key | `wsu3.content.v1`（只读，前端加载） | `wsu3.save.v1` |
| 谁写 | 内容制作者 / 工具 | 运行时（浏览器） |
| 有无后端 | 无（DEC-21）；将来对接走单一入口（DEC-43） | 无 |
| 规模 | ×3 后约 1.7MB（`research/06-scale-baseline.md`） | 几 KB ~ 几百 KB |

> **同一份结构，两个文件前缀**：`content` 与 `save`。将来接后端时，`save` 部分整体替换为服务端读写，`content` 部分不变。

## 2 内容数据（只读）

### 2.1 顶层

```jsonc
{
  "version": 1,
  "projectId": "proj.001",
  "name": "项目名称",
  "engName": "project_001",        // 与资源命名/AB 分组对齐用（参照工程有 engName 的经验）
  "desc": "一句话简介",
  "score": 100,                    // 该项目的满分
  "active": true,                  // 是否开放（参照工程用 active 做过"未做"的占位）
  "tasks": [ /* Task[]，见 2.2 */ ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `version` | number | ✓ | 数据结构版本，用于将来迁移 |
| `projectId` | string | ✓ | 稳定主键，**不要用数组下标**（参照工程用 `index`，插入即错位） |
| `name` / `engName` | string | ✓ | 中文名 / 英文名（engkName 用于资源与分包命名） |
| `desc` | string | | |
| `score` | number | | 满分 |
| `active` | boolean | ✓ | 未完成的项目也能随包发布 |
| `tasks` | Task[] | ✓ | **按 11 个 `TaskType` 组织**（DEC-36） |

### 2.2 Task（每个 `TaskType` 一条）

```jsonc
{
  "taskType": 5,                   // ★ 用枚举序号，与 DEC-09 契约一致
  "active": true,
  "score": 60,
  "camera": { "preset": "orbit", "target": "root" },   // 相机预设，缺省用登记表默认值（design/01）
  "resources": ["lib.sensor.temperature"],              // ★ 引用资产登记表的 key（DEC-42）
  "data": { /* 按 taskType 不同，见 2.3 */ }
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `taskType` | number | ✓ | `TaskType` 序号（`SceneState` 不在这里——它是导航状态，不是内容） |
| `active` | boolean | ✓ | |
| `score` | number | | |
| `camera` | object | | 相机预设；缺省走登记表（`design/01-tasktype-registry.md`） |
| `resources` | string[] | | **只放 key，不放路径** —— 路径由资产登记表解析（否则两端路径写死会漂移） |
| `data` | object | ✓ | 判别式联合，由 `taskType` 决定形状 |

### 2.3 `data` 的形状（判别式联合）

| `taskType` | `data` 形状 | 说明 |
|---|---|---|
| `Purpose` / `Info` | `{ sections: Section[] }` | 图文段落（`Section = { title, body, imageKey? }`） |
| `Equipment` | `{ items: EquipmentItem[] }` | `EquipmentItem = { key, name, iconKey?, modelKey?, desc? }` |
| `Principle` | `{ sections: Section[], animations?: AnimationRef[] }` | 原理讲解 + 动画示意 |
| `Test` / `Exam` | `{ questions: Question[] }` | 见 2.5；`Test` 是随堂小测，`Exam` 是考核（可带抽题规则） |
| `LineConnection` | `{ steps: Step[], slots: ConnectionSlot[] }` | 见 2.4；`ConnectionSlot = { key, name, points: number }` |
| `Training` | `{ steps: Step[] }` | 见 2.4 |
| `Structure` | `{ parts: PartNode[] }` | 部件树 `PartNode = { key, name, children? }` |
| `Inspection` | `{ steps: Step[], instruments: InstrumentRef[] }` | 巡检步骤 + 仪表引用 |

### 2.4 Step（步骤，参照工程最成熟的一块）

```jsonc
{
  "stepId": "s1",              // 项目内唯一
  "name": "连接电源",
  "tips": "把红色表笔接到...",  // 步骤提示（对应参照工程的 stepTips）
  "opTips": "注意量程",         // 操作提示（对应 opTips）
  "stepType": 1,               // StepType 枚举，见下表
  "condition": { "type": 1, "target": "lib.sensor.temperature", "value": null },
  "imageKey": "lib.img.step1"
}
```

`StepType`（**新增契约，需与 C# 同步**；取值参照参照工程 `StepClip*` 的 9 种交互类型）：

| 值 | 名称 | 含义 |
|---|---|---|
| 0 | `None` | 无交互（纯展示） |
| 1 | `Click` | 点击推进 |
| 2 | `Drag` | 拖拽 |
| 3 | `UiShow` | 显示/隐藏某 UI 或物体 |
| 4 | `Question` | 步骤内答题 |
| 5 | `Line` | 接线（两点连线） |
| 6 | `Knob` | 旋钮旋转 |
| 7 | `Switch` | 按钮/开关 |
| 8 | `Meter` | 仪表读数确认 |

`StepStatus`：`Ready` / `Waiting` / `Complete`（**运行时状态，不进内容 JSON**；参照工程与 MCV 都用这三态）。

### 2.5 Question

```jsonc
{
  "id": "q1",
  "questionType": 1,        // 1 单选 / 2 多选 / 3 判断 / 4 填空 / 5 排序（与参照工程一致）
  "content": "题干",
  "options": [{ "key": "a", "text": "选项 A" }],
  "answer": ["a"],
  "score": 5,
  "analysis": "解析",        // 可选
  "usage": 1                // 1 步骤答题 / 2 考核抽题池（MCV 的 QuestionUsage）
}
```

## 3 本地数据（可写，`wsu3.save.v1`，DEC-54）

```jsonc
{
  "version": 1,
  "profile": {
    "userType": 0,             // 0 未知(游客) / 1 学生 / 2 教师 / 3 管理员（沿用 MCV 的 UserType）
    "nickname": "游客",
    "createdAt": 0
  },
  "progress": {
    "currentProjectId": null,
    "projects": {
      "proj.001": {
        "completion": 0,                       // 0 未完成 / 1 已完成（MCV 的 CompletionStatus）
        "currentTaskType": null,
        "steps": { "s1": 2 },                  // stepId -> StepStatus 序号
        "updatedAt": 0
      }
    }
  },
  "scores": [
    { "projectId": "proj.001", "taskType": 10, "score": 88, "at": 0, "detail": {} }
  ],
  "settings": {
    "locale": "zh-CN",
    "qualityProfile": "high",   // low / high；移动端强制 low（DEC-70）
    "volume": 1
  }
}
```

规则：
1. **一个 JSON，不拆多份**（DEC-54）；读写只有一处实现（`web/src/services/save-store.ts` 待建），其他模块不得直接碰 `localStorage`；
2. `userType` 现在恒为 `0`（游客），但**字段保留**（DEC-04：结构全量、功能按游客）；
3. `scores` 只追加不修改；
4. 将来接后端（DEC-43）时，把 `save-store` 的实现换成远端读写即可，**结构不变**。

## 4 与既有工程的对照（照抄词汇，不照抄结构）

| 本设计 | 参照工程 `SensorSimulationTrainingSoftware` | MCV |
|---|---|---|
| `Project` | `ProjectDatas[] → ProjectClip` | `ProjectData` |
| `Task` | `TaskDataBase` 子类（按 TaskType 多态） | 按 `TaskType` 分槽 |
| `Step` | `ProcessingData.StepClips[]` | `StepClip` / `StepStutus` |
| `Question` | `QuestionClips[]` | `QuestionType` / `QuestionUsage` |
| `profile.userType` | 无 | `UserType`（未知/学生/教师/管理员） |
| `progress.completion` | 无（用 UserData/ResultData） | `CompletionStatus`（未完成/已完成） |

**刻意不照搬的两点**（DEC-69）：
1. 参照工程用 `index`（数组下标）做主键 ⇒ 我们一律用**稳定字符串 id**；
2. 参照工程按 `TaskType` 多态反序列化依赖 `Newtonsoft.Json` + `TaskDataConverter` ⇒ Web 侧用判别式联合天然解决，Unity 侧沿用 Newtonsoft（已随 Addressables 生态可加），**但契约只描述 JSON 形状**。

## 5 待确认 / 待办

| 项 | 状态 |
|---|---|
| `StepType` 的 9 个值与 C# 同步（新增契约） | 需实现后在两侧同步，并纳入 `snapshot.json` |
| `content/assets` 与 Addressables 的分工 | 见 `03-layout-and-assets.md` §7，待确认 |
| 项目内是否需要"多语言文本"结构 | 暂按单语言（`zh-CN`）设计与实现，`locale` 只进 settings |
| 是否引入 JSON Schema 校验内容数据 | 建议后续加（放门禁里），本阶段先不做 |
