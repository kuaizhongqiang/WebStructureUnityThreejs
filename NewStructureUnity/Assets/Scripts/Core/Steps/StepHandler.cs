using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using WSU3.Core.Models;
using WSU3.Core.Steps.Conditions;

namespace WSU3.Core.Steps
{
    public class StepHandler : MonoBehaviour
    {
        [SerializeField] string stepName;
        [SerializeField] string description;
        [SerializeField] ConditionBase condition;

        
    }
    
    
    [Serializable]
    public class StepProcessing
    {
        public string processingName;        
        public List<StepHandler> stepHandlers = new List<StepHandler>();
    }
}
