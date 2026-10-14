using System;
using System.Collections;
using UnityEngine;

namespace WSU3.Core.Steps.Conditions
{
    /// <summary>
    /// 答题条件：弹出题目，**答对即完成**；答错重问（有重试上限，防止"Web 一直回失败"变成死循环）。
    ///
    /// 判定在界面层（Web 侧持有同一份题库，见 `docs/design/08-content-data-adoption.md`），
    /// Unity 只认 `ui:result` 的结果 —— 答对 = 完成，答错 = 再问一次。
    /// 端口缺席或 `questionId` 为空时**降级为直接完成**并告警（`docs/design/10` §5 的降级口径）。
    /// </summary>
    [Serializable]
    public class ConditionQuestion : ConditionBase
    {
        private enum AskState
        {
            Pending = 0,
            Correct = 1,
            Wrong = 2,
            Unavailable = 3,
        }

        [Tooltip("题目 ID：Web 侧据此取题库（题库文件两侧各有一份，判定在界面层做）")]
        [SerializeField] private string questionId;

        [Tooltip("最多问几次（答错重问）；0 = 不限次数（注意：不限次数时只有答对或强制完成才能过去）")]
        [SerializeField] private int maxAttempts = 3;

        [Tooltip("等一次答题回执的上限（秒）：0 = 不限（默认，学生可能真的要想很久）。到点会告警并按降级放行")]
        [SerializeField] private float timeoutSeconds;

        private AskState state = AskState.Pending;
        private bool answered;
        private int attempts;

        public override ConditionType Type => ConditionType.Question;

        /// <summary>题目 ID（诊断用）。</summary>
        public string QuestionId => questionId;

        /// <summary>已经问了几次（诊断用）。</summary>
        public int Attempts => attempts;

        /// <summary>运行期换题目 ID（测试与内容装配用）。</summary>
        public void SetQuestionId(string value)
        {
            questionId = value;
        }

        /// <summary>运行期改超时（内容装配与测试用）。</summary>
        public void SetTimeoutSeconds(float value)
        {
            timeoutSeconds = Mathf.Max(0f, value);
        }

        protected override IEnumerator OnPrepare()
        {
            answered = false;
            attempts = 0;
            state = AskState.Pending;
            yield break;
        }

        protected override IEnumerator OnWaiting()
        {
            if (string.IsNullOrEmpty(questionId))
            {
                Debug.LogWarning($"[Step] {step?.Path} 的答题条件没有配 questionId，已按「立即完成」处理。");
                yield break;
            }

            // WHY: 用 ShouldStopWaiting（= 被强制完成 **或** 动画运行模式不等人）而不是裸 forceComplete ——
            //      内层等待已经认这个判据，外层循环若不认，"动画模式 + 无超时"时会一圈圈重复提问而退不出去。
            while (!ShouldStopWaiting && !answered)
            {
                attempts++;
                state = AskState.Pending;

                StepPanelPort.ShowQuestion(questionId, OnAnswer);

                yield return WaitUntilOrForceCompleteOrTimeout(
                    () => state != AskState.Pending,
                    timeoutSeconds,
                    () =>
                    {
                        // 超时按"面板不可用"处理，否则下面会把它当成"答错"而无限重问
                        state = AskState.Unavailable;
                        Debug.LogWarning(
                            $"[Step] {step?.Path} 的题目（questionId={questionId}）等了 {timeoutSeconds:0.#}s 没有回执，" +
                            "已按「降级完成」放行。若这是预期的（学生要想很久），请把 timeoutSeconds 设为 0。");
                    });

                if (state == AskState.Correct)
                {
                    answered = true;
                    yield break;
                }

                if (state == AskState.Unavailable)
                {
                    Debug.LogWarning($"[Step] {step?.Path} 的题目（questionId={questionId}）弹不出来，已降级为直接完成。");
                    yield break;
                }

                // Wrong：再问一次（面板会被重新弹出来）
                if (maxAttempts > 0 && attempts >= maxAttempts)
                {
                    Debug.LogWarning(
                        $"[Step] {step?.Path} 的题目（questionId={questionId}）已经答错 {attempts} 次（上限 {maxAttempts}），" +
                        "本步骤按「已完成」放行。若这里应该继续卡住，请把 maxAttempts 设为 0。");
                    yield break;
                }
            }
        }

        protected override void OnCompleteHide()
        {
            StepPanelPort.CloseTopPanel();
        }

        protected override void OnReset()
        {
            answered = false;
            attempts = 0;
            state = AskState.Pending;
        }

        private void OnAnswer(StepPanelResult result)
        {
            switch (result)
            {
                case StepPanelResult.Success:
                    state = AskState.Correct;
                    break;
                case StepPanelResult.Failed:
                    state = AskState.Wrong;
                    break;
                default:
                    state = AskState.Unavailable;
                    break;
            }
        }
    }
}
