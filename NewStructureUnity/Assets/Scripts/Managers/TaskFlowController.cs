using System.Collections;
using UnityEngine;
using WSU3.Contracts;
using WSU3.Contracts.Events;
using WSU3.Core.Interactive;
using WSU3.Web;

namespace WSU3.Managers
{
    /// <summary>
    /// 任务编排：把"Web 的指令"翻译成"Unity 的动作序列"，并把结果报回 Web。
    ///
    /// 依据：docs/design/09 §3/§4（启动链、两条就绪）、§6（输入开关）、§5（可见性）；
    /// 消息清单见契约 `BridgeMessageType`（DEC-85）。
    ///
    /// 本类**只做编排与状态**，不碰资源细节：
    ///   · "卸旧项目的资源包 / 装新项目的资源包"这两步由 P2-6 的包管理器接管
    ///     （现在报一条**非致命**错误码 9001 说明"尚未实现"，好让 Web 侧的整条流先能联调）；
    ///   · 场景摆放见 <see cref="Ensure"/>：运行时自建常驻对象，不依赖场景里手工挂载。
    ///
    /// 说话顺序（每个任务）：`assets:ready` → `unity:progress`×N → `scene:ready`；
    /// 退出：卸包清理 → `scene:exited`（**实例不销毁**，DEC-81）。
    /// </summary>
    [DisallowMultipleComponent]
    public class TaskFlowController : MonoBehaviour
    {
        /// <summary>内容资源装载/装配尚未实现（P2-6）时的占位错误码。`fatal=false`，Web 可只做提示。</summary>
        public const int ErrorContentFlowNotImplemented = 9001;

        private static TaskFlowController s_Instance;

        /// <summary>取常驻编排对象；不存在就建一个（`DontDestroyOnLoad`）。</summary>
        public static TaskFlowController Ensure()
        {
            if (s_Instance != null) return s_Instance;
            var go = new GameObject("TaskFlow (runtime)");
            DontDestroyOnLoad(go);
            s_Instance = go.AddComponent<TaskFlowController>();
            return s_Instance;
        }

        /// <summary>当前已进入的任务类型；待命时为 <see cref="TaskType.None"/>。</summary>
        public TaskType CurrentTaskType { get; private set; } = TaskType.None;

        /// <summary>已接受但尚未进入的预装任务（`preload:task` 的结果）。</summary>
        public TaskType? PendingPreload { get; private set; }

        /// <summary>是否有一次进入/退出正在进行（并发指令会被忽略并告警）。</summary>
        public bool Busy { get; private set; }

        private string s_Locale = "zh-CN";
        private string s_QualityProfile = "high";

        private void Awake()
        {
            if (s_Instance == null) s_Instance = this;
        }

        private void OnEnable()
        {
            EventBus<AppInitEvent>.Subscribe(OnAppInit);
            EventBus<PreloadTaskRequestEvent>.Subscribe(OnPreloadTask);
            EventBus<PreloadCancelRequestEvent>.Subscribe(OnPreloadCancel);
            EventBus<SceneEnterRequestEvent>.Subscribe(OnSceneEnter);
            EventBus<SceneExitRequestEvent>.Subscribe(OnSceneExit);
            EventBus<ViewFocusRequestEvent>.Subscribe(OnViewFocus);
            EventBus<LocaleChangeRequestEvent>.Subscribe(OnLocaleChange);
            EventBus<QualityChangeRequestEvent>.Subscribe(OnQualityChange);
            EventBus<InputEnableEvent>.Subscribe(OnInputEnable);
            EventBus<RuntimeResumeEvent>.Subscribe(OnRuntimeResume);
            EventBus<DebugPingEvent>.Subscribe(OnDebugPing);
        }

        private void OnDisable()
        {
            EventBus<AppInitEvent>.Unsubscribe(OnAppInit);
            EventBus<PreloadTaskRequestEvent>.Unsubscribe(OnPreloadTask);
            EventBus<PreloadCancelRequestEvent>.Unsubscribe(OnPreloadCancel);
            EventBus<SceneEnterRequestEvent>.Unsubscribe(OnSceneEnter);
            EventBus<SceneExitRequestEvent>.Unsubscribe(OnSceneExit);
            EventBus<ViewFocusRequestEvent>.Unsubscribe(OnViewFocus);
            EventBus<LocaleChangeRequestEvent>.Unsubscribe(OnLocaleChange);
            EventBus<QualityChangeRequestEvent>.Unsubscribe(OnQualityChange);
            EventBus<InputEnableEvent>.Unsubscribe(OnInputEnable);
            EventBus<RuntimeResumeEvent>.Unsubscribe(OnRuntimeResume);
            EventBus<DebugPingEvent>.Unsubscribe(OnDebugPing);
        }

        private void OnDestroy()
        {
            if (s_Instance == this) s_Instance = null;
        }

        // ── Web → Unity 的落地 ────────────────────────────────────────────

        private void OnAppInit(AppInitEvent e)
        {
            s_Locale = e.Locale;
            s_QualityProfile = e.QualityProfile;
            Debug.Log($"[TaskFlow] app:init → locale={e.Locale}, quality={e.QualityProfile}, protocol={e.ProtocolVersion}");

            // 画质落到 Unity：本期只做记录（真正的降质在图形设置落地时接，见 PLAN P2-6）
            // 语言：Unity 侧不做界面（DEC-80），这里只记录，供三维内的引线/标注文案使用
        }

        private void OnPreloadTask(PreloadTaskRequestEvent e)
        {
            PendingPreload = e.TaskType;
            Debug.Log($"[TaskFlow] preload:task → {e.TaskType}（资源包预装在 P2-6 落地后生效）");
        }

        private void OnPreloadCancel(PreloadCancelRequestEvent e)
        {
            if (PendingPreload == e.TaskType)
            {
                PendingPreload = null;
                Debug.Log($"[TaskFlow] preload:cancel → {e.TaskType}");
            }
        }

        private void OnSceneEnter(SceneEnterRequestEvent e)
        {
            if (Busy)
            {
                Debug.LogWarning($"[TaskFlow] 正在忙，忽略 scene:enter（{e.TaskType}）。");
                return;
            }
            StartCoroutine(EnterRoutine(e));
        }

        private void OnSceneExit(SceneExitRequestEvent e)
        {
            if (Busy)
            {
                Debug.LogWarning("[TaskFlow] 正在忙，忽略 scene:exit。");
                return;
            }
            StartCoroutine(ExitRoutine());
        }

        private void OnViewFocus(ViewFocusRequestEvent e)
        {
            Debug.Log($"[TaskFlow] view:focus → {e.ObjectKey}（聚焦在 P2-6 落地后生效）");
        }

        private void OnLocaleChange(LocaleChangeRequestEvent e)
        {
            s_Locale = e.Locale;
        }

        private void OnQualityChange(QualityChangeRequestEvent e)
        {
            s_QualityProfile = e.QualityProfile;
        }

        private void OnInputEnable(InputEnableEvent e)
        {
            InputGate.Enabled = e.Enabled;
            Debug.Log($"[TaskFlow] input:enable → {e.Enabled}");
        }

        private void OnRuntimeResume(RuntimeResumeEvent e)
        {
            // 容器重新可见：恢复交互（渲染循环本来就没停）
            InputGate.Visible = true;
            InputGate.Enabled = true;
            Debug.Log("[TaskFlow] runtime:resume → 恢复交互");
        }

        private void OnDebugPing(DebugPingEvent e)
        {
            // 回包已在桥里完成（成对处理）；这里只留一条日志便于排查
            Debug.Log($"[TaskFlow] debug:ping at={e.At}");
        }

        // ── 动作序列 ──────────────────────────────────────────────────────

        private IEnumerator EnterRoutine(SceneEnterRequestEvent request)
        {
            Busy = true;
            TaskType target = request.TaskType;

            // 切任务 = 先退旧的，再进新的（同一个实例，不重建，DEC-81）
            if (CurrentTaskType != TaskType.None)
            {
                yield return ExitRoutineCore();
            }

            Debug.Log($"[TaskFlow] scene:enter → {target}（projectId={request.ProjectId}, version={request.ContentVersion}）");

            // ① 装载项目资源包 —— P2-6 未实现，先报非致命错误让联调继续
            WebBridge.ReportError(
                ErrorContentFlowNotImplemented,
                $"内容资源包装载尚未实现（{target} / projectId={request.ProjectId}）；见 docs/PLAN.md P2-6。",
                false);
            PendingPreload = null;
            yield return null;

            // ② 资产就绪：Web 可以开始渲染该任务的界面（DEC-84）
            WebBridge.AssetsReady(target);

            // ③ 装配 —— 同样等 P2-6；进度先按"两段"的后半段报
            WebBridge.SceneProgress(0.5f);
            yield return null;
            WebBridge.SceneProgress(1f);
            yield return null;

            CurrentTaskType = target;
            WebBridge.SceneReady(target);
            Debug.Log($"[TaskFlow] {target} 已就绪（可交互）。");
            Busy = false;
        }

        private IEnumerator ExitRoutine()
        {
            Busy = true;
            yield return ExitRoutineCore();
            Busy = false;
        }

        /// <summary>退出的公共部分：卸包清理 → 报 `scene:exited`。调用方负责 <see cref="Busy"/>。</summary>
        private IEnumerator ExitRoutineCore()
        {
            TaskType exiting = CurrentTaskType;
            if (exiting == TaskType.None)
            {
                WebBridge.SceneExited(TaskType.None);
                yield break;
            }

            Debug.Log($"[TaskFlow] 退出 {exiting}：卸包清理（P2-6 落地后生效）。");
            yield return null; // 预留：等包管理器卸载完成

            CurrentTaskType = TaskType.None;
            WebBridge.SceneExited(exiting);
        }
    }
}
