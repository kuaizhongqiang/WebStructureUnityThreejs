using System;
using UnityEngine;
using HighlightPlus;
using WSU3.Contracts.Events;
using WSU3.Core.DataStruct;

namespace WSU3.Core.Interactive
{
    /// <summary>
    /// 三维交互物基类：**自注册 + 被动接收交互**。
    ///
    /// 检测在谁手里：**在 <see cref="Managers.FunctionManager.InteractiveManager"/> 的 `CoreUpdate()` 里**
    /// —— 每帧一次 `Camera.ScreenPointToRay` + `Physics.Raycast`，命中后按需调本类的
    /// <see cref="InvokeEnter"/> / <see cref="InvokeExit"/> / <see cref="InvokeDown"/> / <see cref="InvokeUp"/> / <see cref="InvokeClick"/>。
    ///
    /// 因此本类**不实现** Unity 的 `IPointer*Handler`：注册表的意义就是"由管理器统一检测、统一派发"，
    /// 若再让物体去接 EventSystems 的指针回调，检测权就回到 EventSystem，注册表也就没有意义了。
    ///
    /// 三条纪律：
    ///   ① **单一出口**：上面五个入口最终都汇成 `EventBus&lt;GlobalInteractionEventData&gt;` 一条事件，
    ///      业务只订阅一条，不去各自实现 `OnMouse*`；
    ///   ② **受闸门约束**：`InputGate` 关掉（模态面板打开 / 容器不可见）时管理器连射线都不做，
    ///      并把悬停态清掉（见 `InteractiveManager.CoreUpdate`）；
    ///   ③ **不做文字标签**：Web 侧用侧栏列表联动（Q-R6-2 = C），这里只上报 key 与交互类型。
    ///
    /// 高亮**只留状态与钩子**：`SetHighlight(bool)` 由 `view:focus` 调用，表现由派生类重写
    /// <see cref="OnHighlightChanged"/> 自己写；悬停**不碰**高亮 —— 要不要悬停高亮由业务决定。
    ///
    /// 未实现（本期有意留空，见 docs/PLAN.md P2-6）：右键（`ClickRight`）与双击（`ClickDouble`）。
    /// </summary>
    [DisallowMultipleComponent]
    public abstract class InteractiveObjBase : MonoBehaviour
    {
        [Tooltip("契约 key（资源登记表的主键，DEC-42）。留空则用 GameObject 名。view:focus 与 object:picked 都用它。")]
        [SerializeField] private string objectKey;

        [Tooltip("关掉后不参与拾取、不上报事件（用于禁用态部件）。")]
        [SerializeField] private bool isInteractable = true;

        HighlightEffect highlightEffect;
        const string HighlightProfile = "Highlight";

        private Guid guid = Guid.NewGuid();
        [SerializeField] bool hovered;
        private bool highlighted;

        /// <summary>运行时唯一标识（诊断用；**对 Web 暴露的是 <see cref="ObjectKey"/>，不是它**）。</summary>
        public Guid Guid => guid;

        /// <summary>契约 key：对 Web 的唯一标识。</summary>
        public string ObjectKey => string.IsNullOrEmpty(objectKey) ? name : objectKey;

        public bool IsInteractable => isInteractable;

        /// <summary>指针是否停在它身上（由管理器维护）。</summary>
        public bool IsHovered => hovered;

        /// <summary>是否处于高亮态（状态在基类，表现在派生类）。</summary>
        public bool IsHighlighted => highlighted;

        protected virtual void Awake()
        {
            guid = Guid.NewGuid();
            Managers.FunctionManager.InteractiveManager.Register(this);
        }

        protected virtual void OnDestroy()
        {
            Managers.FunctionManager.InteractiveManager.Unregister(this);
        }

        /// <summary>运行时开关（禁用态部件）。</summary>
        public void SetInteractable(bool value)
        {
            isInteractable = value;
            if (!value && hovered)
            {
                hovered = false;
                Publish(GlobalInteractionType.Exit); // 收尾：别让悬停态卡在禁用件上
            }
        }

        /// <summary>高亮开关（`view:focus` 调它）。基类只切状态并回调钩子。</summary>
        public void SetHighlight(bool on)
        {
            if (highlighted == on) return;
            highlighted = on;
            OnHighlightChanged(on);
        }

        /// <summary>
        /// 高亮表现钩子（**派生类自己实现**）。
        /// 基类故意不提供默认实现，也不引入任何服务/接口 —— 表现方式由业务决定。
        /// </summary>
        protected virtual void OnHighlightChanged(bool on)
        {
            if (highlightEffect == null) HighlightInit();
            highlightEffect.highlighted = on;
        }

        // ── 由 InteractiveManager 调用的入口（业务不要直接调）────────────────

        /// <summary>指针移入（悬停）。</summary>
        public virtual void InvokeEnter()
        {
            if (!CanInteract() || hovered) return;
            hovered = true;
            Publish(GlobalInteractionType.Enter);
        }

        /// <summary>指针移出。**即使闸门此刻被关上也要能收尾**，否则悬停态会卡住。</summary>
        public virtual void InvokeExit()
        {
            if (!hovered) return;
            hovered = false;
            Publish(GlobalInteractionType.Exit);
        }

        /// <summary>左键按下。</summary>
        public void InvokeDown()
        {
            if (!CanInteract()) return;
            Publish(GlobalInteractionType.Down);
        }

        /// <summary>左键抬起。</summary>
        public void InvokeUp()
        {
            if (!CanInteract()) return;
            Publish(GlobalInteractionType.Up);
        }

        /// <summary>点击（左键：按下与抬起落在同一个物体上）。</summary>
        public void InvokeClick()
        {
            if (!CanInteract()) return;
            Publish(GlobalInteractionType.Click);
        }

        /// <summary>能否交互：可交互 **且** 输入闸门打开。</summary>
        public bool CanInteract()
        {
            return isInteractable && InputGate.ShouldProcessInput;
        }

        /// <summary>把一次交互发到唯一出口（对象池复用，Publish 返回后立刻归还）。</summary>
        protected void Publish(GlobalInteractionType type, Vector2 delta = default)
        {
            GlobalInteractionEventData data = GlobalInteractionEventData.Get(this, type, delta);
            EventBus<GlobalInteractionEventData>.Publish(data);
            data.Release();
        }

        protected void HighlightInit()
        {
            if (highlightEffect == null) highlightEffect = GetComponent<HighlightEffect>();
            if (highlightEffect == null) highlightEffect = gameObject.AddComponent<HighlightEffect>();
            var profile = DataStructMapping.GetHighlightProfile();
            highlightEffect.ProfileLoad(profile);

            highlightEffect.highlighted = false;
        }
    }
}
