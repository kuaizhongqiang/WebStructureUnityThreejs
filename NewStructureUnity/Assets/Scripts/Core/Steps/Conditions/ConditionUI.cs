using System;
using System.Collections;
using UnityEngine;

namespace WSU3.Core.Steps.Conditions
{
    /// <summary>
    /// 信息面板条件：弹一块教学说明面板（DOM 层，DEC-16），**关闭即完成**。
    ///
    /// 面板通过 `StepPanelPort` 请求（Core 定义端口、Runtime 用桥实现），所以这里不需要知道
    /// "界面长什么样、在不在 Unity 里"。端口缺席或 `uiId` 为空时**降级为直接完成**并告警 ——
    /// 口径是"面板找不到就跳过，绝不把流程卡死在一个永远不来的面板上"（`docs/design/10` §5）。
    /// </summary>
    [Serializable]
    public class ConditionUI : ConditionBase
    {
        [Tooltip("信息/UI 的 ID：Web 侧据此取内容数据（见 docs/design/08-content-data-adoption.md）")]
        [SerializeField] private string uiId;

        [Tooltip("等面板回执的上限（秒）：0 = 不限（默认）。面板一直不回时，配了它才会自动放行并告警")]
        [SerializeField] private float timeoutSeconds;

        private bool closed;

        public override ConditionType Type => ConditionType.UI;

        /// <summary>面板 ID（诊断用）。</summary>
        public string UiId => uiId;

        /// <summary>运行期换面板 ID（测试与内容装配用）。</summary>
        public void SetUiId(string value)
        {
            uiId = value;
        }

        protected override IEnumerator OnPrepare()
        {
            closed = false;
            yield break;
        }

        protected override IEnumerator OnWaiting()
        {
            if (string.IsNullOrEmpty(uiId))
            {
                Debug.LogWarning($"[Step] {step?.Path} 的信息面板条件没有配 uiId，已按「立即完成」处理。");
                yield break;
            }

            StepPanelPort.ShowUi(uiId, OnPanelResult);

            yield return WaitUntilOrForceCompleteOrTimeout(
                () => closed,
                timeoutSeconds,
                () => Debug.LogWarning(
                    $"[Step] {step?.Path} 的信息面板（uiId={uiId}）等了 {timeoutSeconds:0.#}s 没有回执，" +
                    "已按「降级完成」放行。若这是预期的（长文阅读），请把 timeoutSeconds 设为 0。"));
        }

        /// <summary>运行期改超时（内容装配与测试用）。</summary>
        public void SetTimeoutSeconds(float value)
        {
            timeoutSeconds = Mathf.Max(0f, value);
        }

        protected override void OnCompleteHide()
        {
            // 被强制完成时面板可能还开着：收掉，别把它留在屏幕上盖住后面几步
            StepPanelPort.CloseTopPanel();
        }

        protected override void OnReset()
        {
            closed = false;
        }

        /// <summary>
        /// 关闭即完成：`Success`（读完/确认）与 `Failed`（用户取消）都算这一步过去了；
        /// `Unavailable`（弹不出来）也一样，只是要留一条告警 —— 差别只在日志，不在流程。
        /// </summary>
        private void OnPanelResult(StepPanelResult result)
        {
            if (result == StepPanelResult.Unavailable)
            {
                Debug.LogWarning($"[Step] {step?.Path} 的信息面板（uiId={uiId}）弹不出来，已降级为直接完成。");
            }

            closed = true;
        }
    }
}
