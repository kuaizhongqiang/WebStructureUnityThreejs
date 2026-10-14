namespace WSU3.Editor.Common
{
    // WHY: 共享内核 —— 同一路径字面量散落在各打包工具里时，换目录要逐个文件找；
    //      这里只放**当前真实被引用**的路径，不预先罗列将来可能用到的路径。
    /// <summary>编辑器工具链的工程路径常量 —— 唯一来源。</summary>
    public static class EditorPaths
    {
        /// <summary>内容流水线的输入数据（内容数据两份里 Unity 这一份，DEC-82）。</summary>
        public const string ProjectDataJson = "Assets/StreamingAssets/Data/ProjectData.json";

        /// <summary>包配置主清单。运行期经 <c>Resources.Load&lt;PackageDatabaseSO&gt;("Config/PackageDB_Master")</c> 加载，路径即契约。</summary>
        public const string PackageDbAsset = "Assets/Resources/Config/PackageDB_Master.asset";

        /// <summary>场景 AA 路由表（运行期同名路径加载）。</summary>
        public const string SceneAAConfigAsset = "Assets/Resources/Config/SceneAAConfig.asset";

        /// <summary>编译就绪守卫盯的脚本：它没编译完时 <c>CreateAsset</c> 会写出 <c>m_Script:{fileID:0}</c> 的坏资产。</summary>
        public const string AaConfigScript = "Assets/Scripts/Core/Models/Addressable/AAPackageConfigSO.cs";

        /// <summary>内容包配置目录（一个 clip 的资源 → 多个 <c>AA_{id}.asset</c>）。</summary>
        public const string ContentConfigDir = "Assets/Resources/Config/ContentPackages";

        // WHY: 全局包（不属任何 clip，clipId 留空）与内容包分目录 —— 两者会被不同的工具清理残留，
        //      混在一个目录里会让"按本次产出清残留"互相误删。
        /// <summary>全局包配置目录（与项目无关的包，如 UI / 字体 / 相机背景）。</summary>
        public const string GlobalConfigDir = "Assets/Resources/Config/GlobalPackages";

        /// <summary>
        /// AA 构建产物落点的**工程相对目录**（Addressables 自己的输出，不是我们拷的）。
        ///
        /// WHY 落在这里而不是 `Assets/StreamingAssets/aa`：Addressables 1.22.3 的
        /// <c>BuildPlayerContent()</c> 把包写进 <c>Library/com.unity.addressables/aa/&lt;平台&gt;/</c>，
        /// **再由 <c>AddressablesPlayerBuildProcessor</c> 在 Build Player 时**拷进
        /// <c>Assets/StreamingAssets/aa/&lt;平台&gt;/</c>（从而被 Unity 带进 WebGL 产物）。
        /// 实测：只调 BuildPlayerContent 时 StreamingAssets/aa 是空的、包都在 Library 下 —— 这是设计如此。
        /// 所以"有没有产出"必须查这个目录（见 AaContentBuilder.SnapshotBundles）。
        /// </summary>
        public const string AddressablesBuildOutputDir = "Library/com.unity.addressables/aa";

        /// <summary>AA 产物随 Build Player 落进 StreamingAssets 的位置（WebGL 产物里就是 HTTP 路径）。</summary>
        public const string AddressablesPlayerOutputDir = "Assets/StreamingAssets/aa";

        /// <summary>构建报告的输出目录（不进版本库，见 ignore.conf 的 <c>Builds</c>）。</summary>
        public const string BuildReportDir = "Builds/assetbundles";
    }
}
