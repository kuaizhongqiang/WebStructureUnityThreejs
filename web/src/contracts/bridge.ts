/**
 * Unity ↔ Web 桥消息类型契约（Web 侧）。
 *
 * 契约来源（**双端同批维护**）：本仓 C# 侧
 * `NewStructureUnity/Assets/Scripts/Contracts/BridgeMessageType.cs`；清单的**分组、顺序与拼写**是契约，
 * 靠 `tools/check-contracts.mjs` 与基准快照三方比对（DEC-85）。
 *
 * 为什么连字符串也要机械守住：这份清单是 Unity 侧 `.jslib` / `WebBridge` 与 Web 侧 `UnityBridge`
 * 照抄的对象，写错一个字母只会表现为"消息石沉大海"，不会有任何编译期报错。
 *
 * 信封与语义见 `docs/design/02-bridge-protocol.md`；启动链的取舍见 `docs/design/09-startup-orchestration.md`。
 * 新增消息只能**往后追加**，并同批改 C# 侧与 `content/contracts/snapshot.json`。
 */

/** Web → Unity。顺序是契约顺序。 */
export const BRIDGE_MESSAGES_FROM_WEB = [
  'app:init', // 启动配置（语言 / 画质 / 协议版本）
  'preload:task', // 预装某任务的资产（不进入交互）
  'preload:cancel', // 取消预装
  'scene:enter', // 进入某任务（装资产 + 装配 + 就绪）
  'scene:exit', // 退出当前任务
  'view:focus', // 聚焦某个部件
  'ui:set-locale', // 切换语言
  'ui:set-quality', // 运行时降质
  'input:enable', // 输入开关（模态面板打开时关掉三维输入）
  'runtime:resume', // 恢复运行（容器重新可见）
  'debug:ping', // 连通性自检
  'ui:result', // 教学面板回执（ui:request 的结果；步骤条件靠它继续）
] as const

/** Unity → Web。顺序是契约顺序。 */
export const BRIDGE_MESSAGES_FROM_UNITY = [
  'unity:ready', // 握手（协议版本）
  'unity:progress', // 加载进度
  'assets:ready', // 资产装完（Web 可开始渲染该任务的界面）
  'scene:ready', // 装配完成、可交互
  'scene:exited', // 已卸载完成
  'step:changed', // 步骤推进
  'task:completed', // 任务完成
  'score:report', // 成绩回报
  'object:picked', // 点中了某个部件
  'ui:request', // 请求弹界面（教学界面在 DOM 层）
  'unity:error', // 错误上报
  'debug:pong', // 自检回应
  'scene:parts', // 部件清单（含层级；供右侧部件树）
  'object:hover', // 指针移入 / 移出某个部件（带归一化坐标，供名字浮标）
] as const

export type BridgeMessageFromWeb = (typeof BRIDGE_MESSAGES_FROM_WEB)[number]
export type BridgeMessageFromUnity = (typeof BRIDGE_MESSAGES_FROM_UNITY)[number]
export type BridgeMessageType = BridgeMessageFromWeb | BridgeMessageFromUnity

/** 两个方向的并集（顺序：Web 组在前）。 */
export const BRIDGE_MESSAGE_TYPES: readonly BridgeMessageType[] = [
  ...BRIDGE_MESSAGES_FROM_WEB,
  ...BRIDGE_MESSAGES_FROM_UNITY,
]

export function isMessageFromWeb(type: string): type is BridgeMessageFromWeb {
  return (BRIDGE_MESSAGES_FROM_WEB as readonly string[]).includes(type)
}

export function isBridgeMessageType(value: unknown): value is BridgeMessageType {
  return typeof value === 'string' && (BRIDGE_MESSAGE_TYPES as readonly string[]).includes(value)
}
