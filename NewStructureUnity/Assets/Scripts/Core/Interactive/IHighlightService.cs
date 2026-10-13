namespace WSU3.Core.Interactive
{
    /// <summary>
    /// 物体高亮服务（**可降级**）：悬停高亮、`view:focus` 聚焦高亮都走它。
    ///
    /// 依据（docs/research/09 的"必须继承"清单）：高亮这类"表现能力"必须走**可注入的服务接口**，
    /// 缺宿主插件时**静默降级**，不能把三维逻辑绑死在某个第三方高亮插件上。
    ///
    /// 本期宿主未接管 → <see cref="HighlightService.Current"/> 为 null，调用只是不生效（不报错）。
    /// 真正的实现（材质描边 / 自发光 / 后处理高亮）在 P2-6 接。
    /// </summary>
    public interface IHighlightService
    {
        void SetHighlight(InteractiveObjBase target, bool on);
    }

    /// <summary>当前生效的高亮服务（null = 未接管，静默降级）。</summary>
    public static class HighlightService
    {
        public static IHighlightService Current { get; set; }

        /// <summary>是否已经有实现接管（供编排判断要不要提示"高亮未接"）。</summary>
        public static bool IsAvailable => Current != null;

        public static void Set(InteractiveObjBase target, bool on)
        {
            Current?.SetHighlight(target, on);
        }
    }
}
