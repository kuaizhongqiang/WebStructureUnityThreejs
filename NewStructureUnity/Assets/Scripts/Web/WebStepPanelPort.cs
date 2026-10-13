using System;
using UnityEngine;
using WSU3.Contracts.Events;
using WSU3.Core.Managers;
using WSU3.Core.Models;
using WSU3.Core.Steps;

namespace WSU3.Web
{
    /// <summary>
    /// 教学面板端口的**桥实现**：`StepPanelPort` 的请求 → `ui:request` 出站；Web 回 `ui:result` → 回调。
    ///
    /// 为什么需要它：教学界面在 DOM 层（DEC-16），Core 又不许引用 Runtime 的桥，
    /// 于是 Core 只认 `IStepPanelPort`，由本类在 Runtime 侧把两端接起来（见 `docs/design/10-step-system.md`）。
    ///
    /// 一次只允许一个"等结果"的请求：步骤是串行的，界面也一次只该弹一块面板。
    /// 订阅与退订**成对**写在同一对方法里（`BeginPending` / `OnUiResult`）——
    /// 非 MonoBehaviour 没有 `OnDestroy` 兜底，分开写就是漏退订。
    /// </summary>
    public class WebStepPanelPort : IStepPanelPort
    {
        private string pendingKind;
        private Action<StepPanelResult> pendingCallback;

        /// <summary>是否有正在等回执的面板请求（诊断用）。</summary>
        public bool HasPending => pendingCallback != null;

        /// <summary>
        /// 当前环境有没有"页面桥"可指望：只有 WebGL 构建里才有页面（编辑器 / 独立播放器都没有）。
        /// 没有页面时请求必然石沉大海，**当场按 unavailable 降级**并告警 ——
        /// 在编辑器里调一个 UI 步骤时，最不该发生的就是"点不动、也没有报错"。
        /// </summary>
        private static bool HasPageBridge => Application.platform == RuntimePlatform.WebGLPlayer;

        public void ShowTip(string tipsKey)
        {
            // 提示条"发出去就不管"：它不占用 pending，也不影响流程（关不关都能往下走）
            if (string.IsNullOrEmpty(tipsKey)) return;
            if (!HasPageBridge) return;

            WebBridge.UiRequest(UiPanelKind.Tips, tipsKey);
        }

        public void ShowUi(string uiId, Action<StepPanelResult> onClosed)
        {
            if (!HasPageBridge)
            {
                Degrade(UiPanelKind.Ui, uiId, onClosed);
                return;
            }

            BeginPending(UiPanelKind.Ui, uiId, onClosed, null);
        }

        public void ShowQuestion(string questionId, Action<StepPanelResult> onAnswered)
        {
            if (!HasPageBridge)
            {
                Degrade(UiPanelKind.Question, questionId, onAnswered);
                return;
            }

            BeginPending(UiPanelKind.Question, questionId, onAnswered, BuildQuestionBody(questionId));
        }

        public void CloseTopPanel()
        {
            if (pendingKind == null && pendingCallback == null) return;

            // 收尾：迟到的回执不该打到下一步身上
            EndPending();
        }

        /// <summary>
        /// 桥停用时必须调：本对象在静态 `EventBus` 上挂着订阅，
        /// 不主动退订就会留下一条指向"死端口 → 已卸载的步骤树"的订阅（泄漏 + 幽灵回调）。
        /// </summary>
        public void Dispose()
        {
            EndPending();
        }

        private static void Degrade(string kind, string refId, Action<StepPanelResult> callback)
        {
            Debug.LogWarning(
                $"[WebStepPanel] 当前不是 WebGL 运行环境（没有页面桥），{kind} 面板（refId={refId}）" +
                "按 unavailable 降级放行 —— 面板要在 WebGL 构建里、由页面来答。");
            callback?.Invoke(StepPanelResult.Unavailable);
        }

        private void BeginPending(string kind, string refId, Action<StepPanelResult> callback, UiRequestBody body)
        {
            if (pendingCallback != null)
            {
                Debug.LogWarning($"[WebStepPanel] 上一个 {pendingKind} 面板还没回执，就来了新的 {kind}；旧的已丢弃。");
                EndPending();
            }

            pendingKind = kind;
            pendingCallback = callback;

            EventBus<UiResultEvent>.Subscribe(OnUiResult);
            WebBridge.UiRequest(kind, refId, body);

            Debug.Log($"[WebStepPanel] ui:request → {kind}（refId={refId}）");
        }

        private void OnUiResult(UiResultEvent e)
        {
            if (e == null || pendingCallback == null) return;
            if (!string.Equals(e.Kind, pendingKind, StringComparison.Ordinal))
            {
                Debug.LogWarning($"[WebStepPanel] 收到 {e.Kind} 的回执，但当前等的是 {pendingKind}，已忽略。");
                return;
            }

            Action<StepPanelResult> callback = pendingCallback;
            StepPanelResult result = ToResult(e.Result);
            EndPending();

            Debug.Log($"[WebStepPanel] ← ui:result {e.Kind}: {result}");
            callback?.Invoke(result);
        }

        private void EndPending()
        {
            pendingKind = null;
            pendingCallback = null;
            EventBus<UiResultEvent>.Unsubscribe(OnUiResult);
        }

        private static StepPanelResult ToResult(string result)
        {
            switch (result)
            {
                case UiResultKind.Success:
                    return StepPanelResult.Success;
                case UiResultKind.Failed:
                    return StepPanelResult.Failed;
                case UiResultKind.Unavailable:
                    return StepPanelResult.Unavailable;
                default:
                    Debug.LogWarning($"[WebStepPanel] 不认识的 ui:result '{result}'，按 unavailable（降级）处理。");
                    return StepPanelResult.Unavailable;
            }
        }

        /// <summary>
        /// 从题库取"展示用"字段拼载荷。**不把答案发出去**：判定留在界面层（它持有同一份题库）。
        /// 题库里找不到就退回"只发 questionId"，让 Web 自己取 —— 面板能不能弹由 Web 决定。
        /// </summary>
        private static UiRequestBody BuildQuestionBody(string questionId)
        {
            QuestionClip clip = GlobalManager.Exists ? GlobalManager.GetQuestionClip(questionId) : null;
            if (clip == null)
            {
                Debug.LogWarning($"[WebStepPanel] 题库里没有 '{questionId}'，只发 questionId 由 Web 侧自行取题。");
                return null;
            }

            string[] options = new string[clip.options.Count];
            for (int i = 0; i < clip.options.Count; i++)
            {
                options[i] = clip.options[i].option;
            }

            return new UiRequestBody
            {
                title = string.IsNullOrEmpty(clip.displayName) ? clip.name : clip.displayName,
                content = clip.question,
                questionType = clip.questionType.ToString(),
                options = options,
                tips = clip.tips,
            };
        }
    }
}
