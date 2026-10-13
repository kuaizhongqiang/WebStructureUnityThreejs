using WSU3.Contracts;

namespace WSU3.Core.Steps
{
    // ========================================================================
    // 步骤系统的事件（Core 侧）。
    //
    // 为什么放在 Core（而不是 Contracts/Events）：订阅方是"Core 自己的导航逻辑 +
    // 业务 Viewers"，事件里带的是 `StepHandler` / `ProcessingHandler` 这类 Core 类型。
    // 真正上网的那一条由 Runtime 订阅后转成桥消息（`step:changed` / `task:completed`），
    // 与 `object:picked` 的走法一致（Core 不依赖 Runtime，见 docs/design/02 §1）。
    // ========================================================================

    /// <summary>进入新进程。</summary>
    public class ProcessChangedEvent
    {
        public int ProcessIndex;
        public ProcessingHandler Process;

        public ProcessChangedEvent(int processIndex, ProcessingHandler process)
        {
            ProcessIndex = processIndex;
            Process = process;
        }
    }

    /// <summary>步骤 Prepare 完成（显隐与归位已生效）。</summary>
    public class StepPreparedEvent
    {
        public StepHandler Step;
        public int ProcessIndex;
        public int StepIndex;
        public int FlatIndex;

        public StepPreparedEvent(StepHandler step, int processIndex, int stepIndex, int flatIndex)
        {
            Step = step;
            ProcessIndex = processIndex;
            StepIndex = stepIndex;
            FlatIndex = flatIndex;
        }
    }

    /// <summary>步骤进入 Waiting（此刻起才允许交互）。</summary>
    public class StepWaitingEvent
    {
        public StepHandler Step;
        public int ProcessIndex;
        public int StepIndex;
        public int FlatIndex;

        public StepWaitingEvent(StepHandler step, int processIndex, int stepIndex, int flatIndex)
        {
            Step = step;
            ProcessIndex = processIndex;
            StepIndex = stepIndex;
            FlatIndex = flatIndex;
        }
    }

    /// <summary>步骤 Complete 完成。</summary>
    public class StepCompletedEvent
    {
        public StepHandler Step;
        public int ProcessIndex;
        public int StepIndex;
        public int FlatIndex;

        public StepCompletedEvent(StepHandler step, int processIndex, int stepIndex, int flatIndex)
        {
            Step = step;
            ProcessIndex = processIndex;
            StepIndex = stepIndex;
            FlatIndex = flatIndex;
        }
    }

    /// <summary>
    /// 步骤进度（**扁平**序号）：Runtime 订阅它发 `step:changed{stepIndex, stepTotal, stepName}`。
    /// 字段名与桥载荷逐字对齐，免得再翻译一次。
    /// </summary>
    public class StepChangedEvent
    {
        public int StepIndex;
        public int StepTotal;
        public string StepName;

        public StepChangedEvent(int stepIndex, int stepTotal, string stepName)
        {
            StepIndex = stepIndex;
            StepTotal = stepTotal;
            StepName = stepName;
        }
    }

    /// <summary>
    /// 整条流程结束（走到最后一个步骤，或遇到终止型条件）。
    /// Runtime 订阅它发 `task:completed{taskType, score, elapsedMs}`。
    /// </summary>
    public class AllStepsCompletedEvent
    {
        public TaskType TaskType;
        public float Score;
        public long ElapsedMs;

        public AllStepsCompletedEvent(TaskType taskType, float score, long elapsedMs)
        {
            TaskType = taskType;
            Score = score;
            ElapsedMs = elapsedMs;
        }
    }

    // ── 入口事件（"谁想推进步骤"都发这些，StepManager 订阅）──────────────

    /// <summary>请求推进到下一步（强制完成当前步骤）。</summary>
    public class StepNextRequestEvent
    {
    }

    /// <summary>请求在当前进程内跳到某一步。</summary>
    public class StepJumpRequestEvent
    {
        public int StepIndex;

        public StepJumpRequestEvent(int stepIndex)
        {
            StepIndex = stepIndex;
        }
    }

    /// <summary>请求跳到"某进程的某一步"。</summary>
    public class ProcessingJumpRequestEvent
    {
        public int ProcessIndex;
        public int StepIndex;

        public ProcessingJumpRequestEvent(int processIndex, int stepIndex)
        {
            ProcessIndex = processIndex;
            StepIndex = stepIndex;
        }
    }
}
