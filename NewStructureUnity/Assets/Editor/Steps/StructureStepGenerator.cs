using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using WSU3.Core.Interactive;
using WSU3.Core.Steps;
using WSU3.Core.Steps.Conditions;

namespace WSU3.Editor
{
    /// <summary>
    /// 从**只读来源工程**的 `simpleSteps` 生成结构任务（TaskType 8）的步骤子树（DEC-111）。
    ///
    /// **为什么要有它**：DEC-111 把"步骤数据落点"定成**预制体自带全量 StepManager 子树**，
    /// 而 8 个器件共 **46 步** —— 手工搭 46 遍既慢又容易漏字段。来源工程的每个结构件预制体上那张
    /// `InstControlledManager.simpleSteps` 是**唯一**的步骤定义（DEC-104），本工具就按它生成。
    ///
    /// | 来源 `simpleSteps` 字段 | 落到本工程 |
    /// |---|---|
    /// | `clip`（guid） | `StepHandler.Condition.animations[0].clip` —— 按 guid 解析；播放器是该器件 `Scale` 上的 `Animation`（来源的 `controlAnim` 指的就是它） |
    /// | `clickObj`（零件脚本 MonoBehaviour 的 fileID） | `ConditionClick.target` —— 同一 fileID 的 GameObject 在本工程是逐字保留的（搬运只换脚本），取它身上的 `StructureObj`（没有就补）；`{fileID: 0}` ⇒ 这一步无交互，用 `ConditionDefault` |
    /// | `delay` / `animSpeed` | **不落**：7 个器件两者全 0，只有 `contactor` 用 `0.5` / `1` —— 正好等于 `StepManager.stepDelaySeconds`（默认 0.5f）与默认播放速度（DEC-111） |
    /// | `index` | **不用**：来源数据里每条都写 0（数据缺陷），**顺序**才是真相，用列表序号 |
    ///
    /// **纪律**：
    ///   · **只读来源工程**（DEC-69）—— 只 `File.ReadAllText`，不写盘、不进 AssetDatabase；
    ///   · **幂等**：重复跑不产生差异（第二次跑报告应是"0 变更"）；
    ///   · **只补空**：手工在 Inspector 里填过的非空字段保留；唯一例外是"与来源不符"时替换并**告警**；
    ///   · 顺手清掉两个**有意未搬**的脚本残留（`StructureTaskObj` / `InstControlledManager`，DEC-104）——
    ///     它们在本工程就是 Missing Script：不清掉 Unity 一直告警，零件上也挂不上新脚本。
    /// </summary>
    public static class StructureStepGenerator
    {
        const string LocalPrefabDir = "Assets/Prefabs/Models/StructureObjs";
        const string SourcePrefabSubDir = "Assets/Prefabs/Models/StructureObjs";
        const string ReportRelPath = "content/asset-structure-steps-report.json";
        const string PrefKey = "WSU3.StructureSteps.SourceRoot";
        const string ProcessNodeName = "0";   // 一个器件 = 一个进程（进程 id 留空时用物体名）

        static string ProjectRoot => Path.GetFullPath(Path.Combine(Application.dataPath, "..", ".."));

        // ---------------------------------------------------------------- 入口

        [MenuItem("WSU3/Steps/生成结构任务步骤（选来源工程…）", priority = 110)]
        static void MenuPickSource()
        {
            if (!Guard()) return;

            string start = EditorPrefs.GetString(PrefKey, Path.GetDirectoryName(ProjectRoot));
            string dir = EditorUtility.OpenFolderPanel("选择来源工程根目录（含 Assets/，全程只读）", start, "");
            if (string.IsNullOrEmpty(dir)) return;

            EditorPrefs.SetString(PrefKey, dir);
            if (!Confirm(dir)) return;
            Generate(dir);
        }

        [MenuItem("WSU3/Steps/生成结构任务步骤（沿用上次来源工程）", priority = 111)]
        static void MenuReuseSource()
        {
            if (!Guard()) return;

            string dir = EditorPrefs.GetString(PrefKey, null);
            if (string.IsNullOrEmpty(dir))
            {
                EditorUtility.DisplayDialog("还没有记住来源工程",
                    "先用「选来源工程…」跑一次，之后这个菜单就能直接沿用。", "知道了");
                return;
            }

            if (!Confirm(dir)) return;
            Generate(dir);
        }

        /// <summary>批处理入口：`-executeMethod WSU3.Editor.StructureStepGenerator.GenerateFromBatch -structureSource &lt;path&gt;`。</summary>
        public static void GenerateFromBatch()
        {
            string src = null;
            string[] args = Environment.GetCommandLineArgs();
            for (int i = 0; i < args.Length - 1; i++)
            {
                if (args[i] == "-structureSource") src = args[i + 1];
            }

            if (string.IsNullOrEmpty(src)) src = EditorPrefs.GetString(PrefKey, null);

            if (string.IsNullOrEmpty(src))
            {
                Debug.LogError("[StructureSteps] 批处理缺少 `-structureSource <来源工程根目录>`（也没有记住过来源工程）。");
                return;
            }

            Generate(src);
        }

        // ---------------------------------------------------------------- 主流程

        /// <summary>
        /// 核心：按来源工程生成/补齐全部结构件预制体的步骤子树。返回一行摘要（供 `execute_code` / 批处理读）。
        /// 不弹任何对话框（菜单入口自己负责 Guard / Confirm）。
        /// </summary>
        public static string Generate(string sourceRoot)
        {
            sourceRoot = (sourceRoot ?? string.Empty).TrimEnd('\\', '/');
            string sourceDir = Path.Combine(sourceRoot, string.Join("/", SourcePrefabSubDir.Split('/')));

            if (!Directory.Exists(sourceDir))
            {
                string msg = $"[StructureSteps] 来源目录不存在：{sourceDir}";
                Debug.LogError(msg);
                return msg;
            }

            var report = new GenReport
            {
                sourceRoot = sourceRoot,
                generatedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
            };

            string[] sourceFiles = Directory.GetFiles(sourceDir, "*_structure_model.prefab");
            Array.Sort(sourceFiles, StringComparer.OrdinalIgnoreCase);

            foreach (string sourceFile in sourceFiles)
            {
                string fileName = Path.GetFileName(sourceFile);
                string localPath = LocalPrefabDir + "/" + fileName;

                var device = new DeviceReport { device = Path.GetFileNameWithoutExtension(fileName), sourcePrefab = sourceFile, localPrefab = localPath };

                if (!File.Exists(localPath))
                {
                    device.warnings.Add("本工程里没有同名预制体，已跳过");
                    report.devices.Add(device);
                    continue;
                }

                string sourceText = File.ReadAllText(sourceFile, Encoding.UTF8);
                var yaml = PrefabYaml.Parse(sourceText);
                List<StepSpec> specs = ParseSteps(sourceText, yaml, out string controlAnimPath);

                device.steps = specs.Count;
                device.controlAnimPath = controlAnimPath;

                if (specs.Count == 0)
                {
                    // masterAppliance：空壳、来源本来就没有步骤（DEC-105 接受），不产子树
                    device.warnings.Add("来源预制体没有 simpleSteps（0 步）—— 按 DEC-105 不产步骤子树");
                    report.devices.Add(device);
                    continue;
                }

                try
                {
                    GenerateDevice(localPath, specs, device);
                }
                catch (Exception e)
                {
                    device.warnings.Add("生成异常：" + e.Message);
                    Debug.LogError($"[StructureSteps] {fileName} 生成失败：{e}");
                }

                report.devices.Add(device);
            }

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            WriteReport(report);

            string summary = BuildSummary(report);
            Debug.Log("[StructureSteps] " + summary);
            return summary;
        }

        static void GenerateDevice(string localPath, List<StepSpec> specs, DeviceReport device)
        {
            GameObject root = PrefabUtility.LoadPrefabContents(localPath);
            try
            {
                // ① 清 Missing Script（DEC-104：那两个脚本有意未搬；来源里带脚本的 GameObject 数量逐器件核对过）
                foreach (Transform tr in root.GetComponentsInChildren<Transform>(true))
                {
                    int removed = GameObjectUtility.RemoveMonoBehavioursWithMissingScript(tr.gameObject);
                    if (removed > 0)
                    {
                        device.removedMissingScripts += removed;
                        if (device.missingScriptOwners.Count < 12) device.missingScriptOwners.Add(tr.name);
                    }
                }

                // ② clip 解析（先解析 clip 再挑播放器：挑播放器要用 clip 验证"这个 Animation 认不认它"）
                foreach (StepSpec spec in specs)
                {
                    string clipPath = AssetDatabase.GUIDToAssetPath(spec.clipGuid);
                    spec.clip = string.IsNullOrEmpty(clipPath) ? null : AssetDatabase.LoadAssetAtPath<AnimationClip>(clipPath);

                    if (spec.clip == null) device.warnings.Add($"clip guid {spec.clipGuid} 在本工程解析不到 —— 这一步没有动画");
                }

                // ③ 动画播放器：优先来源 controlAnim 指的节点（按路径）；否则找"认得这段 clip"的那个 Animation；
                //    再不行才退回全树第一个 —— 顺序重要：挑错组件会把 clip 注册到别的物体上
                Animation animation = null;
                if (!string.IsNullOrEmpty(device.controlAnimPath))
                {
                    Transform node = FindByFullPath(root.transform, device.controlAnimPath);
                    if (node != null) animation = node.GetComponent<Animation>();
                }

                if (animation == null)
                {
                    StepSpec firstWithClip = specs.Find(s => s.clip != null);
                    if (firstWithClip != null)
                    {
                        foreach (Animation candidate in root.GetComponentsInChildren<Animation>(true))
                        {
                            if (candidate.GetClip(firstWithClip.clip.name) == null) continue;
                            animation = candidate;
                            break;
                        }
                    }
                }

                if (animation == null) animation = root.GetComponentInChildren<Animation>(true);

                if (animation == null)
                {
                    device.warnings.Add("预制体里找不到 Animation 组件 —— 步骤不会播动画");
                }
                else
                {
                    foreach (StepSpec spec in specs)
                    {
                        if (spec.clip != null) EnsureClipRegistered(animation, spec.clip, device);
                    }
                }

                // ④ 条件目标（没有 StructureObj 就补）。两条路：
                //    · **非嵌套零件** → 按路径找；
                //    · **嵌套 FBX 实例里的零件** → 外层 YAML 里是 stripped 块（没有名字与 Transform，路径算不出来），
                //      改用"源资产 guid + 该资产里的 fileID"当身份：stripped GameObject 的 fileID 在两个工程里是
                //      **保留**的，所以先在**本工程**的 YAML 里把 stripped id 翻成 (guid, fileID)，再按身份在内容里匹配。
                PrefabYaml localYaml = PrefabYaml.Parse(File.ReadAllText(ToAbsolute(localPath), Encoding.UTF8));

                foreach (StepSpec spec in specs)
                {
                    if (spec.clickObjFileId == 0) continue;

                    Transform target = FindByFullPath(root.transform, spec.targetPath);

                    if (target == null
                        && !string.IsNullOrEmpty(spec.targetGameObjectId)
                        && localYaml.TryGetCorrespondingSource(spec.targetGameObjectId, out string sourceGuid, out string sourceId))
                    {
                        target = FindBySourceIdentity(root, sourceGuid, sourceId);
                    }

                    if (target == null)
                    {
                        device.warnings.Add(
                            $"clickObj {spec.clickObjFileId} 解析不到目标（路径 '{spec.targetPath ?? "-"}'）—— 这一步的 target 会留空");
                        continue;
                    }

                    StructureObj obj = target.GetComponent<StructureObj>();
                    if (obj == null)
                    {
                        obj = target.gameObject.AddComponent<StructureObj>();
                        device.addedStructureObj++;
                    }

                    spec.target = obj;
                }

                // ⑤ 子树：StepManager → 0(ProcessingHandler) → 0..N-1(StepHandler)（层级是硬约束，design/10 §1）
                Transform stepManager = EnsureChild(root.transform, "StepManager");
                if (stepManager.GetComponent<StepManager>() == null) stepManager.gameObject.AddComponent<StepManager>();

                Transform process = EnsureChild(stepManager, ProcessNodeName);
                if (process.GetComponent<ProcessingHandler>() == null) process.gameObject.AddComponent<ProcessingHandler>();

                for (int i = 0; i < specs.Count; i++)
                {
                    Transform node = EnsureChild(process, i.ToString(CultureInfo.InvariantCulture));
                    StepHandler handler = node.GetComponent<StepHandler>();
                    if (handler == null) handler = node.gameObject.AddComponent<StepHandler>();

                    FillStep(handler, specs[i], animation, device);
                }

                // ⑥ 多余节点：上次生成过更多步时清掉（幂等；手工多挂的 StepHandler 也会被清，故告警写明）
                for (int i = process.childCount - 1; i >= specs.Count; i--)
                {
                    Transform extra = process.GetChild(i);
                    if (extra.GetComponent<StepHandler>() == null) continue;
                    device.warnings.Add($"清掉多余的步骤节点 '{extra.name}'（本次只应有 {specs.Count} 步）");
                    UnityEngine.Object.DestroyImmediate(extra.gameObject);
                }

                PrefabUtility.SaveAsPrefabAsset(root, localPath);
            }
            finally
            {
                PrefabUtility.UnloadPrefabContents(root);
            }
        }

        static void FillStep(StepHandler handler, StepSpec spec, Animation animation, DeviceReport device)
        {
            bool changed = false;
            var so = new SerializedObject(handler);
            so.Update();

            SerializedProperty condition = so.FindProperty("condition");
            if (condition == null)
            {
                device.warnings.Add($"{handler.name}: 找不到 condition 字段，跳过");
                return;
            }

            ConditionType want = spec.clickObjFileId == 0 ? ConditionType.Default : ConditionType.Click;
            var existing = condition.managedReferenceValue as ConditionBase;

            if (existing == null)
            {
                condition.managedReferenceValue = StepConditionFactory.Create(want);
                so.ApplyModifiedProperties();
                so.Update();
                device.created++;
                changed = true;
            }
            else if (existing.Type != want)
            {
                device.warnings.Add($"{handler.name}: 现有条件是 {existing.Type}，与来源不符（应为 {want}）—— 已替换");
                condition.managedReferenceValue = StepConditionFactory.Create(want);
                so.ApplyModifiedProperties();
                so.Update();
                device.replaced++;
                changed = true;
            }

            // 选型字段同步：StepHandlerEditor 的下拉读它当"待选值"（没有条件时才有语义）
            SerializedProperty typeField = so.FindProperty("conditionType");
            if (typeField != null && typeField.intValue != (int)want)
            {
                typeField.intValue = (int)want;
                changed = true;
            }

            // target：只补空（手工填过的保留）
            SerializedProperty targetProp = so.FindProperty("condition.target");
            if (targetProp != null && spec.target != null && targetProp.objectReferenceValue == null)
            {
                targetProp.objectReferenceValue = spec.target;
                changed = true;
            }

            // 动画槽位 0：clip 由来源决定，故这里以来源为准（不一致就覆盖并告警）
            if (animation != null && spec.clip != null)
            {
                SerializedProperty slots = so.FindProperty("condition.animations");
                if (slots == null)
                {
                    device.warnings.Add($"{handler.name}: 找不到 condition.animations，没能写入动画槽位");
                }
                else
                {
                    if (slots.arraySize == 0)
                    {
                        slots.arraySize = 1;
                        changed = true;
                    }

                    SerializedProperty slot = slots.GetArrayElementAtIndex(0);
                    SerializedProperty animProp = slot.FindPropertyRelative("animation");
                    SerializedProperty clipProp = slot.FindPropertyRelative("clip");
                    SerializedProperty hideProp = slot.FindPropertyRelative("ifHideOnFinish");

                    if (animProp != null && animProp.objectReferenceValue != animation)
                    {
                        animProp.objectReferenceValue = animation;
                        changed = true;
                    }

                    if (clipProp != null && clipProp.objectReferenceValue != spec.clip)
                    {
                        if (clipProp.objectReferenceValue != null)
                        {
                            device.warnings.Add($"{handler.name}: 槽位 0 原来的 clip 与来源不一致，已按来源覆盖");
                        }

                        clipProp.objectReferenceValue = spec.clip;
                        changed = true;
                    }

                    if (hideProp != null && hideProp.boolValue)
                    {
                        hideProp.boolValue = false;   // 口径：都用类默认（负责人 2026-10-14 定）
                        changed = true;
                    }
                }
            }

            so.ApplyModifiedProperties();

            if (changed) device.changedSteps++;
            else device.unchangedSteps++;
        }

        static void EnsureClipRegistered(Animation animation, AnimationClip clip, DeviceReport device)
        {
            if (animation.GetClip(clip.name) != null) return;

            var so = new SerializedObject(animation);
            SerializedProperty list = so.FindProperty("m_Animations");
            if (list == null)
            {
                device.warnings.Add($"Animation '{animation.name}' 里找不到 m_Animations，clip '{clip.name}' 没能注册");
                return;
            }

            for (int i = 0; i < list.arraySize; i++)
            {
                if (list.GetArrayElementAtIndex(i).objectReferenceValue == clip) return;
            }

            list.InsertArrayElementAtIndex(list.arraySize);
            list.GetArrayElementAtIndex(list.arraySize - 1).objectReferenceValue = clip;
            so.ApplyModifiedProperties();
            device.addedClips++;
        }

        /// <summary>
        /// 按**完整路径**（含预制体根那一段）找节点：`PathOf` 返回的是从根开始的路径，
        /// 而 `Transform.Find` 要的是相对路径 —— 不剥掉根名会一律找不到（踩过一次）。
        /// </summary>
        static Transform FindByFullPath(Transform root, string fullPath)
        {
            if (string.IsNullOrEmpty(fullPath) || fullPath == "?") return null;
            if (fullPath == root.name) return root;

            string prefix = root.name + "/";
            string relative = fullPath.StartsWith(prefix, StringComparison.Ordinal)
                ? fullPath.Substring(prefix.Length)
                : fullPath;

            return root.Find(relative);
        }

        /// <summary>
        /// 按"**源资产身份**"（资产 guid + 该资产里的 fileID）找嵌套实例里的节点。
        ///
        /// 为什么需要它：嵌套 FBX 实例里的零件在外层 YAML 里是 stripped 块（没有名字、没有 Transform），
        /// 路径那套用不上；而 `TryGetGUIDAndLocalFileIdentifier` 对**预制体内容里的物体**取不到 id
        /// （实测 16/16 失败），但对 `GetCorrespondingObjectFromSource` 返回的**源资产物体**是准的
        /// （实测 7/7 命中、0 失败）。所以：拿内容的每个子物体去反查它的源物体身份来比对。
        /// </summary>
        static Transform FindBySourceIdentity(GameObject root, string sourceGuid, string sourceId)
        {
            foreach (Transform tr in root.GetComponentsInChildren<Transform>(true))
            {
                GameObject source = PrefabUtility.GetCorrespondingObjectFromSource(tr.gameObject);
                if (source == null) continue;

                if (!AssetDatabase.TryGetGUIDAndLocalFileIdentifier(source, out string guid, out long localId)) continue;
                if (guid != sourceGuid) continue;
                if (localId.ToString(CultureInfo.InvariantCulture) != sourceId) continue;

                return tr;
            }

            return null;
        }

        /// <summary>工程相对路径（`Assets/...`）→ 绝对路径（YAML 得用 File 读，不能走 AssetDatabase）。</summary>
        static string ToAbsolute(string assetPath)
        {
            const string prefix = "Assets/";
            return assetPath.StartsWith(prefix, StringComparison.Ordinal)
                ? Path.Combine(Application.dataPath, assetPath.Substring(prefix.Length).Replace('/', Path.DirectorySeparatorChar))
                : assetPath;
        }

        static Transform EnsureChild(Transform parent, string name)
        {
            Transform found = parent.Find(name);
            if (found != null) return found;

            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            return go.transform;
        }

        // ---------------------------------------------------------------- 来源解析

        sealed class StepSpec
        {
            public string clipGuid;
            public long clickObjFileId;
            public float delay;
            public float animSpeed;
            public string targetPath;            // 非嵌套零件：从预制体根算起的路径
            public string targetGameObjectId;    // clickObj 所在 GameObject 的 fileID（本工程同一 fileID 保留）
            public InteractiveObjBase target;
            public AnimationClip clip;
        }

        /// <summary>读来源预制体：`controlAnim`（动画节点路径，出参）+ `simpleSteps`（顺序即步骤顺序）。</summary>
        static List<StepSpec> ParseSteps(string text, PrefabYaml yaml, out string controlAnimPath)
        {
            var specs = new List<StepSpec>();
            controlAnimPath = null;
            string[] lines = text.Replace("\r\n", "\n").Split('\n');

            int cursor = 0;
            for (; cursor < lines.Length; cursor++)
            {
                Match m = Regex.Match(lines[cursor], @"^  controlAnim: \{fileID: (\d+)\}");
                if (!m.Success) continue;
                controlAnimPath = yaml.PathOf(m.Groups[1].Value);
                break;
            }

            for (; cursor < lines.Length; cursor++)
            {
                if (lines[cursor].TrimEnd() == "  simpleSteps:") break;
            }

            if (cursor >= lines.Length) return specs;

            StepSpec current = null;
            for (int i = cursor + 1; i < lines.Length; i++)
            {
                string line = lines[i];

                if (line.StartsWith("  - "))
                {
                    current = new StepSpec();
                    specs.Add(current);
                    continue;
                }

                if (!line.StartsWith("    ") || current == null) break;   // 缩进回到 2 空格 ⇒ 块结束

                Match clip = Regex.Match(line, @"clip: \{fileID: \d+, guid: (\w+)");
                if (clip.Success)
                {
                    current.clipGuid = clip.Groups[1].Value;
                    continue;
                }

                Match click = Regex.Match(line, @"clickObj: \{fileID: (\d+)\}");
                if (click.Success)
                {
                    current.clickObjFileId = long.Parse(click.Groups[1].Value, CultureInfo.InvariantCulture);
                    continue;
                }

                Match delay = Regex.Match(line, @"delay: ([-\d\.]+)");
                if (delay.Success)
                {
                    float.TryParse(delay.Groups[1].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out current.delay);
                    continue;
                }

                Match speed = Regex.Match(line, @"animSpeed: ([-\d\.]+)");
                if (speed.Success)
                {
                    float.TryParse(speed.Groups[1].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out current.animSpeed);
                }
            }

            foreach (StepSpec spec in specs)
            {
                if (spec.clickObjFileId == 0) continue;

                string clickId = spec.clickObjFileId.ToString(CultureInfo.InvariantCulture);
                spec.targetGameObjectId = yaml.OwnerOf(clickId);
                spec.targetPath = yaml.PathOf(clickId);   // 嵌套实例里的物体没有名字/Transform ⇒ 这里是 null
            }

            return specs;
        }

        /// <summary>
        /// MonoBehaviour / GameObject 的 fileID → 层级路径 的最小 YAML 索引。
        /// 为什么靠 YAML：`clickObj` 引用的是**来源工程内部的 fileID**，Unity 没有公开 API 能按 fileID
        /// 取对象；而搬运时 fileID 是**逐字保留**的，所以"在来源里算出路径、在本工程按路径找"是精确映射。
        /// </summary>
        sealed class PrefabYaml
        {
            // ⚠️ `(?: stripped)?` 不能省：嵌套实例里的物体在 YAML 里是 `--- !u!1 &<id> stripped`，
            //    少了这一段会把这些块整块跳过 —— 而"源资产身份"正是从 stripped 块里读的（踩过一次）。
            static readonly Regex BlockRegex =
                new Regex(@"--- !u!(\d+) &(-?\d+)(?: stripped)?\r?\n(.*?)(?=--- !u!|\z)", RegexOptions.Singleline | RegexOptions.Compiled);

            readonly Dictionary<string, string> m_Class = new Dictionary<string, string>();
            readonly Dictionary<string, string> m_Owner = new Dictionary<string, string>();
            readonly Dictionary<string, string> m_TransformOf = new Dictionary<string, string>();
            readonly Dictionary<string, string> m_Father = new Dictionary<string, string>();
            readonly Dictionary<string, string> m_Name = new Dictionary<string, string>();
            readonly Dictionary<string, string> m_CorrespondingSource = new Dictionary<string, string>();   // fileID -> "guid|源资产里的fileID"

            public static PrefabYaml Parse(string text)
            {
                var yaml = new PrefabYaml();

                foreach (Match block in BlockRegex.Matches(text))
                {
                    string cls = block.Groups[1].Value;
                    string id = block.Groups[2].Value;
                    string body = block.Groups[3].Value;

                    yaml.m_Class[id] = cls;

                    Match owner = Regex.Match(body, @"m_GameObject: \{fileID: (\d+)\}");
                    if (owner.Success) yaml.m_Owner[id] = owner.Groups[1].Value;

                    // 长 YAML 会把映射折行（`… guid: xxx,` 换行后才是 `type: 3}`），所以只取前两项即可
                    Match corresponding = Regex.Match(body, @"m_CorrespondingSourceObject: \{fileID: (-?\d+), guid: (\w+)");
                    if (corresponding.Success) yaml.m_CorrespondingSource[id] = corresponding.Groups[2].Value + "|" + corresponding.Groups[1].Value;

                    if (cls == "1")
                    {
                        Match name = Regex.Match(body, @"^  m_Name: ?(.*)$", RegexOptions.Multiline);
                        yaml.m_Name[id] = name.Success ? name.Groups[1].Value.Trim() : string.Empty;
                    }
                    else if (cls == "4")
                    {
                        if (owner.Success) yaml.m_TransformOf[owner.Groups[1].Value] = id;
                        Match father = Regex.Match(body, @"m_Father: \{fileID: (\d+)\}");
                        yaml.m_Father[id] = father.Success ? father.Groups[1].Value : "0";
                    }
                }

                return yaml;
            }

            /// <summary>给定 fileID（GameObject / 组件）返回它所在 GameObject 的 fileID。</summary>
            public string OwnerOf(string fileId)
            {
                if (string.IsNullOrEmpty(fileId) || !m_Class.TryGetValue(fileId, out string cls)) return null;
                if (cls == "1") return fileId;
                return m_Owner.TryGetValue(fileId, out string owner) ? owner : null;
            }

            /// <summary>
            /// stripped 块（嵌套实例里的物体）携带的"源资产身份"：资产 guid + 该资产里的 fileID。
            /// 本工程与来源工程的 stripped GameObject fileID 是保留的，所以先用本工程的 YAML 把
            /// stripped id 翻成这个身份，再去内容里按 `FindBySourceIdentity` 匹配。
            /// </summary>
            public bool TryGetCorrespondingSource(string fileId, out string guid, out string localId)
            {
                guid = null;
                localId = null;

                if (string.IsNullOrEmpty(fileId) || !m_CorrespondingSource.TryGetValue(fileId, out string pair)) return false;

                int split = pair.IndexOf('|');
                if (split <= 0) return false;

                guid = pair.Substring(0, split);
                localId = pair.Substring(split + 1);
                return guid != "0";
            }

            /// <summary>给定任意 fileID（GameObject / 组件）返回 "A/B/C"，解析不到返回 null。</summary>
            public string PathOf(string fileId)
            {
                if (string.IsNullOrEmpty(fileId) || !m_Class.TryGetValue(fileId, out string cls)) return null;

                string gameObject = cls == "1"
                    ? fileId
                    : (m_Owner.TryGetValue(fileId, out string owned) ? owned : null);
                if (gameObject == null) return null;

                // stripped（嵌套 FBX 实例里的物体）：外层 YAML 里既没有名字也没有 Transform
                // ⇒ 路径算不出来，交给"源资产身份"那条路（TryGetCorrespondingSource + FindBySourceIdentity）
                if (!m_Name.ContainsKey(gameObject)) return null;

                var parts = new List<string>();
                string transformId = m_TransformOf.TryGetValue(gameObject, out string t) ? t : null;

                while (true)
                {
                    parts.Insert(0, m_Name.TryGetValue(gameObject, out string name) ? name : "?");

                    if (transformId == null) break;
                    if (!m_Father.TryGetValue(transformId, out string father) || father == "0") break;
                    if (!m_Owner.TryGetValue(father, out string parentGameObject)) break;

                    gameObject = parentGameObject;
                    transformId = father;
                }

                return string.Join("/", parts);
            }
        }

        // ---------------------------------------------------------------- 报告

        [Serializable]
        sealed class DeviceReport
        {
            public string device;
            public string localPrefab;
            public string sourcePrefab;
            public int steps;
            public int created;
            public int replaced;
            public int changedSteps;
            public int unchangedSteps;
            public int removedMissingScripts;
            public int addedStructureObj;
            public int addedClips;
            public List<string> missingScriptOwners = new List<string>();
            public List<string> warnings = new List<string>();

            [NonSerialized] public string controlAnimPath;
        }

        [Serializable]
        sealed class GenReport
        {
            public string sourceRoot;
            public string generatedAt;
            public List<DeviceReport> devices = new List<DeviceReport>();
        }

        static void WriteReport(GenReport report)
        {
            string path = Path.Combine(ProjectRoot, ReportRelPath.Replace('/', Path.DirectorySeparatorChar));
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            File.WriteAllText(path, JsonUtility.ToJson(report, true), new UTF8Encoding(false));
            Debug.Log($"[StructureSteps] 报告：{ReportRelPath}");
        }

        static string BuildSummary(GenReport report)
        {
            int steps = 0, changed = 0, unchanged = 0, created = 0, missing = 0, parts = 0, clips = 0, warns = 0;

            foreach (DeviceReport d in report.devices)
            {
                steps += d.steps;
                changed += d.changedSteps;
                unchanged += d.unchangedSteps;
                created += d.created;
                missing += d.removedMissingScripts;
                parts += d.addedStructureObj;
                clips += d.addedClips;
                warns += d.warnings.Count;
            }

            return $"{report.devices.Count} 个器件：{steps} 步（新建条件 {created} / 变更 {changed} / 未变 {unchanged}）" +
                   $"；清 Missing Script {missing} 处、补 StructureObj {parts} 个、补注册 clip {clips} 个；告警 {warns} 条";
        }

        // ---------------------------------------------------------------- 护栏

        static bool Guard()
        {
            if (EditorApplication.isCompiling || EditorApplication.isUpdating)
            {
                EditorUtility.DisplayDialog("编辑器正忙", "正在编译 / 刷新资源，等它跑完再试。", "知道了");
                return false;
            }

            PrefabStage stage = PrefabStageUtility.GetCurrentPrefabStage();
            if (stage != null && stage.assetPath.StartsWith(LocalPrefabDir))
            {
                EditorUtility.DisplayDialog("先退出预制体编辑模式",
                    $"'{stage.assetPath}' 正在预制体编辑模式里打开。\n" +
                    "本工具会整份重写这些预制体，未保存的手工改动会被覆盖 —— 先保存并关掉预制体编辑模式，再跑。",
                    "知道了");
                return false;
            }

            return true;
        }

        static bool Confirm(string sourceRoot)
        {
            if (Application.isBatchMode) return true;

            return EditorUtility.DisplayDialog("生成结构任务步骤",
                $"来源（只读）：{sourceRoot}\n" +
                $"目标：{LocalPrefabDir} 下的结构件预制体\n\n" +
                "按来源的 simpleSteps 生成/补齐 StepManager 子树；已手工填过的非空字段保留（只补空）。",
                "生成", "取消");
        }
    }
}
