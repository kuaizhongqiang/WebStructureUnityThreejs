using System;
using System.Collections.Generic;
using UnityEngine;

namespace WSU3.Core.Models.Addressable
{
    // WHY: 场景走不走 AA 的**唯一判定源** —— AddressableManager 的 IsSceneAA / GetSceneAddress 读它；
    //      放 Resources/ 下保证运行期与编辑器取到同一份（DEC-87 的"包登记表落 Resources/Config"）。
    /// <summary>场景 AA 路由表：列出哪些场景走 Addressables 及其 address（漫游场景走这条链路）。</summary>
    [CreateAssetMenu(fileName = "SceneAAConfig", menuName = "WSU3/Scene AA Config")]
    public class SceneAddressableConfig : ScriptableObject
    {
        [Tooltip("需要走 Addressables 加载的场景列表")]
        public List<SceneAAEntry> scenes = new List<SceneAAEntry>();

        /// <summary>按场景名查配置（运行期）。</summary>
        public SceneAAEntry GetEntryBySceneName(string sceneName)
        {
            if (string.IsNullOrEmpty(sceneName)) return null;
            return scenes.Find(e => e != null && e.sceneName == sceneName);
        }

        /// <summary>按 address 查配置。</summary>
        public SceneAAEntry GetEntryByAddress(string address)
        {
            if (string.IsNullOrEmpty(address)) return null;
            return scenes.Find(e => e != null && e.address == address);
        }
    }

    /// <summary>一条场景 AA 路由：场景名 ↔ address。</summary>
    [Serializable]
    public class SceneAAEntry
    {
        [Tooltip("场景名（不含扩展名），如 Roaming")]
        public string sceneName;

        [Tooltip("Addressables 运行期地址，如 scene/roaming")]
        public string address;

#if UNITY_EDITOR
        [Tooltip("场景资源引用（仅编辑器用，用于解析路径与注册 AA 条目）")]
        public UnityEditor.SceneAsset sceneAsset;
#endif
    }
}
