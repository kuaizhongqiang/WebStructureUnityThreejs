using System.Collections;
using System.Collections.Generic;
using Cinemachine;
using UnityEngine;
using UnityEngine.InputSystem;
using WSU3.Core.Interactive;
using WSU3.Core.Managers;

namespace WSU3.Core.Controllers
{
    /// <summary>
    /// 三维操控层的控制器基类：统一管理摄像机俯仰钳制与滚轮 FOV 缩放，并把自己登记到**基类自带的静态注册表**。
    ///
    /// 与来源工程的差异（口径见 docs/design/11）：
    ///   · 登记改为静态注册表（**不引入来源那套"全局输入管理器"骨架**，见 DEC-69 的边界）；
    ///   · 相机取用走本工程的 <see cref="GlobalManager.MainCamera"/>（由 `CameraManager` 负责就绪与实例化）；
    ///   · 逐帧入口接本工程的 <see cref="InputGate"/>：模态面板打开或容器不可见时**不操控**
    ///     （DEC-84 的"提前返回"语义；闸门只存状态，不做任何场景操作）。
    ///
    /// 跨文件约定（沿用来源工程的行为规格，原文见 docs/research/10-input-controller-specs）：
    ///   · 控制器常驻并登记一次；切视角 = 切 <see cref="IsActive"/>，不要重复挂载同类；
    ///   · **协程等待而非 `Awake` 顺序**：`DelayInit` 里等相机就绪，禁止在 `Awake` 直连；
    ///   · 缩放改 Cinemachine 虚拟相机的 `m_Lens.FieldOfView`，**不要**改 `Camera.fieldOfView`；
    ///     子类移动时把 <see cref="IsMoving"/> 置位以触发 FOV 自动复位。
    /// </summary>
    public abstract class InputControllerBase : MonoBehaviour
    {
        #region 控制器登记（静态注册表）

        private static readonly Dictionary<string, InputControllerBase> s_Controllers =
            new Dictionary<string, InputControllerBase>();

        /// <summary>按类型名登记（一个控制器只留一份；重复登记以最后一次为准）。</summary>
        public static void RegisterController(string name, InputControllerBase controller)
        {
            if (string.IsNullOrEmpty(name) || controller == null) return;
            s_Controllers[name] = controller;
        }

        /// <summary>按类型名注销。</summary>
        public static void UnregisterController(string name)
        {
            if (string.IsNullOrEmpty(name)) return;
            s_Controllers.Remove(name);
        }

        /// <summary>按类型取已登记的控制器（`T` 的类型名作为查找 key）。</summary>
        public static T GetController<T>() where T : InputControllerBase
        {
            return s_Controllers.TryGetValue(typeof(T).Name, out InputControllerBase controller)
                ? controller as T
                : null;
        }

        /// <summary>清空登记（场景重进与测试用）。</summary>
        public static void ClearControllers()
        {
            s_Controllers.Clear();
        }

        #endregion

        #region 参数

        [SerializeField] protected bool isActive = true;

        [Header("摄像机")]
        [Tooltip("摄像机向上可移动的角度范围（度）")]
        [SerializeField] protected float TopClamp = 89.0f;
        [Tooltip("摄像机向下可移动的角度范围（度）")]
        [SerializeField] protected float BottomClamp = -89.0f;
        [SerializeField] protected float mouseSensitive = 1.0f;
        [SerializeField] protected float defaultFov = 42f;
        [SerializeField] protected float zoomMin = 20f;
        [SerializeField] protected float zoomMax = 120f;
        [SerializeField] protected float zoomSpeed = 5.0f;
        [SerializeField] protected Vector3 startPos = Vector3.zero;
        [SerializeField] protected Quaternion startRot = Quaternion.identity;

        protected Camera mainCamera;
        protected Coroutine zoomHandleCoroutine;

        public bool IsActive { get => isActive; set => isActive = value; }

        /// <summary>子类在移动时设为 true、停止时设为 false，用于触发 FOV 自动恢复。</summary>
        protected bool IsMoving { get; set; }

        protected bool _hasDefaultFov;

        #endregion

        #region 继承方法

        public abstract void Transport(Transform target);

        #endregion

        #region 虚方法

        protected virtual void Awake()
        {
            // 注册表是静态的：没有"等管理器实例化"这一步，登记可以直接做（见类注释）
            RegisterController(GetType().Name, this);
            StartCoroutine(DelayInit());
        }

        protected virtual void Update()
        {
            if (!isActive) return;
            // 闸门：模态面板打开 / 容器不可见时不操控（相机与角色都别动）
            if (!InputGate.ShouldProcessInput) return;
        }

        protected virtual void OnDestroy()
        {
            UnregisterController(GetType().Name);
        }

        protected virtual IEnumerator DelayInit()
        {
            // 相机由本工程的 CameraManager 负责就绪（`GlobalManager.MainCamera` 会按需实例化 `Resources/MainCamera`）
            while (!HasCamera())
            {
                yield return null;
            }

            mainCamera = GlobalManager.MainCamera;
        }

        /// <summary>相机是否可用（`GlobalManager.MainCamera` 取不到时返回 false，交给下一帧再试）。</summary>
        protected static bool HasCamera()
        {
            return GlobalManager.MainCamera != null;
        }

        #endregion

        #region 私有方法

        // WHY: 缩放与恢复共用 zoomHandleCoroutine 并互相 StopCoroutine，拆成两个句柄会并发改同一 vcam 的 FOV。
        /// <summary>处理滚轮缩放：移动时自动恢复默认 FOV，否则按滚动量钳制并惯性调整虚拟相机 FOV。</summary>
        protected virtual void ZoomHandle()
        {
            if (IsMoving)
            {
                TryRestoreDefaultFov();
                return;
            }

            if (Mouse.current == null) return;
            float scrollDelta = Mouse.current.scroll.ReadValue().y;
            if (Mathf.Abs(scrollDelta) < 0.01f) return;

            if (!TryGetVirtualCamera(out var vcam)) return;
            float targetFov = Mathf.Clamp(vcam.m_Lens.FieldOfView - scrollDelta * zoomSpeed, zoomMin, zoomMax);

            if (zoomHandleCoroutine != null)
                StopCoroutine(zoomHandleCoroutine);
            zoomHandleCoroutine = StartCoroutine(ZoomHandleDelay(vcam, targetFov));
        }

        /// <summary>在 0.15 秒内把虚拟相机 FOV 惯性过渡到目标值。</summary>
        private IEnumerator ZoomHandleDelay(CinemachineVirtualCamera vcam, float targetFov)
        {
            float startFov = vcam.m_Lens.FieldOfView;
            float duration = 0.15f;
            float elapsed = 0f;

            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / duration;
                vcam.m_Lens.FieldOfView = Mathf.Lerp(startFov, targetFov, t);
                yield return null;
            }

            vcam.m_Lens.FieldOfView = targetFov;
            zoomHandleCoroutine = null;
        }

        /// <summary>把虚拟相机 FOV 惯性恢复到缓存的默认值（仅在已缓存默认 FOV 时生效）。</summary>
        private void TryRestoreDefaultFov()
        {
            if (!_hasDefaultFov) return;
            if (!TryGetVirtualCamera(out var vcam)) return;
            if (Mathf.Abs(vcam.m_Lens.FieldOfView - defaultFov) < 0.01f) return;

            if (zoomHandleCoroutine != null)
                StopCoroutine(zoomHandleCoroutine);
            zoomHandleCoroutine = StartCoroutine(ZoomRestoreCoroutine(vcam));
        }

        /// <summary>在 0.15 秒内把虚拟相机 FOV 插值回默认值。</summary>
        private IEnumerator ZoomRestoreCoroutine(CinemachineVirtualCamera vcam)
        {
            float startFov = vcam.m_Lens.FieldOfView;
            float duration = 0.15f;
            float elapsed = 0f;

            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / duration;
                vcam.m_Lens.FieldOfView = Mathf.Lerp(startFov, defaultFov, t);
                yield return null;
            }

            vcam.m_Lens.FieldOfView = defaultFov;
            zoomHandleCoroutine = null;
        }

        /// <summary>从 CinemachineBrain 取活动虚拟相机；首次成功取到时缓存默认 FOV。</summary>
        private bool TryGetVirtualCamera(out CinemachineVirtualCamera vcam)
        {
            vcam = null;
            if (mainCamera == null) return false;

            if (mainCamera.TryGetComponent<CinemachineBrain>(out var brain))
            {
                vcam = brain.ActiveVirtualCamera as CinemachineVirtualCamera;
            }

            if (vcam != null && !_hasDefaultFov)
            {
                defaultFov = vcam.m_Lens.FieldOfView;
                _hasDefaultFov = true;
            }

            return vcam != null;
        }

        #endregion
    }
}
