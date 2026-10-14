using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AddressableAssets;
using UnityEngine.Networking;
using UnityEngine.ResourceManagement.AsyncOperations;
using UnityEngine.ResourceManagement.ResourceProviders;
using UnityEngine.SceneManagement;
using WSU3.Core.Models.Addressable;

namespace WSU3.Core.Managers.FunctionManager
{
    /// <summary>
    /// 资源包管理器：**包登记表 + 三条加载链路 + 实例登记与卸载纪律**。
    ///
    /// 依据 docs/design/12（资源包与 AB 打包流水线）、docs/design/03 §7、DEC-87（三条链路都做）。
    ///
    /// 三条链路（由 <see cref="PackageType"/> 分流，**调用方只给包 id / clip，不关心走哪条**）：
    ///   · <c>Default</c> 内置  —— <c>Resources.Load</c>，全局单例资源（管理器、相机、配置表）；
    ///   · <c>AB</c>      AssetBundle —— <c>UnityWebRequestAssetBundle</c>，从 StreamingAssets 取，内容包走这条；
    ///   · <c>AA</c>      Addressables —— <c>Addressables.LoadAssetAsync / LoadSceneAsync</c>，漫游场景走这条。
    ///
    /// 四条必须遵守的纪律（DEC-87，踩过的坑）：
    ///   ① **一个项目一个内容包**：切任务 = 卸旧 clip 的包 + 装新 clip 的包；
    ///   ② **实例要登记"实例 → 包"**：卸载包前先销毁该包实例（否则材质变粉），卸载前先失效资源缓存（否则下次取到已销毁对象）；
    ///   ③ **WebGL 下 StreamingAssets 就是 HTTP 路径**：不能加 <c>file://</c>，只能经 UnityWebRequest 读；
    ///   ④ **bundle 文件名一律小写、目录段保持原样** —— 大小写写错在 WebGL / Linux 上直接 404。
    ///
    /// 为什么不是 MonoBehaviour：与 <see cref="TaskFlowManager"/> / 步骤系统同一套写法 ——
    /// 由 <see cref="GlobalManager"/> 持有并驱动（<c>Init</c> 建表 + <c>CoreUpdate</c> 推进自驱泵），
    /// 好处是 EditMode 测试里可以一帧帧手动推进，不必等真实帧循环。
    /// </summary>
    public class AddressableManager : FunctionManagerBase
    {
        private const string LogTag = "[AddrMgr]";

        /// <summary>登记表在 Resources 下的路径（**这是契约**：编辑器工具写盘、运行期读盘都用它）。</summary>
        public const string PackageDbResourcePath = "Config/PackageDB_Master";

        /// <summary>场景 AA 路由表在 Resources 下的路径（同上）。</summary>
        public const string SceneConfigResourcePath = "Config/SceneAAConfig";

        // ── 登记表构建出的索引 ─────────────────────────────────────────────
        private readonly Dictionary<string, PackageConfigSO> m_ConfigMap = new Dictionary<string, PackageConfigSO>();
        private readonly Dictionary<string, SceneAAEntry> m_SceneMap = new Dictionary<string, SceneAAEntry>();
        private readonly Dictionary<string, string> m_SceneNameToAddress = new Dictionary<string, string>(StringComparer.Ordinal);

        // ── 运行期缓存 ────────────────────────────────────────────────────
        private readonly Dictionary<string, AssetBundle> m_BundleCache = new Dictionary<string, AssetBundle>();
        private readonly Dictionary<string, UnityEngine.Object> m_AssetCache = new Dictionary<string, UnityEngine.Object>();

        // WHY: AA 的取件必须留住 handle 才能释放 —— 只把 Result 塞进缓存、丢掉 handle 的话，
        //      卸载包时那份资源永远释放不掉（引用计数不归零），表现是"切了几轮任务后显存一路涨"。
        private readonly Dictionary<string, AsyncOperationHandle> m_AAAssetHandles = new Dictionary<string, AsyncOperationHandle>();

        /// <summary>经本管理器实例化的存活对象 → 包配置 id（卸载资源包时据此一并销毁实例，纪律②）。</summary>
        private readonly Dictionary<GameObject, string> m_InstanceMap = new Dictionary<GameObject, string>();

        // WHY: 场景 handle 必须留到卸载时用 —— 丢了就永远释放不了该场景的 AA 包（DEC-87 纪律②的场景版）。
        private readonly Dictionary<string, AsyncOperationHandle<SceneInstance>> m_SceneHandles =
            new Dictionary<string, AsyncOperationHandle<SceneInstance>>(StringComparer.Ordinal);

        /// <summary>自驱小泵：支持 <c>yield return 另一个 IEnumerator</c> 的嵌套写法（不依赖 MonoBehaviour）。</summary>
        private readonly Stack<IEnumerator> routines = new Stack<IEnumerator>();

        // ── 对外状态（诊断 / 测试 / 桥都用这些，不另设第二份）──────────────

        /// <summary>登记表里的包配置条数。</summary>
        public int ConfigCount => m_ConfigMap.Count;

        /// <summary>场景 AA 路由条数。</summary>
        public int SceneRouteCount => m_SceneMap.Count;

        /// <summary>已装载的 AssetBundle 数。</summary>
        public int LoadedBundleCount => m_BundleCache.Count;

        /// <summary>已登记的存活实例数（顺带清理被外部销毁的空槽）。</summary>
        public int InstanceCount
        {
            get { PruneInstances(); return m_InstanceMap.Count; }
        }

        /// <summary>是否有一次性进入/退出正在装包（诊断用）。</summary>
        public bool Busy { get; private set; }

        // ── 生命周期（由 GlobalManager 驱动）──────────────────────────────

        public override void Init(Action isInitComplete = null)
        {
            BuildConfigMap();
            BuildSceneMap();

            Debug.Log($"{LogTag} 登记表就绪：包 {m_ConfigMap.Count} 条 / 场景 AA 路由 {m_SceneMap.Count} 条" +
                      $"（登记表 = Resources/{PackageDbResourcePath}）");

            // WHY: 建表失败也必须置 isInit —— 漏置会让 Setup 的启动链一直白等（与参考实现同一个坑）。
            isInit = true;
            isInitComplete?.Invoke();
        }

        public override void OnDespose()
        {
            routines.Clear();
            DestroyAllInstances();
            UnloadAllBundles(true);
            m_SceneHandles.Clear();
        }

        /// <summary>由 <see cref="GlobalManager"/> 的 Update 驱动：推进内部协程。</summary>
        public void CoreUpdate()
        {
            while (routines.Count > 0)
            {
                IEnumerator top = routines.Peek();

                bool moved;
                try
                {
                    moved = top.MoveNext();
                }
                catch (Exception e)
                {
                    // WHY: 一条加载协程抛异常不该拖停整个管理器（后续步骤全在那儿等着）
                    Debug.LogError($"{LogTag} 加载协程抛异常，已中断这条协程：{e}");
                    routines.Pop();
                    continue;
                }

                if (!moved)
                {
                    routines.Pop();
                    continue;
                }

                if (top.Current is IEnumerator nested)
                {
                    routines.Push(nested); // 同一帧进入嵌套协程
                    continue;
                }

                return; // `yield return null` / `yield return 一个 AsyncOperation`：本帧到此为止
            }
        }

        // ── 登记表查询 ────────────────────────────────────────────────────

        /// <summary>按包配置 id 取配置（未收录返回 null）。</summary>
        public PackageConfigSO GetConfig(string id)
        {
            if (string.IsNullOrEmpty(id)) return null;
            m_ConfigMap.TryGetValue(id, out PackageConfigSO config);
            return config;
        }

        /// <summary>按包配置 id 取配置并转型。</summary>
        public T GetConfig<T>(string id) where T : PackageConfigSO
        {
            return GetConfig(id) as T;
        }

        /// <summary>按包配置 id 取配置（不存在返回 false）。</summary>
        public bool TryGetConfig(string id, out PackageConfigSO config)
        {
            config = null;
            if (string.IsNullOrEmpty(id)) return false;
            return m_ConfigMap.TryGetValue(id, out config);
        }

        /// <summary>登记表里是否有这个包配置 id（装配前的前置判断，避免"以为有、其实没有"）。</summary>
        public bool HasConfig(string id)
        {
            return !string.IsNullOrEmpty(id) && m_ConfigMap.ContainsKey(id);
        }

        /// <summary>取 clipId 相同的全部 AB 配置（一个 clip 一次装卸，纪律①）。</summary>
        public List<ABPackageConfigSO> GetConfigsByClip(string clipId)
        {
            var list = new List<ABPackageConfigSO>();
            if (string.IsNullOrEmpty(clipId)) return list;

            foreach (KeyValuePair<string, PackageConfigSO> kvp in m_ConfigMap)
            {
                var ab = kvp.Value as ABPackageConfigSO;
                if (ab != null && ab.clipId == clipId) list.Add(ab);
            }
            return list;
        }

        // WHY: 全局包没有 clipId，GetConfigsByClip 收集不到它；按 bundleName 收集是全局包唯一的聚合口径
        //      （卸载侧的 UnloadByBundleName 与它同口径）。
        /// <summary>取某个 bundle 名下的全部 AB 配置（全局包预加载用）。</summary>
        public List<ABPackageConfigSO> GetConfigsByBundleName(string bundleName)
        {
            var list = new List<ABPackageConfigSO>();
            if (string.IsNullOrEmpty(bundleName)) return list;

            foreach (KeyValuePair<string, PackageConfigSO> kvp in m_ConfigMap)
            {
                var ab = kvp.Value as ABPackageConfigSO;
                if (ab != null && ab.bundleName == bundleName) list.Add(ab);
            }
            return list;
        }

        /// <summary>登记表里出现过的全部 clipId（诊断用）。</summary>
        public List<string> GetClipIds()
        {
            var set = new HashSet<string>();
            foreach (KeyValuePair<string, PackageConfigSO> kvp in m_ConfigMap)
            {
                var ab = kvp.Value as ABPackageConfigSO;
                if (ab != null && !string.IsNullOrEmpty(ab.clipId)) set.Add(ab.clipId);
            }
            return new List<string>(set);
        }

        /// <summary>登记表里是否登记了这个 clip 的内容包（Web 传来的 projectId 能不能装）。</summary>
        public bool HasClip(string clipId)
        {
            return string.IsNullOrEmpty(clipId) ? false : GetConfigsByClip(clipId).Count > 0;
        }

        /// <summary>同步读缓存（不触发加载）；未加载 / 类型不符 / 已销毁都返回 false。</summary>
        public bool TryGetCached<T>(string packageId, out T asset) where T : UnityEngine.Object
        {
            asset = null;
            if (string.IsNullOrEmpty(packageId)) return false;
            if (!m_AssetCache.TryGetValue(packageId, out UnityEngine.Object cached)) return false;

            asset = cached as T;
            return asset != null;
        }

        // ── 场景 AA 路由（由 SceneManager 分流调用）─────────────────────────

        /// <summary>该场景是否配置为走 Addressables（O(1) 反向索引）。</summary>
        public bool IsSceneAA(string sceneName)
        {
            return !string.IsNullOrEmpty(sceneName) && m_SceneNameToAddress.ContainsKey(sceneName);
        }

        /// <summary>取场景的 AA address（未配置返回 null）。</summary>
        public string GetSceneAddress(string sceneName)
        {
            if (string.IsNullOrEmpty(sceneName)) return null;
            return m_SceneNameToAddress.TryGetValue(sceneName, out string address) ? address : null;
        }

        /// <summary>经 AA 加载一个场景，并留住 handle 供卸载时释放。</summary>
        public IEnumerator LoadSceneAsync(string sceneName, LoadSceneMode mode)
        {
            string address = GetSceneAddress(sceneName);
            if (string.IsNullOrEmpty(address))
            {
                Debug.LogError($"{LogTag} 场景 {sceneName} 没有 AA 路由，已忽略加载（请先在 SceneAAConfig 里登记）");
                yield break;
            }

            AsyncOperationHandle<SceneInstance> handle = Addressables.LoadSceneAsync(address, mode);
            yield return handle;

            if (handle.Status == AsyncOperationStatus.Succeeded)
            {
                m_SceneHandles[sceneName] = handle;
                Debug.Log($"{LogTag} AA 场景已加载：{sceneName} → {address}");
            }
            else
            {
                Debug.LogError($"{LogTag} AA 场景加载失败：{sceneName} → {address}，{handle.OperationException}");
            }
        }

        /// <summary>卸载一个 AA 场景并释放它的包（没走 AA 的场景交给调用方走普通卸载）。</summary>
        public IEnumerator UnloadSceneAsync(string sceneName)
        {
            if (m_SceneHandles.TryGetValue(sceneName, out AsyncOperationHandle<SceneInstance> handle))
            {
                yield return Addressables.UnloadSceneAsync(handle, true);
                m_SceneHandles.Remove(sceneName);
                Debug.Log($"{LogTag} AA 场景已卸载并释放：{sceneName}");
                yield break;
            }

            yield return UnityEngine.SceneManagement.SceneManager.UnloadSceneAsync(sceneName);
        }

        // ── 装载 / 卸载（包粒度 = 内容包按 clip 聚合）───────────────────────

        // WHY: 内容包一次装一整个 clip —— 调用方（任务流）只给 clipId，不关心该 clip 下面有几个包配置、各自走哪条链路。
        /// <summary>装载一个 clip 的全部资源包；<paramref name="onDone"/>(是否成功, 失败原因)。</summary>
        public IEnumerator LoadClipRoutine(string clipId, Action<bool, string> onDone)
        {
            List<ABPackageConfigSO> configs = GetConfigsByClip(clipId);
            if (configs.Count == 0)
            {
                onDone?.Invoke(false, $"登记表里没有 clip '{clipId}' 的任何包（见 docs/design/12；先跑菜单 WSU3/Pack 打一次 AB 包）");
                yield break;
            }

            Busy = true;
            for (int i = 0; i < configs.Count; i++)
            {
                ABPackageConfigSO config = configs[i];
                bool ok = false;
                yield return LoadAssetRoutine<UnityEngine.Object>(config, asset => ok = asset != null);

                // WHY: 一条失败就中止并**如实回报** —— 半装的包比不装更危险（界面以为就绪、点下去变粉）
                if (!ok)
                {
                    Busy = false;
                    onDone?.Invoke(false, $"clip '{clipId}' 的第 {i + 1}/{configs.Count} 个包装载失败：{config.id}");
                    yield break;
                }
            }

            Busy = false;
            Debug.Log($"{LogTag} 内容包已装载：{clipId}（{configs.Count} 个包）");
            onDone?.Invoke(true, null);
        }

        // WHY: 缓存必须先清再卸 —— 残留条目会让下一次取用拿到已销毁对象（表现是图片空白 / 材质变粉）。
        /// <summary>卸载一个 clip：先销毁该包实例 → 失效资源缓存 → 卸 bundle；返回失效的缓存条数。</summary>
        public int UnloadClip(string clipId)
        {
            List<ABPackageConfigSO> configs = GetConfigsByClip(clipId);
            if (configs.Count == 0) return 0;

            var bundles = new HashSet<string>();
            int invalidated = 0;

            foreach (ABPackageConfigSO config in configs)
            {
                if (InvalidateCache(config.id)) invalidated++;
                if (!string.IsNullOrEmpty(config.bundleName)) bundles.Add(config.bundleName);
            }

            foreach (string bundle in bundles) UnloadBundle(bundle, true);

            Debug.Log($"{LogTag} 已卸载内容包 {clipId}：失效缓存 {invalidated} 条 / bundle {bundles.Count} 个");
            return invalidated;
        }

        // WHY: 空名直接返回 0 —— 否则空串会误命中"所有 bundleName 为空的配置"，把别的包一起卸掉。
        /// <summary>按 bundle 名卸载（全局包专用，clipId 为空走不了 <see cref="UnloadClip"/>）。</summary>
        public int UnloadByBundleName(string bundleName)
        {
            if (string.IsNullOrEmpty(bundleName)) return 0;

            int invalidated = 0;
            foreach (KeyValuePair<string, PackageConfigSO> kvp in m_ConfigMap)
            {
                var ab = kvp.Value as ABPackageConfigSO;
                if (ab != null && ab.bundleName == bundleName)
                {
                    if (InvalidateCache(ab.id)) invalidated++;
                }
            }

            UnloadBundle(bundleName, true);

            Debug.Log($"{LogTag} 已卸载全局包 {bundleName}：失效缓存 {invalidated} 条");
            return invalidated;
        }

        /// <summary>卸载单个 AssetBundle；<paramref name="unloadAllLoadedObjects"/> 为真时先销毁该包的存活实例（防变粉）。</summary>
        public void UnloadBundle(string bundleName, bool unloadAllLoadedObjects = false)
        {
            if (string.IsNullOrEmpty(bundleName)) return;

            if (unloadAllLoadedObjects)
            {
                foreach (KeyValuePair<string, PackageConfigSO> kvp in m_ConfigMap)
                {
                    var ab = kvp.Value as ABPackageConfigSO;
                    if (ab != null && ab.bundleName == bundleName) DestroyInstances(ab.id);
                }
            }

            if (m_BundleCache.TryGetValue(bundleName, out AssetBundle bundle))
            {
                if (bundle != null) bundle.Unload(unloadAllLoadedObjects);
                m_BundleCache.Remove(bundleName);
            }
        }

        /// <summary>卸载全部 bundle（连带清缓存与实例）。</summary>
        public void UnloadAllBundles(bool unloadAllLoadedObjects = false)
        {
            if (unloadAllLoadedObjects) DestroyAllInstances();

            foreach (KeyValuePair<string, AssetBundle> kvp in m_BundleCache)
            {
                if (kvp.Value != null) kvp.Value.Unload(unloadAllLoadedObjects);
            }
            m_BundleCache.Clear();

            foreach (KeyValuePair<string, AsyncOperationHandle> kvp in m_AAAssetHandles)
            {
                if (kvp.Value.IsValid()) Addressables.Release(kvp.Value);
            }
            m_AAAssetHandles.Clear();

            m_AssetCache.Clear();
        }

        /// <summary>清空资源缓存（不卸 bundle）。</summary>
        public void ClearAssetCache()
        {
            m_AssetCache.Clear();
        }

        // ── 统一取件入口（三条链路）────────────────────────────────────────

        // WHY: 同步取件只服务"已装好的 AB 缓存"与"内置 Resources" —— AA 的取件天生异步，
        //      在这里同步返回只会给出"看起来成功、其实是 null"的结果，故明确报错让调用方改走异步入口。
        /// <summary>同步取件：命中缓存 / 内置资源直接返回，否则返回 null 并说明该走异步入口。</summary>
        public T LoadAsset<T>(string packageId) where T : UnityEngine.Object
        {
            if (TryGetCached(packageId, out T cached)) return cached;

            PackageConfigSO config = GetConfig(packageId);
            if (config == null)
            {
                Debug.LogError($"{LogTag} 未找到包配置：{packageId}");
                return null;
            }

            if (config.PackageType == PackageType.Default)
            {
                return LoadFromDefault<T>(packageId, config.GetLoadKey());
            }

            if (config.PackageType == PackageType.AB && config is ABPackageConfigSO ab &&
                m_BundleCache.TryGetValue(ab.bundleName, out AssetBundle bundle) && bundle != null)
            {
                // 包已下载：Bundle 内的取件本身是同步的，这里可以安全地直接给
                T asset = bundle.LoadAsset<T>(ab.assetPath);
                if (asset != null) m_AssetCache[packageId] = asset;
                return asset;
            }

            Debug.LogError($"{LogTag} 包 {packageId} 尚未装载（或走 AA 链路），同步取件不可用；请改用 LoadAssetAsync / LoadClipRoutine");
            return null;
        }

        /// <summary>异步取件（三条链路统一入口），完成回调为 null 表示失败。</summary>
        public void LoadAssetAsync<T>(string packageId, Action<T> onLoaded) where T : UnityEngine.Object
        {
            if (!m_ConfigMap.TryGetValue(packageId ?? string.Empty, out PackageConfigSO config))
            {
                Debug.LogError($"{LogTag} 未找到包配置：{packageId}（检查 PackageDB_Master 是否收录该配置）");
                onLoaded?.Invoke(null);
                return;
            }
            routines.Push(LoadAssetRoutine(config, onLoaded));
        }

        /// <summary>按包配置保序批量加载；单项失败只记日志跳过，不中断其余项。</summary>
        public void LoadAssetsAsync<T>(IList<string> packageIds, Action<List<T>> onLoaded) where T : UnityEngine.Object
        {
            if (packageIds == null || packageIds.Count == 0)
            {
                onLoaded?.Invoke(new List<T>());
                return;
            }
            routines.Push(LoadAssetsRoutine(packageIds, onLoaded));
        }

        /// <summary>单个资源加载（可被上层协程 <c>yield return</c> 以嵌套复用）：命中缓存直接回调，未命中按 <see cref="PackageType"/> 走对应链路。</summary>
        public IEnumerator LoadAssetRoutine<T>(PackageConfigSO config, Action<T> onLoaded) where T : UnityEngine.Object
        {
            if (config == null)
            {
                onLoaded?.Invoke(null);
                yield break;
            }

            // WHY: 命中缓存时不判"已销毁"就会把 destroyed 对象发出去（图空白、材质变粉），故这里用 Unity 的 == 语义再确认一次
            if (m_AssetCache.TryGetValue(config.id, out UnityEngine.Object cached) && cached != null)
            {
                onLoaded?.Invoke(cached as T);
                yield break;
            }

            switch (config.PackageType)
            {
                case PackageType.AA:
                    yield return LoadFromAA<T>(config.id, config.GetLoadKey(), onLoaded);
                    break;

                case PackageType.AB:
                    yield return LoadFromAB<T>(config.id, (ABPackageConfigSO)config, onLoaded);
                    break;

                default:
                    onLoaded?.Invoke(LoadFromDefault<T>(config.id, config.GetLoadKey()));
                    break;
            }
        }

        private IEnumerator LoadAssetsRoutine<T>(IList<string> packageIds, Action<List<T>> onLoaded) where T : UnityEngine.Object
        {
            var loaded = new List<T>(packageIds.Count);
            for (int i = 0; i < packageIds.Count; i++)
            {
                string id = packageIds[i];
                if (string.IsNullOrEmpty(id)) continue;

                if (!m_ConfigMap.TryGetValue(id, out PackageConfigSO config))
                {
                    Debug.LogError($"{LogTag} 未找到包配置：{id}（检查 PackageDB_Master 是否收录该配置）");
                    continue;
                }

                yield return LoadAssetRoutine<T>(config, asset =>
                {
                    if (asset != null) loaded.Add(asset);
                });
            }
            onLoaded?.Invoke(loaded);
        }

        // ── 实例化（预制体 → GameObject，与资源加载同一条包管线）────────────

        // WHY: 只用 Object.Instantiate，不用 Addressables.InstantiateAsync ——
        //      生命周期归包管（纪律②）、对象池要能自由 Destroy 复用、三条链路口径一致。
        /// <summary>由已加载的预制体实例化并登记包归属。</summary>
        public GameObject InstantiatePrefab(GameObject prefab, string packageId, Transform parent = null)
        {
            if (prefab == null)
            {
                Debug.LogError($"{LogTag} 实例化失败：预制体为空（包 {packageId}）");
                return null;
            }

            GameObject instance = UnityEngine.Object.Instantiate(prefab, parent);
            if (instance == null) return null;

            instance.name = prefab.name;   // 去掉 Instantiate 追加的 "(Clone)"
            m_InstanceMap[instance] = packageId;
            return instance;
        }

        /// <summary>按包配置 id 异步加载预制体并实例化（AA / AB / Default 三链路）；失败回调 null。</summary>
        public void InstantiateAsync(string packageId, Transform parent, Action<GameObject> onComplete)
        {
            if (!m_ConfigMap.TryGetValue(packageId ?? string.Empty, out PackageConfigSO config))
            {
                Debug.LogError($"{LogTag} 实例化失败：未找到包配置 {packageId}");
                onComplete?.Invoke(null);
                return;
            }
            routines.Push(InstantiateRoutine(config, parent, onComplete));
        }

        private IEnumerator InstantiateRoutine(PackageConfigSO config, Transform parent, Action<GameObject> onComplete)
        {
            GameObject prefab = null;
            yield return LoadAssetRoutine<GameObject>(config, loaded => prefab = loaded);
            onComplete?.Invoke(prefab != null ? InstantiatePrefab(prefab, config.id, parent) : null);
        }

        /// <summary>销毁经本管理器实例化的对象并注销登记（池化实例请走池的归还接口）。</summary>
        public bool ReleaseInstance(GameObject instance, bool destroy = true)
        {
            if (instance == null) return false;

            m_InstanceMap.Remove(instance);
            if (destroy) UnityEngine.Object.Destroy(instance);
            return true;
        }

        /// <summary>销毁某包的全部存活实例，返回销毁数量（**卸载包之前**调用，避免实例引用已释放的资源）。</summary>
        public int DestroyInstances(string packageId)
        {
            if (string.IsNullOrEmpty(packageId) || m_InstanceMap.Count == 0) return 0;

            var targets = new List<GameObject>();
            foreach (KeyValuePair<GameObject, string> kvp in m_InstanceMap)
            {
                if (kvp.Key != null && kvp.Value == packageId) targets.Add(kvp.Key);
            }

            for (int i = 0; i < targets.Count; i++)
            {
                m_InstanceMap.Remove(targets[i]);
                UnityEngine.Object.Destroy(targets[i]);
            }
            return targets.Count;
        }

        /// <summary>销毁全部登记的存活实例，返回销毁数量。</summary>
        public int DestroyAllInstances()
        {
            if (m_InstanceMap.Count == 0) return 0;

            int count = 0;
            foreach (KeyValuePair<GameObject, string> kvp in m_InstanceMap)
            {
                if (kvp.Key == null) continue;
                UnityEngine.Object.Destroy(kvp.Key);
                count++;
            }
            m_InstanceMap.Clear();
            return count;
        }

        // ── 三条链路的实现 ────────────────────────────────────────────────

        private IEnumerator LoadFromAA<T>(string cacheKey, string address, Action<T> onLoaded) where T : UnityEngine.Object
        {
            if (string.IsNullOrEmpty(address))
            {
                Debug.LogError($"{LogTag} AA 配置缺少 address：{cacheKey}");
                onLoaded?.Invoke(null);
                yield break;
            }

            AsyncOperationHandle<T> handle = Addressables.LoadAssetAsync<T>(address);
            yield return handle;

            if (handle.Status == AsyncOperationStatus.Succeeded && handle.Result != null)
            {
                m_AssetCache[cacheKey] = handle.Result;
                m_AAAssetHandles[cacheKey] = handle;   // 留住 handle 才能释放
                onLoaded?.Invoke(handle.Result);
                yield break;
            }

            Debug.LogError($"{LogTag} AA 加载失败：{address}（{handle.OperationException}）");
            onLoaded?.Invoke(null);
        }

        private IEnumerator LoadFromAB<T>(string cacheKey, ABPackageConfigSO config, Action<T> onLoaded) where T : UnityEngine.Object
        {
            if (string.IsNullOrEmpty(config.bundleName))
            {
                Debug.LogError($"{LogTag} AB 配置缺少 bundleName：{config.id}");
                onLoaded?.Invoke(null);
                yield break;
            }

            if (!m_BundleCache.TryGetValue(config.bundleName, out AssetBundle bundle) || bundle == null)
            {
                string url = GetBundleUrl(config.bundleName);

#if UNITY_WEBGL && !UNITY_EDITOR
                // WHY（WebGL 专用分支）：**不用** `UnityWebRequestAssetBundle.GetAssetBundle`。
                //   它在 WebGL 上走"IndexedDB 缓存 + DownloadHandlerAssetBundle"这条路，缓存键就是 URL ——
                //   同一个地址换过几次包之后会命中旧条目而加载失败，而且 `request.error` 可能是**空串**。
                //   2026-10-14 的现场就是一句 `AB 下载失败：Content/clip_contactor ← http://…（）`，连原因都没有；
                //   而同一时刻的探针是：HTTP 200 / Range 206 / Content-Length 与工程里的包逐字节一致，
                //   把那些字节下回来在编辑器里也能解成 UnityFS（资产名与预制体逐级可读）。
                //   ⇒ 坏的是这条缓存路，不是包、也不是服务器。改成"普通 GET + LoadFromMemoryAsync"：
                //   不碰任何缓存，字节到手直接解包（这条在编辑器里对同一份字节实测是通的）。
                using (UnityWebRequest request = UnityWebRequest.Get(url))
                {
                    yield return request.SendWebRequest();

                    if (request.result != UnityWebRequest.Result.Success)
                    {
                        Debug.LogError($"{LogTag} AB 下载失败：{config.bundleName} ← {url}" +
                                       $"（result={request.result}, http={request.responseCode}, err={request.error}）");
                        onLoaded?.Invoke(null);
                        yield break;
                    }

                    AssetBundleCreateRequest create = AssetBundle.LoadFromMemoryAsync(request.downloadHandler.data);
                    yield return create;
                    bundle = create.assetBundle;
                }
#else
                using (UnityWebRequest request = UnityWebRequestAssetBundle.GetAssetBundle(url))
                {
                    yield return request.SendWebRequest();

                    if (request.result != UnityWebRequest.Result.Success)
                    {
                        // WHY: 把 result / http 码也打出来 —— 只打 `request.error` 时，某些失败会给**空串**，
                        //      日志就退化成一句没有原因的 `（ ）`，排查时只能靠猜（2026-10-14 踩过）。
                        Debug.LogError($"{LogTag} AB 下载失败：{config.bundleName} ← {url}" +
                                       $"（result={request.result}, http={request.responseCode}, err={request.error}）");
                        onLoaded?.Invoke(null);
                        yield break;
                    }

                    bundle = DownloadHandlerAssetBundle.GetContent(request);
                }
#endif

                if (bundle == null)
                {
                    // WHY: 下载"成功"但解不出 Bundle，最常见的原因是包里没有资源被分配 / 打包目标平台与当前运行平台不一致
                    Debug.LogError($"{LogTag} AB 解包失败：{config.bundleName}（{url}）—— 检查该包是否真的打过、" +
                                   "以及打包时的目标平台与当前运行平台是否一致");
                    onLoaded?.Invoke(null);
                    yield break;
                }

                m_BundleCache[config.bundleName] = bundle;
            }

            AssetBundleRequest request2 = bundle.LoadAssetAsync<T>(config.assetPath);
            yield return request2;

            T asset = request2.asset as T;
            if (asset != null) m_AssetCache[cacheKey] = asset;

            onLoaded?.Invoke(asset);
        }

        private T LoadFromDefault<T>(string cacheKey, string loadKey) where T : UnityEngine.Object
        {
            T asset = Resources.Load<T>(loadKey);
            if (asset != null) m_AssetCache[cacheKey] = asset;
            return asset;
        }

        // ── 私有工具 ──────────────────────────────────────────────────────

        // WHY: 清单未挂时兜底读 Resources/Config/PackageDB_Master —— 新增包配置不必再去改预制体上的引用
        //      （本类不是 MonoBehaviour，没有序列化字段可挂，登记表唯一来源就是 Resources）。
        private void BuildConfigMap()
        {
            m_ConfigMap.Clear();

            var db = Resources.Load<PackageDatabaseSO>(PackageDbResourcePath);
            if (db == null)
            {
                Debug.LogError($"{LogTag} 读不到包登记表 Resources/{PackageDbResourcePath}.asset —— " +
                               "所有资源包都会装载失败。先跑菜单 WSU3/Pack/一键打 AB 包（全部）生成它。");
                return;
            }

            foreach (PackageConfigSO config in db.packages)
            {
                if (config == null || string.IsNullOrEmpty(config.id)) continue;
                m_ConfigMap[config.id] = config;
            }
        }

        private void BuildSceneMap()
        {
            m_SceneMap.Clear();
            m_SceneNameToAddress.Clear();

            var sceneConfig = Resources.Load<SceneAddressableConfig>(SceneConfigResourcePath);
            if (sceneConfig == null) return;   // 漫游还没做时这是正常状态，不报错

            foreach (SceneAAEntry entry in sceneConfig.scenes)
            {
                if (entry == null || string.IsNullOrEmpty(entry.address)) continue;

                m_SceneMap[entry.address] = entry;
                if (!string.IsNullOrEmpty(entry.sceneName))
                    m_SceneNameToAddress[entry.sceneName] = entry.address;
            }
        }

        /// <summary>失效一个包配置的缓存：AA 的还要释放 handle，否则资源永远释放不掉。</summary>
        private bool InvalidateCache(string packageId)
        {
            if (m_AAAssetHandles.TryGetValue(packageId, out AsyncOperationHandle handle))
            {
                if (handle.IsValid()) Addressables.Release(handle);
                m_AAAssetHandles.Remove(packageId);
            }
            return m_AssetCache.Remove(packageId);
        }

        /// <summary>清理实例登记表里被外部销毁的空槽（Unity 的 <c>== null</c> 判空对已销毁对象成立）。</summary>
        private void PruneInstances()
        {
            if (m_InstanceMap.Count == 0) return;

            List<GameObject> dead = null;
            foreach (KeyValuePair<GameObject, string> kvp in m_InstanceMap)
            {
                if (kvp.Key == null)
                {
                    if (dead == null) dead = new List<GameObject>();
                    dead.Add(kvp.Key);
                }
            }
            if (dead == null) return;

            for (int i = 0; i < dead.Count; i++) m_InstanceMap.Remove(dead[i]);
        }

        /// <summary>bundle 的取件 URL（纪律③④的落点）。</summary>
        public static string GetBundleUrl(string bundleName)
        {
            if (string.IsNullOrEmpty(bundleName)) return null;

            // WHY: Unity 打包只小写 bundle 文件名、目录保持原样；不跟着小写会在 Linux / Android / WebGL 上找不到文件（纪律④）
            string normalized = bundleName;
            int lastSlash = normalized.LastIndexOf('/');
            normalized = lastSlash >= 0
                ? normalized.Substring(0, lastSlash + 1) + normalized.Substring(lastSlash + 1).ToLowerInvariant()
                : normalized.ToLowerInvariant();

            string path = System.IO.Path.Combine(Application.streamingAssetsPath, normalized);
#if UNITY_WEBGL && !UNITY_EDITOR
            // WHY: WebGL 下 StreamingAssets 就是 HTTP 路径，直接拼 URL，不能加 file:// 前缀（纪律③）
            return path.Replace("\\", "/");
#else
            // WHY: 本地必须用 Uri 转义成 file:// URL，否则工程路径含空格 / 中文时加载失败
            return new Uri(path).AbsoluteUri;
#endif
        }
    }
}
