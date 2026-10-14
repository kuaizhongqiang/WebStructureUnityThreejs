using System.Collections;
using UnityEngine;
using WSU3.Core.Managers;

namespace WSU3.Core.Controllers
{
    /// <summary>
    /// 相机背景板：按相机 FOV / 宽高比缩放平面，并支持双纹理淡入切换。
    ///
    /// 材质约定（与来源工程的相机背景 shader 对齐，资产见 `Assets/Shaders/Models/CamBgUnlitShader.shadergraph`）：
    ///   `_Texture_1` / `_Texture_2` 两张背景图；`_TexOrColor` 0=颜色 1=纹理；`_CutTex` 0~1 两张图之间的平滑切换。
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

        const string MatTexture_1 = "_Texture_1";
        const string MatTexture_2 = "_Texture_2";
        const string ChangeTextureBool = "_TexOrColor";         // 这是一个 float 属性数据：0 = 颜色、1 = 纹理
        const string TexCutFade = "_CutTex";                    // 这是一个 float 属性数据：0~1 平滑切换 1 和 2 两个纹理

        void Awake()
        {
            StartCoroutine(DelayInit());
            screenSize = new Vector2(Screen.width, Screen.height);
            InitMesh();
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
