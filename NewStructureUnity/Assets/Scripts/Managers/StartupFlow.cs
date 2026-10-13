using System.Collections;
using UnityEngine;
using WSU3.Core.DataStruct;
using WSU3.Core.Managers;
using WSU3.Web;

namespace WSU3.Managers
{
    /// <summary>
    /// `0_Setup` 场景上的**启动编排**（docs/design/09 §1~§3，DEC-84）。
    ///
    /// 做的事只有三件：
    ///   ① 等管理器链自检通过（超时**只告警并继续**，不把启动卡死）；
    ///   ② 发握手 `unity:ready`（幂等；此刻才是真正的"就绪"）；
    ///   ③ **single** 切到常驻内容场景 `1_Content`，然后停在那里**待命** —— 不装配任何任务。
    ///
    /// 「待命」的含义：Unity 已经能收消息了，但三维世界里什么都还没装；装什么由 Web 用
    /// `preload:task` / `scene:enter` 决定（DEC-08：装配指令只能来自 Web）。
    ///
    /// 摆放：把本组件挂在 `0_Setup` 场景里的任意物体上；它会把自己 `DontDestroyOnLoad`，
    /// 好在切场景的过程中把进度报完，完成后自毁。
    /// </summary>
    [DisallowMultipleComponent]
    public class StartupFlow : MonoBehaviour
    {
        [Tooltip("等管理器自检的总预算（秒）。超时只告警并继续，不阻塞启动。")]
        [SerializeField] private float initTimeoutSeconds = 15f;

        [Tooltip("自检超时时，是否向 Web 报 2001（进入超时）。")]
        [SerializeField] private bool reportTimeoutToWeb = true;

        private IEnumerator Start()
        {
            DontDestroyOnLoad(gameObject);

            bool inited = false;
            float deadline = Time.realtimeSinceStartup + Mathf.Max(1f, initTimeoutSeconds);
            while (Time.realtimeSinceStartup < deadline)
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
                string message = $"管理器自检超时（{initTimeoutSeconds:0.#}s），继续启动路径。";
                Debug.LogWarning($"[StartupFlow] {message}");
                if (reportTimeoutToWeb) WebBridge.ReportError(2001, message);
            }
            else
            {
                Debug.Log("[StartupFlow] 管理器自检通过。");
            }

            // ① 握手（幂等：WebBridgeBehaviour 若已发过就不会重复）
            WebChannel.Ready();

            // ② 常驻编排对象（不依赖场景里手工挂载；后续若想放进 Manager.prefab 也可以，Ensure 会复用）
            TaskFlowController.Ensure();
            WSU3.Interaction.InteractionPickManager.Ensure();

            // ③ single 切到常驻内容场景
            string sceneName = DataStructMapping.GetContentSceneName();
            Debug.Log($"[StartupFlow] 切换到常驻内容场景 '{sceneName}' …");
            AsyncOperation op = GlobalManager.SceneManager.LoadSceneSingle(sceneName);
            while (op != null && !op.isDone)
            {
                // 引擎加载已完成 ⇒ 这里报的是"装配外壳"的进度，Web 侧会把它映射到进度条后半段
                WebBridge.SceneProgress(Mathf.Clamp01(op.progress));
                yield return null;
            }
            WebBridge.SceneProgress(1f);

            Debug.Log($"[StartupFlow] 已停在 '{sceneName}' 待命，等待 Web 指令（preload:task / scene:enter）。");
            Destroy(gameObject); // 引导阶段的职责到此为止
        }
    }
}
