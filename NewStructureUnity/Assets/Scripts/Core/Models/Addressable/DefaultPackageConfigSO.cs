using UnityEngine;

namespace WSU3.Core.Models.Addressable
{
    // WHY: 派生 SO 必须独占一个与类同名的文件，否则 CreateAsset 出来的资产 m_Script 为 0（脚本丢失）。
    /// <summary>内置（Default）配置：资源走 Resources，加载键即 id（"全局单例资源"这条链路）。</summary>
    [CreateAssetMenu(
        fileName = "Default_",
        menuName = "WSU3/Package/Default (Local)",
        order = 30)]
    public class DefaultPackageConfigSO : PackageConfigSO
    {
        // WHY: 内置链路的加载键就是 Resources 下的路径 —— 按约定 id 直接等于该路径
        //      （现有 Resources 资产如 MainCamera / Manager / FocusRotationControl / Highlight 都满足这条）。
        public override PackageType PackageType => PackageType.Default;

        public override string GetLoadKey() => id;
    }
}
