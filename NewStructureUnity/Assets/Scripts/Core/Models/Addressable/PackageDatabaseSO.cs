using System.Collections.Generic;
using UnityEngine;

namespace WSU3.Core.Models.Addressable
{
    // WHY: 这是"包登记表"的**唯一入口** —— 运行期加载此 SO 构建 id → PackageConfigSO 字典，
    //      编辑器打包工具遍历同一份列表决定"打哪些包"。列表缺条目会直接导致运行期加载失败；
    //      资产落点 Resources/Config/ 是为了让运行期与编辑器取到同一份（docs/design/03 §7，DEC-87）。
    /// <summary>包配置主清单：持有全部 <see cref="PackageConfigSO"/> 引用的单个 .asset，编辑器打包与运行期加载共用。</summary>
    [CreateAssetMenu(
        fileName = "PackageDB_",
        menuName = "WSU3/Package Database",
        order = 1)]
    public class PackageDatabaseSO : ScriptableObject
    {
        [Tooltip("所有需要管理的包配置列表。\n\n" +
                 "AA / AB / Default 三种类型可混编；编辑器打包工具遍历此列表构建资源包，\n" +
                 "运行期从此列表加载全部包数据到登记表")]
        public List<PackageConfigSO> packages = new List<PackageConfigSO>();

        /// <summary>按包类型筛选（如只取全部 AA 配置）。</summary>
        public IEnumerable<PackageConfigSO> GetByType(PackageType type)
        {
            for (int i = 0; i < packages.Count; i++)
            {
                PackageConfigSO package = packages[i];
                if (package != null && package.PackageType == type) yield return package;
            }
        }

        /// <summary>按 id 查找包配置，未找到返回 null。</summary>
        public PackageConfigSO FindById(string id)
        {
            if (string.IsNullOrEmpty(id)) return null;

            for (int i = 0; i < packages.Count; i++)
            {
                if (packages[i] != null && packages[i].id == id) return packages[i];
            }
            return null;
        }

        /// <summary>清单里出现过的全部 <c>clipId</c>（诊断用：找不到某个 clip 的配置时，一眼看出清单里实际有谁）。</summary>
        public List<string> GetClipIds()
        {
            var set = new HashSet<string>();
            for (int i = 0; i < packages.Count; i++)
            {
                var aa = packages[i] as AAPackageConfigSO;
                if (aa != null && !string.IsNullOrEmpty(aa.clipId)) set.Add(aa.clipId);
            }
            return new List<string>(set);
        }

        /// <summary>检查列表完整性，返回引用丢失或 id 为空的条目索引。</summary>
        public List<int> Validate()
        {
            var missing = new List<int>();
            for (int i = 0; i < packages.Count; i++)
            {
                if (packages[i] == null || string.IsNullOrEmpty(packages[i].id)) missing.Add(i);
            }
            return missing;
        }

        /// <summary>列表中包配置的总数。</summary>
        public int Count => packages.Count;

#if UNITY_EDITOR
        // WHY: AssetDatabase 的类型过滤器**不匹配抽象基类的派生资源**（只搜 t:PackageConfigSO 收不到子类，
        //      实测会出现"配置资产在盘上而清单是空表"），故按"基类 + 各具体子类"各搜一遍再去重排序。
        /// <summary>Editor 工具：自动扫描并收集工程中所有 <see cref="PackageConfigSO"/>，按路径去重后依 id 排序写回。</summary>
        public void AutoCollect()
        {
            var found = new Dictionary<string, PackageConfigSO>();

            AddAssets("t:PackageConfigSO", found);
            AddAssets("t:AAPackageConfigSO", found);
            AddAssets("t:DefaultPackageConfigSO", found);

            packages.Clear();
            var list = new List<PackageConfigSO>(found.Values);
            list.Sort((a, b) => string.CompareOrdinal(a.id ?? "", b.id ?? ""));
            packages.AddRange(list);

            UnityEditor.EditorUtility.SetDirty(this);
        }

        /// <summary>按过滤器收集资产（同一路径只收一次，防止多轮过滤重复）。</summary>
        static void AddAssets(string filter, Dictionary<string, PackageConfigSO> found)
        {
            foreach (string guid in UnityEditor.AssetDatabase.FindAssets(filter))
            {
                string path = UnityEditor.AssetDatabase.GUIDToAssetPath(guid);
                if (string.IsNullOrEmpty(path) || found.ContainsKey(path)) continue;

                var config = UnityEditor.AssetDatabase.LoadAssetAtPath<PackageConfigSO>(path);
                if (config != null) found[path] = config;
            }
        }
#endif
    }
}
