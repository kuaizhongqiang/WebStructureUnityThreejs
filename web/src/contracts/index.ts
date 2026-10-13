/**
 * 双端共享契约的唯一出口。
 *
 * 纪律（DEC-10）：C# / TS 两端**各手写一份**，靠 `contracts.spec.ts` 与
 * `tools/check-contracts.mjs`（TS ↔ 快照 ↔ C# 三方逐值比对）守住一致性。
 * **不要**绕过本目录直接从业务代码里硬编码枚举值或桥消息名。
 */

export * from './scene-state'
export * from './task-type'
export * from './question-type'
export * from './bridge'

/** 协议版本：与 Unity 侧握手比对，不匹配要明确报错（DEC-07）。 */
export const BRIDGE_PROTOCOL_VERSION = 1
