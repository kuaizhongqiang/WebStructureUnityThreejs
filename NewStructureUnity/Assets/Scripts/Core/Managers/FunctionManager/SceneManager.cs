using System;
using System.Collections;
using UnityEngine;
using WSU3.Core.DataStruct;

namespace WSU3.Core.Managers.FunctionManager
{
    /// <summary>
    /// 场景进出口（**唯一一处**调用 Unity 场景 API 的地方）。
    ///
    /// 场景结构（docs/design/09 §2）：`0_Setup` 引导 → **single** 切 `1_Content`（全程常驻）
    /// → 漫游场景在 `1_Content` 之上 **additive** 加载/卸载。任务之间**不换场景**，只装卸资源包。
    ///
    /// AA 路由（DEC-87 的"AA 管场景"）：某个场景若在 `Resources/Config/SceneAAConfig` 里登记过，
    /// 加载与卸载就走 <see cref="AddressableManager"/> 的 Addressables 链路 —— 本类只负责**分流**，
    /// 句柄留在那边（handle 丢了就永远释放不了该场景的 AA 包），所以两条新入口是协程形式的
    /// <see cref="LoadSceneAdditiveRoutine"/> / <see cref="UnloadSceneRoutine"/>。
    /// </summary>
    public class SceneManager : FunctionManagerBase
    {
        private readonly string contentScene = DataStructMapping.GetContentSceneName();

        /// <summary>常驻内容场景名（`1_Content`）。</summary>
        public string ContentSceneName => contentScene;

        public override void Init(Action isInitComplete = null)
        {
            isInit = true;
            isInitComplete?.Invoke();
        }

        public override void OnDespose()
        {
        }

        /// <summary>single 切换：加载目标场景并卸载其它场景（引导场景用它切到内容场景）。</summary>
        public AsyncOperation LoadSceneSingle(string sceneName)
        {
            return UnityEngine.SceneManagement.SceneManager.LoadSceneAsync(
                sceneName, UnityEngine.SceneManagement.LoadSceneMode.Single);
        }

        /// <summary>additive 加载（**不走 AA 的普通场景**用它；AA 路由的场景用 <see cref="LoadSceneAdditiveRoutine"/>）。</summary>
        public AsyncOperation LoadSceneAdditive(string sceneName)
        {
            return UnityEngine.SceneManagement.SceneManager.LoadSceneAsync(
                sceneName, UnityEngine.SceneManagement.LoadSceneMode.Additive);
        }

        /// <summary>卸载一个 additive 场景（卸载的是普通场景；常驻内容场景永远拒绝）。</summary>
        public AsyncOperation UnloadScene(string sceneName)
        {
            if (string.IsNullOrEmpty(sceneName) || sceneName == contentScene)
            {
                UnityEngine.Debug.LogWarning($"[SceneManager] 拒绝卸载 '{sceneName}'：空名或常驻内容场景。");
                return null;
            }
            return UnityEngine.SceneManagement.SceneManager.UnloadSceneAsync(sceneName);
        }

        /// <summary>按登记表分流后加载一个 additive 场景（登记过 AA 就走 AA，否则走普通加载），等它真正加载完。</summary>
        public IEnumerator LoadSceneAdditiveRoutine(string sceneName)
        {
            if (GlobalManager.AddressableManager.IsSceneAA(sceneName))
            {
                yield return GlobalManager.AddressableManager.LoadSceneAsync(
                    sceneName, UnityEngine.SceneManagement.LoadSceneMode.Additive);
                yield break;
            }

            AsyncOperation op = LoadSceneAdditive(sceneName);
            while (op != null && !op.isDone) yield return null;
        }

        /// <summary>按登记表分流后卸载一个 additive 场景（AA 场景由 AddressableManager 连包一起释放）。</summary>
        public IEnumerator UnloadSceneRoutine(string sceneName)
        {
            if (GlobalManager.AddressableManager.IsSceneAA(sceneName))
            {
                yield return GlobalManager.AddressableManager.UnloadSceneAsync(sceneName);
                yield break;
            }

            AsyncOperation op = UnloadScene(sceneName);
            while (op != null && !op.isDone) yield return null;
        }
    }
}
