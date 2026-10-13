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

    // ========================================================================
    // 二、Unity 侧收到的消息（经 EventBus<T> 发布，业务只订阅、不解析 JSON）
    // ========================================================================

    /// <summary>`app:init`：启动配置（语言 / 画质 / 协议版本）。</summary>
    public class AppInitEvent
    {
        public string Locale;
        public string QualityProfile;
        public int ProtocolVersion;
    }

    /// <summary>`preload:task`：预装某任务的资源包，**不进入交互**。</summary>
    public class PreloadTaskRequestEvent
    {
        public TaskType TaskType;
    }

    /// <summary>`preload:cancel`：取消预装。</summary>
    public class PreloadCancelRequestEvent
    {
        public TaskType TaskType;
    }

    /// <summary>`scene:enter`：进入某任务（装项目资源包 → 装配 → 就绪）。</summary>
    public class SceneEnterRequestEvent
    {
        public TaskType TaskType;
        public string ProjectId;
        public string ContentVersion;
    }

    /// <summary>`scene:exit`：退出当前任务（卸包清理，**实例不销毁**）。</summary>
    public class SceneExitRequestEvent
    {
    }

    /// <summary>`view:focus`：聚焦某个部件。</summary>
    public class ViewFocusRequestEvent
    {
        public string ObjectKey;
        public bool Animate;
    }

    /// <summary>`ui:set-locale`：切换语言。</summary>
    public class LocaleChangeRequestEvent
    {
        public string Locale;
    }

    /// <summary>`ui:set-quality`：运行时降质。</summary>
    public class QualityChangeRequestEvent
    {
        public string QualityProfile;
    }

    /// <summary>`input:enable`：三维输入开关（模态面板打开时关掉）。</summary>
    public class InputEnableEvent
    {
        public bool Enabled;
    }

    /// <summary>`runtime:resume`：容器重新可见，恢复运行。</summary>
    public class RuntimeResumeEvent
    {
    }

    /// <summary>`debug:ping`：连通性自检。</summary>
    public class DebugPingEvent
    {
        public long At;
    }

    // ========================================================================
    // 三、Unity → Web 的出站载荷与发送入口
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
    internal class ErrorPayload
    {
        public int code;
        public string message;
        public bool fatal;
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

        /// <summary>本机（编辑器 / 单测）观察用：每发一条消息都会带上完整信封 JSON。</summary>
        public static event Action<string> Sent;

        /// <summary>协议版本（默认取契约里的值，测试可改）。</summary>
        public static int ProtocolVersion
        {
            get => s_Version;
            set => s_Version = value;
        }

        /// <summary>握手：Unity 就绪（在 `app:init` 之前）。</summary>
        public static void Ready()
        {
            Wsu3Bridge_Ready(s_Version.ToString());
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
