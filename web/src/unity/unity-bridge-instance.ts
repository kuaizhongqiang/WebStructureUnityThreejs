/**
 * 桥的**模块级单例**（D-25 / DEC-145）。
 *
 * 为什么要单例：Unity 实例常驻后，桥也必须常驻 ——
 * `window.__WSU3_BRIDGE__` 在实例创建那一刻被桥接上（`attach`），之后任务页来来去去，
 * 会话（`UnitySession`）按任务建/弃，但全局回调对象与握手状态（`isReady`）不能跟着重建，
 * 否则"后来者会话"永远等不到已经发生过的握手。
 */
import { UnityBridge } from './UnityBridge'

export const unityBridge = new UnityBridge()
