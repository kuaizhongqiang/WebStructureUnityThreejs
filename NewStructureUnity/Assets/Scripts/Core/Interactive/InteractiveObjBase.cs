using System;
using UnityEngine;
using UnityEngine.EventSystems;
using WSU3.Contracts.Events;
using WSU3.Core.Managers.FunctionManager;

namespace WSU3.Core.Interactive
{
    /// <summary>
    /// 三维交互物基类：**自注册 + 指针事件 → 单一出口**（DEC-80 / DEC-84）。
    ///
    /// 体系（Q-R6-S1 = A）：`EventSystem + StandaloneInputModule + PhysicsRaycaster`，
    /// **不建 Canvas、不用 GraphicRaycaster** —— 拾取的是三维 Collider，不是 UI。
    /// 派生类只要挂 `Collider` + 本组件（或它的子类），就会自动登记进
    /// <see cref="InteractiveManager"/>（`GlobalManager.InteractiveManager`）并参与拾取。
    ///
    /// 三条纪律：
    ///   ① **单一出口**：悬停/按下/抬起/点击都汇成 `EventBus&lt;GlobalInteractionEventData&gt;` 一条事件，
    ///      业务只订阅一条，不去各自实现 `OnMouse*`；
    ///   ② **受闸门约束**：`InputGate` 关掉（模态面板打开 / 容器不可见）时**直接忽略**指针事件；
    ///   ③ **不做文字标签**：Web 侧用侧栏列表联动（Q-R6-2 = C），这里只上报 key 与交互类型。
    ///
    /// 高亮**不做实现**：基类只维护"是否高亮"这个状态，表现由派生类重写
    /// <see cref="OnHighlightChanged"/> 自己写（材质描边 / 自发光 / 后处理都行）。
    ///
    /// 未实现（本期有意留空，见 docs/PLAN.md P2-6）：右键（`ClickRight`）与双击（`ClickDouble`）
    /// —— 契约里已有这两个类型值，需要时在交互管理器里补判定即可。
    /// </summary>
    [DisallowMultipleComponent]
    public abstract class InteractiveObjBase : MonoBehaviour,
        IPointerEnterHandler, IPointerExitHandler, IPointerDownHandler, IPointerUpHandler, IPointerClickHandler
    {
        [Tooltip("契约 key（资源登记表的主键，DEC-42）。留空则用 GameObject 名。view:focus 与 object:picked 都用它。")]
        [SerializeField] private string objectKey;

        [Tooltip("关掉后不参与拾取、不上报事件（用于禁用态部件）。")]
        [SerializeField] private bool isInteractable = true;

        private Guid guid = Guid.NewGuid();
        private bool hovered;
        private bool highlighted;

        /// <summary>运行时唯一标识（诊断用；**对 Web 暴露的是 <see cref="ObjectKey"/>，不是它**）。</summary>
        public Guid Guid => guid;

        /// <summary>契约 key：对 Web 的唯一标识。</summary>
        public string ObjectKey => string.IsNullOrEmpty(objectKey) ? name : objectKey;

        public bool IsInteractable => isInteractable;

        public bool IsHovered => hovered;

        /// <summary>是否处于高亮态（状态在基类，表现在派生类）。</summary>
        public bool IsHighlighted => highlighted;

        protected virtual void Awake()
        {
            guid = Guid.NewGuid();
            InteractiveManager.Register(this);
        }

        protected virtual void OnDestroy()
        {
            InteractiveManager.Unregister(this);
        }

        /// <summary>运行时开关（禁用态部件）。</summary>
        public void SetInteractable(bool value)
        {
            isInteractable = value;
            if (!value && hovered)
            {
                hovered = false;
                SetHighlight(false);
                Publish(GlobalInteractionType.Exit);
            }
        }

        /// <summary>
        /// 高亮开关：悬停与 `view:focus` 都会调用它。
        /// 基类只切状态并回调钩子 —— **具体表现请重写 <see cref="OnHighlightChanged"/>**。
        /// </summary>
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
        }

        /// <summary>指针事件统一入口判据：可交互 **且** 输入闸门打开。</summary>
        protected bool CanInteract()
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

        // ── EventSystems 指针回调（物理射线命中 Collider 后由 PhysicsRaycaster 派发）──

        public void OnPointerEnter(PointerEventData eventData)
        {
            if (!CanInteract()) return;
            hovered = true;
            SetHighlight(true);
            Publish(GlobalInteractionType.Enter);
        }

        public void OnPointerExit(PointerEventData eventData)
        {
            if (!hovered) return;
            hovered = false;
            SetHighlight(false);
            // 退出要能"收尾"：即使此刻闸门被关上，也把 Exit 发出去，避免高亮卡住
            Publish(GlobalInteractionType.Exit);
        }

        public void OnPointerDown(PointerEventData eventData)
        {
            if (!CanInteract()) return;
            Publish(GlobalInteractionType.Down);
        }

        public void OnPointerUp(PointerEventData eventData)
        {
            if (!CanInteract()) return;
            Publish(GlobalInteractionType.Up);
        }

        public void OnPointerClick(PointerEventData eventData)
        {
            if (!CanInteract()) return;
            // 只处理左键：右键在本期不实现（见类注释）
            if (eventData.button != PointerEventData.InputButton.Left) return;
            Publish(GlobalInteractionType.Click);
        }
    }
}
