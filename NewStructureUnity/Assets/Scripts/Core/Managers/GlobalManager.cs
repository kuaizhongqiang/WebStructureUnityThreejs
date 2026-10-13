using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using WSU3.Contracts;
using WSU3.Core.Managers.FunctionManager;
using WSU3.Core.Models;

namespace WSU3.Core.Managers
{
    public class GlobalManager : SingletonGlobalMgr<GlobalManager>
    {
        [SerializeField] SceneState currentSceneState = SceneState.Setup;
        [SerializeField] ProjectClip currentProjectClip = new ProjectClip();
        [SerializeField] TaskType currentTaskType = TaskType.None;
        ProjectData projectData = new ProjectData();
        QuestionData questionData = new QuestionData();
        AudioManager audioManager = new AudioManager();
        InteractiveManager interactiveManager = new InteractiveManager();
        CameraManager cameraManager = new CameraManager();
        SceneManager sceneManager = new SceneManager();
        AddressableManager addressableManager = new AddressableManager();
        TaskFlowManager taskFlowManager = new TaskFlowManager();
        Camera m_camera;





        #region 公开数据获取途径
        public static AudioManager AudioManager { get { return Instance.audioManager; } }
        public static InteractiveManager InteractiveManager { get { return Instance.interactiveManager; } }
        public static CameraManager CameraManager { get { return Instance.cameraManager; } }
        public static SceneManager SceneManager { get { return Instance.sceneManager; } }
        public static AddressableManager AddressableManager { get { return Instance.addressableManager; } }
        public static TaskFlowManager TaskFlowManager { get { return Instance.taskFlowManager; } }
        public static Camera MainCamera 
        { 
            get
            { 
                if (Instance.m_camera == null)
                {
                    Instance.m_camera = CameraManager.GetMainCamera();
                }
                return Instance.m_camera;
            }
            set
            { 
                Instance.m_camera = value; 
            } 
        }
        public static SceneState CurrentSceneState { get { return Instance.currentSceneState; } }
        public static ProjectClip CurrentProjectClip { get { return Instance.currentProjectClip; } }
        public static TaskType CurrentTaskType { get { return Instance.currentTaskType; } }
        public static QuestionClip GetQuestionClip(string id)
        {
            return Instance.questionData.GetQuestionClip(id);
        }
        public static List<QuestionClip> GetQuestionClips(List<string> ids)
        {
            return Instance.questionData.GetQuestionClips(ids);
        }
        
        
        #endregion
        
        
        #region 生命周期
        protected override void Awake()
        {
            base.Awake();
        }

        void Update()
        {
            if (!IsInit) return;

            // 下面两个管理器都不是 MonoBehaviour：逐帧活儿由这里驱动
            interactiveManager.CoreUpdate(); // 拾取：射线兜底、点空白、聚焦
            taskFlowManager.CoreUpdate();    // 任务流程：推进内部的进入/退出序列
        }

        protected override void OnDestroy()
        {
            base.OnDestroy();
        }
        #endregion
        
        
        
        protected override IEnumerator DelayInit()
        {
            bool isComplete = false;
            AudioManager.Init( () => isComplete = true);
            while (!isComplete)
            {
                yield return null;
            }

            isComplete = false;
            CameraManager.Init(() => isComplete = true);
            while (!isComplete)
            {
                yield return null;
            }

            isComplete = false;
            InteractiveManager.Init(() => isComplete = true);
            while (!isComplete)
            {
                yield return null;
            }
            
            isComplete = false;
            SceneManager.Init(() => isComplete = true);
            while (!isComplete)
            {
                yield return null;
            }

            isComplete = false;
            AddressableManager.Init(() => isComplete = true);
            while (!isComplete)
            {
                yield return null;
            }

            // 任务流程：订阅 Web 指令（app:init / preload:* / scene:enter / scene:exit / input:enable / runtime:resume）
            isComplete = false;
            TaskFlowManager.Init(() => isComplete = true);
            while (!isComplete)
            {
                yield return null;
            }

            isInit = true;
            yield break;
        }
        
    }
}
