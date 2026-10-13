using System.Collections.Generic;
using UnityEditor;
using UnityEngine;
using WSU3.Core.Steps;
using WSU3.Core.Steps.Conditions;

namespace WSU3.Editor
{
    /// <summary>
    /// 步骤节点的 Inspector：多态条件（Unity 内建的 `[SerializeReference]` 类型下拉）之外，
    /// 补两件**光看默认面板看不出来**的事：
    ///   ① 没配条件时的快捷赋默认条件（不然运行期只会得到一条"按立即完成处理"的告警）；
    ///   ② 数据校验 —— 尤其是**循环动画**：它会让 Complete 阶段的"等播完"永不成立（`docs/design/10` §2）。
    /// </summary>
    [CustomEditor(typeof(StepHandler))]
    public class StepHandlerEditor : UnityEditor.Editor
    {
        public override void OnInspectorGUI()
        {
            DrawDefaultInspector();

            var step = (StepHandler)target;

            EditorGUILayout.Space();
            DrawConditionSection();
            DrawValidation(step);
        }

        private void DrawConditionSection()
        {
            SerializedProperty conditionProperty = serializedObject.FindProperty("condition");
            bool empty = conditionProperty == null || conditionProperty.managedReferenceValue == null;

            if (empty)
            {
                EditorGUILayout.HelpBox(
                    "这个步骤还没有配条件：运行时会按「立即完成」处理并告警（通常不是你要的）。",
                    MessageType.Warning);

                if (GUILayout.Button("赋予默认条件（无交互，只播动画）"))
                {
                    serializedObject.Update();
                    conditionProperty.managedReferenceValue = new ConditionDefault();
                    serializedObject.ApplyModifiedProperties();
                }
                return;
            }

            var condition = (ConditionBase)conditionProperty.managedReferenceValue;
            EditorGUILayout.LabelField("条件类型", condition.Type.ToString());

            if (GUILayout.Button("清空条件（重新选类型）"))
            {
                serializedObject.Update();
                conditionProperty.managedReferenceValue = null;
                serializedObject.ApplyModifiedProperties();
            }
        }

        private static void DrawValidation(StepHandler step)
        {
            ConditionBase condition = step.Condition;
            if (condition == null) return;

            List<string> errors = new List<string>();
            List<string> warnings = new List<string>();

            // ① 显隐表：空槽位 / 同一物体既显又隐
            CheckObjectList(condition.ActiveObjects, "显示表", warnings);
            CheckObjectList(condition.InactiveObjects, "隐藏表", warnings);

            for (int i = 0; i < condition.ActiveObjects.Count; i++)
            {
                GameObject go = condition.ActiveObjects[i];
                if (go == null) continue;
                if (ContainsReference(condition.InactiveObjects, go))
                {
                    errors.Add($"'{go.name}' 同时在显示表和隐藏表里：Prepare 的结果取决于执行顺序，必须二选一。");
                }
            }

            // ② 动画槽位：空引用 / 循环动画 / clip 不在 Animation 组件的列表里
            for (int i = 0; i < condition.Animations.Count; i++)
            {
                AnimationStruct slot = condition.Animations[i];
                string label = $"animations[{i}]";

                if (slot.animation == null || slot.clip == null)
                {
                    errors.Add($"{label} 缺 animation 或 clip，运行时会跳过这个槽位。");
                    continue;
                }

                if (slot.clip.isLooping)
                {
                    errors.Add(
                        $"{label} 的 clip '{slot.clip.name}' 是**循环动画**：Complete 阶段的「等播完」永不成立。" +
                        "请把 clip 的 Loop 关掉（运行期有超时护栏，但那是兜底不是设计）。");
                }

                if (slot.animation[slot.clip.name] == null)
                {
                    errors.Add($"{label} 的 clip '{slot.clip.name}' 不在 {slot.animation.name} 的 Animations 列表里，运行时会跳过。");
                }
            }

            // ③ 层级：StepHandler 必须挂在 ProcessingHandler 下面（收集只看这一层）
            if (step.GetComponentInParent<ProcessingHandler>() == null)
            {
                warnings.Add("这个步骤不在任何 ProcessingHandler 下面，StepManager 收集不到它。");
            }

            if (errors.Count == 0 && warnings.Count == 0) return;

            EditorGUILayout.Space();
            for (int i = 0; i < errors.Count; i++)
            {
                EditorGUILayout.HelpBox(errors[i], MessageType.Error);
            }
            for (int i = 0; i < warnings.Count; i++)
            {
                EditorGUILayout.HelpBox(warnings[i], MessageType.Warning);
            }
        }

        private static bool ContainsReference(IReadOnlyList<GameObject> objects, GameObject target)
        {
            for (int i = 0; i < objects.Count; i++)
            {
                if (objects[i] == target) return true;
            }
            return false;
        }

        private static void CheckObjectList(IReadOnlyList<GameObject> objects, string label, List<string> warnings)
        {
            for (int i = 0; i < objects.Count; i++)
            {
                if (objects[i] == null)
                {
                    warnings.Add($"{label}[{i}] 是空槽位，运行时会跳过。");
                }
            }
        }
    }
}
