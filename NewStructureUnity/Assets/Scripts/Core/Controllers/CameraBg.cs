using System.Collections;
using UnityEngine;
using WSU3.Contracts;
using WSU3.Contracts.Events;
using WSU3.Core.Managers;

namespace WSU3.Core.Controllers
{
    /// <summary>
    /// 相机背景板：按相机 FOV / 宽高比缩放平面，并支持双纹理淡入切换。
    ///
    /// 材质约定（与来源工程的相机背景 shader 对齐，资产见 `Assets/Shaders/Models/CamBgUnlitShader.shadergraph`）：
    ///   `_Texture_1` / `_Texture_2` 两张背景图；`_TexOrColor` 0=颜色 1=纹理；`_CutTex` 0~1 两张图之间的平滑切换。
    ///
    /// **主题**：Web 侧的 `ui:set-theme` 到达时（`EventBus<ThemeChangedEvent>`）把这块板换成对应材质
    /// （`darkMaterial` / `lightMaterial`，取值见 `ThemeKind`）。两枚材质都是 **prefab 上的序列化引用** ——
    /// 不走 Resources、不走资源包（全局包登记表当前为空，见 `docs/design/12` §9）。
    ///
    /// ⚠️ **未闭合**：背景图的**取图入口**没接 —— 本工程的资源包链路（P2-6）尚未落地，
    /// 所以启动时**不加载**背景图（材质保持默认颜色），也不做静默降级假造数据。
    /// 链路落地后按"双纹理打包"接进 <see cref="LoadBgTextures"/> 即可。
    /// </summary>
    public class CameraBg : MonoBehaviour
    {
        Camera cam;
        Vector2 screenSize;
        float lastFov;
        float lastAspect;
        float lastLocalZ;
        MeshRenderer meshRenderer;
        Material material;
        Coroutine TexFadeCoroutine;

        [Header("主题材质（由 Web 的 ui:set-theme 驱动）")]
        [Tooltip("深色主题的背景板材质")]
        [SerializeField] Material darkMaterial;
        [Tooltip("亮色主题的背景板材质")]
        [SerializeField] Material lightMaterial;

        const string MatTexture_1 = "_Texture_1";
        const string MatTexture_2 = "_Texture_2";
        const string ChangeTextureBool = "_TexOrColor";         // 这是一个 float 属性数据：0 = 颜色、1 = 纹理
        const string TexCutFade = "_CutTex";                    // 这是一个 float 属性数据：0~1 平滑切换 1 和 2 两个纹理

        void Awake()
        {
            StartCoroutine(DelayInit());
            screenSize = new Vector2(Screen.width, Screen.height);
            InitMesh();

            // 订阅放在 Awake（与 StepManager 同一条理由：EditMode 测试里 Start / OnEnable 不会跑）
            EventBus<ThemeChangedEvent>.Subscribe(OnThemeChanged);
        }

        void OnDestroy()
        {
            EventBus<ThemeChangedEvent>.Unsubscribe(OnThemeChanged);
        }

        /// <summary>Web 侧主题切换（`ui:set-theme`）。</summary>
        void OnThemeChanged(ThemeChangedEvent e)
        {
            ApplyTheme(e?.Theme);
        }

        /// <summary>
        /// 按主题换上对应的背景板材质（取值见 <see cref="ThemeKind"/>）。
        ///
        /// 认不出的主题 / 那个主题没配材质 ⇒ **只告警、不动现场**：换上 null 会让整块背景直接消失，
        /// 而"背景没跟上主题"只是观感问题，不该把画面弄坏。
        /// </summary>
        public void ApplyTheme(string theme)
        {
            Material target;
            if (theme == ThemeKind.Light) target = lightMaterial;
            else if (theme == ThemeKind.Dark) target = darkMaterial;
            else
            {
                Debug.LogWarning(
                    $"[CameraBg] 认不出的主题 '{theme}'（只认 {ThemeKind.Dark} / {ThemeKind.Light}），已忽略");
                return;
            }

            if (target == null)
            {
                Debug.LogWarning($"[CameraBg] 主题 '{theme}' 没配材质（prefab 上的 darkMaterial / lightMaterial 要补齐），保持原材质");
                return;
            }

            if (meshRenderer == null) meshRenderer = GetComponent<MeshRenderer>();
            if (meshRenderer == null) return;

            meshRenderer.sharedMaterial = target;
            // 同步本类自己缓存的引用：它按材质读 _CutTex / 写背景图，留着旧的会静默失效
            material = target;
        }

        IEnumerator DelayInit()
        {
            // WHY: 必须先等一帧再取相机；StartCoroutine 会同步跑到首个 yield，本组件可能正由 Instantiate 触发，
            //      同步取会"实例化 → Awake → 再实例化"栈溢出
            yield return null;

            while (GlobalManager.MainCamera == null)
            {
                yield return null;
            }

            cam = GlobalManager.MainCamera;

            // 初始化时记录初始值
            if (cam != null)
            {
                lastFov = cam.fieldOfView;
                lastAspect = cam.aspect;
                lastLocalZ = transform.localPosition.z;
                SetScale();
            }

            LoadBgTextures();
        }

        /// <summary>启动时取两张背景图写进材质（<b>取图入口未闭合</b>，见类注释）。</summary>
        void LoadBgTextures()
        {
            if (material == null)
            {
                Debug.LogError("[CameraBg] 材质为空，背景图无法写入");
                return;
            }

            // TODO(资源包链路落地后)：按包取两张背景图（对应 _Texture_1 / _Texture_2），成功时：
            //   SetTwoTexture(tex1, tex2);
            //   material.SetFloat(ChangeTextureBool, 1f);   // 切到纹理模式
            //   material.SetFloat(TexCutFade, 0f);          // 起始显示 _Texture_1
            Debug.LogWarning("[CameraBg] 背景图未加载：本工程的资源包链路尚未落地（见 docs/TODO.md），材质保持默认颜色");
        }

        void Update()
        {
            if (cam == null)
            {
                return;
            }

            // 只在相机参数或位置变化时才更新
            float currentFov = cam.fieldOfView;
            float currentAspect = cam.aspect;
            float currentLocalZ = transform.localPosition.z;

            if (!Mathf.Approximately(currentFov, lastFov) ||
                !Mathf.Approximately(currentAspect, lastAspect) ||
                !Mathf.Approximately(currentLocalZ, lastLocalZ))
            {
                SetScale();
                lastFov = currentFov;
                lastAspect = currentAspect;
                lastLocalZ = currentLocalZ;
            }
        }

        /// <summary>按 FOV 与宽高比把背景板缩放到"刚好铺满视锥在本地 z 处的截面"。</summary>
        void SetScale()
        {
            float fov = cam.fieldOfView * Mathf.Deg2Rad;
            float aspect = cam.aspect;
            float localZ = transform.localPosition.z;

            float viewHeight = 2f * localZ * Mathf.Tan(fov * 0.5f);
            float viewWidth = viewHeight * aspect;

            transform.localScale = new Vector3(viewWidth, viewHeight, 1f);
        }

        void InitMesh()
        {
            meshRenderer = GetComponent<MeshRenderer>();
            material = meshRenderer.sharedMaterial;
        }

        /// <summary>两张背景图之间平滑切换（<paramref name="fadeIn"/> = true 切到 _Texture_2）。</summary>
        public void SmoothFadeTexture(bool fadeIn)
        {
            if (material.GetTexture(MatTexture_1) == null || material.GetTexture(MatTexture_2) == null) return;

            material.SetFloat(ChangeTextureBool, 1f);

            if (TexFadeCoroutine != null)
            {
                StopCoroutine(TexFadeCoroutine);
            }

            TexFadeCoroutine = StartCoroutine(FadeTexture(fadeIn));
        }

        IEnumerator FadeTexture(bool fadeIn)
        {
            float time = 0f;
            float current = material.GetFloat(TexCutFade);
            float duration = 1f;
            float target = fadeIn ? 1f : 0f;

            while (time < duration)
            {
                time += Time.deltaTime;
                current = Mathf.Lerp(current, target, time / duration);
                material.SetFloat(TexCutFade, current);
                yield return null;
            }

            material.SetFloat(TexCutFade, target);

            TexFadeCoroutine = null;
        }

        /// <summary>写入两张背景图。</summary>
        public void SetTwoTexture(Texture2D tex1, Texture2D tex2)
        {
            if (tex1 == null || tex2 == null) return;

            material.SetTexture(MatTexture_1, tex1);
            material.SetTexture(MatTexture_2, tex2);
        }
    }
}
