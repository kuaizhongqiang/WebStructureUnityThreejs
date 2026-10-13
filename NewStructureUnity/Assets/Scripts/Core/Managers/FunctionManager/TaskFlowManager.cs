using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using WSU3.Contracts;
using WSU3.Contracts.Events;
using WSU3.Core.Interactive;

namespace WSU3.Core.Managers.FunctionManager
{
    /// <summary>
    /// 任务流程管理器：把"Web 的指令"翻译成"Unity 的动作序列"，并把结果以**意图事件**报回。
    ///
    /// 依据：docs/design/09 §3/§4（启动链、两条就绪）、§6（输入开关）、§5（可见性）；消息清单见契约 `BridgeMessageType`。
    /// 由 <see cref="GlobalManager"/> 持有并驱动（`Init` 订阅 + `CoreUpdate` 推进），**不是 MonoBehaviour**。
    ///
    /// 分层：
    ///   · 本类只管**时机与状态**（谁先谁后、忙不忙），不碰资源细节；
    ///   · "卸旧项目的资源包 / 装新项目的资源包"由 P2-6 的包管理器接管
    ///     —— 现在发一条**非致命**错误码 9001 说明"尚未实现"，好让 Web 侧整条流先能联调；
    ///   · 真正上网的是 Runtime 的桥：本类只 `Publish` 意图事件（`TaskAssetsReadyEvent` 等）。
    ///
    /// 说话顺序（每个任务）：`assets:ready` → `unity:progress`×N → `scene:ready`；
    /// 退出：卸包清理 → `scene:exited`（**实例不销毁**，DEC-81）。
    /// </summary>
    public class TaskFlowManager : FunctionManagerBase
    {
        /// <summary>内容资源装载/装配尚未实现（P2-6）时的占位错误码。`fatal=false`，Web 可只做提示。</summary>
        public const int ErrorContentFlowNotImplemented = 9001;

        /// <summary>当前已进入的任务类型；待命时为 <see cref="TaskType.None"/>。</summary>
        public TaskType CurrentTaskType { get; private set; } = TaskType.None;

        /// <summary>已接受但尚未进入的预装任务（`preload:task` 的结果）。</summary>
        public TaskType? PendingPreload { get; private set; }

        /// <summary>是否有一次进入/退出正在进行（并发指令会被忽略并告警）。</summary>
        public bool Busy { get; private set; }

        private string locale = "zh-CN";
        private string qualityProfile = "high";

        /// <summary>协程栈：支持 `yield return 另一个 IEnumerator` 的嵌套写法（自驱小泵，不依赖 MonoBehaviour）。</summary>
        private readonly Stack<IEnumerator> routines = new Stack<IEnumerator>();

        // ── 生命周期（由 GlobalManager 驱动）──────────────────────────────

        public override void Init(Action isInitComplete = null)
        {
            EventBus<AppInitEvent>.Subscribe(OnAppInit);
            EventBus<PreloadTaskRequestEvent>.Subscribe(OnPreloadTask);
            EventBus<PreloadCancelRequestEvent>.Subscribe(OnPreloadCancel);
            EventBus<SceneEnterRequestEvent>.Subscribe(OnSceneEnter);
            EventBus<SceneExitRequestEvent>.Subscribe(OnSceneExit);
            EventBus<LocaleChangeRequestEvent>.Subscribe(OnLocaleChange);
            EventBus<QualityChangeRequestEvent>.Subscribe(OnQualityChange);
            EventBus<InputEnableEvent>.Subscribe(OnInputEnable);
            EventBus<RuntimeResumeEvent>.Subscribe(OnRuntimeResume);
            EventBus<DebugPingEvent>.Subscribe(OnDebugPing);

            isInit = true;
            isInitComplete?.Invoke();
        }

        public override void OnDespose()
        {
            EventBus<AppInitEvent>.Unsubscribe(OnAppInit);
            EventBus<PreloadTaskRequestEvent>.Unsubscribe(OnPreloadTask);
            EventBus<PreloadCancelRequestEvent>.Unsubscribe(OnPreloadCancel);
            EventBus<SceneEnterRequestEvent>.Unsubscribe(OnSceneEnter);
            EventBus<SceneExitRequestEvent>.Unsubscribe(OnSceneExit);
            EventBus<LocaleChangeRequestEvent>.Unsubscribe(OnLocaleChange);
            EventBus<QualityChangeRequestEvent>.Unsubscribe(OnQualityChange);
            EventBus<InputEnableEvent>.Unsubscribe(OnInputEnable);
            EventBus<RuntimeResumeEvent>.Unsubscribe(OnRuntimeResume);
            EventBus<DebugPingEvent>.Unsubscribe(OnDebugPing);
            routines.Clear();
        }

        /// <summary>由 <see cref="GlobalManager"/> 的 Update 驱动：推进内部协程。</summary>
        public void CoreUpdate()
        {
            while (routines.Count > 0)
            {
                IEnumerator top = routines.Peek();
                if (!top.MoveNext())
                {
                    routines.Pop();
                    continue;
                }
                if (top.Current is IEnumerator nested)
                {
                    routines.Push(nested); // 同一帧进入嵌套协程
                    continue;
                }
                return; // `yield return null` 之类：本帧到此为止
            }
        }

        // ── Web → Unity 的落地 ────────────────────────────────────────────

        private void OnAppInit(AppInitEvent e)
        {
            locale = e.Locale;
            qualityProfile = e.QualityProfile;
            Debug.Log($"[TaskFlow] app:init → locale={e.Locale}, quality={e.QualityProfile}, protocol={e.ProtocolVersion}");
            // 画质真正的降质在图形设置落地时接；语言只影响三维内的引线/标注文案（界面在 Web）
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
            routines.Push(EnterRoutine(e));
        }

        private void OnSceneExit(SceneExitRequestEvent e)
        {
            if (Busy)
            {
                Debug.LogWarning("[TaskFlow] 正在忙，忽略 scene:exit。");
                return;
            }
            routines.Push(ExitRoutine());
        }

        private void OnLocaleChange(LocaleChangeRequestEvent e)
        {
            locale = e.Locale;
        }

        private void OnQualityChange(QualityChangeRequestEvent e)
        {
            qualityProfile = e.QualityProfile;
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
            // 回包在桥里成对完成；这里只留一条日志便于排查
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

            // ① 装载项目资源包 —— P2-6 未实现，先发一条非致命错误让联调继续
            EventBus<BridgeErrorEvent>.Publish(new BridgeErrorEvent
            {
                Code = ErrorContentFlowNotImplemented,
                Message = $"内容资源包装载尚未实现（{target} / projectId={request.ProjectId}）；见 docs/PLAN.md P2-6。",
                Fatal = false,
            });
            PendingPreload = null;
            yield return null;

            // ② 资产就绪：Web 可以开始渲染该任务的界面（DEC-84）
            EventBus<TaskAssetsReadyEvent>.Publish(new TaskAssetsReadyEvent { TaskType = target });

            // ③ 装配 —— 同样等 P2-6；进度先按"两段"的后半段报
            EventBus<SceneProgressEvent>.Publish(new SceneProgressEvent { Progress = 0.5f });
            yield return null;
            EventBus<SceneProgressEvent>.Publish(new SceneProgressEvent { Progress = 1f });
            yield return null;

            CurrentTaskType = target;
            EventBus<TaskSceneReadyEvent>.Publish(new TaskSceneReadyEvent { TaskType = target });
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
                EventBus<TaskExitedEvent>.Publish(new TaskExitedEvent { TaskType = TaskType.None });
                yield break;
            }

            Debug.Log($"[TaskFlow] 退出 {exiting}：卸包清理（P2-6 落地后生效）。");
            yield return null; // 预留：等包管理器卸载完成

            CurrentTaskType = TaskType.None;
            EventBus<TaskExitedEvent>.Publish(new TaskExitedEvent { TaskType = exiting });
        }
    }
}
