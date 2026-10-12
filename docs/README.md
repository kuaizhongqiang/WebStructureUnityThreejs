# docs/ 索引

> 读者：AI 与人｜状态：2026-10-12 v1｜权威层级：`requirement/raw/raw-requirement.md` > `../AGENT.md` > **`DECISIONS.md`** > 其他。

## 先看哪份（按角色）

| 你是什么 | 顺序 |
|---|---|
| **人（决策者）** | `OPEN-QUESTIONS-R2.md`（待你回答 27 题）→ `DECISIONS.md`（已定的 33 条）→ `requirement/requirement-analysis.md` |
| **AI（执行者）** | `../AGENT.md` → `DECISIONS.md`（**先读，已定事项不许再问**）→ `requirement/requirement-analysis.md` → 与任务相关的单篇 `research/` |

## 文件清单

### 需求层 `requirement/`

| 文件 | 内容 | 状态 |
|---|---|---|
| `requirement/raw/raw-requirement.md` | **原始需求，唯一权威来源**。只读，不得改写 | 冻结 |
| `requirement/requirement-analysis.md` | 需求分析 v1：原始需求条目化（R-1~R-8）、红线、需求→交付物映射、**缺口闭合表** | v1 已定稿 |

### 决策与问答层

| 文件 | 内容 | 状态 |
|---|---|---|
| **`DECISIONS.md`** | **决策记录（唯一决策权威）**：DEC-01~DEC-33，含"决定 / 是否偏离建议 / 偏离后果与缓解 / 待办"。**只增不改** | v1 生效 |
| `OPEN-QUESTIONS.md` | 第一轮问题清单（32 题）**原文保留**，答案已全部固化到 `DECISIONS.md` | v1 已关闭 |
| `OPEN-QUESTIONS-R2.md` | 第二轮问题清单（28 题）**原文保留**，答案已固化到 `DECISIONS.md` §10（DEC-35~62） | v1 已关闭 |
| `OPEN-QUESTIONS-R3.md` | **第三轮问题清单（10 题待答）**：执行条件（编辑器时段）、答案间冲突（DEC-38 ↔ R-1）、门禁载体与阈值、设计草案确认 | 待回答 |

### 设计草案 `design/`

| 文件 | 内容 | 状态 |
|---|---|---|
| `design/01-tasktype-registry.md` | **TaskType 登记表**：11 个 TaskType 的技术栈 / 页面骨架 / 相机 / 资源加载 / 进入指令 / 完成事件 / 移动端策略 | 草案待确认 |
| `design/02-bridge-protocol.md` | **Unity↔Web 桥消息清单**：信封、时序、消息表、错误码、每 TaskType 的最小消息集合 | 草案待确认 |
| `design/03-layout-and-assets.md` | **目录与程序集分层**、`content/` 结构、**以资源为主键的资产登记表**、门禁设计 | 草案待确认 |

### 调研层 `research/`

| 文件 | 内容 |
|---|---|
| `research/01-unity-line.md` | Unity 线：工程现状、交付形态四方案、**WebGL 限制清单**、Unity↔Web 通信机制、三维资产管线 |
| `research/02-web-threejs-line.md` | Web 线：技术栈选型、依赖版本探测、Three.js 工程要点、**浏览器基线风险**、服务器 MIME/压缩/缓存清单 |
| `research/03-integration-and-delivery.md` | 集成与交付：Unity 模块挂载方式、通信协议草案、**单一真源归属**、Electron 壳、风险清单 |
| `research/04-reference-project-mcv.md` | 参考工程 `MCV_Module` 系列：`SceneState`/`TaskType` 确切定义与证据、架构模式、**必须继承 / 必须避开**清单 |
| `research/05-dependency-plan.md` | 依赖清单与拉取方案：环境实测、Unity/Web 两侧候选依赖、执行与验收标准 |
| `research/06-scale-baseline.md` | **规模基线**：参照工程 `SensorSimulationTrainingSoftware` 的实测规模，与 **×3 容量预算** |
| `research/07-web-scaffold.md` | **Web 工程落地记录**：已装依赖与版本、验收输出、**TS 7 与 vue-tsc 不兼容的坑**、未完成项 |

> ⚠️ `research/` 各篇里的 `★` 是**当时的建议**，可能已被 `DECISIONS.md` 取代；**冲突时以 `DECISIONS.md` 为准**。

## 写作约定

1. 本目录内的文档**不得新增需求**；一切需求以 `requirement/raw/` 为准。
2. `★` 一律表示**建议默认值**，不是已决定项；**已决定项只写在 `DECISIONS.md`**（并标注决策编号）。
3. 事实必须可追溯：涉及参考工程或本仓库现状的结论要带路径（可行时带行号）。
4. `DECISIONS.md` **只增不改**；推翻旧决策要新增条目并注明取代关系。
