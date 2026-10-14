using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using WSU3.Core.Interactive;
using WSU3.Core.Interfaces;

namespace WSU3.Core.Steps.Conditions
{
    /// <summary>
    /// 步骤条件基类：**一个条件 = 一个步骤的"数据 + 行为"**（设计见 `docs/design/10-step-system.md`）。
    ///
    /// 为什么数据挂在条件上：条件字段随具体类型而不同（点击要目标、答题要题号、连线要配对表），
    /// 用 `[SerializeReference]` 多态序列化后，Inspector 里**每个步骤只显示自己那套字段**，
    /// 不必在 `StepHandler` 上摊开一堆"只有某几种类型才用得上"的空字段。
    ///
    /// 三阶段里基类做什么（子类只写钩子）：
    ///   · `Prepare`：`ApplyObjectsActive()`（showObj 显 / hideObj 隐）+ `PrepareAnimations()`（动画归位）+ `OnPrepare()`；
    ///   · `Waiting`：`SampleAnimationsAtFirstFrame()`（定格首帧）+ `RequestTips()` + `OnWaiting()`；
    ///   · `Complete`：`OnCompleteHide()` + `PlayAnimations()` + 等播完。
    ///
    /// ⚠️ **显隐的唯一来源是 activeObjects / inactiveObjects 两张表**（2026-10-14 改，负责人定）。
    /// 动画槽位**只管动画**：不再 `SetActive` —— 早先"动画归位 = 隐藏动画物体"的做法等于让动画暗中接管了显隐，
    /// 于是"这一步该看见什么"无处可查，两张表也被架空。现在：
    ///   · 物体要在某步露出 / 收起 → 写进那一步的两张表；
    ///   · 物体在某步要播动画 → 放进动画槽位（**它必须在那一刻是可见的**，否则动画跑了也看不见）。
    /// </summary>
    [Serializable]
    public abstract class ConditionBase : ICondition
    {
        // ── 编辑期数据（Inspector）────────────────────────────────────────

        [Header("显隐")]
        [Tooltip("Prepare 阶段要显示的物体（步骤的可见性由这两张表决定）")]
        [SerializeField] protected List<GameObject> activeObjects = new List<GameObject>();
        [Tooltip("Prepare 阶段要隐藏的物体")]
        [SerializeField] protected List<GameObject> inactiveObjects = new List<GameObject>();

        [Header("动画")]
        [Tooltip("本步骤的动画（Legacy Animation）。⚠️ clip 必须是非循环动画，否则「播完」永不成立")]
        [SerializeField] protected List<AnimationStruct> animations = new List<AnimationStruct>();

        [Header("提示与音频")]
        [Tooltip("提示 ID：进入 Waiting 时经教学面板端口请求（怎么显示由 Web 决定），**不阻塞**流程")]
        [SerializeField] protected string tipsKey;
        [Tooltip("音频 ID：预留字段，播放要等资源装载落地（见 docs/PLAN.md P2-6）")]
        [SerializeField] protected string audioKey;

        // ── 运行时 ────────────────────────────────────────────────────────

        /// <summary>所属步骤（由 `StepHandler` 绑定时回填；Inspector 数据不依赖它）。</summary>
        protected StepHandler step;

        /// <summary>协作式打断标记：置位后所有等待循环尽快退出。</summary>
        protected bool forceComplete;

        /// <summary>
        /// "这一步不等人"标记（动画运行模式置位，见 <see cref="AdvanceWithoutWaiting"/>）。
        /// 与 <see cref="forceComplete"/> 分开，是因为"不等"不是"被打断" —— 诊断要能区分这两件事。
        /// </summary>
        protected bool advanceWithoutWaiting;

        /// <summary>所属步骤。</summary>
        public StepHandler Step => step;

        /// <summary>条件状态（`Ready` / `Waiting` / `Complete`）。</summary>
        public StepStatus Status { get; private set; } = StepStatus.Ready;

        /// <summary>本条件的类型标签（由具体类给出，不序列化 —— 与类不符的字段是纯麻烦）。</summary>
        public abstract ConditionType Type { get; }

        /// <summary>终止型条件：让整条流程直接报"全部完成"。</summary>
        public virtual bool IsTerminal => false;

        /// <summary>是否已被强制完成（诊断用）。</summary>
        public bool IsForceCompleted => forceComplete;

        // ── 只读诊断面（编辑器校验与测试要看这四张表；字段本身仍是 protected）────

        /// <summary>Prepare 时要显示的物体（只读）。</summary>
        public IReadOnlyList<GameObject> ActiveObjects => activeObjects;

        /// <summary>Prepare 时要隐藏的物体（只读）。</summary>
        public IReadOnlyList<GameObject> InactiveObjects => inactiveObjects;

        /// <summary>动画槽位（只读）。</summary>
        public IReadOnlyList<AnimationStruct> Animations => animations;

        /// <summary>提示 ID（只读）。</summary>
        public string TipsKey => tipsKey;

        /// <summary>音频 ID（只读，本期未播放）。</summary>
        public string AudioKey => audioKey;

        /// <summary>绑定时回填所属步骤；`StepHandler` 在 `Awake` 与收集时各调一次（幂等）。</summary>
        internal void Bind(StepHandler owner)
        {
            step = owner;
        }

        // ── ICondition：协程三阶段 ────────────────────────────────────────

        public virtual IEnumerator Prepare()
        {
            forceComplete = false;
            Status = StepStatus.Ready;

            ApplyObjectsActive();   // 显隐的唯一落点（两张表）
            PrepareAnimations();    // 动画归位（不动显隐）

            yield return OnPrepare();
        }

        public virtual IEnumerator Waiting()
        {
            Status = StepStatus.Waiting;

            SampleAnimationsAtFirstFrame();   // 目标步骤才定格首帧
            RequestTips();

            yield return OnWaiting();

            Status = StepStatus.Complete;
        }

        public virtual IEnumerator Complete()
        {
            OnCompleteHide();

            PlayAnimations();
            yield return WaitAnimationsDone();
        }

        public virtual IEnumerator FastComplete()
        {
            OnCompleteHide();

            StopAtLastFrame();              // 不播放，直接定格末帧

            // 快进也是"这一步已经过去了"：状态要走到 Completed，否则"快进过的步骤"与"真跑完的步骤"两套状态互相矛盾
            Status = StepStatus.Complete;

            yield break;
        }

        public void ForceComplete()
        {
            forceComplete = true;
        }

        /// <summary>
        /// 本条件**不再阻塞等待**，下一次 <see cref="Waiting"/> 立刻返回（供"动画运行模式"用，
        /// 见 <c>StepManager.StepRunMode.Animation</c>）。
        ///
        /// WHY 单独一个入口、而不是复用 <see cref="ForceComplete"/>：
        ///   ① 语义不同 —— `ForceComplete` 是"外部把这一步提前结掉"，会置 `IsForceCompleted`（诊断要看见）；
        ///      本方法是"这一步本来就不等人"，不是被打断，不该把自己标记成"被强制完成"污染诊断。
        ///   ② 它**不改**状态机：`Waiting()` 照常把 Status 置成 Waiting、照常定格首帧、照常请求提示，
        ///      只是不等条件成立。于是"动画模式"与"正常模式"在**显隐 / 动画 / 事件**上走完全同一条路径，
        ///      唯一差别就是"等不等" —— 这正是"跳过 waiting 判断、其他都按流程走"的准确含义。
        /// </summary>
        public void AdvanceWithoutWaiting()
        {
            advanceWithoutWaiting = true;
        }

        public void ResetCondition()
        {
            forceComplete = false;
            advanceWithoutWaiting = false;
            Status = StepStatus.Ready;

            PrepareAnimations();
            OnReset();
        }

        // ── 子类钩子 ─────────────────────────────────────────────────────

        /// <summary>阶段一子类部分：隐藏交互物 / 关面板 / 取消临时线。</summary>
        protected virtual IEnumerator OnPrepare()
        {
            yield break;
        }

        /// <summary>阶段二子类部分：显示交互物并等待条件成立（阻塞点用 <see cref="WaitUntilOrForceComplete"/>）。</summary>
        protected virtual IEnumerator OnWaiting()
        {
            yield break;
        }

        /// <summary>阶段三子类部分：隐藏交互物 / 关面板（正常完成与快进都要走）。</summary>
        protected virtual void OnCompleteHide()
        {
        }

        /// <summary>归位时的清理（清选中态、清临时线、销毁临时物体）。</summary>
        protected virtual void OnReset()
        {
        }

        /// <summary>
        /// 交互事件的**唯一入口**：由 `StepManager` 在步骤处于 Waiting 时转发（条件不自己订阅事件 ——
        /// 非 MonoBehaviour 的对象没有 `OnDestroy` 兜底，自订阅就是漏退订的温床）。
        /// </summary>
        public virtual void OnInteraction(GlobalInteractionEventData e)
        {
        }

        // ── 状态操作原语（StepHandler 侧的统一口径）────────────────────────

        /// <summary>显隐：activeObjects 显示、inactiveObjects 隐藏（Prepare 时调用一次）。**唯一的显隐落点。**</summary>
        protected void ApplyObjectsActive()
        {
            SetActive(activeObjects, true);
            SetActive(inactiveObjects, false);
        }

        /// <summary>
        /// 动画归位：把每个槽位的动画停掉、状态回到 0（**不动显隐** —— 显隐归两张表管）。
        /// 这里**只要求有 Animation 组件**，不要求 clip 可用 —— 归位是"让动画回到起点"，
        /// 不该因为某一步忘了配 clip 就漏掉一个还在播的物体。
        /// </summary>
        protected void PrepareAnimations()
        {
            for (int i = 0; i < animations.Count; i++)
            {
                AnimationStruct slot = animations[i];
                if (slot.animation == null)
                {
                    Debug.LogWarning($"[Step] {step?.Path} 的 animations[{i}] 缺 animation 组件，PrepareAnimations 已跳过。");
                    continue;
                }

                // WHY: Stop() 会把变换留在当前位置，所以还要显式回 0 帧，否则"归位"归不回去。
                slot.animation.Stop();
                if (slot.clip != null && slot.animation[slot.clip.name] != null)
                {
                    slot.animation[slot.clip.name].normalizedTime = 0f;
                    slot.animation.Sample();
                    slot.animation.Stop();
                }
            }
        }

        /// <summary>动画定格**首帧**（`normalizedTime=0` → Play/Sample/Stop）。</summary>
        protected void SampleAnimationsAtFirstFrame()
        {
            SampleAnimations(0f);
        }

        /// <summary>动画定格**末帧**（`normalizedTime=1` → Play/Sample/Stop），用来呈现"已完成"。</summary>
        protected void StopAtLastFrame()
        {
            SampleAnimations(1f);
        }

        /// <summary>播放动画（`Complete` 阶段的"有过程"版本）。</summary>
        protected void PlayAnimations()
        {
            for (int i = 0; i < animations.Count; i++)
            {
                AnimationStruct slot = animations[i];
                if (!IsAnimationUsable(slot, "PlayAnimations", i, out string name)) continue;
                if (!IsAnimationVisible(slot, "PlayAnimations", i)) continue;

                slot.animation.Play(name);
            }
        }

        /// <summary>是否有动画正在播（Complete 阶段的等待判据）。</summary>
        protected bool AnyAnimationPlaying()
        {
            for (int i = 0; i < animations.Count; i++)
            {
                AnimationStruct slot = animations[i];
                if (slot.animation == null) continue;
                if (slot.animation.isPlaying) return true;
            }
            return false;
        }

        /// <summary>
        /// 精确控帧三连：`normalizedTime` → `Play` → `Sample` → `Stop`。
        /// `Sample` 把指定帧的变换应用到物体上，`Stop` 让它"粘"在那帧不动。
        /// </summary>
        private void SampleAnimations(float normalizedTime)
        {
            for (int i = 0; i < animations.Count; i++)
            {
                AnimationStruct slot = animations[i];
                if (!IsAnimationUsable(slot, "SampleAnimations", i, out string name)) continue;
                if (!IsAnimationVisible(slot, "SampleAnimations", i)) continue;

                slot.animation.Play(name);

                AnimationState state = slot.animation[name];
                if (state != null)
                {
                    state.normalizedTime = normalizedTime;
                }
                else
                {
                    Debug.LogWarning($"[Step] {step?.Path} 的动画 {slot.animation.name} 取不到状态 '{name}'，无法定格帧。");
                }

                slot.animation.Sample();
                slot.animation.Stop();
            }
        }

        /// <summary>
        /// 等动画播完。**带超时护栏**：循环动画会让"播完"永不成立（`docs/design/10` §2 的硬约束），
        /// 与其静默卡死整条流程，不如到时告警并往下走。
        /// </summary>
        private IEnumerator WaitAnimationsDone()
        {
            if (animations.Count == 0) yield break;

            float guard = Mathf.Max(1f, MaxClipLength() + 1f);
            float deadline = Time.realtimeSinceStartup + guard;

            while (!forceComplete && AnyAnimationPlaying() && Time.realtimeSinceStartup < deadline)
            {
                yield return null;
            }

            if (!forceComplete && AnyAnimationPlaying())
            {
                Debug.LogWarning(
                    $"[Step] {step?.Path} 的动画超过 {guard:0.##}s 仍未播完（是不是循环动画？）。" +
                    "已完成等待并继续流程；请检查 clip 的 Loop 设置。");
            }
        }

        private float MaxClipLength()
        {
            float max = 0f;
            for (int i = 0; i < animations.Count; i++)
            {
                AnimationClip clip = animations[i].clip;
                if (clip != null && clip.length > max) max = clip.length;
            }
            return max;
        }

        /// <summary>
        /// 动画槽位可用性检查（缺引用时告警一次并跳过，不做静默失败）。
        /// </summary>
        private bool IsAnimationUsable(AnimationStruct slot, string from, int index, out string clipName)
        {
            clipName = null;
            if (slot.animation == null || slot.clip == null)
            {
                Debug.LogWarning($"[Step] {step?.Path} 的 animations[{index}] 缺 animation 或 clip，{from} 已跳过。");
                return false;
            }

            clipName = slot.clip.name;
            if (slot.animation[clipName] == null)
            {
                Debug.LogWarning(
                    $"[Step] {step?.Path} 的动画 {slot.animation.name} 里没有 clip '{clipName}'" +
                    $"（clip 必须加进 Animation 组件的 Animations 列表），{from} 已跳过。");
                return false;
            }
            return true;
        }

        /// <summary>
        /// 动画物体此刻可见吗？不可见就**不播**，并明确告警。
        ///
        /// WHY 要有这一道（2026-10-14 显隐改由两张表管之后新增的护栏）：
        ///   Legacy `Animation` 对**已隐藏**的物体不会推进（`Play` 调得下去，但 `isPlaying` 恒为 false、
        ///   画面也不动）。而上层是靠 `AnyAnimationPlaying()` 判"播完"的 —— 于是一个被隐藏的动画槽位会让
        ///   该步骤**瞬间"播完"**，看起来像"动画没执行"，却不报任何错。
        ///   这里把它变成一句看得见的日志：问题从"动画莫名不播"变成"这一步没把这个物体放进 activeObjects"。
        /// </summary>
        private bool IsAnimationVisible(AnimationStruct slot, string from, int index)
        {
            if (slot.animation == null) return false;
            if (slot.animation.gameObject.activeInHierarchy) return true;

            Debug.LogWarning(
                $"[Step] {step?.Path} 的 animations[{index}]（物体 '{slot.animation.gameObject.name}'）当前是隐藏的，" +
                $"{from} 已跳过 —— 隐藏的物体播不了动画。要让它在这一步可见，把它加进该步骤的 activeObjects；" +
                "显隐一律由 activeObjects / inactiveObjects 两张表负责。");
            return false;
        }

        private static void SetActive(List<GameObject> objects, bool value)
        {
            if (objects == null) return;
            for (int i = 0; i < objects.Count; i++)
            {
                GameObject go = objects[i];
                if (go == null) continue;   // 空槽位由 Inspector 校验提示，运行期跳过
                go.SetActive(value);
            }
        }

        /// <summary>进入 Waiting 时请求提示（不阻塞；端口不在就静默跳过）。</summary>
        private void RequestTips()
        {
            if (string.IsNullOrEmpty(tipsKey)) return;
            StepPanelPort.ShowTip(tipsKey);
        }

        // ── 给子类用的等待工具（都必须能被 ForceComplete 打断）────────────

        /// <summary>
        /// 所有等待循环的统一退出判据：**被强制完成**，或**这一步本来就不等人**（动画运行模式）。
        ///
        /// 合成一处是为了"漏掉一个等待口"不可能发生 —— 早先每个循环各写一遍 `!forceComplete`，
        /// 新增一种"不等"的来源时最危险的失误就是漏改其中一个，而症状是"某个条件类型在动画模式下卡住"，
        /// 极难定位。
        /// </summary>
        protected bool ShouldStopWaiting => forceComplete || advanceWithoutWaiting;

        /// <summary>等条件成立，或被强制完成 / 动画模式不等人。**所有阻塞点都必须用这个**。</summary>
        protected IEnumerator WaitUntilOrForceComplete(Func<bool> predicate)
        {
            if (predicate == null) yield break;
            while (!predicate() && !ShouldStopWaiting)
            {
                yield return null;
            }
        }

        /// <summary>等一段真实时间（用 `realtimeSinceStartup` 而不是 `WaitForSeconds`：
        /// 步骤推进由 `StepManager.CoreUpdate` 逐帧泵驱动，这样在编辑器测试里也能手动推进）。</summary>
        protected IEnumerator WaitSecondsOrForceComplete(float seconds)
        {
            float deadline = Time.realtimeSinceStartup + Mathf.Max(0f, seconds);
            while (!ShouldStopWaiting && Time.realtimeSinceStartup < deadline)
            {
                yield return null;
            }
        }

        /// <summary>
        /// 等条件成立 / 被强制完成 / **超时**（三者最先发生者）。
        /// `timeoutSeconds &lt;= 0` 表示不限时（默认）：等交互的场景里"学生可能真的在想很久"，
        /// 不能替他做决定；只有明确知道"这东西会有去无回"时才配超时。
        /// 超时退出时回调 `onTimeout`，调用方据此告警并按降级处理。
        /// </summary>
        protected IEnumerator WaitUntilOrForceCompleteOrTimeout(
            Func<bool> predicate, float timeoutSeconds, Action onTimeout)
        {
            if (predicate == null) yield break;

            float deadline = timeoutSeconds > 0f
                ? Time.realtimeSinceStartup + timeoutSeconds
                : float.PositiveInfinity;

            while (!predicate() && !ShouldStopWaiting && Time.realtimeSinceStartup < deadline)
            {
                yield return null;
            }

            // 只有"因为超时"退出才算超时：条件已成立、被强制完成、或本来就不等人，都不该再报超时
            if (timeoutSeconds > 0f && !ShouldStopWaiting && !predicate())
            {
                onTimeout?.Invoke();
            }
        }
    }

    /// <summary>
    /// 条件类型标签（编辑期可读性 + 上层识别用）。
    /// ⚠️ 具体条件由**类**决定（`[SerializeReference]` 多态），本枚举只作标签；
    /// `Start` 是早期占位，与 `Default` 同义（"立即完成"）。
    /// `Drag` / `Tool` 本期未实现（见 `docs/design/10-step-system.md`）。
    /// </summary>
    [Serializable]
    public enum ConditionType
    {
        [InspectorName("开始")]
        Start = 0,
        [InspectorName("结束")]
        Finish = 1,
        [InspectorName("问题")]
        Question = 2,
        [InspectorName("点击")]
        Click = 3,
        [InspectorName("UI")]
        UI = 4,
        [InspectorName("拖拽")]
        Drag = 5,
        [InspectorName("工具")]
        Tool = 6,
        [InspectorName("默认")]
        Default = 7,
        [InspectorName("连线配对")]
        LineConnect = 8,
    }

    /// <summary>条件状态：就绪 / 等待中 / 已完成。</summary>
    [Serializable]
    public enum StepStatus
    {
        [InspectorName("就绪")]
        Ready = 0,
        [InspectorName("等待")]
        Waiting = 1,
        [InspectorName("完成")]
        Complete = 2,
    }

    /// <summary>
    /// 一个动画槽位：Legacy `Animation` + `clip`。
    /// ⚠️ `clip` 必须**非循环**，否则 Complete 阶段的"等播完"要靠超时护栏兜底。
    /// ⚠️ **本槽位只管动画，不管显隐**（2026-10-14 改）：原先的 `ifHideOnFinish` 已删除 ——
    ///     "播完要不要藏起来"归该步骤的 `inactiveObjects` 管，两处都能藏会让显隐无从查起。
    /// </summary>
    [Serializable]
    public struct AnimationStruct
    {
        [Tooltip("持有 Legacy Animation 的物体（**必须在该步骤可见**，否则动画跑了也看不见）")]
        public Animation animation;
        [Tooltip("⚠️ 必须是非循环动画")]
        public AnimationClip clip;
    }
}
