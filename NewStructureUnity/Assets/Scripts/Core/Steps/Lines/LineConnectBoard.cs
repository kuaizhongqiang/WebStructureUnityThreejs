using System.Collections.Generic;
using UnityEngine;

namespace WSU3.Core.Steps.Lines
{
    /// <summary>
    /// 连线画板：把**已配对**的两个端点用 `LineRenderer` 连起来。
    ///
    /// 由 `ConditionLineConnect` 在 Waiting 时临时创建（挂在步骤节点下），归位时销毁 ——
    /// 连线是"步骤内临时物"，不该留进场景文件，也不该跨步骤偷活。
    ///
    /// 线的位置每帧跟随端点（`LateUpdate`），因为器件可能被动画挪动。
    /// 材质由条件上传；没给就按"URP → 内置"逐个试默认着色器，都拿不到时**只跑逻辑不画线**并告警
    /// （宁可没有线，也不要满屏紫红）。
    /// </summary>
    public class LineConnectBoard : MonoBehaviour
    {
        private sealed class Entry
        {
            public LineRenderer Line;
            public Transform From;
            public Transform To;
        }

        private readonly List<Entry> entries = new List<Entry>();
        private Material material;
        private Color color = new Color(0.2f, 0.9f, 0.4f, 1f);
        private float width = 0.01f;

        /// <summary>画板是否可用（false = 拿不到可用材质，只跑逻辑）。</summary>
        public bool CanRender => material != null;

        /// <summary>已画出的线数。</summary>
        public int LineCount => entries.Count;

        /// <summary>配置外观（材质可为空，会退回默认着色器）。</summary>
        public void Configure(Material customMaterial, Color lineColor, float lineWidth)
        {
            color = lineColor;
            width = Mathf.Max(0.0005f, lineWidth);
            material = customMaterial != null ? customMaterial : CreateFallbackMaterial();
        }

        /// <summary>画一条线（端点跟着 Transform 走）。</summary>
        public void AddLine(Transform from, Transform to)
        {
            if (from == null || to == null) return;

            var lineObject = new GameObject($"Line_{entries.Count}");
            lineObject.transform.SetParent(transform, false);

            var line = lineObject.AddComponent<LineRenderer>();
            line.useWorldSpace = true;
            line.positionCount = 2;
            line.startWidth = width;
            line.endWidth = width;
            line.startColor = color;
            line.endColor = color;
            if (material != null)
            {
                line.sharedMaterial = material;
            }
            else
            {
                line.enabled = false; // 没材质就干脆不画（LineRenderer 无材质是紫红）
            }

            var entry = new Entry { Line = line, From = from, To = to };
            entries.Add(entry);
            UpdateEntry(entry);
        }

        /// <summary>清掉所有线（保留画板本身）。</summary>
        public void ClearLines()
        {
            for (int i = 0; i < entries.Count; i++)
            {
                if (entries[i].Line != null) Destroy(entries[i].Line.gameObject);
            }
            entries.Clear();
        }

        private void LateUpdate()
        {
            for (int i = 0; i < entries.Count; i++)
            {
                UpdateEntry(entries[i]);
            }
        }

        private static void UpdateEntry(Entry entry)
        {
            if (entry.Line == null || entry.From == null || entry.To == null) return;
            entry.Line.SetPosition(0, entry.From.position);
            entry.Line.SetPosition(1, entry.To.position);
        }

        private static Material CreateFallbackMaterial()
        {
            // URP 工程优先，其次内置管线；都拿不到就别画（比紫红好）
            string[] candidates = { "Sprites/Default", "Universal Render Pipeline/Unlit", "Unlit/Color" };
            for (int i = 0; i < candidates.Length; i++)
            {
                Shader shader = Shader.Find(candidates[i]);
                if (shader != null)
                {
                    return new Material(shader);
                }
            }

            Debug.LogWarning(
                "[Step] 连线画板找不到可用的默认着色器（Sprites/Default / URP Unlit / Unlit/Color），" +
                "本次只跑连线逻辑、不画线；请在条件上显式指定 lineMaterial。");
            return null;
        }
    }
}
