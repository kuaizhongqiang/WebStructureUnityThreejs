using System;
using System.IO;
using UnityEditor;
using UnityEngine;
using WSU3.Core.Models.Addressable;

namespace WSU3.Editor.Common
{
    // WHY: 共享内核 —— "包配置怎么写"只该有一处。两份实现能各自独立写错
    //      （最容易错的是 assetKind：Provider 侧默认值与 SO 字段默认值并不一致，靠吃默认值就是侥幸）。
    /// <summary>生成 / 更新 <see cref="ABPackageConfigSO"/> —— "包配置怎么写"的唯一落点。</summary>
    public static class PackageConfigWriter
    {
        /// <summary>载入或创建 <c>{configDir}/AB_{id}.asset</c>（目录不存在先建、同名资产脚本丢失先删再建），交给 <c>fill</c> 填字段后返回资产。</summary>
        public static ABPackageConfigSO CreateOrUpdate(string configDir, string id, string logTag,
                                                      Action<ABPackageConfigSO> fill)
        {
            if (string.IsNullOrEmpty(configDir) || string.IsNullOrEmpty(id)) return null;

            EditorAssetUtil.EnsureFolder(configDir);

            string configPath = $"{configDir}/AB_{id}.asset";
            ABPackageConfigSO config = EditorAssetUtil.LoadOrCreateAsset<ABPackageConfigSO>(configPath, logTag);

            // WHY: CreateAsset 失败（父目录缺失 / 路径非法等）时不返回 null 保护就会变成一串 NRE
            if (config == null)
            {
                Debug.LogError($"{logTag} 包配置创建失败，已跳过：{configPath}");
                return null;
            }

            if (fill != null) fill(config);
            EditorUtility.SetDirty(config);
            return config;
        }

        // WHY: 两条不能动的语义 ——
        //   ① sourceAsset 必须置 null：它是直接引用，而配置资产在 Resources/ 下，
        //      一旦引用素材，Unity 会把素材一并打进 resources.assets（资源两份、AB 白打）；
        //   ② assetKind 必须**显式写**：运行期按它选泛型加载，不写就吃字段默认值，而该默认值在两边并不一致。
        /// <summary>包配置统一填充：id / clipId / assetKind / displayName / bundleName / assetPath / variant。</summary>
        public static void ApplyContent(ABPackageConfigSO config, string id, string clipId,
                                        string bundleName, string assetPath, ContentAssetKind kind)
        {
            if (config == null) return;

            config.id = id;
            config.clipId = clipId;
            config.assetKind = kind;
            config.displayName = Path.GetFileNameWithoutExtension(assetPath);
            config.sourceAsset = null;   // 见上方 ①
            config.bundleName = bundleName;
            config.assetPath = assetPath;
            config.variant = "";
        }
    }
}
