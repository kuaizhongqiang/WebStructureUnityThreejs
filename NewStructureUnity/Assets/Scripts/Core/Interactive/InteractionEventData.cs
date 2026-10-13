using System.Collections.Generic;
using UnityEngine;
using WSU3.Core.Managers.FunctionManager;

namespace WSU3.Core.Interactive
{
    /// <summary>全局交互类型。</summary>
    public enum GlobalInteractionType
    {
        Enter, Exit, Down, Up, Click, ClickRight, ClickDouble, Move
    }

    /// <summary>全局交互事件数据（GlobalInteractiveMgr 统一发布；经对象池 Get/Release 复用，降低每帧分配）。</summary>
    public class GlobalInteractionEventData
    {
        /// <summary>事件目标；Exit 为原悬停物体；空白点击（无目标）为 null</summary>
        public InteractiveObjBase Target;

        /// <summary>交互类型</summary>
        public GlobalInteractionType Type;

        /// <summary>Move 事件的鼠标位移增量</summary>
        public Vector2 Delta;

        // 对象池（同步分发，安全回收）
        private static readonly Stack<GlobalInteractionEventData> s_Pool = new Stack<GlobalInteractionEventData>(32);

        /// <summary>从池中取一个事件实例并填充（池空时新建）。</summary>
        public static GlobalInteractionEventData Get(InteractiveObjBase target, GlobalInteractionType type, Vector2 delta = default)
        {
            var e = s_Pool.Count > 0 ? s_Pool.Pop() : new GlobalInteractionEventData();
            e.Target = target;
            e.Type = type;
            e.Delta = delta;
            return e;
        }

        /// <summary>清空字段并归还池中（Publish 返回后调用）。</summary>
        public void Release()
        {
            Target = null;
            Delta = default;
            s_Pool.Push(this);
        }

        private GlobalInteractionEventData() { }
    }

    /// <summary>鼠标移动状态变化事件数据（GlobalInputMgr 判定状态翻转时发布，只在变化时发一次、不逐帧发）。</summary>
    public class MouseMoveStateEventData
    {
        /// <summary>新状态</summary>
        public MouseMoveState State;

        /// <summary>是否静止（等价 State == MouseMoveState.Idle，便于订阅方直接判断）</summary>
        public bool IsIdle => State == MouseMoveState.Idle;

        public MouseMoveStateEventData(MouseMoveState state)
        {
            State = state;
        }
    }
}
