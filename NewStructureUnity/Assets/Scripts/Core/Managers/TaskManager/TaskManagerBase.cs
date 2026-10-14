using System.Collections;
using UnityEngine;
using WSU3.Contracts;

namespace WSU3.Core.Managers.TaskManager
{
    /// <summary>
    /// 任务管理器基类：**一个 TaskType 一份装配逻辑**（怎么进、怎么把三维装配起来、怎么退干净）。
    ///
    /// 形态：**场景里挂一个节点**（本工程是 `1_Content` 下的 `StructureTaskManager`），
    /// 它的活儿由 <see cref="FunctionManager.TaskFlowManager"/> 的自驱泵 `yield return` 推进
    /// （不自己开协程）—— 好处是 EditMode 测试能一帧帧手动跑，节奏也集中在一处。
    ///
    /// ⚠ 本次纠正的一处老写法：旧版本 <c>Instance</c> 走 <c>new StructureTaskManager()</c>。
    /// Unity **不允许** <c>new</c> 一个 MonoBehaviour（只能用 `AddComponent`），
    /// 那样拿到的实例没有 <c>transform</c>/<c>gameObject</c>、<c>Awake</c>/<c>OnDestroy</c> 也不会跑，
    /// 而且场景里真正挂着的那个节点永远收不到指令 —— 一旦被调用就同时出现"报错 + 指令落空"两种现象。
    /// 现在的口径：<c>Instance</c> **解析场景里的那一个**，场景没摆就返回 null，
    /// 调用方必须处理 null（报"没进场景"，而不是拿个假对象继续跑）。
    /// </summary>
    public abstract class TaskManagerBase<T> : SingletonBase where T : TaskManagerBase<T>
    {
        private static T s_Instance;

        /// <summary>场景里挂着的那个实例；场景里没摆时返回 null。</summary>
        public static T Instance
        {
            get
            {
                if (s_Instance != null) return s_Instance;

                // WHY: 用 FindObjectsInactive.Include —— 管理器所在节点被"暂时隐藏"（容器不可见，docs/design/09 §5）
                //      时不该让整个任务消失。
                var found = FindObjectsByType<T>(FindObjectsInactive.Include, FindObjectsSortMode.None);
                for (int i = 0; i < found.Length; i++)
                {
                    if (found[i] == null) continue;
                    s_Instance = found[i];
                    break;
                }
                return s_Instance;
            }
        }

        /// <summary>场景里是否摆了该任务管理器（没摆时 <see cref="Instance"/> 为 null）。</summary>
        public static bool Exists => Instance != null;

        protected virtual void Awake()
        {
            s_Instance = this as T;
        }

        protected virtual void OnDestroy()
        {
            if (s_Instance == this) s_Instance = null;
        }

        protected override IEnumerator DelayInit()
        {
            yield return null;
            isInit = true;
        }

        /// <summary>本管理器负责的任务类型。</summary>
        public abstract TaskType TaskType { get; }

        /// <summary>进入该任务：装包 → 装配 → 就绪。由调用方（<see cref="FunctionManager.TaskFlowManager"/>）<c>yield return</c> 驱动。</summary>
        public abstract IEnumerator StartTaskRoutine(string clipId);

        /// <summary>退出该任务：销毁实例、复位状态。**幂等**（没进过也能调）。</summary>
        public abstract void StopTask();
    }
}
