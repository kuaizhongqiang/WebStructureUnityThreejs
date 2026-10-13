using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace WSU3.Core.Managers.FunctionManager
{
    public abstract class FunctionManagerBase
    {
        protected bool isInit = false;
        public bool IsInit => isInit;

        public abstract void Init(Action isInitComplete = null);
        public abstract void OnDespose();
    }
}
