using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System;
using WSU3.Core.Interfaces;
using WSU3.Contracts;

namespace WSU3.Core.Models
{
    [Serializable]
    public class ProjectData : IDataJson
    {
        public List<ProjectClip> clips = new List<ProjectClip>();
    }

    [Serializable]
    public class ProjectClip : DataBase, IDataJson
    {
        public TaskData_Purpose purpose;
        public TaskData_Equipment equipment;
        public TaskData_Principle principle;
        public TaskData_LineConnection lineConnection;
        public TaskData_Training training;
        public TaskData_Test test;
        public TaskData_Info info;
        public TaskData_Structure structure;
        public TaskData_Inspection inspection;
        public TaskData_Exam exam;        
    }

    public abstract class TaskDataBase : DataBase, ITaskData, IDataJson
    {
        protected TaskType taskType;
        protected bool isActive = true;
    }

    [Serializable]
    public class TaskData_Default : TaskDataBase
    {
        public TaskType TaskType => taskType = TaskType.None;
        public bool IsActive => isActive;
    }

    [Serializable]
    public class TaskData_Purpose : TaskDataBase
    {
        public TaskType TaskType => taskType = TaskType.Purpose;
        public bool IsActive => isActive;
        public string content;
    }

    [Serializable]
    public class TaskData_Equipment : TaskDataBase
    {
        public TaskType TaskType => taskType = TaskType.Equipment;
        public bool IsActive => isActive;
        public List<EquipmentStruct> equipmentList;
        
    }

    [Serializable]
    public class TaskData_Principle : TaskDataBase
    {
        public TaskType TaskType => taskType = TaskType.Principle;
        public bool IsActive => isActive;
        public List<PrincipleStruct> principleList;
    }

    [Serializable]
    public class TaskData_LineConnection : TaskDataBase
    {
        public TaskType TaskType => taskType = TaskType.LineConnection;
        public bool IsActive => isActive;
        public string prefabKey;
    }

    [Serializable]
    public class TaskData_Training : TaskDataBase
    {
        public TaskType TaskType => taskType = TaskType.Training;
        public bool IsActive => isActive;
        public string prefabKey;
    }

    [Serializable]
    public class TaskData_Test : TaskDataBase
    {
        public TaskType TaskType => taskType = TaskType.Test;
        public bool IsActive => isActive;
        public List<string> questionClipIds;
    }
    [Serializable]
    public class TaskData_Info : TaskDataBase
    {
        public TaskType TaskType => taskType = TaskType.Info;
        public bool IsActive => isActive;
        public string prefabKey;
        public string content;
        public List<string> imageKeys;
    }
    [Serializable]
    public class TaskData_Structure : TaskDataBase
    {
        public TaskType TaskType => taskType = TaskType.Structure;
        public bool IsActive => isActive;
        public string prefabKey;
    }
    [Serializable]
    public class TaskData_Inspection : TaskDataBase
    {
        public TaskType TaskType => taskType = TaskType.Inspection;
        public bool IsActive => isActive;
        public string prefabKey;
    }
    [Serializable]
    public class TaskData_Exam : TaskDataBase
    {
        public TaskType TaskType => taskType = TaskType.Exam;
        public bool IsActive => isActive;
        public List<string> questionClipIds;
    }
    [Serializable]
    public struct EquipmentStruct
    {
        public string prefabKey;
        public string name;
        public string name_en;
        public string description;
        public string description_en;
    }

    [Serializable]
    public class PrincipleStruct
    {
        public string videoPath;
        public string name;
        public string name_en;
        public string description;
        public string description_en;

    }
}
