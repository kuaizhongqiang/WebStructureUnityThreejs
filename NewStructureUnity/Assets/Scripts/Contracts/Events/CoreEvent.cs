using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace WSU3.Contracts.Events
{
    public class LoadProjectClipDataEvent
    {
        public string projectClipId;
        public LoadProjectClipDataEvent(string projectClipId)
        {
            this.projectClipId = projectClipId;
        }
    }

    public class LoadProjectClipFinishEvent
    {
        public bool isSuccess;
        public LoadProjectClipFinishEvent(bool isSuccess)
        {
            this.isSuccess = isSuccess;
        }
    }

    public class LoadTaskTypeDataEvent
    {
        public TaskType taskType;
        public LoadTaskTypeDataEvent(TaskType taskType)
        {
            this.taskType = taskType;
        }
    }

    public class LoadTaskTypeFinishEvent
    {
        public bool isSuccess;
        public LoadTaskTypeFinishEvent(bool isSuccess)
        {
            this.isSuccess = isSuccess;
        }
    }
    
    public class LoadRoamingSceneRequestEvent
    {
        public string sceneName;
        public LoadRoamingSceneRequestEvent(string sceneName)
        {
            this.sceneName = sceneName;
        }
    }

    public class LoadRoamingSceneFinishEvent
    {
        public bool isSuccess;
        public LoadRoamingSceneFinishEvent(bool isSuccess)
        {
            this.isSuccess = isSuccess;
        }
    }
    
    public class LoadAllCompleteEvent
    {
        public bool isSuccess;
        public LoadAllCompleteEvent(bool isSuccess)
        {
            this.isSuccess = isSuccess;
        }
    }

    public class UnloadAllCompleteEvent
    {
        public bool isSuccess;
        public UnloadAllCompleteEvent(bool isSuccess)
        {
            this.isSuccess = isSuccess;
        }
    }

    public class LoadingProgressEvent
    {
        public float progress;
        public LoadingProgressEvent(float progress)
        {
            this.progress = progress;
        }
    }

}
