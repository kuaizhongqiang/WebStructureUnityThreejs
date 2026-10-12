# 设计 03：目录结构、程序集分层与资产登记

> 读者：AI 与人｜状态：2026-10-12 v0（**草案，待确认**）｜依据：`../DECISIONS.md` DEC-47（Unity 分层）、DEC-51（目录接受现状并补齐）、DEC-42（**资产登记以资源为主键**）、DEC-57（大资产不进 git）。

## 1 仓库顶层

```text
WebStructureUnityThreejs/
  AGENT.md              # AI 协作入口（唯一"有内容"的手册）
  CODEBUDDY.md          # 仅指向 AGENT.md
  .gitignore
  docs/                 # 需求 / 调研 / 问答 / 决策 / 设计（本目录）
  web/                  # Web 主站（Vite + Vue 3 + 裸 three）已落地
  NewStructureUnity/    # Unity 工程（复杂三维）——同时是 Plastic 工作区
  electron/             # ✅ 已建：应用壳（DEC-20）—— server.js 本机静态服务 / main.js 窗口 / preload.js 预留接口
  content/              # ★ 待建：双端共享的内容数据与资产登记（见 §4/§5）
  tools/                # ★ 待建：跨端脚本（契约校验、大文件拦截、门禁，DEC-41）
```

- `tools/`（仓库根）与 `web/tools/`（Web 专属）**职责不同**：根 `tools/` 放**跨端**门禁与校验；`web/tools/` 放 Web 自己的（如 `render-smoke.mjs`）。
- `docs/design/` 放**已定方向的设计草案**；`docs/research/` 放**事实与选项调研**；两者都不承载"已决定/未定"的判定（那是 `DECISIONS.md` 的职责）。

## 2 Unity 侧目录与程序集（DEC-47 / DEC-51）

```text
NewStructureUnity/Assets/Scripts/
  Core/        # 框架基础设施：单例基类、事件总线、日志、JSON、协程、状态机基类
  Contracts/   # ★ 与 Web 共享的契约（SceneState / TaskType / 共享 DTO）——手写，与 TS 对齐
  Managers/    # 全局管理器：UIMgr / DataMgr / AssetsMgr / CameraMgr / InputMgr（按需，不照搬 MCV）
  Viewers/     # 三维承载：每个 Unity 类 TaskType 一个 Viewer（进入/退出/清理）
  UIs/         # uGUI：Canvas / Panel / Component 三层（prefab 名＝类名沿用 MCV 的经验，但装配机制自己实现）
  Web/         # 桥：BridgeBehaviour（收 Web 消息）+ Plugins/*.jslib（发消息给 Web）
  Services/    # 外部对接单一入口（DEC-43）：当前只有接口定义，无实现
NewStructureUnity/Assets/Editor/        # 编辑器工具（独立程序集）
NewStructureUnity/Assets/Tests/         # ★ 待建的测试（DEC-27）
```

程序集（asmdef）建议：

| 程序集 | 目录 | 依赖 | 说明 |
|---|---|---|---|
| `WSU3.Core` | `Core/` | 无（除 Unity 内置） | 最底层，不得反向依赖上层 |
| `WSU3.Contracts` | `Contracts/` | 无 | 契约单独一层，便于与 `web/src/contracts` 对照 |
| `WSU3.Runtime` | `Managers/` `Viewers/` `UIs/` `Web/` `Services/` | `WSU3.Core` `WSU3.Contracts` + TMP + uGUI | 业务运行时 |
| `WSU3.Editor` | `Assets/Editor/` | `WSU3.Runtime` `WSU3.Core` | 编辑器工具 |
| `WSU3.Tests.*` | `Assets/Tests/` | 被测程序集 + test-framework | 单测/PlayMode |

⚠️ **执行前置**：创建目录与 asmdef 会让 Unity 重新导入并生成 `.meta`，且改动属于 Unity 侧 ⇒ 需走 DEC-60 的**双渠道提交**，并在编辑器空闲时进行（DEC-59）。

## 3 Web 侧（已落地）

见 `../research/07-web-scaffold.md` §1。要点：`src/{contracts,viewer,unity,stores,router,pages,styles}`；`tools/render-smoke.mjs`；`content` 数据从 `content/`（根）读取，不放在 `web/public/` 里硬编码。

## 4 资产登记表（**按 DEC-42 修正为"以资源为主键"**）

用户口径：**一个三维模型可能被多个页面、多个 `TaskType` 调用**；且 Web / Unity 各自做各自的资产。

因此登记表**不能**按 `taskType` 一对一，必须是：

```jsonc
// content/asset-registry.json（草案）
{
  "version": 1,
  "resources": [
    {
      "key": "lib.sensor.temperature",        // ★ 主键：资源标识（稳定、不随页面变）
      "name": "温度传感器",
      "kind": "model",                         // model | texture | video | audio | font
      "stack": "three",                        // ★ three | unity（DEC-11：两侧各做各的）
      "source": "blender",                     // blender | unity | purchased | unknown
      "path": "content/assets/three/lib.sensor.temperature.glb",
      "bytes": 1234567,
      "sha256": "…",                           // 大资产不入 git 时，这是唯一的完整性依据（DEC-57）
      "usedBy": {                              // ★ 多对多：被哪些项目/任务用到
        "projects": ["proj.001"],
        "taskTypes": [2, 7]
      },
      "status": "ready"                        // ready | wip | missing | deprecated
    }
  ]
}
```

规则：
1. **主键是 `key`**（资源），不是 `taskType`；`usedBy` 表达多对多用例；
2. **同名资源在 `three` 与 `unity` 是两条记录**（`stack` 区分）——这正好对上 DEC-60"允许部分资产两侧各保留一份"；
3. `sha256` 是**大资产不入 git 时的唯一完整性依据**（DEC-57），因此它是必需字段；
4. 这份 JSON **同时是加载器的索引**（Three 侧按 key 找模型路径；Unity 侧按 key 找 AB 条目），避免出现"只给文档看的数据"。

## 5 `content/` 目录草案

```text
content/
  contracts/            # 契约校验基准（门禁用，见 §6）
    snapshot.json       #   SceneState / TaskType 的名字+序号+中文标签快照
  asset-registry.json   # §4 的资源登记表
  projects/             # 教学内容数据（按 11 个 TaskType 组织，DEC-36）
    proj.001.json
  assets/               # 大资产的实际落点（★ 不进 git，DEC-57）
    three/              #   Three.js 侧资产
    unity/              #   Unity 侧资产（或用 Addressables 管理，见 §7）
```

⚠️ **`content/contracts/snapshot.json` 的性质要说清**：它**不是**真源，而是**门禁的比对基准**（两侧都必须与它一致）。它只能在一侧或两侧同时修改时、作为可评审的 diff 一起更新 —— 若不做这个约束，它就变成了"第三份事实源"，与 DEC-10 冲突。**这一点需要用户在第三轮确认。**

## 6 门禁（DEC-41）

拟设两道（载体待第三轮确认）：

| 时机 | 检查 |
|---|---|
| **提交前（pre-commit）** | ① 大文件拦截（DEC-57，阈值待定）；② `web` 侧 `typecheck` + `test`（快速）；③ 契约快照比对（`content/contracts/snapshot.json` ↔ `web/src/contracts/*.ts` ↔ Unity `Contracts/*.cs`） |
| **合并前（pre-push / CI）** | 在上述基础上加 `npm run smoke`（真浏览器渲染冒烟）、`npm run build` |

Unity 侧的契约比对脚本需能**在不打开编辑器**的情况下读取 `Assets/Scripts/Contracts/*.cs`（纯文本解析）。

## 7 待第三轮确认

1. `content/contracts/snapshot.json` 是否接受（否则契约一致性只能靠"两侧同时改"的人工纪律）；
2. Addressables 的分组策略（按 `TaskType` / 按项目 / 按资源类型）；
3. Unity 侧大资产是放 `content/assets/unity/` 还是直接由 Addressables 管理（两者选一，避免双份）；
4. 数据模型（DEC-04"全量"）的具体字段清单 —— 本文件**故意留空**，需要单独一轮：可参照参照工程的 `ProjectData → ProjectClip → TaskDataBase → ProcessingData/StepClips/QuestionClips` 与 MCV 的 `UserType`/`CompletionStatus`（`research/06-scale-baseline.md` §1.4）。
