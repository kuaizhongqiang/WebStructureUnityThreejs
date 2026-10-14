using System.IO;
using UnityEngine;
using WSU3.Core.Models.Addressable;

namespace WSU3.Editor.Common
{
    // WHY: 共享内核 —— 同一路径字面量散落在各打包工具里时，换目录要逐个文件找；
    //      这里只放**当前真实被引用**的路径，不预先罗列将来可能用到的路径。
    /// <summary>编辑器工具链的工程路径常量 —— 唯一来源。</summary>
    public static class EditorPaths
    {
        /// <summary>内容 AB 的输入数据（内容数据两份里 Unity 这一份，DEC-82）。</summary>
        public const string ProjectDataJson = "Assets/StreamingAssets/Data/ProjectData.json";

        /// <summary>包配置主清单。运行期经 <c>Resources.Load&lt;PackageDatabaseSO&gt;("Config/PackageDB_Master")</c> 加载，路径即契约。</summary>
        public const string PackageDbAsset = "Assets/Resources/Config/PackageDB_Master.asset";

        /// <summary>场景 AA 路由表（运行期同名路径加载）。</summary>
        public const string SceneAAConfigAsset = "Assets/Resources/Config/SceneAAConfig.asset";

        /// <summary>编译就绪守卫盯的脚本：它没编译完时 <c>CreateAsset</c> 会写出 <c>m_Script:{fileID:0}</c> 的坏资产。</summary>
        public const string AbConfigScript = "Assets/Scripts/Core/Models/Addressable/ABPackageConfigSO.cs";

        /// <summary>内容包配置目录（一个 clip 的资源 → 多个 <c>AB_{id}.asset</c>）。</summary>
        public const string ContentConfigDir = "Assets/Resources/Config/ContentPackages";

        // WHY: 全局包（不属任何 clip，clipId 留空）与内容包分目录 —— 两者会被不同的工具清理残留，
        //      混在一个目录里会让"按本次产出清残留"互相误删。
        /// <summary>全局包配置目录（与项目无关的包，如 UI / 字体 / 相机背景）。</summary>
        public const string GlobalConfigDir = "Assets/Resources/Config/GlobalPackages";

        /// <summary>AB 输出根（相对工程根）；产物落 <c>{本目录}/{bundle 名首段}/</c>。</summary>
        public const string StreamingAssetsRoot = "Assets/StreamingAssets";

        /// <summary>内容 bundle 的输出目录段 —— 直接引用 <see cref="ContentNaming.BundleDirName"/>，保证"运行期拼 URL"与"工具写盘"用同一个常量。</summary>
        public const string ContentBundleDirName = ContentNaming.BundleDirName;

        /// <summary>
        /// 构建中转目录（Temp 下，不进版本库）：<c>&lt;工程&gt;/Temp/WSU3_{name}</c>。
        ///
        /// WHY 必须先构建到 Temp：<c>BuildAssetBundles</c> 会在输出根额外写一个"清单 bundle"（名字取自输出目录末段）
        /// 和配套的 <c>.manifest</c> —— 直接打到 StreamingAssets 会让这些中间物跟着玩家包一起发布。
        /// 落 Temp 后只把**bundle 本体**拷进 StreamingAssets（见 <see cref="BundleBuilder"/>）。
        /// </summary>
        public static string TempRoot(string name)
        {
            return Path.GetFullPath(Path.Combine(Application.dataPath, "../Temp/WSU3_" + name));
        }

        /// <summary>AB 构建报告的输出目录（不进版本库，见 ignore.conf 的 <c>Builds</c>）。</summary>
        public const string BuildReportDir = "Builds/assetbundles";
    }
}
