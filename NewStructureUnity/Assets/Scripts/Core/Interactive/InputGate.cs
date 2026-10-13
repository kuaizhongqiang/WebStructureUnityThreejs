namespace WSU3.Core.Interactive
{
    /// <summary>
    /// 输入与"可见性"闸门：三维侧的交互与逐帧更新在看这个开关，**渲染循环不受影响**。
    ///
    /// 依据（docs/design/09 §5/§6，DEC-84）：
    ///   · 模态面板打开时，Web 发 `input:enable{false}` → 这里关掉拾取与交互（防止"被盖住还在拖"）；
    ///   · 容器不可见时，只让交互与更新**提前返回**，不要停渲染循环（Web 侧会给一个全透明的父层画布）；
    ///   · 恢复时 Web 发 `runtime:resume` → 重新打开。
    ///
    /// 纪律：这里只存状态，**不做任何场景操作**；谁消费谁判断（拾取入口、步骤推进、Viewer 的 Update）。
    /// </summary>
    public static class InputGate
    {
        private static bool s_Enabled = true;
        private static bool s_Visible = true;

        /// <summary>交互是否开启（由 `input:enable` 驱动）。</summary>
        public static bool Enabled
        {
            get => s_Enabled;
            set => s_Enabled = value;
        }

        /// <summary>三维是否可见（不可见时只跳过交互与更新，不停渲染）。</summary>
        public static bool Visible
        {
            get => s_Visible;
            set => s_Visible = value;
        }

        /// <summary>拾取与交互的统一入口判据。</summary>
        public static bool ShouldProcessInput => s_Enabled && s_Visible;

        /// <summary>逐帧逻辑（步骤推进、动画驱动）的判据。</summary>
        public static bool ShouldUpdate => s_Visible;

        /// <summary>回到初始态（测试与场景重进时用）。</summary>
        public static void Reset()
        {
            s_Enabled = true;
            s_Visible = true;
        }
    }
}
