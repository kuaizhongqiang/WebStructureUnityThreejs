using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace WSU3.Core.Managers.FunctionManager
{
    public class AddressableManager : FunctionManagerBase
    {
        public override void Init(Action isInitComplete = null)
        {
            // TODO: 初始化

            isInit = true;
            isInitComplete?.Invoke();
        }

        public override void OnDespose()
        {
            
        }
    }
}
