using System;

namespace WSU3.Core.Models.Addressable
{
    // WHY: 类型即加载链路（Default → Resources.Load、AA → Addressables、AB → StreamingAssets 上的 UnityWebRequest）；
    //      AddressableManager 按它路由，故改枚举值会改变某个资源走哪条链路。
    /// <summary>包类型枚举：标识资源的加载策略（Default / AA / AB）。</summary>
    [Serializable]
    public enum PackageType
    {
        /// <summary>内置：本地直引用（Resources / 序列化引用），不经过包系统。</summary>
        Default = 0,

        /// <summary>Addressables：支持依赖管理、引用计数、场景加载（漫游场景走这条）。</summary>
        AA = 1,

        /// <summary>传统 AssetBundle：从 StreamingAssets 经 UnityWebRequest 加载，生命周期手动管理（内容包走这条）。</summary>
        AB = 2,
    }
}
