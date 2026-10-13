using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using WSU3.Core.DataStruct;

namespace WSU3.Core.Managers.FunctionManager
{
    /// <summary>
    /// 场景进出口（**唯一一处**调用 Unity 的场景 API 的地方）。
    ///
    /// 场景结构（docs/design/09 §2）：`0_Setup` 引导 → **single** 切 `1_Content`（全程常驻）
    /// → 漫游场景在 `1_Content` 之上 **additive** 加载/卸载。任务之间**不换场景**，只装卸资源包。
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

        /// <summary>additive 加载：在常驻内容场景之上再加一个场景（漫游用它）。</summary>
        public AsyncOperation LoadSceneAdditive(string sceneName)
        {
            return UnityEngine.SceneManagement.SceneManager.LoadSceneAsync(
                sceneName, UnityEngine.SceneManagement.LoadSceneMode.Additive);
        }

        /// <summary>卸载一个 additive 场景（卸不掉常驻内容场景 —— 那是外壳）。</summary>
        public AsyncOperation UnloadScene(string sceneName)
        {
            if (string.IsNullOrEmpty(sceneName) || sceneName == contentScene)
            {
                UnityEngine.Debug.LogWarning($"[SceneManager] 拒绝卸载 '{sceneName}'：空名或常驻内容场景。");
                return null;
            }
            return UnityEngine.SceneManagement.SceneManager.UnloadSceneAsync(sceneName);
        }
    }
}
