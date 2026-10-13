using System;
using System.Collections;

namespace WSU3.Core.Steps.Conditions
{
    /// <summary>
    /// 默认条件：**没有交互**的步骤（讲解、过渡、只播一段动画）。
    ///
    /// 语义：Prepare 归位 → Waiting 定格首帧后立即结束 → Complete 播放动画并等播完。
    /// 空条件的步骤（`condition == null`）走的是同一条路，所以"忘记配条件"和"故意配默认条件"表现一致。
    /// </summary>
    [Serializable]
    public class ConditionDefault : ConditionBase
    {
        public override ConditionType Type => ConditionType.Default;

        protected override IEnumerator OnWaiting()
        {
            yield break;
        }
    }
}
