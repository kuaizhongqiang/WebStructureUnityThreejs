using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using WSU3.Contracts.Events;
using WSU3.Core.Interactive;

namespace WSU3.Tests.EditMode
{
    /// <summary>
    /// 部件清单收集器（`scene:parts` 的数据来源，DEC-130 / DEC-131）：
    /// 层级推导（parentKey = 最近的部件父级）、跳过无 StructureObj 的中间节点、
    /// 不越过实例根、名字没填时回落 objectKey —— 这些全是"静默错"（错列了 Web 树就歪），
    /// 所以在 EditMode 下用真实 GameObject 层级逐条钉住。
    /// </summary>
    public class ScenePartInventoryTests
    {
        private GameObject _instance;

        [TearDown]
        public void TearDown()
        {
            if (_instance != null) Object.DestroyImmediate(_instance);
            _instance = null;
        }

        [Test]
        public void Collect_WithNoParts_ReturnsEmpty()
        {
            _instance = new GameObject("Instance");

            List<ScenePartEntryData> parts = ScenePartInventory.Collect(_instance);

            Assert.AreEqual(0, parts.Count);
        }

        [Test]
        public void Collect_NullInstance_ReturnsEmptyInsteadOfThrowing()
        {
            Assert.DoesNotThrow(() => ScenePartInventory.Collect(null));
            Assert.AreEqual(0, ScenePartInventory.Collect(null).Count);
        }

        [Test]
        public void Collect_ParentKeyIsTheNearestPartAncestor_SkippingPlainTransforms()
        {
            // instance
            // ├─ body(部件)            → 顶层（parentKey 空）
            // │  └─ coil(部件)         → body
            // │     └─ terminal(非部件)  ← 中间节点要被跳过
            // │        └─ screw(部件)  → coil（不是 body，更不是 terminal）
            // └─ lone(部件)            → 顶层
            _instance = new GameObject("Instance");
            Transform body = AddPart(NewChild(_instance.transform, "body"), "body");
            Transform coil = AddPart(NewChild(body, "coil"), "coil");
            Transform terminal = NewChild(coil, "terminal"); // 非部件：纯 Transform 中间层
            AddPart(NewChild(terminal, "screw"), "screw");
            AddPart(NewChild(_instance.transform, "lone"), "lone");

            List<ScenePartEntryData> parts = ScenePartInventory.Collect(_instance);

            Assert.AreEqual(4, parts.Count, "无 StructureObj 的节点（instance / terminal）不该出现在清单里");

            ScenePartEntryData bodyEntry = parts.Find(p => p.Key == "body");
            ScenePartEntryData coilEntry = parts.Find(p => p.Key == "coil");
            ScenePartEntryData screwEntry = parts.Find(p => p.Key == "screw");
            ScenePartEntryData loneEntry = parts.Find(p => p.Key == "lone");

            Assert.IsNotNull(bodyEntry);
            Assert.IsEmpty(bodyEntry.ParentKey, "实例内最外层的部件是顶层（parentKey 空串）");
            Assert.AreEqual("body", coilEntry.ParentKey);
            Assert.AreEqual("coil", screwEntry.ParentKey, "parentKey 指向最近的部件父级，跳过非部件中间层");
            Assert.IsEmpty(loneEntry.ParentKey);
        }

        [Test]
        public void Collect_DoesNotClimbAboveTheInstanceRoot()
        {
            // other(部件) └─ Instance(非部件根) └─ mine(部件)：
            // mine 沿 instance 内部向上只到根，**不该**把实例外的 other 当父级（清单只描述本实例）。
            var other = new GameObject("OtherInstance");
            AddPart(other.transform, "otherRoot");
            try
            {
                _instance = new GameObject("Instance");
                _instance.transform.SetParent(other.transform, false);
                AddPart(_instance.transform, "mine");

                List<ScenePartEntryData> parts = ScenePartInventory.Collect(_instance);

                Assert.AreEqual(1, parts.Count);
                Assert.IsEmpty(parts[0].ParentKey, "实例外的 StructureObj 不算父级");
            }
            finally
            {
                Object.DestroyImmediate(other);
            }
        }

        [Test]
        public void Collect_NameFallsBackToObjectKey_WhenObjNameIsEmpty()
        {
            // 名字随预制体走（DEC-104），但预制体可能还没填 objName —— 空名条目 Web 侧会丢，
            // 所以收集器回落 objectKey，宁可显示 key 也不显示空。
            _instance = new GameObject("Instance");
            AddPart(_instance.transform, "contactor_body", objName: null);

            List<ScenePartEntryData> parts = ScenePartInventory.Collect(_instance);

            Assert.AreEqual(1, parts.Count);
            Assert.AreEqual("contactor_body", parts[0].Name, "objName 未填时回落 objectKey");
            Assert.IsNull(parts[0].NameEn, "英文名未填 = 无（桥层序列化成空串）");
        }

        // ── 搭建工具 ──────────────────────────────────────────────────────

        private static Transform NewChild(Transform parent, string name)
        {
            var child = new GameObject(name);
            child.transform.SetParent(parent, false);
            return child.transform;
        }

        /// <summary>挂一个 StructureObj 并填 objectKey / objName（私有 serializeField 走 SerializedObject 写入）。</summary>
        private static Transform AddPart(Transform parent, string objectKey, string objName = null)
        {
            StructureObj part = NewChild(parent, objectKey).gameObject.AddComponent<StructureObj>();
            UnityEditor.SerializedObject so = new UnityEditor.SerializedObject(part);
            so.FindProperty("objectKey").stringValue = objectKey;
            so.FindProperty("objName").stringValue = objName ?? string.Empty;
            so.ApplyModifiedPropertiesWithoutUndo();
            return part.transform;
        }
    }
}
