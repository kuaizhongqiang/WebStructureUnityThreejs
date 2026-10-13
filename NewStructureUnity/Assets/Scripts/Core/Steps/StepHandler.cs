using UnityEngine;
using WSU3.Core.Steps.Conditions;

namespace WSU3.Core.Steps
{
    /// <summary>步骤在生命周期里的位置（诊断用；`StepManager` 每进一个阶段回填一次）。</summary>
    public enum StepLifecycle
    {
        /// <summary>还没有被驱动过（或已被 StopExecution 归位）。</summary>
        Idle = 0,
        Prepare = 1,
        Waiting = 2,
        Complete = 3,
        /// <summary>本步骤已结束（含快进结束）。</summary>
        Done = 4,
    }

    /// <summary>
    /// 步骤节点（三级结构的第二级：进程 → **步骤** → 条件）。
    ///
    /// 它只承载**步骤的元数据 + 一个条件对象**：具体的显隐、动画、交互数据都在条件上
    /// （`[SerializeReference]` 多态，见 `docs/design/10-step-system.md` 的取舍说明）。
    /// 收集由 `ProcessingHandler` 做（它知道自己下面有哪些步骤），本类不参与层级遍历。
    /// </summary>
    [DisallowMultipleComponent]
    public class StepHandler : MonoBehaviour
    {
        [Tooltip("步骤 ID：显式配置优先（改层级不会让它失效）；留空时由 StepManager 兜底成 Step_{进程}_{步骤}")]
        [SerializeField] private string id;

        [Tooltip("步骤显示名（进入步骤时随 step:changed 报给 Web；留空用物体名）")]
        [SerializeField] private string displayName;

        [TextArea(2, 4)]
        [Tooltip("步骤描述（内容侧留痕，不上网）")]
        [SerializeField] private string description;

        [Tooltip("步骤条件：数据与行为都在这里。抽象类型用 Inspector 的类型下拉选具体条件（ConditionDefault / ConditionClick / …）")]
        [SerializeReference] private ConditionBase condition;

        /// <summary>步骤 ID（显式配置优先，留空用物体名；收集时会兜底成可读的 Step_p_s）。</summary>
        public string Id => string.IsNullOrEmpty(id) ? name : id;

        /// <summary>显示名（留空用物体名）。</summary>
        public string DisplayName => string.IsNullOrEmpty(displayName) ? name : displayName;

        /// <summary>描述。</summary>
        public string Description => description;

        /// <summary>条件（数据 + 行为）。可能为 null：那种步骤按"立即完成"处理并告警。</summary>
        public ConditionBase Condition => condition;

        /// <summary>条件类型标签（没有条件时为 `Default`）。</summary>
        public ConditionType ConditionType => condition != null ? condition.Type : ConditionType.Default;

        /// <summary>当前生命周期位置。</summary>
        public StepLifecycle Lifecycle { get; private set; } = StepLifecycle.Idle;

        /// <summary>所在进程序号（收集时回填，-1 = 还没收集）。</summary>
        public int ProcessIndex { get; private set; } = -1;

        /// <summary>进程内步骤序号（收集时回填）。</summary>
        public int StepIndex { get; private set; } = -1;

        /// <summary>扁平步骤序号（跨进程连续，供 step:changed 用）。</summary>
        public int FlatIndex { get; private set; } = -1;

        /// <summary>诊断用路径。</summary>
        public string Path =>
            $"P{Mathf.Max(0, ProcessIndex)}S{Mathf.Max(0, StepIndex)}({name})";

        /// <summary>
        /// 运行时替换条件（编辑器里走 Inspector 的多态字段；测试用它塞替身条件）。
        /// </summary>
        public void SetCondition(ConditionBase value)
        {
            condition = value;
            BindCondition();
        }

        /// <summary>由收集方回填位置信息，并给空 ID 兜底一个可读名字。</summary>
        internal void Place(int processIndex, int stepIndex, int flatIndex)
        {
            ProcessIndex = processIndex;
            StepIndex = stepIndex;
            FlatIndex = flatIndex;

            if (string.IsNullOrEmpty(id))
            {
                id = $"Step_{processIndex}_{stepIndex}";
            }
        }

        /// <summary>由 `StepManager` 回填生命周期（只作诊断，不承载逻辑）。</summary>
        internal void SetLifecycle(StepLifecycle value)
        {
            Lifecycle = value;
        }

        private void Awake()
        {
            BindCondition();
        }

        private void OnValidate()
        {
            // 编辑期改完条件也绑一次，省得"必须先运行一次才知道绑没绑"
            BindCondition();
        }

        private void BindCondition()
        {
            condition?.Bind(this);
        }
    }
}
