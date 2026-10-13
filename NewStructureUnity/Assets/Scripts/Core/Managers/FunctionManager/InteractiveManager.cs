using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using WSU3.Contracts.Events;
using WSU3.Core.Interactive;

namespace WSU3.Core.Managers.FunctionManager
{
    /// <summary>
    /// 交互管理器：**三维拾取与交互注册的唯一落点**（DEC-80 / DEC-84）。
    ///
    /// 体系（Q-R6-S1 = A）：`EventSystem + StandaloneInputModule + PhysicsRaycaster`，
    /// **不建 Canvas、不用 GraphicRaycaster** —— 拾取的是三维 Collider，不是 UI（界面全部在 Web 的 DOM 层）。
    /// 由 <see cref="GlobalManager"/> 持有并驱动：`Init` 建体系、`CoreUpdate` 逐帧兜底与补事件。
    ///
    /// 职责：
    ///   ① **注册表**：按**契约 key**（字符串）登记交互物，供拾取与 `view:focus` 查询
    ///      —— 不另建脚本，也不逐帧 `FindObjectsOfType`；
    ///   ② **就位**：没有 `EventSystem` 就建一个；主相机上没有 `PhysicsRaycaster` 就补上（相机可能晚就绪）；
    ///   ③ **闸门**：`InputGate` 关上时连射线都不做（模态面板 / 容器不可见）；
    ///   ④ **补「点空白」**：EventSystems 只在命中物体时回调，而"点空白"是有语义的事件，得自己射线判定后补发；
    ///   ⑤ **聚焦**：`view:focus` 按 key 找物体并高亮（每次只亮一个，`scene:exit` 时清掉）。
    ///
    /// 注册表是 **static** 的：交互物在 `Awake` 里自注册，走静态入口就不会因为"访问 Instance"而
    /// 在管理器链就绪之前把 <see cref="GlobalManager"/> 提前创建出来。
    /// 高亮只有状态、没有表现：表现由派生类重写 `InteractiveObjBase.OnHighlightChanged` 自己写。
    /// 上报给 Web 的 `object:picked` 由 Runtime 侧订阅交互事件完成（Core 不依赖 Web 层）。
    /// </summary>
    public class InteractiveManager : FunctionManagerBase
    {
        /// <summary>空白点击判定用的最大射线距离。</summary>
        private const float RayMaxDistance = 300f;

        /// <summary>按契约 key 登记的交互物（全局唯一，故用 static；见类注释）。</summary>
        private static readonly Dictionary<string, InteractiveObjBase> s_Objects =
            new Dictionary<string, InteractiveObjBase>();

        private Camera cam;
        private PhysicsRaycaster raycaster;
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
            cam = GlobalManager.MainCamera;
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
            ClearFocus();
            ClearRegistry();
        }

        /// <summary>由 <see cref="GlobalManager"/> 的 Update 驱动（本类不是 MonoBehaviour）。</summary>
        public void CoreUpdate()
        {
            EnsureRaycaster();

            bool active = InputGate.ShouldProcessInput;
            if (raycaster != null && raycaster.enabled != active) raycaster.enabled = active;
            if (!active) return;

            DetectBlankClick();
        }

        // ── ② 就位 ────────────────────────────────────────────────────────

        private static void EnsureEventSystem()
        {
            if (EventSystem.current != null) return;

            var go = new GameObject("EventSystem");
            UnityEngine.Object.DontDestroyOnLoad(go); // 常驻：0_Setup → 1_Content 切场景时不能被卸掉
            go.AddComponent<EventSystem>();
            go.AddComponent<StandaloneInputModule>();
            Debug.Log("[InteractiveMgr] 已创建 EventSystem + StandaloneInputModule（不建 Canvas，DEC-80）。");
        }

        private void EnsureRaycaster()
        {
            if (raycaster != null) return;

            if (cam == null) cam = Camera.main;
            if (cam == null) return;

            raycaster = cam.GetComponent<PhysicsRaycaster>();
            if (raycaster == null)
            {
                raycaster = cam.gameObject.AddComponent<PhysicsRaycaster>();
                Debug.Log($"[InteractiveMgr] 已给主相机 '{cam.name}' 添加 PhysicsRaycaster。");
            }
        }

        // ── ④ 点空白 ──────────────────────────────────────────────────────

        private void DetectBlankClick()
        {
            if (!Input.GetMouseButtonUp(0)) return;

            // 指针压在原生 UI 上时不算"点空白"（本期没有 Canvas，这条是防御性判断）
            if (EventSystem.current != null && EventSystem.current.IsPointerOverGameObject()) return;

            if (cam == null) cam = Camera.main;
            if (cam == null) return;

            Ray ray = cam.ScreenPointToRay(Input.mousePosition);
            if (Physics.Raycast(ray, out RaycastHit hit, RayMaxDistance))
            {
                InteractiveObjBase hitObj = hit.collider.GetComponentInParent<InteractiveObjBase>();
                // 命中交互物：它的 OnPointerClick 已经发过事件，这里不重复发
                if (hitObj != null && hitObj.IsInteractable) return;
            }

            // 目标为空 = 点空白（取消连线 / 收起浮卡依赖这条语义）
            GlobalInteractionEventData data = GlobalInteractionEventData.Get(null, GlobalInteractionType.Click);
            EventBus<GlobalInteractionEventData>.Publish(data);
            data.Release();
        }

        // ── ⑤ 聚焦 ────────────────────────────────────────────────────────

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
