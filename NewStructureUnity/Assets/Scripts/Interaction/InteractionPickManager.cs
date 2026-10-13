using UnityEngine;
using UnityEngine.EventSystems;
using WSU3.Core.Interactive;
using WSU3.Contracts.Events;
using WSU3.Web;

namespace WSU3.Interaction
{
    /// <summary>
    /// 三维拾取管理器：**只做三件事** —— 保证输入体系在位、受闸门约束、补"点空白"这一种事件。
    ///
    /// 体系（Q-R6-S1 = A，DEC-80）：
    ///   · `EventSystem + StandaloneInputModule` —— 运行时按需创建（不建 Canvas，也不用 GraphicRaycaster）；
    ///   · `PhysicsRaycaster` —— 挂在主相机上，负责把指针事件派发给三维 Collider；
    ///   · 物体侧只认 <see cref="InteractiveObjBase"/> 的指针回调 → `GlobalInteractionEventData` 单一出口。
    ///
    /// 为什么"点空白"要在这里补：EventSystems 只在**命中物体**时回调，而"点空白"是一条有语义的事件
    /// （取消连线、收起浮卡都靠它），必须由我们自己射线判定后补发一条 `Target = null` 的 Click。
    ///
    /// 摆放：`Ensure()` 运行时自建常驻对象（`DontDestroyOnLoad`）；场景里手工挂载也行（会自保为常驻）。
    /// </summary>
    [DisallowMultipleComponent]
    public class InteractionPickManager : MonoBehaviour
    {
        private static InteractionPickManager s_Instance;

        [Tooltip("空白点击判定用的最大射线距离。")]
        [SerializeField] private float rayMaxDistance = 300f;

        private PhysicsRaycaster raycaster;
        private InteractiveObjBase focused;

        /// <summary>取常驻拾取管理器；不存在就建一个。</summary>
        public static InteractionPickManager Ensure()
        {
            if (s_Instance != null) return s_Instance;
            var go = new GameObject("Interaction (runtime)");
            DontDestroyOnLoad(go);
            s_Instance = go.AddComponent<InteractionPickManager>();
            return s_Instance;
        }

        private void Awake()
        {
            if (s_Instance == null) s_Instance = this;
            if (transform.parent == null) DontDestroyOnLoad(gameObject); // 手工挂场景时也要活过场景切换
            EnsureEventSystem();
        }

        private void OnEnable()
        {
            EventBus<ViewFocusRequestEvent>.Subscribe(OnViewFocus);
            EventBus<SceneExitRequestEvent>.Subscribe(OnSceneExit);
        }

        private void OnDisable()
        {
            EventBus<ViewFocusRequestEvent>.Unsubscribe(OnViewFocus);
            EventBus<SceneExitRequestEvent>.Unsubscribe(OnSceneExit);
        }

        private void OnDestroy()
        {
            if (s_Instance == this) s_Instance = null;
        }

        private void Update()
        {
            EnsureRaycaster();

            // 闸门：关掉时连射线都不做（既不拾取也不耗性能）
            bool active = InputGate.ShouldProcessInput;
            if (raycaster != null && raycaster.enabled != active) raycaster.enabled = active;
            if (!active) return;

            DetectBlankClick();
        }

        // ── 输入体系在位 ──────────────────────────────────────────────────

        /// <summary>没有 EventSystem 就建一个（挂在自身名下，随常驻对象一起活）。</summary>
        private void EnsureEventSystem()
        {
            if (EventSystem.current != null) return;

            var go = new GameObject("EventSystem");
            go.transform.SetParent(transform, false);
            go.AddComponent<EventSystem>();
            go.AddComponent<StandaloneInputModule>();
            Debug.Log("[Pick] 已创建 EventSystem + StandaloneInputModule（不建 Canvas，DEC-80）。");
        }

        /// <summary>主相机上要有 PhysicsRaycaster（相机可能晚于本对象就绪，所以每帧兜一次）。</summary>
        private void EnsureRaycaster()
        {
            if (raycaster != null) return;

            Camera camera = Camera.main;
            if (camera == null) return;

            raycaster = camera.GetComponent<PhysicsRaycaster>();
            if (raycaster == null)
            {
                raycaster = camera.gameObject.AddComponent<PhysicsRaycaster>();
                Debug.Log($"[Pick] 已给主相机 '{camera.name}' 添加 PhysicsRaycaster。");
            }
        }

        // ── 空白点击 ─────────────────────────────────────────────────────

        private void DetectBlankClick()
        {
            if (!Input.GetMouseButtonUp(0)) return;

            // 指针压在 DOM 之外的原生 UI 上时不算"点空白"（本期没有 Canvas，这条是防御性判断）
            if (EventSystem.current != null && EventSystem.current.IsPointerOverGameObject()) return;

            Camera camera = Camera.main;
            if (camera == null) return;

            Ray ray = camera.ScreenPointToRay(Input.mousePosition);
            if (Physics.Raycast(ray, out RaycastHit hit, rayMaxDistance))
            {
                InteractiveObjBase hitObj = hit.collider.GetComponentInParent<InteractiveObjBase>();
                // 命中交互物：它的 OnPointerClick 已经发过事件了，这里不重复发
                if (hitObj != null && hitObj.IsInteractable) return;
            }

            // 目标为空 = "点空白"：契约语义（docs/research/09 的"必须继承"：取消类逻辑依赖它）
            GlobalInteractionEventData data = GlobalInteractionEventData.Get(null, GlobalInteractionType.Click);
            EventBus<GlobalInteractionEventData>.Publish(data);
            data.Release();
        }

        // ── 聚焦（view:focus）────────────────────────────────────────────

        private void OnViewFocus(ViewFocusRequestEvent e)
        {
            if (focused != null && string.Equals(focused.ObjectKey, e.ObjectKey, System.StringComparison.Ordinal))
            {
                return;
            }

            ClearFocus();

            if (!InteractiveRegistry.TryGet(e.ObjectKey, out InteractiveObjBase target))
            {
                Debug.LogWarning($"[Pick] view:focus 找不到 objectKey='{e.ObjectKey}'（未注册的交互物？）");
                return;
            }

            focused = target;
            focused.SetHighlight(true);
            Debug.Log($"[Pick] view:focus → 高亮 {focused.ObjectKey}（animate={e.Animate}）；" +
                      "动画与镜头推进在 P2-6 接。");
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
    }
}
