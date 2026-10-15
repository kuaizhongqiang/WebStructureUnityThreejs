using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace WSU3.Core.Interactive
{
    public class StructureObj : InteractiveObjBase
    {
        [SerializeField] string objName;
        [SerializeField] string objName_en;
        public string ObjectName => objName;
        public string ObjectName_en => objName_en;
        protected override void Awake()
        {
            base.Awake();
            HighlightInit();
        }

        public override void InvokeEnter()
        {
            base.InvokeEnter();
            OnHighlightChanged(true);
        }

        public override void InvokeExit()
        {
            base.InvokeExit();
            OnHighlightChanged(false);
        }
    }
}
