using HighlightPlus;
using UnityEngine;
using WSU3.Core.Managers;

namespace WSU3.Core.DataStruct
{
    /// <summary>运行期"取件 / 命名"常量的唯一来源（场景名、Resources 路径、挂载节点名）。</summary>
    public static class DataStructMapping
    {
        const string VideoPath = "Video/";
        const string AudioPath = "Audio/";
        const string DataPath = "Data/";
        const string ContentSceneName = "1_Content";
        const string HighlightProfileName = "Highlight";
        const string FocusRotationControlPath = "FocusRotationControl";

        /// <summary>结构件实例的挂载根节点名（内容场景里可以预摆，也可以由运行期自动建）。</summary>
        const string StructureRootName = "StructureRoot";

        /// <summary>结构件挂载根节点名（诊断 / 场景自查用）。</summary>
        public static string GetStructureRootName()
        {
            return StructureRootName;
        }

        public static void GetPath()
        {
        }

        public static string GetContentSceneName()
        {
            return ContentSceneName;
        }

        public static HighlightProfile GetHighlightProfile()
        {
            return Resources.Load<HighlightProfile>(HighlightProfileName);
        }

        public static GameObject GetFocusRotationControl(Transform parent)
        {
            GameObject prefab = Resources.Load<GameObject>(FocusRotationControlPath);
            return GameObject.Instantiate(prefab, parent);
        }

        /// <summary>
        /// 结构件实例的挂载根。
        ///
        /// 两级口径（**故意的**）：① 内容场景里已经有同名节点就用它 —— 负责人可以把它的位置 / 父级
        /// 按关卡需要摆好；② 没有就在管理器节点下运行时建一个。
        ///
        /// 为什么不由工具往场景里塞节点：场景文件（`1_Content`）由负责人在编辑器里装配，
        /// 工具替人改场景会让"场景长什么样"这件事出现两个作者；而运行期建节点是幂等的、可回退的。
        /// </summary>
        public static Transform GetStructureRoot()
        {
            GameObject existing = GameObject.Find(StructureRootName);
            if (existing != null) return existing.transform;

            var root = new GameObject(StructureRootName);
            if (GlobalManager.Exists) root.transform.SetParent(GlobalManager.Instance.transform, false);

            Debug.Log($"[DataStruct] 内容场景里没有 '{StructureRootName}' 节点，已在运行期创建（结构件实例挂它下面）。" +
                      "要在场景里预摆，就建一个同名节点即可。");
            return root.transform;
        }
    }
}
