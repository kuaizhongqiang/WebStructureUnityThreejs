using UnityEngine;

namespace WSU3.Core.Models.Addressable
{
    // WHY: 派生 SO 必须独占一个与类同名的文件，否则 CreateAsset 出来的资产 m_Script 为 0（脚本丢失）。
    /// <summary>AssetBundle（AB）配置：声明所属 clip、资源类型、bundle 名与包内资源路径，运行期从 StreamingAssets 加载。</summary>
    [CreateAssetMenu(
        fileName = "AB_",
        menuName = "WSU3/Package/AssetBundle (AB)",
        order = 20)]
    public class ABPackageConfigSO : PackageConfigSO
    {
        [Header("AssetBundle 设置")]
        [Tooltip("归属的 ProjectClip.id（如 clip_contactor）。\n\n" +
                 "内容 AB 流水线按它聚合：一个 clip 一个包，装载与卸载都以 clip 为单位\n" +
                 "由编辑器工具自动填写；全局包（UI / 字体 / 相机背景这类与项目无关的包）一律留空")]
        public string clipId;

        [Tooltip("资源类型 —— 决定运行期用哪个泛型加载。\n\n" +
                 "必须准确：.png 导入为 Sprite 时主资产是 Texture2D、Sprite 是子资产，\n" +
                 "用 Object 泛型只会拿到 Texture2D（as Sprite 永远为 null）\n" +
                 "由流水线按 Provider 写入；全局包同样必须写准")]
        public ContentAssetKind assetKind = ContentAssetKind.Sprite;

        [Tooltip("AssetBundle 名 = 相对 StreamingAssets 的路径（不含扩展名）。\n\n" +
                 "打包时资源被分配到此 Bundle 中；运行期从 StreamingAssets/{bundleName} 加载该 Bundle\n" +
                 "⚠ 文件名段用**小写**：运行期会把末段强制小写，而工具写盘按原样保留，\n" +
                 "   两者不一致时 Windows 看不出问题，但 WebGL / Linux 上必然 404")]
        public string bundleName;

        [Tooltip("AB 包变体标识（可选，例如 hd / sd）。本期留空")]
        public string variant;

        [Tooltip("资产的完整工程路径（如 Assets/Prefabs/Models/StructureObjs/xxx.prefab）。\n\n" +
                 "Editor 下由流水线自动填充；运行期由此路径在 Bundle 内查找资源")]
        public string assetPath;

        public override PackageType PackageType => PackageType.AB;

        /// <summary>加载键：<c>bundleName:assetPath</c>（冒号前定位 StreamingAssets 中的包，冒号后定位包内资源）。</summary>
        public override string GetLoadKey() => bundleName + ":" + assetPath;

#if UNITY_EDITOR
        /// <summary>Editor 工具：assetPath 为空时填入 sourceAsset 的工程相对路径。</summary>
        public void AutoAssignPath()
        {
            if (string.IsNullOrEmpty(assetPath) && sourceAsset != null)
                assetPath = UnityEditor.AssetDatabase.GetAssetPath(sourceAsset);
        }
#endif
    }
}
