namespace WSU3.Core.Models.Addressable
{
    // WHY: 命名规则的**唯一来源**（编辑器流水线与运行期都取这里，测试也读这里）——
    //      「包配置 id 用器件小驼峰」与「bundle 名用器件全小写」是两套东西，混用会让打包写盘与运行期拼 URL 对不上；
    //      bundle 的**文件名段**必须全小写，否则 WebGL / Linux 上必然 404（Windows 上看不出问题）。
    /// <summary>内容 AB 命名规则的唯一来源：包配置 id 与 bundle 名的拼装与校验。</summary>
    public static class ContentNaming
    {
        /// <summary><c>ProjectClip.id</c> 的前缀（内容数据的稳定主键，docs/design/04 §2.1）。</summary>
        public const string ClipIdPrefix = "clip_";

        /// <summary>bundle 的输出目录段（= 相对 StreamingAssets 的一级目录，DEC-87 的"包名首段"）。</summary>
        public const string BundleDirName = "Content";

        /// <summary>bundle 文件名段的前缀。</summary>
        public const string BundleFilePrefix = "clip_";

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

        /// <summary><c>contactor</c> → <c>Content/clip_contactor</c>（**文件名段小写**）。</summary>
        public static string BundleNameFor(string device)
        {
            return BundleDirName + "/" + (BundleFilePrefix + device).ToLowerInvariant();
        }

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

        /// <summary>bundle 名的文件名段是否全小写（对账用；目录段不参与判断）。</summary>
        public static bool IsBundleFileNameLowerCase(string bundleName)
        {
            if (string.IsNullOrEmpty(bundleName)) return false;

            string fileName = bundleName;
            int slash = fileName.LastIndexOf('/');
            if (slash >= 0) fileName = fileName.Substring(slash + 1);

            return fileName == fileName.ToLowerInvariant();
        }

        /// <summary>bundle 名的目录段（<c>Content/clip_contactor</c> → <c>Content</c>）；不是"目录段/文件名段"两段式时返回 null。</summary>
        public static string BundleDirSegmentOf(string bundleName)
        {
            if (string.IsNullOrEmpty(bundleName)) return null;

            string[] parts = bundleName.Split('/');
            return parts.Length == 2 && parts[0].Length > 0 && parts[1].Length > 0 ? parts[0] : null;
        }
    }
}
