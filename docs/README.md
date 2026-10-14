# docs/ 索引

> 读者：AI 与人｜状态：2026-10-14 **v9（与仓库现状同步：DEC-01~DEC-110 / 各轮问答均已关闭 / "计划·待办·记录"三分 / 资源包与 AB 打包流水线已落地）**｜权威层级：`requirement/raw/raw-requirement.md` > `../AGENT.md` > **`DECISIONS.md`** > 其他。
>
> **"接下来做什么 / 还剩什么 / 做完了什么"三分**（2026-10-13 拆开，此前混在 `PLAN.md` 里）：
> `PLAN.md`（只写计划）· `TODO.md`（只写待办）· `RECORD.md`（只写记录与证据）。

## 先看哪份（按角色）

| 你是什么 | 顺序 |
|---|---|
| **人（决策者）** | `DECISIONS.md`（**已定的 101 条**；轮次与关闭状态以它为准，不在别处重复维护）→ `TODO.md`（**现在还剩什么**）→ `requirement/requirement-analysis.md` → `PAGE-WORKLIST.md` 与 `ui-mockups/index.html`（**当前正在审的就是这两份**） |
| **AI（执行者）** | `../AGENT.md`（约定与纪律）→ `DECISIONS.md`（**先读，已定事项不许再问**）→ `requirement/requirement-analysis.md` → 与任务相关的单篇 `research/` / `design/` |

## 文件清单

### 需求层 `requirement/`

| 文件 | 内容 | 状态 |
|---|---|---|
| `requirement/raw/raw-requirement.md` | **原始需求，唯一权威来源**。只读，不得改写 | 冻结 |
| `requirement/requirement-analysis.md` | 需求分析 v1：原始需求条目化（R-1~R-8）、红线、需求→交付物映射、**缺口闭合表** | v1 已定稿 |

### 决策与问答层

| 文件 | 内容 | 状态 |
|---|---|---|
| **`DECISIONS.md`** | **决策记录（唯一决策权威）**：**DEC-01 ~ DEC-107**，含"决定 / 是否偏离建议 / 偏离后果与缓解 / 待办"。章节：§1~§9 第一轮、§10~§13 第二轮、§14~§15 第三轮、§16 第四轮、第五轮追加、§17 第六轮、§18~§20 第七轮（步骤系统 / 模型检视页 / Info 页与原理页 / 站点线按数据画站 / **登录页进主流程**）、**§21 第八轮（结构任务的资产口径，DEC-102~106）**、**§22 第九轮（底层操控层的移植，DEC-107）**。**只增不改** | v1~v8 生效 |
| `OPEN-QUESTIONS.md` | 第一轮问题清单（32 题）**原文保留**，答案已全部固化到 `DECISIONS.md` | v1 已关闭 |
| `OPEN-QUESTIONS-R2.md` | 第二轮问题清单（28 题）**原文保留**，答案已固化到 `DECISIONS.md` §10（DEC-35~62） | v1 已关闭 |
| `OPEN-QUESTIONS-R3.md` | 第三轮问题清单（10 题）**原文保留**，答案已固化到 `DECISIONS.md` §14（DEC-63~72） | v1 已关闭 |
| **`OPEN-QUESTIONS-R6.md`** | **第六轮问题清单**：Unity 脚手架的 **UI 形态**（"全部 UI 用 Web"与 DEC-14 的冲突）与**启动阶段 Web→Unity 事件 / 预加载 / 数据形状**；**26 条 + 补充 14 条（S1~S14）均已答**，已固化为 DEC-80 ~ DEC-88 | v1 已关闭 |
| **`PLAN.md`** | **执行计划（活文档）**：**只写"接下来做什么"** —— 分批（P0→P1→P2）/ 落点 / 验收标准。已定结论在 `DECISIONS.md`、待办在 `TODO.md`、已完成的在 `RECORD.md` | **活文档** |
| **`TODO.md`** | **待办（活文档）**：**只写"现在还剩什么"** —— §1 待拍板 / §2 待做 / §3 未提交；已合并此前散在 `DECISIONS.md` 未闭合表、`OPEN-QUESTIONS*`、`PAGE-WORKLIST.md`、`ui-mockups/TODO.md` 的待办（做法：一条索引 + 一句话状态 + 来源链接，不在两处重复写） | **活文档** |
| **`RECORD.md`** | **记录（活文档）**：**只写"做完了什么 + 证据"** —— 批次总表（原 `PLAN.md` §1 的表**整表迁入**）+ 日期 / 提交 / PR；只增不改 | **活文档** |
| **`PAGE-WORKLIST.md`** | **页面工作清单**：按既有同类软件实测盘点的全部页面（6 组 / 11 个任务页 / 通用组件）+ 里程碑 + 照什么不照什么 | 待审 |
| `ui-mockups/index.html` | **样式清单（UI 元件规范）** + 页面索引：设计令牌、组件分节、**第九节框体令牌（圆角 6 级 / 0.5px 描边阶梯 / elevation / 交互叠加层 / 焦点环）**、29 个页面入口 | 待审 |
| `ui-mockups/pages/*.html` | **29 个页面的静态排版稿**（A 组 10 · B 组 5 · C 组 11 · D 组 3），逐页审核用 | 待审 |
| `ui-mockups/tokens.css` | **令牌层（产品用）**：颜色 / 字号 / 间距 / 圆角 / 描边 α 阶梯 / elevation / 交互叠加层 / 焦点环 / 毛玻璃 / 亮色方案 | — |
| `ui-mockups/components.css` | **组件层（产品用）**：全部 `.ui-*`。含 §16 站点线与浮窗、§17 毛玻璃应用、§19 第四轮修正、**§20 框体统一升级**（"有意没照搬什么"在 §20.7）、§21 外壳浮卡、§22 下拉浮层、§23 图标 | — |
| `ui-mockups/mockup-shell.css` | **仅评审用的外壳**：`.board`（1920×1080 缩放画布）、`.spec-*`（成果页卡片）、`.note`、`.theme-switch`。**产品不得 import**（DEC-74） | — |
| `ui-mockups/style.css` | 排版稿的**聚合入口**（14 行，只做 `@import` 三份）；规则不要再写在这里 | — |
| `ui-mockups/TODO.md` | 排版稿待办（T1 菜单页重做 / T2 题目样式 / T3 考核页 / T4 Unity 页暂不设计）+ 已完成清单 | 活文档 |
| `ui-mockups/src/*.mjs` | 排版稿生成器（改完重新执行 `node docs/ui-mockups/src/render.mjs`） | — |
| **`model-preview/index.html`** | **模型检视页（审核用）**：8 个 GLB 逐个挂 Three.js，定**环境**（光照 / IBL / 背景 / 曝光）与**材质**（贴图 / 清漆 / 表面模式）；读数分"证据（转换报告）"与"实测（GLB 现读）"；`&embed=1` 只留画布（排版稿 C6 内嵌用的就是它） | **待审**（DEC-96） |
| `model-preview/serve.mjs` | 该页的静态服务器：**服务根＝仓库根**（页面要取 `content/assets/three/**` 与 `web/node_modules/three`），并给 `.mjs` / `.glb` 正确的 MIME | — |

### 设计草案 `design/`

| 文件 | 内容 | 状态 |
|---|---|---|
| `design/01-tasktype-registry.md` | **TaskType 登记表**：11 个 TaskType 的技术栈 / 页面骨架 / 相机 / 资源加载 / 进入指令 / 完成事件 / 移动端策略 | 草案待确认 |
| `design/02-bridge-protocol.md` | **Unity↔Web 桥消息清单**：信封、时序、消息表、错误码、每 TaskType 的最小消息集合 | 草案待确认 |
| `design/03-layout-and-assets.md` | **目录与程序集分层**、`content/` 结构、**以资源为主键的资产登记表**、门禁设计 | 草案待确认 |
| `design/04-data-model.md` | **数据模型草案**：内容数据（项目/任务/步骤/题目）与本地数据（进度/成绩/设置），含字段表与示例 JSON | 草案待确认 |
| `design/05-unity-packaging-pipeline.md` | **Unity 产物与打包流水线**：三段式（人工构建 → 暂存校验 → 打包）、`unity/builds/<key>/` 落点、`release-manifest.json` 发布清单、服务端 MIME/压缩/缓存清单、明确未做项 | **已实现**（DEC-79） |
| `design/06-unity-manual-build-checklist.md` | **Unity 手动构建检查清单**：本仓 WebGL 设置实值（Brotli / 无回退 / 无多线程 / 开数据缓存）及其对服务器的要求、中文 TMP 字形与 StreamingAssets 红线、构建后三个必查、桥未落地时的预期表现 | 照做即可 |
| `design/07-frame-style-rules.md` | **框体样式规则（本项目自持）**：描边 α 阶梯 + 0.5px 发丝、圆角 6 级按角色、浮层 elevation、交互叠加层、键盘焦点环、中文排版、明确不做的五项 | **生效**（落地在 `ui-mockups` 的 tokens/components） |
| `design/08-content-data-adoption.md` | **内容数据的采用与"双份"口径**（DEC-82/83）：两份落点、门禁比对什么、数据形状与十个任务槽位、枚举写名字、资源 key 命名规则、未采用项 | **生效** |
| `design/09-startup-orchestration.md` | **启动编排与桥消息落地**（DEC-80/81/84）：preload 的定义、场景结构、启动链、两条就绪、进度合成、实例常驻与恢复、输入开关、构建粒度改动待办 | **生效** |
| `design/10-step-system.md` | **步骤系统**（DEC-89 ~ DEC-93）：进程 → 步骤 → 条件的三级结构、数据挂在条件上的取舍、协程三阶段与动画原语、跳转从 P0S0 重置与快进、协作式打断、面板端口与 `ui:request`/`ui:result` 接线、场景接线自查清单、条件一览与遗留项 | **生效** |
| `design/11-input-and-camera.md` | **底层操控层（输入控制器与相机）**（DEC-107）：落点与命名、与参照工程的差异（登记 / 相机取用 / 闸门 / **命名空间必须避让 `Input`**）、三个控制器各做什么、**四处未闭合**（没进场景 / 背景取图未接 / 继承来的材质缺失 / 没验收） | **本层已落地**（接入未完成） |
| `design/12-resource-packs-and-ab-build.md` | **资源包与 AB 打包流水线**（DEC-87 / DEC-108~110）：三条链路分工、包登记表与命名规则、**一键打 AB 包**（五步流程 + 三条铁律）、运行期 `AddressableManager` 接口面与装卸时序、实例登记与卸载纪律、结构任务装配、AA 设置/分组/内容位置、明确没做项 | **已落地**（一键打 AB 包可跑通） |

### 门禁与工具（不在 `docs/` 下，但归属关系记录在此）

| 路径 | 作用 | 依据 |
|---|---|---|
| `tools/check-contracts.mjs` | 双端契约一致性门禁：**TS ↔ 快照 ↔ C#** 三方逐值比对 | DEC-10 / DEC-67 / DEC-68 |
| `tools/check-large-files.mjs` | 大文件门禁：10MB 阈值、忽略规则、生成目录（`--tracked` 供 CI 用） | DEC-41 / DEC-57 / DEC-65 |
| `tools/check-shell-coupling.mjs` | **壳耦合门禁**：`web/src` 里出现 `import electron` 等一律拦下 | DEC-20 |
| `tools/pipeline/extract-material-spec.mjs` | 从**只读**来源工程抽材质规格（shader 贴图通路 / mask 通道语义与区间重映射 / 表面模式 / 预制体覆写）→ `content/asset-material-spec.json`；**可重跑、幂等** | DEC-94 |
| `tools/pipeline/audit-material-mapping.mjs` | **逐模型逐子材质核对**：贴图是否被错误共用、表面模式是否与源工程一致；报告不加失败退出（现状 18 处待修） | DEC-94 / P1-4b |
| `electron/` | **应用壳**：本机静态服务加载 `web/dist`；`npm run smoke` 可冒烟（打包分发未做） | DEC-12 / DEC-20 / DEC-32 |
| `tools/hooks/pre-commit` + `tools/install-hooks.ps1` | 提交前门禁（hook 本体不入库，由安装脚本复制到 `.git/hooks/`） | DEC-66 |
| `.github/workflows/gate.yml` | 合并门禁（CI）：契约 + 大文件 + 类型检查 + 单测 + 构建 + 渲染冒烟 | DEC-66 |
| `content/contracts/snapshot.json` | 契约校验**基准快照**（不是真源） | DEC-67 |

### 调研层 `research/`

| 文件 | 内容 |
|---|---|
| `research/01-unity-line.md` | Unity 线：工程现状、交付形态四方案、**WebGL 限制清单**、Unity↔Web 通信机制、三维资产管线 |
| `research/02-web-threejs-line.md` | Web 线：技术栈选型、依赖版本探测、Three.js 工程要点、**浏览器基线风险**、服务器 MIME/压缩/缓存清单 |
| `research/03-integration-and-delivery.md` | 集成与交付：Unity 模块挂载方式、通信协议草案、**单一真源归属**、Electron 壳、风险清单 |
| `research/04-reference-project-mcv.md` | 既有同类工程调研（只读）：`SceneState`/`TaskType` 确切定义与证据、架构模式、**必须继承 / 必须避开**清单 |
| `research/05-dependency-plan.md` | 依赖清单与拉取方案：环境实测、Unity/Web 两侧候选依赖、执行与验收标准 |
| `research/06-scale-baseline.md` | **规模基线**：既有同类软件的实测规模，与 **×3 容量预算** |
| `research/07-web-scaffold.md` | **Web 工程落地记录**：已装依赖与版本、验收输出、**TS 7 与 vue-tsc 不兼容的坑**、未完成项 |
| `research/08-webgl-baseline.md` | **WebGL 基线实测**：空场景构建 **8.40 MiB / 18 文件 / 188.9 秒**（Brotli）+ 逐文件占用，是资源预算与"包体是首要敌人"的实测依据 |
| `research/09-adopted-content-data.md` | **被采纳的内容数据与三维资产测绘**：7 份 JSON 的体积与用途、9 个项目、19 FBX / 284 PNG / 5 PSD 的体积分布、可搬运性与剔除项（第二层：允许保留被调研对象名称，本机路径用占位符） |
| `research/10-input-controller-specs/` | **底层操控层的行为规格原文**（14 份 `.md`，随 DEC-107 的移植一起搬入，**原文照录、未改写**）：控制器基类 / 第一人称 / 第三人称 / 聚焦环绕 / 相机背景 / 输入缓存 / 刚体推动。⚠️ 里面写的是**参照工程的旧命名与旧路径**，本工程的实现与命名以 `../design/11-input-and-camera.md` 为准（第二层：允许保留被调研对象名称） |

> ⚠️ `research/` 各篇里的 `★` 是**当时的建议**，可能已被 `DECISIONS.md` 取代；**冲突时以 `DECISIONS.md` 为准**。

## 写作约定

1. 本目录内的文档**不得新增需求**；一切需求以 `requirement/raw/` 为准。
2. `★` 一律表示**建议默认值**，不是已决定项；**已决定项只写在 `DECISIONS.md`**（并标注决策编号）。
3. 事实必须可追溯：结论要带**仓库内**路径（可行时带行号）。**不得**写本机绝对路径或外部仓库/工程路径；
   需要遵循外部规则时，把**规则本身摘录进 `docs/`** 再引用我们自己的文档（见 `AGENT.md` §4「文档里禁止出现外部引用」）。
4. `DECISIONS.md` **只增不改**；推翻旧决策要新增条目并注明取代关系。
5. **⚠️ 计划 / 待办 / 记录三分，各只有一个维护点**（完整纪律与联动节奏见 `AGENT.md` §4「文档三分」）：
   - **接下来做什么** → `PLAN.md`（分批 / 落点 / 验收标准；**不写"已完成"、不写"待拍板"**）；
   - **现在还剩什么** → `TODO.md`（§1 待拍板 / §2 待做 / §3 未提交；**所有新增待办只加这里**）；
   - **做完了什么 + 证据** → `RECORD.md`（日期 / 结果 / 提交号 / PR；**只增不改**）；
   - **已定事项** → `DECISIONS.md`（只增不改）。
   - **同一件事不许两处写**：待办在 `TODO.md` 只落一条（一句话 + 来源链接），细节留在来源文件里。
   - **完成一项的动作**：从 `TODO.md` 删掉该条 → 在 `RECORD.md` 加一行（带证据）→ 若它还是 `PLAN.md` 的计划项，改状态或删除。
6. **不写外部引用**：本目录内（`requirement/` 与 `research/` 的摘录档案除外）**不得**出现外部仓库名、外部工程名、本机绝对路径；
   需要遵循外部规则时，把**规则本身**摘录进 `docs/design/NN-*.md`，再引用我们自己的文档（见 `AGENT.md` §4）。
