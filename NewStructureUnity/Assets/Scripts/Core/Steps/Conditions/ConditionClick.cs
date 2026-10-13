using System;
using System.Collections;
using UnityEngine;
using WSU3.Core.Interactive;

namespace WSU3.Core.Steps.Conditions
{
    /// <summary>
    /// 点击条件：点击指定交互物即完成。
    ///
    /// 点击由 `InteractiveManager` 统一检测（`ScreenPointToRay + Physics.Raycast`）后经
    /// `GlobalInteractionEventData` 派发；本条件**不自己订阅**事件，等 `StepManager` 在 Waiting 期间转发
    /// （见 `ConditionBase.OnInteraction` 的说明）。
    /// </summary>
    [Serializable]
    public class ConditionClick : ConditionBase
    {
        [Tooltip("要点击的交互物（必须挂了 InteractiveObjBase，否则拾取体系认不到它）")]
        [SerializeField] private InteractiveObjBase target;

        [Tooltip("由步骤负责揭示物体：Prepare 隐藏、Waiting 显示、完成后再隐藏。物体本来就在场景里时关掉它")]
        [SerializeField] private bool toggleTargetActive = true;

        private bool clicked;

        public override ConditionType Type => ConditionType.Click;

        /// <summary>点击目标（诊断 / 编辑器用）。</summary>
        public InteractiveObjBase Target => target;

        /// <summary>运行期指定点击目标（内容装配与测试用；编辑器里走 Inspector）。</summary>
        public void SetTarget(InteractiveObjBase value)
        {
            target = value;
        }

        protected override IEnumerator OnPrepare()
        {
            clicked = false;

            if (toggleTargetActive && target != null)
            {
                target.gameObject.SetActive(false);
            }

            yield break;
        }

        protected override IEnumerator OnWaiting()
        {
            if (target == null)
            {
                Debug.LogWarning($"[Step] {step?.Path} 的点击条件没有配 target，已按「立即完成」处理。");
                yield break;
            }

            if (toggleTargetActive)
            {
                target.gameObject.SetActive(true);
            }

            yield return WaitUntilOrForceComplete(() => clicked);
        }

        protected override void OnCompleteHide()
        {
            if (toggleTargetActive && target != null)
            {
                target.gameObject.SetActive(false);
            }
        }

        protected override void OnReset()
        {
            clicked = false;

            // 归位要连带"揭示"一起收回去：不然跳走之后，这一步的目标会一直亮在屏幕上
            if (toggleTargetActive && target != null)
            {
                target.gameObject.SetActive(false);
            }
        }

        public override void OnInteraction(GlobalInteractionEventData e)
        {
            if (e == null || e.Type != GlobalInteractionType.Click) return;
            if (target == null || e.Target != target) return;

            clicked = true;
        }
    }
}
