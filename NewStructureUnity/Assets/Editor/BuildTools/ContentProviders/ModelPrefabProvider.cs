using System;
using System.Collections.Generic;
using WSU3.Core.Models.Addressable;

namespace WSU3.Editor.BuildTools
{
    // WHY: 产出 id = 内容数据里的 `prefabKey`，素材路径 = <c>{素材目录}/{id}.prefab</c> ——
    //      **文件名必须与 id 逐字符一致**；prefabKey 为空视为"该项目不需要这个模型"，静默跳过（内容数据是唯一源）。
    //      新增同类模型只需在 ContentPipeline.ContentProviders 里再登记一行，不需要新建类。
    /// <summary>"一个 TaskData → 一个预制体"型 Provider 的通用实现（简介 / 结构 / 检测三种任务都是这个形态）。</summary>
    public class ModelPrefabProvider : IContentProvider
    {
        private readonly string name;
        private readonly string modelRoot;
        private readonly string taskSegment;
        private readonly Func<ClipDto, TaskDto> taskSelector;

        /// <summary>构造：来源名 / 模型素材目录 / 任务段 / 从项目数据取该任务节点的委托。</summary>
        public ModelPrefabProvider(string name, string modelRoot, string taskSegment, Func<ClipDto, TaskDto> taskSelector)
        {
            this.name = name;
            this.modelRoot = modelRoot;
            this.taskSegment = taskSegment;
            this.taskSelector = taskSelector;
        }

        public string Name => name;

        public IEnumerable<ContentResourceEntry> Collect(ClipDto clip, string device)
        {
            var list = new List<ContentResourceEntry>();
            if (clip == null || taskSelector == null) return list;

            TaskDto task = taskSelector(clip);
            if (task == null || string.IsNullOrEmpty(task.prefabKey)) return list;   // 未配置 = 该项目不要这个模型

            string id = task.prefabKey;
            string expectedId = ContentNaming.ConfigId(device, taskSegment, ContentNaming.ResourceModel);
            string path = modelRoot + "/" + id + ".prefab";

            if (id != expectedId)
            {
                // WHY: 这里的报错是**阻塞级** —— id 不符合命名规则时，运行期按规则推导出来的 id 会找不到它，
                //      而打包本身"成功"，故障要等到点进任务才出现。
                list.Add(new ContentResourceEntry(id, path,
                    $"id 不符合命名规则（按 {device} 应为 {expectedId}）", ContentAssetKind.Prefab) { isError = true });
                return list;
            }

            // 素材是否存在由流水线的校验统一判（一处判、一处报），这里只负责"数据要了什么"
            list.Add(new ContentResourceEntry(id, path, null, ContentAssetKind.Prefab));
            return list;
        }
    }
}
