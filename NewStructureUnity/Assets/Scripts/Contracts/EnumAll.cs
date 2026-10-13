using System;
using UnityEngine;

// ============================================================================
// 双端共享契约（C# 侧）。Web 侧镜像：web/src/contracts/{scene-state,task-type,question-type}.ts
// 纪律（docs/DECISIONS.md DEC-09 / DEC-10 / DEC-83）：
//   1. 只许【往后追加】，不得插值、改序、改名；
//   2. [InspectorName] 的中文是契约的一部分，逐字保持；
//   3. 改本文件必须同批改 TS 侧与 content/contracts/snapshot.json，否则门禁会拦住提交；
//   4. 内容数据里的枚举写成【名字】（如 "SingleChoice"），不写序号（docs/design/08）。
// 门禁读取路径固定为本文件（DEC-68），不要改名或移动。
// 桥消息类型不在这里，在同目录的 BridgeMessageType.cs（DEC-85）。
// ============================================================================

namespace WSU3.Contracts
{
    /// <summary>页面级导航状态机。与 Web 侧 web/src/contracts/scene-state.ts 逐值一致（门禁 tools/check-contracts.mjs 三方比对）。</summary>
    [Serializable]
    public enum SceneState
    {
        [InspectorName("初始化")]
        Setup = 0,
        [InspectorName("开始")]
        Start = 1,
        [InspectorName("登录")]
        Login = 2,
        [InspectorName("菜单")]
        Menu = 3,
        [InspectorName("UI")]
        UI = 4,
        [InspectorName("漫游")]
        Roaming = 5,
    }

    /// <summary>
    /// 业务任务类型，同时是三维技术栈的分流开关（DEC-06）：
    /// Three.js = None/Purpose/Equipment/Principle/Test/Info/Exam；Unity = LineConnection/Training/Structure/Inspection。
    /// 与 Web 侧 web/src/contracts/task-type.ts 逐值一致（门禁 tools/check-contracts.mjs 三方比对）。
    /// </summary>
    [Serializable]
    public enum TaskType
    {
        [InspectorName("空类型")]
        None = 0,
        [InspectorName("任务目的")]
        Purpose = 1,
        [InspectorName("实验仪器")]
        Equipment = 2,
        [InspectorName("实验原理")]
        Principle = 3,
        [InspectorName("电路连接")]
        LineConnection = 4,
        [InspectorName("仿真实验")]
        Training = 5,
        [InspectorName("小测验")]
        Test = 6,
        [InspectorName("简介")]
        Info = 7,
        [InspectorName("结构")]
        Structure = 8,
        [InspectorName("检测")]
        Inspection = 9,
        [InspectorName("考核")]
        Exam = 10,
    }
    /// <summary>
    /// 题型。与 Web 侧 web/src/contracts/question-type.ts 逐值一致（门禁 tools/check-contracts.mjs 三方比对）。
    /// None 是占位，保证 0 不被占用；名字是内容数据的契约（JSON 里写名字，不写序号）。
    /// </summary>
    [Serializable]
    public enum QuestionType
    {
        [InspectorName("空类型")]
        None = 0,
        [InspectorName("单选")]
        SingleChoice = 1,
        [InspectorName("多选")]
        MultipleChoice = 2,
        [InspectorName("判断")]
        TrueFalse = 3,
        [InspectorName("填空")]
        FillInBlank = 4,
    }

    /// <summary>
    /// 题目用途：决定一道题进考核抽题池还是挂在步骤里。与 Web 侧 question-type.ts 逐值一致。
    /// </summary>
    [Serializable]
    public enum QuestionUsage
    {
        [InspectorName("考核")]
        Exam = 0,
        [InspectorName("步骤")]
        Step = 1,
    }
}
