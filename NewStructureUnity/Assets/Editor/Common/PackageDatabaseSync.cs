using System;
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;
using WSU3.Core.Models.Addressable;

namespace WSU3.Editor.Common
{
    // WHY: 关键边界 —— 主清单的 <c>AutoCollect()</c> 是"全工程按类型全量重收、重写整个列表"，
    //      只允许在明确"要写"时调用（<see cref="Sync"/> 是唯一写入口）；
    //      只看不写的场合一律走 <see cref="Audit"/>（绝不写盘）。
    /// <summary>包登记表（<see cref="PackageDatabaseSO"/>）的同步与只读体检。</summary>
    public static class PackageDatabaseSync
    {
        /// <summary>同步主清单：全量 <c>AutoCollect</c> + 本次产出兜底补入（AutoCollect 可能漏收）；会写盘，返回同步后的条数。</summary>
        public static int Sync(string dbAssetPath, IEnumerable<AAPackageConfigSO> justGenerated, string logTag)
        {
            PackageDatabaseSO db = EditorAssetUtil.LoadOrCreateAsset<PackageDatabaseSO>(dbAssetPath, logTag, "已创建包清单");
            if (db == null)
            {
                Debug.LogError($"{logTag} 包清单资产创建失败：{dbAssetPath}");
                return 0;
            }

            db.AutoCollect();

            int added = 0;
            if (justGenerated != null)
            {
                foreach (AAPackageConfigSO config in justGenerated)
                {
                    // WHY: config == null 是隐式保护，别去掉 —— 上游自检删掉坏资产后，列表里仍持有被删对象的引用
                    if (config == null || string.IsNullOrEmpty(config.id) || db.FindById(config.id) != null) continue;
                    db.packages.Add(config);
                    added++;
                }
            }

            EditorUtility.SetDirty(db);
            AssetDatabase.SaveAssets();

            if (added > 0) Debug.LogWarning($"{logTag} AutoCollect 漏收 {added} 个配置，已兜底补入");
            if (db.Count == 0) Debug.LogError($"{logTag} 包登记表为空：{dbAssetPath}");
            else Debug.Log($"{logTag} 包登记表已同步：{dbAssetPath}（{db.Count} 条）");

            return db.Count;
        }

        /// <summary>只读体检（绝不写盘、绝不调用 AutoCollect）：与预期 id 集合求差集，返回 <see cref="DatabaseAudit"/>。</summary>
        public static DatabaseAudit Audit(string dbAssetPath, ISet<string> expectedIds)
        {
            var audit = new DatabaseAudit
            {
                Missing = new List<string>(),
                Residue = new List<string>(),
                NullRefs = new List<string>(),
            };

            var db = AssetDatabase.LoadAssetAtPath<PackageDatabaseSO>(dbAssetPath);
            if (db == null)
            {
                if (expectedIds != null) audit.Missing.AddRange(expectedIds);
                audit.Missing.Sort(StringComparer.Ordinal);
                return audit;
            }

            audit.TotalCount = db.Count;

            var present = new HashSet<string>();
            for (int i = 0; i < db.packages.Count; i++)
            {
                PackageConfigSO package = db.packages[i];
                if (package == null || string.IsNullOrEmpty(package.id))
                {
                    audit.NullRefs.Add($"packages[{i}]（{(package == null ? "引用丢失" : "id 为空")}）");
                    continue;
                }

                present.Add(package.id);
            }

            if (expectedIds != null)
            {
                foreach (string id in expectedIds)
                    if (!present.Contains(id)) audit.Missing.Add(id);
            }

            // WHY: 反向残留只看"内容包"（AA 且 clipId 非空）—— 全局包不属于内容流水线的产出，
            //      一律报出只会淹没有效信息。
            foreach (PackageConfigSO package in db.packages)
            {
                var aa = package as AAPackageConfigSO;
                if (aa == null || string.IsNullOrEmpty(aa.id) || string.IsNullOrEmpty(aa.clipId)) continue;
                if (expectedIds != null && expectedIds.Contains(aa.id)) continue;
                audit.Residue.Add(aa.id);
            }

            audit.Missing.Sort(StringComparer.Ordinal);
            audit.Residue.Sort(StringComparer.Ordinal);
            return audit;
        }
    }

    /// <summary>只读体检结果（见 <see cref="PackageDatabaseSync.Audit"/>）。</summary>
    public struct DatabaseAudit
    {
        /// <summary>登记表当前条数。</summary>
        public int TotalCount;

        /// <summary>预期有、登记表里没有。</summary>
        public List<string> Missing;

        /// <summary>登记表里有、不属于本次产出的**内容包**（配置未清干净 / bundle 已成无主残留）。</summary>
        public List<string> Residue;

        /// <summary><c>packages[i]</c> 引用丢失或 id 为空。</summary>
        public List<string> NullRefs;

        /// <summary>一行摘要，供弹窗 / Console 直接使用。</summary>
        public string Summary()
        {
            return $"登记表 {TotalCount} 条 ／ 未收录 {Count(Missing)} ／ 残留 {Count(Residue)} ／ 空引用 {Count(NullRefs)}";
        }

        static int Count(List<string> list)
        {
            return list == null ? 0 : list.Count;
        }
    }
}
