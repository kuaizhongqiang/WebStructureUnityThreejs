using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using WSU3.Editor.Common;

namespace WSU3.Editor.BuildTools
{
    // WHY: 为什么另立一套 DTO、而不复用运行期模型（WSU3.Core.Models.ProjectData）：
    //      内容数据里的键是 `taskStructureData` / `taskActive`，而运行期模型的字段名是
    //      `structure` / `isActive` —— 两者**不同名**，JsonUtility 是按字段名对位的，直接反序列化只会得到一堆空字段
    //      （表现是"对账通过、但一个包都没收集到"这种最难查的沉默故障）。
    //      所以这里只声明流水线真正需要的那几个键，与 JSON 逐字对齐；它属于**编辑器工具**，不参与运行期契约。

    /// <summary>内容数据（<c>ProjectData.json</c>）里本流水线需要的字段子集。</summary>
    [Serializable]
    public class ProjectDataDto
    {
        public List<ClipDto> clips = new List<ClipDto>();
    }

    /// <summary>一个项目（器件）。</summary>
    [Serializable]
    public class ClipDto
    {
        public string id;
        public string displayName;

        // 只有"一个 TaskData → 一个预制体"形态的任务需要声明键；新增一类内容时在这里加一行。
        public TaskDto taskInfoData;
        public TaskDto taskStructureData;
        public TaskDto taskInspectionData;
    }

    /// <summary>一个任务的数据（只取建模需要的字段）。</summary>
    [Serializable]
    public class TaskDto
    {
        public string id;
        public bool taskActive;
        public string prefabKey;
    }

    /// <summary><c>ProjectData.json</c> 的读取入口（编辑器工具与运行期读的是同一份文件）。</summary>
    public static class ContentProjectData
    {
        /// <summary>读取并解析内容数据；失败返回 null 并说明原因（**不抛异常**：一条对账不该把编辑器打断）。</summary>
        public static ProjectDataDto Read()
        {
            string path = EditorPaths.ProjectDataJson;
            if (!File.Exists(path))
            {
                Debug.LogError($"[Pack] 找不到内容数据：{path}（Unity 侧那一份，DEC-82）");
                return null;
            }

            try
            {
                ProjectDataDto data = JsonUtility.FromJson<ProjectDataDto>(File.ReadAllText(path));
                if (data == null || data.clips == null)
                {
                    Debug.LogError($"[Pack] 内容数据解析后为空：{path}");
                    return null;
                }
                return data;
            }
            catch (Exception e)
            {
                Debug.LogError($"[Pack] 解析内容数据失败：{path}\n{e.Message}");
                return null;
            }
        }
    }
}
