using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using WSU3.Contracts;
using WSU3.Contracts.Events;
using WSU3.Core.Interactive;
using WSU3.Core.Managers.TaskManager;

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
    ///   · "卸旧 clip 的资源包 / 装新 clip 的资源包"交给 <see cref="AddressableManager"/>（DEC-87 纪律①）；
    ///     **装配**按 TaskType 分派给任务管理器（`Core/Managers/TaskManager/`）；
    ///   · 真正上网的是 Runtime 的桥：本类只 `Publish` 意图事件（`TaskAssetsReadyEvent` 等）。
    ///
    /// 说话顺序（每个任务）：`assets:ready` → `unity:progress`×N → `scene:ready`；
    /// 退出：销毁任务实例 → 卸包清理 → `scene:exited`（**引擎实例不销毁**，DEC-81）。
    ///
    /// 两条失败口径（不要混）：
    ///   · **装包失败**（9002，`fatal=true`）：本次进入中止，**不发** `scene:ready` —— 界面不能以为能交互；
    ///   · **登记表里没有该 clip 的包**（9001，`fatal=false`）：只提示、仍走到 `scene:ready`，
    ///     好让 Web 侧整条流先能联调（内容包还没打过时就是这个状态）。
    /// </summary>
    public class TaskFlowManager : FunctionManagerBase
    {
        /// <summary>包登记表里没有该 clip 的包时的**非致命**提示码（内容包还没打过 / projectId 与登记表对不上）。</summary>
        public const int ErrorContentFlowNotImplemented = 9001;

        /// <summary>装包失败（下载失败 / 解包失败 / 半装）的**致命**错误码：本次进入没有完成，不要显示"就绪"。</summary>
        public const int ErrorContentPackLoadFailed = 9002;

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
            string clipId = request.ProjectId;

            // 切任务 = 先退旧的，再进新的（同一个实例，不重建，DEC-81）
            if (CurrentTaskType != TaskType.None)
            {
                yield return ExitRoutineCore();
            }

            Debug.Log($"[TaskFlow] scene:enter → {target}（projectId={request.ProjectId}, version={request.ContentVersion}）");

            // 颜色相机后处理按任务类型定：**结构任务必须关**（后处理会把 alpha 写死 1，画布就透不了）。
            // 关的是**颜色相机**（渲染进 Color.renderTexture 的那台 = 颜色路），不是主相机 ——
            // 规定与原因见 CameraManager.ApplyPostProcessingPolicy / docs/design/13 §4.4。
            GlobalManager.CameraManager.ApplyPostProcessingPolicy(target);

            // ① 装载项目资源包：一个 clip 一个内容包（DEC-87 纪律①）
            bool packReady = false;

            if (!string.IsNullOrEmpty(clipId) && GlobalManager.AddressableManager.HasClip(clipId))
            {
                bool ok = false;
                string reason = null;
                yield return GlobalManager.AddressableManager.LoadClipRoutine(
                    clipId, (success, why) => { ok = success; reason = why; });

                if (!ok)
                {
                    // WHY: 装包失败**不能**继续走到 scene:ready —— 界面会以为可交互，点下去却是空的。
                    //      "半装的包"比"没装"更危险，所以这里明确中止并如实回报原因。
                    EventBus<BridgeErrorEvent>.Publish(new BridgeErrorEvent
                    {
                        Code = ErrorContentPackLoadFailed,
                        Message = reason,
                        Fatal = true,
                    });
                    Debug.LogError($"[TaskFlow] 装包失败，本次进入 {target} 中止：{reason}");
                    Busy = false;
                    yield break;
                }

                packReady = true;
            }
            else
            {
                // 登记表里没有该 clip 的包（内容包还没打过，或 projectId 与登记表对不上）——
                // 发一条**非致命**提示，仍让整条流走到 scene:ready（Web 侧联调不受影响），
                // 但"没有内容包"这件事必须写在显眼处。
                EventBus<BridgeErrorEvent>.Publish(new BridgeErrorEvent
                {
                    Code = ErrorContentFlowNotImplemented,
                    Message = $"包登记表里没有 clip '{clipId}' 的资源包（{target}）—— " +
                              "先跑菜单 WSU3/Pack/一键打 AA 包（全部）生成包与登记表；见 docs/design/12。",
                    Fatal = false,
                });
            }

            PendingPreload = null;
            yield return null;

            // ② 资产就绪：Web 可以开始渲染该任务的界面（DEC-84）
            EventBus<TaskAssetsReadyEvent>.Publish(new TaskAssetsReadyEvent { TaskType = target });

            // ③ 装配 —— 进度按两段里的后半段报（docs/design/09 §7）
            GlobalManager.SetCurrentTask(clipId, target);
            EventBus<SceneProgressEvent>.Publish(new SceneProgressEvent { Progress = 0.5f });

            yield return packReady ? AssemblyRoutine(target, clipId) : null;

            EventBus<SceneProgressEvent>.Publish(new SceneProgressEvent { Progress = 1f });
            yield return null;

            CurrentTaskType = target;
            EventBus<TaskSceneReadyEvent>.Publish(new TaskSceneReadyEvent { TaskType = target });
            Debug.Log($"[TaskFlow] {target} 已就绪（可交互）。");
            Busy = false;
        }

        /// <summary>
        /// 按任务类型分派装配。
        ///
        /// 当前只有结构任务（<see cref="TaskType.Structure"/> = 8）有装配链路；
        /// 其余 Unity 类任务（电路连接 / 仿真实验 / 检测）的三维装配还没做（docs/PLAN.md P2-6 / P2-8）——
        /// 这里**只如实记一条日志**，不假装装配过（资源包已经装好，界面照常渲染）。
        /// </summary>
        private IEnumerator AssemblyRoutine(TaskType target, string clipId)
        {
            switch (target)
            {
                case TaskType.Structure:
                    // WHY: 任务管理器是**场景里的节点**，没摆就是 null —— 必须报"没进场景"，
                    //      而不是吞掉它（否则表现是"包装好了、画面什么都没变"，最难查的一类）。
                    StructureTaskManager structure = StructureTaskManager.Instance;
                    if (structure == null)
                    {
                        Debug.LogError("[TaskFlow] 内容场景里没有 StructureTaskManager 节点，结构任务无法装配" +
                                       "（应在 1_Content 下）。");
                        yield break;
                    }
                    yield return structure.StartTaskRoutine(clipId);
                    break;

                default:
                    Debug.Log($"[TaskFlow] {target} 的装配尚未实现（本工程当前只有结构任务的装配链路）；" +
                              "资源包已装好，界面可以照常渲染。见 docs/PLAN.md P2-6 / P2-8。");
                    yield return null;
                    break;
            }
        }

        private IEnumerator ExitRoutine()
        {
            Busy = true;
            yield return ExitRoutineCore();
            Busy = false;
        }

        /// <summary>退出的公共部分：销毁任务实例 → 卸包清理 → 报 `scene:exited`。调用方负责 <see cref="Busy"/>。</summary>
        private IEnumerator ExitRoutineCore()
        {
            TaskType exiting = CurrentTaskType;
            if (exiting == TaskType.None)
            {
                EventBus<TaskExitedEvent>.Publish(new TaskExitedEvent { TaskType = TaskType.None });
                yield break;
            }

            // 退出即回默认（颜色相机后处理回到预制体原值）—— 结构任务那次"关"只属于结构任务
            GlobalManager.CameraManager.ApplyPostProcessingPolicy(TaskType.None);

            // ① 先销毁本次任务装配出来的实例 —— **顺序不能反**：先卸包会让存活实例的材质引用到已释放资源（变粉，DEC-87 纪律②）
            StructureTaskManager structure = StructureTaskManager.Instance;
            if (structure != null) structure.StopTask();

            // ② 再卸资源包（纪律①：切任务 = 卸旧 clip 的包 + 装新 clip 的包）
            string clipId = GlobalManager.CurrentClipId;
            int invalidated = GlobalManager.AddressableManager.UnloadClip(clipId);
            GlobalManager.SetCurrentTask(null, TaskType.None);

            Debug.Log($"[TaskFlow] 退出 {exiting}：已卸包（clip={clipId ?? "（无）"}，失效缓存 {invalidated} 条）");
            yield return null; // 留给后续可能出现的其他任务级清理

            CurrentTaskType = TaskType.None;
            EventBus<TaskExitedEvent>.Publish(new TaskExitedEvent { TaskType = exiting });
        }
    }
}
