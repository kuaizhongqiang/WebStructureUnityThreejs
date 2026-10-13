using System.Collections.Generic;
using System.Reflection;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using WSU3.Contracts;
using WSU3.Contracts.Events;
using WSU3.Core.Interactive;
using WSU3.Web;

namespace WSU3.Tests.EditMode
{
    /// <summary>
    /// 入站路径（Web → Unity）的单测：**信封 → 事件**。
    ///
    /// 这条路径在真环境里跑不了（编辑器没有页面桥；WebGL 要人工构建才验证得到），而它的错误全是沉默的
    /// —— 消息被忽略、版本不符被降级、载荷解析失败被吞掉，画面都不会有任何异常。
    /// 所以这里把 `WebBridgeBehaviour.OnWebMessage` 的每条分支都钉一遍：
    /// **该发事件的发事件、该报错的报错、该忽略的只告警**。
    /// </summary>
    public class WebBridgeInboundTests
    {
        private readonly List<string> _sent = new List<string>();
        private GameObject _host;
        private WebBridgeBehaviour _bridge;

        // 事件捕获：用"收到几条 + 最后一条"而不是断言订阅者数量，避免与实现细节耦合
        private int _appInitCount;
        private AppInitEvent _appInit;
        private int _sceneEnterCount;
        private SceneEnterRequestEvent _sceneEnter;
        private int _sceneExitCount;
        private int _preloadCount;
        private PreloadTaskRequestEvent _preload;
        private int _viewFocusCount;
        private ViewFocusRequestEvent _viewFocus;
        private int _inputEnableCount;
        private InputEnableEvent _inputEnable;
        private int _resumeCount;
        private int _pingCount;
        private DebugPingEvent _ping;

        [SetUp]
        public void SetUp()
        {
            // 全部状态都要清：只清 _sent 是不够的 —— NUnit 的 fixture 实例会被复用，
            // 计数器不清就会把上一个用例的计数带进来（首次跑真实红过 3 个用例，就是这条）
            _sent.Clear();
            _appInitCount = 0;
            _appInit = null;
            _sceneEnterCount = 0;
            _sceneEnter = null;
            _sceneExitCount = 0;
            _preloadCount = 0;
            _preload = null;
            _viewFocusCount = 0;
            _viewFocus = null;
            _inputEnableCount = 0;
            _inputEnable = null;
            _resumeCount = 0;
            _pingCount = 0;
            _ping = null;

            WebChannel.ResetForTests();
            WebChannel.Sent += OnSent;

            EventBus<AppInitEvent>.Subscribe(OnAppInit);
            EventBus<PreloadTaskRequestEvent>.Subscribe(OnPreload);
            EventBus<SceneEnterRequestEvent>.Subscribe(OnSceneEnter);
            EventBus<SceneExitRequestEvent>.Subscribe(OnSceneExit);
            EventBus<ViewFocusRequestEvent>.Subscribe(OnViewFocus);
            EventBus<InputEnableEvent>.Subscribe(OnInputEnable);
            EventBus<RuntimeResumeEvent>.Subscribe(OnResume);
            EventBus<DebugPingEvent>.Subscribe(OnPing);

            // WebBridge ≠ 根物体：Awake 里那种"根物体才自保"的分支不该在测试里触发
            _host = new GameObject("BridgeTestHost");
            var bridgeGo = new GameObject("WebBridge"); // 名字是硬约定（Web 侧 SendMessage 的目标）
            bridgeGo.transform.SetParent(_host.transform);
            _bridge = bridgeGo.AddComponent<WebBridgeBehaviour>();

            // EditMode 下 AddComponent **不会**触发 OnEnable（Unity 只在播放态跑 MonoBehaviour 生命周期），
            // 而"意图事件 → 上网"那条订阅线正好写在 OnEnable 里。这里**把真实的方法调起来**（不是替身），
            // 否则那两条出站用例永远是 0 条消息 —— 它们红过，也是这条引起的。
            InvokeLifecycle(_bridge, "OnEnable");
        }

        /// <summary>显式调用生命周期私有方法（见 `SetUp` 里的说明）。</summary>
        private static void InvokeLifecycle(object target, string method)
        {
            target.GetType()
                .GetMethod(method, BindingFlags.Instance | BindingFlags.NonPublic)
                ?.Invoke(target, null);
        }

        [TearDown]
        public void TearDown()
        {
            InvokeLifecycle(_bridge, "OnDisable"); // 先退订，再销毁（避免订阅泄漏到下一个用例）
            Object.DestroyImmediate(_host);
            EventBus<AppInitEvent>.Unsubscribe(OnAppInit);
            EventBus<PreloadTaskRequestEvent>.Unsubscribe(OnPreload);
            EventBus<SceneEnterRequestEvent>.Unsubscribe(OnSceneEnter);
            EventBus<SceneExitRequestEvent>.Unsubscribe(OnSceneExit);
            EventBus<ViewFocusRequestEvent>.Unsubscribe(OnViewFocus);
            EventBus<InputEnableEvent>.Unsubscribe(OnInputEnable);
            EventBus<RuntimeResumeEvent>.Unsubscribe(OnResume);
            EventBus<DebugPingEvent>.Unsubscribe(OnPing);
            WebChannel.Sent -= OnSent;
            WebChannel.ResetForTests();
        }

        private void OnSent(string json)
        {
            _sent.Add(json);
        }

        private static string Envelope(string type, string payloadJson,
            int version = BridgeMessageType.ProtocolVersion, int seq = 1)
        {
            return "{\"type\":\"" + type + "\",\"version\":" + version + ",\"seq\":" + seq +
                   ",\"payload\":" + payloadJson + "}";
        }

        // ── 入站：每条消息都落地成事件 ───────────────────────────────────

        [Test]
        public void AppInit_PublishesLocaleAndQuality()
        {
            _bridge.OnWebMessage(Envelope(BridgeMessageType.AppInit,
                "{\"locale\":\"zh-CN\",\"qualityProfile\":\"high\",\"protocolVersion\":1}"));

            Assert.AreEqual(1, _appInitCount);
            Assert.AreEqual("zh-CN", _appInit.Locale);
            Assert.AreEqual("high", _appInit.QualityProfile);
            Assert.AreEqual(0, _sent.Count, "入站消息不该顺带回消息");
        }

        [Test]
        public void SceneEnter_CarriesTaskTypeProjectAndContentVersion()
        {
            _bridge.OnWebMessage(Envelope(BridgeMessageType.SceneEnter,
                "{\"taskType\":8,\"projectId\":\"clip_contactor\",\"contentVersion\":\"v3\"}"));

            Assert.AreEqual(1, _sceneEnterCount);
            Assert.AreEqual(TaskType.Structure, _sceneEnter.TaskType);
            Assert.AreEqual("clip_contactor", _sceneEnter.ProjectId);
            Assert.AreEqual("v3", _sceneEnter.ContentVersion);
        }

        [Test]
        public void PayloadLessMessages_WorkWithNullPayload()
        {
            _bridge.OnWebMessage(Envelope(BridgeMessageType.SceneExit, "null"));
            _bridge.OnWebMessage(Envelope(BridgeMessageType.RuntimeResume, "null"));

            Assert.AreEqual(1, _sceneExitCount);
            Assert.AreEqual(1, _resumeCount);
        }

        [Test]
        public void PreloadTask_AndViewFocus_CarryTheirFields()
        {
            _bridge.OnWebMessage(Envelope(BridgeMessageType.PreloadTask, "{\"taskType\":5}"));
            _bridge.OnWebMessage(Envelope(BridgeMessageType.ViewFocus,
                "{\"objectKey\":\"contactor_coil\",\"animate\":true}"));

            Assert.AreEqual(TaskType.Training, _preload.TaskType);
            Assert.AreEqual("contactor_coil", _viewFocus.ObjectKey);
            Assert.IsTrue(_viewFocus.Animate);
        }

        [Test]
        public void InputEnable_CarriesTheBoolean()
        {
            _bridge.OnWebMessage(Envelope(BridgeMessageType.InputEnable, "{\"enabled\":false}"));

            Assert.AreEqual(1, _inputEnableCount);
            Assert.IsFalse(_inputEnable.Enabled);
        }

        [Test]
        public void DebugPing_AnswersWithPongCarryingTheSameStamp()
        {
            _bridge.OnWebMessage(Envelope(BridgeMessageType.DebugPing, "{\"at\":1234567}"));

            Assert.AreEqual(1, _pingCount);
            Assert.AreEqual(1234567L, _ping.At);
            Assert.AreEqual(1, _sent.Count);
            Assert.AreEqual(BridgeMessageType.DebugPong, BridgeJson.GetString(_sent[0], "type"));
            StringAssert.Contains("\"at\":1234567", _sent[0]);
        }

        // ── 三条"不该静默"的路径 ────────────────────────────────────────

        [Test]
        public void VersionMismatch_ReportsError1001_AndDoesNotDispatch()
        {
            LogAssert.Expect(LogType.Error, new System.Text.RegularExpressions.Regex("协议版本不匹配"));

            _bridge.OnWebMessage(Envelope(BridgeMessageType.AppInit,
                "{\"locale\":\"zh-CN\",\"qualityProfile\":\"low\",\"protocolVersion\":99}", version: 99));

            Assert.AreEqual(0, _appInitCount, "版本不符时**不能**照常分发（DEC-07：不静默降级）");
            Assert.AreEqual(1, _sent.Count);
            Assert.AreEqual(BridgeMessageType.UnityError, BridgeJson.GetString(_sent[0], "type"));
            StringAssert.Contains("\"code\":1001", _sent[0]);
            StringAssert.Contains("\"fatal\":true", _sent[0]);
        }

        [Test]
        public void MalformedEnvelope_IsRejectedWithAnError()
        {
            LogAssert.Expect(LogType.Error, new System.Text.RegularExpressions.Regex("不是合法信封"));

            _bridge.OnWebMessage("{oops");

            Assert.AreEqual(0, _appInitCount);
            Assert.AreEqual(0, _sent.Count, "脏消息不该诱发回消息（避免与页面互相刷屏）");
        }

        [Test]
        public void UnknownType_OnlyWarns_FutureContractMessagesAreVisibleInLog()
        {
            LogAssert.Expect(LogType.Warning, new System.Text.RegularExpressions.Regex("未知消息类型"));

            _bridge.OnWebMessage(Envelope("x:not-in-contract", "{\"a\":1}"));

            Assert.AreEqual(0, _sent.Count, "未知类型不该回错误（那是 Web 侧自己的进度问题）");
        }

        [Test]
        public void UnknownTaskType_IsIgnoredWithAWarning_NotCast()
        {
            LogAssert.Expect(LogType.Warning, new System.Text.RegularExpressions.Regex("不是合法枚举值"));

            _bridge.OnWebMessage(Envelope(BridgeMessageType.SceneEnter,
                "{\"taskType\":99,\"projectId\":\"clip_x\"}"));

            Assert.AreEqual(0, _sceneEnterCount, "越界的 taskType 必须被忽略，而不是 (TaskType)99 硬转");
        }

        [Test]
        public void BrokenPayload_IsIgnoredWithAWarning()
        {
            LogAssert.Expect(LogType.Warning, new System.Text.RegularExpressions.Regex("不是数字字面量"));

            // taskType 写成字符串：`JsonUtility` **不报错**，而是读成 0 —— 而 0 是合法的 TaskType.None，
            // 于是"坏载荷"会变成一个"看起来正常的任务"被静默分发。（首次跑真实抓到过，已按此收紧实现）
            _bridge.OnWebMessage(Envelope(BridgeMessageType.PreloadTask, "{\"taskType\":\"five\"}"));

            Assert.AreEqual(0, _preloadCount, "类型不对的 taskType 必须被忽略，不能当成 TaskType.None 放行");
        }

        [Test]
        public void MissingTaskType_IsIgnoredWithAWarning()
        {
            LogAssert.Expect(LogType.Warning, new System.Text.RegularExpressions.Regex("不是数字字面量"));

            _bridge.OnWebMessage(Envelope(BridgeMessageType.PreloadTask, "{}"));

            Assert.AreEqual(0, _preloadCount, "缺 taskType 的 preload 不该猜成 None");
        }

        // ── 出站：Core 的意图事件真的上网 ───────────────────────────────

        [Test]
        public void OutboundIntents_AreForwardedAsContractMessages()
        {
            EventBus<TaskAssetsReadyEvent>.Publish(new TaskAssetsReadyEvent { TaskType = TaskType.Training });
            EventBus<TaskSceneReadyEvent>.Publish(new TaskSceneReadyEvent { TaskType = TaskType.Training });
            EventBus<TaskExitedEvent>.Publish(new TaskExitedEvent { TaskType = TaskType.Training });
            EventBus<SceneProgressEvent>.Publish(new SceneProgressEvent { Progress = 0.42f });
            EventBus<BridgeErrorEvent>.Publish(new BridgeErrorEvent { Code = 9001, Message = "占位", Fatal = false });

            Assert.AreEqual(5, _sent.Count, "意图事件应逐条上网（OnEnable 订阅没生效时这里会红）");
            Assert.AreEqual(BridgeMessageType.AssetsReady, BridgeJson.GetString(_sent[0], "type"));
            Assert.AreEqual(BridgeMessageType.SceneReady, BridgeJson.GetString(_sent[1], "type"));
            Assert.AreEqual(BridgeMessageType.SceneExited, BridgeJson.GetString(_sent[2], "type"));
            Assert.AreEqual(BridgeMessageType.UnityProgress, BridgeJson.GetString(_sent[3], "type"));
            Assert.AreEqual(BridgeMessageType.UnityError, BridgeJson.GetString(_sent[4], "type"));
            StringAssert.Contains("\"code\":9001", _sent[4]);
        }

        [Test]
        public void EmptyClick_IsNotReported_ButClickingAnObjectIs()
        {
            // 点空白：Target == null，且**只有 Web 侧需要知道"点中了什么"**（DOM 层自己就能感知没点中）
            // 事件数据走对象池（`Get` / `Release`）—— 它只有私有无参构造，不能 new
            var emptyClick = GlobalInteractionEventData.Get(null, GlobalInteractionType.Click);
            EventBus<GlobalInteractionEventData>.Publish(emptyClick);
            emptyClick.Release();

            Assert.AreEqual(0, _sent.Count, "点空白不该上报");

            var targetGo = new GameObject("probe_interactive");
            targetGo.transform.SetParent(_host.transform);
            var target = targetGo.AddComponent<ProbeInteractiveObj>();
            try
            {
                var click = GlobalInteractionEventData.Get(target, GlobalInteractionType.Click);
                EventBus<GlobalInteractionEventData>.Publish(click);
                click.Release();

                Assert.AreEqual(1, _sent.Count);
                Assert.AreEqual(BridgeMessageType.ObjectPicked, BridgeJson.GetString(_sent[0], "type"));
                StringAssert.Contains("\"objectKey\":\"" + target.ObjectKey + "\"", _sent[0]);
            }
            finally
            {
                Object.DestroyImmediate(targetGo);
            }
        }

        [Test]
        public void HoverIsNotReportedAsPicked()
        {
            var targetGo = new GameObject("probe_hover");
            targetGo.transform.SetParent(_host.transform);
            var target = targetGo.AddComponent<ProbeInteractiveObj>();
            try
            {
                var hover = GlobalInteractionEventData.Get(target, GlobalInteractionType.Enter);
                EventBus<GlobalInteractionEventData>.Publish(hover);
                hover.Release();

                Assert.AreEqual(0, _sent.Count, "只有 Click 才上报 object:picked");
            }
            finally
            {
                Object.DestroyImmediate(targetGo);
            }
        }

        // ── 捕获回调 ────────────────────────────────────────────────────

        private void OnAppInit(AppInitEvent e)
        {
            _appInitCount++;
            _appInit = e;
        }

        private void OnPreload(PreloadTaskRequestEvent e)
        {
            _preloadCount++;
            _preload = e;
        }

        private void OnSceneEnter(SceneEnterRequestEvent e)
        {
            _sceneEnterCount++;
            _sceneEnter = e;
        }

        private void OnSceneExit(SceneExitRequestEvent e)
        {
            _sceneExitCount++;
        }

        private void OnViewFocus(ViewFocusRequestEvent e)
        {
            _viewFocusCount++;
            _viewFocus = e;
        }

        private void OnInputEnable(InputEnableEvent e)
        {
            _inputEnableCount++;
            _inputEnable = e;
        }

        private void OnResume(RuntimeResumeEvent e)
        {
            _resumeCount++;
        }

        private void OnPing(DebugPingEvent e)
        {
            _pingCount++;
            _ping = e;
        }
    }

    /// <summary>
    /// 交互物的**测试替身**：基类是 abstract，测试里要一个能实例化的具体类。
    /// 只为了拿到 `ObjectKey`，不实现任何交互行为。
    /// </summary>
    public class ProbeInteractiveObj : InteractiveObjBase
    {
    }
}
