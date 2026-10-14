namespace WSU3.Core.Models.Addressable
{
    // WHY: .png 导入为 Sprite 时主资产是 Texture2D、Sprite 是**子资产**，用 Object 泛型只会拿到 Texture2D（as Sprite 永远为 null）；
    //      图集必须记 Sprite、模型必须记 Prefab，否则运行期加载到的是 null。
    // WHY: 这条字段绝不是"对本包无意义的假值"—— 编辑器打包流水线的素材校验按它分支，运行期取件也按它选泛型，写错就是加载拿到 null。
    /// <summary>内容资源类型：决定运行时用哪个泛型加载（Sprite / Prefab / Font / TmpFont / Material）。</summary>
    public enum ContentAssetKind
    {
        /// <summary>贴图 —— 按 <c>Sprite</c> 泛型加载（取子资产）。</summary>
        Sprite = 0,

        /// <summary>预制体 —— 按 <c>GameObject</c> 泛型加载。</summary>
        Prefab = 1,

        // WHY: 下面两项服务"字体包"这类全局包；内容包（按 clip）的 provider 永远不会产出它们。
        //      枚举值只能往后追加、不能改现有值：assetKind 以整数序列化进既有配置资产，改值会让老配置的含义整体错位。
        /// <summary>Legacy 字体 —— 按 <c>UnityEngine.Font</c> 泛型加载。</summary>
        Font = 2,

        /// <summary>TMP 字体资产 —— 按 <c>TMPro.TMP_FontAsset</c> 泛型加载。</summary>
        TmpFont = 3,

        // WHY: 共享材质包（DEC-118）里的条目是材质，运行期按 Material 泛型取件；
        //      同样只能往后追加，见上方那条注释。
        /// <summary>材质 —— 按 <c>UnityEngine.Material</c> 泛型加载（共享材质包用）。</summary>
        Material = 4,
    }
}
