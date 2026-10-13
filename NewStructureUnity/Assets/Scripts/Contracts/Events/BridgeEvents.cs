// ============================================================================
// 桥消息的「事件数据」——Web → Unity 的每条入站消息对应一个事件类。
//
// 放在 Contracts 层（而不是 Web 层）的理由：**写业务的人只订阅事件，不解析 JSON**；
// 而订阅方既有 Runtime（编排），也有 Core（交互管理器要接 view:focus），
// Core 不能引用 Runtime，所以这些纯数据的类必须待在两者都能看到的地方 —— Contracts。
//
// 纪律：类名与 `BridgeMessageType` 的常量一一对应（谁加消息谁加事件），
//       信封的解析在 `WSU3.Web.BridgeJson` / `WebBridgeBehaviour`，本文件只描述载荷。
// ============================================================================

namespace WSU3.Contracts.Events
{
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

    /// <summary>`view:focus`：聚焦某个部件（交互管理器据此高亮）。</summary>
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
    // Unity → Web 的「出站意图」
    //
    // 为什么 Core 不直接调桥：桥（`WSU3.Web.WebBridge`）在 Runtime 层，Core 不能引用它。
    // 所以 Core 只管**发布意图**，由 Runtime 侧的桥**订阅并真正上网**（`WebBridgeBehaviour`）。
    // 好处：编排逻辑（谁在什么时机就绪）留在 Core，协议与传输留在 Runtime，两边各自可测。
    // ========================================================================

    /// <summary>意图：某个任务的**资源包已装好**（对应 `assets:ready`）。</summary>
    public class TaskAssetsReadyEvent
    {
        public TaskType TaskType;
    }

    /// <summary>意图：某个任务**装配完成、可交互**（对应 `scene:ready`）。</summary>
    public class TaskSceneReadyEvent
    {
        public TaskType TaskType;
    }

    /// <summary>意图：某个任务**已退出并卸包完成**（对应 `scene:exited`）。</summary>
    public class TaskExitedEvent
    {
        public TaskType TaskType;
    }

    /// <summary>意图：装配进度（对应 `unity:progress`）。</summary>
    public class SceneProgressEvent
    {
        public float Progress;
    }

    /// <summary>意图：上报错误（对应 `unity:error`；错误码语义见 docs/design/02 §3.3）。</summary>
    public class BridgeErrorEvent
    {
        public int Code;
        public string Message;
        public bool Fatal;
    }
}
