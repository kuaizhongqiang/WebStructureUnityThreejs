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
    ///   · `Prepare`：`ApplyObjectsActive()`（showObj 显 / hideObj 隐）+ `HideAnimations()`（动画归位 = 隐藏）
    ///     + `OnPrepare()`（子类隐藏交互物 / 关面板 / 取消临时线）；
    ///   · `Waiting`：`ShowAnimationsAtFirstFrame()`（定格首帧）+ `RequestTips()` + `OnWaiting()`（子类显示交互物并等待）；
    ///   · `Complete`：`OnCompleteHide()` + `PlayAnimations()` + 等播完 + `HideAnimationsOnComplete()`。
    ///
    /// ⚠️ 归位阶段是**隐藏**动画物体，**不是**定格第一帧 —— 定格首帧只发生在目标步骤进入 `Waiting` 时。
    /// 这条是跳转后状态能一致的关键（`docs/design/10` §3.2）。
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

            ApplyObjectsActive();   // 显隐只在 Prepare 设定一次
            HideAnimations();       // 动画归位 = 隐藏（不是定格首帧）

            yield return OnPrepare();
        }

        public virtual IEnumerator Waiting()
        {
            Status = StepStatus.Waiting;

            ShowAnimationsAtFirstFrame();   // 目标步骤才定格首帧
            RequestTips();

            yield return OnWaiting();

            Status = StepStatus.Complete;
        }

        public virtual IEnumerator Complete()
        {
            OnCompleteHide();

            PlayAnimations();
            yield return WaitAnimationsDone();
            HideAnimationsOnComplete();
        }

        public virtual IEnumerator FastComplete()
        {
            OnCompleteHide();

            StopAtLastFrame();              // 不播放，直接定格末帧
            HideAnimationsOnComplete();

            // 快进也是"这一步已经过去了"：状态要走到 Completed，否则"快进过的步骤"与"真跑完的步骤"两套状态互相矛盾
            Status = StepStatus.Complete;

            yield break;
        }

        public void ForceComplete()
        {
            forceComplete = true;
        }

        public void ResetCondition()
        {
            forceComplete = false;
            Status = StepStatus.Ready;

            HideAnimations();
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

        /// <summary>显隐：activeObjects 显示、inactiveObjects 隐藏（Prepare 时调用一次）。</summary>
        protected void ApplyObjectsActive()
        {
            SetActive(activeObjects, true);
            SetActive(inactiveObjects, false);
        }

        /// <summary>
        /// 所有动画物体归位：`SetActive(false)`。
        /// 这里**只要求有 Animation 组件**，不要求 clip 可用 —— 归位是"把它藏起来"，
        /// 不该因为某一步忘了配 clip 就漏掉一个还亮着的物体。
        /// </summary>
        protected void HideAnimations()
        {
            for (int i = 0; i < animations.Count; i++)
            {
                AnimationStruct slot = animations[i];
                if (slot.animation == null)
                {
                    Debug.LogWarning($"[Step] {step?.Path} 的 animations[{i}] 缺 animation 组件，HideAnimations 已跳过。");
                    continue;
                }
                slot.animation.gameObject.SetActive(false);
            }
        }

        /// <summary>动画物体显示 + 定格**首帧**（`normalizedTime=0` → Play/Sample/Stop）。</summary>
        protected void ShowAnimationsAtFirstFrame()
        {
            SampleAnimations(0f);
        }

        /// <summary>动画物体显示 + 定格**末帧**（`normalizedTime=1` → Play/Sample/Stop），用来呈现"已完成"。</summary>
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

                slot.animation.gameObject.SetActive(true);
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

        /// <summary>按 `ifHideOnFinish` 隐藏动画物体（正常完成与快进都调）。</summary>
        protected void HideAnimationsOnComplete()
        {
            for (int i = 0; i < animations.Count; i++)
            {
                AnimationStruct slot = animations[i];
                if (!slot.ifHideOnFinish) continue;
                if (!IsAnimationUsable(slot, "HideAnimationsOnComplete", i, out _)) continue;
                slot.animation.gameObject.SetActive(false);
            }
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

                slot.animation.gameObject.SetActive(true);
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

        /// <summary>动画槽位可用性检查（缺引用时告警一次并跳过，不做静默失败）。</summary>
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

        /// <summary>等条件成立，或被强制完成。**所有阻塞点都必须用这个**。</summary>
        protected IEnumerator WaitUntilOrForceComplete(Func<bool> predicate)
        {
            if (predicate == null) yield break;
            while (!predicate() && !forceComplete)
            {
                yield return null;
            }
        }

        /// <summary>等一段真实时间（用 `realtimeSinceStartup` 而不是 `WaitForSeconds`：
        /// 步骤推进由 `StepManager.CoreUpdate` 逐帧泵驱动，这样在编辑器测试里也能手动推进）。</summary>
        protected IEnumerator WaitSecondsOrForceComplete(float seconds)
        {
            float deadline = Time.realtimeSinceStartup + Mathf.Max(0f, seconds);
            while (!forceComplete && Time.realtimeSinceStartup < deadline)
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

            while (!predicate() && !forceComplete && Time.realtimeSinceStartup < deadline)
            {
                yield return null;
            }

            // 只有"因为超时"退出才算超时：条件已成立、或被强制完成，都不该再报超时
            if (timeoutSeconds > 0f && !forceComplete && !predicate())
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
    /// 一个动画槽位：Legacy `Animation` + `clip` + 播完是否隐藏该物体。
    /// ⚠️ `clip` 必须**非循环**，否则 Complete 阶段的"等播完"要靠超时护栏兜底。
    /// </summary>
    [Serializable]
    public struct AnimationStruct
    {
        [Tooltip("持有 Legacy Animation 的物体")]
        public Animation animation;
        [Tooltip("⚠️ 必须是非循环动画")]
        public AnimationClip clip;
        [Tooltip("播完之后是否隐藏这个动画物体")]
        public bool ifHideOnFinish;
    }
}
