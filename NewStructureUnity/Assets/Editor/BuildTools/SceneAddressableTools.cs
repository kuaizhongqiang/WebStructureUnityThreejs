using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.AddressableAssets;
using UnityEditor.AddressableAssets.Build;
using UnityEditor.AddressableAssets.Settings;
using UnityEditor.AddressableAssets.Settings.GroupSchemas;
using UnityEngine;
using WSU3.Core.Models.Addressable;
using WSU3.Editor.Common;

namespace WSU3.Editor.BuildTools
{
    /// <summary>
    /// Addressables（AA）这一条链路的编辑器工具：**初始化设置 → 注册场景 → 构建 AA 内容**。
    ///
    /// 依据：docs/design/12 §4、DEC-87（AA 管场景）、docs/design/06 §3③（AA 内容的位置是本期最大的坑）。
    ///
    /// 为什么内容位置这件事要在这里说清楚：Addressables 1.22.3 默认 profile 的
    /// <c>Local.BuildPath</c> = <c>[Addressables.BuildPath]/[BuildTarget]</c>（在 <c>Library/</c> 下）、
    /// <c>Local.LoadPath</c> = <c>{Addressables.RuntimePath}/[BuildTarget]</c>（解析到
    /// <c>StreamingAssets/aa/[BuildTarget]</c>）。也就是说**默认口径就已经**是"内容跟着玩家包一起走"
    /// （这就是 docs/design/06 §3③ 的 B 方案），不需要手工改 profile。
    /// 但这条是**读数**不是假设 —— 本工具会把当前生效的路径打出来，改动 profile 后一眼能看出漂了。
    /// </summary>
    public static class SceneAddressableTools
    {
        private const string LogTag = "[AA]";

        /// <summary>AA 场景所在的分组名（与全部 AA 场景同名同组，便于整体重注册 / 清理）。</summary>
        private const string SceneGroupName = "Scenes";

        // ── 菜单 ──────────────────────────────────────────────────────────

        [MenuItem("WSU3/Pack/Addressables/初始化设置与默认分组", false, 40)]
        public static void InitializeSettings()
        {
            AddressableAssetSettings settings = GetOrCreateSettings(interactive: true);
            if (settings == null) return;

            PrintProfilePaths();

            EditorUtility.DisplayDialog("Addressables",
                $"✔ 设置已就绪：{PathOf(settings)}\n" +
                $"分组：{settings.groups.Count} 个\n\n" +
                "内容位置（当前 profile 生效值）见 Console。", "确定");
        }

        [MenuItem("WSU3/Pack/Addressables/同步场景分组（按 SceneAAConfig）", false, 41)]
        public static void SyncSceneGroup()
        {
            AddressableAssetSettings settings = GetOrCreateSettings(interactive: true);
            if (settings == null) return;

            SceneAddressableConfig config = LoadOrCreateSceneConfig();
            if (config == null) return;

            if (config.scenes.Count == 0)
            {
                // 漫游场景还没做时这是**正常状态**，不是错误 —— 说清楚为什么什么都没变
                EditorUtility.DisplayDialog("Addressables 场景分组",
                    $"SceneAAConfig 里还没有登记任何场景（{EditorPaths.SceneAAConfigAsset}）。\n\n" +
                    "本工程目前只有 `0_Setup` / `1_Content` 两个常驻场景，它们走普通构建（进 Build Settings），" +
                    "不走 AA。等漫游场景落地后再登记。", "确定");
                return;
            }

            AddressableAssetGroup group = GetOrCreateGroup(settings, SceneGroupName);
            if (group == null) return;

            int added = 0;
            var registered = new List<string>();

            foreach (SceneAAEntry entry in config.scenes)
            {
                if (entry == null) continue;
                if (entry.sceneAsset == null)
                {
                    Debug.LogWarning($"{LogTag} 跳过 {entry.sceneName}：sceneAsset 未赋值");
                    continue;
                }

                string path = AssetDatabase.GetAssetPath(entry.sceneAsset);
                string guid = string.IsNullOrEmpty(path) ? null : AssetDatabase.AssetPathToGUID(path);
                if (string.IsNullOrEmpty(guid))
                {
                    Debug.LogWarning($"{LogTag} 跳过 {entry.sceneName}：取不到 GUID（路径 {path}）");
                    continue;
                }

                AddressableAssetEntry aaEntry = settings.CreateOrMoveEntry(guid, group, false, true);
                if (aaEntry == null) continue;

                aaEntry.address = string.IsNullOrEmpty(entry.address)
                    ? "scene/" + entry.sceneName.ToLowerInvariant()
                    : entry.address;

                added++;
                registered.Add($"{entry.sceneName} → {aaEntry.address}");
            }

            // WHY: 走 AA 的场景**必须从 Build Settings 移除** —— 两边都留会让同一份场景既被打进玩家包、
            //      又被 AA 当内容带着（包体翻倍），而且运行时不知道该用哪一份。
            int removed = RemoveFromBuildSettings(config);

            EditorUtility.SetDirty(settings);
            AssetDatabase.SaveAssets();

            Debug.Log($"{LogTag} 场景分组已同步：+{added}（从 Build Settings 移除 {removed}）\n   " +
                      string.Join("\n   ", registered));
            EditorUtility.DisplayDialog("Addressables 场景分组",
                $"✔ 已注册 {added} 个场景到分组 {SceneGroupName}\n" +
                $"✔ 已从 Build Settings 移除 {removed} 个\n\n" +
                "⚠ 内容还没构建 —— 打包前记得跑「构建 AA 内容」。", "确定");
        }

        [MenuItem("WSU3/Pack/Addressables/构建 AA 内容", false, 42)]
        public static void BuildContent()
        {
            AddressableAssetSettings settings = AddressableAssetSettingsDefaultObject.Settings;
            if (settings == null)
            {
                EditorUtility.DisplayDialog("Addressables", "设置不存在，先跑「初始化设置与默认分组」。", "确定");
                return;
            }

            // WHY: 编辑器停在"脚本编译失败"状态时 SBP 会直接抛错并秒退，且 Console 里可能已经看不到红字 —— 提前拦下
            if (EditorUtility.scriptCompilationFailed)
            {
                Debug.LogError($"{LogTag} 编辑器处于脚本编译失败状态，已中止。" +
                               "清干净报错；若已无报错，执行 Assets > Reimport 清掉残留的失败状态再重跑。");
                return;
            }

            PrintProfilePaths();

            if (!EditorUtility.DisplayDialog("Addressables",
                    $"将构建全部 AA 内容（{settings.groups.Count} 个分组）。\n\n" +
                    "内容位置见 Console（当前 profile 生效值）。\n是否继续？", "构建", "取消"))
                return;

            AddressableAssetSettings.BuildPlayerContent(out AddressablesPlayerBuildResult result);

            // WHY: 必须显式判错 —— 不看返回值就打印"构建完成"，会把 "scripts have compile errors" 这类失败伪装成成功
            if (result == null || !string.IsNullOrEmpty(result.Error))
            {
                string error = result == null ? "未返回构建结果" : result.Error;
                Debug.LogError($"{LogTag} AA 内容构建失败：{error}");
                EditorUtility.DisplayDialog("Addressables",
                    $"✖ AA 内容构建失败，未产出有效资源包\n\n{error}\n\n完整报错见 Console。", "确定");
                return;
            }

            Debug.Log($"{LogTag} AA 内容构建完成：用时 {result.Duration:F1}s → {result.OutputPath}");
            EditorUtility.DisplayDialog("Addressables",
                $"✔ AA 内容已构建（用时 {result.Duration:F0}s）\n{result.OutputPath}", "确定");
        }

        [MenuItem("WSU3/Pack/Addressables/清理场景分组", false, 43)]
        public static void CleanSceneGroup()
        {
            AddressableAssetSettings settings = AddressableAssetSettingsDefaultObject.Settings;
            if (settings == null)
            {
                EditorUtility.DisplayDialog("Addressables", "设置不存在，无需清理。", "确定");
                return;
            }

            AddressableAssetGroup group = settings.FindGroup(SceneGroupName);
            if (group == null)
            {
                EditorUtility.DisplayDialog("Addressables", $"分组 {SceneGroupName} 不存在，无需清理。", "确定");
                return;
            }

            int count = group.entries.Count;
            AddressableAssetEntry[] entries = group.entries.ToArray();
            foreach (AddressableAssetEntry entry in entries) settings.RemoveAssetEntry(entry.guid, false);
            settings.RemoveGroup(group);

            EditorUtility.SetDirty(settings);
            AssetDatabase.SaveAssets();

            Debug.Log($"{LogTag} 已清理场景分组：移除 {count} 个条目");
            EditorUtility.DisplayDialog("Addressables", $"✔ 已移除 {count} 个条目并删掉分组 {SceneGroupName}", "确定");
        }

        // ── 基础设施 ──────────────────────────────────────────────────────

        // WHY: 用官方 API 建设置（而不是手工拼 AddressableAssetsData 下的资产）——
        //      它会把默认分组、profile、schema 一次配齐；手工拼容易漏一个 schema 而报错在构建期。
        private static AddressableAssetSettings GetOrCreateSettings(bool interactive)
        {
            AddressableAssetSettings settings = AddressableAssetSettingsDefaultObject.GetSettings(true);
            if (settings != null) return settings;

            const string msg = "Addressables 设置创建失败（见 Console）。";
            Debug.LogError($"{LogTag} {msg}");
            if (interactive) EditorUtility.DisplayDialog("Addressables", msg, "确定");
            return null;
        }

        private static AddressableAssetGroup GetOrCreateGroup(AddressableAssetSettings settings, string name)
        {
            AddressableAssetGroup group = settings.FindGroup(name);
            if (group == null) group = settings.CreateGroup(name, false, false, false, null);
            if (group == null) return null;

            // WHY: 没有 BundledAssetGroupSchema 的分组不会被构建出内容；ContentUpdateGroupSchema 决定它能不能做内容更新 ——
            //      两者缺一，分组在编辑器里"看起来在"，一构建就什么都没有。
            if (group.GetSchema<BundledAssetGroupSchema>() == null) group.AddSchema<BundledAssetGroupSchema>();
            if (group.GetSchema<ContentUpdateGroupSchema>() == null) group.AddSchema<ContentUpdateGroupSchema>();

            return group;
        }

        private static SceneAddressableConfig LoadOrCreateSceneConfig()
        {
            var config = AssetDatabase.LoadAssetAtPath<SceneAddressableConfig>(EditorPaths.SceneAAConfigAsset);
            if (config != null) return config;

            EditorAssetUtil.EnsureFolder(Path.GetDirectoryName(EditorPaths.SceneAAConfigAsset).Replace('\\', '/'));
            config = ScriptableObject.CreateInstance<SceneAddressableConfig>();
            AssetDatabase.CreateAsset(config, EditorPaths.SceneAAConfigAsset);
            AssetDatabase.SaveAssets();

            Debug.Log($"{LogTag} 已创建场景 AA 配置：{EditorPaths.SceneAAConfigAsset}");
            Selection.activeObject = config;
            EditorUtility.DisplayDialog("Addressables",
                $"已创建场景 AA 配置（内容为空）：\n{EditorPaths.SceneAAConfigAsset}\n\n" +
                "登记好场景与 address 后再跑一次本菜单。", "确定");
            return null;
        }

        /// <summary>把 AA 路由的场景从 Build Settings 移除，返回移除数量。</summary>
        private static int RemoveFromBuildSettings(SceneAddressableConfig config)
        {
            var aaPaths = new HashSet<string>();
            foreach (SceneAAEntry entry in config.scenes)
            {
                if (entry == null || entry.sceneAsset == null) continue;
                string path = AssetDatabase.GetAssetPath(entry.sceneAsset);
                if (!string.IsNullOrEmpty(path)) aaPaths.Add(path);
            }

            EditorBuildSettingsScene[] existing = EditorBuildSettings.scenes;
            EditorBuildSettingsScene[] updated = existing.Where(s => !aaPaths.Contains(s.path)).ToArray();

            EditorBuildSettings.scenes = updated;
            return existing.Length - updated.Length;
        }

        /// <summary>把当前生效的 profile 路径打出来（"内容跑到构建目录之外"这个坑的可见读数）。</summary>
        private static void PrintProfilePaths()
        {
            AddressableAssetSettings settings = AddressableAssetSettingsDefaultObject.Settings;
            if (settings == null) return;

            try
            {
                string profileId = settings.activeProfileId;
                string buildPath = settings.profileSettings.GetValueByName(profileId, "Local.BuildPath");
                string loadPath = settings.profileSettings.GetValueByName(profileId, "Local.LoadPath");

                Debug.Log($"{LogTag} 当前 profile（{settings.profileSettings.GetProfileName(profileId)}）路径：\n" +
                          $"   Local.BuildPath = {buildPath}\n" +
                          $"   Local.LoadPath  = {loadPath}\n" +
                          "   （默认口径下 LoadPath 落在 StreamingAssets/aa/[BuildTarget]，" +
                          "即内容随玩家包一起走 —— 见 docs/design/06 §3③）");
            }
            catch (Exception e)
            {
                Debug.LogWarning($"{LogTag} 读不到 profile 路径（不影响构建）：{e.Message}");
            }
        }

        private static string PathOf(AddressableAssetSettings settings)
        {
            string path = AssetDatabase.GetAssetPath(settings);
            return string.IsNullOrEmpty(path) ? "（未落盘？）" : path;
        }
    }
}
