/**
 * 设备与平台判定（docs/DECISIONS.md DEC-49 / DEC-70 / DEC-71）。
 *
 * 承诺范围（DEC-49）：移动端**只考虑微信内置浏览器**，其余移动浏览器不背验收责任。
 * 策略（DEC-70）：检测到微信时**只提示、不阻拦**；验收必须真机。
 * Unity 件进入策略（DEC-53 + DEC-71）：先尝试加载，失败再给出明确出口。
 */

/** 微信内置浏览器（X5 / XWeb 内核）的 UA 特征。 */
export const WECHAT_UA_PATTERN = /MicroMessenger/i

const MOBILE_UA_PATTERN = /Android|iPhone|iPad|iPod|Mobile/i

export type QualityProfile = 'low' | 'high'

/** 存档画质档（`low` / `high` / `ultra`，A4 三档）→ Unity 画质档（超清归 high）。 */
export function unityQualityOf(quality: 'low' | 'high' | 'ultra'): QualityProfile {
  return quality === 'low' ? 'low' : 'high'
}

export interface DeviceProfile {
  readonly isWeChat: boolean
  readonly isMobile: boolean
  /** 画质档：移动端一律 low（DEC-70）。 */
  readonly qualityProfile: QualityProfile
  /** 非空时应当在界面上展示的性能提示（只提示，不阻拦）。 */
  readonly notice: string | null
}

export function isWeChatUserAgent(userAgent: string): boolean {
  return WECHAT_UA_PATTERN.test(userAgent)
}

export function isMobileUserAgent(userAgent: string): boolean {
  return MOBILE_UA_PATTERN.test(userAgent)
}

/** 纯函数，便于单测（不依赖真实 navigator）。 */
export function buildDeviceProfile(userAgent: string): DeviceProfile {
  const isWeChat = isWeChatUserAgent(userAgent)
  const isMobile = isMobileUserAgent(userAgent)
  return {
    isWeChat,
    isMobile,
    qualityProfile: isMobile ? 'low' : 'high',
    notice: isWeChat ? '检测到微信内置浏览器：三维实验的性能可能受限，建议在电脑浏览器中打开。' : null,
  }
}

export function detectDevice(): DeviceProfile {
  return buildDeviceProfile(typeof navigator === 'undefined' ? '' : navigator.userAgent)
}

/**
 * Unity 类 TaskType 的进入策略（DEC-53 选"先尝试加载"，DEC-71 补数字）。
 * `allowFallbackToBlock` = 真机实测若"等 25s 体验很差"，允许改为直接阻拦。
 */
export const UNITY_ENTER_POLICY = {
  /** 超过该时长判定进入失败（毫秒）。 */
  timeoutMs: 25_000,
  /** 失败后重试次数。 */
  retryCount: 1,
  /** 是否允许退回"明确阻拦"策略。 */
  allowFallbackToBlock: true,
} as const

/** 判定失败后展示给用户的明确出口（不是空白，也不是无限等待）。 */
export const UNITY_UNSUPPORTED_MESSAGE = '当前设备未能运行该三维实验，请在电脑浏览器中打开本页面。'
