using System.Collections.Generic;
using UnityEngine;
using WSU3.Contracts.Events;

namespace WSU3.Core.Interactive
{
    /// <summary>
    /// 结构件实例的**部件清单收集器**（`scene:parts` 的数据来源，DEC-130 / DEC-131）。
    ///
    /// 口径：
    ///   · 只收 <see cref="StructureObj"/> —— 部件名（`objName` / `objName_en`）随预制体走（DEC-104），
    ///     没有 StructureObj 的 Transform 节点不是"部件"，不上报；
    ///   · <c>ParentKey</c> 指向**最近的"部件父级"**（沿实例内部向上找第一个 StructureObj），
    ///     不是每一个 Transform 节点 —— 树由 Web 侧组装（web/src/domain/part-tree.ts），
    ///     实例根之上不算父级（清单只描述这一棵实例）；
    ///   · 纯静态、不碰桥：调用方拿到 <see cref="ScenePartEntryData"/> 列表后自己发意图事件
    ///     （Core 不依赖 Web 层，上网由 Runtime 的 <c>WebBridgeBehaviour</c> 完成）。
    /// </summary>
    public static class ScenePartInventory
    {
        /// <summary>收集一棵实例里的部件清单（实例为 null 时返回空表，不抛异常）。</summary>
        public static List<ScenePartEntryData> Collect(GameObject instance)
        {
            List<ScenePartEntryData> parts = new List<ScenePartEntryData>();
            if (instance == null) return parts;

            foreach (StructureObj part in instance.GetComponentsInChildren<StructureObj>(true))
            {
                parts.Add(new ScenePartEntryData
                {
                    Key = part.ObjectKey,
                    // 名字随预制体走（DEC-104）；没填时回落 objectKey —— 空名条目 Web 侧会丢，宁可显示 key。
                    Name = string.IsNullOrEmpty(part.ObjectName) ? part.ObjectKey : part.ObjectName,
                    NameEn = NullIfEmpty(part.ObjectName_en),
                    ParentKey = FindParentKey(part.transform, instance.transform),
                });
            }

            return parts;
        }

        /// <summary>
        /// 沿实例内部向上找最近的 StructureObj；出了实例根（或根上没有部件）就是**空串 = 顶层**
        /// （"顶层"是明确的值，不是缺失 —— 与桥层"parentKey 空串当根"的口径一致）。
        /// </summary>
        private static string FindParentKey(Transform node, Transform root)
        {
            Transform current = node.parent;
            while (current != null && current.IsChildOf(root))
            {
                StructureObj parent = current.GetComponent<StructureObj>();
                if (parent != null) return parent.ObjectKey;
                if (current == root) break;
                current = current.parent;
            }

            return string.Empty;
        }

        private static string NullIfEmpty(string value)
        {
            return string.IsNullOrEmpty(value) ? null : value;
        }
    }
}
