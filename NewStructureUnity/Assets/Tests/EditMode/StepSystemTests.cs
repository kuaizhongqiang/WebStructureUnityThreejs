using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using WSU3.Contracts;
using WSU3.Contracts.Events;
using WSU3.Core.Interactive;
using WSU3.Core.Steps;
using WSU3.Core.Steps.Conditions;

namespace WSU3.Tests.EditMode
{
    /// <summary>
    /// 记录生命周期并可按需"卡住等待"的替身条件。
    /// 步骤系统的行为大多发生在协程里，光看最终状态看不出"是先重置还是先快进"，
    /// 所以这里把每个阶段与快进/归位都记下来，用**顺序**断言。
    /// </summary>
    public class RecordingCondition : ConditionBase
    {
        public readonly List<string> Log = new List<string>();
        public bool BlockWaiting;
        public int FastCompleteCount;
        public int ResetCount;

        public override ConditionType Type => ConditionType.Default;

        public override IEnumerator Prepare()
        {
            Log.Add("Prepare");
            yield return base.Prepare();
        }

        public override IEnumerator Waiting()
        {
            Log.Add("Waiting");
            yield return base.Waiting();
        }

        public override IEnumerator Complete()
        {
            Log.Add("Complete");
            yield return base.Complete();
        }

        public override IEnumerator FastComplete()
        {
            FastCompleteCount++;
            Log.Add("Fast");
            yield return base.FastComplete();
        }

        protected override IEnumerator OnWaiting()
        {
            if (!BlockWaiting) yield break;
            yield return WaitUntilOrForceComplete(() => false); // 只有 ForceComplete 能让它过去
        }

        protected override void OnReset()
        {
            ResetCount++;
        }

        /// <summary>清账：日志与计数器一起归零（否则跨次执行会把上一次的计数带进来）。</summary>
        public void ClearLog()
        {
            Log.Clear();
            FastCompleteCount = 0;
            ResetCount = 0;
        }

        /// <summary>设置显隐表（protected 字段只有子类碰得到，测试就从子类这侧给）。</summary>
        public void SetVisibility(GameObject show, GameObject hide)
        {
            activeObjects.Clear();
            inactiveObjects.Clear();
            if (show != null) activeObjects.Add(show);
            if (hide != null) inactiveObjects.Add(hide);
        }
    }

    /// <summary>替身面板端口：把回调留在手里，用来验证"面板没关之前流程不会往下走"。</summary>
    public class StubPanelPort : IStepPanelPort
    {
        public readonly List<string> Requests = new List<string>();
        private System.Action<StepPanelResult> pending;

        public void ShowTip(string tipsKey)
        {
            Requests.Add("tip:" + tipsKey);
        }

        public void ShowUi(string uiId, System.Action<StepPanelResult> onClosed)
        {
            Requests.Add("ui:" + uiId);
            pending = onClosed;
        }

        public void ShowQuestion(string questionId, System.Action<StepPanelResult> onAnswered)
        {
            Requests.Add("question:" + questionId);
            pending = onAnswered;
        }

        public void CloseTopPanel()
        {
            // 真实端口"没开着面板时收面板"是无声的：替身也照这个口径记，
            // 否则流程每次复位都会往日志里塞一条 "close"，把请求序列比对的用例带偏
            if (pending != null) Requests.Add("close");
            pending = null;
        }

        public bool HasPending => pending != null;

        public void Answer(StepPanelResult result)
        {
            System.Action<StepPanelResult> callback = pending;
            pending = null;
            callback?.Invoke(result);
        }
    }

    /// <summary>测试用的交互物：只需要"能被拾取体系认出来"，行为一概不要。</summary>
    public class TestInteractive : InteractiveObjBase
    {
    }

    /// <summary>
    /// 步骤系统（进程 → 步骤 → 条件）的 EditMode 测试。
    ///
    /// 为什么能在 EditMode 跑：驱动的推进是**自驱小泵**（`StepManager.CoreUpdate()` 每帧 `MoveNext`），
    /// 等待时间也用 `realtimeSinceStartup` 而不是 `WaitForSeconds` —— 测试手动一帧帧推就行，
    /// 不必依赖播放态（EditMode 下 `Start` / `OnEnable` 不跑，这是踩过的坑，见 docs/PLAN.md 1.16）。
    /// </summary>
    public class StepSystemTests
    {
        private GameObject root;
        private StepManager manager;
        private readonly List<RecordingCondition> conditions = new List<RecordingCondition>();
        private readonly List<string> events = new List<string>();

        [SetUp]
        public void SetUp()
        {
            conditions.Clear();
            events.Clear();
            StepPanelPort.Reset();

            EventBus<StepPreparedEvent>.Subscribe(OnPrepared);
            EventBus<StepWaitingEvent>.Subscribe(OnWaiting);
            EventBus<StepCompletedEvent>.Subscribe(OnCompleted);
            EventBus<StepChangedEvent>.Subscribe(OnChanged);
            EventBus<AllStepsCompletedEvent>.Subscribe(OnAllCompleted);
        }

        [TearDown]
        public void TearDown()
        {
            EventBus<StepPreparedEvent>.Unsubscribe(OnPrepared);
            EventBus<StepWaitingEvent>.Unsubscribe(OnWaiting);
            EventBus<StepCompletedEvent>.Unsubscribe(OnCompleted);
            EventBus<StepChangedEvent>.Unsubscribe(OnChanged);
            EventBus<AllStepsCompletedEvent>.Unsubscribe(OnAllCompleted);

            if (root != null) Object.DestroyImmediate(root);
            root = null;
            manager = null;

            StepPanelPort.Reset();
        }

        // ── 用例 ──────────────────────────────────────────────────────────

        [Test]
        public void Flow_RunsEveryStep_AndReportsFlatProgress()
        {
            BuildHierarchy();

            manager.StartExecution();
            PumpUntilIdle(manager);

            Assert.IsTrue(manager.IsFinished, "流程应该跑完");
            Assert.AreEqual(4, manager.TotalStepCount, "2 个进程 × 2 步");

            for (int i = 0; i < conditions.Count; i++)
            {
                CollectionAssert.AreEqual(
                    new[] { "Prepare", "Waiting", "Complete" },
                    conditions[i].Log,
                    $"第 {i} 个条件的三阶段顺序不对");
            }

            // step:changed 是"进入 Waiting 时"发的：4 步 4 条，序号是扁平序号
            List<string> changed = Filter("changed");
            Assert.AreEqual(4, changed.Count, "每步一条 step:changed");
            Assert.AreEqual("changed:0/4", changed[0]);
            Assert.AreEqual("changed:3/4", changed[3]);

            Assert.AreEqual(1, Filter("all").Count, "全部完成只发一次");
            Assert.IsTrue(events.IndexOf("prepared:0") < events.IndexOf("waiting:0"), "Prepare 先于 Waiting");
        }

        [Test]
        public void Jump_ResetsEverything_ThenFastForwardsThePrefix()
        {
            BuildHierarchy();
            manager.StartExecution();
            PumpUntilIdle(manager);

            // 清账：只看这一次跳转做了什么
            events.Clear();
            for (int i = 0; i < conditions.Count; i++)
            {
                conditions[i].ClearLog();
            }

            manager.JumpToStep(1, 1);
            PumpUntilIdle(manager);

            // 目标之前的 3 步全部快进（不播放、不发事件）
            Assert.AreEqual(1, conditions[0].FastCompleteCount, "P0S0 应被快进");
            Assert.AreEqual(1, conditions[1].FastCompleteCount, "P0S1 应被快进");
            Assert.AreEqual(1, conditions[2].FastCompleteCount, "P1S0 应被快进");

            CollectionAssert.DoesNotContain(conditions[1].Log, "Waiting", "快进的步骤不该进入等待");

            // 目标步骤正常三阶段
            CollectionAssert.AreEqual(
                new[] { "Prepare", "Waiting", "Complete" },
                conditions[3].Log,
                "目标步骤（P1S1）应正常执行");

            // 全员归位：四个条件都被 Reset 过一次
            for (int i = 0; i < conditions.Count; i++)
            {
                Assert.AreEqual(1, conditions[i].ResetCount, $"第 {i} 个条件应被归位一次");
            }

            // 跳转期间只为"真正执行的那一步"发过事件
            Assert.AreEqual(1, Filter("prepared").Count, "快进的步骤不发事件");
            Assert.AreEqual("changed:3/4", Filter("changed")[0], "目标步骤的扁平序号是 3");
        }

        [Test]
        public void NextStep_ForceCompletesTheWaitingCondition()
        {
            BuildHierarchy(blockFirstProcessSecondStep: true);

            manager.StartExecution();
            PumpFrames(manager, 20);

            Assert.IsFalse(manager.IsFinished, "被卡住的等待不该自己过去");
            Assert.AreEqual(1, manager.StepIndex, "应该停在 P0S1");
            Assert.AreEqual(ConditionType.Default, manager.CurrentStep.ConditionType);
            Assert.AreEqual(StepStatus.Waiting, manager.CurrentStep.Condition.Status);

            manager.NextStep();
            PumpUntilIdle(manager);

            Assert.IsTrue(manager.IsFinished, "打断之后应该能继续跑完剩下两步");
            CollectionAssert.Contains(conditions[1].Log, "Complete", "被打断的步骤仍要走完 Complete 阶段");
            Assert.AreEqual(4, Filter("changed").Count, "4 步都进入过等待");
        }

        [Test]
        public void TerminalCondition_FinishesTheWholeFlowImmediately()
        {
            BuildHierarchy();

            // 第一步就是"结束"：后面的步骤一步都不该跑
            var step = manager.Processes[0].GetStep(0);
            step.SetCondition(new ConditionFinish());

            manager.StartExecution();
            PumpUntilIdle(manager);

            Assert.IsTrue(manager.IsFinished);
            Assert.AreEqual(1, Filter("all").Count, "终止型条件直接报全部完成");
            Assert.AreEqual(0, Filter("changed").Count, "终止步骤不进入等待");
        }

        [Test]
        public void StepWithoutCondition_IsTreatedAsImmediate()
        {
            BuildHierarchy();

            manager.Processes[0].GetStep(0).SetCondition(null);

            manager.StartExecution();
            PumpUntilIdle(manager);

            Assert.IsTrue(manager.IsFinished, "空条件的步骤按「立即完成」，不该卡住流程");
            Assert.AreEqual(4, Filter("changed").Count);
        }

        [Test]
        public void UiCondition_WaitsForThePanel_ThenCompletes()
        {
            BuildHierarchy();

            var port = new StubPanelPort();
            StepPanelPort.Register(port);

            var uiCondition = new ConditionUI();
            uiCondition.SetUiId("ui_demo");
            manager.Processes[0].GetStep(0).SetCondition(uiCondition);

            manager.StartExecution();
            PumpFrames(manager, 5);

            Assert.AreEqual(1, port.Requests.Count, "应该向面板端口请求过一次");
            Assert.AreEqual("ui:ui_demo", port.Requests[0]);
            Assert.IsTrue(port.HasPending, "面板还没回执");
            Assert.IsFalse(manager.IsFinished, "面板没关之前流程不该往下走");

            port.Answer(StepPanelResult.Success);
            PumpUntilIdle(manager);

            Assert.IsTrue(manager.IsFinished, "面板回执之后应该能跑完");
        }

        [Test]
        public void UiCondition_WithoutPort_DegradesInsteadOfHanging()
        {
            BuildHierarchy();

            var uiCondition = new ConditionUI();
            uiCondition.SetUiId("ui_demo");
            manager.Processes[0].GetStep(0).SetCondition(uiCondition);

            // 注意：这里**故意不注册**端口
            manager.StartExecution();
            PumpUntilIdle(manager);

            Assert.IsTrue(manager.IsFinished, "端口缺席时降级为直接完成，绝不把流程卡死");
        }

        [Test]
        public void QuestionCondition_RetriesUntilCorrect_OrStopsAtMaxAttempts()
        {
            BuildHierarchy();

            var port = new StubPanelPort();
            StepPanelPort.Register(port);

            var question = new ConditionQuestion();
            question.SetQuestionId("q_demo");
            manager.Processes[0].GetStep(0).SetCondition(question);

            manager.StartExecution();
            PumpFrames(manager, 5);
            Assert.AreEqual("question:q_demo", port.Requests[0], "应该弹过一次题");

            port.Answer(StepPanelResult.Failed); // 答错 → 重问
            PumpFrames(manager, 5);
            Assert.AreEqual(2, port.Requests.Count, "答错要重问");
            Assert.IsFalse(manager.IsFinished, "答错不该放行");

            port.Answer(StepPanelResult.Success);
            PumpUntilIdle(manager);
            Assert.IsTrue(manager.IsFinished, "答对之后应该跑完");
            Assert.AreEqual(2, question.Attempts);
        }

        [Test]
        public void LineConnectCondition_PairsEndpoints_AndCompletesWhenAllPaired()
        {
            BuildHierarchy();

            TestInteractive a = CreateInteractive("endpoint_a");
            TestInteractive b = CreateInteractive("endpoint_b");
            TestInteractive c = CreateInteractive("endpoint_c");
            TestInteractive d = CreateInteractive("endpoint_d");

            var connect = new ConditionLineConnect();
            connect.SetPairs(new[]
            {
                new ConditionLineConnect.LinePair { source = a, target = b },
                new ConditionLineConnect.LinePair { source = c, target = d },
            });

            StepHandler step = manager.Processes[0].GetStep(0);
            step.SetCondition(connect);

            manager.StartExecution();
            PumpFrames(manager, 3);

            Assert.AreEqual(StepStatus.Waiting, connect.Status, "连线条件应该进入等待");
            Assert.AreEqual(2, connect.PairCount);
            Assert.AreEqual(0, connect.PairedCount);

            Click(connect, a);
            Assert.AreEqual(0, connect.SelectedIndex, "点源端点应被选中");

            Click(connect, c);
            Assert.AreEqual(1, connect.SelectedIndex, "点另一个源端点应换选");

            Click(connect, d);
            Assert.AreEqual(1, connect.PairedCount, "选中的源 + 对应目标 = 配对成功");
            Assert.AreEqual(-1, connect.SelectedIndex, "配对成功后清掉选中态");

            Click(connect, a);
            Click(connect, b);
            Assert.AreEqual(2, connect.PairedCount, "两组都配上");

            PumpUntilIdle(manager);

            Assert.IsTrue(manager.IsFinished, "全部配对之后这一步应该完成");
            Assert.IsNotNull(step.transform.Find("LineConnectBoard"), "应该创建连线画板（常驻线）");
        }

        // ── 跳转打断的收尾（面板 / 泵内重入 / 结束语义）────────────────────

        [Test]
        public void Jump_InterruptsPendingPanel_ClosesIt_AndLateResultIsIgnored()
        {
            BuildHierarchy();

            var port = new StubPanelPort();
            StepPanelPort.Register(port);

            var uiCondition = new ConditionUI();
            uiCondition.SetUiId("ui_demo");
            manager.Processes[0].GetStep(0).SetCondition(uiCondition);

            manager.StartExecution();
            PumpFrames(manager, 3);
            Assert.IsTrue(port.HasPending, "面板应该正在等回执");

            manager.JumpToStep(1, 0);

            Assert.IsFalse(port.HasPending, "跳转要先把面板收掉，否则它会一直盖在新步骤上面");
            CollectionAssert.Contains(port.Requests, "close", "应该向面板端口发过 CloseTopPanel");

            PumpUntilIdle(manager);
            Assert.IsTrue(manager.IsFinished, "收掉面板之后流程要能继续跑完");
        }

        [Test]
        public void JumpRequestedFromInsideAStepEvent_IsDeferredInsteadOfSwallowed()
        {
            BuildHierarchy();

            bool jumped = false;
            void OnStepWaiting(StepWaitingEvent e)
            {
                if (jumped) return;
                jumped = true;
                manager.JumpToStep(1, 1); // 事件是在泵内发的：这次跳转不能立刻清栈
            }

            EventBus<StepWaitingEvent>.Subscribe(OnStepWaiting);
            try
            {
                manager.StartExecution();
                PumpUntilIdle(manager);
                PumpUntilIdle(manager); // 延后执行的跳转会有第二轮
            }
            finally
            {
                EventBus<StepWaitingEvent>.Unsubscribe(OnStepWaiting);
            }

            Assert.IsTrue(jumped, "用例本身要真的触发过泵内跳转");
            Assert.IsTrue(manager.IsFinished, "泵内跳转被吞掉的症状是「流程停住」");
            Assert.AreEqual(3, manager.FlatStepIndex, "应该停在 P1S1（扁平 3）");
        }

        [Test]
        public void NextStep_AfterFinish_DoesNotReplayTheWholeFlow()
        {
            BuildHierarchy();
            manager.StartExecution();
            PumpUntilIdle(manager);

            Assert.IsTrue(manager.IsFinished);
            int completions = Filter("all").Count;

            manager.NextStep();
            PumpFrames(manager, 5);

            Assert.IsTrue(manager.IsFinished, "流程已结束，「下一步」不该把它重新跑起来");
            Assert.AreEqual(completions, Filter("all").Count, "不该再报一次全部完成");
        }

        [Test]
        public void Jump_PastTerminalCondition_StillEndsTheTask()
        {
            BuildHierarchy();
            manager.Processes[0].GetStep(0).SetCondition(new ConditionFinish());

            manager.StartExecution();
            PumpUntilIdle(manager);
            Assert.IsTrue(manager.IsFinished);
            int completions = Filter("all").Count;

            // 跳到"结束"之后的步骤：快进路径同样要走到"任务完成"，不能被悄悄绕过
            manager.JumpToStep(1, 1);
            PumpUntilIdle(manager);

            Assert.IsTrue(manager.IsFinished, "终止型条件在快进路径上也要生效");
            Assert.AreEqual(completions + 1, Filter("all").Count);
        }

        // ── 快进与归位的状态等价（"状态一致"这条基准的抓手）────────────────

        [Test]
        public void FastForwardedSteps_ApplyVisibility_AndEndAsComplete()
        {
            BuildHierarchy();

            var revealed = new GameObject("revealed");
            revealed.transform.SetParent(root.transform, false);
            revealed.SetActive(false);

            RecordingCondition first = conditions[0];
            first.SetVisibility(revealed, null); // P0S0 负责揭示它

            manager.StartExecution();
            PumpUntilIdle(manager);
            Assert.IsTrue(revealed.activeSelf, "正常走过 P0S0 时它应该是显示的");

            revealed.SetActive(false);
            manager.JumpToStep(1, 1); // P0S0 变成"前缀步骤"，要走快进
            PumpUntilIdle(manager);

            Assert.IsTrue(revealed.activeSelf, "快进也必须跑 Prepare 的显隐表，否则跳转后与一步步走过不一致");
            Assert.AreEqual(StepStatus.Complete, first.Status, "快进过的步骤状态应是「已完成」");
            Assert.AreEqual(1, first.FastCompleteCount, "P0S0 应被快进一次");
        }

        [Test]
        public void Reset_HidesInteractionTargets_RevealedByTheStep()
        {
            BuildHierarchy();

            TestInteractive target = CreateInteractive("click_target");
            target.gameObject.SetActive(false);

            var click = new ConditionClick();
            click.SetTarget(target);
            manager.Processes[0].GetStep(0).SetCondition(click);

            manager.StartExecution();
            PumpFrames(manager, 3);
            Assert.IsTrue(target.gameObject.activeSelf, "进入这一步应揭示目标");

            manager.JumpToStep(0, 1); // 面板/交互物还亮着就跳走

            Assert.IsFalse(target.gameObject.activeSelf, "归位要把这一步揭示的东西一起收回去");
        }

        [Test]
        public void PrevStep_SkipsProcessesWithoutSteps()
        {
            BuildThreeProcessHierarchy(emptyFirstProcess: true);

            // 步骤间停顿调大：让流程停在"目标步骤刚好走完"的那一刻，好断言落点
            manager.StepDelaySeconds = 10f;

            manager.JumpToStep(2, 0);
            PumpFrames(manager, 1);
            Assert.AreEqual(2, manager.ProcessIndex);

            manager.PrevStep();
            PumpFrames(manager, 1);

            Assert.AreEqual(1, manager.ProcessIndex, "空的进程 0 要跳过，落到进程 1 的最后一步");
            Assert.AreEqual(0, manager.StepIndex);
        }

        [Test]
        public void WebPanelPort_OutsideWebGl_DegradesInsteadOfWaitingForever()
        {
            Assert.AreNotEqual(
                RuntimePlatform.WebGLPlayer,
                Application.platform,
                "这条用例只在「没有页面桥」的环境里有意义（编辑器 / 独立播放器）");

            BuildHierarchy();

            var port = new WSU3.Web.WebStepPanelPort();
            StepPanelPort.Register(port);

            var uiCondition = new ConditionUI();
            uiCondition.SetUiId("ui_demo");
            manager.Processes[0].GetStep(0).SetCondition(uiCondition);

            manager.StartExecution();
            PumpUntilIdle(manager);

            Assert.IsTrue(manager.IsFinished, "没有页面桥时要当场降级放行，而不是无限等一个回不来的面板");
        }

        // ── 脚手架 ────────────────────────────────────────────────────────

        private TestInteractive CreateInteractive(string objectName)
        {
            var go = new GameObject(objectName);
            go.transform.SetParent(root.transform, false);
            return go.AddComponent<TestInteractive>();
        }

        /// <summary>把一次点击直接交给条件（真实链路里这一步由 StepManager 转发）。</summary>
        private static void Click(ConditionLineConnect condition, InteractiveObjBase target)
        {
            GlobalInteractionEventData data =
                GlobalInteractionEventData.Get(target, GlobalInteractionType.Click);
            condition.OnInteraction(data);
            data.Release();
        }

        /// <summary>搭一个 2 进程 × 2 步的层级（步骤先建、组件后加：避开收集时的告警噪声）。</summary>
        private void BuildHierarchy(bool blockFirstProcessSecondStep = false)
        {
            root = new GameObject("StepRoot");

            for (int p = 0; p < 2; p++)
            {
                var processObject = new GameObject($"Process_{p}");
                processObject.transform.SetParent(root.transform, false);

                for (int s = 0; s < 2; s++)
                {
                    var stepObject = new GameObject($"Step_{p}_{s}");
                    stepObject.transform.SetParent(processObject.transform, false);

                    var step = stepObject.AddComponent<StepHandler>();
                    var condition = new RecordingCondition
                    {
                        BlockWaiting = blockFirstProcessSecondStep && p == 0 && s == 1,
                    };
                    conditions.Add(condition);
                    step.SetCondition(condition);
                }

                processObject.AddComponent<ProcessingHandler>();
            }

            manager = root.AddComponent<StepManager>();
            manager.StepDelaySeconds = 0f; // 测试不等步骤间停顿

            // 显式收集一次：EditMode 下组件的生命周期触发时机不可靠（Awake 未必在 AddComponent 时跑），
            // 而"收集"本身就是幂等的公开入口（编辑器面板上也有这个按钮）。
            manager.Collect();
            Assert.AreEqual(
                4,
                manager.TotalStepCount,
                $"层级没被收集（root 子节点数={root.transform.childCount}）：检查 BuildHierarchy 的搭建顺序");
        }

        /// <summary>三个进程，每个 1 步；`emptyFirstProcess` 时把进程 0 的步骤拿掉（专门试"跳过空进程"）。</summary>
        private void BuildThreeProcessHierarchy(bool emptyFirstProcess)
        {
            root = new GameObject("StepRoot");

            for (int p = 0; p < 3; p++)
            {
                var processObject = new GameObject($"Process_{p}");
                processObject.transform.SetParent(root.transform, false);

                bool skipSteps = emptyFirstProcess && p == 0;
                if (!skipSteps)
                {
                    var stepObject = new GameObject($"Step_{p}_0");
                    stepObject.transform.SetParent(processObject.transform, false);

                    var step = stepObject.AddComponent<StepHandler>();
                    var condition = new RecordingCondition();
                    conditions.Add(condition);
                    step.SetCondition(condition);
                }

                processObject.AddComponent<ProcessingHandler>();
            }

            manager = root.AddComponent<StepManager>();
            manager.StepDelaySeconds = 0f;
            manager.Collect();
        }

        private static void PumpFrames(StepManager target, int frames)
        {
            for (int i = 0; i < frames; i++)
            {
                target.CoreUpdate();
            }
        }

        private static void PumpUntilIdle(StepManager target, int maxFrames = 5000)
        {
            for (int i = 0; i < maxFrames; i++)
            {
                target.CoreUpdate();
                if (!target.IsRunning) return;
            }

            Assert.Fail($"{maxFrames} 帧还没跑完：多半是某个等待条件永不成立");
        }

        private List<string> Filter(string kind)
        {
            var result = new List<string>();
            for (int i = 0; i < events.Count; i++)
            {
                if (events[i].StartsWith(kind + ":")) result.Add(events[i]);
            }
            return result;
        }

        private void OnPrepared(StepPreparedEvent e) => events.Add($"prepared:{e.FlatIndex}");
        private void OnWaiting(StepWaitingEvent e) => events.Add($"waiting:{e.FlatIndex}");
        private void OnCompleted(StepCompletedEvent e) => events.Add($"completed:{e.FlatIndex}");
        private void OnChanged(StepChangedEvent e) => events.Add($"changed:{e.StepIndex}/{e.StepTotal}");
        private void OnAllCompleted(AllStepsCompletedEvent e) => events.Add($"all:{e.TaskType}");
    }
}
