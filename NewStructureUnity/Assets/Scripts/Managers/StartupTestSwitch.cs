using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using UnityEngine;
using WSU3.Contracts;
using WSU3.Contracts.Events;
using WSU3.Core.DataStruct;
using WSU3.Core.Managers;

namespace WSU3.Managers
{
    /// <summary>
    /// `0_Setup` 上的**免 Web 自测开关**：让 WebGL 构建（以及编辑器 Play 模式）**自己**进入一个任务，
    /// 完全不依赖网页通过桥发 `scene:enter`。
    ///
    /// WHY 需要它：正常路径里"装配什么"只能由 Web 决定（DEC-08）—— 对产品这是对的，对**自测**却是死结。
    /// WebGL 产物一旦离开页面就没有任何人能发指令，验收时只能看到"停在 `1_Content`、画面里什么都没有"；
    /// 于是"结构任务到底能不能装配"这件事要么回编辑器跑、要么拖着整页 Web 一起调，两边都慢，
    /// 而且失败时说不清是桥的问题还是装配的问题。本开关把"进入任务"这一步在 Unity 内部**复述**一遍：
    /// 发的是与 Web **同一个** <see cref="SceneEnterRequestEvent"/>，走的是同一条
    /// 装包 → 装配 → `scene:ready` 链路（<see cref="WSU3.Core.Managers.FunctionManager.TaskFlowManager"/>），
    /// 所以它验证的就是产品路径本身，而不是一条平行的假路径。
    ///
    /// **开关关闭时（默认 false）对产品路径零影响**：不发任何事件、不改任何状态，只在内容场景到位后
    /// 打一条日志说明"仍在等 Web 的 scene:enter"，然后自毁 —— 没打开这个开关的构建，行为与没有本组件时一致。
    ///
    /// 纪律：本组件**绝不替 Web 做决定**。它只在"当前没人进过任务"（`CurrentTaskType == None`）时补一枪；
    /// Web 已经先发了 `scene:enter` 就让位，不重复进入。
    ///
    /// 摆放：给它一个**自己的根物体**，不要挂在 `StartupFlow` 那个物体上 ——
    /// 后者在引导结束时 `Destroy(gameObject)`（StartupFlow.cs 末尾），会把同物体的本组件协程一起带走，
    /// 于是"等活动场景变成 `1_Content`"这一步可能在切换的那一帧被掐断。它会 `DontDestroyOnLoad` 自己，
    /// 活过 `0_Setup → 1_Content` 的 single 切换，做完事再自毁。
    /// </summary>
    [DisallowMultipleComponent]
    public class StartupTestSwitch : MonoBehaviour
    {
        /// <summary>等管理器链自检的总预算（秒）。超时只告警并继续（与 <see cref="StartupFlow"/> 同一口径）。</summary>
        private const float InitTimeoutSeconds = 15f;

        /// <summary>等 `1_Content` 成为活动场景的总预算（秒）。超时只告警并放弃自测，不把自测挂死在切场景上。</summary>
        private const float SceneWaitTimeoutSeconds = 60f;

        /// <summary>URL query 里"总开关"的键（大小写不敏感）。</summary>
        private const string TestQueryKey = "wsu3_test";

        /// <summary>URL query 里"projectClip"的键（大小写不敏感）。</summary>
        private const string ClipQueryKey = "wsu3_clip";

        /// <summary>自测进入时写在 `scene:enter` 里的内容版本号：让下游日志一眼能认出"这条不是 Web 发的"。</summary>
        private const string SelfTestContentVersion = "selftest";

        // 注：**不**把字段叫 `enabled` —— 那会遮蔽 MonoBehaviour 继承来的 `Behaviour.enabled`
        //     （Inspector 里会出现两枚"启用"，而且 `GetComponent<StartupTestSwitch>().enabled = false`
        //     拿到的是"关掉组件"、不是"关掉自测开关"，两者语义不同，是最容易踩错的一类同名）。
        [Tooltip("总开关（默认关）：只有显式打开时才会本机自测进入任务。关着时对产品路径零影响，仍等 Web 的 scene:enter。")]
        [SerializeField] private bool testEnabled = false;

        [Tooltip("自测进入的任务类型（默认 结构=8）。只在本组件自己发起进入时使用，Web 的 scene:enter 不受它影响。")]
        [SerializeField] private TaskType taskType = TaskType.Structure;

        [Tooltip("自测进入的项目 clip（默认 clip_contactor），会作为 scene:enter 的 projectId 交给装包链路。")]
        [SerializeField] private string projectClip = "clip_contactor";

        [Tooltip("WebGL 免重打包覆盖：允许用 URL query（?wsu3_test=on|8 & wsu3_clip=xxx）临时改写上面的开关与取值。")]
        [SerializeField] private bool allowUrlOverride = true;

        /// <summary>URL query 叠加到序列化默认值之后的**最终取用值**（纯数据，便于单测）。</summary>
        public struct TestSwitchSettings
        {
            /// <summary>叠加之后总开关是否打开。</summary>
            public bool Enabled;

            /// <summary>叠加之后要进入的任务类型。</summary>
            public TaskType TaskType;

            /// <summary>叠加之后要进入的 clip。</summary>
            public string ProjectClip;

            /// <summary>本次结果是否被 URL 改写过（只影响日志措辞）。</summary>
            public bool Applied;
        }

        /// <summary>
        /// 把 URL query 叠加到序列化默认值上。**纯函数**：不读 <see cref="Application.absoluteURL"/>、
        /// 不碰任何 Unity 状态、也不打日志（诊断交给调用方），所以它可以被单测逐条钉住。
        ///
        /// 契约（仅当 <paramref name="allowUrlOverride"/> 为 true 时生效；无 query —— 编辑器 Play 模式
        /// 的 `absoluteURL` 就是空串 —— 时原样返回默认值）：
        ///   · `?wsu3_test=on` / `true` / `1` → 打开开关，沿用默认的 taskType / projectClip；
        ///   · `?wsu3_test=off` / `false` / `0` → 显式关掉开关（同样算一次覆盖）；
        ///   · `?wsu3_test=8`                  → 打开开关，并把该数字当作 taskType；
        ///                                       数字**不是已定义的值**（如 99）时只忽略 taskType 这一项并记一条诊断，
        ///                                       开关照开 —— "打开开关"和"进哪个任务"是两件事，不该一起失败；
        ///   · `?wsu3_clip=clip_x`            → 覆盖 projectClip；空值（`wsu3_clip=`）忽略并记诊断
        ///                                       —— 空 clip 只会让装包链路发 9001，那不是覆盖的本意；
        ///   · 无法解析的值（`wsu3_test=banana`）→ 整项忽略并记诊断，**不改**任何取值。
        ///
        /// 容错（都是 URL 里真实会出现的东西）：key 大小写不敏感、值首尾空格忽略、`#` 之后是片段不参与解析、
        /// 连续 `&` 与空段跳过、同名 key 后写覆盖先写。
        ///
        /// 注意 `1` / `0` 是**布尔字面量**（见上），所以 `TaskType.Purpose = 1` 无法用 URL 直选 ——
        /// 要它请在 Inspector 上改 `taskType`。这是有意取的口径：`wsu3_test` 首先是"开/关"。
        /// </summary>
        public static TestSwitchSettings ResolveFromUrl(
            string url,
            bool defaultEnabled,
            TaskType defaultTaskType,
            string defaultClip,
            bool allowUrlOverride,
            List<string> diagnostics = null)
        {
            var result = new TestSwitchSettings
            {
                Enabled = defaultEnabled,
                TaskType = defaultTaskType,
                ProjectClip = defaultClip,
                Applied = false,
            };

            if (!allowUrlOverride || string.IsNullOrEmpty(url)) return result;

            int mark = url.IndexOf('?');
            if (mark < 0) return result;

            string query = url.Substring(mark + 1);
            int fragment = query.IndexOf('#'); // `#` 之后是片段，不属于 query
            if (fragment >= 0) query = query.Substring(0, fragment);
            if (query.Length == 0) return result;

            string[] pairs = query.Split('&');
            for (int i = 0; i < pairs.Length; i++)
            {
                string pair = pairs[i];
                if (string.IsNullOrEmpty(pair)) continue; // 多余的 `&` / 空段

                int equals = pair.IndexOf('=');
                string key = (equals < 0 ? pair : pair.Substring(0, equals)).Trim();
                string value = (equals < 0 ? string.Empty : pair.Substring(equals + 1)).Trim();
                if (key.Length == 0) continue;

                if (string.Equals(key, TestQueryKey, StringComparison.OrdinalIgnoreCase))
                {
                    ApplyTestValue(ref result, value, diagnostics);
                }
                else if (string.Equals(key, ClipQueryKey, StringComparison.OrdinalIgnoreCase))
                {
                    if (value.Length == 0)
                    {
                        AddDiagnostic(diagnostics, $"URL 覆盖 {ClipQueryKey}= 是空值：忽略，沿用 '{result.ProjectClip}'。");
                        continue;
                    }
                    result.ProjectClip = value;
                    result.Applied = true;
                }
            }

            return result;
        }

        private static void ApplyTestValue(ref TestSwitchSettings result, string value, List<string> diagnostics)
        {
            if (value.Length == 0)
            {
                AddDiagnostic(diagnostics, $"URL 覆盖 {TestQueryKey}= 是空值：忽略整项（开关保持 {result.Enabled}）。");
                return;
            }

            if (IsWord(value, "on") || IsWord(value, "true") || IsWord(value, "1"))
            {
                result.Enabled = true;
                result.Applied = true;
                return;
            }

            if (IsWord(value, "off") || IsWord(value, "false") || IsWord(value, "0"))
            {
                result.Enabled = false;
                result.Applied = true;
                return;
            }

            if (int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out int numeric))
            {
                result.Enabled = true; // 显式点名要自测 ⇒ 开关照开
                result.Applied = true;
                if (Enum.IsDefined(typeof(TaskType), numeric))
                {
                    result.TaskType = (TaskType)numeric;
                }
                else
                {
                    AddDiagnostic(diagnostics,
                        $"URL 覆盖 {TestQueryKey}={value} 不是已定义的 TaskType：忽略 taskType 这一项，沿用 {result.TaskType}。");
                }
                return;
            }

            AddDiagnostic(diagnostics,
                $"URL 覆盖 {TestQueryKey}={value} 无法解析（on/off/true/false，或 TaskType 的数字）：忽略整项。");
        }

        private static bool IsWord(string value, string word)
        {
            return string.Equals(value, word, StringComparison.OrdinalIgnoreCase);
        }

        private static void AddDiagnostic(List<string> diagnostics, string message)
        {
            diagnostics?.Add(message);
        }

        private IEnumerator Start()
        {
            // 活过 `0_Setup → 1_Content` 的 single 切换：切完场景本组件还在这儿，才谈得上"自测进入"。
            DontDestroyOnLoad(gameObject);

            // ① 等管理器链自检（做法照 StartupFlow：超时**只告警并继续** —— 自测不该比产品路径更脆）
            bool inited = false;
            float initDeadline = Time.realtimeSinceStartup + InitTimeoutSeconds;
            while (Time.realtimeSinceStartup < initDeadline)
            {
                if (GlobalManager.Exists && GlobalManager.Instance != null && GlobalManager.Instance.IsInit)
                {
                    inited = true;
                    break;
                }
                yield return null;
            }
            if (!inited)
            {
                Debug.LogWarning($"[StartupTestSwitch] 管理器自检超时（{InitTimeoutSeconds:0.#}s），继续测试开关路径。");
            }

            // ② URL query 覆盖（WebGL 免重打包：只改地址栏就能换任务 / 换 clip）
            var diagnostics = new List<string>();
            TestSwitchSettings settings = ResolveFromUrl(
                Application.absoluteURL, testEnabled, taskType, projectClip, allowUrlOverride, diagnostics);
            for (int i = 0; i < diagnostics.Count; i++)
            {
                Debug.LogWarning($"[StartupTestSwitch] {diagnostics[i]}");
            }
            if (settings.Applied)
            {
                Debug.Log($"[StartupTestSwitch] URL 覆盖生效 → enabled={settings.Enabled}, " +
                          $"taskType={settings.TaskType}, projectClip={settings.ProjectClip}");
            }

            // ③ 等活动场景变成 `1_Content`。
            //    WHY 必须等：结构任务的 StructureTaskManager 是**场景里的节点**（挂在 1_Content 上），
            //    场景还没到就发 scene:enter，TaskFlowManager 会走进"内容场景里没有 StructureTaskManager 节点"
            //    那条错误分支 —— 装包白等一场，还留下一条看起来像 bug 的报错。
            string contentScene = DataStructMapping.GetContentSceneName();
            float sceneDeadline = Time.realtimeSinceStartup + SceneWaitTimeoutSeconds;
            while (UnityEngine.SceneManagement.SceneManager.GetActiveScene().name != contentScene)
            {
                if (Time.realtimeSinceStartup >= sceneDeadline)
                {
                    Debug.LogWarning($"[StartupTestSwitch] 等 '{contentScene}' 成为活动场景超时" +
                                     $"（{SceneWaitTimeoutSeconds:0.#}s），本次自测放弃（Web 路径不受影响）。");
                    Destroy(gameObject);
                    yield break;
                }
                yield return null;
            }

            // ④ 开关关着 ⇒ 一个字节都不改：产品路径仍由 Web 的 scene:enter 决定
            if (!settings.Enabled)
            {
                Debug.Log("[StartupTestSwitch] 测试开关关闭：不自启任务，仍等 Web 的 scene:enter（产品路径不变）。");
                Destroy(gameObject);
                yield break;
            }

            // ⑤ 管理器链不在（自检超时后走到这里）时**必须喊出来**：此时事件总线没有订阅者，
            //    发出去只会静默消失 —— "看起来什么都没发生"是最难查的一类失败。
            if (!GlobalManager.Exists || GlobalManager.Instance == null)
            {
                Debug.LogWarning("[StartupTestSwitch] 管理器链不存在，scene:enter 无人接收，放弃本次自测。");
                Destroy(gameObject);
                yield break;
            }

            // ⑥ 不抢 Web 的决定：已经有任务在里面了（Web 先发的 scene:enter），本机自测自动让位
            if (GlobalManager.TaskFlowManager.CurrentTaskType != TaskType.None)
            {
                Debug.Log($"[StartupTestSwitch] Web 已先进入任务 {GlobalManager.TaskFlowManager.CurrentTaskType}：" +
                          "本机自测不重复进入（让位给 Web）。");
                Destroy(gameObject);
                yield break;
            }

            // ⑦ 复述 Web 的 scene:enter —— 同一个事件、同一条链路，验证的才是产品路径本身
            var request = new SceneEnterRequestEvent
            {
                TaskType = settings.TaskType,
                ProjectId = settings.ProjectClip,
                ContentVersion = SelfTestContentVersion,
            };
            Debug.LogWarning($"[StartupTestSwitch] ★ 本机自测进入：taskType={request.TaskType}, " +
                             $"projectId={request.ProjectId}, version={request.ContentVersion} —— " +
                             "这条不是 Web 指令，是 0_Setup 上的测试开关自己发的。" +
                             "（要回到 Web 主导的路径：把本组件的 testEnabled 关掉。）");
            EventBus<SceneEnterRequestEvent>.Publish(request);

            Destroy(gameObject); // 自测的职责到此为止：只补一枪，之后完全交给 TaskFlowManager
        }
    }
}
