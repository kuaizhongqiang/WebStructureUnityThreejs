using UnityEditor;
using UnityEngine;
using WSU3.Core.Steps;

namespace WSU3.Editor
{
    /// <summary>
    /// 步骤导演的 Inspector：运行时看进度 + 手动驱动。
    ///
    /// 为什么要有：步骤系统的调试成本全在"跳转后状态对不对"，而在场景里重摆一遍层级、
    /// 重进一次 Play 才能验证一次 —— 这几个按钮把"跳转 → 观察 → 再跳转"压成一次点击。
    /// 与运行时是**同一套公开 API**（`StartExecution` / `NextStep` / `PrevStep` / `JumpToStep` / `StopExecution`），
    /// 不是编辑器专用旁路，所以按出来的结果与 Web 指令驱动的结果一致。
    /// </summary>
    [CustomEditor(typeof(StepManager))]
    public class StepManagerEditor : UnityEditor.Editor
    {
        public override void OnInspectorGUI()
        {
            DrawDefaultInspector();

            var manager = (StepManager)target;

            EditorGUILayout.Space();
            EditorGUILayout.LabelField("运行时", EditorStyles.boldLabel);

            if (!Application.isPlaying)
            {
                EditorGUILayout.HelpBox("进 Play 后可在这里看进度并手动驱动步骤（编辑器不跑步骤推进）。", MessageType.Info);
                return;
            }

            EditorGUILayout.LabelField(
                "进度",
                $"{manager.ProcessCount} 个进程 / {manager.TotalStepCount} 步");
            EditorGUILayout.LabelField(
                "当前",
                $"P{Mathf.Max(0, manager.ProcessIndex)}S{Mathf.Max(0, manager.StepIndex)}" +
                $"（扁平 {Mathf.Max(0, manager.FlatStepIndex)}）");
            EditorGUILayout.LabelField("步骤", manager.CurrentStep != null ? manager.CurrentStep.Path : "（无）");
            EditorGUILayout.LabelField(
                "条件",
                manager.CurrentStep != null ? manager.CurrentStep.ConditionType.ToString() : "（无）");
            EditorGUILayout.LabelField("状态", manager.IsFinished ? "已完成" : (manager.IsRunning ? "推进中" : "空闲"));

            using (new EditorGUILayout.HorizontalScope())
            {
                if (GUILayout.Button("开始执行"))
                {
                    manager.StartExecution();
                }
                if (GUILayout.Button("下一步"))
                {
                    manager.NextStep();
                }
                if (GUILayout.Button("上一步"))
                {
                    manager.PrevStep();
                }
            }

            using (new EditorGUILayout.HorizontalScope())
            {
                if (GUILayout.Button("跳到 P0S0"))
                {
                    manager.JumpToStep(0, 0);
                }
                if (GUILayout.Button("重新收集"))
                {
                    manager.Collect();
                }
                if (GUILayout.Button("停止并归位"))
                {
                    manager.StopExecution();
                }
            }

            Repaint(); // 播放中让进度持续刷新
        }
    }
}
