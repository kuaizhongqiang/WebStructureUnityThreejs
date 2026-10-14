using UnityEngine;

namespace WSU3.Core.Models.Addressable
{
    // WHY: 派生 SO 必须独占一个与类同名的文件，否则 CreateAsset 出来的资产 m_Script 为 0（脚本丢失）。
    /// <summary>Addressables（AA）配置：声明资源地址、标签与 AA 分组名，运行期按 address 加载。</summary>
    [CreateAssetMenu(
        fileName = "AA_",
        menuName = "WSU3/Package/Addressable (AA)",
        order = 10)]
    public class AAPackageConfigSO : PackageConfigSO
    {
        [Header("Addressable 设置")]
        [Tooltip("Addressables 系统中的资源地址（运行期加载的唯一标识）。\n\n" +
                 "例如 scene/roaming；建议按类别分层命名，方便分组与管理")]
        public string address;

        [Tooltip("资源标签，用于批量加载或分组筛选（运行期可按标签一次取一组）")]
        public string[] labels;

        [Tooltip("Addressables 分组名（仅编辑器用，运行期不读）。构建 AA 内容时资源会被放进同名分组")]
        public string groupName;

        public override PackageType PackageType => PackageType.AA;

        public override string GetLoadKey() => address;

        // WHY: 只在 address 为空时填，避免覆盖手工填写的地址。
        /// <summary>Editor 工具：address 为空时用 sourceAsset 的文件名（不含扩展名）填充。</summary>
        public void AutoAssignAddress()
        {
            if (string.IsNullOrEmpty(address) && sourceAsset != null)
                address = sourceAsset.name;
        }
    }
}
