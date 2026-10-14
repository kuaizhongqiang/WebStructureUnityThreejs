using System;
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;
using WSU3.Core.Steps;
using WSU3.Core.Steps.Conditions;

namespace WSU3.Editor
{
    /// <summary>
    /// 步骤节点的 Inspector。除了把条件对象自己的字段照原样画出来（`[SerializeReference]` 多态），
    /// 补三件**光看默认面板看不出来**的事：
    ///   ① **条件类型下拉**（"选类型 = 建对象"）—— Unity 的托管引用只在字段为空时给类型下拉，
    ///      一旦有值就必须先清空才能重选；对"边看边配"的人太绕，所以这里做成一步，
    ///      并且**显示的类型永远取 `condition` 的实际类**，面板与运行期不可能对不上；
    ///   ② 没配条件时的提示（不然运行期只会得到一条"按立即完成处理"的告警）；
    ///   ③ 数据校验 —— 尤其是**循环动画**：它会让 Complete 阶段的"等播完"永不成立（`docs/design/10` §2）。
    /// </summary>
    [CustomEditor(typeof(StepHandler))]
    public class StepHandlerEditor : UnityEditor.Editor
    {
        public override void OnInspectorGUI()
        {
            // conditionType 带 [HideInInspector]，由下面的 DrawConditionSection 画
            DrawDefaultInspector();

            var step = (StepHandler)target;

            EditorGUILayout.Space();
            DrawConditionSection();
            DrawValidation(step);
        }

        /// <summary>
        /// 条件区的**唯一选型入口**：下拉里选类型 → 直接建出对应的条件对象。
        /// 显示值取 `condition` 的实际类（`conditionType` 字段只在还没有条件时当待选值）。
        /// </summary>
        private void DrawConditionSection()
        {
            SerializedProperty conditionProperty = serializedObject.FindProperty("condition");
            SerializedProperty typeProperty = serializedObject.FindProperty("conditionType");
            var current = conditionProperty.managedReferenceValue as ConditionBase;

            EditorGUILayout.LabelField("步骤条件", EditorStyles.boldLabel);

            ConditionType selected = current != null
                ? current.Type
                : StepConditionFactory.Normalize((ConditionType)typeProperty.intValue);

            EditorGUI.BeginChangeCheck();
            var picked = (ConditionType)EditorGUILayout.EnumPopup(
                new GUIContent(
                    "条件类型",
                    "选一个类型即创建对应的条件对象。已实现：默认 / 点击 / UI / 问题 / 连线配对 / 结束。" +
                    "灰掉的：开始（与「默认」同义）、拖拽 / 工具（本期未实现，DEC-93）"),
                selected,
                StepConditionFactory.IsImplemented,
                false);
            bool typeChanged = EditorGUI.EndChangeCheck();

            bool create = false;

            if (current == null)
            {
                EditorGUILayout.HelpBox(
                    "这个步骤还没有条件：运行时会按「立即完成」处理并告警（通常不是你要的）。" +
                    "在上面的下拉里选一个类型即可创建。",
                    MessageType.Warning);

                create = typeChanged || GUILayout.Button($"创建「{picked}」条件");
            }
            else if (typeChanged && current.Type != picked)
            {
                // 换类型 = 换对象：旧条件里填过的字段会跟着对象一起丢掉，先问一句
                create = EditorUtility.DisplayDialog(
                    "替换步骤条件",
                    $"当前条件是「{current.Type}」。\n\n" +
                    $"换成「{picked}」会新建一个条件对象，旧条件里已填的字段" +
                    "（显隐表 / 动画槽位 / 提示 id / 点击目标 …）都会丢掉。",
                    "替换", "取消");
                // 取消时什么都不用做：下拉的显示值下一帧从 condition 的实际类重新取，不会留下错觉
            }

            if (create)
            {
                CreateCondition(typeProperty, conditionProperty, picked);
                // 条件对象刚被换掉：本帧别再往下画，避免控件数量变化导致布局错位
                GUIUtility.ExitGUI();
            }

            if (current != null && GUILayout.Button("清空条件（重新选类型）"))
            {
                serializedObject.Update();
                conditionProperty.managedReferenceValue = null;
                serializedObject.ApplyModifiedProperties();
            }
        }

        /// <summary>按选定类型建对象并回写（类型字段与条件对象一次改完，不会留下不一致的中间态）。</summary>
        private void CreateCondition(
            SerializedProperty typeProperty,
            SerializedProperty conditionProperty,
            ConditionType type)
        {
            serializedObject.Update();
            typeProperty.intValue = (int)type;
            conditionProperty.managedReferenceValue = StepConditionFactory.Create(type);
            serializedObject.ApplyModifiedProperties();
        }

        // 类型 → 条件类 的映射不在这里：挪到 StepConditionFactory，
        // 与 StructureStepGenerator 共用同一份（两处各写一份迟早会漂）。

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

                // WHY（2026-10-14 显隐改由两张表管之后新增）：隐藏的物体播不了动画（Legacy Animation 不推进），
                //   而"播完"判据是 isPlaying ⇒ 被隐藏的槽位会让这一步**瞬间算播完**，且不报错。
                //   这里提前说清楚：要播的物体必须被本步骤的显示表（或它的某个祖先）带成可见。
                if (!IsRevealedByActiveList(condition, slot.animation.gameObject))
                {
                    warnings.Add(
                        $"{label} 的物体 '{slot.animation.gameObject.name}' 不在显示表里（也没有祖先在显示表里）—— " +
                        "它在这一步是隐藏的，动画不会播。显隐一律由显示表/隐藏表负责。");
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

        /// <summary>
        /// 该物体会不会被本步骤的显示表带成可见：它自己在表里，或它的某个祖先在表里
        /// （`SetActive(true)` 作用在祖先上时，后代靠 `activeInHierarchy` 一起可见）。
        /// </summary>
        private static bool IsRevealedByActiveList(ConditionBase condition, GameObject target)
        {
            if (target == null) return false;

            Transform current = target.transform;
            while (current != null)
            {
                if (ContainsReference(condition.ActiveObjects, current.gameObject)) return true;
                current = current.parent;
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
