using System;
using UnityEngine;

namespace WSU3.Core.Steps
{
    /// <summary>教学面板的结果。</summary>
    public enum StepPanelResult
    {
        /// <summary>用户完成/确认/答对。</summary>
        Success = 0,
        /// <summary>用户答错或取消（条件可据此重问）。</summary>
        Failed = 1,
        /// <summary>面板根本弹不出来（实现缺席、题目取不到…）：条件按降级处理，**不阻塞流程**。</summary>
        Unavailable = 2,
    }

    /// <summary>
    /// 教学面板端口：步骤里的"信息面板 / 提示 / 答题"由**界面层**实现，条件只认这个接口。
    ///
    /// 为什么要这一层：教学界面在 DOM 层（DEC-16），界面不在 Unity 里，而 Core 又不能引用 Runtime 的桥。
    /// 所以 Core 定义端口、Runtime 注册实现（`WSU3.Web.WebStepPanelPort`），条件在 Waiting 里等回调。
    ///
    /// 降级口径：端口缺席时**告警并按 Unavailable 处理**，绝不把流程卡死在"等一个永远不来的面板"上。
    /// </summary>
    public interface IStepPanelPort
    {
        /// <summary>提示条（`ui:request{kind="tips"}`）：不阻塞，弹不弹由 Web 决定。</summary>
        void ShowTip(string tipsKey);

        /// <summary>信息/说明面板：关闭后回调。</summary>
        void ShowUi(string uiId, Action<StepPanelResult> onClosed);

        /// <summary>答题面板：判对后回调。</summary>
        void ShowQuestion(string questionId, Action<StepPanelResult> onAnswered);

        /// <summary>强制收起当前面板（被 `ForceComplete` 打断时用，别把面板留在屏幕上）。</summary>
        void CloseTopPanel();
    }

    /// <summary>
    /// 端口的静态注册点（Core 侧出口）。
    ///
    /// 用静态注册而不是单例管理器：条件可能在任何时刻被 `Reset`，
    /// 静态注册表让"有没有面板"这件事永远只有一处可查（`IsAvailable`），也方便测试换替身。
    /// </summary>
    public static class StepPanelPort
    {
        private static IStepPanelPort s_Port;

        /// <summary>是否已注册实现（没有时条件会降级）。</summary>
        public static bool IsAvailable => s_Port != null;

        /// <summary>注册实现（Runtime 的桥在启用时注册）。</summary>
        public static void Register(IStepPanelPort port)
        {
            s_Port = port;
        }

        /// <summary>注销实现（只有当前登记的那个能注销自己，避免误清别人的）。</summary>
        public static void Unregister(IStepPanelPort port)
        {
            if (ReferenceEquals(s_Port, port)) s_Port = null;
        }

        /// <summary>清空（测试与场景重进用）。</summary>
        public static void Reset()
        {
            s_Port = null;
        }

        public static void ShowTip(string tipsKey)
        {
            if (string.IsNullOrEmpty(tipsKey)) return;
            s_Port?.ShowTip(tipsKey);
        }

        /// <summary>请求信息面板；没有实现时按 `Unavailable` 立即回调（降级，不阻塞）。</summary>
        public static void ShowUi(string uiId, Action<StepPanelResult> onClosed)
        {
            if (string.IsNullOrEmpty(uiId))
            {
                Debug.LogWarning("[Step] ConditionUI 没有配 uiId，已按降级处理（直接完成）。");
                onClosed?.Invoke(StepPanelResult.Unavailable);
                return;
            }

            if (s_Port == null)
            {
                Debug.LogWarning($"[Step] 面板端口未注册（uiId={uiId}）：信息面板已降级为直接完成。");
                onClosed?.Invoke(StepPanelResult.Unavailable);
                return;
            }

            s_Port.ShowUi(uiId, onClosed);
        }

        /// <summary>请求答题面板；没有实现时按 `Unavailable` 立即回调（降级，不阻塞）。</summary>
        public static void ShowQuestion(string questionId, Action<StepPanelResult> onAnswered)
        {
            if (string.IsNullOrEmpty(questionId))
            {
                Debug.LogWarning("[Step] ConditionQuestion 没有配 questionId，已按降级处理（直接完成）。");
                onAnswered?.Invoke(StepPanelResult.Unavailable);
                return;
            }

            if (s_Port == null)
            {
                Debug.LogWarning($"[Step] 面板端口未注册（questionId={questionId}）：答题面板已降级为直接完成。");
                onAnswered?.Invoke(StepPanelResult.Unavailable);
                return;
            }

            s_Port.ShowQuestion(questionId, onAnswered);
        }

        /// <summary>收起当前面板（打断时收尾）。</summary>
        public static void CloseTopPanel()
        {
            s_Port?.CloseTopPanel();
        }
    }
}
