namespace WSU3.Core.Models.Addressable
{
    // WHY: 命名规则的**唯一来源**（编辑器流水线与运行期都取这里，测试也读这里）——
    //      「包配置 id」「address」「Addressables 分组名」是三套东西，混用会让打包注册与运行期取件对不上。
    //
    // 2026-10-14（DEC-118 全量迁 AA）：原先这里管的是"AssetBundle 名"，那套管的是
    //      "末段必须小写否则 WebGL/Linux 必然 404"的纪律。迁到 AA 后**这条纪律连同它的坑一起消失了**：
    //      AA 的地址与分组名是 catalog 里的字符串，不经文件系统，不存在大小写 404。
    //      故删掉 BundleNameFor / IsBundleFileNameLowerCase / BundleDirSegmentOf 三个成员，
    //      换成 GroupNameFor / SharedGroupName / SharedPackageId。
    /// <summary>内容包命名规则的唯一来源：包配置 id、Addressables 地址与分组名的拼装与校验。</summary>
    public static class ContentNaming
    {
        /// <summary><c>ProjectClip.id</c> 的前缀（内容数据的稳定主键，docs/design/04 §2.1）。</summary>
        public const string ClipIdPrefix = "clip_";

        /// <summary>内容包分组名的前缀：<c>WSU3_</c>（与工程里非本流水线创建的分组区分开，清理残留只动这一族）。</summary>
        public const string GroupPrefix = "WSU3_";

        /// <summary>共享材质分组的后缀（含全部模型材质，先于各 clip 组装载）。</summary>
        public const string SharedGroupSuffix = "Shared";

        /// <summary>共享材质包的固定地址（**契约**：运行期靠它先装材质，见 AddressableManager.LoadClipRoutine）。</summary>
        public const string SharedAddress = "shared_model_materials";

        // WHY: 任务段取 TaskType 的枚举名小写 —— 与内容数据里 taskXxxData 的键名同源，改名要连带改内容数据。
        /// <summary>任务段：简介。</summary>
        public const string TaskInfo = "info";

        /// <summary>任务段：结构。</summary>
        public const string TaskStructure = "structure";

        /// <summary>任务段：检测（界面显示名是"测量"）。</summary>
        public const string TaskInspection = "inspection";

        /// <summary>资源段：模型预制体。</summary>
        public const string ResourceModel = "model";

        /// <summary>资源段：有序图（简介页图集，每张一条配置）。</summary>
        public const string ResourceImage = "image";

        /// <summary><c>clip_contactor</c> → <c>contactor</c>（配置 id 用小驼峰，保持原样）。</summary>
        public static string DeviceOf(string clipId)
        {
            if (string.IsNullOrEmpty(clipId)) return clipId;

            // WHY: 用 global:: 限定 —— 本命名空间在 WSU3.Core.Models 下，裸写 System 会被解析成同层的 WSU3.Core.Models.System（CS0234）。
            return clipId.StartsWith(ClipIdPrefix, global::System.StringComparison.OrdinalIgnoreCase)
                ? clipId.Substring(ClipIdPrefix.Length)
                : clipId;
        }

        /// <summary><c>clip_contactor</c> → <c>WSU3_clip_contactor</c>（一个 clip 一个地址组，装卸以此为单位）。</summary>
        public static string GroupNameForClip(string clipId)
        {
            return GroupPrefix + clipId;
        }

        /// <summary>共享材质组的分组名（<c>WSU3_Shared</c>）。</summary>
        public static string SharedGroupName => GroupPrefix + SharedGroupSuffix;

        /// <summary>包配置 id：device=<c>contactor</c>, task=<c>structure</c>, resource=<c>model</c> → <c>contactor_structure_model</c>。</summary>
        public static string ConfigId(string device, string task, string resource)
        {
            return device + "_" + task + "_" + resource;
        }

        /// <summary>有序图的包配置 id：<c>{器件}_info_{NN}</c>（NN 从 01 起）。</summary>
        public static string InfoSpriteId(string device, int index)
        {
            return ConfigId(device, TaskInfo, index.ToString("D2"));
        }

        /// <summary>该分组名是不是本流水线管的（清理残留只动这一族，别碰别人手工建的分组）。</summary>
        public static bool IsManagedGroup(string groupName)
        {
            return !string.IsNullOrEmpty(groupName) &&
                   groupName.StartsWith(GroupPrefix, global::System.StringComparison.Ordinal);
        }
    }
}
