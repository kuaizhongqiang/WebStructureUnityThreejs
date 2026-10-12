using UnityEngine;

// ============================================================================
// 双端共享契约（C# 侧）。Web 侧镜像：web/src/contracts/{scene-state,task-type}.ts
// 纪律（docs/DECISIONS.md DEC-09 / DEC-10）：
//   1. 只许【往后追加】，不得插值、改序、改名；
//   2. [InspectorName] 的中文是契约的一部分，逐字保持；
//   3. 改本文件必须同批改 TS 侧与 content/contracts/snapshot.json，否则门禁会拦住提交。
// 门禁读取路径固定为本文件（DEC-68），不要改名或移动。
// ============================================================================

namespace WSU3.Contracts
{
    /// <summary>页面级导航状态机。与 Web 侧 web/src/contracts/scene-state.ts 逐值一致（门禁 tools/check-contracts.mjs 三方比对）。</summary>
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
}
