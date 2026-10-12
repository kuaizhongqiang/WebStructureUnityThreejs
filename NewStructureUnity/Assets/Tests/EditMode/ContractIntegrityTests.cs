using System;
using NUnit.Framework;
using UnityEngine;
using WSU3.Contracts;

namespace WSU3.Tests.EditMode
{
    /// <summary>
    /// C# 侧的契约快照测试（DEC-27 / DEC-09）。与 web/src/contracts/contracts.spec.ts 同源同值：
    /// 任何一侧改动都会让另一侧的门禁失败，这就是 DEC-10 选"手写两份"后的兜底手段。
    /// </summary>
    public class ContractIntegrityTests
    {
        private static readonly string[] ExpectedTaskTypeNames =
        {
            "None", "Purpose", "Equipment", "Principle", "LineConnection",
            "Training", "Test", "Info", "Structure", "Inspection", "Exam",
        };

        private static readonly string[] ExpectedTaskTypeLabels =
        {
            "空类型", "任务目的", "实验仪器", "实验原理", "电路连接",
            "仿真实验", "小测验", "简介", "结构", "检测", "考核",
        };

        private static readonly string[] ExpectedSceneStateNames =
        {
            "Setup", "Start", "Login", "Menu", "UI", "Roaming",
        };

        private static readonly string[] ExpectedSceneStateLabels =
        {
            "初始化", "开始", "登录", "菜单", "UI", "漫游",
        };

        [Test]
        public void TaskType_NameAndOrderAreFrozen()
        {
            AssertFrozenOrder(typeof(TaskType), ExpectedTaskTypeNames);
        }

        [Test]
        public void TaskType_ChineseLabelsAreFrozen()
        {
            AssertFrozenLabels(typeof(TaskType), ExpectedTaskTypeNames, ExpectedTaskTypeLabels);
        }

        [Test]
        public void SceneState_NameAndOrderAreFrozen()
        {
            AssertFrozenOrder(typeof(SceneState), ExpectedSceneStateNames);
        }

        [Test]
        public void SceneState_ChineseLabelsAreFrozen()
        {
            AssertFrozenLabels(typeof(SceneState), ExpectedSceneStateNames, ExpectedSceneStateLabels);
        }

        private static void AssertFrozenOrder(Type enumType, string[] expected)
        {
            string[] actual = Enum.GetNames(enumType);
            Assert.AreEqual(expected.Length, actual.Length, $"{enumType.Name} 的值个数变了（只许往后追加）");
            for (int i = 0; i < expected.Length; i++)
            {
                Assert.AreEqual(expected[i], actual[i], $"{enumType.Name}[{i}] 名字或顺序变了");
                Assert.AreEqual(i, Convert.ToInt32(Enum.Parse(enumType, actual[i])), $"{enumType.Name}.{actual[i]} 的序号变了");
            }
        }

        private static void AssertFrozenLabels(Type enumType, string[] names, string[] labels)
        {
            for (int i = 0; i < names.Length; i++)
            {
                var field = enumType.GetField(names[i]);
                Assert.IsNotNull(field, $"{enumType.Name}.{names[i]} 不存在");
                var attribute = (InspectorNameAttribute)Attribute.GetCustomAttribute(field, typeof(InspectorNameAttribute));
                Assert.IsNotNull(attribute, $"{enumType.Name}.{names[i]} 缺少 [InspectorName]（中文是契约）");
                Assert.AreEqual(labels[i], attribute.displayName, $"{enumType.Name}.{names[i]} 的中文标签变了");
            }
        }
    }
}
