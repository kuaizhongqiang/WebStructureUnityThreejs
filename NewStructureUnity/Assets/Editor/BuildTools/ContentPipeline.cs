using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using UnityEditor;
using UnityEditor.AddressableAssets;
using UnityEditor.AddressableAssets.Settings;
using UnityEngine;
using WSU3.Core.Models.Addressable;
using WSU3.Editor.Common;

namespace WSU3.Editor.BuildTools
{
    /// <summary>
    /// 内容打包流水线（**一键**，全量 Addressables）：收集 → 校验 → 写包配置 → 同步登记表 →
    /// 注册进 AA 分组（共享材质组 + 每 clip 一组）→ 一次 AA 构建 → 出报告。
    ///
    /// 依据：docs/design/12（资源包与打包流水线）、docs/design/03 §7、DEC-87（链路分流）、**DEC-118（全量迁 AA）**。
    ///
    /// 三条铁律（前两条来自 AB 时代的实测，迁 AA 后依然成立）：
    ///   ① **共享材质单独成组、先于内容组装载** —— 材质是各模型预制体的依赖；放在共享组里
    ///      既保证装载顺序确定，又避免同一份材质在 8 个 clip 组里各存一份（AA 一个资源只属于一个组）。
    ///   ② **包粒度 = 一个 clip 一个组**（DEC-87 纪律①）：分组名 <c>WSU3_clip_{器件}</c>，
    ///      切任务 = 卸旧 clip + 装新 clip，与 AB 时代同一个口径。
    ///   ③ **一次构建产出全部组**：AA 的 <c>BuildPlayerContent</c> 是全局操作，天然满足"一次建全部"。
    ///
    /// 新增一类内容 = 一个 <see cref="IContentProvider"/> 实现 + 在 <see cref="ContentProviders"/> 登记一行；
    /// 新增一个全局包 = 一个 <see cref="IGlobalBundleProvider"/> 实现 + 在 <see cref="GlobalProviders"/> 登记一行。
    /// 两者都**不需要**改本类的流程。
    /// </summary>
    public static class ContentPipeline
    {
        private const string LogTag = "[Pack]";

        // ── Provider 登记（唯一扩展点，顺序即执行顺序）───────────────────────

        /// <summary>结构件模型预制体的素材目录（文件名 = 包配置 id）。</summary>
        private const string StructureModelRoot = "Assets/Prefabs/Models/StructureObjs";

        // WHY: 只登记**素材已经在位**的那一类。简介 / 检测的预制体目录本工程还没有，
        //      现在登记它们会让"找不到预制体"变成阻塞构建的 Error —— 等素材搬入后加一行即可。
        /// <summary>内容包 Provider（一个 clip 一个组，按 <c>taskXxxData.prefabKey</c> 取件）。</summary>
        private static readonly IContentProvider[] ContentProviders =
        {
            new ModelPrefabProvider("StructureModel", StructureModelRoot, ContentNaming.TaskStructure,
                                    clip => clip.taskStructureData),
        };

        // WHY: 全局包（不属任何项目的包）目前一个都没有 ——
        //      Unity 侧不做界面（DEC-80）故没有 UI 包与字体包；相机背景板还没接取图入口（docs/TODO.md D-20）
        //      故没有背景包。留空是**如实**的状态，不是漏配：空表不会产出空包。
        /// <summary>全局包 Provider（组名由 Provider 自己给）。</summary>
        private static readonly IGlobalBundleProvider[] GlobalProviders =
        {
        };

        // ── 菜单 ──────────────────────────────────────────────────────────

        [MenuItem("WSU3/Pack/一键打 AA 包（全部）", false, 10)]
        public static void BuildAll()
        {
            Run(PackMode.All, interactive: true);
        }

        [MenuItem("WSU3/Pack/对账（dry-run，不写盘）", false, 11)]
        public static void Audit()
        {
            Run(PackMode.Audit, interactive: true);
        }

        [MenuItem("WSU3/Pack/仅构建（不写配置）", false, 12)]
        public static void BuildOnly()
        {
            Run(PackMode.BuildOnly, interactive: true);
        }

        [MenuItem("WSU3/Pack/仅刷新包登记表", false, 13)]
        public static void RefreshDatabase()
        {
            if (!RequireScriptReady(true)) return;

            int count = PackageDatabaseSync.Sync(EditorPaths.PackageDbAsset, null, LogTag);
            WarnResidue(CollectExpectedIds());

            EditorUtility.DisplayDialog("包登记表",
                count == 0
                    ? $"登记表仍为空：{EditorPaths.PackageDbAsset}\n先跑「一键打 AA 包（全部）」生成配置"
                    : $"✔ 包登记表已同步：{count} 条\n{EditorPaths.PackageDbAsset}",
                "确定");
        }

        [MenuItem("WSU3/Pack/打开 AA 产物目录", false, 30)]
        public static void OpenOutputDirectory()
        {
            string dir = Path.GetFullPath(Path.Combine(Application.dataPath, "../" + EditorPaths.AddressablesBuildOutputDir));
            Directory.CreateDirectory(dir);
            EditorUtility.RevealInFinder(dir);
        }

        /// <summary>
        /// 批处理入口（供自动化 / CI 用；**不弹任何窗**，失败以退出码 1 结束）：
        /// <c>-batchmode -quit -projectPath &lt;工程&gt; -executeMethod WSU3.Editor.BuildTools.ContentPipeline.BuildAllFromBatch</c>
        /// </summary>
        public static void BuildAllFromBatch()
        {
            bool ok = Run(PackMode.All, interactive: false);
            if (Application.isBatchMode) EditorApplication.Exit(ok ? 0 : 1);
        }

        /// <summary>
        /// 无弹窗跑一次全流程，返回是否成功（给"在编辑器里脚本化验证"用 —— 弹窗会卡住调用方，
        /// MCP 的 <c>execute_code</c> / 自动化脚本都走这条）。
        /// </summary>
        public static bool BuildAllNonInteractive()
        {
            return Run(PackMode.All, interactive: false);
        }

        // ── 主流程 ────────────────────────────────────────────────────────

        private enum PackMode
        {
            /// <summary>只对账：绝不写盘、绝不构建。</summary>
            Audit,
            /// <summary>配置已在磁盘上，只同步登记表 + 构建。</summary>
            BuildOnly,
            /// <summary>全流程：写配置 + 同步登记表 + 构建。</summary>
            All,
        }

        /// <summary>跑一遍流水线，返回是否成功（无 Error 且构建通过）。</summary>
        private static bool Run(PackMode mode, bool interactive)
        {
            if (!RequireScriptReady(interactive)) return false;

            List<PackPlan> plans = Collect(out List<string> errors, out List<string> warnings);
            List<AaGroupPlan> groups = ToGroupPlans(plans);
            Debug.Log($"{LogTag} {BuildAuditText(groups, errors, warnings)}");

            if (errors.Count > 0)
            {
                return Fail(interactive, "对账发现 Error，**已中止且未改动任何产物**",
                    $"{errors.Count} 条：\n\n{HeadLines(errors, 10)}\n\n完整报告见 Console。");
            }

            if (groups.Count == 0)
            {
                return Fail(interactive, "没有收集到任何资源条目，已中止（不产出空包）",
                    "常见原因：内容数据为空 / 素材目录未就位 / Provider 未登记（见 ContentPipeline.ContentProviders）。");
            }

            var expectedIds = new HashSet<string>();
            foreach (AaGroupPlan group in groups)
                foreach (AaEntry item in group.entries)
                    if (!string.IsNullOrEmpty(item.configId)) expectedIds.Add(item.configId);

            // WHY: 三条分支必须**各自独立**判断 —— 用 else 兜底会把 Audit 也带进写盘路径，
            //      而"对账（dry-run）"对外的承诺是**不写盘**（跑一次就会多出无意义的版本 diff，且"只读"这个承诺当场失效）。
            if (mode == PackMode.All)
            {
                WriteConfigs(groups);
            }
            else if (mode == PackMode.BuildOnly)
            {
                // WHY: 仅构建路径只确保登记表收录 —— 配置已在磁盘上，此处不重新生成（不覆盖人工修正）
                PackageDatabaseSync.Sync(EditorPaths.PackageDbAsset, null, LogTag);
                WarnResidue(expectedIds);
            }
            // else：Audit —— 到此为止，**不碰数据库也不构建**，下面只做只读体检

            if (mode == PackMode.Audit)
            {
                // WHY: 对账要把"地址有没有和实际注册的一致"也看出来 —— AA 时代最常见的沉默故障是
                //      "登记表里地址写着 A、AA 分组里注册的是 B"，装载时只是加载失败，看不出根因。
                List<string> drift = AuditRegistrations(groups);
                DatabaseAudit audit = PackageDatabaseSync.Audit(EditorPaths.PackageDbAsset, expectedIds);
                Debug.Log($"{LogTag} 只读体检：{audit.Summary()}" +
                          (audit.Missing.Count > 0 ? $"\n   未收录：{string.Join("、", audit.Missing)}" : "") +
                          (audit.Residue.Count > 0 ? $"\n   残留：{string.Join("、", audit.Residue)}" : "") +
                          (drift.Count > 0 ? $"\n   地址漂移：{string.Join("、", drift)}" : ""));

                if (interactive)
                {
                    EditorUtility.DisplayDialog("内容包对账",
                        $"✔ 对账通过（dry-run，**未写盘**）\n\n" +
                        $"{groups.Count} 个 AA 组待构建，共 {CountItems(groups)} 项资源\nWarning：{warnings.Count}\n\n" +
                        $"登记表体检（只读）：{audit.Summary()}\n" +
                        (drift.Count > 0 ? $"⚠ 地址漂移 {drift.Count} 条（见 Console）\n" : "") +
                        "\n明细见 Console。",
                        "确定");
                }
                return true;
            }

            if (interactive &&
                !EditorUtility.DisplayDialog("AA 打包",
                    $"配置已就绪，共 {groups.Count} 个组：\n\n{HeadLines(GroupLines(groups), 12)}\n\n" +
                    $"是否立即构建？\n输出：{EditorPaths.AddressablesBuildOutputDir}/<平台>/\n" +
                    $"目标平台：{EditorUserBuildSettings.activeBuildTarget}" +
                    (warnings.Count > 0 ? $"\n\n⚠ 另有 {warnings.Count} 条 Warning（见 Console，不阻塞）" : ""),
                    "构建", "取消"))
            {
                Debug.Log($"{LogTag} 已取消构建（配置已保存，可再跑「仅构建」）");
                return false;
            }

            AaContentBuilder.Outcome outcome = BuildContent(groups, out List<string> bindingNotes);
            WriteBuildReport(groups, outcome, warnings.Concat(bindingNotes).ToList());

            if (interactive)
            {
                EditorUtility.DisplayDialog("AA 打包",
                    outcome.Ok
                        ? $"✔ 已输出 {outcome.GroupCount} 个组 / {outcome.EntryCount} 项资源 / " +
                          $"{outcome.TotalBytes / 1024f / 1024f:N2} MB\n" +
                          $"{EditorPaths.AddressablesBuildOutputDir}/<平台>/\n\n明细见 Console。"
                        : "构建失败，请看 Console",
                    "确定");
            }

            return outcome.Ok;
        }

        // ── 收集 ──────────────────────────────────────────────────────────

        /// <summary>收集全部打包计划（内容包 + 全局包），并把问题分成 Error / Warning 两档。</summary>
        private static List<PackPlan> Collect(out List<string> errors, out List<string> warnings)
        {
            errors = new List<string>();
            warnings = new List<string>();
            var plans = new List<PackPlan>();

            CollectContentPlans(plans, errors, warnings);
            CollectGlobalPlans(plans, errors, warnings);

            Validate(plans, errors);
            WarnMaterialBindings(plans, warnings);
            return plans;
        }

        /// <summary>
        /// 只读体检：预制体里有没有"空材质槽"（嵌套 FBX 的材质绑定退化 ⇒ 洋红）。
        ///
        /// 这里**只告警**，真正的自愈在构建前（见 <see cref="BuildContent"/>）——
        /// "对账（dry-run）"对外承诺**不写盘**，而强制重导 FBX 会动 Library。
        /// 于是：对账时能提前看见问题，构建时自动处理，两条路径各自的承诺都不破。
        /// </summary>
        private static void WarnMaterialBindings(List<PackPlan> plans, List<string> warnings)
        {
            foreach (PackPlan plan in plans)
            {
                foreach (PackItem item in plan.items)
                {
                    if (item.kind != ContentAssetKind.Prefab) continue;

                    int bad = ModelMaterialBindingFixer.Inspect(item.assetPath);
                    if (bad > 0)
                    {
                        warnings.Add($"{item.id}：{bad} 处材质引用为空" +
                                     "（嵌套 FBX 的材质绑定退化，画面是洋红）—— 构建时会自动强制重导其 FBX；" +
                                     "也可先跑菜单 WSU3/Pack/修复模型材质绑定（嵌套 FBX）");
                    }
                }
            }
        }

        private static void CollectContentPlans(List<PackPlan> plans, List<string> errors, List<string> warnings)
        {
            ProjectDataDto data = ContentProjectData.Read();
            if (data == null)
            {
                errors.Add($"读不到内容数据：{EditorPaths.ProjectDataJson}");
                return;
            }

            foreach (ClipDto clip in data.clips)
            {
                if (clip == null || string.IsNullOrEmpty(clip.id)) continue;

                string device = ContentNaming.DeviceOf(clip.id);
                var plan = new PackPlan
                {
                    groupName = ContentNaming.GroupNameForClip(clip.id),
                    configDir = EditorPaths.ContentConfigDir,
                    clipId = clip.id,
                    source = "内容包",
                };

                foreach (IContentProvider provider in ContentProviders)
                {
                    IEnumerable<ContentResourceEntry> items = provider.Collect(clip, device);
                    if (items == null) continue;

                    foreach (ContentResourceEntry entry in items)
                    {
                        if (entry == null || string.IsNullOrEmpty(entry.id)) continue;

                        if (entry.isExtra) { warnings.Add($"[{provider.Name}] {entry.id}：{entry.note}"); continue; }
                        if (entry.isError) { errors.Add($"[{provider.Name}] {entry.id}：{entry.note}"); continue; }

                        plan.items.Add(new PackItem
                        {
                            id = entry.id,
                            assetPath = entry.assetPath,
                            kind = entry.kind,
                            source = provider.Name,
                        });
                    }
                }

                // WHY: 没有任何资源的 clip 不进计划 —— 不产出空组（空组没有意义，还会混进登记表）
                if (plan.items.Count > 0) plans.Add(plan);
            }
        }

        private static void CollectGlobalPlans(List<PackPlan> plans, List<string> errors, List<string> warnings)
        {
            foreach (IGlobalBundleProvider provider in GlobalProviders)
            {
                var plan = new PackPlan
                {
                    groupName = provider.BundleName,
                    configDir = provider.ConfigDir,
                    clipId = null,          // 全局包没有归属项目 —— 这条决定了它常驻、不随 clip 装卸被带走
                    source = $"全局包 {provider.Name}",
                };

                IEnumerable<GlobalResourceEntry> items = provider.Collect();
                if (items != null)
                {
                    foreach (GlobalResourceEntry entry in items)
                    {
                        if (entry == null || string.IsNullOrEmpty(entry.id)) continue;

                        if (string.IsNullOrEmpty(entry.assetPath))
                        {
                            errors.Add($"[{provider.Name}] {entry.id}：未定出素材路径");
                            continue;
                        }

                        plan.items.Add(new PackItem
                        {
                            id = entry.id,
                            assetPath = entry.assetPath,
                            kind = entry.kind,
                            source = provider.Name,
                        });
                    }
                }

                if (plan.items.Count > 0) plans.Add(plan);
                else Debug.LogWarning($"{LogTag} 全局包 {provider.Name} 没有收集到条目，已跳过（不产出空组）");
            }
        }

        /// <summary>对账补充检查：组名合法性、素材存在性与导入类型、id 是否被重复占用。</summary>
        private static void Validate(List<PackPlan> plans, List<string> errors)
        {
            var idOwner = new Dictionary<string, string>();
            var groupOwner = new HashSet<string>();

            foreach (PackPlan plan in plans)
            {
                if (!ContentNaming.IsManagedGroup(plan.groupName))
                {
                    errors.Add($"{plan.source}：分组名不合法 {plan.groupName}" +
                               $"（须以 {ContentNaming.GroupPrefix} 开头，便于清理残留时只动本流水线的组）");
                    continue;
                }

                if (!groupOwner.Add(plan.groupName))
                {
                    errors.Add($"分组名被重复占用：{plan.groupName}（同名组会被互相覆盖）");
                    continue;
                }

                foreach (PackItem item in plan.items)
                {
                    // WHY: id 会**直接变成文件名**（`AA_{id}.asset`）—— 带 `/` 或 `\` 时 CreateAsset 会当场抛，
                    //      报错信息还只说"创建失败"，看不出是命名问题。这里提前用一句人话拦住（实测踩过）。
                    if (!IsFileSafeId(item.id))
                    {
                        errors.Add($"{item.id}：包配置 id 含非法字符（不能有 / \\ : * ? \" < > |）—— " +
                                   $"它会被用作文件名 AA_{{id}}.asset");
                        continue;
                    }

                    if (idOwner.TryGetValue(item.id, out string other))
                    {
                        errors.Add($"{item.id}：包配置 id 被重复占用（{other} 与 {plan.groupName}）");
                        continue;
                    }
                    idOwner[item.id] = plan.groupName;

                    if (string.IsNullOrEmpty(item.assetPath))
                    {
                        errors.Add($"{item.id}：素材路径为空（{plan.source}）");
                        continue;
                    }

                    if (AssetDatabase.LoadMainAssetAtPath(item.assetPath) == null)
                    {
                        errors.Add($"{item.id}：找不到素材 {item.assetPath}（文件名须与 id 一致）");
                        continue;
                    }

                    // WHY: 类型必须与 kind 对上 —— 运行期按 kind 选泛型，取不到就是 null（图集最常见的翻车点）
                    if (item.kind == ContentAssetKind.Prefab &&
                        AssetDatabase.LoadAssetAtPath<GameObject>(item.assetPath) == null)
                    {
                        errors.Add($"{item.id}：{item.assetPath} 不是预制体（kind=Prefab）");
                    }
                    else if (item.kind == ContentAssetKind.Sprite &&
                             AssetDatabase.LoadAssetAtPath<Texture2D>(item.assetPath) == null)
                    {
                        errors.Add($"{item.id}：{item.assetPath} 不是贴图（kind=Sprite）");
                    }
                }
            }
        }

        /// <summary>包配置 id 能否安全地当文件名用（`AA_{id}.asset`）。</summary>
        private static bool IsFileSafeId(string id)
        {
            if (string.IsNullOrEmpty(id)) return false;
            if (id.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0) return false;
            return id.IndexOf('/') < 0 && id.IndexOf('\\') < 0;
        }

        // ── 计划 → AA 组（含共享材质组的推导）──────────────────────────────

        /// <summary>
        /// 把内容计划展开成 AA 组计划：先一个**共享材质组**（全部模型材质），再每 clip 一个组。
        ///
        /// WHY 共享材质组的条目从依赖树里"爬"出来，而不是新加一个 Provider：
        /// 材质是模型预制体的依赖，不在内容数据里单独声明（内容数据只写 prefabKey）。
        /// 用 <c>AssetDatabase.GetDependencies</c> 取依赖树，滤出 Material，就是"这个工程实际用得上的全部材质"。
        /// </summary>
        private static List<AaGroupPlan> ToGroupPlans(List<PackPlan> plans)
        {
            var groups = new List<AaGroupPlan>();

            // ① 共享材质组：把所有内容计划里预制体的材质依赖并起来
            var materials = new SortedDictionary<string, string>();   // 材质名 → 素材路径
            foreach (PackPlan plan in plans)
            {
                foreach (PackItem item in plan.items)
                {
                    if (item.kind != ContentAssetKind.Prefab) continue;

                    string[] deps;
                    try { deps = AssetDatabase.GetDependencies(item.assetPath, true); }
                    catch (Exception e) { Debug.LogWarning($"{LogTag} 取依赖失败，已跳过：{item.assetPath}（{e.Message}）"); continue; }

                    foreach (string dep in deps)
                    {
                        if (string.IsNullOrEmpty(dep)) continue;
                        if (!dep.EndsWith(".mat", StringComparison.OrdinalIgnoreCase)) continue;

                        string name = Path.GetFileNameWithoutExtension(dep);
                        if (!materials.ContainsKey(name)) materials[name] = dep;
                    }
                }
            }

            // WHY: **组级配置必须先加**，材质条目后加。
            //      Addressables 的一个 entry 由 **GUID** 定位（一个资源一个 entry、一个 address），
            //      而组级配置的代表素材必然是某一份材质 —— 后写的 `entry.address = …` 会**覆盖**前一个。
            //      实测踩过：先加 18 份材质、再 insert(0) 组级配置，结果 `shared_model_materials` 消失、
            //      整组装载直接 `No Location found for Key=shared_model_materials`。
            //      反过来就没有冲突：那份"代表材质"同时拥有自己的地址与组级地址（两个 key 指向同一 entry）。
            var shared = new AaGroupPlan
            {
                groupName = ContentNaming.SharedGroupName,
                configDir = EditorPaths.ContentConfigDir,
                clipId = null,
                source = "共享材质包",
            };

            if (materials.Count > 0)
            {
                var materialList = new List<KeyValuePair<string, string>>(materials);
                shared.entries.Add(new AaEntry
                {
                    configId = ContentNaming.SharedAddress,
                    address = ContentNaming.SharedAddress,
                    assetPath = materialList[0].Value,
                    kind = ContentAssetKind.Material,
                });

                for (int i = 0; i < materialList.Count; i++)
                {
                    shared.entries.Add(new AaEntry
                    {
                        // WHY: configId 留空（见 AaEntry.configId 的注释）—— 每份材质只注册成 AA 条目，
                        //      运行期按 shared_model_materials 一次取整组，不给它们各生成一条没人用的包配置。
                        configId = null,
                        address = "shared_material/" + materialList[i].Key,
                        assetPath = materialList[i].Value,
                        kind = ContentAssetKind.Material,
                    });
                }

                groups.Add(shared);
                Debug.Log($"{LogTag} 共享材质组：{materialList.Count} 份材质（代表素材 {materialList[0].Value}）");
            }
            else
            {
                Debug.LogWarning($"{LogTag} 依赖树里没有找到任何材质，跳过共享材质组");
            }

            // ② 每 clip 一组
            foreach (PackPlan plan in plans)
            {
                var group = new AaGroupPlan
                {
                    groupName = plan.groupName,
                    configDir = plan.configDir,
                    clipId = plan.clipId,
                    source = plan.source,
                };

                foreach (PackItem item in plan.items)
                {
                    group.entries.Add(new AaEntry
                    {
                        configId = item.id,
                        address = item.id,   // WHY: 地址就用包配置 id —— 一个键贯穿"内容数据 / 登记表 / AA catalog"，少一层映射就少一处能对不上的地方
                        assetPath = item.assetPath,
                        kind = item.kind,
                    });
                }

                groups.Add(group);
            }

            return groups;
        }

        // ── 写配置 ────────────────────────────────────────────────────────

        private static void WriteConfigs(List<AaGroupPlan> groups)
        {
            // WHY: 先按配置目录删掉不属于本次产出的旧配置 —— 登记表的 AutoCollect 是"全工程按类型全量重收"，
            //      残留配置会被收回登记表，运行期就多出"配置在、包不在"的可解析 id。
            //      keep 只收**有 configId 的条目**：共享材质组里那些纯 AA 条目本来就不该有配置。
            foreach (IGrouping<string, AaGroupPlan> group in groups.GroupBy(p => p.configDir))
            {
                var keep = new HashSet<string>();
                foreach (AaGroupPlan plan in group)
                    foreach (AaEntry item in plan.entries)
                        if (!string.IsNullOrEmpty(item.configId)) keep.Add(item.configId);

                EditorAssetUtil.DeleteAssetsNotIn<AAPackageConfigSO>(group.Key, keep, c => c.id, LogTag);
            }

            // WHY: 迁移收尾（DEC-118）—— AB→AA 换类型后，旧的 AB_*.asset 已经"搜不到类型"
            //      （m_Script 是 fileID 0，AssetDatabase 不把它当 ScriptableObject 报出来），
            //      只会作为 packages[i]==null 的空引用留在登记表里。按文件名前缀从盘上清掉它们。
            List<string> migrated = EditorAssetUtil.DeleteAssetsByFilePrefix(
                EditorPaths.ContentConfigDir, "AB_", LogTag);
            if (migrated.Count > 0)
                Debug.Log($"{LogTag} 已清理 {migrated.Count} 个 AB 时代的旧配置（类型已废弃）");

            var generated = new List<AAPackageConfigSO>();
            foreach (AaGroupPlan plan in groups)
            {
                foreach (AaEntry item in plan.entries)
                {
                    if (string.IsNullOrEmpty(item.configId)) continue;   // 纯 AA 条目不生成配置

                    AAPackageConfigSO created = PackageConfigWriter.CreateOrUpdate(
                        plan.configDir, item.configId, LogTag,
                        config => PackageConfigWriter.ApplyContent(
                            config, item.configId, plan.clipId, item.address, plan.groupName, item.assetPath, item.kind));

                    if (created != null) generated.Add(created);   // 创建失败时 Writer 已报错，这里只跳过错项
                }
            }

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            // WHY: 自检必须**回读磁盘资产** —— 脚本没编译完就 CreateAsset 时 m_Script 会写成 {fileID: 0}，
            //      资产加载为 null（表现为"配置在、登记表里却收不到"）。
            var expected = new HashSet<string>();
            foreach (AaGroupPlan plan in groups)
                foreach (AaEntry item in plan.entries)
                    if (!string.IsNullOrEmpty(item.configId)) expected.Add(item.configId);

            var broken = new List<string>();
            foreach (IGrouping<string, AaGroupPlan> group in groups.GroupBy(p => p.configDir))
                broken.AddRange(EditorAssetUtil.FindBrokenAssets<AAPackageConfigSO>(group.Key, expected, "AA_"));

            if (broken.Count > 0)
            {
                foreach (string path in broken) AssetDatabase.DeleteAsset(path);
                AssetDatabase.Refresh();
                Debug.LogError($"{LogTag} {broken.Count} 个配置资产的 m_Script 丢失，已删除：\n   " +
                               string.Join("\n   ", broken) + "\n   → 再跑一次本菜单即可重建");
            }

            PackageDatabaseSync.Sync(EditorPaths.PackageDbAsset, generated, LogTag);
            Debug.Log($"{LogTag} 配置就绪：新建/更新 {generated.Count} 条 → {EditorPaths.ContentConfigDir}" +
                      (GlobalProviders.Length > 0 ? $" / {EditorPaths.GlobalConfigDir}" : ""));
        }

        // ── 注册 + 构建 ───────────────────────────────────────────────────

        // WHY: 传入**已经收集并校验过**的计划，而不是在构建前再收集一次 ——
        //      重复收集会多读一遍内容数据、多跑一遍 Provider，"写配置用的是 A 版、构建用的是 B 版"这种漂移无从察觉。
        private static AaContentBuilder.Outcome BuildContent(List<AaGroupPlan> groups, out List<string> bindingNotes)
        {
            bindingNotes = new List<string>();
            var outcome = new AaContentBuilder.Outcome();

            // WHY: 编辑器停在"脚本编译失败"状态时构建会秒退（0.x 秒结束），而且 Console 里可能已经看不到红字了 —— 提前拦下
            if (EditorUtility.scriptCompilationFailed)
            {
                Debug.LogError($"{LogTag} 编辑器处于脚本编译失败状态，已中止构建。" +
                               "处理：清干净 Console 里的脚本报错；若已无报错，执行 Assets > Reimport 清掉残留的失败状态，再重跑。");
                return outcome;
            }

            // ⓪ **材质绑定自愈**，必须排在构建之前 ——
            //    包里的状态就是"这一刻"的资产状态：空材质槽会被原样打进产物，运行期表现为**洋红**，
            //    而且包打好了、日志全绿，最难发现。详见 ModelMaterialBindingFixer 的类注释。
            List<ModelMaterialBindingFixer.FixResult> bindings = ModelMaterialBindingFixer.FixAll(
                groups.SelectMany(group => group.entries)
                      .Where(item => item.kind == ContentAssetKind.Prefab)
                      .Select(item => item.assetPath));

            bindingNotes = ModelMaterialBindingFixer.Describe(bindings);
            if (bindingNotes.Count > 0)
                Debug.Log($"{LogTag} 材质绑定体检（{bindings.Count} 个预制体）：\n   " + string.Join("\n   ", bindingNotes));

            List<ModelMaterialBindingFixer.FixResult> stillBroken =
                bindings.Where(result => !result.Ok).ToList();
            if (stillBroken.Count > 0)
            {
                // WHY: 这里必须**中止**，不能只告警 —— "包打好了但模型是洋红的"比"没打包"更贵：
                //      前者会被当成已完成交付出去，后者当场就能看见。
                Debug.LogError($"{LogTag} {stillBroken.Count} 个预制体仍有空材质槽，**已中止构建**（不产出洋红产物）：\n   " +
                               string.Join("\n   ", stillBroken.Select(r => System.IO.Path.GetFileName(r.PrefabPath))) +
                               "\n   处理：跑菜单 WSU3/Pack/修复模型材质绑定（嵌套 FBX）看逐项明细；" +
                               "依赖树里没有 FBX 的那种只能人工检查零件的材质槽。");
                return outcome;
            }

            AddressableAssetSettings settings = AaContentBuilder.ResolveSettings();
            if (settings == null)
            {
                Debug.LogError($"{LogTag} 拿不到 AddressableAssetSettings（Addressables 未初始化），已中止构建");
                return outcome;
            }

            if (!EditorUserBuildSettings.activeBuildTarget.Equals(BuildTarget.WebGL))
            {
                // WHY: AA 内容与目标平台绑定 —— 为本机平台打出来的 bundle 在 WebGL 里加载不了（反向同理）。
                //      交付形态是 WebGL（DEC-12），所以这条提醒必须显眼。
                Debug.LogWarning($"{LogTag} 当前目标平台是 {EditorUserBuildSettings.activeBuildTarget}，不是 WebGL —— " +
                                 "本次产物**只能在该平台加载**。发布 WebGL 前请在 Build Settings 里切到 WebGL，再打一次内容包。");
            }

            AaContentBuilder.Register(settings, groups, LogTag);

            AaContentBuilder.Outcome built = AaContentBuilder.BuildContent(
                settings, LogTag, EditorPaths.AddressablesBuildOutputDir);

            outcome.Ok = built.Ok;
            outcome.ProducedCount = built.ProducedCount;
            outcome.BundleCount = built.BundleCount;
            outcome.GroupCount = groups.Count;
            outcome.EntryCount = CountItems(groups);
            outcome.OutputDir = EditorPaths.AddressablesBuildOutputDir;
            outcome.TotalBytes = built.TotalBytes;
            outcome.Errors.AddRange(built.Errors);
            outcome.Warnings.AddRange(built.Warnings);

            if (!built.Ok)
            {
                Debug.LogError($"{LogTag} AA 构建失败：{string.Join("；", built.Errors)}");
                return outcome;
            }

            Debug.Log($"{LogTag} 构建完成（目标平台 {EditorUserBuildSettings.activeBuildTarget}）：" +
                      $"{outcome.TotalBytes / 1024f / 1024f:N2} MB / 新增 {outcome.ProducedCount} 个 bundle / " +
                      $"{outcome.GroupCount} 个组 / {outcome.EntryCount} 项资源\n" +
                      $"   产物落点 {EditorPaths.AddressablesBuildOutputDir}/<平台>/（Build Player 时由 Addressables 自动拷进 " +
                      $"{EditorPaths.AddressablesPlayerOutputDir}/<平台>/）\n" +
                      string.Join("\n", groups.Select(g => $"  {g.groupName}（{g.entries.Count} 项，{g.source}）")));

            return outcome;
        }

        /// <summary>
        /// 只读检查：登记表里每条内容的 <c>address</c> 是否与 AA 里实际注册的一致。
        ///
        /// WHY: AA 时代最阴的沉默故障是"配置里写着地址 A、AA 分组里注册的是 B" —— 装载时只是"加载失败"，
        ///      从现象完全看不出根因。对账时必须把这一层单独查一遍。
        /// </summary>
        private static List<string> AuditRegistrations(List<AaGroupPlan> groups)
        {
            var drift = new List<string>();
            AddressableAssetSettings settings = AddressableAssetSettingsDefaultObject.Settings;
            if (settings == null)
            {
                drift.Add("AddressableAssetSettings 不存在（还没建过 AA 数据）");
                return drift;
            }

            var registered = new Dictionary<string, string>(StringComparer.Ordinal);   // address → groupName
            foreach (AddressableAssetGroup group in settings.groups)
            {
                if (group == null) continue;
                foreach (AddressableAssetEntry entry in group.entries)
                {
                    if (entry == null || string.IsNullOrEmpty(entry.address)) continue;
                    registered[entry.address] = group.Name;
                }
            }

            foreach (AaGroupPlan group in groups)
            {
                foreach (AaEntry item in group.entries)
                {
                    if (!registered.TryGetValue(item.address, out string where))
                    {
                        drift.Add($"{item.address}（未注册到 AA）");
                        continue;
                    }
                    if (where != group.groupName)
                        drift.Add($"{item.address}（在 {where}，期望 {group.groupName}）");
                }
            }

            return drift;
        }

        private static void WriteBuildReport(List<AaGroupPlan> groups, AaContentBuilder.Outcome outcome,
                                             List<string> warnings)
        {
            try
            {
                string dir = Path.GetFullPath(Path.Combine(Application.dataPath, "../" + EditorPaths.BuildReportDir));
                Directory.CreateDirectory(dir);

                var report = new AABuildReport
                {
                    generatedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
                    buildTarget = EditorUserBuildSettings.activeBuildTarget.ToString(),
                    groupCount = outcome.GroupCount,
                    entryCount = outcome.EntryCount,
                    totalBytes = outcome.TotalBytes,
                    ok = outcome.Ok,
                    groups = new List<AABuildReportGroup>(),
                    warnings = new List<string>(warnings),
                };

                foreach (AaGroupPlan group in groups)
                {
                    report.groups.Add(new AABuildReportGroup
                    {
                        groupName = group.groupName,
                        source = group.source,
                        clipId = group.clipId ?? "",
                        itemCount = group.entries.Count,
                        assets = group.entries.Select(e => e.assetPath).ToList(),
                    });
                }

                string path = Path.Combine(dir, "aa-build-report.json");
                File.WriteAllText(path, JsonUtility.ToJson(report, true), new UTF8Encoding(false));
                Debug.Log($"{LogTag} 构建报告已写入：{EditorPaths.BuildReportDir}/aa-build-report.json");
            }
            catch (Exception e)
            {
                // WHY: 报告只是证据、不是产物 —— 写不出来不该让"包已经打好了"这件事变成失败
                Debug.LogWarning($"{LogTag} 构建报告写入失败（不影响产物）：{e.Message}");
            }
        }

        // ── 小工具 ────────────────────────────────────────────────────────

        private static bool RequireScriptReady(bool interactive)
        {
            if (EditorAssetUtil.IsScriptReady(EditorPaths.AaConfigScript)) return true;

            const string msg = "包配置脚本（AAPackageConfigSO）还没编译就绪（Unity 正在编译 / 域重载中）。\n\n等编译结束再跑本菜单。";
            Debug.LogError($"{LogTag} {msg}");
            if (interactive) EditorUtility.DisplayDialog("AA 打包", msg, "确定");
            return false;
        }

        private static bool Fail(bool interactive, string title, string detail)
        {
            Debug.LogError($"{LogTag} {title}：\n{detail}");
            if (interactive) EditorUtility.DisplayDialog("AA 打包", $"{title}\n\n{detail}", "确定");
            return false;
        }

        private static string BuildAuditText(List<AaGroupPlan> groups, List<string> errors, List<string> warnings)
        {
            var sb = new StringBuilder();
            sb.Append($"对账完成：{groups.Count} 个组（共 {CountItems(groups)} 项资源）/ Error {errors.Count} / Warning {warnings.Count}");
            foreach (AaGroupPlan group in groups) sb.Append("\n  ✔ ").Append(GroupLine(group));
            foreach (string e in errors) sb.Append("\n  ✘ [Error] ").Append(e);
            foreach (string w in warnings) sb.Append("\n  ⚠ [Warning] ").Append(w);
            return sb.ToString();
        }

        private static List<string> GroupLines(List<AaGroupPlan> groups)
        {
            var lines = new List<string>(groups.Count);
            foreach (AaGroupPlan group in groups) lines.Add(GroupLine(group));
            return lines;
        }

        private static string GroupLine(AaGroupPlan group)
        {
            return $"{group.groupName}（{group.entries.Count} 项，{group.source}" +
                   (string.IsNullOrEmpty(group.clipId) ? "）" : $" / {group.clipId}）");
        }

        private static int CountItems(List<AaGroupPlan> groups)
        {
            int total = 0;
            foreach (AaGroupPlan group in groups) total += group.entries.Count;
            return total;
        }

        private static string HeadLines(List<string> lines, int max)
        {
            if (lines.Count <= max) return string.Join("\n", lines);
            return string.Join("\n", lines.GetRange(0, max)) + $"\n…… 另有 {lines.Count - max} 条，见 Console";
        }

        /// <summary>只读地收集一次"期望的 id 集合"（用于残留告警）；收集失败时返回空集 = 无法判定，调用方跳过检查。</summary>
        private static ISet<string> CollectExpectedIds()
        {
            try
            {
                List<PackPlan> plans = Collect(out List<string> errors, out _);
                if (errors.Count > 0) return new HashSet<string>();

                var ids = new HashSet<string>();
                foreach (AaGroupPlan group in ToGroupPlans(plans))
                    foreach (AaEntry item in group.entries)
                        if (!string.IsNullOrEmpty(item.configId)) ids.Add(item.configId);
                return ids;
            }
            catch (Exception)
            {
                return new HashSet<string>();
            }
        }

        /// <summary>只读残留告警：登记表里有、不属于本次产出的内容包（会变成"配置在、包不在"的可解析 id）。</summary>
        private static void WarnResidue(ISet<string> expectedIds)
        {
            if (expectedIds == null || expectedIds.Count == 0) return;

            DatabaseAudit audit = PackageDatabaseSync.Audit(EditorPaths.PackageDbAsset, expectedIds);
            if (audit.Residue.Count == 0) return;

            Debug.LogWarning($"{LogTag} 登记表里有 {audit.Residue.Count} 个不属于本次产出的残留内容包" +
                             "（AutoCollect 会把它们收回来，运行期就多出「配置在、包不在」的 id）：\n   " +
                             string.Join("\n   ", audit.Residue) +
                             "\n   → 跑一次「WSU3/Pack/一键打 AA 包（全部）」会删掉这些残留配置");
        }
    }

    /// <summary>一个待收集的内容计划（还没展开成 AA 组）。</summary>
    public class PackPlan
    {
        /// <summary>Addressables 分组名（<c>WSU3_clip_contactor</c>）。</summary>
        public string groupName;

        /// <summary>包配置的落点目录。</summary>
        public string configDir;

        /// <summary>归属项目（全局包为 null —— 这条决定了它的常驻行为）。</summary>
        public string clipId;

        /// <summary>来源（内容包 / 全局包 Xxx）。</summary>
        public string source;

        /// <summary>本包的资源条目。</summary>
        public readonly List<PackItem> items = new List<PackItem>();
    }

    /// <summary>包内的一条资源。</summary>
    public class PackItem
    {
        /// <summary>包配置 id（= 运行期取件键）。</summary>
        public string id;

        /// <summary>资源工程路径。</summary>
        public string assetPath;

        /// <summary>资源类型（决定运行期泛型）。</summary>
        public ContentAssetKind kind;

        /// <summary>来源 Provider 名。</summary>
        public string source;
    }

    /// <summary>构建报告（落 <c>Builds/assetbundles/aa-build-report.json</c>，不进版本库）。</summary>
    [Serializable]
    public class AABuildReport
    {
        public string generatedAt;
        public string buildTarget;
        public bool ok;
        public int groupCount;
        public int entryCount;
        public long totalBytes;
        public List<AABuildReportGroup> groups;
        public List<string> warnings;
    }

    /// <summary>构建报告里的一个组。</summary>
    [Serializable]
    public class AABuildReportGroup
    {
        public string groupName;
        public string source;
        public string clipId;
        public int itemCount;
        public List<string> assets;
    }
}
