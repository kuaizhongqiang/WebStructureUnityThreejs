using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using WSU3.Contracts;
using WSU3.Contracts.Events;
using WSU3.Core.Interactive;
using WSU3.Core.Managers;
using WSU3.Core.Steps.Conditions;

namespace WSU3.Core.Steps
{
    /// <summary>
    /// 步骤导演：三级结构（**进程 → 步骤 → 条件**）的唯一驱动者，挂在内容场景的根节点上。
    ///
    /// 三条核心原则（设计见 `docs/design/10-step-system.md`）：
    ///   ① **所有跳转都从 P0S0 重置**：先 `ResetAllConditions()` 全员归位，再从第 0 进程第 0 步
    ///      快速执行到目标 —— 跳转的代价与距离成正比，换来的是动画/显隐状态**永远一致**；
    ///   ② **三阶段生命周期**：`Prepare → Waiting → Complete`，跳转时对"目标之前的步骤"走
    ///      `FastComplete()`（定格末帧，不播放），对目标步骤走正常三阶段；
    ///   ③ **协作式打断**：`NextStep / SkipCurrentStep / CompleteCurrentStep` 都走 `ForceComplete()`，
    ///      让 Waiting 里的等待循环尽快退出，而不是靠轮询硬拽。
    ///
    /// **三种走法**（前两种是"怎么到达某一步"，第三种是"整条流程怎么跑"，见 <see cref="StepRunMode"/>）：
    ///   · 一步一步（默认）—— 每个条件阻塞等待交互/条件成立；
    ///   · 跳步快进 —— `FastForwardStep`：目标之前的步骤 `FastComplete`（定格末帧、不播、不等）；
    ///   · 动画运行 —— 条件**不等**（跳过 waiting 判断），其余全按流程走，看起来就是动画一路自动执行到最后。
    ///
    /// 为什么不直接用 `StartCoroutine`：本类的推进是**自驱小泵**（`Stack<IEnumerator>` + 每帧 `MoveNext`），
    /// 与 `TaskFlowManager` 同一套写法。好处有两个：`InputGate.ShouldUpdate` 能直接管住"容器不可见时先别推进"；
    /// 编辑器测试里可以手动 `CoreUpdate()` 一帧帧推，不必等真实帧循环。
    ///
    /// 交互事件由本类统一转发：条件**不自己订阅** `EventBus`（非 MonoBehaviour 没有 `OnDestroy` 兜底，
    /// 自订阅就是漏退订的温床），只有处于 `Waiting` 的那一个条件会收到 `OnInteraction`。
    /// </summary>
    [DisallowMultipleComponent]
    public class StepManager : MonoBehaviour
    {
        /// <summary>当前场景的步骤导演（内容场景重建时会换成新的实例）。</summary>
        public static StepManager Instance { get; private set; }

        [Tooltip("场景开始后自动从 P0S0 执行")]
        [SerializeField] private bool autoStart;

        [Tooltip("步骤之间的停顿（秒）：0.5 是常规手感，0 = 不等待（测试/连播）")]
        [SerializeField] private float stepDelaySeconds = 0.5f;

        [Tooltip("把每次步骤切换打到 Console（排查流程问题时打开）")]
        [SerializeField] private bool logTransitions = true;

        [Tooltip("步骤运行模式：\n" +
                 "· StepByStep 一步一步来（默认）：每个条件阻塞等待交互/条件成立；\n" +
                 "· Animation   动画运行：条件**不等**（跳过 waiting 判断），其余（Prepare / 完成 / 动画 / 事件）全按流程走，\n" +
                 "              看起来就是动画一步一步自动执行到最后")]
        [SerializeField] private StepRunMode runMode = StepRunMode.StepByStep;

        private readonly List<ProcessingHandler> processes = new List<ProcessingHandler>();
        private readonly Stack<IEnumerator> routines = new Stack<IEnumerator>();

        private ConditionBase currentCondition;
        private StepHandler currentStep;
        private int processIndex = -1;
        private int stepIndex = -1;
        private int flatIndex = -1;
        private int totalSteps;
        private int lastPublishedProcess = -1;
        private float startedAt;
        private bool isFinished;

        /// <summary>是否正在泵里推进（泵内发起的导航不能立刻清栈，见 <see cref="Restart"/>）。</summary>
        private bool pumping;

        /// <summary>泵内登记的跳转（等这一轮推进结束再执行）。</summary>
        private bool hasPendingRestart;
        private int pendingProcess;
        private int pendingStep;

        // ── 对外状态（诊断 / Inspector / 桥都用这些，不另设第二份）──────────

        public IReadOnlyList<ProcessingHandler> Processes => processes;
        public int ProcessCount => processes.Count;
        public int TotalStepCount => totalSteps;
        public int ProcessIndex => processIndex;
        public int StepIndex => stepIndex;
        public int FlatStepIndex => flatIndex;
        public StepHandler CurrentStep => currentStep;
        public bool IsRunning => routines.Count > 0;
        public bool IsFinished => isFinished;

        /// <summary>步骤间停顿（秒）。测试里设 0 可以让流程瞬间跑完。</summary>
        public float StepDelaySeconds
        {
            get => stepDelaySeconds;
            set => stepDelaySeconds = Mathf.Max(0f, value);
        }

        /// <summary>
        /// 步骤运行模式（**公开可改**：其他脚本 / 桥 / Inspector 都能切）。
        ///
        /// 与"一步一步"并列的第三种走法（另两种见 <see cref="StepRunMode"/> 的说明：正常推进 vs 跳步快进）。
        ///
        /// **切到动画模式时会立刻放行"正在等待的那一步"**：否则界面看着像没生效 ——
        /// 用户把类型改成动画、画面却还停在"等你点"，而实现上是"等下一次等待口才生效"。
        /// 放行方式是 <see cref="ConditionBase.AdvanceWithoutWaiting"/>（让它的等待循环下一帧自然退出），
        /// **不是** `ForceComplete`：这一步是"本来就不必等"，不是"被打断"。
        /// </summary>
        public StepRunMode RunMode
        {
            get => runMode;
            set
            {
                if (runMode == value) return;

                runMode = value;
                if (logTransitions)
                {
                    Debug.Log($"[Step] 运行模式 → {DescribeRunMode(value)}");
                }

                if (value == StepRunMode.Animation && IsRunning && !isFinished && currentCondition != null)
                {
                    if (logTransitions)
                    {
                        Debug.Log($"[Step] 动画运行：正在等待的 {currentStep?.Path} 不再等条件，放行。");
                    }
                    currentCondition.AdvanceWithoutWaiting();
                }
            }
        }

        /// <summary>是否处于"动画运行模式"（等价于 <c>RunMode == StepRunMode.Animation</c>）。</summary>
        public bool IsAnimationMode => runMode == StepRunMode.Animation;

        /// <summary>切到动画运行模式（语义化入口，供桥 / 脚本调用）。</summary>
        public void EnterAnimationMode()
        {
            RunMode = StepRunMode.Animation;
        }

        /// <summary>切回一步一步模式（语义化入口）。</summary>
        public void EnterStepByStepMode()
        {
            RunMode = StepRunMode.StepByStep;
        }

        private static string DescribeRunMode(StepRunMode mode)
        {
            return mode == StepRunMode.Animation ? "动画运行（条件不等待，按流程走完）" : "一步一步";
        }

        /// <summary>执行开始到现在的毫秒数（随 `task:completed` 上报）。</summary>
        public long ElapsedMs => (long)((Time.realtimeSinceStartup - startedAt) * 1000f);

        // ── 生命周期 ──────────────────────────────────────────────────────

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                // 多实例是沉默故障：两个导演各自推进、各自转发交互，一次点击能推两步，而画面上看不出来。
                // 所以这里不只是喊一声：后来的这个**彻底不参与**（不抢 Instance、不收集、不订阅）。
                Debug.LogError(
                    $"[Step] 场景里已经有 StepManager（{Instance.name}），又来了一个（{name}）：后者已停用。" +
                    "步骤系统按「场景内唯一导演」设计，请只保留一个。");
                enabled = false;
                return;
            }

            Instance = this;

            Collect();

            // 订阅放在 Awake：EditMode 测试里 `Start` / `OnEnable` 不会跑（生命周期的坑，见 docs/PLAN.md 1.16）
            EventBus<GlobalInteractionEventData>.Subscribe(OnGlobalInteraction);
            EventBus<StepNextRequestEvent>.Subscribe(OnNextRequest);
            EventBus<StepJumpRequestEvent>.Subscribe(OnStepJumpRequest);
            EventBus<ProcessingJumpRequestEvent>.Subscribe(OnProcessingJumpRequest);
        }

        private void Start()
        {
            if (autoStart) StartExecution();
        }

        private void Update()
        {
            // 容器不可见时只停"步骤推进"（渲染循环不停，见 InputGate 的口径）
            if (!InputGate.ShouldUpdate) return;
            CoreUpdate();
        }

        private void OnDestroy()
        {
            EventBus<GlobalInteractionEventData>.Unsubscribe(OnGlobalInteraction);
            EventBus<StepNextRequestEvent>.Unsubscribe(OnNextRequest);
            EventBus<StepJumpRequestEvent>.Unsubscribe(OnStepJumpRequest);
            EventBus<ProcessingJumpRequestEvent>.Unsubscribe(OnProcessingJumpRequest);

            routines.Clear();
            currentCondition = null;
            currentStep = null;

            if (Instance == this) Instance = null;
        }

        /// <summary>
        /// 推进一帧（由 `Update` 调；编辑器测试里直接调它来手动跑流程）。
        /// 只支持 `yield return null` 与 `yield return 另一个 IEnumerator` 两种写法 ——
        /// 等待时间一律用 `WaitSecondsOrForceComplete`（真实时间循环），这样自驱泵与测试都能推得动。
        /// </summary>
        public void CoreUpdate()
        {
            // 泵内登记过的跳转在这里生效（见 Restart 的说明）
            ApplyPendingRestartIfAny();

            pumping = true;
            try
            {
                PumpLoop();
            }
            finally
            {
                pumping = false;
            }

            // 泵这一轮跑空了：期间登记的跳转同帧内立刻生效，不必再等一帧
            ApplyPendingRestartIfAny();
        }

        private void PumpLoop()
        {
            while (routines.Count > 0)
            {
                if (isFinished)
                {
                    routines.Clear();
                    break;
                }

                IEnumerator top = routines.Peek();

                bool moved;
                try
                {
                    moved = top.MoveNext();
                }
                catch (Exception e)
                {
                    Debug.LogError($"[Step] 步骤协程抛异常，已中断这条协程：{e}");
                    routines.Pop();
                    continue;
                }

                if (!moved)
                {
                    routines.Pop();
                    continue;
                }

                if (top.Current is IEnumerator nested)
                {
                    routines.Push(nested); // 同一帧进入嵌套协程
                    continue;
                }

                return; // yield null：本帧到此为止
            }
        }

        // ── 三级收集 ──────────────────────────────────────────────────────

        /// <summary>按层级收集进程/步骤（可重复调用：先清后收）。</summary>
        public void Collect()
        {
            processes.Clear();
            totalSteps = 0;

            for (int i = 0; i < transform.childCount; i++)
            {
                Transform child = transform.GetChild(i);
                ProcessingHandler process = child.GetComponent<ProcessingHandler>();
                if (process == null)
                {
                    Debug.LogWarning(
                        $"[Step] StepManager 的子节点 '{child.name}' 没有 ProcessingHandler 组件，已跳过。" +
                        "步骤系统的层级是 StepManager → ProcessingHandler → StepHandler。");
                    continue;
                }

                processes.Add(process);
            }

            for (int p = 0; p < processes.Count; p++)
            {
                int count = processes[p].Collect();
                for (int s = 0; s < count; s++)
                {
                    StepHandler step = processes[p].GetStep(s);
                    step.Place(p, s, totalSteps + s);
                }
                totalSteps += count;
            }

            if (processes.Count == 0)
            {
                Debug.LogWarning("[Step] 没有收集到任何进程（StepManager 下面没有 ProcessingHandler），步骤系统待命。");
            }
            else if (logTransitions)
            {
                Debug.Log($"[Step] 已收集 {processes.Count} 个进程 / {totalSteps} 个步骤。");
            }
        }

        // ── 导航 ──────────────────────────────────────────────────────────

        /// <summary>从 P0S0 开始执行（跳转语义，会先全员归位）。</summary>
        public void StartExecution()
        {
            Restart(0, 0);
        }

        /// <summary>跳到指定进程的指定步骤（全量重置 + 快进前缀）。</summary>
        public void JumpToStep(int process, int step)
        {
            Restart(process, step);
        }

        /// <summary>在当前进程内跳转。</summary>
        public void JumpToStep(int step)
        {
            Restart(Mathf.Max(0, processIndex), step);
        }

        /// <summary>跳到某进程的第 0 步。</summary>
        public void JumpToProcessing(int process)
        {
            Restart(process, 0);
        }

        /// <summary>同 <see cref="JumpToProcessing"/>。</summary>
        public void SetProcessing(int process)
        {
            Restart(process, 0);
        }

        /// <summary>同 <see cref="JumpToStep(int, int)"/>；两个名字都留着，免得调用方记哪个是哪个。</summary>
        public void SetStep(int process, int step)
        {
            Restart(process, step);
        }

        /// <summary>上一步（同进程上一步 / 上一进程最后一步）。</summary>
        public void PrevStep()
        {
            if (processIndex < 0)
            {
                StartExecution();
                return;
            }

            if (stepIndex > 0)
            {
                Restart(processIndex, stepIndex - 1);
                return;
            }

            // 往前找第一个"确实有步骤"的进程：空进程直接跳过（否则 PrevStep 会静默无响应）
            for (int p = processIndex - 1; p >= 0; p--)
            {
                if (processes[p].StepCount > 0)
                {
                    Restart(p, processes[p].StepCount - 1);
                    return;
                }
            }

            // 前面没有非空进程了：已经是最开头。**别重放** —— 那会把"上一步"变成"回到起点再演一遍"
            Debug.Log("[Step] 已经是第一步，「上一步」被忽略。");
        }

        /// <summary>强制完成当前步骤，进入下一步（协作式打断）。</summary>
        public void NextStep()
        {
            if (isFinished)
            {
                // 已跑完还按"下一步"：重跑一遍会再发一次 task:completed、用时也被重置，那不是"下一步"的意思
                Debug.LogWarning($"[Step] {name} 的流程已经结束，「下一步」被忽略。要重放请用 StartExecution()。");
                return;
            }

            if (!IsRunning)
            {
                StartExecution();
                return;
            }

            ForceCurrentComplete();
        }

        /// <summary>同 <see cref="NextStep"/>。</summary>
        public void SkipCurrentStep()
        {
            NextStep();
        }

        /// <summary>同 <see cref="NextStep"/>。</summary>
        public void CompleteCurrentStep()
        {
            NextStep();
        }

        /// <summary>停止推进并全员归位（不销毁任何物体）。</summary>
        public void StopExecution()
        {
            routines.Clear();
            hasPendingRestart = false;

            // 面板是"外面"的东西：停流程时要把它收掉，不然它会盖在下一个场景/步骤上面
            StepPanelPort.CloseTopPanel();

            ResetAllConditions();

            currentStep = null;
            currentCondition = null;
            processIndex = -1;
            stepIndex = -1;
            flatIndex = -1;
            lastPublishedProcess = -1;
            isFinished = false;
        }

        // ── 流程（协程）──────────────────────────────────────────────────

        /// <summary>
        /// 所有跳转的唯一入口：**全员归位 → 从 P0S0 快进到目标 → 目标正常执行 → 继续往后推进**。
        ///
        /// ⚠️ 泵内不能立刻执行：`CoreUpdate` 正拿着栈顶协程的引用在 `MoveNext`，
        /// 这时候 `Clear + Push` 会让它返回后把**刚压进去的跳转协程**当成"跑完的旧协程"弹掉 ——
        /// 表现是"跳转被静默吞掉、流程停住"。所以泵内只登记目标，等这一轮推进结束再执行。
        /// </summary>
        private void Restart(int process, int step)
        {
            if (pumping)
            {
                hasPendingRestart = true;
                pendingProcess = process;
                pendingStep = step;
                return;
            }

            ApplyRestart(process, step);
        }

        private void ApplyPendingRestartIfAny()
        {
            if (!hasPendingRestart) return;

            hasPendingRestart = false;
            ApplyRestart(pendingProcess, pendingStep);
        }

        private void ApplyRestart(int process, int step)
        {
            // 每次跳转都重新收集：运行期增删过节点的话，扁平序号与总数才是当下的
            Collect();

            if (processes.Count == 0)
            {
                Debug.LogWarning("[Step] 没有可执行的进程，跳转被忽略。");
                return;
            }

            if (process < 0 || process >= processes.Count)
            {
                Debug.LogWarning($"[Step] 进程下标 {process} 越界（共 {processes.Count} 个），已忽略跳转。");
                return;
            }

            int stepCount = processes[process].StepCount;
            if (stepCount == 0)
            {
                Debug.LogWarning($"[Step] 进程 {process} 没有步骤，已忽略跳转。");
                return;
            }

            if (step < 0 || step >= stepCount)
            {
                Debug.LogWarning($"[Step] 步骤下标 {step} 越界（进程 {process} 共 {stepCount} 步），已忽略跳转。");
                return;
            }

            // ① 打断：等效 StopAllCoroutines（清空自驱泵）
            routines.Clear();

            // ①' 打断的收尾：面板在"外面"（DOM 层），清泵不会替我们把它关掉；
            //     不关的话它会一直盖在新步骤上面，而流程看起来一切正常。
            StepPanelPort.CloseTopPanel();

            // ② 全员归位：所有条件 Reset + 动画隐藏
            ResetAllConditions();

            // ③ 从 P0S0 重放
            isFinished = false;
            startedAt = Time.realtimeSinceStartup;
            processIndex = 0;
            stepIndex = 0;
            flatIndex = 0;
            lastPublishedProcess = -1;
            currentStep = null;
            currentCondition = null;

            if (logTransitions)
            {
                Debug.Log($"[Step] 跳转 → P{process}S{step}（从 P0S0 重置后快进，共 {totalSteps} 步）");
            }

            routines.Push(JumpRoutine(process, step));
        }

        /// <summary>从 P0S0 走（或快进）到目标，然后继续正常推进。</summary>
        private IEnumerator JumpRoutine(int targetProcess, int targetStep)
        {
            for (int p = 0; p < processes.Count; p++)
            {
                for (int s = 0; s < processes[p].StepCount; s++)
                {
                    if (p == targetProcess && s == targetStep)
                    {
                        yield return ExecuteStep(p, s);
                        if (isFinished) yield break;

                        yield return StepDelay();
                        if (isFinished) yield break;

                        yield return RunAfter(p, s);
                        yield break;
                    }

                    // 目标之前的步骤：快进（不播放、不等待、不发事件）
                    yield return FastForwardStep(p, s);
                    if (isFinished) yield break;
                }
            }

            // 目标不存在（收集之后层级变了？）：老老实实收尾
            FinishAll();
        }

        /// <summary>目标之后的步骤：正常三阶段推进，直到流程结束。</summary>
        private IEnumerator RunAfter(int fromProcess, int fromStep)
        {
            for (int p = fromProcess; p < processes.Count; p++)
            {
                int start = p == fromProcess ? fromStep + 1 : 0;
                for (int s = start; s < processes[p].StepCount; s++)
                {
                    yield return ExecuteStep(p, s);
                    if (isFinished) yield break;

                    yield return StepDelay();
                    if (isFinished) yield break;
                }
            }

            FinishAll();
        }

        /// <summary>正常三阶段：Prepare → Waiting → Complete，每阶段完成发事件。</summary>
        private IEnumerator ExecuteStep(int process, int step)
        {
            StepHandler target = processes[process].GetStep(step);
            if (target == null)
            {
                Debug.LogWarning($"[Step] P{process}S{step} 取不到步骤节点，已跳过。");
                yield break;
            }

            currentStep = target;
            currentCondition = target.Condition;
            processIndex = process;
            stepIndex = step;
            flatIndex = target.FlatIndex;

            if (process != lastPublishedProcess)
            {
                lastPublishedProcess = process;
                EventBus<ProcessChangedEvent>.Publish(new ProcessChangedEvent(process, processes[process]));
            }

            // 终止型条件（"结束"）：不执行三阶段，直接报全部完成
            if (currentCondition != null && currentCondition.IsTerminal)
            {
                target.SetLifecycle(StepLifecycle.Done);
                currentCondition = null;
                if (logTransitions) Debug.Log($"[Step] 遇到终止型步骤 {target.Path}，流程结束。");
                FinishAll();
                yield break;
            }

            if (currentCondition == null)
            {
                // 空条件算不上错误，但必须喊出来：静默的"没有条件"最难查
                Debug.LogWarning($"[Step] 步骤 {target.Path} 没有条件（condition 为空），已按「立即完成」处理。");
            }

            // ── 阶段一：Prepare ──
            target.SetLifecycle(StepLifecycle.Prepare);
            if (currentCondition != null)
            {
                yield return currentCondition.Prepare();
            }
            else
            {
                yield return null;
            }
            EventBus<StepPreparedEvent>.Publish(
                new StepPreparedEvent(target, process, step, target.FlatIndex));

            // ── 阶段二：Waiting（进入时定格首帧，并广播进度）──
            target.SetLifecycle(StepLifecycle.Waiting);
            if (logTransitions)
            {
                Debug.Log($"[Step] {target.Path} 进入等待（{target.ConditionType}，{target.DisplayName}）" +
                          (IsAnimationMode ? "［动画运行：不等条件］" : "") + "。");
            }
            EventBus<StepWaitingEvent>.Publish(
                new StepWaitingEvent(target, process, step, target.FlatIndex));
            EventBus<StepChangedEvent>.Publish(
                new StepChangedEvent(target.FlatIndex, totalSteps, target.DisplayName));

            if (currentCondition != null)
            {
                // WHY（动画运行模式）：**不是**跳过整个 Waiting 阶段，而是"进了 Waiting、只是不等"。
                //   `Waiting()` 里还有"定格首帧"与"请求提示"，跳过它会让首帧没定格、动画从当前位置乱跳；
                //   而 `AdvanceWithoutWaiting()` 只是让等待循环立刻退出 —— 显隐 / 动画 / 事件三条路径
                //   与正常模式完全同源，只有"等不等"这一处不同（正是需求要的"跳过 waiting 判断，其他按流程"）。
                if (IsAnimationMode)
                {
                    currentCondition.AdvanceWithoutWaiting();
                }

                yield return currentCondition.Waiting();
            }
            else
            {
                yield return null;
            }

            // ── 阶段三：Complete ──
            target.SetLifecycle(StepLifecycle.Complete);
            if (currentCondition != null)
            {
                yield return currentCondition.Complete();
            }
            else
            {
                yield return null;
            }
            EventBus<StepCompletedEvent>.Publish(
                new StepCompletedEvent(target, process, step, target.FlatIndex));

            target.SetLifecycle(StepLifecycle.Done);
            currentCondition = null; // 步骤结束后不再收交互事件
        }

        /// <summary>
        /// 快进一个步骤：不播放、不等待，把这一步"当作已经走完"。
        ///
        /// ⚠️ 必须**先 Prepare 再 FastComplete**：Prepare 里才有显隐表（`activeObjects/inactiveObjects`）。
        /// 少了这一段，"跳过去的"与"一步步走过去的"显隐状态就不一样 —— 直接违背"状态一致"。
        /// 走一遍 Prepare 的开销可以忽略（只是 SetActive 与几个字段），换来的是两条路径真正等价。
        /// </summary>
        private IEnumerator FastForwardStep(int process, int step)
        {
            StepHandler target = processes[process].GetStep(step);
            if (target == null) yield break;

            currentStep = target;
            currentCondition = target.Condition;
            processIndex = process;
            stepIndex = step;
            flatIndex = target.FlatIndex;

            if (currentCondition != null)
            {
                if (currentCondition.IsTerminal)
                {
                    // 终止型条件在快进路径上也要"走到即结束"，与正常推进同口径；
                    // 否则目标是"结束"之后的步骤时，整任务的完成语义会被悄悄绕过。
                    target.SetLifecycle(StepLifecycle.Done);
                    currentCondition = null;
                    FinishAll();
                    yield break;
                }

                yield return currentCondition.Prepare();
                yield return currentCondition.FastComplete();
            }

            target.SetLifecycle(StepLifecycle.Done);
            currentCondition = null;
        }

        private IEnumerator StepDelay()
        {
            if (stepDelaySeconds <= 0f) yield break;

            float deadline = Time.realtimeSinceStartup + stepDelaySeconds;
            while (Time.realtimeSinceStartup < deadline)
            {
                yield return null;
            }
        }

        private void FinishAll()
        {
            if (isFinished) return;

            isFinished = true;
            currentCondition = null;

            TaskType taskType = GlobalManager.Exists ? GlobalManager.CurrentTaskType : TaskType.None;
            float score = 0f; // 成绩体系未建（见 docs/PLAN.md）：先按 0 报，别假装有分数
            long elapsed = ElapsedMs;

            if (logTransitions)
            {
                Debug.Log($"[Step] 全部步骤完成（taskType={taskType}，用时 {elapsed}ms）。");
            }

            EventBus<AllStepsCompletedEvent>.Publish(new AllStepsCompletedEvent(taskType, score, elapsed));
        }

        /// <summary>全员归位：所有条件 `ResetCondition()` + 生命周期回 Idle。</summary>
        private void ResetAllConditions()
        {
            for (int p = 0; p < processes.Count; p++)
            {
                for (int s = 0; s < processes[p].StepCount; s++)
                {
                    StepHandler stepNode = processes[p].GetStep(s);
                    if (stepNode == null) continue;

                    stepNode.Condition?.ResetCondition();
                    stepNode.SetLifecycle(StepLifecycle.Idle);
                }
            }
        }

        /// <summary>强制完成当前步骤（所有入口都用它，保证打断口径一致）。</summary>
        private void ForceCurrentComplete()
        {
            if (currentCondition != null)
            {
                currentCondition.ForceComplete();
                return;
            }

            // 刚 Restart 完、泵还没跑到第一步的那一小段窗口：currentStep 也是 null。
            // 这里不能按"下一步"猜位置 —— processIndex/stepIndex 刚被重置成 0，
            // 猜出来的目标（P0S1）跟用户想的（跳转目标之后再下一步）完全不是一回事。
            if (currentStep == null)
            {
                Debug.LogWarning("[Step] 流程刚复位、还没进入任何步骤，「下一步」被忽略。");
                return;
            }

            // 没有条件（或刚好处在阶段间隙）：没有可打断的等待，直接推进一步
            if (currentStep != null)
            {
                NextAfterGap();
            }
        }

        /// <summary>阶段间隙里的"下一步"：当前步骤已结束但泵里没有待推进协程时的兜底。</summary>
        private void NextAfterGap()
        {
            int p = Mathf.Max(0, processIndex);
            int s = stepIndex + 1;

            if (s >= processes[p].StepCount)
            {
                if (p + 1 >= processes.Count)
                {
                    FinishAll();
                    return;
                }
                Restart(p + 1, 0);
                return;
            }

            Restart(p, s);
        }

        // ── 交互转发与入口事件 ────────────────────────────────────────────

        private void OnGlobalInteraction(GlobalInteractionEventData e)
        {
            // 只有"正在等待"的那一个条件会收到事件
            if (currentCondition == null || currentCondition.Status != StepStatus.Waiting) return;
            currentCondition.OnInteraction(e);
        }

        private void OnNextRequest(StepNextRequestEvent e)
        {
            NextStep();
        }

        private void OnStepJumpRequest(StepJumpRequestEvent e)
        {
            JumpToStep(e.StepIndex);
        }

        private void OnProcessingJumpRequest(ProcessingJumpRequestEvent e)
        {
            JumpToStep(e.ProcessIndex, e.StepIndex);
        }
    }

    /// <summary>
    /// 步骤运行模式：**整条流程怎么跑**（与"一步一步 / 跳步快进"那种"怎么到达某一步"是两件事）。
    ///
    /// · <see cref="StepByStep"/> —— 一步一步来（默认）：每个条件阻塞等待交互 / 条件成立。
    /// · <see cref="Animation"/>    —— 动画运行：条件的 `Waiting` 阶段照走（照样定格首帧、照样发事件、照样播动画），
    ///   但**不等条件成立**，于是流程自动一路推进到结束，看起来就是"动画一步一步执行到最后"。
    ///   适合做演示 / 自动播放：不需要学生点，也不用真的走一遍跳步快进。
    ///
    /// ⚠️ 动画模式下"点击/答题/连线"这类交互条件不会被满足，因此它们的效果是**动画走到位**，
    ///   而不是"用户点了才走"。要恢复交互把模式切回 <see cref="StepByStep"/> 即可。
    /// </summary>
    public enum StepRunMode
    {
        /// <summary>一步一步（默认）。</summary>
        StepByStep = 0,

        /// <summary>动画运行：条件不等待，其余按流程走。</summary>
        Animation = 1,
    }
}
