using System;
using UnityEngine;
using WSU3.Contracts;
using WSU3.Contracts.Events;

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

        private void Start()
        {
            if (handshakeOnStart) WebChannel.Ready();
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
