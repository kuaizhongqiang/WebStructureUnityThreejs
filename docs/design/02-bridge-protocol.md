# 设计 02：Unity ↔ Web 桥消息清单

> 读者：AI 与人｜状态：2026-10-12 v0（**草案，待确认**）｜依据：`../DECISIONS.md` DEC-07（通信）、DEC-08（真源）、DEC-40（本文由 AI 起草）。
> 实现骨架：`web/src/unity/UnityBridge.ts`（已实现握手 / JSON / `seq` / `detach`）。

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
   └─ scene:enter {taskType, contentId, payload}  ─▶
                                    ◀─ unity:progress {0..1} * N
                                    ◀─ scene:ready {taskType}
   └─ view:focus {objectKey} / ui:set-locale ...  ─▶
                                    ◀─ step:changed {...} * N
                                    ◀─ task:completed {score, elapsed}
   └─ scene:exit ─▶  ◀─ scene:exited  →  unityInstance.Quit()  →  bridge.detach()
```

要点：**先握手再下指令**；`scene:enter` 之前 Unity 必须处于"待命"状态（不得自己装配场景，DEC-08）。

## 3 消息清单

### 3.1 生命周期（Web → Unity）

| type | payload | 说明 |
|---|---|---|
| `app:init` | `{ locale: "zh-CN", qualityProfile: "low" \| "high", protocolVersion: number }` | 启动配置；`qualityProfile` 由 Web 按设备能力下发（移动端一律 `low`） |
| `scene:enter` | `{ taskType: number, contentId: string, payload: object \| null }` | 进入某任务；**`taskType` 用枚举序号**（契约见 DEC-09） |
| `scene:exit` | `null` | 请求卸载当前场景（Unity 清理后回 `scene:exited`） |
| `view:focus` | `{ objectKey: string, animate: boolean }` | 聚焦某个部件（`objectKey` 是资源登记表里的键，DEC-42） |
| `ui:set-locale` | `{ locale: string }` | 切换语言（不做动态补字，见 DEC-14 的 WebGL 字体红线） |
| `ui:set-quality` | `{ qualityProfile: "low" \| "high" }` | 运行时降质（移动端 / 低端机） |
| `debug:ping` | `{ at: number }` | 连通性自检；Unity 回 `debug:pong` |

### 3.2 生命周期与结果（Unity → Web）

| type | payload | 说明 |
|---|---|---|
| `unity:ready` | `{ version: number }` | **握手**；版本不符则 Web 抛 `BridgeProtocolError` |
| `unity:progress` | `{ progress: number, stage?: string }` | 加载进度（0~1） |
| `scene:ready` | `{ taskType: number }` | 场景装配完成，可以接受交互指令 |
| `scene:exited` | `null` | 已卸载完成，Web 随后 `Quit()` |
| `step:changed` | `{ stepIndex: number, stepTotal: number, stepName?: string }` | 步骤推进（对应参照工程的步骤状态机） |
| `task:completed` | `{ taskType: number, score?: number, elapsedMs: number }` | **完成事件**（DEC-40 的硬约束） |
| `score:report` | `{ score: number, detail?: object }` | 成绩回报（考核类） |
| `object:picked` | `{ objectKey: string }` | 点中了某个部件（Web 可据此弹说明） |
| `ui:request` | `{ kind: "question" \| "confirm" \| "tips", payload: object }` | Unity 请求 Web 侧弹 UI（**因为教学界面在 DOM 层**，DEC-16） |
| `unity:error` | `{ code: number, message: string, fatal: boolean }` | 错误上报 |
| `debug:pong` | `{ at: number }` | 自检回应 |

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

## 5 待第三轮确认

1. `contentId` 的形态（教学内容里项目的标识：用 `index` 数字，还是 `engName` 字符串？）；
2. 超时阈值（建议 25s）与重试次数（建议 1 次）；
3. 是否需要"心跳"（长时间无消息时判断 Unity 已死）；
4. `ui:request` 是否允许 Unity 主动改 Web 的界面（我倾向：**只允许"请求"，由 Web 决定是否响应**，保持真源单一）。
