using System;

namespace WSU3.Core.Models.Addressable
{
    // WHY: 类型即加载链路（Default → Resources.Load、AA → Addressables）；
    //      AddressableManager 按它路由，故改枚举值会改变某个资源走哪条链路。
    //
    // 2026-10-14（全量迁 AA）：**删掉了 `AB = 2`**。原因见 DEC-117/DEC-118 ——
    //   手写 AssetBundle 链路与 AA 底层是同一条（都是 BuildAssetBundles 产物），
    //   却要多养一套"拼 URL + 自己管 bundle.Unload + 保证末段小写"的纪律；
    //   而 AA 天然给了编辑器 Play 走 AssetDatabase 的能力（Play Mode Script），
    //   这正是"编辑器里加载 WebGL bundle 必然洋红"的死结。故内容包一律走 AA。
    /// <summary>包类型枚举：标识资源的加载策略（Default / AA）。</summary>
    [Serializable]
    public enum PackageType
    {
        /// <summary>内置：本地直引用（Resources / 序列化引用），不经过包系统。</summary>
        Default = 0,

        /// <summary>Addressables：支持依赖管理、引用计数、场景加载（内容包与漫游场景都走这条）。</summary>
        AA = 1,
    }
}
