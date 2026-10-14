using System;
using System.Collections.Generic;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace WSU3.Editor.Common
{
    /// <summary>
    /// **嵌套 FBX 模型实例的材质绑定自愈**：打包前体检，坏了就强制重导它依赖的 FBX。
    ///
    /// ## 为什么需要它（这是一次实测踩出来的，不是预防性设计）
    ///
    /// `timeRelay` / `masterAppliance` 两个结构件的零件是**嵌套 FBX 模型实例**（外层预制体只存覆盖项，
    /// 零件本体与材质绑定住在 FBX 里）。DEC-102/103 的"**材质接管**"把 FBX 自动抽出的同名 `.mat` 换成了
    /// 本工程搬来的材质 —— 两者 **GUID 不同**，于是 FBX 内部的材质绑定指向了一个已消失的 GUID
    /// ⇒ 实例化后那些 `MeshRenderer.sharedMaterials` 全是 `null` ⇒ **洋红**。
    ///
    /// `AssetDatabase.ImportAsset(fbx, ForceUpdate)` 会让导入器重新解析这层绑定（归零）。
    /// ⚠️ **但这个修复只落在本机 `Library/`（派生数据，不进版本库）**：任何一次"不强制"的全量重导
    /// （最常见的就是**切换 Build Target**）都会把它打回去。2026-10-14 实测正是如此：
    /// 负责人切到 WebGL 后 `timeRelay` 8 处 / `masterAppliance` 3 处材质引用又变回空，
    /// 而当时打的 8 个 AB 包就把这个状态**原样打进了产物**（包内实测同样是 8/3 处为 null）。
    ///
    /// ## 两条纪律
    ///
    /// ① **只在"有坏槽"时才重导** —— 重导 FBX 不便宜，且会让 Unity 打一条
    ///    `FBXImporter generated inconsistent result` 警告（那是"本次导入结果与上次不同"的提示，不是错误）；
    /// ② **修不好就中止打包**，绝不把洋红材质打进产物 —— "包打好了但模型是粉的"比"没打包"更贵。
    ///
    /// ## 为什么用 `LoadPrefabContents` 而不是 `Instantiate`
    ///
    /// 前者在**隔离场景**里把预制体连同嵌套实例一起展开，不在当前场景留下任何对象。
    /// ⚠️ 不要图省事改成 `AssetDatabase.LoadAssetAtPath&lt;GameObject&gt;()` **直接读预制体资产**：
    /// 嵌套实例里的零件在外层 YAML 是 `stripped` 块（没有名字、没有 Transform），那样读**必然全是 null** ——
    /// 这正是 DEC-111 记下的那条教训（"对预制体内容里的物体取 id 实测 16/16 失败"）。
    /// 实测两种读法在本工程的 8 个预制体上**结果完全一致**（11/44/8/3/10/61/41/21 个材质槽），
    /// 所以这里选不污染场景的那种。
    /// </summary>
    public static class ModelMaterialBindingFixer
    {
        /// <summary>一个预制体的体检 / 修复结果。</summary>
        public struct FixResult
        {
            /// <summary>预制体工程路径。</summary>
            public string PrefabPath;

            /// <summary>修复前：材质引用为 null / shader 为 null 的槽位数。</summary>
            public int BadSlotsBefore;

            /// <summary>修复后：同上。</summary>
            public int BadSlotsAfter;

            /// <summary>正常的材质槽位数（修复后）。</summary>
            public int GoodSlotsAfter;

            /// <summary>本次实际强制重导的 FBX（没坏槽时为空）。</summary>
            public List<string> ReimportedFbx;

            /// <summary>修复后已无坏槽。</summary>
            public bool Ok { get { return BadSlotsAfter == 0; } }
        }

        /// <summary>
        /// 数一个已展开的预制体里"材质引用坏掉"的槽位数。
        ///
        /// 判据两条都算坏：**材质本身是 null**（FBX 绑定指向消失的 GUID），
        /// 以及**材质的 shader 是 null**（材质在但 shader 丢了 —— AB 那类问题的典型表现）。
        /// 两者在画面上都是洋红，所以不该分开处理。
        /// </summary>
        public static void CountMaterialSlots(GameObject root, out int good, out int bad)
        {
            good = 0;
            bad = 0;
            if (root == null) return;

            foreach (Renderer renderer in root.GetComponentsInChildren<Renderer>(true))
            {
                Material[] materials = renderer.sharedMaterials;
                for (int i = 0; i < materials.Length; i++)
                {
                    Material material = materials[i];
                    if (material == null || material.shader == null) bad++;
                    else good++;
                }
            }
        }

        /// <summary>只读体检：返回坏槽位数（`-1` = 预制体读不到）。**不改动任何东西。**</summary>
        public static int Inspect(string prefabPath)
        {
            GameObject contents = null;
            try
            {
                contents = PrefabUtility.LoadPrefabContents(prefabPath);
                if (contents == null) return -1;
                CountMaterialSlots(contents, out int _, out int bad);
                return bad;
            }
            finally
            {
                if (contents != null) PrefabUtility.UnloadPrefabContents(contents);
            }
        }

        /// <summary>
        /// 体检 + 自愈一个预制体：坏了才重导它依赖的 FBX，然后复测一次。
        ///
        /// 已经正常时**不做任何改动**（幂等，且不产生无意义的 importer 警告）。
        /// </summary>
        public static FixResult Fix(string prefabPath)
        {
            var result = new FixResult
            {
                PrefabPath = prefabPath,
                BadSlotsBefore = -1,
                BadSlotsAfter = -1,
                GoodSlotsAfter = 0,
                ReimportedFbx = new List<string>(),
            };
            if (string.IsNullOrEmpty(prefabPath)) return result;

            result.BadSlotsBefore = Inspect(prefabPath);
            result.BadSlotsAfter = result.BadSlotsBefore;
            if (result.BadSlotsBefore <= 0) return result;   // 0 = 干净；-1 = 读不到（下面按原样报出去）

            // 只重导"这个预制体真正依赖的" FBX：不猜、不按名字拼，依赖树里没有 FBX 就无法自愈。
            string[] fbxDependencies = AssetDatabase.GetDependencies(prefabPath, true)
                .Where(path => path.EndsWith(".fbx", StringComparison.OrdinalIgnoreCase))
                .ToArray();

            if (fbxDependencies.Length == 0) return result;   // 没有 FBX 可重导 ⇒ 保持坏槽数，由调用方决定怎么办

            foreach (string fbx in fbxDependencies)
            {
                AssetDatabase.ImportAsset(fbx, ImportAssetOptions.ForceUpdate);
                result.ReimportedFbx.Add(fbx);
            }
            AssetDatabase.Refresh(ImportAssetOptions.ForceUpdate);

            result.BadSlotsAfter = Inspect(prefabPath);
            GameObject contents = PrefabUtility.LoadPrefabContents(prefabPath);
            if (contents != null)
            {
                CountMaterialSlots(contents, out int good, out int _);
                result.GoodSlotsAfter = good;
                PrefabUtility.UnloadPrefabContents(contents);
            }
            return result;
        }

        /// <summary>对一组预制体逐个体检 + 自愈。返回逐项结果（调用方据此报日志 / 决定是否中止）。</summary>
        public static List<FixResult> FixAll(IEnumerable<string> prefabPaths)
        {
            var results = new List<FixResult>();
            if (prefabPaths == null) return results;

            // 同一批里可能有重复路径（一个包一个预制体时不会，但 Provider 变多以后会）
            foreach (string path in prefabPaths.Distinct())
            {
                if (string.IsNullOrEmpty(path)) continue;
                if (!path.EndsWith(".prefab", StringComparison.OrdinalIgnoreCase)) continue;
                results.Add(Fix(path));
            }
            return results;
        }

        /// <summary>把结果压成给人看的一行（干净的不占篇幅，只报"修过的"与"没修好的"）。</summary>
        public static List<string> Describe(List<FixResult> results)
        {
            var lines = new List<string>();
            foreach (FixResult result in results)
            {
                string name = System.IO.Path.GetFileName(result.PrefabPath);
                if (result.BadSlotsBefore < 0)
                {
                    lines.Add($"{name}：预制体读不到，跳过材质绑定体检");
                }
                else if (result.BadSlotsBefore == 0)
                {
                    continue;   // 干净的不刷屏
                }
                else if (result.Ok)
                {
                    lines.Add($"{name}：发现 {result.BadSlotsBefore} 处空材质 ⇒ " +
                              $"强制重导 {string.Join("、", result.ReimportedFbx.Select(System.IO.Path.GetFileName))} " +
                              $"后归零（现有 {result.GoodSlotsAfter} 个材质引用）");
                }
                else
                {
                    lines.Add($"{name}：**仍有 {result.BadSlotsAfter} 处空材质**（原 {result.BadSlotsBefore} 处）—— " +
                              "依赖树里没有可重导的 FBX，请人工检查这些零件的材质槽");
                }
            }
            return lines;
        }

        /// <summary>手工入口：对全部结构件预制体跑一遍体检 + 自愈（不改任何资产，只重导 FBX）。</summary>
        [MenuItem("WSU3/Pack/修复模型材质绑定（嵌套 FBX）", false, 40)]
        public static void FixStructurePrefabsFromMenu()
        {
            const string root = "Assets/Prefabs/Models/StructureObjs";
            string[] prefabs = AssetDatabase.FindAssets("t:Prefab", new[] { root })
                .Select(AssetDatabase.GUIDToAssetPath)
                .OrderBy(path => path, StringComparer.Ordinal)
                .ToArray();

            List<FixResult> results = FixAll(prefabs);
            List<string> lines = Describe(results);
            int healed = results.Count(r => r.BadSlotsBefore > 0 && r.Ok);
            int broken = results.Count(r => !r.Ok);

            string body = lines.Count > 0
                ? string.Join("\n", lines)
                : $"{results.Count} 个预制体的材质绑定都正常，无需处理。";
            Debug.Log($"[Pack] 材质绑定体检：{results.Count} 个预制体 / 修复 {healed} / 仍有问题 {broken}\n{body}");

            EditorUtility.DisplayDialog("模型材质绑定",
                (broken > 0 ? $"⚠ 仍有 {broken} 个预制体材质为空，需要人工处理\n\n" : "✔ 体检完成\n\n") + body,
                "确定");
        }
    }
}
