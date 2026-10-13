using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace WSU3.Core.Steps
{
    public class StepManager : MonoBehaviour
    {
        static StepManager instance;
        public static StepManager Instance
        {
            get
            {
                if (instance == null)
                {
                    instance = FindObjectOfType<StepManager>();
                }
                return instance;
            }
            set
            {
                instance = value;
            }
            
        }
        public List<StepProcessing> stepProcessings = new List<StepProcessing>();
        public List<StepHandler> stepHandlers = new List<StepHandler>();

        #region 生命周期
        void Awake()
        {
            if (instance == null)
            {
                instance = this;
            }

            StructInit();
        }
        

        #endregion

        #region 初始化
        void StructInit()
        {
            for (int i = 0; i < transform.childCount; i++)
            {
                var processing = transform.GetChild(i).gameObject;
                StepProcessing stepProcessing = new StepProcessing();
                stepProcessing.processingName = processing.name;
                stepProcessings.Add(stepProcessing);
                for (int j = 0; j < processing.transform.childCount; j++)
                {
                    var stepHandler = processing.transform.GetChild(j).GetComponent<StepHandler>();
                    stepProcessing.stepHandlers.Add(stepHandler);
                    stepHandlers.Add(stepHandler);
                }                
            }
        }
        #endregion

    }
}
