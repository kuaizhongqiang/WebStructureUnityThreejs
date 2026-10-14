using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using UnityEditor;
using UnityEngine;
using WSU3.Core.Models.Addressable;
using WSU3.Editor.Common;

namespace WSU3.Editor.BuildTools
{
    /// <summary>
    /// AB 打包流水线（**一键**）：收集 → 校验 → 写包配置 → 同步包登记表 → 一次构建到 StreamingAssets → 出报告。
    ///
    /// 依据：docs/design/12（资源包与 AB 打包流水线）、docs/design/03 §7、DEC-87（三条链路都做）。
    ///
    /// 三条铁律（都来自实际踩坑，别拆）：
    ///   ① **一次 <c>BuildAssetBundles</c> 调用**建出全部包 —— Unity 的"同一资产被显式分配后不再复制"
    ///      只在同一次调用内成立；分成几次建，被引用的资源会被**复制**进引用方的包（体积翻倍）。
    ///      所以本类不提供"按包逐个构建"的入口。
    ///   ② **先构建到 Temp，只把 bundle 本体拷进 StreamingAssets** —— 否则清单 bundle 与 <c>.manifest</c>
    ///      会跟着玩家包一起发布（见 <see cref="BundleBuilder"/>）。
    ///   ③ **包粒度 = 一个 clip 一个包**（DEC-87 纪律①）：bundle 名 <c>Content/clip_{器件小写}</c>，
    ///      文件名段必须小写（运行期会把末段强制小写，写盘却按原样，不一致在 WebGL / Linux 上必 404）。
    ///
    /// 新增一类内容 = 一个 <see cref="IContentProvider"/> 实现 + 在 <see cref="ContentProviders"/> 登记一行；
    /// 新增一个全局包 = 一个 <see cref="IGlobalBundleProvider"/> 实现 + 在 <see cref="GlobalProviders"/> 登记一行。
    /// 两者都**不需要**改本类的流程。
    /// </summary>
    public static class BundlePipeline
    {
        private const string LogTag = "[Pack]";

        // ── Provider 登记（唯一扩展点，顺序即执行顺序）───────────────────────

        /// <summary>结构件模型预制体的素材目录（文件名 = 包配置 id）。</summary>
        private const string StructureModelRoot = "Assets/Prefabs/Models/StructureObjs";

        // WHY: 只登记**素材已经在位**的那一类。简介 / 检测的预制体目录本工程还没有，
        //      现在登记它们会让"找不到预制体"变成阻塞构建的 Error —— 等素材搬入后加一行即可。
        /// <summary>内容包 Provider（一个 clip 一个包，按 <c>taskXxxData.prefabKey</c> 取件）。</summary>
        private static readonly IContentProvider[] ContentProviders =
        {
            new ModelPrefabProvider("StructureModel", StructureModelRoot, ContentNaming.TaskStructure,
                                    clip => clip.taskStructureData),
        };

        // WHY: 全局包（不属任何项目的包）目前一个都没有 ——
        //      Unity 侧不做界面（DEC-80）故没有 UI 包与字体包；相机背景板还没接取图入口（docs/TODO.md D-20）
        //      故没有背景包。留空是**如实**的状态，不是漏配：空表不会产出空包。
        /// <summary>全局包 Provider（bundle 名由 Provider 自己给，输出目录 = 名字首段）。</summary>
        private static readonly IGlobalBundleProvider[] GlobalProviders =
        {
        };

        // ── 菜单 ──────────────────────────────────────────────────────────

        [MenuItem("WSU3/Pack/一键打 AB 包（全部）", false, 10)]
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
                    ? $"登记表仍为空：{EditorPaths.PackageDbAsset}\n先跑「一键打 AB 包（全部）」生成配置"
                    : $"✔ 包登记表已同步：{count} 条\n{EditorPaths.PackageDbAsset}",
                "确定");
        }

        [MenuItem("WSU3/Pack/打开 AB 产物目录", false, 30)]
        public static void OpenOutputDirectory()
        {
            string dir = Path.Combine(Application.dataPath, "StreamingAssets");
            Directory.CreateDirectory(dir);
            EditorUtility.RevealInFinder(dir);
        }

        /// <summary>
        /// 批处理入口（供自动化 / CI 用；**不弹任何窗**，失败以退出码 1 结束）：
        /// <c>-batchmode -quit -projectPath &lt;工程&gt; -executeMethod WSU3.Editor.BuildTools.BundlePipeline.BuildAllFromBatch</c>
        /// </summary>
        public static void BuildAllFromBatch()
        {
            bool ok = Run(PackMode.All, interactive: false);
            if (Application.isBatchMode) EditorApplication.Exit(ok ? 0 : 1);
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
            Debug.Log($"{LogTag} {BuildAuditText(plans, errors, warnings)}");

            if (errors.Count > 0)
            {
                return Fail(interactive, "对账发现 Error，**已中止且未改动任何产物**",
                    $"{errors.Count} 条：\n\n{HeadLines(errors, 10)}\n\n完整报告见 Console。");
            }

            if (plans.Count == 0)
            {
                return Fail(interactive, "没有收集到任何资源条目，已中止（不产出空包）",
                    "常见原因：内容数据为空 / 素材目录未就位 / Provider 未登记（见 BundlePipeline.ContentProviders）。");
            }

            var expectedIds = new HashSet<string>();
            foreach (PackPlan plan in plans)
                foreach (PackItem item in plan.items) expectedIds.Add(item.id);

            // WHY: 三条分支必须**各自独立**判断 —— 用 else 兜底会把 Audit 也带进写盘路径，
            //      而"对账（dry-run）"对外的承诺是**不写盘**（跑一次就会多出无意义的版本 diff，且"只读"这个承诺当场失效）。
            if (mode == PackMode.All)
            {
                WriteConfigs(plans);
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
                DatabaseAudit audit = PackageDatabaseSync.Audit(EditorPaths.PackageDbAsset, expectedIds);
                Debug.Log($"{LogTag} 只读体检：{audit.Summary()}" +
                          (audit.Missing.Count > 0 ? $"\n   未收录：{string.Join("、", audit.Missing)}" : "") +
                          (audit.Residue.Count > 0 ? $"\n   残留：{string.Join("、", audit.Residue)}" : ""));

                if (interactive)
                {
                    EditorUtility.DisplayDialog("AB 对账",
                        $"✔ 对账通过（dry-run，**未写盘**）\n\n" +
                        $"{plans.Count} 个包待构建，共 {CountItems(plans)} 项资源\nWarning：{warnings.Count}\n\n" +
                        $"登记表体检（只读）：{audit.Summary()}\n\n明细见 Console。",
                        "确定");
                }
                return true;
            }

            if (interactive &&
                !EditorUtility.DisplayDialog("AB 打包",
                    $"配置已就绪，共 {plans.Count} 个包：\n\n{HeadLines(PlanLines(plans), 12)}\n\n" +
                    $"是否立即构建？\n输出：{EditorPaths.StreamingAssetsRoot}/<包名首段>/\n" +
                    $"目标平台：{EditorUserBuildSettings.activeBuildTarget}" +
                    (warnings.Count > 0 ? $"\n\n⚠ 另有 {warnings.Count} 条 Warning（见 Console，不阻塞）" : ""),
                    "构建", "取消"))
            {
                Debug.Log($"{LogTag} 已取消构建（配置已保存，可再跑「仅构建」）");
                return false;
            }

            BuildOutcome outcome = BuildBundles(plans, out List<string> bindingNotes);
            WriteBuildReport(plans, outcome, warnings.Concat(bindingNotes).ToList());

            if (interactive)
            {
                EditorUtility.DisplayDialog("AB 打包",
                    outcome.Ok
                        ? $"✔ 已输出 {outcome.BundleCount} 个包 / {outcome.TotalBytes / 1024f / 1024f:N2} MB\n" +
                          $"{EditorPaths.StreamingAssetsRoot}/<包名首段>/\n（只含 bundle 本体，无 .manifest）\n\n明细见 Console。"
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
        /// 这里**只告警**，真正的自愈在构建前（见 <see cref="BuildBundles"/>）——
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
                    bundleName = ContentNaming.BundleNameFor(device),
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

                // WHY: 没有任何资源的 clip 不进计划 —— 不产出空 AssetBundleBuild（空包没有意义，还会混进登记表）
                if (plan.items.Count > 0) plans.Add(plan);
            }
        }

        private static void CollectGlobalPlans(List<PackPlan> plans, List<string> errors, List<string> warnings)
        {
            foreach (IGlobalBundleProvider provider in GlobalProviders)
            {
                var plan = new PackPlan
                {
                    bundleName = provider.BundleName,
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
                else Debug.LogWarning($"{LogTag} 全局包 {provider.Name} 没有收集到条目，已跳过（不产出空包）");
            }
        }

        /// <summary>对账补充检查：bundle 名合法性、素材存在性与导入类型、id / bundle 名是否被重复占用。</summary>
        private static void Validate(List<PackPlan> plans, List<string> errors)
        {
            var idOwner = new Dictionary<string, string>();
            var bundleOwner = new HashSet<string>();

            foreach (PackPlan plan in plans)
            {
                if (BundleBuilder.BundleDirSegment(plan.bundleName) == null ||
                    !ContentNaming.IsBundleFileNameLowerCase(plan.bundleName))
                {
                    errors.Add($"{plan.source}：bundle 名不合法 {plan.bundleName}" +
                               "（须形如「目录段/小写文件名段」，如 Content/clip_contactor）");
                    continue;
                }

                if (!bundleOwner.Add(plan.bundleName))
                {
                    errors.Add($"bundle 名被重复占用：{plan.bundleName}（同一批构建里出现两次会互相覆盖）");
                    continue;
                }

                foreach (PackItem item in plan.items)
                {
                    if (idOwner.TryGetValue(item.id, out string other))
                    {
                        errors.Add($"{item.id}：包配置 id 被重复占用（{other} 与 {plan.bundleName}）");
                        continue;
                    }
                    idOwner[item.id] = plan.bundleName;

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

        // ── 写配置 ────────────────────────────────────────────────────────

        private static void WriteConfigs(List<PackPlan> plans)
        {
            // WHY: 先按配置目录删掉不属于本次产出的旧配置 —— 登记表的 AutoCollect 是"全工程按类型全量重收"，
            //      残留配置会被收回登记表，运行期就多出"配置在、包不在"的可解析 id。
            foreach (IGrouping<string, PackPlan> group in plans.GroupBy(p => p.configDir))
            {
                var keep = new HashSet<string>();
                foreach (PackPlan plan in group)
                    foreach (PackItem item in plan.items) keep.Add(item.id);

                EditorAssetUtil.DeleteAssetsNotIn<ABPackageConfigSO>(group.Key, keep, c => c.id, LogTag);
            }

            var generated = new List<ABPackageConfigSO>();
            foreach (PackPlan plan in plans)
            {
                foreach (PackItem item in plan.items)
                {
                    ABPackageConfigSO created = PackageConfigWriter.CreateOrUpdate(
                        plan.configDir, item.id, LogTag,
                        config => PackageConfigWriter.ApplyContent(
                            config, item.id, plan.clipId, plan.bundleName, item.assetPath, item.kind));

                    if (created != null) generated.Add(created);   // 创建失败时 Writer 已报错，这里只跳过错项
                }
            }

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            // WHY: 自检必须**回读磁盘资产** —— 脚本没编译完就 CreateAsset 时 m_Script 会写成 {fileID: 0}，
            //      资产加载为 null（表现为"配置在、登记表里却收不到"）。
            var expected = new HashSet<string>();
            foreach (PackPlan plan in plans)
                foreach (PackItem item in plan.items) expected.Add(item.id);

            var broken = new List<string>();
            foreach (IGrouping<string, PackPlan> group in plans.GroupBy(p => p.configDir))
                broken.AddRange(EditorAssetUtil.FindBrokenAssets<ABPackageConfigSO>(group.Key, expected));

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

        // ── 构建 ──────────────────────────────────────────────────────────

        // WHY: 传入**已经收集并校验过**的计划，而不是在构建前再收集一次 ——
        //      重复收集会多读一遍内容数据、多跑一遍 Provider，"写配置用的是 A 版、构建用的是 B 版"这种漂移无从察觉。
        private static BuildOutcome BuildBundles(List<PackPlan> plans, out List<string> bindingNotes)
        {
            bindingNotes = new List<string>();

            // WHY: 编辑器停在"脚本编译失败"状态时构建会秒退（0.x 秒结束），而且 Console 里可能已经看不到红字了 —— 提前拦下
            if (EditorUtility.scriptCompilationFailed)
            {
                Debug.LogError($"{LogTag} 编辑器处于脚本编译失败状态，已中止构建。" +
                               "处理：清干净 Console 里的脚本报错；若已无报错，执行 Assets > Reimport 清掉残留的失败状态，再重跑。");
                return default;
            }

            // ⓪ **材质绑定自愈**，必须排在 BuildAssetBundles 之前 ——
            //    包里的状态就是"这一刻"的资产状态：空材质槽会被原样打进产物，运行期表现为**洋红**，
            //    而且包打好了、日志全绿，最难发现。详见 ModelMaterialBindingFixer 的类注释。
            List<ModelMaterialBindingFixer.FixResult> bindings = ModelMaterialBindingFixer.FixAll(
                plans.SelectMany(plan => plan.items)
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
                return default;
            }

            // 一次 BuildAssetBundles 建出全部包（铁律①）
            AssetBundleBuild[] builds = plans
                .Select(plan => new AssetBundleBuild
                {
                    assetBundleName = plan.bundleName,
                    assetNames = plan.items.Select(item => item.assetPath).ToArray(),
                })
                .ToArray();

            var outcome = BundleBuilder.Build(
                EditorPaths.StreamingAssetsRoot, EditorPaths.TempRoot("AssetBundles"),
                builds, sweepStale: true, logTag: LogTag);

            Debug.Log($"{LogTag} 构建完成（目标平台 {EditorUserBuildSettings.activeBuildTarget}）：" +
                      $"{outcome.TotalBytes / 1024f / 1024f:N2} MB / {outcome.BundleCount} 个包\n" +
                      string.Join("\n", outcome.Lines));

            if (outcome.Removed.Count > 0)
                Debug.Log($"{LogTag} 已清理 {outcome.Removed.Count} 个不属于本次产出的残留产物：\n   " +
                          string.Join("\n   ", outcome.Removed));

            if (EditorUserBuildSettings.activeBuildTarget != BuildTarget.WebGL)
            {
                // WHY: AB 与目标平台绑定 —— 为本机平台打出来的包在 WebGL 里加载不了（反向同理）。
                //      交付形态是 WebGL（DEC-12），所以这条提醒必须显眼。
                Debug.LogWarning($"{LogTag} 当前目标平台是 {EditorUserBuildSettings.activeBuildTarget}，不是 WebGL —— " +
                                 "本次产物**只能在该平台加载**。发布 WebGL 前请在 Build Settings 里切到 WebGL，再打一次 AB 包。");
            }

            return outcome;
        }

        private static void WriteBuildReport(List<PackPlan> plans, BuildOutcome outcome, List<string> warnings)
        {
            try
            {
                string dir = Path.GetFullPath(Path.Combine(Application.dataPath, "../" + EditorPaths.BuildReportDir));
                Directory.CreateDirectory(dir);

                var report = new ABBuildReport
                {
                    generatedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
                    buildTarget = EditorUserBuildSettings.activeBuildTarget.ToString(),
                    bundleCount = outcome.BundleCount,
                    totalBytes = outcome.TotalBytes,
                    ok = outcome.Ok,
                    bundles = new List<ABBuildReportBundle>(),
                    missing = new List<string>(outcome.Missing),
                    removed = new List<string>(outcome.Removed),
                    warnings = new List<string>(warnings),
                };

                foreach (PackPlan plan in plans)
                {
                    var bundle = new ABBuildReportBundle
                    {
                        bundle = plan.bundleName,
                        source = plan.source,
                        clipId = plan.clipId ?? "",
                        itemCount = plan.items.Count,
                        bytes = BundleBytes(plan.bundleName),
                        assets = plan.items.Select(item => item.assetPath).ToList(),
                    };
                    report.bundles.Add(bundle);
                }

                string path = Path.Combine(dir, "ab-build-report.json");
                File.WriteAllText(path, JsonUtility.ToJson(report, true), new UTF8Encoding(false));
                Debug.Log($"{LogTag} 构建报告已写入：{EditorPaths.BuildReportDir}/ab-build-report.json");
            }
            catch (Exception e)
            {
                // WHY: 报告只是证据、不是产物 —— 写不出来不该让"包已经打好了"这件事变成失败
                Debug.LogWarning($"{LogTag} 构建报告写入失败（不影响产物）：{e.Message}");
            }
        }

        private static long BundleBytes(string bundleName)
        {
            string file = Path.Combine(Application.dataPath, "StreamingAssets",
                bundleName.Replace('/', Path.DirectorySeparatorChar));
            return File.Exists(file) ? new FileInfo(file).Length : 0L;
        }

        // ── 小工具 ────────────────────────────────────────────────────────

        private static bool RequireScriptReady(bool interactive)
        {
            if (EditorAssetUtil.IsScriptReady(EditorPaths.AbConfigScript)) return true;

            const string msg = "包配置脚本（ABPackageConfigSO）还没编译就绪（Unity 正在编译 / 域重载中）。\n\n等编译结束再跑本菜单。";
            Debug.LogError($"{LogTag} {msg}");
            if (interactive) EditorUtility.DisplayDialog("AB 打包", msg, "确定");
            return false;
        }

        private static bool Fail(bool interactive, string title, string detail)
        {
            Debug.LogError($"{LogTag} {title}：\n{detail}");
            if (interactive) EditorUtility.DisplayDialog("AB 打包", $"{title}\n\n{detail}", "确定");
            return false;
        }

        private static string BuildAuditText(List<PackPlan> plans, List<string> errors, List<string> warnings)
        {
            var sb = new StringBuilder();
            sb.Append($"对账完成：{plans.Count} 个包（共 {CountItems(plans)} 项资源）/ Error {errors.Count} / Warning {warnings.Count}");
            foreach (PackPlan plan in plans) sb.Append("\n  ✔ ").Append(PlanLine(plan));
            foreach (string e in errors) sb.Append("\n  ✘ [Error] ").Append(e);
            foreach (string w in warnings) sb.Append("\n  ⚠ [Warning] ").Append(w);
            return sb.ToString();
        }

        private static List<string> PlanLines(List<PackPlan> plans)
        {
            var lines = new List<string>(plans.Count);
            foreach (PackPlan plan in plans) lines.Add(PlanLine(plan));
            return lines;
        }

        private static string PlanLine(PackPlan plan)
        {
            return $"{plan.bundleName}（{plan.items.Count} 项，{plan.source}" +
                   (string.IsNullOrEmpty(plan.clipId) ? "）" : $" / {plan.clipId}）");
        }

        private static int CountItems(List<PackPlan> plans)
        {
            int total = 0;
            foreach (PackPlan plan in plans) total += plan.items.Count;
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
                foreach (PackPlan plan in plans)
                    foreach (PackItem item in plan.items) ids.Add(item.id);
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
                             "\n   → 跑一次「WSU3/Pack/一键打 AB 包（全部）」会删掉这些残留配置");
        }
    }

    /// <summary>一个待构建的包。</summary>
    public class PackPlan
    {
        /// <summary>bundle 名（= 相对 StreamingAssets 的路径，如 <c>Content/clip_contactor</c>）。</summary>
        public string bundleName;

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

    /// <summary>构建报告（落 <c>Builds/assetbundles/ab-build-report.json</c>，不进版本库）。</summary>
    [Serializable]
    public class ABBuildReport
    {
        public string generatedAt;
        public string buildTarget;
        public bool ok;
        public int bundleCount;
        public long totalBytes;
        public List<ABBuildReportBundle> bundles;
        public List<string> missing;
        public List<string> removed;
        public List<string> warnings;
    }

    /// <summary>构建报告里的一个包。</summary>
    [Serializable]
    public class ABBuildReportBundle
    {
        public string bundle;
        public string source;
        public string clipId;
        public int itemCount;
        public long bytes;
        public List<string> assets;
    }
}
