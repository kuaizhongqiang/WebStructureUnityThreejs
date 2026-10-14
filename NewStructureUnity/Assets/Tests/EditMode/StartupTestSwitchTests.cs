using System.Collections.Generic;
using NUnit.Framework;
using WSU3.Contracts;
using WSU3.Managers;

namespace WSU3.Tests.EditMode
{
    /// <summary>
    /// `StartupTestSwitch` 的 **URL query 解析**单测（只钉这个纯函数，不碰场景 / 不跑协程）。
    ///
    /// WHY 值得单测：这条解析只在 **WebGL 产物**里才真正生效（编辑器 Play 模式没有 query），
    /// 而它恰恰是"免重打包换任务"的唯一入口 —— 解析错了，表现是"构建里任务没换 / 根本没进任务"，
    /// 每次都要重新出包 + 开网页才看得见。所以把每条分支（含垃圾输入与大小写）在这里钉死。
    ///
    /// 覆盖口径直接来自 `ResolveFromUrl` 的文档注释：无 query 走序列化默认值、on/1/true 打开、
    /// off/0/false 关闭、数字 = TaskType、未定义数字只忽略 taskType 这一项、空值忽略、`#` 片段不解析、
    /// 多余 `&` 跳过、key 大小写不敏感、`allowUrlOverride=false` 时整段忽略。
    /// </summary>
    public class StartupTestSwitchTests
    {
        private const string BaseUrl = "https://example.com/webgl/index.html";

        // 序列化默认值（与 `0_Setup` 里 TestSwitch 那个组件上摆的一致）
        private const bool DefaultEnabled = false;
        private const TaskType DefaultTaskType = TaskType.Structure;
        private const string DefaultClip = "clip_contactor";

        private List<string> _diagnostics;

        [SetUp]
        public void SetUp()
        {
            // NUnit 会复用 fixture 实例：诊断列表必须每个用例重新建，否则会串味
            _diagnostics = new List<string>();
        }

        private StartupTestSwitch.TestSwitchSettings Resolve(string url, bool allowUrlOverride = true)
        {
            return StartupTestSwitch.ResolveFromUrl(
                url, DefaultEnabled, DefaultTaskType, DefaultClip, allowUrlOverride, _diagnostics);
        }

        private static void AssertUntouched(StartupTestSwitch.TestSwitchSettings settings, string because)
        {
            Assert.AreEqual(DefaultEnabled, settings.Enabled, $"{because}：开关不该变");
            Assert.AreEqual(DefaultTaskType, settings.TaskType, $"{because}：taskType 不该变");
            Assert.AreEqual(DefaultClip, settings.ProjectClip, $"{because}：projectClip 不该变");
            Assert.IsFalse(settings.Applied, $"{because}：不该标记为已覆盖");
        }

        // ── 无 query（编辑器 Play 模式）────────────────────────────────────

        [Test]
        public void NoQuery_EmptyAbsoluteUrl_KeepsSerializedDefaults()
        {
            // 编辑器 Play 模式的 Application.absoluteURL 就是空串
            AssertUntouched(Resolve(string.Empty), "absoluteURL 为空串");
        }

        [Test]
        public void NoQuery_NullOrNoQuestionMark_KeepsSerializedDefaults()
        {
            AssertUntouched(Resolve(null), "absoluteURL 为 null");
            AssertUntouched(Resolve(BaseUrl), "地址里没有 ?");
            AssertUntouched(Resolve(BaseUrl + "?"), "问号后面什么都没有");
            Assert.AreEqual(0, _diagnostics.Count, "无 query 不该产生任何诊断");
        }

        // ── 开关的布尔写法 ────────────────────────────────────────────────

        [Test]
        public void TestOn_EnablesAndKeepsSerializedTaskTypeAndClip()
        {
            var settings = Resolve(BaseUrl + "?wsu3_test=on");

            Assert.IsTrue(settings.Enabled, "wsu3_test=on 应该打开开关");
            Assert.AreEqual(DefaultTaskType, settings.TaskType, "on 不指定任务类型，应沿用序列化值");
            Assert.AreEqual(DefaultClip, settings.ProjectClip, "on 不指定 clip，应沿用序列化值");
            Assert.IsTrue(settings.Applied, "应该标记为已覆盖");
            Assert.AreEqual(0, _diagnostics.Count, "合法输入不该产生诊断");
        }

        [Test]
        public void TestTrueOrOne_AlsoEnables()
        {
            Assert.IsTrue(Resolve(BaseUrl + "?wsu3_test=true").Enabled, "true 应打开开关");
            Assert.IsTrue(Resolve(BaseUrl + "?wsu3_test=1").Enabled, "1 应打开开关");
        }

        [Test]
        public void TestOne_IsBooleanLiteral_NotTaskTypePurpose()
        {
            // 口径说明（有意为之）：`wsu3_test` 首先是"开/关"，所以 1/0 是布尔字面量；
            // 想直选 TaskType.Purpose=1 请改 Inspector 上的 taskType。
            var settings = Resolve(BaseUrl + "?wsu3_test=1");

            Assert.IsTrue(settings.Enabled);
            Assert.AreEqual(DefaultTaskType, settings.TaskType, "1 作为布尔量，不该被当成 TaskType.Purpose");
        }

        [Test]
        public void TestOffOrZeroOrFalse_ExplicitlyDisables()
        {
            foreach (string word in new[] { "off", "false", "0" })
            {
                var settings = Resolve(BaseUrl + "?wsu3_test=" + word);
                Assert.IsFalse(settings.Enabled, $"wsu3_test={word} 应该关闭开关");
                Assert.IsTrue(settings.Applied, $"wsu3_test={word} 算一次覆盖");
            }
        }

        // ── 数字 = TaskType ──────────────────────────────────────────────

        [Test]
        public void TestEight_EnablesAndTreatsNumberAsTaskType()
        {
            var settings = Resolve(BaseUrl + "?wsu3_test=8");

            Assert.IsTrue(settings.Enabled, "数字写法同样要打开开关");
            Assert.AreEqual(TaskType.Structure, settings.TaskType, "8 = Structure");
            Assert.AreEqual(DefaultClip, settings.ProjectClip, "没给 clip 就沿用序列化值");
            Assert.AreEqual(0, _diagnostics.Count, "8 是已定义的值，不该有诊断");
        }

        [Test]
        public void TestUndefinedNumber_IgnoresTaskTypeButStillEnables()
        {
            var settings = Resolve(BaseUrl + "?wsu3_test=99");

            Assert.IsTrue(settings.Enabled, "用户显式点名要自测 ⇒ 开关照开");
            Assert.AreEqual(DefaultTaskType, settings.TaskType, "99 未定义，taskType 沿用序列化值");
            Assert.AreEqual(1, _diagnostics.Count, "必须留下一条诊断说明这一项被忽略（否则是沉默失败）");
            StringAssert.Contains("99", _diagnostics[0]);
        }

        [Test]
        public void TestGarbage_IsIgnoredWithDiagnostic()
        {
            var settings = Resolve(BaseUrl + "?wsu3_test=banana");

            AssertUntouched(settings, "wsu3_test=banana");
            Assert.AreEqual(1, _diagnostics.Count, "垃圾值必须留下诊断");
            StringAssert.Contains("banana", _diagnostics[0]);
        }

        [Test]
        public void TestEmptyValue_IsIgnoredWithDiagnostic()
        {
            var settings = Resolve(BaseUrl + "?wsu3_test=");

            AssertUntouched(settings, "wsu3_test= 空值");
            Assert.AreEqual(1, _diagnostics.Count);
        }

        // ── clip 覆盖 ────────────────────────────────────────────────────

        [Test]
        public void ClipOverride_AppliesWithoutTouchingTheSwitch()
        {
            var settings = Resolve(BaseUrl + "?wsu3_clip=clip_pump");

            Assert.AreEqual("clip_pump", settings.ProjectClip);
            Assert.IsFalse(settings.Enabled, "只覆盖 clip 不该顺手打开开关");
            Assert.IsTrue(settings.Applied);
            Assert.AreEqual(0, _diagnostics.Count);
        }

        [Test]
        public void EmptyClip_IsIgnoredInsteadOfClearingIt()
        {
            // 空 clip 只会让装包链路发 9001（登记表里没有该 clip）—— 那不是覆盖的本意
            var settings = Resolve(BaseUrl + "?wsu3_clip=");

            Assert.AreEqual(DefaultClip, settings.ProjectClip, "空值应忽略，而不是把 clip 清空");
            Assert.IsFalse(settings.Applied);
            Assert.AreEqual(1, _diagnostics.Count);
        }

        // ── URL 的脏东西 ─────────────────────────────────────────────────

        [Test]
        public void ExtraAmpersandsAndEmptySegments_AreSkipped()
        {
            var settings = Resolve(BaseUrl + "?&&wsu3_test=on&&wsu3_clip=clip_pump&&");

            Assert.IsTrue(settings.Enabled);
            Assert.AreEqual("clip_pump", settings.ProjectClip);
            Assert.AreEqual(0, _diagnostics.Count, "空段不是错误，不该产生诊断");
        }

        [Test]
        public void Fragment_IsNotParsed()
        {
            var settings = Resolve(BaseUrl + "?wsu3_test=on#wsu3_clip=clip_should_be_ignored");

            Assert.IsTrue(settings.Enabled);
            Assert.AreEqual(DefaultClip, settings.ProjectClip, "# 之后的 wsu3_clip 必须被丢掉");
        }

        [Test]
        public void FragmentWithQuestionAndAmpersand_DoesNotAffectEarlierValues()
        {
            var settings = Resolve(BaseUrl + "?a=1&wsu3_test=8&wsu3_clip=clip_pump#frag?x=2&wsu3_clip=bad");

            Assert.AreEqual(TaskType.Structure, settings.TaskType);
            Assert.AreEqual("clip_pump", settings.ProjectClip, "#frag 之后的同名字段不该覆盖前面的值");
        }

        [Test]
        public void DuplicateKeys_LastOneWins()
        {
            var settings = Resolve(BaseUrl + "?wsu3_clip=first&wsu3_clip=second");

            Assert.AreEqual("second", settings.ProjectClip, "后写的覆盖先写的");
        }

        // ── 大小写与空白 ─────────────────────────────────────────────────

        [Test]
        public void KeysAndBooleanWords_AreCaseInsensitive()
        {
            var settings = Resolve(BaseUrl + "?WSU3_TEST=ON&WSU3_CLIP=clip_pump");

            Assert.IsTrue(settings.Enabled, "键名与 on 都该大小写不敏感");
            Assert.AreEqual("clip_pump", settings.ProjectClip);
        }

        [Test]
        public void ValueWhitespace_IsTrimmed()
        {
            var settings = Resolve(BaseUrl + "?wsu3_test= on &wsu3_clip= clip_pump ");

            Assert.IsTrue(settings.Enabled);
            Assert.AreEqual("clip_pump", settings.ProjectClip);
        }

        // ── 覆盖总闸 ─────────────────────────────────────────────────────
        // WHY 这两条最要紧：`allowUrlOverride=false` 是"产品路径完全听序列化字段"的保证，
        // 一旦失守，WebGL 构建就可能被地址栏里的人为参数带偏。

        [Test]
        public void UrlOverrideDisabled_IgnoresTheWholeQuery()
        {
            var settings = Resolve(BaseUrl + "?wsu3_test=on&wsu3_clip=clip_pump", allowUrlOverride: false);

            AssertUntouched(settings, "allowUrlOverride=false");
            Assert.AreEqual(0, _diagnostics.Count, "总闸关掉后连诊断都不该有（URL 此时与我们无关）");
        }

        [Test]
        public void UrlOverrideDisabled_WithoutQuery_IsAlsoUntouched()
        {
            AssertUntouched(Resolve(BaseUrl, allowUrlOverride: false), "allowUrlOverride=false 且无 query");
        }

        // ── 默认值本身就是"关" ───────────────────────────────────────────
        // 产品路径不变的根据：`enabled` 默认 false，没有 URL、没人改 Inspector 时什么都不做。

        [Test]
        public void Resolve_DefaultsToDisabledWithSerializedValues()
        {
            var settings = Resolve(BaseUrl);

            Assert.IsFalse(settings.Enabled, "默认必须是关的（产品路径不变的根据）");
            Assert.AreEqual(TaskType.Structure, settings.TaskType);
            Assert.AreEqual("clip_contactor", settings.ProjectClip);
        }
    }
}
