using System;
using System.Collections;
using UnityEngine;
using WSU3.Core.Interactive;

namespace WSU3.Core.Steps.Conditions
{
    /// <summary>
    /// 点击条件：点击指定交互物即完成。
    ///
    /// 点击由 `InteractiveManager` 统一检测（`ScreenPointToRay + Physics.Raycast`）后经
    /// `GlobalInteractionEventData` 派发；本条件**不自己订阅**事件，等 `StepManager` 在 Waiting 期间转发
    /// （见 `ConditionBase.OnInteraction` 的说明）。
    ///
    /// **碰撞体闸门**（2026-10-14 负责人定）：拾取是物理射线，所以"能不能点" = "碰撞体开没开"。于是本条件
    /// 按自己的生命周期开关 **target 自己的碰撞体**：
    ///   `Prepare` 关 → `Waiting` 开 → 完成后关；跳转归位（`OnReset`）也关。
    /// 效果：**全场最多只有一个可点**（当前步骤的那个），其余零件即使可见也点不动 ——
    /// 不会出现"所有零件都能点、随便点就跳步"。
    ///
    /// ⚠️ 闸门只管**碰撞体**，不动物体的显隐 —— 显隐归 `ConditionBase` 的 activeObjects / inactiveObjects 两张表。
    ///   这也是它与 <see cref="toggleTargetActive"/> 的分工：后者管"物体本身露不露面"，前者管"露着的时候能不能点"。
    /// </summary>
    [Serializable]
    public class ConditionClick : ConditionBase
    {
        [Tooltip("要点击的交互物（必须挂了 InteractiveObjBase，否则拾取体系认不到它）")]
        [SerializeField] private InteractiveObjBase target;

        [Tooltip("由步骤负责揭示物体：Prepare 隐藏、Waiting 显示、完成后再隐藏。\n\n" +
                 "物体本来就在场景里、显隐另有安排（走两张显隐表）时**关掉它** —— " +
                 "否则同一个物体被两个开关管着，出问题无从查起")]
        [SerializeField] private bool toggleTargetActive = true;

        // WHY: 可空 + 运行期兜底解析（见 ResolveTargetCollider）—— 老资产里这个槽位是空的，
        //      不该要求逐条手工拖；只有"目标身上有多个碰撞体、要指定非第一个"时才需要手工填。
        [Tooltip("要开关的碰撞体（留空 ⇒ 运行期取 target 自己身上的第一个 Collider）")]
        [SerializeField] private Collider targetCollider;

        private bool clicked;

        public override ConditionType Type => ConditionType.Click;

        /// <summary>点击目标（诊断 / 编辑器用）。</summary>
        public InteractiveObjBase Target => target;

        /// <summary>被闸门开关的碰撞体（诊断 / 编辑器用；未解析时可能为 null）。</summary>
        public Collider TargetCollider => targetCollider;

        /// <summary>运行期指定点击目标（内容装配与测试用；编辑器里走 Inspector）。</summary>
        public void SetTarget(InteractiveObjBase value)
        {
            target = value;
            targetCollider = null;   // 换了目标就得重新解析，否则还在开关上一个物体的碰撞体
        }

        protected override IEnumerator OnPrepare()
        {
            clicked = false;

            // ① 碰撞体闸门：进这一步先关掉（"condition 初始化时找到 collider 然后关闭掉"）
            SetTargetColliderEnabled(false);

            // ② 物体显隐（多数步骤应当关掉 toggleTargetActive，改由两张显隐表负责）
            if (toggleTargetActive && target != null)
            {
                target.gameObject.SetActive(false);
            }

            yield break;
        }

        protected override IEnumerator OnWaiting()
        {
            if (target == null)
            {
                Debug.LogWarning($"[Step] {step?.Path} 的点击条件没有配 target，已按「立即完成」处理。");
                yield break;
            }

            if (toggleTargetActive)
            {
                target.gameObject.SetActive(true);
            }

            // 碰撞体闸门：生命周期走到 Waiting 才打开 —— "当前步骤唯一可点"的落点
            SetTargetColliderEnabled(true);

            yield return WaitUntilOrForceComplete(() => clicked);
        }

        protected override void OnCompleteHide()
        {
            // 过完这一步立刻关掉，别让它继续可点
            SetTargetColliderEnabled(false);

            if (toggleTargetActive && target != null)
            {
                target.gameObject.SetActive(false);
            }
        }

        protected override void OnReset()
        {
            clicked = false;

            SetTargetColliderEnabled(false);

            // 归位要连带"揭示"一起收回去：不然跳走之后，这一步的目标会一直亮在屏幕上
            if (toggleTargetActive && target != null)
            {
                target.gameObject.SetActive(false);
            }
        }

        public override void OnInteraction(GlobalInteractionEventData e)
        {
            if (e == null || e.Type != GlobalInteractionType.Click) return;
            if (target == null || e.Target != target) return;

            clicked = true;
        }

        /// <summary>
        /// 开关 target 的碰撞体（闸门的唯一落点）。
        ///
        /// 只改 `enabled`，**不动显隐**：物体照常渲染、动画照常播，只是射线打不到它。
        /// 碰撞体缺失时把问题说清楚 —— 没有碰撞体的交互物本来就点不到，静默失败最难查。
        /// </summary>
        private void SetTargetColliderEnabled(bool value)
        {
            Collider collider = ResolveTargetCollider();
            if (collider == null) return;

            collider.enabled = value;
        }

        /// <summary>取要开关的碰撞体：优先 Inspector 指定的，否则取 target 自己身上的第一个并缓存下来。</summary>
        private Collider ResolveTargetCollider()
        {
            if (targetCollider != null) return targetCollider;

            if (target == null)
            {
                Debug.LogWarning($"[Step] {step?.Path} 的点击条件没有配 target，碰撞体闸门无法生效。");
                return null;
            }

            // WHY: 用 GetComponent（**不含子物体**）—— 目标零件自己的碰撞体才是拾取命中的那个；
            //      往子物体找可能抓到别的零件的碰撞体，把不该开的门开了。
            targetCollider = target.GetComponent<Collider>();
            if (targetCollider == null)
            {
                Debug.LogWarning(
                    $"[Step] {step?.Path} 的点击目标 '{target.name}' 身上没有 Collider —— " +
                    "它本来就点不到（拾取走物理射线）；请给零件加碰撞体，或在条件里手工指定要开关的碰撞体。");
            }
            return targetCollider;
        }
    }
}
