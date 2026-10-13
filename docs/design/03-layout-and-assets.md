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
  Core/        # 框架基础设施：单例基类、事件总线、日志、JSON、协程、状态机基类、资源包管理器
  Contracts/   # ★ 与 Web 共享的契约（SceneState / TaskType / QuestionType / QuestionUsage / BridgeMessageType）
  Managers/    # 全局管理器：Data / Assets（包登记与装卸）/ Scene / Camera / Interactive
  Viewers/     # 三维承载：每个 Unity 类 TaskType 一个 Viewer（进入 / 退出 / 清理）
  Web/         # 桥：WebBridgeBehaviour（收 Web 消息）+ Plugins/*.jslib（发消息给 Web）
  Services/    # 外部对接单一入口（DEC-43）：当前只有接口定义，无实现
NewStructureUnity/Assets/Editor/          # 编辑器工具（独立程序集）
NewStructureUnity/Assets/StreamingAssets/Data/   # ★ 内容数据（Unity 那一份，随构建发布，WebGL 下经 UnityWebRequest 读）
NewStructureUnity/Assets/Tests/           # 测试（DEC-27）
```

**没有 `UIs/` 目录**（DEC-80）：Unity 侧不做界面 —— 全部 UI 在 Web 的 DOM 层（DEC-16），
三维世界内也**不做跟随文字标签**（Q-R6-2 = C：改为"侧栏列表 ↔ 物体高亮"联动）；
引线 / 箭头这类**几何**仍由 Unity 画（不算 UI，Q-R6-S2 = A）。

程序集（asmdef）：

| 程序集 | 目录 | 依赖 | 说明 |
|---|---|---|---|
| `WSU3.Contracts` | `Contracts/` | 无（除 Unity 内置） | 契约层：只有枚举与消息常量，**不得**引用其它程序集 |
| `WSU3.Core` | `Core/` | `WSU3.Contracts` | 框架基础设施，不得反向依赖上层 |
| `WSU3.Runtime` | `Managers/` `Viewers/` `Web/` `Services/` | `WSU3.Core` `WSU3.Contracts` | 业务运行时 |
| `WSU3.Editor` | `Assets/Editor/` | `WSU3.Runtime` `WSU3.Core` | 编辑器工具 |
| `WSU3.Tests.*` | `Assets/Tests/` | 被测程序集 + test-framework | 单测 / PlayMode |

依赖纪律（DEC-86）：`WSU3.Core → WSU3.Contracts` 是**允许且唯一**的一条下行依赖（`Core` 里的管理器要认枚举与消息名）；
`Contracts` 必须保持零依赖。至于 **TMP / uGUI 包**：本批**保留在 `Packages/manifest.json` 里不删**（Q-R6-5 = B），
但它们是"输入与服务用的底座"（`EventSystem` / `PhysicsRaycaster` 属于 uGUI 包），**不作为界面方案**（DEC-80 / Q-R6-S1 = A）。

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

## 5 内容数据的落点（**两份，同名同结构**，DEC-82）

```text
content/
  contracts/
    snapshot.json         # ★ 契约校验基准（不是真源，见下）；枚举与桥消息的第三方比对物
  asset-registry.json     # §4 的资源登记表（以资源为主键）
  assets/                 # 大资产落点（★ 不进 git，DEC-57）
    three/                #   Three.js 侧（glTF/GLB）
    unity/                #   Unity 侧（FBX / 贴图 / 预制体 / 包产物）

web/public/content/data/                        # ← **Web 那一份内容数据**（随 web/dist 发布）
  ProjectData.json  QuestionData.json  MenuData.json  StepContentData.json
  SystemData.json   UserData.json      LanguageData.json
NewStructureUnity/Assets/StreamingAssets/Data/  # ← **Unity 那一份**（同名同结构，随 Unity 构建发布）
```

- **为什么两份**、门禁怎么比对、形状与字段清单：见 [`08-content-data-adoption.md`](./08-content-data-adoption.md)。
- **`content/assets/` 不进 git**（DEC-57）：模型与贴图体积远超单文件阈值，落点与忽略规则在 `.gitignore` / `ignore.conf` 里成对维护。
- 早期 `content/projects/*.json` 的示例数据（`demo-temperature.json`）**保留**，供"没有真实内容时也能跑通页面"的演示路径使用；真实内容一律走 `content/data/`。

⚠️ **`content/contracts/snapshot.json` 的性质**：它**不是**真源，而是**门禁的比对基准**（两侧都必须与它一致）。
它只能在一侧或两侧同时修改时、作为可评审的 diff 一起更新 —— 若不做这个约束，它就变成了"第三份事实源"，与 DEC-10 冲突。
**同理**：`content/data/*.json` 与 `Assets/StreamingAssets/Data/*.json` 是**两份手写文件**，靠门禁报"不一致"（DEC-82）。

## 6 门禁（DEC-41 / DEC-66，**已落地**）

| 时机 | 载体 | 检查 |
|---|---|---|
| **提交前** | `.git/hooks/pre-commit`（安装源 `tools/hooks/pre-commit`） | ① 大文件 >10 MB 拦截（DEC-65）；② 业务代码零 `import electron`（DEC-20）；③ **双端契约三方比对**（`tools/check-contracts.mjs`：枚举 + 桥消息类型）；④ **内容数据双份比对**（`tools/check-content-data.mjs`，DEC-82）；⑤ `web` 侧 `typecheck` + `lint` + `format:check` + `test` |
| **合并前** | `.github/workflows/gate.yml` | 上述全部 + `npm run build` + **真浏览器渲染冒烟** + Unity 清单校验（缺席只报告不失败，DEC-79） |

两个比对脚本都**不打开 Unity**：契约侧是纯文本解析 `Assets/Scripts/Contracts/*.cs`（DEC-68），数据侧是直接解析两份 JSON。

## 7 资源加载与打包（DEC-87：三条链路都做）

从被采纳数据与资产的实际形态出发，Unity 侧的资源加载**统一走"包登记表 + 三条链路"**（规则来源见 `../research/09-adopted-content-data.md` §3）：

| 链路 | 用途 | 运行期取件 | 包产物落点 |
|---|---|---|---|
| **AB**（主） | 内容包（一个项目一个包）、UI 包、字体包、相机背景包 | `UnityWebRequestAssetBundle` | `Assets/StreamingAssets/{包名首段}/…` |
| **AA** | 场景（漫游场景）与需要 AA 语义的资源 | `Addressables.LoadAssetAsync / LoadSceneAsync` | `Addressables` 构建产物 |
| **内置** | 全局单例资源（管理器、相机、配置表） | `Resources.Load` | `Assets/Resources/` |

**必须遵守的四条**（踩过的坑，写死）：

1. **一个项目一个内容包**：切任务 = 卸旧项目的包 + 装新项目的包；
2. **实例要登记"实例 → 包"**：卸载包前先销毁该包实例（否则材质变粉），卸载前先失效资源缓存（否则下次取到已销毁对象）；
3. **WebGL 下 `StreamingAssets` 就是 HTTP 路径**：不能加 `file://`，且只能经 `UnityWebRequest` 读；
4. **bundle 文件名一律小写、目录段保持原样** —— 大小写写错在 WebGL / Linux 上直接 404。

**包登记表的落点**：`Resources/Config/` 下的包配置资产 + 一张主清单（运行时与编辑器共用，`Resources` 保证两边取到同一份）。
**包产物的落点**：`Assets/StreamingAssets/`（随构建发布）。**大资产源文件**（FBX / 贴图）放 `content/assets/unity/`（不进 git，DEC-57）。

**明确的取舍**（见 `../research/09-adopted-content-data.md` §5）：**不采用**被采纳工程的第三方表现插件与自制 ShaderGraph，
材质改用 URP 标准光照 + 贴图通道直接映射（BaseColor / Normal / AO-Gloss），画面效果降级但避免把插件依赖拖进来。
