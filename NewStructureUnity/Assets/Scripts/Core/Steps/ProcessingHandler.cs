using System.Collections.Generic;
using UnityEngine;

namespace WSU3.Core.Steps
{
    /// <summary>
    /// 进程节点（三级结构的第一级：**进程** → 步骤 → 条件）。
    ///
    /// 它是"一组步骤"的容器，**不承载执行逻辑**：只负责收集自己的直接子 `StepHandler`
    /// （收集规则与 `StepManager` 收集进程一致 —— 只看直接子节点，层级改动会影响收集结果）。
    /// </summary>
    [DisallowMultipleComponent]
    public class ProcessingHandler : MonoBehaviour
    {
        [Tooltip("进程 ID（留空用物体名）")]
        [SerializeField] private string id;

        [Tooltip("进程显示名（留空用物体名）")]
        [SerializeField] private string displayName;

        // 运行期收集，不做序列化：避免"Inspector 里的列表"与"实际子节点"两处漂移。
        private readonly List<StepHandler> steps = new List<StepHandler>();

        /// <summary>进程 ID。</summary>
        public string Id => string.IsNullOrEmpty(id) ? name : id;

        /// <summary>显示名。</summary>
        public string DisplayName => string.IsNullOrEmpty(displayName) ? name : displayName;

        /// <summary>本进程的步骤（顺序 = 子节点顺序）。</summary>
        public IReadOnlyList<StepHandler> Steps => steps;

        /// <summary>步骤数。</summary>
        public int StepCount => steps.Count;

        /// <summary>取第 index 步（越界返回 null，调用方负责判空）。</summary>
        public StepHandler GetStep(int index)
        {
            return index >= 0 && index < steps.Count ? steps[index] : null;
        }

        private void Awake()
        {
            if (steps.Count == 0) Collect();
        }

        /// <summary>
        /// 收集直接子节点里的 `StepHandler`（可重复调用，先清后收）。
        /// 没有 `StepHandler` 的子节点会被跳过并告警 —— 静默跳过的后果是"步骤凭空少了几步"。
        /// </summary>
        public int Collect()
        {
            steps.Clear();

            for (int i = 0; i < transform.childCount; i++)
            {
                Transform child = transform.GetChild(i);
                StepHandler step = child.GetComponent<StepHandler>();
                if (step == null)
                {
                    Debug.LogWarning(
                        $"[Step] 进程 '{name}' 的子节点 '{child.name}' 没有 StepHandler 组件，已跳过。" +
                        "步骤系统的层级是 StepManager → ProcessingHandler → StepHandler（只看直接子节点）。");
                    continue;
                }

                steps.Add(step);
            }

            if (steps.Count == 0)
            {
                Debug.LogWarning($"[Step] 进程 '{name}' 下面一个 StepHandler 都没有，本进程会被跳过。");
            }

            return steps.Count;
        }
    }
}
