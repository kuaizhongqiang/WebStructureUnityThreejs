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

        /// <summary>
        /// 当前已装载资源包的 clip（正是 Web 在 `scene:enter` 里给的 projectId）。
        ///
        /// WHY 与 <see cref="currentProjectClip"/> 分开两份：后者是**内容数据**（ProjectClip 全量字段），
        /// 而内容数据在本工程还只有 JSON、没有装载链路（docs/PLAN.md P2-6e），所以它现在是一具空壳；
        /// 而"当前是哪个 clip"在装包时就已经确定，任务侧的装配逻辑（结构件实例化）需要的是它。
        /// 混用会让"看起来有项目数据、其实每个字段都是空"这种沉默故障变成常态。
        /// </summary>
        string currentClipId;

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

        /// <summary>当前已装载资源包的 clip（未进入任何任务时为 null）。</summary>
        public static string CurrentClipId { get { return Instance.currentClipId; } }

        /// <summary>
        /// 由 <see cref="FunctionManager.TaskFlowManager"/> 在"装包成功 → 装配开始前"调用，
        /// 在"卸包完成"时用 (null, TaskType.None) 复位。
        ///
        /// WHY 由任务流写、而不是各任务自己判断：装配逻辑（结构件实例化、步骤系统）只该读这里的状态，
        /// 各自去猜"现在是哪个任务"就会出现两套口径。
        /// </summary>
        public static void SetCurrentTask(string clipId, TaskType taskType)
        {
            Instance.currentClipId = clipId;
            Instance.currentTaskType = taskType;
        }
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

            // 下面三个管理器都不是 MonoBehaviour：逐帧活儿由这里驱动
            interactiveManager.CoreUpdate(); // 拾取：射线兜底、点空白、聚焦
            addressableManager.CoreUpdate(); // 资源包：推进内部的装载/卸载协程
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
