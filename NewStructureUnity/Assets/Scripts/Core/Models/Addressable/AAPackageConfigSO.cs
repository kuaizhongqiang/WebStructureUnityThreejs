using UnityEngine;

namespace WSU3.Core.Models.Addressable
{
    // WHY: 派生 SO 必须独占一个与类同名的文件，否则 CreateAsset 出来的资产 m_Script 为 0（脚本丢失）。
    /// <summary>
    /// Addressables（AA）配置：声明资源地址、标签、分组名与资源类型，运行期按 address 加载。
    ///
    /// 2026-10-14（全量迁 AA，DEC-118）：本类现在是**内容包的唯一载体** ——
    /// 原先"内容包走 AB、漫游场景走 AA"的双链路已合并，模型预制体也走 AA。
    /// 于是把原先住在 ABPackageConfigSO 上的两个字段搬了过来：
    ///   · <see cref="clipId"/> —— 内容包按 clip 聚合成组（装卸纪律靠它，与 AB 时代同一个口径）；
    ///   · <see cref="assetKind"/> —— 运行期按它选泛型加载（AB 时代的老坑，见下）。
    /// </summary>
    [CreateAssetMenu(
        fileName = "AA_",
        menuName = "WSU3/Package/Addressable (AA)",
        order = 10)]
    public class AAPackageConfigSO : PackageConfigSO
    {
        [Header("Addressable 设置")]
        [Tooltip("Addressables 系统中的资源地址（运行期加载的唯一标识）。\n\n" +
                 "例如 scene/roaming 或 contactor_structure_model；建议按类别分层命名，方便分组与管理")]
        public string address;

        [Tooltip("资源标签，用于批量加载或分组筛选（运行期可按标签一次取一组）")]
        public string[] labels;

        [Tooltip("Addressables 分组名（仅编辑器用，运行期不读）。构建 AA 内容时资源会被放进同名分组")]
        public string groupName;

        [Header("内容包归属（仅内容包填写）")]
        [Tooltip("归属的 ProjectClip.id（如 clip_contactor）；全局包/漫游场景一律留空。\n\n" +
                 "内容流水线按它聚合：一个 clip 一个组，装载与卸载都以 clip 为单位")]
        public string clipId;

        [Tooltip("资源类型 —— 决定运行期用哪个泛型加载。\n\n" +
                 "必须准确：.png 导入为 Sprite 时主资产是 Texture2D、Sprite 是子资产，\n" +
                 "用 Object 泛型只会拿到 Texture2D（as Sprite 永远为 null）。\n" +
                 "由流水线按 Provider 写入；全局包同样必须写准")]
        public ContentAssetKind assetKind = ContentAssetKind.Sprite;

        public override PackageType PackageType => PackageType.AA;

        public override string GetLoadKey() => address;

        // WHY: 只在 address 为空时填，避免覆盖手工填写的地址。
        /// <summary>Editor 工具：address 为空时用 sourceAsset 的文件名（不含扩展名）填充。</summary>
        public void AutoAssignAddress()
        {
            if (string.IsNullOrEmpty(address) && sourceAsset != null)
                address = sourceAsset.name;
        }

        /// <summary>该配置是否能被运行期按 address 装载（地址为空 = 装了也取不到，属配置错误）。</summary>
        public bool HasUsableAddress => !string.IsNullOrEmpty(address);
    }
}
