using System;

namespace WSU3.Core.Steps.Conditions
{
    /// <summary>
    /// 结束条件：**终止型**。不执行三阶段，`StepManager` 遇到它直接报"全部完成"。
    ///
    /// 用途：一个任务里"做完这一段就算任务完成"的收尾步骤（不必把剩下的步骤跑完）。
    /// </summary>
    [Serializable]
    public class ConditionFinish : ConditionBase
    {
        public override ConditionType Type => ConditionType.Finish;

        public override bool IsTerminal => true;
    }
}
