using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using UnityEditor;
using UnityEditor.AddressableAssets;
using UnityEditor.AddressableAssets.Settings;
using UnityEngine;
using WSU3.Core.Models.Addressable;

namespace WSU3.Editor.BuildTools
{
    /// <summary>
    /// 一个待注册进 Addressables 的组（= 一个内容包）。
    ///
    /// WHY 组粒度＝一个 clip（外加一个共享组）：与 AB 时代"一个 clip 一个包"同一个口径（DEC-87 纪律①），
    /// 切换任务时"卸旧 clip + 装新 clip"的动作不变，只是实现从 <c>bundle.Unload</c> 换成了
    /// <c>Addressables.Release(handle)</c>。
    /// </summary>
    public class AaGroupPlan
    {
        /// <summary>Addressables 分组名（<c>WSU3_Shared</c> / <c>WSU3_clip_xxx</c>）。</summary>
        public string groupName;

        /// <summary>包配置的落点目录。</summary>
        public string configDir;

        /// <summary>归属 clip（共享组为 null）。</summary>
        public string clipId;

        /// <summary>来源（内容包 / 共享材质包）。</summary>
        public string source;

        /// <summary>本组注册的资源条目。</summary>
        public readonly List<AaEntry> entries = new List<AaEntry>();
    }

    /// <summary>组内一条资源：包配置 id、地址与素材路径。</summary>
    public class AaEntry
    {
        /// <summary>
        /// 包配置 id（= 运行期取件键）。**为空表示这条只注册进 AA、不生成包配置**。
        ///
        /// WHY 需要这个区分（DEC-118）：共享材质组里 18 份材质是"AA 条目"，但运行期只会按
        /// <c>shared_model_materials</c> 一条取件（整组一起进来）；给每份材质单独生成一条包配置，
        /// 登记表就会多出 18 条没人会用的 id（第一批实测就有 27 条）。
        /// 而**每条 AA 条目仍然必须有 address**，否则它根本进不了 catalog。
        /// </summary>
        public string configId;

        /// <summary>Addressables 地址（运行期 <c>LoadAssetAsync</c> 的键）。</summary>
        public string address;

        /// <summary>资源工程路径（映射关系：共享组用 configId）。</summary>
        public string assetPath;

        /// <summary>资源类型（决定运行期泛型）。</summary>
        public ContentAssetKind kind;
    }

    /// <summary>
    /// AA 内容构建器：**把计划注册进 Addressables 并构建**。这是"地址与分组怎么落到 Addressables"的唯一落点。
    ///
    /// 关键决定（都写在这里，因为它们是踩坑点）：
    ///   ① **只在本次产出涉及的分组上动刀**：清残留只清 <c>WSU3_</c> 前缀的组，绝不碰别人手工建的分组
    ///      （AA 的 settings 是全局单例，误删别人的组是不可逆的现场破坏）。
    ///   ② **一个资源只能属于一个组**：Unity 的 Addressables 会把已在别的组里的条目**移动**过来。
    ///      共享材质因此天然不会在 8 个 clip 组里各存一份（这正是 shared 组要解决的问题）。
    ///   ③ **构建失败要如实回报**：<c>AddressablesPlayerBuildResult</c> 里有 Error 时不能让流水线报成功。
    /// </summary>
    public static class AaContentBuilder
    {
        /// <summary>构建结果摘要（给流水线写报告 / 打日志）。</summary>
        public class Outcome
        {
            public bool Ok;

            /// <summary>本次新增的 bundle 数（判成败的依据）。</summary>
            public int ProducedCount;

            /// <summary>输出目录里现存 bundle 总数。</summary>
            public int BundleCount;

            public int GroupCount;
            public int EntryCount;
            public long TotalBytes;
            public string OutputDir;
            public readonly List<string> Errors = new List<string>();
            public readonly List<string> Warnings = new List<string>();
            public readonly List<string> Lines = new List<string>();
        }

        /// <summary>拿到 Addressables 的全局设置（没有就创建一份默认的）。</summary>
        public static AddressableAssetSettings ResolveSettings()
        {
            AddressableAssetSettings settings = AddressableAssetSettingsDefaultObject.Settings;
            if (settings != null) return settings;

            // WHY: 首次在这台机器/这个工程跑 AA 时才需要 —— 正常工程里 AddressableAssetsData 已存在。
            AddressableAssetSettingsDefaultObject.GetSettings(true);
            return AddressableAssetSettingsDefaultObject.Settings;
        }

        /// <summary>把计划注册进 Addressables：建组 → 清本流水线的残留组与残留条目 → 逐条 CreateOrMoveEntry + 设地址。</summary>
        public static void Register(AddressableAssetSettings settings, IList<AaGroupPlan> plans, string logTag)
        {
            var expectedGroups = new HashSet<string>(plans.Select(p => p.groupName));

            // ① 清掉本流水线造过、但这次不该存在的组（改名 / 器件下线 / 仓库重建都会产生这种残留）
            var stale = new List<AddressableAssetGroup>();
            foreach (AddressableAssetGroup group in settings.groups)
            {
                if (group == null) continue;
                if (!ContentNaming.IsManagedGroup(group.Name)) continue;
                if (expectedGroups.Contains(group.Name)) continue;
                stale.Add(group);
            }
            for (int i = 0; i < stale.Count; i++)
            {
                Debug.Log($"{logTag} 清理残留分组：{stale[i].Name}");
                settings.RemoveGroup(stale[i]);
            }

            foreach (AaGroupPlan plan in plans)
            {
                AddressableAssetGroup group = settings.FindGroup(plan.groupName);
                if (group == null)
                {
                    group = settings.CreateGroup(plan.groupName, false, false, false, null,
                        typeof(UnityEditor.AddressableAssets.Settings.GroupSchemas.BundledAssetGroupSchema),
                        typeof(UnityEditor.AddressableAssets.Settings.GroupSchemas.ContentUpdateGroupSchema));
                    Debug.Log($"{logTag} 新建分组：{plan.groupName}");
                }

                // ② 组内条目全量重设：先删掉本组里已不在计划中的条目（改了 id / 素材搬走都会留下孤儿条目）
                var keep = new HashSet<string>(plan.entries.Select(e => e.address));
                var orphans = new List<AddressableAssetEntry>();
                foreach (AddressableAssetEntry entry in group.entries)
                {
                    if (entry == null) continue;
                    if (!keep.Contains(entry.address)) orphans.Add(entry);
                }
                for (int i = 0; i < orphans.Count; i++)
                {
                    Debug.Log($"{logTag} 清理残留条目：{plan.groupName} / {orphans[i].address}");
                    group.RemoveAssetEntry(orphans[i]);
                }

                var groupGuids = new HashSet<string>(StringComparer.Ordinal);
                foreach (AaEntry item in plan.entries)
                {
                    string guid = AssetDatabase.AssetPathToGUID(item.assetPath);
                    if (string.IsNullOrEmpty(guid))
                    {
                        Debug.LogError($"{logTag} {item.address}：取不到 GUID（素材 {item.assetPath} 未导入？），已跳过注册");
                        continue;
                    }

                    // WHY: **一个资源只能有一个 address** —— Addressables 的 entry 由 GUID 定位，
                    //      第二次 `entry.address = …` 会**静默覆盖**第一次（表现为某个地址"注册了却查不到"，
                    //      运行期 `InvalidKeyException: No Location found for Key=…`）。实测踩过，必须当场拦住。
                    //
                    // ⚠️ 这不是错误，是一种**预期内的取舍**：共享组的"组级配置"与"某份材质"难免指向同一份素材
                    //   （组级配置要拿一份代表素材当载体）。此时**先注册的那个地址生效**（组级地址优先，因为它在
                    //   entries 里排第一），别名地址让位。所以这里只记一条 Log，不报 Error ——
                    //   报 Error 会让每次打包都带一条假红字，久了就没人看红字了。
                    if (!groupGuids.Add(guid))
                    {
                        Debug.Log($"{logTag} {plan.groupName}：{item.assetPath} 已有 address，" +
                                  $"别名 '{item.address}' 未注册（一个资源只保留一个 address，先注册者生效）");
                        continue;
                    }

                    // WHY: CreateOrMoveEntry 会把该资源从原先所在的组**移**过来 —— 一个资源只能属于一个组，
                    //      这正是"共享材质不会在 8 个 clip 组里各存一份"的实现基础。
                    AddressableAssetEntry entry = settings.CreateOrMoveEntry(guid, group, false, false);
                    if (entry == null)
                    {
                        Debug.LogError($"{logTag} {item.address}：CreateOrMoveEntry 失败，已跳过");
                        continue;
                    }

                    entry.address = item.address;
                    entry.SetLabel(plan.clipId ?? "", true, true);   // 共享组无 clipId，标签留空
                }

                settings.SetDirty(AddressableAssetSettings.ModificationEvent.BatchModification, null, true, true);
            }
        }

        /// <summary>
        /// 调用 Addressables 构建（打包模式），返回**产物级**结果。
        ///
        /// WHY 用"数输出目录里的 bundle"来判成败，而不是读 <c>BuildPlayerContent()</c> 的返回值：
        ///   那个方法在不少版本里**返回 void**（反射一样能匹配到零参重载），于是"反射拿到 null"会被误判成
        ///   "构建失败" —— 实测踩过：日志明明写着 `Addressable content successfully built (duration : 0:00:23)`，
        ///   流水线却报失败、体积报 0.00 MB。
        ///   同时也要注意**不能**用"这次有没有新增文件"当判据：什么都没改就重跑时，
        ///   Addressables 会做一次 no-op 重建（实测 4.7 秒、bundle 哈希不变），那不是失败。
        ///   所以判据是"**输出目录里有 bundle**"，新增数只作为"是否真正重建过"的参考。
        /// </summary>
        public static Outcome BuildContent(AddressableAssetSettings settings, string logTag, string outputDirProjectRelative)
        {
            var outcome = new Outcome();

            if (EditorUtility.scriptCompilationFailed)
            {
                Debug.LogError($"{logTag} 编辑器处于脚本编译失败状态，已中止 AA 构建。");
                outcome.Errors.Add("脚本编译失败");
                return outcome;
            }

            EnsurePackedMode(settings, logTag);

            HashSet<string> before = SnapshotBundles(outputDirProjectRelative);

            Exception thrown = null;
            try
            {
                MethodInfo build = typeof(AddressableAssetSettings).GetMethod(
                    "BuildPlayerContent", BindingFlags.Public | BindingFlags.Static, null, Type.EmptyTypes, null);
                if (build == null)
                {
                    Debug.LogError($"{logTag} 找不到 AddressableAssetSettings.BuildPlayerContent()（Addressables 版本不匹配？）");
                    outcome.Errors.Add("找不到 BuildPlayerContent()");
                    return outcome;
                }
                build.Invoke(null, null);
            }
            catch (TargetInvocationException e)
            {
                thrown = e.InnerException ?? e;
            }
            catch (Exception e)
            {
                thrown = e;
            }

            HashSet<string> after = SnapshotBundles(outputDirProjectRelative);
            var produced = new List<string>();
            foreach (string file in after)
            {
                if (!before.Contains(file)) produced.Add(file);
            }

            outcome.BundleCount = after.Count;
            outcome.ProducedCount = produced.Count;
            outcome.TotalBytes = MeasureOutput(outputDirProjectRelative);

            if (thrown != null)
            {
                outcome.Ok = false;
                outcome.Errors.Add("构建抛异常：" + thrown.Message);
                Debug.LogError($"{logTag} AA 构建抛异常：{thrown.Message}");
                return outcome;
            }

            // WHY: 判据是"结果对"、不是"这次有没有新文件" ——
            //   **什么都没改就重跑，Addressables 会做一次 no-op 重建**（实测 4.7 秒、bundle 哈希不变），
            //   那不是失败，恰恰是最该发生的正常情况。真正的失败是"bundle 数不够 / 一个都没有"。
            if (after.Count == 0)
            {
                outcome.Ok = false;
                outcome.Errors.Add("输出目录里一个 bundle 都没有 —— 构建未产出内容");
                Debug.LogError($"{logTag} AA 构建没有产出任何 bundle（见上方 Console 的 Addressables 报错、以及 " +
                               "Library/com.unity.addressables/BuildReports/ 下的最新报告）");
                return outcome;
            }

            outcome.Ok = true;
            Debug.Log($"{logTag} AA 构建完成：新增 {produced.Count} 个 bundle / 现存 {after.Count} 个 / " +
                      $"{outcome.TotalBytes / 1024f / 1024f:N2} MB" +
                      (produced.Count == 0 ? "（无改动 ⇒ Addressables 走了 no-op 重建，这是正常的）" : ""));
            return outcome;
        }

        /// <summary>数一遍输出目录里的 bundle 文件名（用于构建前后对比）。</summary>
        private static HashSet<string> SnapshotBundles(string projectRelativeDir)
        {
            var set = new HashSet<string>(StringComparer.Ordinal);
            string dir = ResolveProjectPath(projectRelativeDir);
            if (!Directory.Exists(dir)) return set;

            foreach (string file in Directory.GetFiles(dir, "*.bundle", SearchOption.AllDirectories))
            {
                set.Add(Path.GetFileName(file));
            }
            return set;
        }

        /// <summary>工程相对路径 → 绝对路径。</summary>
        private static string ResolveProjectPath(string projectRelative)
        {
            return Path.GetFullPath(Path.Combine(Application.dataPath, "../" + projectRelative));
        }

        /// <summary>把 Player 构建脚本切到 Packed 模式（真构建产物）—— 否则 BuildPlayerContent 会走 Fast/Virtual 模式，产不出 bundle。</summary>
        private static void EnsurePackedMode(AddressableAssetSettings settings, string logTag)
        {
            int index = settings.ActivePlayerDataBuilderIndex;
            if (index >= 0 && index < settings.DataBuilders.Count)
            {
                UnityEngine.Object builder = settings.DataBuilders[index];
                if (builder != null && builder.GetType().Name.Contains("PackedMode")) return;
            }

            int packed = -1;
            for (int i = 0; i < settings.DataBuilders.Count; i++)
            {
                UnityEngine.Object builder = settings.DataBuilders[i];
                if (builder != null && builder.GetType().Name == "BuildScriptPackedMode") { packed = i; break; }
            }

            if (packed < 0)
            {
                Debug.LogWarning($"{logTag} 找不到 BuildScriptPackedMode，沿用当前 Player 构建脚本（产物可能不是真 bundle）");
                return;
            }

            settings.ActivePlayerDataBuilderIndex = packed;
            Debug.Log($"{logTag} 已把 Player 构建脚本切到 Packed 模式（index={packed}）");
        }

        /// <summary>统计产物体积（<c>Assets/StreamingAssets/aa</c> 下的全部文件）。</summary>
        public static long MeasureOutput(string projectRelativeDir)
        {
            string dir = Path.GetFullPath(Path.Combine(Application.dataPath, "../" + projectRelativeDir));
            if (!Directory.Exists(dir)) return 0L;

            long total = 0;
            foreach (string file in Directory.GetFiles(dir, "*", SearchOption.AllDirectories))
            {
                try { total += new FileInfo(file).Length; }
                catch (IOException) { /* 构建刚写完的临时文件可能被占用，体积统计失败不该让构建失败 */ }
            }
            return total;
        }
    }
}
