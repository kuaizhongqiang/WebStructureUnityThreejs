using UnityEngine;

namespace WSU3.Core.Models.Addressable
{
    // WHY: 基类与各具体子类必须拆成"一个类一个同名文件" —— Unity 只给"文件名 = 类名"的类生成 MonoScript，
    //      子类与基类同文件时 CreateInstance + CreateAsset 出来的资产 m_Script 为 0（脚本丢失、加载为 null，
    //      表现为"配置生成了但登记表收不到"）。
    /// <summary>包配置基类：一个 .asset 描述一份可打包资源，编辑器打包工具与运行期加载共用。</summary>
    public abstract class PackageConfigSO : ScriptableObject
    {
        [Header("基础信息")]
        [Tooltip("资产的唯一标识符，运行期通过此 id 查找与加载该资源，请确保不与其他包重复")]
        public string id;

        [Tooltip("显示名称，仅用于编辑器识别与日志输出，不影响运行期加载")]
        public string displayName;

        [Header("目标资源")]
        [Tooltip("要打包的实际资产（预制体、贴图、音频等）。\n\n" +
                 "⚠ 本字段是**直接引用**：配置资产位于 Resources/ 下时，被它引用的资源会被一并打进 resources.assets，\n" +
                 "   资源变两份、AB 打包失去意义。因此 AB 流水线只写 assetPath / bundleName 两个字符串，本字段一律留空")]
        public Object sourceAsset;

        /// <summary>包类型（AA / AB / Default），由子类固定返回 —— 运行期按它路由到三条链路之一。</summary>
        public abstract PackageType PackageType { get; }

        /// <summary>运行期加载键：AA → address，AB → bundleName:assetPath，Default → id。</summary>
        public abstract string GetLoadKey();

#if UNITY_EDITOR
        /// <summary>目标资源在工程中的相对路径（只读），由 sourceAsset 推导，供打包工具使用。</summary>
        public string SourceAssetPath =>
            UnityEditor.AssetDatabase.GetAssetPath(sourceAsset);
#endif
    }
}
