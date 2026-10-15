using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using WSU3.Contracts.Events;
using WSU3.Core.Interactive;

namespace WSU3.Core.Managers.FunctionManager
{
    /// <summary>
    /// 交互管理器：**三维拾取、交互派发与登记的唯一落点**（DEC-80 / DEC-84）。
    ///
    /// 检测就在这里：`CoreUpdate()` 每帧做一次 `Camera.ViewportPointToRay` + `Physics.Raycast`，
    /// 命中后按需调物体上的 `InvokeEnter / InvokeExit / InvokeDown / InvokeUp / InvokeClick`
    /// （物体是**被动**的，见 <see cref="InteractiveObjBase"/>）——
    /// **注册表的意义就是"由管理器统一检测、统一派发"**，所以不再依赖 EventSystems 的指针回调。
    ///
    /// 职责：
    ///   ① **注册表**：按**契约 key**（字符串）登记交互物，供 `view:focus` 与诊断查询；
    ///   ② **检测与派发**：悬停进出、左键按下/抬起/点击、"点空白"（`Target = null` 的 Click）；
    ///   ③ **闸门**：`InputGate` 关上时连射线都不做，并把悬停态收尾（不发事件、不留残状态）；
    ///   ④ **聚焦**：`view:focus` 按 key 找物体并高亮（每次只亮一个，`scene:exit` 时清掉）。
    ///
    /// 关于 `EventSystem`：仍然建它，但**只用于"指针是否压在原生 UI 上"这一件事**
    /// （`IsPointerOverGameObject`，防御性判断）以及将来真有原生 UI 时的派发；
    /// 三维拾取不经过它，因此**不需要** `PhysicsRaycaster`（射线由本管理器自己发）。
    ///
    /// 由 <see cref="GlobalManager"/> 持有并驱动：`Init` 订阅与建体系，`CoreUpdate` 逐帧检测。
    /// 上报给 Web 的 `object:picked` 由 Runtime 侧订阅交互事件完成（Core 不依赖 Web 层）。
    /// </summary>
    public class InteractiveManager : FunctionManagerBase
    {
        /// <summary>射线最大距离。</summary>
        private const float RayMaxDistance = 300f;

        /// <summary>按契约 key 登记的交互物（全局唯一，故 static；见类注释）。</summary>
        private static readonly Dictionary<string, InteractiveObjBase> s_Objects =
            new Dictionary<string, InteractiveObjBase>();

        private Camera cam;
        private InteractiveObjBase hoverTarget;
        private InteractiveObjBase downTarget;
        private InteractiveObjBase focused;

        // ── 注册表（交互物自注册 / 自注销）────────────────────────────────

        /// <summary>已登记数量。</summary>
        public static int Count => s_Objects.Count;

        /// <summary>登记一个交互物（key 重复时后者覆盖并告警：多半是 prefab 复制忘了改 key）。</summary>
        public static void Register(InteractiveObjBase obj)
        {
            if (obj == null) return;
            string key = obj.ObjectKey;
            if (string.IsNullOrEmpty(key))
            {
                Debug.LogWarning($"[InteractiveMgr] {obj.name} 的 objectKey 为空，未登记。");
                return;
            }

            if (s_Objects.TryGetValue(key, out InteractiveObjBase exist) && exist != null && exist != obj)
            {
                Debug.LogWarning(
                    $"[InteractiveMgr] objectKey '{key}' 已被 {exist.name} 占用，现由 {obj.name} 覆盖。" +
                    "同一场景内 objectKey 必须唯一（它是对 Web 暴露的契约键）。");
            }
            s_Objects[key] = obj;
        }

        /// <summary>注销（物体销毁时自调用）。</summary>
        public static void Unregister(InteractiveObjBase obj)
        {
            if (obj == null) return;
            string key = obj.ObjectKey;
            if (!string.IsNullOrEmpty(key) && s_Objects.TryGetValue(key, out InteractiveObjBase exist) && exist == obj)
            {
                s_Objects.Remove(key);
            }
        }

        /// <summary>按契约 key 查（`view:focus` 用它）。</summary>
        public static bool TryGet(string key, out InteractiveObjBase obj)
        {
            if (string.IsNullOrEmpty(key))
            {
                obj = null;
                return false;
            }
            if (s_Objects.TryGetValue(key, out obj) && obj != null) return true;
            obj = null;
            return false;
        }

        /// <summary>按类型收集（诊断 / 批量操作用，不逐帧调用）。</summary>
        public static void Collect<T>(List<T> into) where T : InteractiveObjBase
        {
            if (into == null) return;
            into.Clear();
            foreach (KeyValuePair<string, InteractiveObjBase> pair in s_Objects)
            {
                if (pair.Value is T typed) into.Add(typed);
            }
        }

        /// <summary>清空登记表（场景整体卸载或测试时用）。</summary>
        public static void ClearRegistry()
        {
            s_Objects.Clear();
        }

        // ── 生命周期（由 GlobalManager 驱动）──────────────────────────────

        public override void Init(Action isInitComplete = null)
        {
            // 拾取相机 = **出画面的那台**（结构站是主相机的子对象 `ColorCamera`：它把模型渲染进 RT，
            // 再由合成铺满画布）—— 口径与原因见 `CameraManager.GetPickCamera`。
            cam = CameraManager.GetPickCamera();
            EnsureEventSystem();

            EventBus<ViewFocusRequestEvent>.Subscribe(OnViewFocus);
            EventBus<SceneExitRequestEvent>.Subscribe(OnSceneExit);

            isInit = true;
            isInitComplete?.Invoke();
        }

        public override void OnDespose()
        {
            EventBus<ViewFocusRequestEvent>.Unsubscribe(OnViewFocus);
            EventBus<SceneExitRequestEvent>.Unsubscribe(OnSceneExit);
            ClearHover();
            ClearFocus();
            ClearRegistry();
        }

        // ── 检测与派发（本类的核心）───────────────────────────────────────

        /// <summary>由 <see cref="GlobalManager"/> 的 Update 每帧驱动。</summary>
        public void CoreUpdate()
        {
            if (!InputGate.ShouldProcessInput)
            {
                // 闸门关闭（模态面板打开 / 容器不可见）：不做射线，但要把悬停态收尾
                ClearHover();
                downTarget = null;
                return;
            }

            InteractiveObjBase hit = RaycastTarget();

            // ① 悬停进出：只有目标变化时才发事件
            if (hit != hoverTarget)
            {
                if (hoverTarget != null) hoverTarget.InvokeExit();
                hoverTarget = hit;
                if (hoverTarget != null) hoverTarget.InvokeEnter();
                PublishHoverChanged();
            }

            // ② 左键：按下 / 抬起 / 点击（同一物体上按下并抬起才算点击）
            if (Input.GetMouseButtonDown(0))
            {
                downTarget = hit;
                if (hit != null) hit.InvokeDown();
            }

            if (Input.GetMouseButtonUp(0))
            {
                if (hit != null) hit.InvokeUp();

                if (hit != null && hit == downTarget)
                {
                    hit.InvokeClick();
                }
                else if (hit == null && !IsPointerOverNativeUi())
                {
                    // 点空白：有语义的一条事件（取消连线 / 收起浮卡依赖它），Target 为空
                    PublishBlankClick();
                }

                downTarget = null;
            }
        }

        /// <summary>当前指针下的交互物（不可交互的返回 null，等价于"没点到"）。</summary>
        private InteractiveObjBase RaycastTarget()
        {
            if (cam == null) cam = CameraManager.GetPickCamera();
            if (cam == null) cam = Camera.main;
            if (cam == null) return null;

            // ⚠️ 必须用**归一化视口坐标**，不能再用 `ScreenPointToRay(Input.mousePosition)`：
            //   `ScreenPointToRay` 是按**相机自己的 `pixelWidth/pixelHeight`** 把屏幕像素折成 NDC 的，
            //   而挂了 `targetTexture` 的相机这两个值**就是 RT 的尺寸**（不是画布尺寸）——
            //   结构站的拾取相机（颜色相机）正挂着 1920×1080 的 RT，浏览器里画布却是视口尺寸，
            //   于是"点哪儿都不中、悬停也没高光"（2026-10-15 实测：画布正中处射线偏 20.6°、指到左下）。
            //   而 `ViewportPointToRay` 只认"画面里的比例"，与 RT 尺寸、画布尺寸都无关，
            //   正好对上"合成把 RT 拉伸铺满画布"的显示口径（相机没挂 RT 时两者等价，实测 0.00°）。
            Vector3 mouse = Input.mousePosition;
            Vector3 viewport = new Vector3(
                mouse.x / Mathf.Max(1f, Screen.width),
                mouse.y / Mathf.Max(1f, Screen.height),
                0f);
            Ray ray = cam.ViewportPointToRay(viewport);
            if (!Physics.Raycast(ray, out RaycastHit hit, RayMaxDistance)) return null;

            InteractiveObjBase obj = hit.collider.GetComponentInParent<InteractiveObjBase>();
            return obj != null && obj.IsInteractable ? obj : null;
        }

        private void ClearHover()
        {
            if (hoverTarget == null) return;
            hoverTarget.InvokeExit(); // InvokeExit 不受闸门约束：必须能收尾
            hoverTarget = null;
            PublishHoverChanged(); // 闸门关闭也必须把"移出"报给 Web，否则页面上的名字浮标会卡住
        }

        /// <summary>
        /// 悬停目标变化 → 发布 `object:hover` 意图（上网由 Runtime 侧的 <c>WebBridgeBehaviour</c> 完成）。
        /// 只在目标进出时发布 —— enter / exit 本身就是天然限频，**不逐帧发**（逐帧上报会把桥淹掉，DEC-130）。
        /// 坐标是相对画布**左上角**的归一化值（Unity 的 mousePosition 原点在左下，这里翻 Y 与 CSS 同原点）。
        /// </summary>
        private void PublishHoverChanged()
        {
            Vector2 mouse = Input.mousePosition;
            EventBus<ObjectHoverEvent>.Publish(new ObjectHoverEvent
            {
                Key = hoverTarget != null ? hoverTarget.ObjectKey : string.Empty,
                X = mouse.x / Mathf.Max(1f, Screen.width),
                Y = 1f - mouse.y / Mathf.Max(1f, Screen.height),
            });
        }

        private static bool IsPointerOverNativeUi()
        {
            return EventSystem.current != null && EventSystem.current.IsPointerOverGameObject();
        }

        private static void PublishBlankClick()
        {
            GlobalInteractionEventData data = GlobalInteractionEventData.Get(null, GlobalInteractionType.Click);
            EventBus<GlobalInteractionEventData>.Publish(data);
            data.Release();
        }

        /// <summary>
        /// 只建 `EventSystem + StandaloneInputModule`（**不建 Canvas**）：它只服务"指针是否压在原生 UI 上"
        /// 这一件事与将来的原生 UI 派发；三维拾取由本管理器自己射线，所以不加 `PhysicsRaycaster`。
        /// </summary>
        private static void EnsureEventSystem()
        {
            if (EventSystem.current != null) return;

            var go = new GameObject("EventSystem");
            UnityEngine.Object.DontDestroyOnLoad(go); // 常驻：0_Setup → 1_Content 切场景时不能被卸掉
            go.AddComponent<EventSystem>();
            go.AddComponent<StandaloneInputModule>();
            Debug.Log("[InteractiveMgr] 已创建 EventSystem + StandaloneInputModule（不建 Canvas，DEC-80）。");
        }

        // ── ④ 聚焦 ────────────────────────────────────────────────────────

        private void OnViewFocus(ViewFocusRequestEvent e)
        {
            if (focused != null && string.Equals(focused.ObjectKey, e.ObjectKey, StringComparison.Ordinal)) return;

            ClearFocus();

            if (!TryGet(e.ObjectKey, out InteractiveObjBase target))
            {
                Debug.LogWarning($"[InteractiveMgr] view:focus 找不到 objectKey='{e.ObjectKey}'（未登记的交互物？）");
                return;
            }

            focused = target;
            focused.SetHighlight(true);
            Debug.Log($"[InteractiveMgr] view:focus → 高亮 {focused.ObjectKey}（animate={e.Animate}）；动画与镜头推进在 P2-6 接。");
        }

        private void OnSceneExit(SceneExitRequestEvent e)
        {
            ClearFocus();
        }

        private void ClearFocus()
        {
            if (focused == null) return;
            focused.SetHighlight(false);
            focused = null;
        }

        // ── 兼容旧调用（注册已由 InteractiveObjBase 自注册接管）────────────

        /// <summary>已由 <see cref="InteractiveObjBase"/> 自注册接管；保留此入口只为不打断既有调用点。</summary>
        public void RegisterObj(Guid guid, InteractiveObjBase obj)
        {
            Register(obj);
        }

        /// <summary>已由 <see cref="InteractiveObjBase"/> 自注销接管。</summary>
        public void UnregisterObj(Guid guid)
        {
            Debug.LogWarning("[InteractiveMgr] UnregisterObj(Guid) 已废弃：交互物在 OnDestroy 里自注销。");
        }

        /// <summary>按类型收集交互物（诊断用）。</summary>
        public void CollectInteractables<T>(List<T> into) where T : InteractiveObjBase
        {
            Collect(into);
        }
    }

    public enum MouseMoveState
    {
        Idle,
        Move,
    }
}
