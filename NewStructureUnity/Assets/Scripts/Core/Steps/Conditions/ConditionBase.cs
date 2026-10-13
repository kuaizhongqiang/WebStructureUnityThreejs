using System;
using System.Collections.Generic;
using UnityEngine;
using WSU3.Core.Interfaces;

namespace WSU3.Core.Steps.Conditions
{
    public abstract class ConditionBase : ICondition
    {
        [SerializeField] protected ConditionType conditionType;
        public ConditionType ConditionType => conditionType; 
        [SerializeField] List<GameObject> activeObjects = new List<GameObject>(); 
        [SerializeField] List<GameObject> inactiveObjects = new List<GameObject>();
        [SerializeField] List<AnimationStruct> animations = new List<AnimationStruct>();
        [SerializeField] Collider triggerCollider; // click drag
        [SerializeField] Collider TargetCollider; // drag tool
        [SerializeField] string questionKey; // question
        [SerializeField] string toolKey; // tool
        [SerializeField] string uiKey; // ui
        [SerializeField] string tipsKey; // all
        [SerializeField] string audioKey; // all

        protected virtual void Awake()
        {
            Init();
        }

        protected virtual void OnDestroy()
        {
            
        }

        public virtual void Init()
        {
            triggerCollider.gameObject.SetActive(false);
            TargetCollider.gameObject.SetActive(false);
        }

        public virtual void StartCondition()
        {
            SetObjsActive(activeObjects, true);
            SetObjsActive(inactiveObjects, false);
            WaitingCondition(() =>
            {
                FinishCondition();
            });
        }

        public virtual void FinishCondition()
        {
            
        }

        public virtual void WaitingCondition(Action isComplete)
        {
            
        }


        void SetObjsActive(List<GameObject> objs, bool isActive)
        {
            foreach (var obj in objs)
            {
                obj.SetActive(isActive);
            }
        }
    }

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
    }

    [Serializable]
    public struct AnimationStruct
    {
        public Animation animation;
        public AnimationClip clip;
        public bool ifHideOnFinish;
    }
}
