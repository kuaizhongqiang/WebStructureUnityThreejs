using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering.Universal;
using WSU3.Contracts;

namespace WSU3.Core.Managers.FunctionManager
{
    public class CameraManager : FunctionManagerBase
    {
        /// <summary>预制体里**颜色相机**后处理的原值（`Init` 时读一次）—— 非结构任务回到这个值。</summary>
        private bool defaultPostProcessing = true;

        /// <summary>
        /// **按任务类型决定"颜色路"相机的后处理开关**（规定：结构任务必须关）。
        ///
        /// 为什么关的是**颜色相机**而不是主相机（2026-10-15 负责人定的结构，见 docs/design/13）：
        /// 结构站看到的画面是"**颜色相机**（`MainCamera` 的子对象 `ColorCamera`）把模型渲染进 RT →
        /// 合成 RawImage 铺满画布"⇒ **写进 RT 的那台才是颜色路**。URP 的后处理（UberPost）会把 alpha
        /// **写死成 1**，它一开，合成出来的画面在整个画布上都不透明 ⇒ 网页那侧怎么调都是黑底/不透。
        /// 主相机（根物体，tag `MainCamera`）只把层 0/1/2/4/5 与清屏画到屏幕上，而那一片会被合成的
        /// **覆盖式写入整块盖掉** ⇒ 它的后处理与透明无关，**不动**。
        ///
        /// 其它任务类型（电路连接 / 仿真实验 / 检测）保持预制体里的原值（开 ⇒ 画布不透明，观感同以前）。
        /// </summary>
        /// <param name="taskType">即将进入的任务类型；<see cref="TaskType.None"/> 表示"退出/待命 ⇒ 回默认"。</param>
        public void ApplyPostProcessingPolicy(TaskType taskType)
        {
            bool enable = taskType == TaskType.Structure ? false : defaultPostProcessing;
            SetColorCameraPostProcessing(enable);
        }

        /// <summary>读颜色相机当前的后处理开关（读不到时按"开"算，与我们"默认开"的口径一致）。</summary>
        public static bool ReadColorCameraPostProcessing()
        {
            Camera color = GetColorCamera();
            if (color == null) return true;
            UniversalAdditionalCameraData data = color.GetUniversalAdditionalCameraData();
            return data == null || data.renderPostProcessing;
        }

        /// <summary>
        /// 开关颜色相机的后处理（URP：`UniversalAdditionalCameraData.renderPostProcessing`）。
        /// 用 URP 的正式属性而不是去改组件字段，免得被 URP 内部状态覆盖。
        /// </summary>
        public static void SetColorCameraPostProcessing(bool enabled)
        {
            

            UniversalAdditionalCameraData data = GetMainCamera().GetUniversalAdditionalCameraData();
            if (data == null)
            {
                Debug.LogWarning("[CameraManager] 颜色相机上找不到 UniversalAdditionalCameraData，后处理开关没生效。");
                return;
            }

            if (data.renderPostProcessing == enabled) return;

            data.renderPostProcessing = enabled;
            Debug.Log(
                $"[CameraManager] 颜色相机后处理 → {(enabled ? "开" : "关")}" +
                (enabled ? "" : "（结构任务规定关：后处理会把 alpha 写死 1，画布就透不了；docs/design/13 §4.4）"));
        }

        public override void Init(Action isInitComplete = null)
        {
            GlobalManager.MainCamera = GetMainCamera();

            // 记住预制体里**颜色相机**后处理的**原值**（默认开）—— 非结构任务要回到这个值
            defaultPostProcessing = ReadColorCameraPostProcessing();

            isInit = true;
            isInitComplete?.Invoke();
        }

        public override void OnDespose()
        {
            
        }

        /// <summary>
        /// 收集主相机（tag `MainCamera`）：**只认"根上那台"**，子相机一律不算。
        ///
        /// ⚠️ 本方法的历史口径是"主相机只许有一台" —— 多于一台时会把多余的 `DestroyImmediate` 掉。
        /// 而结构站的 `ColorCamera` 是主相机的**子对象**、并从主相机那里**继承了 `MainCamera` 标签**
        /// （实测预制体如此，2026-10-15）；按老口径它会被当成"多余的主相机"**当场删掉** ⇒
        /// "画布透明"那条链（颜色路）整个断掉，现场只留一句"少了一台相机"。
        /// 所以这里把**"另一台 MainCamera 相机的后代"排除在外**（忽略、不删）；其余重复的主相机仍按老口径去掉
        /// —— 这是对标签纪律的**兜底**，不是放宽纪律。最干净的做法仍是把子相机的 tag 改成 `Untagged`。
        /// </summary>
        public static Camera GetMainCamera()
        {
            var list = Camera.allCameras;
            var mains = new List<Camera>();
            for (int i = 0; i < list.Length; i++)
            {
                if (list[i].gameObject.tag != "MainCamera") continue;

                // 子相机（主相机子对象上的 ColorCamera 等）不当主相机：不收集，也就不参与去重删除
                if (IsDescendantOfTaggedCamera(list[i]))
                {
                    Debug.LogWarning(
                        $"[CameraManager] 相机 '{list[i].name}' 带 MainCamera 标签，但它是另一台主相机的子对象 —— " +
                        "按子相机处理（不删、不当主相机）；建议把它的 tag 改成 Untagged。");
                    continue;
                }

                mains.Add(list[i]);
            }

            if (mains.Count == 1) return mains[0];
            else if (mains.Count > 1)
            {
                // 移除直到只剩余一个mainCamera
                for (int i = 1; i < mains.Count; i++)
                {
                    GameObject.DestroyImmediate(mains[i].gameObject);
                }
                return mains[0];
            }
            else
            {
                Debug.LogError("There is no main camera");
                return CreateMainCamera();
            }
        }

        /// <summary>是否是"另一台带 `MainCamera` 标签的相机的后代"（沿父级往上找）。</summary>
        private static bool IsDescendantOfTaggedCamera(Camera cam)
        {
            Transform parent = cam.transform.parent;
            while (parent != null)
            {
                if (parent.CompareTag("MainCamera")) return true;
                parent = parent.parent;
            }
            return false;
        }

        static Camera CreateMainCamera()
        {
            GameObject prefab = Resources.Load<GameObject>("MainCamera");
            if (prefab == null)
            {
                Debug.LogError("There is no prefab named MainCamera");
                return null;
            }
            Camera cam = GameObject.Instantiate(prefab,GlobalManager.Instance.transform).GetComponent<Camera>();

            return cam;
        }

        // ────────────────── 三台相机的分工（结构站画布透明，DEC-151 / docs/design/13） ──────────────────
        //
        // 预制体（`Resources/MainCamera.prefab`，2026-10-15 负责人手工接线）实测形态：
        //   · **主相机**（根物体，tag `MainCamera`，掩码 55 = 层 0/1/2/4/5，`targetTexture` 空）
        //     —— 渲染到**屏幕**（清屏 + 那几层）、并**负责射线/交互**；
        //   · **颜色相机** `ColorCamera`（主相机的**子对象**，掩码 183 = 55 + 层 7 `ShowObj`）
        //     —— 把**模型**渲染进 `Color.renderTexture`（1920×1080）⇒ **它才是"颜色路"**；
        //   · **alpha 相机** `AlphaCamera`（主相机的**子对象**，掩码 128 = 只有层 7 `ShowObj`）
        //     —— 只出 alpha 通道，**不走后处理**（后处理会把 alpha 写死 1）。
        // 颜色路的 RGB + alpha 路的 A 由合成材质（`AlphaComposite.mat`）合成一帧，再由 `1_Content` 的
        // `OutputCanvas`（Overlay）铺满画布 ⇒ **模型只经这条路可见**（主相机的掩码不含层 7）。
        //
        // 为什么按"名字关键字"找而不是按 tag：tag 只有一个 `MainCamera`，**子相机绝不能带它**
        // （`GetMainCamera()` 会把多余的主相机删掉；`ColorCamera` 实测继承了该标签，已由
        // `IsDescendantOfTaggedCamera()` 兜底排除）。子相机都挂在主相机下面，所以先找子对象、
        // 再退回全局按名字找；找不到时报错能列出候选。

        /// <summary>颜色相机的名字关键字（不区分大小写）。</summary>
        public const string ColorCameraKeyword = "color";

        /// <summary>alpha 相机的名字关键字（不区分大小写）。</summary>
        public const string AlphaCameraKeyword = "alpha";

        /// <summary>
        /// **颜色路**用的相机 = `ColorCamera`（主相机的子对象，把模型渲染进 `Color.renderTexture`）。
        /// 它**不再是主相机** —— 主相机已回到"渲染到屏幕 + 负责射线"的老角色（2026-10-15 负责人定的结构）。
        /// </summary>
        public static Camera GetColorCamera()
        {
            return GetChildCameraByKeyword(ColorCameraKeyword);
        }

        /// <summary>
        /// 颜色路相机（旧名，语义不变：**出 RGB 的那台**）。保留入口只为不打断既有调用点。
        /// </summary>
        public static Camera GetRgbCamera()
        {
            return GetColorCamera();
        }

        /// <summary>
        /// **拾取用的相机 = 出画面的那台**（`InteractiveManager` 每帧的射线用它）。
        ///
        /// 为什么不是主相机（2026-10-15 实测的教训）：模型只经"颜色相机 → RT → 合成铺满画布"可见，
        /// 而**画布比例通常不等于 RT 的比例**（浏览器里画布 942×679、RT 1920×1080）⇒ 用主相机
        /// （aspect 跟画布）去射 RT 上那幅画，同一像素对应的世界方向会偏开：实测 uv.x=0.25 处偏 **3.9°**、
        /// 0.15 处偏 **5.1°**（中心 0°）—— **越靠边越点不准**。换颜色相机 + 归一化视口坐标后，
        /// 射线与"看到的那幅画"逐像素一致（与 RT 尺寸、画布尺寸都无关）。
        ///
        /// 颜色相机缺席或没挂 RT（合成链路未接线）时**退回主相机** —— 那时屏幕上的画面就是主相机自己出的。
        /// </summary>
        public static Camera GetPickCamera()
        {
            Camera color = GetColorCamera();
            if (color != null && color.targetTexture != null) return color;

            Camera main = GlobalManager.MainCamera;
            if (main != null && color != null)
            {
                Debug.LogWarning(
                    $"[CameraManager] 颜色相机 '{color.name}' 没挂 targetTexture（合成链路未接线），拾取回退到主相机。");
            }
            return main;
        }

        /// <summary>
        /// alpha 相机（不走后处理，用它出 alpha 通道）。先找主相机的子对象，再退回全局按名字找；
        /// 找不到时返回 null 并**把现有相机名全列出来**（便于改名对齐）。
        /// </summary>
        public static Camera GetAlphaCamera()
        {
            return GetChildCameraByKeyword(AlphaCameraKeyword);
        }

        /// <summary>
        /// 按名字关键字取**主相机的子相机**（预制体里的约定形态）；取不到再退回全局按名字找。
        /// 颜色相机 / alpha 相机共用这一处取法 —— 两台挂法一样，没有第二套规则。
        /// </summary>
        private static Camera GetChildCameraByKeyword(string keyword)
        {
            // ① 主相机的子对象（预制体里的约定形态）
            Camera main = GlobalManager.MainCamera;
            if (main != null)
            {
                Camera[] children = main.GetComponentsInChildren<Camera>(true);
                for (int i = 0; i < children.Length; i++)
                {
                    if (children[i] == null || children[i] == main) continue;
                    if (children[i].name.ToLowerInvariant().Contains(keyword)) return children[i];
                }
            }

            // ② 退回全局按名字找
            return FindCameraByKeyword(keyword);
        }

        /// <summary>按名字关键字找一台启用的相机（找不到返回 null，并列出候选便于排查）。</summary>
        public static Camera FindCameraByKeyword(string keyword)
        {
            if (string.IsNullOrEmpty(keyword)) return null;

            string lower = keyword.ToLowerInvariant();
            Camera[] list = Camera.allCameras;
            for (int i = 0; i < list.Length; i++)
            {
                if (list[i] == null) continue;
                if (list[i].name.ToLowerInvariant().Contains(lower)) return list[i];
            }

            // 失败要说清：把当前所有相机名打出来，改名时一眼能对上（DEC-53 §11.6 的口径）
            var names = new List<string>();
            for (int i = 0; i < list.Length; i++)
            {
                if (list[i] != null) names.Add(list[i].name);
            }
            Debug.LogWarning($"[CameraManager] 找不到名字含 '{keyword}' 的相机；当前相机：{(names.Count == 0 ? "(无)" : string.Join(", ", names))}");
            return null;
        }
    }
}
