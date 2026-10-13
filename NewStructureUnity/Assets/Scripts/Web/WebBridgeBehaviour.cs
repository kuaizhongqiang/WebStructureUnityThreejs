using System;
using UnityEngine;
using WSU3.Contracts;
using WSU3.Contracts.Events;
using WSU3.Core.Interactive;

namespace WSU3.Web
{
    /// <summary>
    /// Unity 侧的桥接收端。
    ///
    /// **硬约定**（与 Web 侧 `web/src/unity/UnityBridge.ts` 对齐，改名即断链）：
    ///   · 本组件必须挂在**名叫 `WebBridge` 的 GameObject** 上；
    ///   · 收消息的方法是 <c>OnWebMessage(string)</c>（Unity 官方 <c>SendMessage</c> 只认字符串参数）；
    ///   · 发消息走 <see cref="WebChannel"/>（`.jslib` → `window.__WSU3_BRIDGE__`）。
    ///
    /// 职责边界：**本类只做"信封 → 事件"**，不装配场景、不管资源包。
    /// 业务侧只订阅 <c>EventBus&lt;T&gt;</c>，不解析 JSON、不记字符串常量（清单见契约 `BridgeMessageType`）。
    ///
    /// 依据：docs/design/02-bridge-protocol.md、docs/design/09-startup-orchestration.md。
    /// </summary>
    [DisallowMultipleComponent]
    public class WebBridgeBehaviour : MonoBehaviour
    {
        [Tooltip("收到的原始消息是否打到 Console（排查协议问题时打开；正常运行时关掉）")]
        [SerializeField] private bool logIncoming;

        // 默认**不发**：真正"就绪"的时刻是"管理器自检通过、已停在内容场景待命"（见 StartupFlow），
        // 而不是本组件 Start 的那一帧。`WebChannel.Ready()` 是幂等的，两边都调用也只会发一次。
        [Tooltip("本组件 Start 时就发握手（unity:ready）。默认关闭，改由 StartupFlow 在自检通过时发。")]
        [SerializeField] private bool handshakeOnStart;

        /// <summary>
        /// 桥必须**活过** `0_Setup → 1_Content` 的 single 切换 —— 否则场景一切，接消息的物体就没了，
        /// Web 发来的消息从此石沉大海（Play 验收实测踩到过：切场景后 `WebBridge` 直接查不到）。
        ///
        /// 两种摆放都支持：
        ///   · 放在 `Manager` 下（`GlobalManager` 已 `DontDestroyOnLoad`，子树一起常驻）—— 推荐，也是当前场景的摆法；
        ///   · 作为根物体时，这里自己标记常驻（只有根物体能标，子物体会报错，所以先判 parent）。
        /// </summary>
        /// <summary>
        /// 桥是否活着。它的实战用途：启动流程切完场景后要自检一次 ——
        /// 若桥跟着 `0_Setup` 被卸掉了，Web 发来的消息会**从此无人接收**，而画面看起来一切正常。
        /// </summary>
        public static bool IsAlive { get; private set; }

        private void Awake()
        {
            IsAlive = true;
            if (transform.parent == null) DontDestroyOnLoad(gameObject);
        }

        private void OnDestroy()
        {
            IsAlive = false;
        }

        private void Start()
        {
            if (handshakeOnStart) WebChannel.Ready();
        }

        // ── 出站：把 Core 的「意图事件」真正发上网 ─────────────────────────
        //
        // 分层约定：Core 的编排只管**发布意图**（TaskAssetsReadyEvent 等），
        // 因为 Core 不能引用 Runtime 的桥；把"意图 → 线上的 type"这一步留在桥里。

        private void OnEnable()
        {
            EventBus<TaskAssetsReadyEvent>.Subscribe(OnTaskAssetsReady);
            EventBus<TaskSceneReadyEvent>.Subscribe(OnTaskSceneReady);
            EventBus<TaskExitedEvent>.Subscribe(OnTaskExited);
            EventBus<SceneProgressEvent>.Subscribe(OnSceneProgress);
            EventBus<BridgeErrorEvent>.Subscribe(OnBridgeError);
            EventBus<GlobalInteractionEventData>.Subscribe(OnInteraction);
        }

        private void OnDisable()
        {
            EventBus<TaskAssetsReadyEvent>.Unsubscribe(OnTaskAssetsReady);
            EventBus<TaskSceneReadyEvent>.Unsubscribe(OnTaskSceneReady);
            EventBus<TaskExitedEvent>.Unsubscribe(OnTaskExited);
            EventBus<SceneProgressEvent>.Unsubscribe(OnSceneProgress);
            EventBus<BridgeErrorEvent>.Unsubscribe(OnBridgeError);
            EventBus<GlobalInteractionEventData>.Unsubscribe(OnInteraction);
        }

        private static void OnTaskAssetsReady(TaskAssetsReadyEvent e)
        {
            WebBridge.AssetsReady(e.TaskType);
        }

        private static void OnTaskSceneReady(TaskSceneReadyEvent e)
        {
            WebBridge.SceneReady(e.TaskType);
        }

        private static void OnTaskExited(TaskExitedEvent e)
        {
            WebBridge.SceneExited(e.TaskType);
        }

        private static void OnSceneProgress(SceneProgressEvent e)
        {
            WebBridge.SceneProgress(e.Progress);
        }

        private static void OnBridgeError(BridgeErrorEvent e)
        {
            WebBridge.ReportError(e.Code, e.Message, e.Fatal);
        }

        /// <summary>
        /// 交互单一出口的 **Web 上报**：只有"点中了物体"才报 `object:picked`。
        /// 「点空白」（`Target == null`）不上报 —— 那条语义 Web 侧自己就能感知（DOM 层本来就收得到）。
        /// </summary>
        private static void OnInteraction(GlobalInteractionEventData e)
        {
            if (e == null || e.Target == null) return;
            if (e.Type != GlobalInteractionType.Click) return;

            WebBridge.ObjectPicked(e.Target.ObjectKey);
        }

        /// <summary>由 Unity 官方 SendMessage 调用：一条完整信封 JSON。</summary>
        public void OnWebMessage(string json)
        {
            if (logIncoming) Debug.Log($"[WebBridge] ← {json}");

            if (!BridgeJson.TryParseEnvelope(json, out BridgeEnvelope envelope))
            {
                Debug.LogError($"[WebBridge] 收到的消息不是合法信封，已忽略：{json}");
                return;
            }

            if (envelope.Version != WebChannel.ProtocolVersion)
            {
                // 版本不符 ⇒ 明确报错，不静默降级（DEC-07）；错误码 1001 见 docs/design/02 §3.3
                string message =
                    $"协议版本不匹配：Unity={WebChannel.ProtocolVersion}，Web={envelope.Version}（type={envelope.Type}）";
                Debug.LogError($"[WebBridge] {message}");
                WebBridge.ReportError(1001, message, true);
                return;
            }

            Dispatch(envelope);
        }

        private void Dispatch(BridgeEnvelope envelope)
        {
            switch (envelope.Type)
            {
                case BridgeMessageType.AppInit:
                {
                    var p = BridgeJson.ParsePayload<AppInitPayload>(envelope.Payload);
                    if (p == null)
                    {
                        Debug.LogWarning("[WebBridge] app:init 载荷解析失败，已忽略。");
                        return;
                    }
                    EventBus<AppInitEvent>.Publish(new AppInitEvent
                    {
                        Locale = p.locale,
                        QualityProfile = p.qualityProfile,
                        ProtocolVersion = p.protocolVersion,
                    });
                    return;
                }

                case BridgeMessageType.PreloadTask:
                {
                    if (!TryReadTaskType(envelope, out TaskType taskType)) return;
                    EventBus<PreloadTaskRequestEvent>.Publish(new PreloadTaskRequestEvent { TaskType = taskType });
                    return;
                }

                case BridgeMessageType.PreloadCancel:
                {
                    if (!TryReadTaskType(envelope, out TaskType taskType)) return;
                    EventBus<PreloadCancelRequestEvent>.Publish(new PreloadCancelRequestEvent { TaskType = taskType });
                    return;
                }

                case BridgeMessageType.SceneEnter:
                {
                    var p = BridgeJson.ParsePayload<SceneEnterPayload>(envelope.Payload);
                    if (p == null)
                    {
                        Debug.LogWarning("[WebBridge] scene:enter 载荷解析失败，已忽略。");
                        return;
                    }
                    if (!TryConvertTaskType(p.taskType, envelope.Type, out TaskType taskType)) return;

                    EventBus<SceneEnterRequestEvent>.Publish(new SceneEnterRequestEvent
                    {
                        TaskType = taskType,
                        ProjectId = p.projectId,
                        ContentVersion = p.contentVersion,
                    });
                    return;
                }

                case BridgeMessageType.SceneExit:
                    EventBus<SceneExitRequestEvent>.Publish(new SceneExitRequestEvent());
                    return;

                case BridgeMessageType.ViewFocus:
                {
                    var p = BridgeJson.ParsePayload<ViewFocusPayload>(envelope.Payload);
                    if (p == null) return;
                    EventBus<ViewFocusRequestEvent>.Publish(new ViewFocusRequestEvent
                    {
                        ObjectKey = p.objectKey,
                        Animate = p.animate,
                    });
                    return;
                }

                case BridgeMessageType.UiSetLocale:
                {
                    var p = BridgeJson.ParsePayload<LocalePayload>(envelope.Payload);
                    if (p == null) return;
                    EventBus<LocaleChangeRequestEvent>.Publish(new LocaleChangeRequestEvent { Locale = p.locale });
                    return;
                }

                case BridgeMessageType.UiSetQuality:
                {
                    var p = BridgeJson.ParsePayload<QualityPayload>(envelope.Payload);
                    if (p == null) return;
                    EventBus<QualityChangeRequestEvent>.Publish(new QualityChangeRequestEvent
                    {
                        QualityProfile = p.qualityProfile,
                    });
                    return;
                }

                case BridgeMessageType.InputEnable:
                {
                    var p = BridgeJson.ParsePayload<InputEnablePayload>(envelope.Payload);
                    if (p == null) return;
                    EventBus<InputEnableEvent>.Publish(new InputEnableEvent { Enabled = p.enabled });
                    return;
                }

                case BridgeMessageType.RuntimeResume:
                    EventBus<RuntimeResumeEvent>.Publish(new RuntimeResumeEvent());
                    return;

                case BridgeMessageType.DebugPing:
                {
                    var p = BridgeJson.ParsePayload<PingPayload>(envelope.Payload);
                    long at = p?.at ?? 0L;
                    EventBus<DebugPingEvent>.Publish(new DebugPingEvent { At = at });
                    WebBridge.Pong(at); // 自检成对：收到就回，不需要业务参与
                    return;
                }

                default:
                    Debug.LogWarning(
                        $"[WebBridge] 未知消息类型 '{envelope.Type}'，已忽略。" +
                        "若这是刚新增的契约消息，请同批更新 BridgeMessageType.cs / bridge.ts / snapshot.json。");
                    return;
            }
        }

        private static bool TryReadTaskType(BridgeEnvelope envelope, out TaskType taskType)
        {
            var p = BridgeJson.ParsePayload<TaskRefPayload>(envelope.Payload);
            if (p == null)
            {
                Debug.LogWarning($"[WebBridge] {envelope.Type} 载荷解析失败，已忽略。");
                taskType = TaskType.None;
                return false;
            }
            return TryConvertTaskType(p.taskType, envelope.Type, out taskType);
        }

        /// <summary>契约值越界一律当"忽略 + 告警"处理，不抛异常。</summary>
        private static bool TryConvertTaskType(int raw, string messageType, out TaskType taskType)
        {
            taskType = (TaskType)raw;
            if (!Enum.IsDefined(typeof(TaskType), raw))
            {
                Debug.LogWarning($"[WebBridge] {messageType} 里的 taskType={raw} 不是合法枚举值，已忽略。");
                return false;
            }
            return true;
        }
    }
}
