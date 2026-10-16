// ============================================================================
// 契约字符串（C# 侧）：主题取值。
//
// Web 侧镜像：web/src/contracts/bridge-payloads.ts 的 `BridgeTheme`
// 用在：`ui:set-theme` 的载荷字段 `theme`（载荷类见 WSU3.Web.ThemePayload）。
//
// 为什么放在 Contracts 而不是 Web 层：消费端既有 Runtime 也有 Core ——
// 主相机背景板（WSU3.Core.Controllers.CameraBg）要按它二选一材质，而 Core 不能引用 Web 层。
// 与 WSU3.Web.UiPanelKind / UiResultKind 的分工一样：谁两边都要认，谁就待在 Contracts。
// ============================================================================

namespace WSU3.Contracts
{
    /// <summary>
    /// `ui:set-theme` 的主题取值。
    ///
    /// 拼写是契约：写错一个字母不会有任何编译期报错，只会表现为"材质不换"。
    /// </summary>
    public static class ThemeKind
    {
        /// <summary>深色主题。</summary>
        public const string Dark = "dark";

        /// <summary>亮色主题。</summary>
        public const string Light = "light";
    }
}
