using System;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools; // LogAssert：断言"该告警的告警了、该报错的报错了"
using WSU3.Contracts;
using WSU3.Contracts.Events;
using WSU3.Web;

namespace WSU3.Tests.EditMode
{
    /// <summary>
    /// 桥的**信封与出站**单测（`docs/design/02` §1、`docs/design/09`）。
    ///
    /// 为什么必须有：入站路径在真环境里跑不了（编辑器没有页面桥，WebGL 构建要关编辑器、走人工流程），
    /// 而这条链上的错误**全是沉默的** —— 拼错一个消息类型、`seq` 忘了自增、payload 里带个 `}` 就被截断，
    /// 表现都是"消息石沉大海"，没有任何异常。所以把可判定的部分全部钉在这里。
    /// </summary>
    public class BridgeJsonTests
    {
        [Test]
        public void Envelope_WithNestedPayload_KeepsPayloadRaw()
        {
            const string json =
                "{\"type\":\"scene:enter\",\"version\":1,\"seq\":7," +
                "\"payload\":{\"taskType\":8,\"projectId\":\"clip_contactor\",\"contentVersion\":\"v3\"}}";

            Assert.IsTrue(BridgeJson.TryParseEnvelope(json, out BridgeEnvelope envelope));
            Assert.AreEqual(BridgeMessageType.SceneEnter, envelope.Type);
            Assert.AreEqual(1, envelope.Version);
            Assert.AreEqual(7, envelope.Seq);
            Assert.AreEqual("{\"taskType\":8,\"projectId\":\"clip_contactor\",\"contentVersion\":\"v3\"}",
                envelope.Payload);
        }

        [Test]
        public void Envelope_PayloadContainingBracesInAString_IsNotTruncated()
        {
            // 这正是"手写扫描器"存在的理由：payload 里的字符串含 `}` 时，朴素实现会在错误的位置收尾。
            const string json = "{\"type\":\"x:y\",\"version\":1,\"seq\":1,\"payload\":{\"s\":\"} ] \\\" }\",\"n\":2}}";

            Assert.IsTrue(BridgeJson.TryParseEnvelope(json, out BridgeEnvelope envelope));
            Assert.AreEqual("{\"s\":\"} ] \\\" }\",\"n\":2}", envelope.Payload);

            var parsed = BridgeJson.ParsePayload<ProbeStringPayload>(envelope.Payload);
            Assert.IsNotNull(parsed);
            Assert.AreEqual("} ] \" }", parsed.s);
            Assert.AreEqual(2, parsed.n);
        }

        [Test]
        public void Envelope_NullPayloadLiteral_StaysNullLiteral_AndParsesToNull()
        {
            const string json = "{\"type\":\"scene:exit\",\"version\":1,\"seq\":3,\"payload\":null}";

            Assert.IsTrue(BridgeJson.TryParseEnvelope(json, out BridgeEnvelope envelope));
            Assert.AreEqual("null", envelope.Payload);
            Assert.IsNull(BridgeJson.ParsePayload<ProbeStringPayload>(envelope.Payload));
        }

        [Test]
        public void Envelope_EscapesInStrings_AreDecoded()
        {
            Assert.AreEqual("中文", BridgeJson.GetString("{\"s\":\"\\u4e2d\\u6587\"}", "s"));
            Assert.AreEqual("a\"b", BridgeJson.GetString("{\"s\":\"a\\\"b\"}", "s"));
            Assert.AreEqual("n\tx", BridgeJson.GetString("{\"s\":\"n\\tx\"}", "s"));
        }

        [Test]
        public void Envelope_MissingFields_FallBackWithoutThrowing()
        {
            Assert.AreEqual(0, BridgeJson.GetInt("{\"a\":1}", "missing", 0));
            Assert.AreEqual(-1, BridgeJson.GetInt("{\"a\":\"NaN\"}", "a", -1));
            Assert.IsNull(BridgeJson.GetString("{\"a\":1}", "a"));
            Assert.IsNull(BridgeJson.GetRaw("{\"a\":1}", "missing"));
        }

        [Test]
        public void Envelope_NotAnEnvelope_IsRejectedInsteadOfGuessed()
        {
            foreach (string bad in new[] { null, "", "   ", "not json", "{}", "{\"version\":1}", "[1,2,3]" })
            {
                Assert.IsFalse(BridgeJson.TryParseEnvelope(bad, out _), $"不该被当成合法信封：{bad ?? "<null>"}");
            }
        }
    }

    /// <summary>
    /// 出站通道：信封字段、`seq` 自增、`WebBridge.*` 与契约常量的**逐字**对应。
    ///
    /// 类型名写错不会有编译期报错 —— 所以这里把 10 条出站消息一条条发出来，逐条比对 type。
    /// </summary>
    public class WebChannelTests
    {
        private readonly List<string> _sent = new List<string>();

        [SetUp]
        public void SetUp()
        {
            _sent.Clear();
            WebChannel.ResetForTests();
            WebChannel.Sent += OnSent;
        }

        [TearDown]
        public void TearDown()
        {
            WebChannel.Sent -= OnSent;
            WebChannel.ResetForTests();
            WebChannel.ProtocolVersion = BridgeMessageType.ProtocolVersion;
        }

        private void OnSent(string json)
        {
            _sent.Add(json);
        }

        private string LastType()
        {
            Assert.Greater(_sent.Count, 0, "没有发出任何消息");
            return BridgeJson.GetString(_sent[_sent.Count - 1], "type");
        }

        [Test]
        public void Send_WritesTheWholeEnvelope()
        {
            WebChannel.Send("probe:type", new ProbeNumberPayload { n = 5 });

            Assert.AreEqual(1, _sent.Count);
            StringAssert.Contains("\"type\":\"probe:type\"", _sent[0]);
            StringAssert.Contains("\"version\":" + BridgeMessageType.ProtocolVersion, _sent[0]);
            StringAssert.Contains("\"seq\":1", _sent[0]);
            StringAssert.Contains("\"payload\":{\"n\":5}", _sent[0]);
        }

        [Test]
        public void Send_IncrementsSeq_AndWritesNullLiteralWhenNoPayload()
        {
            WebChannel.Send("a", null);
            WebChannel.Send("b", null);

            StringAssert.Contains("\"seq\":1", _sent[0]);
            StringAssert.Contains("\"seq\":2", _sent[1]);
            StringAssert.Contains("\"payload\":null", _sent[0]);
        }

        [Test]
        public void Send_WithoutType_IsDroppedInsteadOfSendingGarbage()
        {
            LogAssert.Expect(LogType.Error, new System.Text.RegularExpressions.Regex("消息 type 为空"));
            WebChannel.Send(null, new ProbeNumberPayload { n = 1 });

            Assert.AreEqual(0, _sent.Count);
        }

        [Test]
        public void Ready_IsSentOnlyOnce()
        {
            Assert.IsFalse(WebChannel.IsReadySent);
            WebChannel.Ready();
            Assert.IsTrue(WebChannel.IsReadySent);

            // 幂等：启动编排与 MonoBehaviour 两边都调用时，页面上只应看到一次握手
            WebChannel.Ready();
            Assert.IsTrue(WebChannel.IsReadySent);
        }

        [Test]
        public void OutboundHelpers_UseTheExactContractTypes()
        {
            // 每加一条出站消息，这里也要加一行 —— 它就是"拼错了会立刻红"的那道闸
            WebBridge.AssetsReady(TaskType.Training);
            WebBridge.SceneReady(TaskType.Training);
            WebBridge.SceneExited(TaskType.Training);
            WebBridge.SceneProgress(0.5f);
            WebBridge.StepChanged(1, 3, "第一步");
            WebBridge.TaskCompleted(TaskType.Training, 88.5f, 12345L);
            WebBridge.ScoreReport(88.5f);
            WebBridge.ObjectPicked("contactor_coil");
            WebBridge.SceneParts(new List<ScenePartEntryData>
            {
                new ScenePartEntryData { Key = "contactor/Root", Name = "交流接触器" },
            });
            WebBridge.ObjectHover("contactor/Coil", 0.62f, 0.38f);
            WebBridge.ReportError(9001, "占位错误", false);
            WebBridge.Pong(12345L);

            string[] expected =
            {
                BridgeMessageType.AssetsReady, BridgeMessageType.SceneReady, BridgeMessageType.SceneExited,
                BridgeMessageType.UnityProgress, BridgeMessageType.StepChanged, BridgeMessageType.TaskCompleted,
                BridgeMessageType.ScoreReport, BridgeMessageType.ObjectPicked, BridgeMessageType.SceneParts,
                BridgeMessageType.ObjectHover, BridgeMessageType.UnityError, BridgeMessageType.DebugPong,
            };

            Assert.AreEqual(expected.Length, _sent.Count, "出站消息条数与预期不符");
            for (int i = 0; i < expected.Length; i++)
            {
                Assert.AreEqual(expected[i], BridgeJson.GetString(_sent[i], "type"), $"第 {i + 1} 条消息 type 不符");
                CollectionAssert.Contains(BridgeMessageType.FromUnity, expected[i], "出站消息必须属于 Unity 组");
                Assert.IsFalse(BridgeMessageType.IsFromWeb(expected[i]), "出站消息不该同时属于 Web 组");
            }
        }

        [Test]
        public void OutboundHelpers_CarryTheirPayloadFields()
        {
            WebBridge.TaskCompleted(TaskType.Inspection, 77.5f, 4321L);

            Assert.AreEqual(BridgeMessageType.TaskCompleted, LastType());
            StringAssert.Contains("\"taskType\":9", _sent[0]);
            StringAssert.Contains("\"score\":77.5", _sent[0]);
            StringAssert.Contains("\"elapsedMs\":4321", _sent[0]);
        }

        [Test]
        public void ReportError_KeepsFatalFlagAsContractSays()
        {
            WebBridge.ReportError(1005, "上下文丢失", true);

            StringAssert.Contains("\"code\":1005", _sent[0]);
            StringAssert.Contains("\"fatal\":true", _sent[0]);
        }

        [Test]
        public void SceneParts_SerializesTheFlatEntryShape()
        {
            // 契约形状：{ parts: [{ key, name, nameEn?, parentKey? }]} —— 扁平条目 + parentKey 表层级（DEC-131）。
            // JsonUtility 不认 null：没填的字符串字段必须落成空串（Web 侧 readString 视为"无"），不能是裸 null。
            WebBridge.SceneParts(new List<ScenePartEntryData>
            {
                new ScenePartEntryData { Key = "contactor/Root", Name = "交流接触器", NameEn = "AC Contactor" },
                new ScenePartEntryData { Key = "contactor/Coil", Name = "线圈", ParentKey = "contactor/Root" },
            });

            Assert.AreEqual(BridgeMessageType.SceneParts, LastType());
            StringAssert.Contains("\"parts\":[", _sent[0]);
            StringAssert.Contains("\"key\":\"contactor/Root\"", _sent[0]);
            StringAssert.Contains("\"nameEn\":\"AC Contactor\"", _sent[0]);
            StringAssert.Contains("\"parentKey\":\"\"", _sent[0]);      // 顶层：parentKey 空串
            StringAssert.Contains("\"parentKey\":\"contactor/Root\"", _sent[0]); // 子件：指向最近部件父级
        }

        [Test]
        public void ObjectHover_EmptyKeyMeansLeave_AndCarriesNormalizedPoint()
        {
            // 契约形状：{ key, x, y }（0~1，原点左上）；key 空串 = 移出（DEC-130）。
            WebBridge.ObjectHover("", 0f, 0f);

            Assert.AreEqual(BridgeMessageType.ObjectHover, LastType());
            StringAssert.Contains("\"key\":\"\"", _sent[0]);
            StringAssert.Contains("\"x\":0", _sent[0]);
            StringAssert.Contains("\"y\":0", _sent[0]);
        }
    }

    /// <summary>测试用的载荷（`JsonUtility` 只认 public 字段）。</summary>
    [Serializable]
    public class ProbeNumberPayload
    {
        public int n;
    }

    [Serializable]
    public class ProbeStringPayload
    {
        public string s;
        public int n;
    }
}
