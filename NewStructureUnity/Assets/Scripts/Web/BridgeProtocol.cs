using System;
using UnityEngine;
using WSU3.Contracts;

namespace WSU3.Web
{
    // ========================================================================
    // 一、Web → Unity 的载荷（JsonUtility 要求字段名与 JSON 逐字一致，故用 camelCase）
    // ========================================================================

    [Serializable]
    public class AppInitPayload
    {
        public string locale;
        public string qualityProfile;
        public int protocolVersion;
    }

    [Serializable]
    public class TaskRefPayload
    {
        public int taskType;
    }

    [Serializable]
    public class SceneEnterPayload
    {
        public int taskType;
        public string projectId;
        public string contentVersion;
    }

    [Serializable]
    public class ViewFocusPayload
    {
        public string objectKey;
        public bool animate;
    }

    [Serializable]
    public class LocalePayload
    {
        public string locale;
    }

    [Serializable]
    public class QualityPayload
    {
        public string qualityProfile;
    }

    [Serializable]
    public class InputEnablePayload
    {
        public bool enabled;
    }

    [Serializable]
    public class PingPayload
    {
        public long at;
    }

    [Serializable]
    public class UiResultPayload
    {
        public string kind;
        public string result;
        public string detail;
    }

    // 注：入站消息对应的**事件类**不在本文件 —— 它们放在契约层的
    // `Assets/Scripts/Contracts/Events/BridgeEvents.cs`（namespace WSU3.Contracts.Events）：
    // 订阅方既有 Runtime（编排）也有 Core（交互管理器要接 view:focus），
    // 而 Core 不能引用 Runtime，所以这些纯数据类必须待在两边都看得见的地方。

    // ========================================================================
    // 二、Unity → Web 的出站载荷与发送入口
    // ========================================================================

    [Serializable]
    internal class ProgressPayload
    {
        public float progress;
    }

    [Serializable]
    internal class TaskTypePayload
    {
        public int taskType;
    }

    [Serializable]
    internal class StepChangedPayload
    {
        public int stepIndex;
        public int stepTotal;
        public string stepName;
    }

    [Serializable]
    internal class TaskCompletedPayload
    {
        public int taskType;
        public float score;
        public long elapsedMs;
    }

    [Serializable]
    internal class ScoreReportPayload
    {
        public float score;
    }

    [Serializable]
    internal class ObjectPickedPayload
    {
        public string objectKey;
    }

    [Serializable]
    internal class UiRequestPayload
    {
        public string kind;
        public string refId;
        public UiRequestBody body;
    }

    [Serializable]
    internal class ErrorPayload
    {
        public int code;
        public string message;
        public bool fatal;
    }

    /// <summary>`ui:request` 要弹什么：提示条 / 信息面板 / 答题面板。</summary>
    public static class UiPanelKind
    {
        public const string Tips = "tips";
        public const string Ui = "ui";
        public const string Question = "question";
    }

    /// <summary>`ui:result` 的结果取值（Web 侧按这几个字符串回）。</summary>
    public static class UiResultKind
    {
        /// <summary>用户读完/确认/答对。</summary>
        public const string Success = "success";
        /// <summary>用户答错或取消。</summary>
        public const string Failed = "failed";
        /// <summary>面板弹不出来（Web 侧没实现/题目取不到）：Unity 侧按降级处理，不阻塞流程。</summary>
        public const string Unavailable = "unavailable";
    }

    /// <summary>
    /// `ui:request` 的**展示用**载荷：只给"要显示什么"，**不含答案**（判定在 Web 侧，它持有同一份题库）。
    /// 字段留空时 Web 侧可以只按 `refId` 自己取内容数据。
    /// </summary>
    [Serializable]
    public class UiRequestBody
    {
        public string title;
        public string content;
        public string questionType;
        public string[] options;
        public string tips;
    }

    [Serializable]
    internal class PongPayload
    {
        public long at;
    }

    /// <summary>
    /// 出站通道：把消息交给页面上的 <c>window.__WSU3_BRIDGE__</c>。
    ///
    /// 三条纪律（docs/design/09）：
    ///   ① 页面桥缺席时**只告警不抛异常**（丢消息不该拖崩场景）；
    ///   ② 信封字段一个不少：<c>type</c> / <c>version</c> / <c>seq</c> / <c>payload</c>（无载荷写 `null`）；
    ///   ③ `seq` 由这里自增，调用方不管。
    /// 编辑器与单测下没有 jslib：消息落到 <see cref="Sent"/> 事件上，便于断言。
    /// </summary>
    /// <summary>
    /// 出站通道（本文件只放**与平台无关**的部分）。
    /// 平台相关的那三个原生调用拆到同目录的 `WebChannel.Native.cs`（WebGL）与 `WebChannel.Editor.cs`（编辑器/单测）：
    /// 这样每个文件里 `Wsu3Bridge_*` 只出现一次 —— 静态检查工具看不懂 `#if`，同文件两分支同名会被误判为"重复方法"。
    /// </summary>
    public static partial class WebChannel
    {
        private static int s_Seq;
        private static int s_Version = BridgeMessageType.ProtocolVersion;
        private static bool s_ReadySent;

        /// <summary>本机（编辑器 / 单测）观察用：每发一条消息都会带上完整信封 JSON。</summary>
        public static event Action<string> Sent;

        /// <summary>协议版本（默认取契约里的值，测试可改）。</summary>
        public static int ProtocolVersion
        {
            get => s_Version;
            set => s_Version = value;
        }

        /// <summary>
        /// 握手：Unity 就绪（在 `app:init` 之前）。
        /// **幂等**：谁先调用谁发（启动编排在"自检通过"时发，比 MonoBehaviour 的 Start 更准确），重复调用不再发。
        /// </summary>
        public static void Ready()
        {
            if (s_ReadySent) return;
            s_ReadySent = true;
            Wsu3Bridge_Ready(s_Version.ToString());
        }

        /// <summary>是否已经握过手（供编排判断当前阶段）。</summary>
        public static bool IsReadySent => s_ReadySent;

        /// <summary>重置握手标记（仅测试用）。</summary>
        public static void ResetForTests()
        {
            s_ReadySent = false;
            s_Seq = 0;
        }

        /// <summary>引擎加载进度（0~1）；它是独立通道，可早于协议使用。</summary>
        public static void Progress(float progress)
        {
            Wsu3Bridge_Progress(progress.ToString("0.###", System.Globalization.CultureInfo.InvariantCulture));
        }

        /// <summary>发一条协议消息。</summary>
        public static void Send(string type, object payload)
        {
            if (string.IsNullOrEmpty(type))
            {
                Debug.LogError("[WebBridge] 消息 type 为空，已丢弃。");
                return;
            }

            s_Seq++;
            string payloadJson = payload == null ? "null" : JsonUtility.ToJson(payload);
            string json = "{\"type\":\"" + type + "\",\"version\":" + s_Version + ",\"seq\":" + s_Seq +
                          ",\"payload\":" + payloadJson + "}";

            Sent?.Invoke(json);
            Wsu3Bridge_Post(json);
        }
    }

    /// <summary>协议语义层：把"发什么"写清楚，调用方不用记字符串（常量来自契约）。</summary>
    public static class WebBridge
    {
        /// <summary>读一份出站消息的 type 是否在契约里（写错名字时立刻能看出来）。</summary>
        private static void Send(string type, object payload)
        {
            WebChannel.Send(type, payload);
        }

        public static void AssetsReady(TaskType taskType)
        {
            Send(BridgeMessageType.AssetsReady, new TaskTypePayload { taskType = (int)taskType });
        }

        public static void SceneReady(TaskType taskType)
        {
            Send(BridgeMessageType.SceneReady, new TaskTypePayload { taskType = (int)taskType });
        }

        public static void SceneExited(TaskType taskType)
        {
            Send(BridgeMessageType.SceneExited, new TaskTypePayload { taskType = (int)taskType });
        }

        public static void SceneProgress(float progress)
        {
            Send(BridgeMessageType.UnityProgress, new ProgressPayload { progress = progress });
        }

        public static void StepChanged(int index, int total, string name = null)
        {
            Send(BridgeMessageType.StepChanged,
                new StepChangedPayload { stepIndex = index, stepTotal = total, stepName = name });
        }

        public static void TaskCompleted(TaskType taskType, float score, long elapsedMs)
        {
            Send(BridgeMessageType.TaskCompleted,
                new TaskCompletedPayload { taskType = (int)taskType, score = score, elapsedMs = elapsedMs });
        }

        public static void ScoreReport(float score)
        {
            Send(BridgeMessageType.ScoreReport, new ScoreReportPayload { score = score });
        }

        public static void ObjectPicked(string objectKey)
        {
            Send(BridgeMessageType.ObjectPicked, new ObjectPickedPayload { objectKey = objectKey });
        }

        /// <summary>
        /// 请求 Web 侧弹教学面板（`kind` 见 <see cref="UiPanelKind"/>，`refId` 是内容数据的 key）。
        /// 结果由 Web 回 `ui:result`；**面板弹不出来时也要回一条 `unavailable`** ——
        /// Unity 侧的等待默认**不限时**（学生可能真的在想），不回答就等于把这一步挂住。
        /// 需要兜底时在条件上配 `timeoutSeconds`（见 `docs/design/10` §5）。
        /// </summary>
        public static void UiRequest(string kind, string refId, UiRequestBody body = null)
        {
            Send(BridgeMessageType.UiRequest,
                new UiRequestPayload { kind = kind, refId = refId, body = body });
        }

        /// <summary>错误上报。code 语义见 docs/design/02 §3.3；<paramref name="fatal"/> = 该任务已不可用。</summary>
        public static void ReportError(int code, string message, bool fatal = false)
        {
            Send(BridgeMessageType.UnityError, new ErrorPayload { code = code, message = message, fatal = fatal });
        }

        public static void Pong(long at)
        {
            Send(BridgeMessageType.DebugPong, new PongPayload { at = at });
        }
    }
}
