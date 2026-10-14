using System;
using WSU3.Core.Steps.Conditions;

namespace WSU3.Editor
{
    /// <summary>
    /// 条件类型 → 条件类 的**唯一映射点**：`StepHandlerEditor` 的「条件类型」下拉与
    /// `StructureStepGenerator` 的结构任务步骤生成都走这里 —— 两处各写一份映射迟早会漂。
    ///
    /// 依据：`ConditionBase.Type`（具体条件由**类**决定，`ConditionType` 枚举只是标签，见 DEC-89 / `design/10` §2）。
    /// </summary>
    internal static class StepConditionFactory
    {
        /// <summary>按类型建一个空条件对象（字段留类默认值）。</summary>
        internal static ConditionBase Create(ConditionType type)
        {
            switch (type)
            {
                case ConditionType.Click: return new ConditionClick();
                case ConditionType.UI: return new ConditionUI();
                case ConditionType.Question: return new ConditionQuestion();
                case ConditionType.LineConnect: return new ConditionLineConnect();
                case ConditionType.Finish: return new ConditionFinish();
                default: return new ConditionDefault();
            }
        }

        /// <summary>哪些类型是"真的能建出来"的（下拉里可选、生成器可用）。</summary>
        internal static bool IsImplemented(Enum value)
        {
            switch ((ConditionType)value)
            {
                case ConditionType.Default:
                case ConditionType.Click:
                case ConditionType.UI:
                case ConditionType.Question:
                case ConditionType.LineConnect:
                case ConditionType.Finish:
                    return true;
                default:
                    // Start：早期占位，与 Default 同义；Drag / Tool：本期未实现（DEC-93）
                    return false;
            }
        }

        /// <summary>把"不可选"的历史值归一成 Default，免得下拉显示一个灰项。</summary>
        internal static ConditionType Normalize(ConditionType value)
        {
            return IsImplemented(value) ? value : ConditionType.Default;
        }
    }
}
