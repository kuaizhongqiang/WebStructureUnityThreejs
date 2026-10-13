using System.Collections.Generic;
using UnityEngine;

namespace WSU3.Core.Interactive
{
    /// <summary>
    /// 交互物的**按契约 key 注册表**（自注册 / 自注销）。
    ///
    /// 为什么要它（docs/research/09 的"必须继承"清单 + DEC-80）：
    ///   · 拾取、`view:focus`、`object:picked` 三处都要"按 key 找物体"，**不要**用 `FindObjectsOfType` 每帧扫；
    ///   · key 用**契约里的字符串**（`objectKey`），不是 Guid —— Web 侧只认这个 key（`docs/design/02`）。
    ///
    /// 注意：`Core/Managers/FunctionManager/InteractiveManager` 里那份 Guid 字典是既有脚手架，
    /// 与这里是**同一件事的两种口径**；本期以本表为准，`InteractiveManager` 在 P2-6 落地时改为委托到本表。
    /// </summary>
    public static class InteractiveRegistry
    {
        private static readonly Dictionary<string, InteractiveObjBase> s_Map =
            new Dictionary<string, InteractiveObjBase>();

        /// <summary>已注册数量。</summary>
        public static int Count => s_Map.Count;

        /// <summary>注册（重复注册同一 key 时后者覆盖并告警 —— 多办是 prefab 复制忘了改 key）。</summary>
        public static void Register(InteractiveObjBase obj)
        {
            if (obj == null) return;
            string key = obj.ObjectKey;
            if (string.IsNullOrEmpty(key))
            {
                Debug.LogWarning($"[InteractiveRegistry] {obj.name} 的 objectKey 为空，未注册。");
                return;
            }

            if (s_Map.TryGetValue(key, out InteractiveObjBase exist) && exist != null && exist != obj)
            {
                Debug.LogWarning(
                    $"[InteractiveRegistry] key '{key}' 已被 {exist.name} 占用，现由 {obj.name} 覆盖。" +
                    "同一场景内 objectKey 必须唯一（它是对 Web 暴露的契约键）。");
            }
            s_Map[key] = obj;
        }

        /// <summary>注销。</summary>
        public static void Unregister(InteractiveObjBase obj)
        {
            if (obj == null) return;
            string key = obj.ObjectKey;
            if (!string.IsNullOrEmpty(key) && s_Map.TryGetValue(key, out InteractiveObjBase exist) && exist == obj)
            {
                s_Map.Remove(key);
            }
        }

        /// <summary>按 key 找（`view:focus` 用它）。</summary>
        public static bool TryGet(string key, out InteractiveObjBase obj)
        {
            if (string.IsNullOrEmpty(key))
            {
                obj = null;
                return false;
            }
            if (s_Map.TryGetValue(key, out obj) && obj != null) return true;
            obj = null;
            return false;
        }

        /// <summary>收集某一类交互物（诊断 / 批量操作用，不逐帧调用）。</summary>
        public static void Collect<T>(List<T> into) where T : InteractiveObjBase
        {
            if (into == null) return;
            into.Clear();
            foreach (KeyValuePair<string, InteractiveObjBase> pair in s_Map)
            {
                if (pair.Value is T typed) into.Add(typed);
            }
        }

        /// <summary>清空（场景整体卸载或测试时用）。</summary>
        public static void Clear()
        {
            s_Map.Clear();
        }
    }
}
