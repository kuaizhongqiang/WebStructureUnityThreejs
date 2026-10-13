using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace WSU3.Core.Managers
{
    public abstract class SingletonBase : MonoBehaviour
    {
        /// <summary>是否已完成延迟初始化</summary>
        protected bool isInit = false;
        public bool IsInit
        {
            get { return isInit; }
        }

        /// <summary>
        /// 延迟初始化协程，子类必须实现各自的初始化逻辑
        /// </summary>
        protected abstract IEnumerator DelayInit();

        /// <summary>
        /// 统一在 Start 中触发延迟初始化
        /// 子类如需自定义时机可重写，但一般不需要
        /// </summary>
        protected virtual void Start()
        {
            if (!isInit)
                StartCoroutine(DelayInit());
        }
    }
}
