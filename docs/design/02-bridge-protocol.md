# 设计 02：Unity ↔ Web 桥消息清单

> 读者：AI 与人｜状态：2026-10-13 v1（**生效**：消息清单已进契约，见 DEC-85）｜依据：`../DECISIONS.md` DEC-07（通信）、DEC-08（真源）、DEC-85（清单入契约）。
> 实现骨架：`web/src/unity/UnityBridge.ts`（握手 / JSON / `seq` / `detach`）与 `web/src/unity/UnityLoader.ts`（注入 loader / 超时 / 重试）。
> **启动阶段怎么编排**（preload 的定义、就绪语义、实例常驻、进度合成）在 [`09-startup-orchestration.md`](./09-startup-orchestration.md)，本文只维护**信封与清单**。
> 清单的机器可校验副本：`web/src/contracts/bridge.ts`、`NewStructureUnity/Assets/Scripts/Contracts/BridgeMessageType.cs`、`content/contracts/snapshot.json`（三处同批改，`tools/check-contracts.mjs` 拦）。

## 1 信封（所有消息统一）

```json
{ "type": "scene:enter", "version": 1, "seq": 12, "payload": { } }
```

| 字段 | 说明 |
|---|---|
| `type` | 消息类型，`domain:action` 形式 |
| `version` | 协议版本（当前 `1`，见 `web/src/contracts/index.ts` 的 `BRIDGE_PROTOCOL_VERSION`） |
| `seq` | 发送方自增序号，用于排查与去重；接收方可只记录不校验 |
| `payload` | 业务数据；**没有 payload 也保留字段**（写 `null`），避免侧信道猜测 |

**硬约束**
1. 握手版本不匹配 ⇒ **明确报错**（不静默降级、不"尽力兼容"）；
2. payload 必须能 `JSON.stringify`（Unity 侧 `SendMessage` 只传一个字符串参数，所以**只有一个 payload 字段**）；
3. **不做状态查询**：没有 `getState` / `query` 这类请求-应答（DEC-08）；需要状态就订阅事件；
4. 时间统一用毫秒时间戳（`number`），不传格式化字符串。

## 2 时序

```text
Web 侧：mount Unity 容器
   └─ createUnityInstance()  ──Unity 启动──▶  bridge.onReady("1")     ← 版本握手
   └─ app:init {locale, qualityProfile}  ─▶
   └─ ui:set-theme {theme}  ─▶                    ← 页面已表过态时补发一次（DEC-159）
   └─ scene:enter {taskType, contentId, payload}  ─▶
                                    ◀─ unity:progress {0..1} * N
                                    ◀─ scene:ready {taskType}
                                    ◀─ scene:parts {parts[]}          ← 部件清单（含层级）
                                    └─ view:focus {objectKey} / ui:set-locale ...  ─▶
                                    ◀─ object:hover {objectKey, x, y}  ← 悬停（只在变化时报）
                                    ◀─ step:changed {...} * N
                                    ◀─ task:completed {score, elapsed}
   └─ scene:exit ─▶  ◀─ scene:exited  →  unityInstance.Quit()  →  bridge.detach()
```

要点：**先握手再下指令**；`scene:enter` 之前 Unity 必须处于"待命"状态（不得自己装配场景，DEC-08）。

## 3 消息清单

### 3.1 生命周期（Web → Unity）

| type | payload | 说明 |
|---|---|---|
| `app:init` | `{ locale: "zh-CN", qualityProfile: "low" \| "high", protocolVersion: number }` | 启动配置；**握手后立刻发**；`qualityProfile` 由 Web 按设备能力下发（移动端一律 `low`） |
| `preload:task` | `{ taskType: number }` | 预装某任务的资源包（**不进入交互**）；用户切走时由 Web 发 `preload:cancel` |
| `preload:cancel` | `{ taskType: number }` | 取消预装（只卸掉"预装但未进入"的那份） |
| `scene:enter` | `{ taskType: number, projectId: string, contentVersion?: string }` | 进入某任务；**`taskType` 用枚举序号**（契约见 DEC-09）；**大内容不下发** —— Unity 读自己那份数据（`docs/design/08` §1） |
| `scene:exit` | `null` | 请求退出当前任务（Unity 卸包清理后回 `scene:exited`；**实例不销毁**，DEC-81） |
| `view:focus` | `{ objectKey: string, animate: boolean }` | 聚焦某个部件（`objectKey` 是资源登记表里的键，DEC-42） |
| `ui:set-locale` | `{ locale: string }` | 切换语言 |
| `ui:set-quality` | `{ qualityProfile: "low" \| "high" }` | 运行时降质（移动端 / 低端机） |
| `input:enable` | `{ enabled: boolean }` | 输入开关：模态面板打开时关掉三维输入（DEC-84，防止"被盖住还在拖"） |
| `runtime:resume` | `null` | 容器重新可见后告知 Unity 恢复（隐藏期间渲染循环仍在，交互与更新提前返回） |
| `debug:ping` | `{ at: number }` | 连通性自检；Unity 回 `debug:pong` |
| `ui:result` | `{ kind: "tips" \| "ui" \| "question", result: "success" \| "failed" \| "unavailable", detail?: string }` | **教学面板的回执**（与 `ui:request` 成对，DEC-91）。`kind` 必须与请求一致；**面板弹不出来也必须回一条 `unavailable`**，而且**一个请求只回一条**。Unity 侧的等待默认**不限时**（尊重"学生要想很久"），不回就等于把这一步挂住（需要兜底时按条件配 `timeoutSeconds`，见 `docs/design/10` §5） |
| `ui:set-theme` | `{ theme: "dark" \| "light" }` | **主题**（DEC-159）：页面在深色 / 亮色之间切换时下发，Unity 侧按它换主相机背景板材质（`CameraBg`）。取值与页面主题真源同域，C# 侧镜像常量在 `Contracts/ThemeKind.cs`。**与页面同域但不同步不算错**：Unity 侧材质的默认值是**深色板**，所以页面是亮色时必须在**握手后补发一次**（时序见 §2），否则亮色用户进来看到的会是与页面相反的深色背景。认不出的取值 ⇒ Unity 只告警、保持原材质（不把背景换空） |

### 3.2 生命周期与结果（Unity → Web）

| type | payload | 说明 |
|---|---|---|
| `unity:ready` | `{ version: number }` | **握手**；版本不符则 Web 抛 `BridgeProtocolError` |
| `unity:progress` | `{ progress: number, stage?: string }` | 加载进度（0~1） |
| `assets:ready` | `{ taskType: number }` | **资源包装完**（Web 可开始渲染该任务的界面）；与下一条是两个阶段（DEC-84） |
| `scene:ready` | `{ taskType: number }` | 装配完成、**可交互**，Web 结束 loading |
| `scene:exited` | `{ taskType: number }` | 已退出该任务并卸包完成；**Web 不销毁实例**（DEC-81） |
| `step:changed` | `{ stepIndex: number, stepTotal: number, stepName?: string }` | 步骤推进（DEC-90）。`stepIndex` 是**扁平序号**（跨进程连续、从 0 起），`stepTotal` 是整条流程的步骤总数 —— 进度条直接用这两个数，不用再关心进程概念（`docs/design/10` §5） |
| `task:completed` | `{ taskType: number, score?: number, elapsedMs: number }` | **完成事件**（DEC-40 的硬约束）。步骤系统在流程走完（或遇到终止型条件）时上报；`elapsedMs` 从本次执行开始算，**`score` 目前恒为 0**（成绩体系未建，不编造分数） |
| `score:report` | `{ score: number, detail?: object }` | 成绩回报（考核类） |
| `object:picked` | `{ objectKey: string }` | 点中了某个部件（Web 可据此弹说明） |
| `ui:request` | `{ kind: "tips" \| "ui" \| "question", refId: string, body?: { title?, content?, questionType?, options?: string[], tips? } }` | Unity 请求 Web 侧弹 UI（**因为教学界面在 DOM 层**，DEC-16）。`refId` 是内容数据的键（`tipsKey` / `uiId` / `questionId`）；`body` 只带**展示用**字段，**不含答案** —— 判定留在界面层（Web 持有同一份题库），结果用 `ui:result` 回执（DEC-91） |
| `unity:error` | `{ code: number, message: string, fatal: boolean }` | 错误上报 |
| `debug:pong` | `{ at: number }` | 自检回应 |
| `scene:parts` | `{ parts: [{ key: string, name: string, nameEn?: string, parentKey?: string }] }` | **部件清单（含层级）**：装配完成后上报一次，Web 侧的右侧"部件树"靠它渲染（DEC-131）。`key` 与 `object:picked` / `object:hover` / `view:focus` 是**同一套键**；`parentKey` 指向**最近的"部件父级"**（不是每一个 Transform 节点）—— 成树放在 Web 侧（`web/src/domain/part-tree.ts`，脏输入在那里面挡住）。部件名（`objName` / `objName_en`）**随预制体走**（DEC-104），所以只能由 Unity 上报、**不进内容 JSON** |
| `object:hover` | `{ key: string, x: number, y: number }` | 指针**移入 / 移出了哪个部件**（DEC-130）：Web 侧据此在画布上画"部件名称悬浮提示"（`.ui-parttip`，由 DOM 层画、Unity 不做这个 UI）。`key` 为空串表示**移出**（`JsonUtility` 把 null 串写成 `""`）；`x` / `y` 是**归一化坐标**（0~1，相对 Unity 画布左上角），Web 侧夹到 0~1 后再定位浮标。**只在目标变化时上报**（另加限频）—— 逐帧发会把桥淹掉 |

### 3.3 错误码

| code | 含义 | Web 侧动作 |
|---|---|---|
| 1001 | 协议版本不匹配 | 中止并提示（不降级） |
| 1002 | 内容缺失 / `contentId` 未知 | 提示并返回目录 |
| 1003 | 资源加载失败 | 允许重试一次，再失败则返回 |
| 1004 | wasm / 内存不足 | **判定为"设备不支持"**，走 DEC-53 的降级提示 |
| 1005 | WebGL 上下文丢失 | 销毁实例 + 提示重新进入 |
| 2001 | 进入超时（Web 侧计时） | 同 1004 的处理路径 |

## 4 每个 TaskType 的最小消息集合（硬约束）

| TaskType | 进入指令 | 完成事件 |
|---|---|---|
| `LineConnection` | `scene:enter{taskType:4}` | `task:completed{taskType:4}` |
| `Training` | `scene:enter{taskType:5}` | `task:completed{taskType:5}` |
| `Structure` | `scene:enter{taskType:8}` | `task:completed{taskType:8}` |
| `Inspection` | `scene:enter{taskType:9}` | `task:completed{taskType:9}` |

> Three 类 TaskType 不走桥（同页 three 渲染，DEC-06），因此**不需要**为它们定义桥消息。

## 5 已闭合与仍开放

| 项 | 结论 |
|---|---|
| 项目标识的形态 | **`projectId` 用稳定字符串**（如 `clip_contactor`），不用数组下标（DEC-69 / `docs/design/08` §3） |
| 超时与重试 | 进入 **25s / 重试 1 次**（DEC-71）；预加载失败**静默**（DEC-84） |
| 心跳 | **本期不做**；需要时用 `debug:ping/pong` 手动自检（`09-startup-orchestration.md` §10） |
| `ui:request` / `ui:result` | Unity **只允许"请求"**，由 Web 决定是否响应（真源单一）；**回执必须成对**（含弹不出来时回 `unavailable`），判定在界面层（DEC-91） |
| 步骤推进的语义 | 步骤系统的三级结构与"跳转从 P0S0 重置"口径见 `docs/design/10`；桥只负责把扁平进度与完成事件报出去 |
| 内容数据谁读 | Unity **读自己那份**（与 Web 的同名文件同结构，门禁比对）；`scene:enter` 只下发任务标识，不下发正文（DEC-82） |

**仍开放**：Unity 侧的真实构建与桥实现尚未落地（`.jslib` + 消息接收），首次真实构建后按 `09-startup-orchestration.md` 联调。
