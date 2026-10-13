using System.Collections;
using WSU3.Core.Steps.Conditions;

namespace WSU3.Core.Interfaces
{
    /// <summary>
    /// 步骤条件的契约（三级结构的第三级：进程 → 步骤 → 条件）。
    ///
    /// 生命周期由 `StepManager` 用**协程三阶段**驱动：`Prepare → Waiting → Complete`；
    /// 跳转时对"目标之前的步骤"走 <see cref="FastComplete"/>（快进，不播放），对"目标步骤"走正常三阶段。
    ///
    /// 因此条件里**任何阻塞都必须可被打断**：等待循环一律用
    /// `ConditionBase.WaitUntilOrForceComplete`，让 <see cref="ForceComplete"/> 能尽快退出
    /// （协作式打断，不是轮询 —— 设计见 `docs/design/10-step-system.md`）。
    ///
    /// 为什么是 `IEnumerator` 而不是回调：只有协程能表达"等交互 → 播完动画 → 再往下"，
    /// 也才能让 `StepManager` 在任意阶段插入打断、快进与跳转。
    /// </summary>
    public interface ICondition
    {
        /// <summary>条件状态：就绪 / 等待中 / 已完成。</summary>
        StepStatus Status { get; }

        /// <summary>
        /// 终止型条件（如"结束"）：不执行三阶段，直接让整条流程报全部完成。
        /// </summary>
        bool IsTerminal { get; }

        /// <summary>阶段一：显隐归位 + 隐藏动画 + 子类隐藏交互物（不阻塞，或子类自定义）。</summary>
        IEnumerator Prepare();

        /// <summary>阶段二：定格首帧 + 子类显示交互物并等待条件成立（阻塞点在这里）。</summary>
        IEnumerator Waiting();

        /// <summary>阶段三：子类收尾 + 播放动画并等播完 + 按需隐藏。</summary>
        IEnumerator Complete();

        /// <summary>快进：不播放，直接定格末帧，呈现"已完成"的姿态（跳转时对目标之前的步骤调用）。</summary>
        IEnumerator FastComplete();

        /// <summary>协作式打断：让 Waiting/Complete 里的阻塞循环尽快退出。</summary>
        void ForceComplete();

        /// <summary>归位成初始态（跳转前对**所有**条件调用，保证状态一致）。</summary>
        void ResetCondition();
    }
}
