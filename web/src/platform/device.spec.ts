import { describe, expect, it } from 'vitest'
import { UNITY_ENTER_POLICY, buildDeviceProfile, isMobileUserAgent, isWeChatUserAgent } from './device'

const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; SM-S9180) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'
const WECHAT_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; SM-S9180 Build/UP1A) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/107.0.0.0 Mobile Safari/537.36 MicroMessenger/8.0.49(0x2800313D) WeChat/arm64'
const WECHAT_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49(0x1800312f) NetType/WIFI'
const DESKTOP_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

describe('微信内置浏览器识别（DEC-49 / DEC-70）', () => {
  it('Android 微信与 iOS 微信都能识别', () => {
    expect(isWeChatUserAgent(WECHAT_ANDROID)).toBe(true)
    expect(isWeChatUserAgent(WECHAT_IOS)).toBe(true)
  })

  it('普通浏览器不误报', () => {
    expect(isWeChatUserAgent(ANDROID_CHROME)).toBe(false)
    expect(isWeChatUserAgent(DESKTOP_CHROME)).toBe(false)
  })

  it('微信内置浏览器上给出提示但不阻拦（notice 非空、策略仍是"先尝试"）', () => {
    const profile = buildDeviceProfile(WECHAT_ANDROID)
    expect(profile.isWeChat).toBe(true)
    expect(profile.notice).not.toBeNull()
    expect(UNITY_ENTER_POLICY.timeoutMs).toBe(25_000)
    expect(UNITY_ENTER_POLICY.retryCount).toBe(1)
  })

  it('移动端一律走 low 画质档，桌面走 high', () => {
    expect(isMobileUserAgent(ANDROID_CHROME)).toBe(true)
    expect(buildDeviceProfile(ANDROID_CHROME).qualityProfile).toBe('low')
    expect(buildDeviceProfile(DESKTOP_CHROME).qualityProfile).toBe('high')
    expect(buildDeviceProfile(DESKTOP_CHROME).notice).toBeNull()
  })

  it('桌面浏览器不被识别为移动端', () => {
    expect(isMobileUserAgent(DESKTOP_CHROME)).toBe(false)
  })
})
